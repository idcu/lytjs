#!/usr/bin/env tsx
/**
 * scripts/check-ui-styles.ts
 *
 * 判据：**每个 UI 组件至少有一个它自己发出的类名，在 `styles/index.css` 里存在对应规则。**
 *
 * ## 为什么需要（2026-10-31 新增）
 *
 * 全维度评估实测：**18 个组件的类名在 1,942 行 CSS 里 0 命中**。
 * 组件能渲染出 DOM，测试也全绿（测试断言的是 class 字符串，不是"有没有样式"），
 * 但用户看到的是一堆裸 div：
 *   · `Modal` / `Drawer` 变成文档流末尾的块，没有遮罩、没有定位；
 *   · `Message.success()` 出现在页面底部；
 *   · `Tabs` 没有标签栏；`Rate` 显示成一排字符。
 *
 * 本守卫把「发了类名却没有任何样式」变成红门禁。
 *
 * 退出码：0 = 全部组件都有样式；1 = 存在零样式组件。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const UI_SRC = join(ROOT, 'packages/ecosystem/packages/ui/src');
const COMPONENTS_DIR = join(UI_SRC, 'components');
const CSS_PATH = join(UI_SRC, 'styles/index.css');

const css = readFileSync(CSS_PATH, 'utf-8');
const cssClasses = new Set<string>();
for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
  cssClasses.add(m[1]!);
}

interface Row {
  file: string;
  emitted: string[];
  styled: string[];
}

const rows: Row[] = [];
for (const name of readdirSync(COMPONENTS_DIR)) {
  if (!name.endsWith('.ts')) continue;
  if (name === 'types.ts' || name === 'index.ts') continue;
  if (name.includes('.test.') || name.includes('.spec.')) continue;
  const src = readFileSync(join(COMPONENTS_DIR, name), 'utf-8');
  const emitted = new Set<string>();
  for (const m of src.matchAll(/['"](lyt-[a-z0-9-]+)['"]/g)) {
    emitted.add(m[1]!);
  }
  if (emitted.size === 0) continue;
  const styled = [...emitted].filter((c) => cssClasses.has(c));
  rows.push({ file: name, emitted: [...emitted], styled });
}

const zero = rows.filter((r) => r.styled.length === 0);
const partial = rows.filter((r) => r.styled.length > 0 && r.styled.length < r.emitted.length);

console.log('\n🔍 UI 样式覆盖守卫 check-ui-styles\n');
console.log(`   组件 ${rows.length} 个 · CSS 类选择器 ${cssClasses.size} 个`);

if (zero.length === 0) {
  console.log(
    `\n✅ 通过：所有组件都有样式规则（其中 ${partial.length} 个只覆盖了部分类名，属正常）\n`,
  );
  process.exit(0);
}

console.log(`\n❌ ${zero.length} 个组件**发出了类名但没有任何样式**（用户看到的是裸 DOM）：\n`);
for (const r of zero) {
  console.log(`   ${relative(ROOT, join(COMPONENTS_DIR, r.file))}`);
  console.log(
    `     发出的类名：${r.emitted.slice(0, 6).join(', ')}${r.emitted.length > 6 ? ' …' : ''}`,
  );
}
console.log('\n   修法：在 packages/ecosystem/packages/ui/src/styles/index.css 补对应规则\n');
process.exit(1);
