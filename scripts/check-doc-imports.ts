/**
 * 门禁：docs / README 里的具名 import 必须在该包**实际导出面**里存在
 *
 * ## 为什么需要这个门禁
 *
 * 2026-10-02 ~ 10-03 连续三轮撞上**同一类**缺陷：`@lytjs/core` 的入口
 * 「忘了」转出上游包已实现的具名导出（内置组件 ×2、`useSuspense` ×1）。
 * 症状极其隐蔽 —— **照抄文档示例即触发**，运行时拿到 `undefined`：
 *
 *   · 模板里写 `<Suspense>` ⇒ 静默渲染为空（无报错、无警告）；
 *   · `await useSuspense(p)` 抛「not a function」⇒ async setup 被判失败
 *     ⇒ 视图永远停在首帧 `undefined`，**也不报错**。
 *
 * 之所以人读文档抓不住：文档与代码**看起来都自洽**（文档没写错，被引用方
 * 也确实实现了），缺的只是「入口的转出面」这一层；而**入口层是所有函数的
 * 交集，最少被单独检查**。
 *
 * ## 判据形态（自维护、零清单）
 *
 * 输入是**文档本身**：扫 `README.md` 与 `docs/` 目录下的全部 `.md`，把
 * `import { A, B as C } from '@lytjs/xxx'` 里的名字抽出来，
 * 逐个断言它在那个包的**实际导出面**（dist ESM 入口的运行时导出）里存在。
 *
 * 美点：文档一改，判据自动跟着改 —— 不需要维护任何名单；
 * 而且它直接保护**用户接触面**（文档示例是最高频的复制粘贴来源）。
 *
 * 用法：
 *   tsx scripts/check-doc-imports.ts           # 门禁模式，有缺失即非零退出
 *   tsx scripts/check-doc-imports.ts --report  # 只报告，不影响退出码
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const REPORT_ONLY = process.argv.includes('--report');

/** `--pkg @lytjs/xxx` ⇒ 只看某一个包的明细（消减某一批时用） */
function pkgFilter(): string | null {
  const i = process.argv.indexOf('--pkg');
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '_templates']);

// ============================================================
// 收集包与「实际导出面」
// ============================================================

interface PkgInfo {
  name: string;
  dir: string;
  entry: string | null;
}

function resolveEsmEntry(dir: string): string | null {
  try {
    const json = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')) as {
      exports?: Record<string, unknown>;
      module?: string;
      main?: string;
    };
    const dot = json.exports?.['.'];
    let rel: string | undefined;
    if (typeof dot === 'string') rel = dot;
    else if (dot && typeof dot === 'object') {
      const o = dot as Record<string, unknown>;
      rel = (o.import as string) ?? (o.module as string) ?? (o.default as string);
    }
    rel = rel ?? json.module ?? json.main;
    if (!rel) return null;
    const abs = join(dir, rel);
    return existsSync(abs) ? abs : null;
  } catch {
    return null;
  }
}

function collectPackages(dir: string, acc: PkgInfo[] = []): PkgInfo[] {
  if (!existsSync(dir)) return acc;
  if (existsSync(join(dir, 'package.json'))) {
    try {
      const json = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')) as {
        name?: string;
      };
      if (json.name) acc.push({ name: json.name, dir, entry: resolveEsmEntry(dir) });
    } catch {
      /* 忽略不可解析的 package.json */
    }
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
    collectPackages(join(dir, entry.name), acc);
  }
  return acc;
}

const exportCache = new Map<string, Set<string> | null>();

async function exportsOf(pkgName: string): Promise<Set<string> | null> {
  if (exportCache.has(pkgName)) return exportCache.get(pkgName)!;
  const info = packages.find((p) => p.name === pkgName);
  let keys: Set<string> | null = null;
  if (info?.entry) {
    try {
      const mod = (await import(pathToFileURL(info.entry).href)) as Record<string, unknown>;
      keys = new Set(Object.keys(mod));
    } catch (e) {
      console.error(`⚠️  无法加载 ${pkgName} 的产物：${(e as Error).message}`);
    }
  }
  exportCache.set(pkgName, keys);
  return keys;
}

const packages = collectPackages(PACKAGES_DIR);

// ============================================================
// 收集文档
// ============================================================

