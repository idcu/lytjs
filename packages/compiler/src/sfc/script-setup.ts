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
  /** C-32：顶层 `let`/`var` 绑定（会被 return，但不是响应式的） */
  mutableBindings: string[];
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

/** `const props = defineProps` / `const emit = defineEmits` 的调用头（泛型与实参单独扫描） */
const RE_DEFINE_PROPS_HEAD =
  /(?:^|\n)[ \t]*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*defineProps\s*/;

const RE_DEFINE_EMITS_HEAD =
  /(?:^|\n)[ \t]*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*defineEmits\s*/;

/** 跳过一整个 JS 字符串 / 模板串（含转义），返回闭合引号之后的下标 */
function skipJsString(src: string, start: number): number {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === quote) return i + 1;
    i++;
  }
  return i;
}

/**
 * C-30：从 `(` 开始做括号配平扫描，返回匹配的 `)` 下标。
 *
 * 旧实现用 `\(([\s\S]*?)\)` 非贪婪匹配，参数里出现第一个右括号就收尾
 * （`default: () => 'x'`、校验器 `(payload) => …`）⇒ 产物被截断成非法 JS。
 * 扫描时跳过字符串与注释，避免引号/注释里的括号干扰计数。
 */
function findMatchingParen(src: string, openIndex: number): number | undefined {
  let depth = 0;
  let i = openIndex;
  while (i < src.length) {
    const ch = src[i] as string;
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipJsString(src, i);
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i + 2);
      i = nl === -1 ? src.length : nl;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return undefined;
}

interface DefineCall {
  /** 整条语句在 body 中的起止（含前导换行与可选分号） */
  start: number;
  end: number;
  varName: string;
  generic?: string;
  args: string;
}

/**
 * C-31：从 `<` 起按嵌套深度找泛型闭合 `>`。
 *
 * 旧实现用 `<[^>]*>`，在嵌套泛型（`Props<Item>`）的第一个 `>` 或函数类型
 * 的 `=>` 处提前收尾 ⇒ 整条 defineProps 识别失败，既不报错也不移除调用，
 * 运行期抛 `defineProps is not defined`。`=>` 里的 `>` 不计入深度。
 */
function findMatchingAngle(src: string, openIndex: number): number | undefined {
  let depth = 0;
  let i = openIndex;
  while (i < src.length) {
    const ch = src[i] as string;
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipJsString(src, i);
      continue;
    }
    if (ch === '<') {
      depth++;
    } else if (ch === '>' && src[i - 1] !== '=') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return undefined;
}

/** 定位一条 `const x = defineProps/Emits(...)` 并取出泛型与完整实参 */
function findDefineCall(body: string, head: RegExp): DefineCall | undefined {
  const match = head.exec(body);
  if (!match) return undefined;

  const skipSpaces = (from: number): number => {
    let i = from;
    while (i < body.length && /\s/.test(body[i] as string)) i++;
    return i;
  };

  let cursor = skipSpaces(match.index + match[0].length);
  let generic: string | undefined;
  if (body[cursor] === '<') {
    const genericEnd = findMatchingAngle(body, cursor);
    if (genericEnd === undefined) return undefined;
    generic = body.slice(cursor, genericEnd + 1);
    cursor = skipSpaces(genericEnd + 1);
  }
  if (body[cursor] !== '(') return undefined;

  const openIndex = cursor;
  const closeIndex = findMatchingParen(body, openIndex);
  if (closeIndex === undefined) return undefined;

  let end = closeIndex + 1;
  while (body[end] === ' ' || body[end] === '\t') end++;
  if (body[end] === ';') end++;

  return {
    start: match.index,
    end,
    varName: match[1]!,
    generic,
    args: body.slice(openIndex + 1, closeIndex),
  };
}

/**
 * 顶层声明名（含解构）。
 *
 * P0-4：必须只匹配**列 0** 的声明。此前带 `[ \t]*`，函数/块体内的缩进声明
 * （`function f() { const b = 2 }`）同样命中 ⇒ `b` 被收进 setup 的 `return`，
 * 而 `b` 并不在 setup 作用域里 ⇒ 运行期 ReferenceError。
 */
