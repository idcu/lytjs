#!/usr/bin/env node
/**
 * 零引用脚本棘轮（S20）
 *
 * ## 为什么需要它
 *
 * 2026-11-08 对 `scripts/` 做过一次全量引用地图：128 个条目里有 29 个零引用，
 * 已分批删除。删完之后如果不设防，下一次「临时排查脚本」很容易又留在仓里，
 * 半年后没人知道它是否还能跑。所以这里把「零引用」做成棘轮：**当前基线为 0**，
 * 任何新增可执行脚本若在 package.json / CI / gate / 文档 / 其他脚本中都找不到引用，
 * 门禁立即转红。
 *
 * ## 判定口径
 *
 * - 只检查**可执行脚本**（.ts/.mjs/.js/.cjs/.sh/.ps1），不含 `*.test.*` 与数据文件；
 * - 引用来源：package.json、`.github/**`、`scripts/` 下其他可执行脚本、
 *   `keel/checks/**`、`*.md`（`docs/legacy-archive/**` 与 CHANGELOG 视为冻结历史，不计）；
 * - 命中三种写法之一即算有引用：完整文件名、`scripts/<路径>`、相对 import 说明符；
 * - 被引用 ≠ 被正确调用，棘轮只回答「这个脚本还有人要吗」。
 *
 * 用法：`node scripts/check-script-refs.mjs`
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPTS = join(ROOT, 'scripts');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.turbo', 'cache']);
const EXEC_EXT = new Set(['.ts', '.mjs', '.js', '.cjs', '.sh', '.ps1']);

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

const isExec = (p) => EXEC_EXT.has(extname(p)) && !/\.test\.[cm]?[jt]s$/.test(p);

const scriptFiles = walk(SCRIPTS).filter(isExec);

/** 引用来源：只扫可能写脚本名的文本，避免全仓源码噪声 */
function isSource(p) {
  const rel = relative(ROOT, p).split('\\').join('/');
  const base = rel.split('/').pop();
  const ext = extname(p);
  if (rel.startsWith('docs/legacy-archive/') || base === 'CHANGELOG.md') return false;
  if (rel.startsWith('scripts/')) return isExec(p);
  if (base === 'package.json') return true;
  if (rel.startsWith('.github/')) return ['.yml', '.yaml'].includes(ext);
  if (rel.startsWith('keel/checks/')) return ['.sh', '.md'].includes(ext);
  if (ext === '.md') return true;
  if (['.json', '.yml', '.yaml', '.mjs', '.cjs', '.js', '.ts'].includes(ext)) {
    return !rel.startsWith('packages/');
  }
  return false;
}

const sources = walk(ROOT)
  .filter(isSource)
  .map((p) => ({ path: relative(ROOT, p), text: readFileSync(p, 'utf-8') }));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function patternsFor(rel, full, stem) {
  return [
    new RegExp(esc(full) + '\\b'),
    new RegExp('scripts/' + esc(rel) + '\\b'),
    new RegExp('[\'"]\\.{1,2}/[^\'"]*' + esc(stem) + '(?:\\.(?:ts|mjs|cjs|js|sh|ps1))?[\'"]'),
  ];
}

const zero = [];
for (const file of scriptFiles) {
  const rel = relative(SCRIPTS, file).split('\\').join('/');
  const full = rel.split('/').pop();
  const stem = full.replace(/\.[^.]+$/, '');
  const pats = patternsFor(rel, full, stem);
  const referenced = sources.some(
    (s) => s.path !== `scripts/${rel}` && pats.some((re) => re.test(s.text)),
  );
  if (!referenced) zero.push(rel);
}

console.log(`🔍 零引用脚本棘轮（基线 0）`);
console.log(`  可执行脚本：${scriptFiles.length} 个 · 引用来源：${sources.length} 个文件`);
if (zero.length === 0) {
  console.log('✅ 通过：每个可执行脚本都有引用方');
  process.exit(0);
}
console.error(`❌ ${zero.length} 个脚本零引用（新增零引用脚本必须接入调用方或删除）：`);
for (const z of zero.sort()) console.error(`   - scripts/${z}`);
process.exit(1);