function collectDocs(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) collectDocs(p, acc);
    else if (entry.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

const docFiles = [
  ...(existsSync(join(ROOT, 'README.md')) ? [join(ROOT, 'README.md')] : []),
  ...collectDocs(join(ROOT, 'docs')),
];

/**
 * 门禁强度分级。
 *
 * 一次跑出 468 项缺失后，结论是：**不能把它们当同一等级**。
 * 实测分布（`@lytjs/core` 123 项）：
 * · `docs/examples/*` + `docs/guide/*` —— **用户会直接复制粘贴**的接触面
 *   ⇒ 必须为 0，进门禁；
 * · `docs/packages/*`、`docs/api/*` —— 包说明 / 愿景型 API 文档，
 *   大量条目是「先写文档、后实现」的欠账 ⇒ 报告并计入已知欠账，不阻塞；
 * · `docs/legacy-archive/*` —— **历史归档**，明确不是当前口径 ⇒ 完全跳过。
 *
 * 分级的意义：门禁一旦被 468 项历史欠账挡住就会立刻被关掉；
 * 而「复制粘贴即触发」的那一小块是**真正值得用红门禁守住的**。
 */
const ENFORCED_PREFIXES = ['docs/guide/', 'docs/examples/'];
const ARCHIVED_PREFIXES = ['docs/legacy-archive/'];

/**
 * 已知欠账白名单（**棘轮**：允许已登记的缺失，**禁止新增**）。
 *
 * 为什么需要：门禁一旦长期是红的就会被忽略、进而被关掉 —— 那等于没建。
 * 所以把「已查明原因、暂时不改」的项显式登记在此，每条都要写清**为什么**，
 * 任何人新增一条都必须给出理由；删掉一条则必须先把文档或实现改对。
 *
 * ⚠️ 登记 ≠ 合理。以下每一条都是**文档承诺了未实现的能力**（claims-vs-reality），
 * 属待消减欠账，清理时应回到本文件删除对应行。
 */
/**
 * 已知欠账白名单（**棘轮**：允许已登记的缺失，**禁止新增**）。
 *
 * ✅ **当前为空** —— 2026-10-03 把原 14 项全部消减完毕：
 * · `signal` / `computedSignal` / `isSignal`（@lytjs/core 与 @lytjs/reactivity）：
 *   本体早已实现在 reactivity，只是没转出；`isSignal` 借 `signalFn` 上的
 *   `SignalSymbol` 品牌标记实现（纯接线）。
 * · `enable` / `getSignals`（@lytjs/devtools）：真实 API 叫 `installDevTools` /
 *   `getSignalNodes`（后者本就已转出）⇒ 文档改为指向真实名字，**不加别名**
 *   —— `enable` 过泛且会与既有命名重复。
 * · `useSSRContext`（@lytjs/core）：全仓无 SSR 上下文实现，且补它要改
 *   `renderToString` 的公开签名 ⇒ 属新能力，本次**改文档口径**（`docs/guide/ssr.md`
 *   已改为说明「当前不支持」并给出模块级单例的替代做法）。
 *
 * ⚠️ 保持为空是刻意的：门禁一旦长期挂账就会被忽略。将来若真要新增条目，
 * 必须同时写清「为什么不能用现有能力替代」。
 */
const DEBT_ALLOWLIST: Array<{ pkg: string; name: string; reason: string }> = [];
function enforcementOf(file: string): 'enforce' | 'report' | 'skip' {
  if (ARCHIVED_PREFIXES.some((p) => file.startsWith(p))) return 'skip';
  if (file === 'README.md') return 'enforce';
  if (ENFORCED_PREFIXES.some((p) => file.startsWith(p))) return 'enforce';
  return 'report';
}

// ============================================================
// 抽取「文档里的具名 import」
// ============================================================

interface DocImport {
  pkg: string;
  names: string[];
  file: string;
  line: number;
}

const found: DocImport[] = [];
// 允许跨行（多行 import），但**花括号内不得出现 `{` `}` `;`**
// —— 否则正则会回溯扩张、把「下一条 import 之前的所有内容」都算进本次 import。
// ⚠️ 这是本门禁第一版的真实 bug：`import { a } from '../x.js';` 匹配失败后
// 贪婪扩张吞掉了后续整段代码块，于是相对路径 import 的名字被记到前一个
// `@lytjs/*` 名下 ⇒ 一次跑出 23 个假阳性。**门禁的假阳性比漏报更致命：
// 它会被直接关掉。**
const RE = /import\s+(type\s+)?\{([^{};]*?)\}\s*from\s*['"](@lytjs\/[a-z0-9-]+)['"]/g;

for (const file of docFiles) {
  const text = readFileSync(file, 'utf-8');
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(text)) !== null) {
    if (m[1]) continue; // `import type { … }` —— 类型名不在运行时导出面里
    const names = (m[2] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      // 去掉行内注释与 `A as B` 的原名
      .map((s) => s.split(/\s+as\s+/)[0].trim())
      .map((s) => s.replace(/\/\/.*$/, '').trim())
      .filter((s) => /^[A-Za-z_$][\w$]*$/.test(s));
    if (names.length === 0) continue;
    found.push({
      pkg: m[3],
      names,
      file: relative(ROOT, file),
      line: text.slice(0, m.index).split('\n').length,
    });
  }
}

// ============================================================
// 断言
// ============================================================

const missing: Array<{ item: DocImport; name: string }> = [];
/** ★ 文档引用了**本仓根本不存在**的包（2026-10-03 起计入失败，不再跳过） */
const ghostPkgs: Array<{ item: DocImport; pkg: string }> = [];
const noArtifact = new Set<string>();
let archivedImports = 0;

for (const item of found) {
  const level = enforcementOf(item.file);
  if (level === 'skip') {
    archivedImports++;
    continue;
  }
  // ⚠️ 必须先判「包是否存在」再看产物：**不存在**是文档缺陷（计入失败），
  // **存在但未构建**是环境问题（跳过，否则沙箱里会误报一片）。
  if (!packages.some((p) => p.name === item.pkg)) {
    ghostPkgs.push({ item, pkg: item.pkg });
    continue;
  }
  const exports = await exportsOf(item.pkg);
  if (exports === null) {
    noArtifact.add(item.pkg);
    continue;
  }
  for (const name of item.names) {
    if (!exports.has(name)) missing.push({ item, name });
  }
}

const enforced = missing.filter(
  (m) =>
    enforcementOf(m.item.file) === 'enforce' &&
    !DEBT_ALLOWLIST.some((d) => d.pkg === m.item.pkg && d.name === m.name),
);
const debt = missing.filter(
  (m) =>
    enforcementOf(m.item.file) === 'enforce' &&
    DEBT_ALLOWLIST.some((d) => d.pkg === m.item.pkg && d.name === m.name),
);
const reported = missing.filter((m) => enforcementOf(m.item.file) === 'report');

console.log('='.repeat(72));
console.log('文档 import 门禁 —— 接触面（README / guide / examples）必须为 0');
console.log('='.repeat(72));
console.log(
  `扫描文档：${docFiles.length} 个 md，抽出 ${found.length} 处具名 import` +
    `（其中 ${archivedImports} 处位于 legacy-archive，已按历史归档跳过）`,
);

if (ghostPkgs.length > 0) {
  const uniq = [...new Set(ghostPkgs.map((g) => g.pkg))].sort();
  console.log(`\n❌ 文档引用了本仓**根本不存在**的包（${uniq.length} 个）：`);
  for (const g of ghostPkgs) {
    console.log(`  ${g.item.file}:${g.item.line}  ${g.pkg}  ← ${g.item.names.join(', ')}`);
  }
  console.log('   ⇒ 这些包从未实现。要么实现它们，要么把文档改成与现状一致。');
}
if (noArtifact.size > 0) {
  console.log(`\n⚠️  这些包没有可用的 ESM 产物（未构建？），已跳过：${[...noArtifact].join(', ')}`);
}

if (enforced.length === 0) {
  console.log('\n✅ 通过：接触面文档里的每一个具名 import 都能在所指包的实际导出面中解析到');
} else {
  console.log(`\n❌ 接触面有 ${enforced.length} 个「文档里有、包里没有」的名字：\n`);
  for (const { item, name } of enforced) {
    console.log(`  ${item.file}:${item.line}  ${name}  ← ${item.pkg}`);
  }
  console.log(
    '\n修法二选一：① 在该包的入口（src/index.ts）转出它（本体通常已在上游包实现）；' +
      '\n        ② 若该能力确实不存在，把文档改成与实现一致的口径。',
  );
}

if (debt.length > 0) {
  console.log(`\nℹ️  另有 ${debt.length} 项命中**已知欠账白名单**（不阻塞，逐条消减）：`);
  for (const d of DEBT_ALLOWLIST) console.log(`   · ${d.pkg} 的 ${d.name} —— ${d.reason}`);
}

if (reported.length > 0) {
  console.log(
    `\nℹ️  另有 ${reported.length} 项位于 docs/packages / docs/api 等包说明文档，` +
      '属「先写文档、后实现」的已知欠账（不阻塞门禁）。',
  );
  const byPkg = new Map<string, number>();
  for (const { item } of reported) byPkg.set(item.pkg, (byPkg.get(item.pkg) ?? 0) + 1);
  console.log(
    '   按包：' +
      [...byPkg.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}(${v})`)
        .join(', '),
  );
  // `--report` 下**逐条列出**：否则「301 项」只是一个无法逐项处理的数量。
  // 配合 `--pkg <name>` 可只看某一个包（消减某一批时用）。
  const only = pkgFilter();
  if (only) {
    const subset = reported.filter((m) => m.item.pkg === only);
    console.log(`\n   —— 明细：${only}（${subset.length} 项）——`);
    for (const { item, name } of subset) {
      console.log(`   ${item.file}:${item.line}  ${name}`);
    }
  } else {
    console.log('   （加 `--pkg @lytjs/xxx` 可只看某一个包的明细）');
  }
}

// 门禁成败：接触面缺失 或 引用了不存在的包 ⇒ 失败（`--report` 只报告不失败）
const failed = enforced.length > 0 || ghostPkgs.length > 0;
process.exit(!failed || REPORT_ONLY ? 0 : 1);
