// src/sfc/script-setup.ts
// `<script setup>` 编译（2026-11-01 新增）
//
// ## 背景
//
// 此前 `generateModuleCode` 把 `<script setup>` 的正文**原样**拼进模块，
// 而模板产物引用的是 `_ctx.msg`。`msg` 是模块作用域里的局部常量，
// 既不在 props、也不在 setup 返回值里 ⇒ `_ctx.msg` 恒为 undefined：
// **页面渲染成空白，且不报错**（典型静默失败）。
//
// ## 本实现的边界（明确写死，不假装支持）
//
// 支持：
//   · `defineProps({...})` / `defineProps(['a'])`
//   · `defineEmits([...])` / `defineEmits({...})`
//   · 顶层 `const/let/var NAME = …`、`function NAME`、`class NAME`、`const { a, b } = …`
//   · 顶层 `import`（提升到模块作用域，不能留在 setup 里）
//   · 与 `<script>` 共存：`export default {...}` 的选项被展开合并
//
// 不支持（**编译期报错**，不产出半成品）：
//   · `defineProps<{...}>()` 这类 TS 泛型形式 —— 需要 TS 类型解析，正则做不可靠
//   · `<script>` 里已有 `setup()` 又与 `<script setup>` 并存
//   · 顶层 `export`（`<script setup>` 里没有模块语义）

export interface ScriptSetupResult {
  /** 提升到模块作用域的 import 语句 */
  imports: string[];
  /** setup() 的函数体 */
  setupBody: string;
  /** 需要在 setup 里 return 的绑定名 */
  bindings: string[];
  /** `props: <propsDecl>`，无则 undefined */
  propsDecl?: string;
  /** `emits: <emitsDecl>`，无则 undefined */
  emitsDecl?: string;
  /** 正文里用到 `defineExpose` ⇒ 生成的 setup 需要解构 `expose`（N12） */
  usesExpose: boolean;
  /** 编译期错误（有值即应中止，不产出代码） */
  errors: string[];
}

/** 匹配一条 import 语句（支持跨行的 `{ … }` 形式） */
const RE_IMPORT = /^[ \t]*import\s+[\s\S]*?from\s*['"][^'"]+['"];?[ \t]*$/gm;
/** 副作用 import：`import './x.css'` */
const RE_IMPORT_BARE = /^[ \t]*import\s*['"][^'"]+['"];?[ \t]*$/gm;

/** `const props = defineProps(...)` / `defineProps<...>(...)` */
const RE_DEFINE_PROPS =
  /(?:^|\n)[ \t]*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*defineProps\s*(<[^>]*>)?\s*\(([\s\S]*?)\)\s*;?/;

const RE_DEFINE_EMITS =
  /(?:^|\n)[ \t]*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*defineEmits\s*(<[^>]*>)?\s*\(([\s\S]*?)\)\s*;?/;

/**
 * 顶层声明名（含解构）。
 *
 * P0-4：必须只匹配**列 0** 的声明。此前带 `[ \t]*`，函数/块体内的缩进声明
 * （`function f() { const b = 2 }`）同样命中 ⇒ `b` 被收进 setup 的 `return`，
 * 而 `b` 并不在 setup 作用域里 ⇒ 运行期 ReferenceError。
 */
const RE_DECL_ASSIGN = /(?:^|\n)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g;
const RE_DECL_DESTRUCT = /(?:^|\n)(?:const|let|var)\s*[{[][\s\S]*?[}\]]\s*=/g;
const RE_DECL_FN = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
const RE_DECL_CLASS = /(?:^|\n)class\s+([A-Za-z_$][\w$]*)/g;

/** 从解构模式里取出绑定名（`const { a, b: c, d = 1 } = x`） */
function destructuredNames(pattern: string): string[] {
  // ⚠️ 匹配串以 `(?:^|\n)` 开头，可能带前导换行 —— 必须用 `^\s*` 剥掉，
  //   否则 `const ` 前缀残留 ⇒ 第一个绑定名被解析成 `const  x` 而丢弃（实测只返回了 y）。
  const inner = pattern.replace(/^\s*(?:const|let|var)\s*/, '');
  const body = inner.slice(1, inner.indexOf('=')).replace(/[{}[\]]/g, ' ');
  const names: string[] = [];
  for (const part of body.split(',')) {
    const seg = part.trim();
    if (!seg) continue;
    // `b: c` → c；`d = 1` → d；`...rest` → rest
    const renamed = seg.includes(':') ? seg.split(':').pop()! : seg;
    const name = renamed
      .split('=')[0]!
      .replace(/^\.\.\./, '')
      .trim();
    if (/^[A-Za-z_$][\w$]*$/.test(name)) names.push(name);
  }
  return names;
}

