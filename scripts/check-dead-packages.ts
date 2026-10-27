/**
 * 死包棘轮：把「零生产引用」的包钉在清单里，禁止新增
 *
 * ## 为什么需要它
 *
 * 2026-10-26 的全维度评估发现：`common` 域 34 个子包里有 **15 个零引用**（4,465 行，占 38%）。
 * 它们不是空壳 —— `memory` 的对象池、`performance` 的环形缓冲都是真代码，只是**没人用**。
 * 这类「写完了、测过了、没人调」的代码会一直躺着，而且会被当成「模块化架构」的规模证据。
 *
 * ## 为什么不直接删
 *
 * 删包要同步改 `build-order.ts`、`check-deps` 的 LAYER_MAP、`vitest.config.ts`、
 * `tsconfig`、`PUBLISH-MANIFEST`、README 六处；漏一处就把构建链打断。
 * 那是独立批次的工作量，不该混在缺陷修复里做（见报告 §10.3）。
 *
 * 所以这里先做**棘轮**：把现状钉住，**阻止新增死包**；已钉住的包一旦重新被引用，
 * 会提示「可移出清单」，方便后续真正删除。
 *
 * ## 判据（诚实的边界）
 *
 * - **范围只限 `packages/common/` 的内部工具包**：叶子包（api / cli / ssg …）的消费者是
 *   用户应用而非兄弟包，全仓审会把 20+ 个正常包误判成死包。
 * - 「引用」只统计**别的包的 `src/`** 里的 import / 字符串引用；测试里的引用不算生产引用
 *   （`timing` 就是「仅测试引用」，同样记为死包）。
 * - **引用方本身是死包时，它的引用不算数** —— 否则 `@lytjs/common` 这个死聚合包
 *   会把它 re-export 的 14 个包「救活」，分析就失效了。
 * - 文本级扫描：抓 `@lytjs/xxx` 字面量，抓不到动态拼接的包名。
 *
 * ## 用法
 *   tsx scripts/check-dead-packages.ts
 *
 * 退出码：出现**新的**死包 ⇒ 1；否则 0。
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGES = join(ROOT, 'packages');

/**
 * 已确认的死包（零生产引用）。
 *
 * ⚠️ 这份清单是**待办清单**，不是免死金牌：
 * 每一行都意味着「这个包目前没有消费者，要么接上，要么删掉」。
 */
const DEAD_BASELINE: Record<string, string> = {
  '@lytjs/common': '聚合 barrel —— 全仓无人 import 它，却 re-export 了下面 14 个死包',
  '@lytjs/common-async-scheduler': '零引用（功能与 common-scheduler 重叠）',
  '@lytjs/common-dom-helpers': '零引用（adapter-web 自带一套 DOM 操作）',
  '@lytjs/common-event-normalizer': '零引用（adapter-web 的 web-patch-events 是同一套逻辑的正主）',
  '@lytjs/common-keyboard': '零引用',
  '@lytjs/common-memory': '零引用（对象池 / 泄漏检测，无消费者）',
  '@lytjs/common-node-cache': '零引用',
  '@lytjs/common-performance': '零引用（环形缓冲，无消费者）',
  '@lytjs/common-raf': '零引用（与 common-timing 重叠）',
  '@lytjs/common-render-queue': '零引用（修好了 no-op，但没人调用）',
  '@lytjs/common-storage': '零引用',
  '@lytjs/common-validate': '零引用',
  '@lytjs/common-warn': '零引用（warn 的真相源已收敛到 common-error）',
  '@lytjs/common-env': '零引用',
  '@lytjs/common-path': '零引用',
  '@lytjs/common-timing': '仅被自身测试引用（与 raf / scheduler 重叠）',
};

interface PkgInfo {
  name: string;
  dir: string;
  relDir: string;
}

interface Counts {
  /** 来自别的包 `src/` 的引用（生产引用） */
  srcRefs: number;
  /** 来自任意 `tests/` 的引用 */
  testRefs: number;
  /** 来自 scripts / vitest.config 等仓级配置的引用 */
  configRefs: number;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** 收集所有包（含嵌套的 packages/*\/packages/*\/*） */
/**
 * ⚠️ 扫描范围：**只审 `packages/common/` 下的内部工具包**。
 *
 * 为什么不能全仓审：`@lytjs/api` / `@lytjs/cli` / `@lytjs/ssg` 这类**面向应用**的叶子包，
 * 消费者是「用户写的 app」，不是仓内兄弟包 ⇒ 它们天然 `srcRefs = 0`，
 * 全仓审会把 20+ 个正常包误判成死包（实测过）。
 *
 * `common` 域是**纯内部依赖**：只有别的包 import 它才算被使用，所以「零 src 引用」
 * 在这里才是可信的死代码信号 —— 也正是 2026-10-26 评估发现 15 个死包的地方。
 */
const SCOPE_PREFIX = 'packages/common/';

function collectPackages(): PkgInfo[] {
  const result: PkgInfo[] = [];
  for (const file of walk(PACKAGES)) {
    if (!file.endsWith('package.json')) continue;
    try {
      const json = JSON.parse(readFileSync(file, 'utf8')) as { name?: string };
      if (!json.name || !json.name.startsWith('@lytjs/')) continue;
      const dir = dirname(file);
      const relDir = relative(ROOT, dir).split('\\').join('/');
      if (!relDir.startsWith(SCOPE_PREFIX)) continue;
      result.push({ name: json.name, dir, relDir });
    } catch {
      /* 忽略损坏的 package.json */
    }
  }
  return result;
}

/** 文件属于哪个包（最近的上级 package.json） */
function ownerOf(file: string, pkgs: PkgInfo[]): string | null {
  let best: PkgInfo | null = null;
  for (const pkg of pkgs) {
    if (file.startsWith(pkg.dir + '/')) {
      if (!best || pkg.dir.length > best.dir.length) best = pkg;
    }
  }
  return best?.name ?? null;
}

const PKGS = collectPackages();
const PKG_NAMES = new Set(PKGS.map((p) => p.name));

type Kind = 'src' | 'test' | 'config';

/** 一条引用边：某文件（属于 owner）引用了 target */
interface Edge {
  target: string;
  owner: string | null;
  kind: Kind;
}

const edges: Edge[] = [];
const TOKEN = /@lytjs\/[a-z0-9-]+/g;

/** 扫描一个文件，把它对其他包的引用记为边（同一文件对同一目标只记一次） */
function scanFile(file: string): void {
  const owner = ownerOf(file, PKGS);
  const rel = relative(ROOT, file).split('\\').join('/');
  const kind: Kind = /\/tests?\//.test(rel) ? 'test' : /\/src\//.test(rel) ? 'src' : 'config';

  const content = readFileSync(file, 'utf8');
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(content)) !== null) {
    const target = m[0];
    if (!PKG_NAMES.has(target)) continue;
    if (target === owner) continue; // 自引用不算
    if (seen.has(target)) continue;
    seen.add(target);
    edges.push({ target, owner, kind });
  }
}

