/**
 * 给「文档里仍在列举未实现 API」的地方加显式标注。
 *
 * ## 为什么需要
 *
 * 上一轮（`strip-unimplemented-doc-imports.ts`）把**未实现的名字从 import 里摘掉**，
 * 并在 import 上方留了一行「⚠️ 下列 API 在 <pkg> 尚未实现」。
 * 但 **API 参考文档的表格 / 小节标题仍在把那些函数当现有 API 列举**
 * （例如 `| del(obj, path) | 安全删除嵌套属性 |`）⇒ 读者只看表格会被误导。
 *
 * ## 做法
 *
 * 1. 解析本文件里由消减脚本生成的注释，取出「未实现名字」集合：
 *    · `// ⚠️ 下列 API 在 <pkg> 尚未实现（文档曾承诺）：a, b, c`
 *    · `// ⚠️ <pkg> 这个包在本仓**不存在**（文档曾承诺）：a, b, c`
 * 2. 逐行扫**表格行**与**标题行**，若提到集合里的名字且尚未标注，则补 `⚠️ 未实现`：
 *    · 表格行：插到**最后一列之前**（直接追加会破坏表格结构）；
 *    · 标题行：追加到行尾。
 *
 * 只标注**列举性文本**（表格行 + 小节标题），不改散文段落 —— 段落里的「规划」表述本身是诚实的。
 *
 * ⚠️ **作用域必须是「小节」而不是文件** —— 实测假阳性：`isNumber` 在同一文件里
 * 既是 `@lytjs/common-is` 的**已实现** API，又是 `@lytjs/common-validate` 的**未实现** API；
 * 文件级并集会把合法的那一行也标成「未实现」⇒ 污染文档。
 *
 * 用法：tsx scripts/annotate-unimplemented-doc-tables.ts [--dry]
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DRY = process.argv.includes('--dry');
const MARK = '⚠️ 未实现';
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '_templates']);

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

const RE_NOTE =
  /^\s*\/\/ ⚠️ (?:下列 API 在 \S+ 尚未实现|\S+ 这个包在本仓\*\*不存在\*\*)[（(]文档曾承诺[）)]\s*：\s*(.+)$/;

let touchedFiles = 0;
let markedLines = 0;
const perFile: Array<{ file: string; n: number }> = [];

for (const file of collectDocs(join(ROOT, 'docs'))) {
  const text = readFileSync(file, 'utf-8');
  const lines = text.split('\n');

  // ① 收集本文件的「未实现名字」
  const names = new Set<string>();
  for (const l of lines) {
    const m = RE_NOTE.exec(l);
    if (!m) continue;
    for (const n of (m[1] ?? '').split(',')) {
      const t = n.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(t)) names.add(t);
    }
  }
  if (names.size === 0) continue;

  // ② 标注列举性文本
  //
  // ⚠️⚠️ **必须按「小节」作用域，不能用文件级并集** —— 这是实测踩到的假阳性：
  // `docs/api/common.md` 里 `isNumber` 出现两次 ——
  // `@lytjs/common-is` **已实现**（表里第 36 行是合法 API），
  // 而 `@lytjs/common-validate` **未实现**（第 412 行）。
  // 文件级并集会把**合法的那一行也标成「未实现」** ⇒ 污染文档。
  // ⇒ 规则：名字集合**在每个标题处重置**，只影响其后的表格行。
  //   标题自身则**向前看**本小节内的 note 注释，命中才标注
  //   （因为 `## funcName()` 这种小节标题就紧跟在其 import 的 note 之后）。
  const idOf = (line: string): string | null => {
    const m = /^#{1,6}\s+`?([A-Za-z_$][\w$]*)`?\s*[(（]?/.exec(line);
    return m ? m[1] : null;
  };
  const parseNote = (line: string): string[] | null => {
    const m = RE_NOTE.exec(line);
    if (!m) return null;
    return (m[1] ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => /^[A-Za-z_$][\w$]*$/.test(t));
  };

  let changed = 0;
  let current: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const note = parseNote(line);
    if (note) {
      current = note;
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      // 标题：只看**本小节内向后的第一条 note** 是否含它。
      //
      // ⚠️ 曾试过更激进的判据「该标识符在任何包的导出面里都不存在 ⇒ 标注」，
      //   **实测假阳性率极高**（已撤回）：任何以 ASCII 词开头的标题都会被当成 API 名 ——
      //   `### Git 工作流` / `## TypeScript 编码规范` / `#### Netlify` 全被误标。
      //   ⇒ 标题只认「本小节内确有 note 明确点名它」这一种证据。
      const id = idOf(line);
      if (id && !line.includes(MARK)) {
        for (let k = i + 1; k < Math.min(i + 40, lines.length); k++) {
          if (/^#{1,6}\s/.test(lines[k])) break;
          const n2 = parseNote(lines[k]);
          if (!n2) continue;
          if (n2.includes(id)) {
            lines[i] = line + ' ' + MARK;
            changed++;
          }
          break;
        }
      }
      current = []; // 新小节开始 ⇒ 重置
      continue;
    }
    if (current.length === 0) continue;
    if (line.includes(MARK)) continue;
    if (!/^\s*\|.*\|\s*$/.test(line)) continue;
    const hit = current.some((n) => new RegExp('\\b' + n + '\\b').test(line));
    if (!hit) continue;
    const idx = line.lastIndexOf('|');
    lines[i] = idx > 0 ? line.slice(0, idx) + ' ' + MARK + ' |' : line + ' ' + MARK;
    changed++;
  }

  if (changed > 0) {
    touchedFiles++;
    markedLines += changed;
    perFile.push({ file: file.slice(ROOT.length + 1), n: changed });
    if (!DRY) writeFileSync(file, lines.join('\n'), 'utf-8');
  }
}

console.log(
  (DRY ? '[dry] ' : '') + '改动文件 ' + touchedFiles + ' 个，标注 ' + markedLines + ' 行',
);
for (const f of perFile.sort((a, b) => b.n - a.n).slice(0, 10)) {
  console.log('  ' + String(f.n).padStart(3) + '  ' + f.file);
}
