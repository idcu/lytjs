#!/usr/bin/env node
/**
 * 删除「零生产引用」的 common 包（`check-dead-packages` 的基线清单）。
 *
 * ## 为什么是一个脚本，而不是手改
 *
 * 删 16 个包要同步改动 **5 类、约 40 个文件**：
 *   - 9 个 `tsup.config.ts` 的 `external` / `noExternal`
 *   - 6 个 `vitest.config.ts` 的别名
 *   - `packages/common/packages/common/src/index.ts`（死聚合包的 barrel）
 *   - 21 个 `package.json` 的依赖声明
 *   - `scripts/build-order.ts` 与 `scripts/check-dead-packages.ts` 的基线
 *
 * 手改必然漏。脚本做三件事：**先 dry-run 打印全部改动 → 再执行 → 最后自检**。
 *
 * ## 用法
 *
 * ```bash
 * node scripts/remove-dead-packages.mjs --dry-run   # 只打印，不动文件
 * node scripts/remove-dead-packages.mjs             # 真正执行（包目录移到 .trash/，不直接删）
 * ```
 *
 * 执行后请依次跑：`tsx scripts/check-build-order.ts` → `node scripts/gate.mjs`。
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  renameSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DRY = process.argv.includes('--dry-run');
const TRASH = join(ROOT, '.trash', `dead-packages-${Date.now()}`);

/** 从 check-dead-packages.ts 里读基线（单一真相源，避免两处清单漂移） */
function readDeadBaseline() {
  const src = readFileSync(join(ROOT, 'scripts/check-dead-packages.ts'), 'utf-8');
  const block = src.slice(
    src.indexOf('DEAD_BASELINE'),
    src.indexOf('};', src.indexOf('DEAD_BASELINE')),
  );
  return [...block.matchAll(/^\s*'(@lytjs\/[^']+)'\s*:/gm)].map((m) => m[1]);
}

const DEAD = readDeadBaseline();
if (DEAD.length === 0) {
  console.log('基线为空，无需处理。');
  process.exit(0);
}
const DEAD_SET = new Set(DEAD);

/** 包名 → 目录 */
const dirByName = new Map();
(function walk(dir, depth) {
  if (depth > 5 || !existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (!e.isDirectory()) continue;
    const pj = join(p, 'package.json');
    if (existsSync(pj)) {
      try {
        dirByName.set(JSON.parse(readFileSync(pj, 'utf-8')).name, p);
      } catch {
        /* 忽略损坏的 package.json */
      }
    }
    walk(p, depth + 1);
  }
})(join(ROOT, 'packages'), 0);

const changes = []; // { file, kind, detail }
const writes = []; // { file, before, next }

/** 该文件是否位于某个待删包内（这些文件会随目录一起消失，不用改） */
const inDeadDir = (file) => {
  for (const name of DEAD) {
    const d = dirByName.get(name);
    if (d && file.startsWith(d + '/')) return true;
  }
  return false;
};

/** 处理 JSON：删掉 dependencies / devDependencies / peerDependencies 里的死包 */
function handlePackageJson(file) {
  const raw = readFileSync(file, 'utf-8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return;
  }
  const removed = [];
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const deps = json[field];
    if (!deps || typeof deps !== 'object') continue;
    for (const name of Object.keys(deps)) {
      if (DEAD_SET.has(name)) {
        delete deps[name];
        removed.push(`${field}:${name}`);
      }
    }
  }
  // ⚠️ tsconfig 的 `compilerOptions.paths` 也要清 —— 否则别名指向已删目录，
  //   TS 解析会直接失败（dry-run 时发现的第二类遗漏）。
  const paths = json.compilerOptions?.paths;
  if (paths && typeof paths === 'object') {
    for (const name of Object.keys(paths)) {
      if (DEAD_SET.has(name)) {
        delete paths[name];
        removed.push(`paths:${name}`);
      }
    }
  }
  if (removed.length === 0) return;
  changes.push({ file, kind: 'package.json', detail: removed.join(', ') });
  writes.push({ file, before: raw, next: JSON.stringify(json, null, 2) + '\n' });
}

/** 处理 JS/TS 配置：删掉含死包名的整行（别名 / external 列表项） */
function handleConfigLines(file) {
  const raw = readFileSync(file, 'utf-8');
  const lines = raw.split('\n');
  const kept = [];
  const removed = [];
  for (const line of lines) {
    const hit = DEAD.find(
      (d) =>
        line.includes(`'${d}'`) ||
        line.includes(`"${d}"`) ||
        line.includes(`'${d}/`) ||
        line.includes(`"${d}/`),
    );
    // 只删「整行就是这个条目」的形态；含其它内容的行留给人工判断
    const isPureEntry =
      hit &&
      /^\s*(['"]?@lytjs\/[^'"]+['"]?\s*:?\s*,?\s*)$/.test(
        line.replace(/\/\/.*$/, '').trim() ? line : line,
      );
    if (hit && isPureEntry) {
      removed.push(line.trim());
      continue;
    }
    kept.push(line);
  }
  if (removed.length === 0) return;
  changes.push({ file, kind: 'config', detail: `${removed.length} 行` });
  writes.push({ file, before: raw, next: kept.join('\n') });
}

