#!/usr/bin/env tsx
/**
 * scripts/check-ui-styles.ts
 *
 * 判据：**组件发出的每一个静态结构类名，都必须在 `styles/index.css` 的选择器里真实出现。**
 *
 * ## 为什么收紧（2026-11-06，B04）
 *
 * 旧判据是「每个组件**至少有一个**类名在 CSS 文本里出现」。它有两个漏洞：
 *
 *   1. **只要求一个**：组件发了 `lyt-dialog__wrapper` / `__header` / `__body` …，
 *      只要根类 `.lyt-dialog` 有规则就算通过 ⇒ 整个内部结构可以完全没有样式；
 *   2. **只查字符串出现**：在 CSS 文件任意位置（含注释、声明值、别处的选择器）
 *      出现该字符串就算命中 ⇒ 选择器并没有真正匹配。
 *
 * 收紧后：
 *   · CSS 侧**只从选择器位置**（`{` 之前、剥掉注释与 `@keyframes` 内部）提取类名；
 *   · 组件侧提取**字符串字面量**里的 `lyt-*` 类名（动态前缀如 `lyt-progress--${x}`
 *     末尾带 `-`，无法静态判定，直接跳过）；
 *   · **每一个**静态类名都必须命中，不再是「至少一个」；
 *   · Golden 20（`scripts/ui-contracts.json`）**不允许**进入基线，必须零缺失。
 *
 * ## 棘轮
 *
 * 判据收紧当口会一次性暴露既有欠账。experimental 组件的欠账登记在
 * `scripts/ui-styles-baseline.txt`（一行一条 `<组件> → <类名>`，只允许减少）：
 *   · 基线内 ⇒ 记作欠账，不报红；
 *   · 不在基线 ⇒ 新增红（exit 1）；
 *   · Golden 20 即便出现在基线里也直接报红（防「把红登记成绿」）。
 *
 * 用法：
 *   tsx scripts/check-ui-styles.ts                   # 门禁：新增缺失即红
 *   tsx scripts/check-ui-styles.ts --write-baseline  # 重建棘轮基线（会覆盖人工注释）
 *   tsx scripts/check-ui-styles.ts --count           # 只报数字
 *
 * 退出码：0 = 无新增缺失；1 = 有新增缺失。
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const UI_SRC = join(ROOT, 'packages/ecosystem/packages/ui/src');
const COMPONENTS_DIR = join(UI_SRC, 'components');
const CSS_PATH = join(UI_SRC, 'styles/index.css');
const CONTRACTS_PATH = join(ROOT, 'scripts/ui-contracts.json');
const BASELINE_PATH = join(ROOT, 'scripts/ui-styles-baseline.txt');

const COUNT_ONLY = process.argv.includes('--count');
const WRITE_BASELINE = process.argv.includes('--write-baseline');

/** Golden 20：不允许把缺失登记进基线（单一真相源 = 契约登记表）。 */
const GOLDEN = new Set<string>(
  existsSync(CONTRACTS_PATH)
    ? (JSON.parse(readFileSync(CONTRACTS_PATH, 'utf-8')).components as string[])
    : [],
);

/** 去掉 TS/CSS 注释，避免把注释里的示例类名当成真实发出的类名。 */
function stripComments(src: string): string {
  let out = '';
  let quote: string | null = null;
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    const n = src[i + 1];
    if (quote) {
      if (c === '\\') {
        out += c + (n ?? '');
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    out += c;
    i++;
  }
  return out;
}

/**
 * 从 CSS **选择器**里提取类名。
 *
 * 用栈区分三种块：普通规则 / at-rule 包装（`@media` 等）/ `@keyframes`
 * （`from` / `to` / `0%` 不是元素选择器，不能参与判定）。
 */
function selectorClassNames(css: string): Set<string> {
  const text = stripComments(css);
  const classes = new Set<string>();
  const stack: Array<'keyframes' | 'at' | 'rule'> = [];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '{') {
      const selector = buf.trim();
      const insideKeyframes = stack.includes('keyframes');
      const isKeyframes = /^@(?:-\w+-)?keyframes/.test(selector);
      const isAtRule = selector.startsWith('@');
      if (!isAtRule && !insideKeyframes) {
        for (const m of selector.matchAll(/\.([a-zA-Z][\w-]*)/g)) classes.add(m[1]!);
      }
      stack.push(isKeyframes ? 'keyframes' : isAtRule ? 'at' : 'rule');
      buf = '';
    } else if (c === '}') {
      stack.pop();
      buf = '';
    } else if (c === ';' && stack.length === 0) {
      buf = '';
    } else {
      buf += c;
    }
  }
  return classes;
}

/** 组件源码里**字符串字面量**中的静态 `lyt-*` 类名（动态前缀跳过）。 */
function emittedClassNames(src: string): string[] {
  const text = stripComments(src);
  const found = new Set<string>();
  const literal =
    /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
  for (const m of text.matchAll(literal)) {
    const body = m[1] ?? m[2] ?? m[3] ?? '';
    for (const t of body.matchAll(/lyt-[a-z0-9_-]+/g)) {
      const cls = t[0]!;
      // CSS 变量名（`var(--lyt-color-info)`）不是类名
      if (t.index !== undefined && body[t.index - 1] === '-') continue;
      // 末尾 `-` 说明后面接了 `${…}`（动态修饰符），静态无法判定，跳过
      if (!cls.endsWith('-')) found.add(cls);
    }
  }
  return [...found];
}