const RE_DECL_ASSIGN = /(?:^|\n)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g;
/**
 * C-32：无初始化器的顶层声明（`let msg;` / `let msg`）。
 *
 * 旧实现只认 `NAME = …`，`let msg;` 完全不进 bindings ⇒ 模板里的 `_ctx.msg`
 * 恒为 undefined（静默空白），即便后面 `msg = 'hi'` 赋了值也不会渲染。
 */
const RE_DECL_BARE = /(?:^|\n)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?:;|$)/g;
/** C-32：顶层 `let` / `var` 名字 —— 用于编译期提示「可变绑定不是响应式的」。 */
const RE_DECL_MUTABLE = /(?:^|\n)(?:let|var)\s+([A-Za-z_$][\w$]*)/g;
const RE_DECL_DESTRUCT = /(?:^|\n)(?:const|let|var)\s*[{[][\s\S]*?[}\]]\s*=/g;
const RE_DECL_FN = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g;
const RE_DECL_CLASS = /(?:^|\n)class\s+([A-Za-z_$][\w$]*)/g;

/**
 * P0-5：取出一条 import 语句引入的**运行时**绑定名。
 *
 * import 只被提升到模块作用域；模板通过 setup 的返回值解析 `_ctx.X`，
 * 因此这些名字必须进入 bindings，否则 `<Foo/>` 会解析成 undefined（静默渲染成原生元素）。
 * `import type` 与内联 `type` 说明符在运行期不存在，必须排除，避免 return 里出现未定义变量。
 */
function importedBindings(statement: string): string[] {
  const s = statement.replace(/^import\s+/, '').trim();
  // `import type ...` 整体只在类型层生效
  if (/^type\s/.test(s)) return [];

  const fromIdx = s.lastIndexOf(' from ');
  const clause = fromIdx === -1 ? s : s.slice(0, fromIdx);
  const names: string[] = [];

  // 默认导入：子句开头的标识符
  const def = clause.match(/^([A-Za-z_$][\w$]*)\s*(?:,|$)/);
  if (def) names.push(def[1]!);

  // 命名空间导入：`* as ns`
  const ns = clause.match(/\*\s*as\s+([A-Za-z_$][\w$]*)/);
  if (ns) names.push(ns[1]!);

  // 命名导入：`{ a, b as c, type T }`
  const braced = clause.match(/\{([\s\S]*?)\}/);
  if (braced) {
    for (const part of braced[1]!.split(',')) {
      const seg = part.trim();
      if (!seg || /^type\s/.test(seg)) continue;
      const renamed = seg
        .split(/\s+as\s+/)
        .pop()!
        .trim();
      if (/^[A-Za-z_$][\w$]*$/.test(renamed)) names.push(renamed);
    }
  }

  return names;
}

/** 从解构模式里取出绑定名（`const { a, b: c, d = 1 } = x`） */ function destructuredNames(
  pattern: string,
): string[] {
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

  const propsCall = findDefineCall(body, RE_DEFINE_PROPS_HEAD);
  if (propsCall) {
    const { varName, generic, args } = propsCall;
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
      body = body.slice(0, propsCall.start) + body.slice(propsCall.end);
      propsDecl = args.trim();
    }
    if (!propsDecl) propsDecl = args.trim() || '{}';
  }

  const emitsCall = findDefineCall(body, RE_DEFINE_EMITS_HEAD);
  if (emitsCall) {
    const { varName, generic, args } = emitsCall;
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
      body = body.slice(0, emitsCall.start) + body.slice(emitsCall.end);
      emitsDecl = args.trim();
    }
    if (!emitsDecl) emitsDecl = args.trim() || '[]';
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
  // C-32：顶层 `let` / `var` 名字。它们会被 return（初值可渲染），
  // 但不是响应式的 —— setup 内的赋值不会触发重渲染，编译期需要显式提示。
  const mutableBindings = new Set<string>();
  // import 已提升到模块作用域，但模板只认 setup 的返回值，需要一并 return。
  for (const statement of imports) {
    for (const name of importedBindings(statement)) bindings.add(name);
  }
  for (const m of body.matchAll(RE_DECL_ASSIGN)) bindings.add(m[1]!);
  for (const m of body.matchAll(RE_DECL_BARE)) bindings.add(m[1]!);
  for (const m of body.matchAll(RE_DECL_MUTABLE)) mutableBindings.add(m[1]!);
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
    mutableBindings: [...mutableBindings],
    propsDecl,
    emitsDecl,
    usesExpose,
    errors,
  };
}