/**
 * 解析并改写 `<script setup>`。
 *
 * @param content `<script setup>` 块的正文
 */
export function compileScriptSetup(content: string): ScriptSetupResult {
  const errors: string[] = [];
  const imports: string[] = [];

  let body = content;

  // 1) 先摘出 import（必须留在模块作用域）
  body = body.replace(RE_IMPORT, (m) => {
    imports.push(m.trim());
    return '';
  });
  body = body.replace(RE_IMPORT_BARE, (m) => {
    imports.push(m.trim());
    return '';
  });

  // 2) defineProps / defineEmits
  let propsDecl: string | undefined;
  let emitsDecl: string | undefined;
  const propsBinding = 'props';
  const emitBinding = 'emit';

  const propsMatch = body.match(RE_DEFINE_PROPS);
  if (propsMatch) {
    const [, varName, generic, args] = propsMatch;
    if (generic) {
      errors.push(
        `defineProps<...>() 的**泛型**形式需要 TypeScript 类型解析，当前 SFC 编译器不支持。\n` +
          `  请改用运行时形式：defineProps({ ${varName ?? 'msg'}: String })`,
      );
    } else if (varName !== propsBinding) {
      // 改名会牵动正文里所有引用点，正则做不到可靠改写 ⇒ 明确报错而不是产半成品
      errors.push(
        `defineProps 的返回值必须命名为 \`props\`（当前是 \`${varName}\`）：` +
          `改名会牵动正文里的所有引用，当前实现不做改写。`,
      );
    } else {
      body = body.replace(propsMatch[0], '');
      propsDecl = (args ?? '').trim();
    }
    if (!propsDecl) propsDecl = (args ?? '').trim() || '{}';
  }

  const emitsMatch = body.match(RE_DEFINE_EMITS);
  if (emitsMatch) {
    const [, varName, generic, args] = emitsMatch;
    if (generic) {
      errors.push(
        `defineEmits<...>() 的**泛型**形式需要 TypeScript 类型解析，当前 SFC 编译器不支持。\n` +
          `  请改用运行时形式：defineEmits(['change'])`,
      );
    } else if (varName !== emitBinding) {
      errors.push(
        `defineEmits 的返回值必须命名为 \`emit\`（当前是 \`${varName}\`）：` +
          `改名会牵动正文里的所有引用，当前实现不做改写。`,
      );
    } else {
      body = body.replace(emitsMatch[0], '');
      emitsDecl = (args ?? '').trim();
    }
    if (!emitsDecl) emitsDecl = (args ?? '').trim() || '[]';
  }

  // 3) `defineExpose` 接管道（N12，2026-11-10）：
  //    运行时 `createSetupContext()` 已实现 `expose()`（component-setup.ts:491），
  //    旧注释所称「没有 expose 机制」是假阳性。这里只把调用名改写为 setup
  //    第二参里的 `__expose`，**不解析参数**（嵌套对象/箭头函数交给 JS 自己解析），
  //    避免正则截断字面量。compile.ts 会按 usesExpose 决定是否扩展 setup 签名，
  //    因此不使用 defineExpose 的产物形态一字不变。
  const usesExpose = /\bdefineExpose\s*\(/.test(body);
  if (usesExpose) {
    body = body.replace(/\bdefineExpose\s*\(/g, '__expose(');
  }

  // 4) 顶层 export 在 `<script setup>` 里没有语义
  if (/^\s*export\s+(?:default|const|function|class)/m.test(body)) {
    errors.push('<script setup> 里不能使用 export：模块级导出请放到普通 <script> 块。');
  }

  // 5) 收集绑定名
  const bindings = new Set<string>();
  for (const m of body.matchAll(RE_DECL_ASSIGN)) bindings.add(m[1]!);
  for (const m of body.matchAll(RE_DECL_FN)) bindings.add(m[1]!);
  for (const m of body.matchAll(RE_DECL_CLASS)) bindings.add(m[1]!);
  for (const m of body.matchAll(RE_DECL_DESTRUCT)) {
    for (const n of destructuredNames(m[0])) bindings.add(n);
  }

  // `props` / `emit` 若是用户自己命名的变量，也要 return 出去（模板里会用到）
  if (propsDecl) bindings.add(propsBinding);
  if (emitsDecl) bindings.add(emitBinding);

  // 去掉 defineProps/defineEmits 之后可能留下的空行
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  return {
    imports,
    setupBody: body,
    bindings: [...bindings],
    propsDecl,
    emitsDecl,
    usesExpose,
    errors,
  };
}
