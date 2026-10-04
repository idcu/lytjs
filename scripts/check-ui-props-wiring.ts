/**
 * 检测「声明了 props 却从未在组件体里引用」的组件
 * （`@lytjs/ui` 的一次性核查已固化为脚本）
 *
 * ## 为什么需要它
 *
 * 2026-10-04 实测：UI 包 57 个组件里 **25 个**存在「props 声明了但组件体里
 * 从未出现」的项。危害是**静默失效** —— 用户传了回调/选项，既不报错也不生效，
 * 典型如 `Dialog.onConfirm`：组件只渲染 `footer` 插槽（确认按钮由使用者提供），
 * 却仍声明 `onConfirm: { type: Function }` ⇒ **永远不会被调用**。
 * 这与此前发现的 `count(count() + 1)`（文档承诺的写入方式静默无效）同族。
 *
 * ## 判据形态（零清单、可复跑）
 *
 * 对每个组件：定位 `props: { … }` 块 ⇒ 取出键名 ⇒ 检查**块之后的组件体**
 * 是否还出现这些标识符。全部未出现 ⇒ 判为「全部未接线」；
 * 部分未出现 ⇒ 「部分未接线」。
 *
 * ⚠️ 这是**文本级**判据：它能可靠发现「完全没被引用」，
 * 但「被引用了」**不等于**行为正确（可能是写在死分支里）。
 * 正向验证仍需真跑一次。
 *
 * ## 用法
 *   tsx scripts/check-ui-props-wiring.ts           # 列出可疑组件
 *   tsx scripts/check-ui-props-wiring.ts --count   # 只报数字
 *
 * 退出码：始终 0（这是**报告型**工具，不是红门禁 ——
 * 25 个组件的修法各不相同：有的该实现、有的该从声明里删，
 * 需要逐个判断，不适合用一条命令替我做决定）。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const UI_DIR = join(ROOT, 'packages/ecosystem/packages/ui/src/components');
const COUNT_ONLY = process.argv.includes('--count');

if (!existsSync(UI_DIR)) {
  console.error('未找到 UI 组件目录：' + UI_DIR);
  process.exit(0);
}

/** 定位 `props: { … }` 的配对花括号（跳过嵌套） */
function extractPropsBlock(src: string): { end: number; text: string } | null {
  const i = src.indexOf('props:');
  if (i < 0) return null;
  let depth = 0;
  let started = false;
  for (let k = i + 6; k < src.length; k++) {
    const c = src[k];
    if (c === '{') {
      depth++;
      started = true;
    } else if (c === '}') {
      depth--;
      if (started && depth === 0) return { end: k, text: src.slice(i, k + 1) };
    }
  }
  return null;
}

const files = readdirSync(UI_DIR).filter((f) => f.endsWith('.ts'));
let fullyWired = 0;
let noProps = 0;
const suspicious: Array<{ file: string; unused: string[]; all: boolean }> = [];

for (const f of files) {
  const src = readFileSync(join(UI_DIR, f), 'utf-8');
  const block = extractPropsBlock(src);
  if (!block) {
    noProps++;
    continue;
  }
  const body = src.slice(block.end);
  const names = [...block.text.matchAll(/^\s{2,}(\w+)\s*[?:]/gm)].map((m) => m[1] as string);
  if (names.length === 0) {
    noProps++;
    continue;
  }
  const unused = names.filter((n) => !new RegExp('\\b' + n + '\\b').test(body));
  if (unused.length === names.length) suspicious.push({ file: f, unused, all: true });
  else if (unused.length > 0) suspicious.push({ file: f, unused, all: false });
  else fullyWired++;
}

console.log('组件总数: ' + files.length);
console.log('props 全部被引用: ' + fullyWired);
console.log('未声明 props: ' + noProps);
console.log('存在未引用 prop 的组件: ' + suspicious.length);

if (!COUNT_ONLY) {
  for (const s of suspicious) {
    console.log(
      '  ' +
        (s.all ? '【全部未接线】' : '【部分未接线】') +
        ' ' +
        s.file +
        ' → ' +
        s.unused.join(', '),
    );
  }
  console.log('\n⚠️ 文本级判据：能可靠发现「完全没被引用」；「被引用」≠ 行为正确。');
  console.log('⚠️ 这是**报告型**工具，不作为红门禁 —— 每个组件的修法不同');
  console.log('   （有的该实现、有的该从声明里删），需要逐个判断。');
}
