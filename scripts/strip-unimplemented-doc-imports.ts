/**
 * 一次性消减「文档承诺了未实现 API」的 import：
 * 把**不存在**的名字从 import 语句里摘掉，并在其上方留一行
 * `// ⚠️ 下列 API 在 <pkg> 尚未实现（文档曾承诺）：a, b, c`。
 *
 * 为什么要这个脚本：这批欠账集中在 `docs/api/*.md` 与
 * `docs/packages/**` 这类**API 参考文档**里，动辄几十个名字
 * （典型：lodash 风格的 `keys` / `values` / `entries` / `freeze` / `isEqual` …），
 * 而本仓**根本没实现**它们。手工逐个改 200+ 处既慢又易漏。
 *
 * 为什么不直接删掉那些小节：那些小节还承载了「未来规划」的信息，
 * 删掉等于丢失上下文 ⇒ 保留名单到注释里，文档仍可复制粘贴（import 是干净的）。
 *
 * 用法：tsx scripts/strip-unimplemented-doc-imports.ts [--dry]
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const DRY = process.argv.includes('--dry');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '_templates']);
// 只处理「非接触面」文档 —— 接触面（README/guide/examples）已清零，
// 且它们若出现未实现名字，应该由人逐条判断而不是脚本批量摘除。
const ENFORCED_PREFIXES = ['docs/guide/', 'docs/examples/'];

interface PkgInfo {
  name: string;
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
      if (json.name) acc.push({ name: json.name, entry: resolveEsmEntry(dir) });
    } catch {
      /* 忽略 */
    }
  }
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || SKIP_DIRS.has(e.name)) continue;
    collectPackages(join(dir, e.name), acc);
  }
  return acc;
}

function collectDocs(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) collectDocs(p, acc);
    else if (e.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

const packages = collectPackages(PACKAGES_DIR);
const exportCache = new Map<string, Set<string> | null>();

async function exportsOf(pkgName: string): Promise<Set<string> | null> {
  if (exportCache.has(pkgName)) return exportCache.get(pkgName)!;
  const info = packages.find((p) => p.name === pkgName);
  let keys: Set<string> | null = null;
  if (info?.entry) {
    try {
      const mod = (await import(pathToFileURL(info.entry).href)) as Record<string, unknown>;
      keys = new Set(Object.keys(mod));
    } catch {
      /* 产物不可用 ⇒ 跳过 */
    }
  }
  exportCache.set(pkgName, keys);
  return keys;
}

const docFiles = [
  ...(existsSync(join(ROOT, 'README.md')) ? [join(ROOT, 'README.md')] : []),
  ...collectDocs(join(ROOT, 'docs')),
].filter((f) => {
  const rel = relative(ROOT, f);
  if (rel === 'README.md') return false; // 接触面，已清零
  return !ENFORCED_PREFIXES.some((p) => rel.startsWith(p));
});

// 花括号内不得出现 `{` `}` `;` —— 否则正则会回溯扩张吞掉后续整段（真实踩过的坑）
const RE = /import\s+(type\s+)?\{([^{};]*?)\}\s*from\s*['"](@lytjs\/[a-z0-9-]+)['"]/g;

let touchedFiles = 0;
let removedNames = 0;
const perPkg = new Map<string, number>();

/** 把一整段 import 里的名字按「是否存在」过滤，返回替换文本与被摘除的名字 */
async function rewriteBlock(
  block: string,
): Promise<{ text: string; removed: string[]; pkg: string } | null> {
  const m =
    /^(\s*)import\s+(type\s+)?\{([^{};]*?)\}(\s*from\s*['"](@lytjs\/[a-z0-9-]+)['"];?)/.exec(block);
  if (!m || m[2]) return null;
  const indent = m[1] ?? '';
  const pkg = m[5];
  const exports = await exportsOf(pkg);
  if (exports === null) return null;

  // 保留原始 specifier（可能带 `as` 别名或换行注释）
  const specs = m[3]
    .split(',')
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const keep: string[] = [];
  const removed: string[] = [];
  for (const spec of specs) {
    const name = spec.split(/\s+as\s+/)[0].trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      keep.push(spec);
      continue;
    }
    if (exports.has(name)) keep.push(spec);
    else removed.push(name);
  }
  if (removed.length === 0) return null;

  const multiline = block.includes('\n');
  let importText: string;
  if (multiline) {
    const body =
      keep.length > 0
        ? '\n' + keep.map((k) => indent + '  ' + k + ',').join('\n') + '\n' + indent
        : '';
    importText = keep.length > 0 ? indent + 'import {' + body + "} from '" + pkg + "';" : '';
  } else {
    importText =
      keep.length > 0 ? indent + 'import { ' + keep.join(', ') + " } from '" + pkg + "';" : '';
  }
  const note =
    indent + '// ⚠️ 下列 API 在 ' + pkg + ' 尚未实现（文档曾承诺）：' + removed.join(', ');
  return { text: importText === '' ? note : importText + '\n' + note, removed, pkg };
}

for (const file of docFiles) {
  const text = readFileSync(file, 'utf-8');
  const matches = [...text.matchAll(new RegExp(RE.source, 'g'))];
  if (matches.length === 0) continue;
  let out = '';
  let cursor = 0;
  let fileChanged = false;
  for (const m of matches) {
    const block = m[0];
    const startIdx = m.index ?? 0;
    // 自后向前替换不便于拼接，这里**正序**重建文本
    const res = await rewriteBlock(block);
    if (!res) continue;
    out += text.slice(cursor, startIdx) + res.text;
    cursor = startIdx + block.length;
    fileChanged = true;
    removedNames += res.removed.length;
    perPkg.set(res.pkg, (perPkg.get(res.pkg) ?? 0) + res.removed.length);
  }
  if (!fileChanged) continue;
  out += text.slice(cursor);
  touchedFiles++;
  if (!DRY) writeFileSync(file, out, 'utf-8');
}

console.log(
  (DRY ? '[dry] ' : '') +
    '改动文件 ' +
    touchedFiles +
    ' 个，摘除未实现名字 ' +
    removedNames +
    ' 个',
);
console.log(
  '按包：' +
    [...perPkg.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => k + '(' + v + ')')
      .join(', '),
);
