/**
 * 源码卫生门禁：`eval` / `new Function` / `console.log` 残留
 *
 * ## 为什么需要它
 *
 * 2026-10-10 的 P2-3 探针证实：`optimizations/index.ts` 里一句
 * `eval(\`${a}${op}${b}\`)` 配合正则，会把 `x1 + 2` **静默改写成** `x3`、
 * 把字符串 `"1+2"` 改写成 `"3"` —— 而**所有测试当时都是绿的**。
 * 同批的 P2-1 也发现 `codegen` 热路径上残留两处**完全重复**的无条件 `console.log`。
 *
 * 这类缺陷的共同点是：**没有门禁盯着，就能一直躺在那儿**。故建立本门禁。
 *
 * ## 三条规则（全部「清单制」：新命中即红）
 *
 * | 规则 | 判据 | 为何是硬约束 |
 * |---|---|---|
 * | A `eval(` | 不在注释里的 `eval(` 必须出现在清单中 | `eval` 是任意代码执行；本仓唯一的合法用途是 **CSP 探测**（`eval('true')`） |
 * | B `new Function(` | 同上 | 本仓用它做**运行时模板编译**（已在报告 §5.5 记为已知权衡）；清单化可防止它蔓延到不该用的包 |
 * | C `console.log(` | 文件级清单 | 运行库里的无条件日志 = 上线后仍会打印的调试代码；CLI / HMR / DevTools / 报告打印等**合法输出**在清单中 |
 *
 * ## ⚠️ 本门禁的边界（诚实声明）
 *
 * - 这是**文本级**判据：它抓「出现了这个词」，抓不到「用了但用错」。
 * - 注释内的命中会被剔除（块注释 + 行注释）；**模板字符串内的**命中（CLI 脚手架
 *   生成的代码）不做语法解析，改为**按文件进清单**。
 * - 清单是**文件级**的 ⇒ 在已入清单的文件里新增一处 `console.log` 不会被拦。
 *   若要更严，应升级为「行指纹」清单；当前取「能拦住新增文件 / 新增包」这一档。
 *
 * ## 用法
 *   tsx scripts/check-src-hygiene.ts
 *
 * 退出码：有未清单化命中 ⇒ 1；否则 0。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGES = join(ROOT, 'packages');

/** 规则 A：`eval(` 的合法位置（附理由） */
const EVAL_ALLOWLIST: Record<string, string> = {
  'packages/renderer/src/signal/signal-renderer.ts':
    "CSP 严格模式探测：`eval('true')` 放在 try/catch 里，被 CSP 阻止即判定为严格模式",
};

/** 规则 B：`new Function(` 的合法位置（附理由） */
const NEW_FUNCTION_ALLOWLIST: Record<string, string> = {
  'packages/renderer/src/signal/signal-renderer.ts':
    'Signal 渲染器的**运行时模板编译**（AOT 不可用时的回退路径），见报告 §5.5',
  'packages/renderer/src/vapor/vapor-ssr.ts': 'Vapor SSR 的运行时模板编译（同上）',
  'packages/core/src/template-compiler.ts': '`@lytjs/core` 的运行时模板编译入口（同上）',
};

/** 规则 C：`console.log(` 的合法文件（附理由） */
const CONSOLE_ALLOWLIST: Record<string, string> = {
  'packages/tools/packages/cli':
    'CLI 面向用户的输出 + 脚手架**生成**的模板内容（写进用户项目，不是本仓运行日志）',
  'packages/ecosystem/packages/ssr-kit/packages/hmr':
    'HMR 客户端日志（浏览器端，用户可见的连接状态）',
  'packages/ecosystem/packages/devtools': 'DevTools 面板的日志输出',
  'packages/ecosystem/packages/platform-adapter': '`config.debug` 显式开关门控的调试输出',
  'packages/renderer/src/vapor/vapor-app.ts': '`__DEV__` 门控的 emit 事件日志',
  'packages/core/src/plugin-sdk.ts': '`PluginTester`（测试辅助工具）的安装/卸载日志',
};

interface Hit {
  rule: string;
  file: string;
  line: number;
  snippet: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/**
 * 逐行扫描，剔除注释行。
 * 处理 `/* … *\/` 块注释（跨行）与 `//` 行注释；不做字符串/模板字面量解析（见文件头声明）。
 */
function scanFile(file: string, rel: string): Hit[] {
  const hits: Hit[] = [];
  const lines = readFileSync(file, 'utf-8').split('\n');
  let inBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    let code = raw;
    if (inBlock) {
      const end = code.indexOf('*/');
      if (end === -1) continue;
      code = code.slice(end + 2);
      inBlock = false;
    }
    const open = code.indexOf('/*');
    if (open !== -1) {
      const close = code.indexOf('*/', open + 2);
      if (close === -1) {
        code = code.slice(0, open);
        inBlock = true;
      } else {
        code = code.slice(0, open) + code.slice(close + 2);
      }
    }
    const lc = code.indexOf('//');
    if (lc !== -1) code = code.slice(0, lc);
    if (!code.trim()) continue;

    const line = i + 1;
    const snip = raw.trim().slice(0, 72);

    if (/(^|[^.\w$])eval\s*\(/.test(code) && !(rel in EVAL_ALLOWLIST)) {
      hits.push({ rule: 'A eval(', file: rel, line, snippet: snip });
    }
    if (/new\s+Function\s*\(/.test(code) && !(rel in NEW_FUNCTION_ALLOWLIST)) {
      hits.push({ rule: 'B new Function(', file: rel, line, snippet: snip });
    }
    if (/console\s*\.\s*log\s*\(/.test(code)) {
      const allowed = Object.keys(CONSOLE_ALLOWLIST).some((prefix) => rel.startsWith(prefix));
      if (!allowed) hits.push({ rule: 'C console.log(', file: rel, line, snippet: snip });
    }
  }
  return hits;
}

const files = walk(PACKAGES);
const hits: Hit[] = [];
for (const f of files) {
  // 只审 src（测试里打日志是正常的）
  const rel = relative(ROOT, f).split('\\').join('/');
  if (!/\/src\//.test(rel)) continue;
  hits.push(...scanFile(f, rel));
}

console.log(`扫描 ${files.length} 个 .ts 文件（仅 src/）：`);
console.log(`  规则 A eval( 清单 ${Object.keys(EVAL_ALLOWLIST).length} 项`);
console.log(`  规则 B new Function( 清单 ${Object.keys(NEW_FUNCTION_ALLOWLIST).length} 项`);
console.log(`  规则 C console.log( 清单 ${Object.keys(CONSOLE_ALLOWLIST).length} 项`);

if (hits.length === 0) {
  console.log('\n✅ 无未清单化的 eval / new Function / console.log');
  process.exit(0);
}

console.log(`\n❌ 发现 ${hits.length} 处未清单化命中：\n`);
for (const h of hits) {
  console.log(`  [${h.rule}] ${h.file}:${h.line}\n      ${h.snippet}`);
}
console.log('\n修法二选一：');
console.log('  1) 删除该语句（调试残留 / 不必要）；');
console.log('  2) 若确属合法用途，在 scripts/check-src-hygiene.ts 的对应清单里');
console.log('     加入该路径并**写明理由**（清单是"为什么它可以"的记录，不是免死金牌）。');
process.exit(1);
