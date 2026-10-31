// src/prefix-identifiers.ts
// 标识符前缀化：把模板表达式里的裸标识符改写为 `_ctx.xxx`
//
// 为什么需要：编译产物是 `function render(_ctx, _cache) { ... }` / `function render(_ctx) {...}`，
// 模板里的 `{{ message }}` 若原样输出成 `toDisplayString(message)`，运行时取不到绑定
// （只有 `_ctx.message` 才对）。此前两条模板路径产出的代码都不可直接执行，
// Vapor SSR 只能用 `with (_ctx)` 打补丁。
//
// 为什么不能无脑加前缀：以下标识符属于**局部作用域**，加了前缀反而会错
//   - v-for 别名（`item` / `index`）与解构出的名字
//   - 插槽作用域参数（`v-slot="{ row }"` 里的 `row`）
//   - 表达式内部的箭头函数参数（`@click="() => count++"` 里的空参、`list.map(i => i.id)` 里的 `i`）
//   - 对象字面量的 key（`{ foo: bar }` 的 `foo`；但简写 `{ foo }` 是变量引用，需要加前缀）
//   - 成员访问的属性名（`a.b` 的 `b`）、字符串/注释/正则内部
//
// 调用方通过 `locals` 传入已知的局部名集合（来自 v-for / v-slot）。

/** JS 关键字与内置字面量：不参与前缀化 */
const NON_BINDING_WORDS = new Set([
  // 字面量
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  'this',
  'arguments',
  // 关键字 / 运算符
  'new',
  'typeof',
  'instanceof',
  'in',
  'of',
  'void',
  'delete',
  'return',
  'function',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'default',
  'break',
  'continue',
  'try',
  'catch',
  'finally',
  'throw',
  'class',
  'extends',
  'super',
  'import',
  'export',
  'await',
  'async',
  'yield',
  'let',
  'const',
  'var',
  'with',
]);

/**
 * **JS 全局对象 / 函数**：模板里可以直接用，不能加 `_ctx.` 前缀。
 *
 * ⚠️ 2026-10-30 修（P0）：此前这个白名单只有「字面量 + 关键字」，**没有任何全局对象**
 *   ⇒ 模板里写 `{{ Math.round(x) }}` / `{{ String(n) }}` / `{{ JSON.stringify(o) }}`
 *   一律被改写成 `_ctx.Math.round(...)` / `_ctx.String(...)` ⇒ 运行时
 *   `Cannot read properties of undefined (reading 'round')`（或 `_ctx.String is not a function`）。
 *
 *   实测（修前编译产物）：
 *     {{ Math.round(x) }}   → toDisplayString(_ctx.Math.round(_ctx.x))
 *     {{ new Date() }}      → new _ctx.Date()
 *     {{ parseInt(s, 10) }} → _ctx.parseInt(_ctx.s, 10)
 *
 *   这是模板里最常见的写法之一，而失败信息指向的是**运行时的 `_ctx`**，
 *   很难联想到「编译器把全局当成了组件的属性」。
 *
 *   清单与 Vue 的 `globalsAllowList` 对齐（宁可少列，也不要把用户的绑定误伤成全局：
 *   用户如果在 `setup()` 里返回了同名的 `Math`，这里的白名单会让它取到全局 —— 与 Vue 行为一致）。
 */
const GLOBAL_ALLOW_LIST = new Set([
  'Infinity',
  'undefined',
  'NaN',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'Math',
  'Number',
  'Date',
  'Array',
  'Object',
  'Boolean',
  'String',
  'RegExp',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'JSON',
  'Intl',
  'BigInt',
  'Promise',
  'Symbol',
  'Reflect',
  'Proxy',
  'console',
  'Error',
  // ⚠️ 2026-11-01 新增：`$event` 是**事件处理器的形参**（由 `@click="fn($event)"` 包装成
  //   `$event => (fn($event))` 时产生）。不在此表里就会被前缀成 `_ctx.$event` ——
  //   恒为 undefined，且整条表达式在**渲染期**就被求值（而不是事件触发时）。
  '$event',
]);

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[\w$]/;

