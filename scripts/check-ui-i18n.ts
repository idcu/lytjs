#!/usr/bin/env tsx
/**
 * scripts/check-ui-i18n.ts
 *
 * 判据（B05）：
 *   1. **locale 完整性**：zh-CN / en-US 键集合完全一致，`{param}` 占位符一致，
 *      任何文案不得为空串（空串 = 界面静默少一句话，比缺键更难发现）。
 *   2. **Golden 20 零硬编码**：组件源码里不允许出现面向用户的硬编码文案 ——
 *      含中文的字符串字面量，以及 `ariaLabel:` / `'aria-label':` / `alt:` 后的静态字面量。
 *      既有欠账登记在 `scripts/ui-i18n-baseline.txt`（棘轮，只允许减少）。
 *
 * 缺键策略（运行时的另一半）：`t()` 当前 locale 缺键 → 回退 zh-CN → 仍缺则**抛错**，
 * 永不返回空串。本门禁保证「表里两套语言都齐全」，运行时兜底只用于自定义 locale。
 *
 * 用法：
 *   tsx scripts/check-ui-i18n.ts                   # 门禁：新增硬编码 / locale 缺键即红
 *   tsx scripts/check-ui-i18n.ts --write-baseline  # 重建硬编码棘轮基线
 *   tsx scripts/check-ui-i18n.ts --count           # 只报数字
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FALLBACK_LOCALE,
  UI_LOCALE_MESSAGES,
  type UiLocaleMessages,
  type UiLocaleName,
} from '../packages/ecosystem/packages/ui/src/locale/messages';

const ROOT = process.cwd();
const UI_SRC = join(ROOT, 'packages/ecosystem/packages/ui/src');
const COMPONENTS_DIR = join(UI_SRC, 'components');
const CONTRACTS_PATH = join(ROOT, 'scripts/ui-contracts.json');
const BASELINE_PATH = join(ROOT, 'scripts/ui-i18n-baseline.txt');

const COUNT_ONLY = process.argv.includes('--count');
const WRITE_BASELINE = process.argv.includes('--write-baseline');

const LOCALES = Object.keys(UI_LOCALE_MESSAGES) as UiLocaleName[];
/** Golden 20：扫描硬编码的唯一范围（不扩散到 experimental）。 */
const GOLDEN: string[] = existsSync(CONTRACTS_PATH)
  ? (JSON.parse(readFileSync(CONTRACTS_PATH, 'utf-8')).components as string[])
  : [];

/** 去掉 TS 注释，避免把注释里的示例文案当成硬编码。 */
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

const LITERAL_RE =
  /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
const CJK_RE = /[\u4e00-\u9fff]/;
const A11Y_LINE_RE = /(?:ariaLabel|'aria-label'|alt)\s*:/;
const A11Y_KEYS = new Set(['aria-label', 'ariaLabel', 'alt']);

/**
 * 一个 Golden 组件里的硬编码面向用户文案。
 *
 * 判据刻意保守：
 *   · 含 CJK 的字面量一律算（Golden 20 面向用户的文案都是中文）；
 *   · `ariaLabel` / `'aria-label'` / `alt` 后的静态字面量一律算（哪怕是英文）。
 * 变量拼接（`` `第${page}页` ``）也会被 CJK 规则抓到。
 */