// 一次遍历：packages 下的源码 / 测试 / package.json
for (const file of walk(PACKAGES)) {
  if (!/\.(ts|tsx|js|mjs|cjs|json)$/.test(file)) continue;
  scanFile(file);
}
// 仓级配置
for (const name of ['vitest.config.ts', 'package.json', 'tsconfig.json']) {
  const p = join(ROOT, name);
  if (existsSync(p)) scanFile(p);
}
for (const file of walk(join(ROOT, 'scripts'))) {
  if (file.endsWith('.ts') || file.endsWith('.mjs')) scanFile(file);
}

const counts = new Map<string, Counts>();
const liveCounts = new Map<string, number>();
for (const name of PKG_NAMES) {
  counts.set(name, { srcRefs: 0, testRefs: 0, configRefs: 0 });
  liveCounts.set(name, 0);
}

for (const e of edges) {
  const c = counts.get(e.target)!;
  if (e.kind === 'src') c.srcRefs += 1;
  else if (e.kind === 'test') c.testRefs += 1;
  else c.configRefs += 1;

  // 活包引用：引用方不是清单内的死包（仓级配置视为活）
  const ownerIsDead = e.owner !== null && DEAD_BASELINE[e.owner] !== undefined;
  if (e.kind === 'src' && !ownerIsDead) {
    liveCounts.set(e.target, liveCounts.get(e.target)! + 1);
  }
}

interface Row {
  name: string;
  srcRefs: number;
  testRefs: number;
  configRefs: number;
  liveRefs: number;
  dead: boolean;
}

const rows: Row[] = PKGS.map((pkg) => {
  const c = counts.get(pkg.name)!;
  const liveRefs = liveCounts.get(pkg.name)!;
  return {
    name: pkg.name,
    srcRefs: c.srcRefs,
    testRefs: c.testRefs,
    configRefs: c.configRefs,
    liveRefs,
    dead: liveRefs === 0,
  };
}).sort((a, b) => a.name.localeCompare(b.name));

const newlyDead = rows.filter((r) => r.dead && !DEAD_BASELINE[r.name]);
const revived = rows.filter((r) => !r.dead && DEAD_BASELINE[r.name]);

console.log('\n🔍 死包棘轮 check-dead-packages');
console.log(
  `\n   共 ${rows.length} 个 @lytjs/* 包；清单内死包 ${Object.keys(DEAD_BASELINE).length} 个\n`,
);

// `--verbose`：把清单内每个死包的引用计数打出来，便于维护时判断「是不是真的没人用」
if (process.argv.includes('--verbose')) {
  console.log('📋 清单内死包的引用计数：');
  for (const r of rows) {
    if (!DEAD_BASELINE[r.name]) continue;
    console.log(
      `   ${r.name.padEnd(34)} src=${r.srcRefs} test=${r.testRefs} config=${r.configRefs}`,
    );
  }
  console.log('');
}

if (revived.length > 0) {
  console.log('ℹ️  已重新被引用（可从清单移除）：');
  for (const r of revived) console.log(`   ${r.name}（活包引用 ${r.liveRefs} 处）`);
  console.log('');
}

if (newlyDead.length === 0) {
  console.log('✅ 没有新增死包');
  process.exit(0);
}

console.log(`❌ 发现 ${newlyDead.length} 个**新增**死包（零生产引用）：\n`);
for (const r of newlyDead) {
  console.log(`   ${r.name}  src=${r.srcRefs} test=${r.testRefs} config=${r.configRefs}`);
}
console.log('\n两种处置，二选一：');
console.log('  1) 接上消费者（真的有人用）；');
console.log('  2) 若确实暂无消费者，加入 scripts/check-dead-packages.ts 的 DEAD_BASELINE，');
console.log('     并在理由里写清「为什么它现在存在」。清单是待办，不是免死金牌。');
process.exit(1);