interface Row {
  file: string;
  component: string;
  emitted: string[];
  missing: string[];
  golden: boolean;
}

const css = readFileSync(CSS_PATH, 'utf-8');
const selectors = selectorClassNames(css);

const rows: Row[] = [];
for (const name of readdirSync(COMPONENTS_DIR)) {
  if (!name.endsWith('.ts')) continue;
  if (name === 'types.ts' || name === 'index.ts') continue;
  if (name.includes('.test.') || name.includes('.spec.')) continue;
  const component = name.replace(/\.ts$/, '');
  const src = readFileSync(join(COMPONENTS_DIR, name), 'utf-8');
  const emitted = emittedClassNames(src);
  if (emitted.length === 0) continue;
  const missing = emitted.filter((c) => !selectors.has(c));
  rows.push({ file: name, component, emitted, missing, golden: GOLDEN.has(component) });
}

const withMissing = rows.filter((r) => r.missing.length > 0);
const goldenMissing = withMissing.filter((r) => r.golden);
const totalEmitted = rows.reduce((n, r) => n + r.emitted.length, 0);
const totalMissing = rows.reduce((n, r) => n + r.missing.length, 0);

/** 基线：一行一条 `<组件> → <类名>`（只允许减少）。 */
function readBaseline(): Set<string> {
  if (!existsSync(BASELINE_PATH)) return new Set();
  return new Set(
    readFileSync(BASELINE_PATH, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#')),
  );
}
const entryOf = (r: Row, cls: string): string => `${r.component} → ${cls}`;
const current = new Set(withMissing.flatMap((r) => r.missing.map((c) => entryOf(r, c))));

if (WRITE_BASELINE) {
  const entries = [...current].filter((e) => !GOLDEN.has(e.split(' → ')[0]!)).sort();
  const header = [
    '# UI 样式覆盖基线（棘轮）—— 由 `tsx scripts/check-ui-styles.ts --write-baseline` 生成',
    '#',
    '# 语义：这些是**已确认的既有欠账**（类名已发出、但样式表里没有对应规则），',
    '# 门禁只对**新增**报错。Golden 20 不允许出现在本文件（必须零缺失）。',
    '# 格式：每行一条，`<组件> → <未命中的类名>`。',
    '#',
    '# 加一行前请先想清楚：这个类名是**该补样式**还是**该从组件里删掉**？',
    '# 两条都不做而只是加进基线，等于把「裸 DOM」正式固化为契约。',
    '#',
  ].join('\n');
  writeFileSync(BASELINE_PATH, `${header}\n${entries.length > 0 ? entries.join('\n') + '\n' : ''}`);
  console.log(`\n✅ 已写入基线：${entries.length} 条 → scripts/ui-styles-baseline.txt\n`);
  process.exit(0);
}

const known = readBaseline();
const fresh = [...current].filter((e) => !known.has(e));
const fixed = [...known].filter((e) => !current.has(e));

console.log('\n🔍 UI 样式覆盖守卫 check-ui-styles（选择器级匹配）\n');
console.log(
  `   组件 ${rows.length} 个 · 选择器类名 ${selectors.size} 个 · 发出的静态类名 ${totalEmitted} 个`,
);
console.log(
  `   缺失 ${totalMissing} 个（${withMissing.length} 个组件）· 基线欠账 ${known.size} 条`,
);

if (COUNT_ONLY) {
  console.log(`\n新增缺失: ${fresh.length} · Golden 缺失: ${goldenMissing.length}\n`);
  process.exit(fresh.length > 0 || goldenMissing.length > 0 ? 1 : 0);
}

if (goldenMissing.length > 0) {
  console.log('\n❌ Golden 20 存在无规则的类名（不允许进基线，必须补样式或删类名）：\n');
  for (const r of goldenMissing) {
    console.log(`   ${r.component}`);
    console.log(`     ${r.missing.join(', ')}`);
  }
}

const freshNonGolden = fresh.filter((e) => !GOLDEN.has(e.split(' → ')[0]!));
if (freshNonGolden.length > 0) {
  console.log(`\n❌ ${freshNonGolden.length} 条新增缺失（不在基线内）：\n`);
  for (const e of freshNonGolden) console.log(`   ${e}`);
  console.log(
    '\n   修法二选一：① 在 packages/ecosystem/packages/ui/src/styles/index.css 补选择器规则；' +
      '\n   ② 确认该类名没人使用后从组件里删掉。确认是既有欠账才写进 scripts/ui-styles-baseline.txt。',
  );
}

if (fixed.length > 0) {
  console.log(`\n🎉 已消除的欠账（基线里有、现在没有）：${fixed.length} 条`);
  for (const e of fixed) console.log(`   ✔ ${e}`);
  console.log('   ⇒ 建议同步删掉基线里的对应行，让基线只反映当前真实欠账。');
}

if (freshNonGolden.length === 0 && goldenMissing.length === 0) {
  console.log(
    `\n✅ 通过：Golden 20 零缺失；其余 ${withMissing.length} 个组件共 ${totalMissing} 条欠账，` +
      `与基线一致（基线 ${known.size} 条，只拦新增）。\n`,
  );
  process.exit(0);
}

console.log('');
process.exit(1);
