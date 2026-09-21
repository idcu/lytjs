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

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[\w$]/;

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

    // 字符串字面量（单引号 / 双引号 / 模板串）—— 原样跳过
    if (ch === '"' || ch === "'" || ch === '`') {
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

      // 箭头函数参数：`x => ...`（等号前可能有空白）
      let nextNonSpace = j;
      while (nextNonSpace < content.length && /\s/.test(content[nextNonSpace] as string))
        nextNonSpace++;
      const isArrowSingleParam = content[nextNonSpace] === '=' && content[nextNonSpace + 1] === '>';
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
        !isArrowSingleParam &&
        !isDeclarationTarget &&
        !isDeclarationKeyword;

      out += shouldPrefix ? `_ctx.${word}` : word;
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