function hardcodedTexts(src: string): string[] {
  const text = stripComments(src);
  const found = new Set<string>();
  for (const m of text.matchAll(LITERAL_RE)) {
    const body = m[1] ?? m[2] ?? m[3] ?? '';
    if (!body.trim()) continue;
    if (CJK_RE.test(body)) found.add(body);
  }
  // a11y 文案可能不是紧跟冒号的字面量（`ariaLabel: cond || 'Progress'`），
  // 因此按行扫描：只要该行是 a11y 属性赋值，行内所有字面量都算（属性名本身除外）。
  for (const line of text.split('\n')) {
    if (!A11Y_LINE_RE.test(line)) continue;
    for (const m of line.matchAll(LITERAL_RE)) {
      const body = m[1] ?? m[2] ?? m[3] ?? '';
      if (!body.trim() || A11Y_KEYS.has(body)) continue;
      // `ariaLabel: t('pagination.prev')` —— 字面量是 i18n **key**，不是文案。
      const prefix = line.slice(0, m.index ?? 0);
      if (/t\(\s*$/.test(prefix)) continue;
      found.add(body);
    }
  }
  return [...found];
}

interface Row {
  component: string;
  texts: string[];
}

const rows: Row[] = [];
for (const component of GOLDEN) {
  const file = join(COMPONENTS_DIR, `${component}.ts`);
  if (!existsSync(file)) continue;
  const texts = hardcodedTexts(readFileSync(file, 'utf-8'));
  if (texts.length > 0) rows.push({ component, texts });
}
const current = new Set(rows.flatMap((r) => r.texts.map((t) => `${r.component} → ${t}`)));

function readBaseline(): Set<string> {
  if (!existsSync(BASELINE_PATH)) return new Set();
  return new Set(
    readFileSync(BASELINE_PATH, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#')),
  );
}
const known = readBaseline();

if (WRITE_BASELINE) {
  const entries = [...current].sort();
  const header = [
    '# Golden 20 硬编码文案基线（i18n 棘轮）—— 由 `tsx scripts/check-ui-i18n.ts --write-baseline` 生成',
    '#',
    '# 语义：这些是**已确认待迁移**到 `src/locale/messages.ts` 的硬编码文案，',
    '# 门禁只对**新增**报错。最终目标：本文件清空（Golden 20 零硬编码）。',
    '# 格式：每行一条，`<组件> → <原文>`。新增前先问：为什么不用 t()？',
    '#',
  ].join('\n');
  writeFileSync(BASELINE_PATH, `${header}\n${entries.length > 0 ? entries.join('\n') + '\n' : ''}`);
  console.log(`\n✅ 已写入基线：${entries.length} 条 → scripts/ui-i18n-baseline.txt\n`);
  process.exit(0);
}

// ── locale 完整性 ─────────────────────────────────────────────────────
const localeErrors: string[] = [];
const fallbackMessages = UI_LOCALE_MESSAGES[FALLBACK_LOCALE];
const fallbackKeys = Object.keys(fallbackMessages) as Array<keyof UiLocaleMessages>;
for (const locale of LOCALES) {
  const messages = UI_LOCALE_MESSAGES[locale];
  const keys = Object.keys(messages) as Array<keyof UiLocaleMessages>;
  for (const key of fallbackKeys) {
    if (!keys.includes(key)) localeErrors.push(`${locale} 缺键: ${key}`);
    const value = messages[key];
    if (typeof value !== 'string' || value.trim() === '') {
      localeErrors.push(`${locale} 空文案: ${key}`);
    }
  }
  for (const key of keys) {
    if (!fallbackKeys.includes(key)) localeErrors.push(`${locale} 多余键: ${key}`);
  }
}
for (const key of fallbackKeys) {
  const base = new Set(
    (fallbackMessages[key].match(/\{(\w+)\}/g) ?? []).map((x) => x.slice(1, -1)),
  );
  for (const locale of LOCALES) {
    if (locale === FALLBACK_LOCALE) continue;
    const other = new Set(
      (UI_LOCALE_MESSAGES[locale][key].match(/\{(\w+)\}/g) ?? []).map((x) => x.slice(1, -1)),
    );
    for (const p of base) if (!other.has(p)) localeErrors.push(`${locale}/${key} 缺占位 {${p}}`);
    for (const p of other) if (!base.has(p)) localeErrors.push(`${locale}/${key} 多占位 {${p}}`);
  }
}

const fresh = [...current].filter((e) => !known.has(e));
const fixed = [...known].filter((e) => !current.has(e));
const totalHardcoded = current.size;

console.log('\n🔍 Golden 20 i18n 守卫 check-ui-i18n\n');
console.log(
  `   locale ${LOCALES.length} 套（${LOCALES.join(', ')}）· 文案键 ${fallbackKeys.length} 个 · ` +
    `Golden 20 硬编码 ${totalHardcoded} 条（${rows.length} 个组件）· 基线欠账 ${known.size} 条`,
);

if (COUNT_ONLY) {
  console.log(`\nlocale 缺键/占位问题: ${localeErrors.length} · 新增硬编码: ${fresh.length}\n`);
  process.exit(localeErrors.length > 0 || fresh.length > 0 ? 1 : 0);
}

if (localeErrors.length > 0) {
  console.log(`\n❌ locale 表不完整（${localeErrors.length} 条）：\n`);
  for (const e of localeErrors) console.log(`   ${e}`);
}

if (fresh.length > 0) {
  console.log(`\n❌ ${fresh.length} 条新增硬编码（不在基线内）：\n`);
  for (const e of fresh) console.log(`   ${e}`);
  console.log(
    '\n   修法：把文案迁到 packages/ecosystem/packages/ui/src/locale/messages.ts，' +
      '组件内改用 `t(key, params)`。确认是既有欠账才写进 scripts/ui-i18n-baseline.txt。',
  );
}

if (fixed.length > 0) {
  console.log(`\n🎉 已迁移（基线里有、源码里已消失）：${fixed.length} 条`);
  for (const e of fixed) console.log(`   ✔ ${e}`);
  console.log('   ⇒ 建议同步删掉基线里的对应行，让基线只反映当前真实欠账。');
}

if (localeErrors.length === 0 && fresh.length === 0) {
  console.log(
    `\n✅ 通过：${LOCALES.length} 套 locale 键与占位一致；Golden 20 硬编码 ${totalHardcoded} 条，` +
      `与基线一致（${known.size} 条，只拦新增）。\n`,
  );
  process.exit(0);
}

console.log('');
process.exit(1);