/**
 * 从 `start`（指向引号/反引号本身）跳过一整个字符串字面量，返回其后的下标。
 * 只处理转义与同类引号闭合，不解析 `${}` 嵌套（调用方在模板串分支里另有处理）。
 */
function skipStringLiteral(src: string, start: number): number {
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

interface WalkState {
  /** 已发现的局部名（括号内箭头函数的参数会动态加入） */
  locals: Set<string>;
}

/**
 * 前缀化单个表达式字符串
 *
 * @param content 原始表达式（来自模板）
 * @param locals  已知局部名（v-for 别名 / 插槽参数等）
 * @returns 前缀化后的表达式
 */
export function prefixIdentifiers(content: string, locals?: ReadonlySet<string>): string {
  if (!content) return content;
  // 已是前缀化过的内容直接返回，避免重复加前缀
  if (content.includes('_ctx.')) return content;

  const state: WalkState = { locals: new Set(locals ?? []) };
  let out = '';
  let i = 0;
  // 处于 `const/let/var ... =` 的声明段：此段内的标识符都是被声明的局部名
  let inDeclaration = false;

  /** 取 i 之前最近的非空白字符 */
  const prevMeaningful = (index: number): string => {
    for (let k = index - 1; k >= 0; k--) {
      const ch = content[k];
      if (ch !== undefined && !/\s/.test(ch)) return ch;
    }
    return '';
  };

  /** 取 i 之后最近的非空白字符 */
  const nextMeaningful = (index: number): string => {
    for (let k = index; k < content.length; k++) {
      const ch = content[k];
      if (ch !== undefined && !/\s/.test(ch)) return ch;
    }
    return '';
  };

  while (i < content.length) {
    const ch = content[i] as string;

    // 字符串字面量（单引号 / 双引号）—— 原样跳过
    if (ch === '"' || ch === "'") {
      const quote = ch;
      out += ch;
      i++;
      while (i < content.length) {
        const c = content[i] as string;
        out += c;
        if (c === '\\') {
          i++;
          if (i < content.length) out += content[i];
          i++;
          continue;
        }
        i++;
        if (c === quote) break;
      }
      continue;
    }

    // ⚠️ 2026-10-31 修（P0）：模板串（反引号）里的 `${ ... }` 是**表达式**，必须前缀化。
    //   此前反引号被当作普通引号整段原样拷贝 ⇒ `` `hi ${name}` `` 里的 `name`
    //   不会被加上 `_ctx.`，运行期抛 `ReferenceError: name is not defined`。
    //   现在：字面量部分原样保留，`${}` 内部递归走 prefixIdentifiers。
    if (ch === '`') {
      out += ch;
      i++;
      while (i < content.length) {
        const c = content[i] as string;
        if (c === '\\') {
          out += c;
          i++;
          if (i < content.length) out += content[i];
          i++;
          continue;
        }
        if (c === '`') {
          out += c;
          i++;
          break;
        }
        if (c === '$' && content[i + 1] === '{') {
          const exprStart = i + 2;
          let depth = 1;
          let j = exprStart;
          while (j < content.length && depth > 0) {
            const d = content[j] as string;
            if (d === '\\') {
              j += 2;
              continue;
            }
            if (d === '"' || d === "'" || d === '`') {
              j = skipStringLiteral(content, j);
              continue;
            }
            if (d === '{') depth++;
            else if (d === '}') depth--;
            j++;
          }
          const closed = depth === 0;
          const inner = content.slice(exprStart, closed ? j - 1 : j);
          out += '${' + prefixIdentifiers(inner, locals) + (closed ? '}' : '');
          i = j;
          continue;
        }
        out += c;
        i++;
      }
      continue;
    }

    // 声明语句里的名字属于局部变量：`const { a, b } = x` 中的 a/b 不应加前缀
    if (inDeclaration && ch === '=') {
      // 箭头函数 `=>` 与比较运算 `==` 不算赋值结束
      if (content[i + 1] !== '>' && content[i + 1] !== '=') {
        inDeclaration = false;
      }
    }

    // 注释
    if (ch === '/' && content[i + 1] === '/') {
      const end = content.indexOf('\n', i);
      const stop = end === -1 ? content.length : end;
      out += content.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === '/' && content[i + 1] === '*') {
      const end = content.indexOf('*/', i + 2);
      const stop = end === -1 ? content.length : end + 2;
      out += content.slice(i, stop);
      i = stop;
      continue;
    }

    // 标识符
    if (IDENT_START.test(ch)) {
      let j = i + 1;
      while (j < content.length && IDENT_PART.test(content[j] as string)) j++;
      const word = content.slice(i, j);

      const prev = prevMeaningful(i);
      const next = nextMeaningful(j);

      const isMemberAccess = prev === '.';
      const isDeclarationKeyword = word === 'const' || word === 'let' || word === 'var';
      if (isDeclarationKeyword) inDeclaration = true;
      const isDeclarationTarget = inDeclaration && !isDeclarationKeyword;
      const isObjectKey =
        !isDeclarationTarget && next === ':' && (prev === '{' || prev === ',' || prev === '');

      const isLocal = state.locals.has(word);
      const isKeyword = NON_BINDING_WORDS.has(word);
      // JS 全局对象 / 函数（`Math` / `String` / `JSON` …）：模板里直接用，不加前缀
      const isGlobal = GLOBAL_ALLOW_LIST.has(word);

      // 箭头函数参数：`x => ...`（等号前可能有空白）
      let nextNonSpace = j;
      while (nextNonSpace < content.length && /\s/.test(content[nextNonSpace] as string))
        nextNonSpace++;
      const isArrowSingleParam = content[nextNonSpace] === '=' && content[nextNonSpace + 1] === '>';

      // 对象字面量的**简写属性**：`{ color }`。
      //
      // ⚠️ 2026-10-27 修（P0）：此前只判断了「是不是 key」，简写被当成普通变量引用
      //   ⇒ 产物是 `{ _ctx.color }` —— 这是**非法 JS**（简写位置不能是成员表达式），
      //   `new Function` 直接抛 SyntaxError ⇒ 整个渲染函数不可用。
      //   实测 `<span :style="{ color }">A</span>` 渲染出空（span 根本不存在），
      //   而 `:style="{ color: c }"` 正常 —— 「一半能用」最容易被误判成偶发。
      //   正确产物是 `{ color: _ctx.color }`。
      const isObjectShorthand =
        !isMemberAccess &&
        !isObjectKey &&
        !isLocal &&
        !isKeyword &&
        !isArrowSingleParam &&
        !isDeclarationTarget &&
        (prev === '{' || prev === ',') &&
        (next === ',' || next === '}');
      // 函数声明 / 函数表达式的名字
      const isFunctionName = prev === 'c' && /\bfunction$/.test(content.slice(0, i).trimEnd());

      if (isArrowSingleParam || isFunctionName) {
        state.locals.add(word);
      }
      if (isDeclarationTarget) {
        // 声明出来的名字后续会作为局部变量使用
        state.locals.add(word);
      }

      const shouldPrefix =
        !isMemberAccess &&
        !isObjectKey &&
        !isLocal &&
        !isKeyword &&
        !isGlobal &&
        !isArrowSingleParam &&
        !isDeclarationTarget &&
        !isDeclarationKeyword;

      if (shouldPrefix && isObjectShorthand) {
        // 展开成显式键值对：`{ color }` → `{ color: _ctx.color }`
        out += `${word}: _ctx.${word}`;
      } else {
        out += shouldPrefix ? `_ctx.${word}` : word;
      }
      i = j;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

/**
 * 收集表达式内部箭头函数的参数名（`(a, b) => ...` 形式）
 *
 * 单参数形式（`x => ...`）在前缀化过程中就地处理；多参数形式在这里补充，
 * 避免 `list.map((item, i) => item.id)` 里的 `item`/`i` 被误加前缀。
 */
export function collectArrowParams(content: string): string[] {
  const names: string[] = [];
  const re = /\(([^()]*)\)\s*=>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const params = (match[1] ?? '').trim();
    if (!params) continue;
    for (const part of params.split(',')) {
      const name = part.trim().split(/[=:]/)[0]?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.push(name);
    }
  }
  return names;
}
