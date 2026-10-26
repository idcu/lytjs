/**
 * 端到端测试断言强度门禁：禁止「形状断言」冒充「行为断言」
 *
 * ## 为什么需要它
 *
 * 2026-10-26 的全维度评估得出一个刺眼的结论：**5,889 条用例全绿，同时存在会丢内容、
 * 丢双向绑定的 P0**。原因不是用例少，而是断言弱 —— 它们断言的是「产物里出现了某个字符串」
 * 或「某个对象存在」，而不是「页面上看得见什么」。
 *
 * 三个实证（都在 `*e2e*.test.ts` 里）：
 * - `expect(x).toBeDefined()`：布尔 `false` 也算 defined ⇒ 恒真；
 * - `expect(code).toContain('createBlock')`：只要 codegen 还拼得出这个词就绿，
 *   哪怕整棵子树被丢；
 * - `expect(typeof renderer).toBe('object')`：对任何对象都成立。
 *
 * ## 三条规则（只扫 `*e2e*.test.ts`）
 *
 * | 规则 | 判据 | 为什么它抓不住缺陷 |
 * |---|---|---|
 * | A | `toBeDefined()` | `false` / `0` / `''` 全部"已定义" |
 * | B | `toContain('createBlock' \| 'openBlock' \| '_hoisted_')` | 断言编译产物形状，与运行时行为无关 |
 * | C | `expect(typeof X).toBe('object')` | 对任何对象/数组/函数外对象都成立 |
 *
 * ## 边界（诚实声明）
 *
 * - **文本级**判据：抓「出现了这种写法」，抓不到「断言写对了但预期值错」。
 * - 只扫文件名含 `e2e` 的测试：`*-battery.test.ts` 里的同类写法不在本门禁范围内
 *   （它们是更细的单元电池，允许一定程度的形状断言）。
 * - 允许在**注释**里提到这些写法（会先剔除注释）。
 *
 * ## 用法
 *   tsx scripts/check-e2e-assertions.ts
 *
 * 退出码：有命中 ⇒ 1；否则 0。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGES = join(ROOT, 'packages');

interface Rule {
  id: string;
  pattern: RegExp;
  why: string;
}

const RULES: Rule[] = [
  {
    id: 'A',
    pattern: /\.toBeDefined\(\)/g,
    why: '布尔 false / 0 / 空串都算"已定义" ⇒ 恒真。改成断言具体值或 DOM 文本。',
  },
  {
    id: 'B',
    pattern: /\.toContain\(\s*['"`][^'"`]*(?:createBlock|openBlock|_hoisted_)[^'"`]*['"`]\s*\)/g,
    why: '断言编译产物形状 ≠ 断言运行行为。改成挂载后断言 textContent / innerHTML。',
  },
  {
    id: 'C',
    pattern: /expect\(\s*typeof\s+[^)]+\)\.toBe\(\s*['"]object['"]\s*\)/g,
    why: '对任何对象都成立。改成断言它的方法返回了预期结果。',
  },
];

interface Hit {
  rule: string;
  file: string;
  line: number;
  snippet: string;
  why: string;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.test.ts') && entry.includes('e2e')) out.push(full);
  }
}

/** 去掉行注释与块注释，避免注释里的写法误报 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));
}

const files: string[] = [];
walk(PACKAGES, files);

const hits: Hit[] = [];
for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const cleaned = stripComments(raw);
  const lines = cleaned.split('\n');
  for (const rule of RULES) {
    lines.forEach((line, i) => {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) {
        hits.push({
          rule: rule.id,
          file: relative(ROOT, file),
          line: i + 1,
          snippet: raw.split('\n')[i]?.trim() ?? '',
          why: rule.why,
        });
      }
    });
  }
}

console.log('\n🔍 端到端断言强度门禁 check-e2e-assertions');
console.log(`\n   扫描 ${files.length} 个 *e2e*.test.ts，规则 ${RULES.length} 条\n`);

if (hits.length === 0) {
  console.log('✅ 未发现「形状断言」冒充「行为断言」');
  process.exit(0);
}

console.log(`❌ 发现 ${hits.length} 处弱断言：\n`);
for (const h of hits) {
  console.log(`  [${h.rule}] ${h.file}:${h.line}`);
  console.log(`      ${h.snippet}`);
  console.log(`      ↳ ${h.why}\n`);
}
console.log('判据：e2e 用例必须断言「用户能观察到的东西」——DOM 文本 / 属性 / 事件结果。');
process.exit(1);
