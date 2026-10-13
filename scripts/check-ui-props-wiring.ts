/**
 * UI props 接线门禁（**棘轮**）—— 检测「声明了 props 却从未在组件体里引用」的组件
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
 * 正向验证仍需真跑一次（见 `tests/e2e-breadcrumb.test.ts` 的写法）。
 *
 * ## 棘轮（2026-10-10 从「报告型」升级为「红门禁」）
 *
 * 升级前本脚本**恒 exit 0** —— 它只是一份报告，不是门禁：既拦不住新增欠账，
 * 也没有任何豁免机制，连 `keel/checks/rules.md`「一条规则的准入标准」第 2 条
 * （"误报可接受，且有显式豁免方式"）都不满足。
 *
 * 现按与 `check-circular.ts` **相同**的棘轮模式改造：
 *   - 既有欠账写在 `scripts/ui-props-wiring-baseline.txt`（每行一条，需注明原因）；
 *   - 门禁**只对新增**报错（exit 1）；
 *   - 基线里的条目已消失时会提示同步删行，让基线只反映当前真实欠账。
 *
 * 2026-10-10 升级当口，实际欠账为 **0**（`存在未引用 prop 的组件: 0`），
 * 故基线初始为空 —— 门禁从第一天起就是**严格**的，无需容忍任何既有欠账。
 *
 * ## 用法
 *   tsx scripts/check-ui-props-wiring.ts                  # 门禁（新增即红）
 *   tsx scripts/check-ui-props-wiring.ts --count          # 只报数字
 *   tsx scripts/check-ui-props-wiring.ts --write-baseline # 重建棘轮基线
 *
 * ⚠️ `--write-baseline` 会**整体覆盖**基线文件 —— 文件里若有人工补的
 * "为什么这条可以欠着"的注释，会被抹掉。改动前请先看 diff。
 *
 * 退出码：0 = 无新增；1 = 有新增欠账。
 */
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const UI_DIR = join(ROOT, 'packages/ecosystem/packages/ui/src/components');
const BASELINE = join(ROOT, 'scripts/ui-props-wiring-baseline.txt');
const COUNT_ONLY = process.argv.includes('--count');
const WRITE_BASELINE = process.argv.includes('--write-baseline');

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

function readBaseline(): Set<string> {
  if (!existsSync(BASELINE)) return new Set();
  return new Set(
    readFileSync(BASELINE, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#')),
  );
}

/** 一条欠账的稳定文本表示：`<文件> → <prop1>, <prop2>` */
function entryOf(s: { file: string; unused: string[] }): string {
  return `${s.file} → ${s.unused.join(', ')}`;
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
  // ★ 2026-10-04 修正**假阳性**：多行 prop 定义里的**选项键**会被误当 prop 名。
  //   例：`color: {\n      type: [...],\n      default: ''\n    }` ——
  //   `default:` 独占一行且缩进更深，但它不是 prop 名。
  //   ⇒ 规则：**只接受与首个 prop 名行缩进完全相同**的行
  //     （props 块自身的层级），并额外排除保留的选项键。
  const RESERVED = new Set(['type', 'default', 'required', 'validator']);
  const all = [...block.text.matchAll(/^([ \t]+)(\w+)\s*[?:]/gm)];
  const baseIndent = all.length > 0 ? all[0][1]!.length : 0;
  const names = all
    .filter((m) => m[1]!.length === baseIndent)
    .map((m) => m[2] as string)
    .filter((n) => !RESERVED.has(n));
  if (names.length === 0) {
    noProps++;
    continue;
  }
  const unused = names.filter((n) => !new RegExp('\\b' + n + '\\b').test(body));
  if (unused.length === names.length) suspicious.push({ file: f, unused, all: true });
  else if (unused.length > 0) suspicious.push({ file: f, unused, all: false });
  else fullyWired++;
}

// ── 写基线模式 ────────────────────────────────────────────────
if (WRITE_BASELINE) {
  const entries = suspicious.map(entryOf);
  const header = [
    '# UI props 接线基线（棘轮）—— 由 `tsx scripts/check-ui-props-wiring.ts --write-baseline` 生成',
    '#',
    '# 语义：这些是**已确认的既有欠账**，门禁只对**新增**报错。',
    '# 格式：每行一条，`<组件文件> → <未被引用的 prop 名, …>`。',
    '#',
    '# 加一行前请先想清楚：这个 prop 是**该实现**还是**该从声明里删**？',
    '# 两条都不做而只是加进基线，等于把「静默失效」正式固化为契约。',
    '#',
  ].join('\n');
  writeFileSync(BASELINE, `${header}${entries.length > 0 ? entries.join('\n') + '\n' : ''}`);
  console.log(`\n✅ 已写入基线：${entries.length} 条 → scripts/ui-props-wiring-baseline.txt\n`);
  process.exit(0);
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
}

// ── 棘轮比对 ──────────────────────────────────────────────────
const known = readBaseline();
const current = new Set(suspicious.map(entryOf));
const fresh = [...current].filter((e) => !known.has(e));
const fixed = [...known].filter((e) => !current.has(e));

if (fixed.length > 0) {
  console.log(`\n🎉 已消除的欠账（基线里有、现在没有）：${fixed.length} 条`);
  for (const e of fixed) console.log(`   ✔ ${e}`);
  console.log('   ⇒ 建议**同步删掉基线里的对应行**，让基线只反映当前真实欠账。\n');
}

if (fresh.length === 0) {
  console.log(
    `✅ UI props 接线：${current.size} 条欠账，与基线一致（无新增）。\n` +
      `   （基线 ${known.size} 条 · 门禁只拦新增；彻底解决请逐个组件判断后删基线行）`,
  );
  process.exit(0);
}

console.log(`❌ 新增 ${fresh.length} 条「props 声明了却没接线」：\n`);
for (const e of fresh) console.log(`  🔌 ${e}`);
console.log(
  '\n这些是**新引入**的静默失效 —— 用户传了参数，既不报错也不生效。\n' +
    '请二选一：① 在组件体里真正实现它；② 从 `props` 声明里删掉它。\n' +
    '若确认是既有欠账而本次只是暴露，请写进 scripts/ui-props-wiring-baseline.txt 并注明原因。',
);
process.exit(1);