/** 收集候选文件 */
const targets = [];
(function walk(dir, depth) {
  if (depth > 6 || !existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, depth + 1);
    else if (/\.(ts|mts|cts|js|mjs|cjs|json)$/.test(e.name)) targets.push(p);
  }
})(join(ROOT, 'packages'), 0);
(function walk(dir, depth) {
  if (depth > 2 || !existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, depth + 1);
    else if (/\.(ts|mjs|js|json)$/.test(e.name)) targets.push(p);
  }
})(join(ROOT, 'scripts'), 0);
for (const f of ['package.json', 'vitest.config.ts', 'tsconfig.json']) {
  const p = join(ROOT, f);
  if (existsSync(p)) targets.push(p);
}

for (const file of targets) {
  if (inDeadDir(file)) continue;
  // ⚠️ 所有 `.json` 都走 JSON 处理（不只 package.json）：
  //   `tsconfig*.json` 的 `compilerOptions.paths` 同样是"指向被删目录"的引用，
  //   而按行删的规则匹配不到 `"@lytjs/x": ["./packages/x/src"]` 这种形态（dry-run 发现）。
  if (file.endsWith('.json')) handlePackageJson(file);
  else if (file.endsWith('.ts') || file.endsWith('.mjs') || file.endsWith('.js'))
    handleConfigLines(file);
}

// 报告
console.log(`待删包 ${DEAD.length} 个：`);
for (const d of DEAD) console.log(`  - ${d}${dirByName.has(d) ? '' : '  ⚠️ 找不到目录'}`);
console.log(`\n需要改动的文件 ${changes.length} 个：`);
for (const c of changes)
  console.log(`  [${c.kind}] ${c.file.replace(ROOT + '/', '')} ← ${c.detail}`);

// 残留引用（脚本删不掉的，必须人工处理）
console.log('\n=== 需要人工确认的残留引用 ===');
let residual = 0;
for (const file of targets) {
  if (inDeadDir(file)) continue;
  const t = readFileSync(file, 'utf-8');
  for (const d of DEAD) {
    if (t.includes(`'${d}'`) || t.includes(`"${d}"`)) {
      const lines = t.split('\n').filter((l) => l.includes(`'${d}'`) || l.includes(`"${d}"`));
      for (const l of lines.slice(0, 2)) {
        console.log(`  ${file.replace(ROOT + '/', '')}: ${l.trim().slice(0, 110)}`);
        residual++;
      }
    }
  }
}
if (residual === 0) console.log('  （无）');

if (DRY) {
  // ⚠️ 2026-11-01 教训：只打印"哪些文件会变"**验证不了改动是否合法**。
  //   上一版 dry-run 报了 26 个文件，但真正的编辑规则把
  //   `{ name: '@lytjs/x', path: '…' }` 改成了 `{ name: path: '…' }`（语法错误），
  //   dry-run 完全没提示 —— 因为它是按行正则删的，不关心语义。
  //   现在强制打印**每处改动的前后对照**，人工扫一眼就能发现这类破坏。
  console.log('\n=== 改动预览（前 → 后）===');
  for (const w of writes) {
    const beforeLines = w.before.split('\n');
    const afterLines = w.next.split('\n');
    const removedLines = beforeLines.filter((l) => !afterLines.includes(l) && l.trim());
    if (removedLines.length === 0) continue;
    console.log(`\n--- ${w.file.replace(ROOT + '/', '')} ---`);
    for (const l of removedLines.slice(0, 6)) console.log(`  - ${l.trim().slice(0, 120)}`);
    if (removedLines.length > 6) console.log(`  … 另 ${removedLines.length - 6} 行`);
  }
  console.log('\n[dry-run] 未改动任何文件。去掉 --dry-run 执行。');
  process.exit(0);
}

// 执行：写文件
for (const w of writes) writeFileSync(w.file, w.next, 'utf-8');
console.log(`\n已更新 ${writes.length} 个文件。`);

// 执行：移走包目录（移到 .trash，不直接删，便于回滚）
mkdirSync(TRASH, { recursive: true });
let moved = 0;
for (const d of DEAD) {
  const dir = dirByName.get(d);
  if (!dir) continue;
  renameSync(dir, join(TRASH, dir.split('/').pop()));
  moved++;
}
console.log(`已移走 ${moved} 个包目录 → ${TRASH.replace(ROOT + '/', '')}`);
console.log('\n下一步：');
console.log('  1) tsx scripts/check-build-order.ts   # 构建顺序表需同步');
console.log('  2) node scripts/gate.mjs              # 全量门禁');
