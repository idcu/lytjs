// Lyt.js 代码高亮插件
//
// 用法：
//   import { highlight, highlightBlock } from '@lytjs/plugin-highlight'
//
//   // 高亮代码字符串
//   const html = highlight('const x = 42;', 'javascript')
//
//   // 高亮代码块（带行号）
//   const block = highlightBlock('function add(a, b) {\n  return a + b;\n}', 'typescript')
//
//   // 在页面中使用
//   document.getElementById('code').innerHTML = highlight(code, 'javascript')

// ======================== 类型定义 ========================

/** 支持的语言 */
type HighlightLanguage = 'javascript' | 'typescript' | 'html' | 'css' | 'json';

/** 高亮选项 */
interface HighlightOptions {
  /** 是否显示行号，默认 false */
  lineNumbers?: boolean;
  /** 起始行号，默认 1 */
  startLine?: number;
  /** 自定义 CSS 类名前缀，默认 'lyt-hl' */
  classPrefix?: string;
  /** 高亮主题 */
  theme?: 'light' | 'dark';
}

/** 高亮结果 */
interface HighlightResult {
  /** 高亮后的 HTML 字符串 */
  html: string;
  /** 语言 */
  language: string;
  /** 行数 */
  lines: number;
}

// ======================== Token 类型 ========================

type TokenType =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'function'
  | 'operator'
  | 'punctuation'
  | 'type'
  | 'tag'
  | 'attribute'
  | 'property'
  | 'value'
  | 'boolean'
  | 'null'
  | 'regexp';

interface Token {
  type: TokenType;
  value: string;
}

// ======================== 主题样式 ========================

/** 内置 CSS 样式 */
export const HIGHLIGHT_STYLES: Record<string, string> = {
  light: `
.lyt-hl-container {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 14px;
  line-height: 1.6;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow-x: auto;
  padding: 16px;
}
.lyt-hl-container code {
  font-family: inherit;
  font-size: inherit;
}
.lyt-hl-line-numbers {
  display: inline-block;
  width: 40px;
  text-align: right;
  padding-right: 16px;
  color: #adb5bd;
  user-select: none;
  border-right: 1px solid #e5e7eb;
  margin-right: 16px;
}
.lyt-hl-keyword { color: #d73a49; font-weight: 600; }
.lyt-hl-string { color: #032f62; }
.lyt-hl-number { color: #005cc5; }
.lyt-hl-comment { color: #6a737d; font-style: italic; }
.lyt-hl-function { color: #6f42c1; }
.lyt-hl-operator { color: #d73a49; }
.lyt-hl-punctuation { color: #24292e; }
.lyt-hl-type { color: #005cc5; }
.lyt-hl-tag { color: #22863a; }
.lyt-hl-attribute { color: #6f42c1; }
.lyt-hl-property { color: #005cc5; }
.lyt-hl-value { color: #032f62; }
.lyt-hl-boolean { color: #005cc5; }
.lyt-hl-null { color: #005cc5; }
.lyt-hl-regexp { color: #032f62; }
`,
  dark: `
.lyt-hl-container {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 14px;
  line-height: 1.6;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  overflow-x: auto;
  padding: 16px;
  color: #d4d4d4;
}
.lyt-hl-container code {
  font-family: inherit;
  font-size: inherit;
}
.lyt-hl-line-numbers {
  display: inline-block;
  width: 40px;
  text-align: right;
  padding-right: 16px;
  color: #6a737d;
  user-select: none;
  border-right: 1px solid #333;
  margin-right: 16px;
}
.lyt-hl-keyword { color: #569cd6; font-weight: 600; }
.lyt-hl-string { color: #ce9178; }
.lyt-hl-number { color: #b5cea8; }
.lyt-hl-comment { color: #6a9955; font-style: italic; }
.lyt-hl-function { color: #dcdcaa; }
.lyt-hl-operator { color: #d4d4d4; }
.lyt-hl-punctuation { color: #d4d4d4; }
.lyt-hl-type { color: #4ec9b0; }
.lyt-hl-tag { color: #569cd6; }
.lyt-hl-attribute { color: #9cdcfe; }
.lyt-hl-property { color: #9cdcfe; }
.lyt-hl-value { color: #ce9178; }
.lyt-hl-boolean { color: #569cd6; }
.lyt-hl-null { color: #569cd6; }
.lyt-hl-regexp { color: #d16969; }
`,
};

// ======================== HTML 转义 ========================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ======================== JavaScript/TypeScript 词法分析 ========================

const JS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'null', 'return', 'static', 'super', 'switch', 'this',
  'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void',
  'while', 'with', 'yield', 'async', 'await', 'of', 'from', 'as',
]);

const TS_KEYWORDS = new Set([
  'interface', 'type', 'enum', 'implements', 'declare', 'abstract',
  'readonly', 'private', 'protected', 'public', 'namespace', 'module',
  'keyof', 'infer', 'extends', 'is', 'never', 'unknown', 'any',
  'string', 'number', 'boolean', 'symbol', 'object', 'bigint',
]);

const JS_OPERATORS = /[+\-*/%=!<>&|^~?:]+/;
const JS_PUNCTUATION = /[{}()\[\];,.]/;

function tokenizeJS(code: string, isTypeScript: boolean): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    // 跳过空白
    if (/\s/.test(code[i])) {
      i++;
      continue;
    }

    // 单行注释
    if (code[i] === '/' && code[i + 1] === '/') {
      let end = code.indexOf('\n', i);
      if (end === -1) end = len;
      tokens.push({ type: 'comment', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // 多行注释
    if (code[i] === '/' && code[i + 1] === '*') {
      let end = code.indexOf('*/', i + 2);
      if (end === -1) end = len;
      else end += 2;
      tokens.push({ type: 'comment', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // 正则表达式（简化判断）
    if (code[i] === '/' && i > 0) {
      const prev = code.slice(0, i).trim();
      const lastChar = prev[prev.length - 1];
      if (lastChar && /[=(:,;\[!&|?{}\n]/.test(lastChar)) {
        let end = i + 1;
        while (end < len && code[end] !== '/') {
          if (code[end] === '\\') end++;
          end++;
        }
        if (end < len) end++;
        // 标志
        while (end < len && /[gimsuy]/.test(code[end])) end++;
        tokens.push({ type: 'regexp', value: code.slice(i, end) });
        i = end;
        continue;
      }
    }

    // 字符串
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const quote = code[i];
      let end = i + 1;
      while (end < len) {
        if (code[end] === '\\') { end += 2; continue; }
        if (code[end] === quote) { end++; break; }
        end++;
      }
      tokens.push({ type: 'string', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // 数字
    if (/\d/.test(code[i]) || (code[i] === '.' && i + 1 < len && /\d/.test(code[i + 1]))) {
      let end = i;
      if (code[end] === '0' && (code[end + 1] === 'x' || code[end + 1] === 'X')) {
        end += 2;
        while (end < len && /[0-9a-fA-F]/.test(code[end])) end++;
      } else {
        while (end < len && /[\d.]/.test(code[end])) end++;
        if (end < len && (code[end] === 'e' || code[end] === 'E')) {
          end++;
          if (end < len && (code[end] === '+' || code[end] === '-')) end++;
          while (end < len && /\d/.test(code[end])) end++;
        }
      }
      // 后缀
      if (end < len && code[end] === 'n') end++;
      tokens.push({ type: 'number', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // 标识符 / 关键字
    if (/[a-zA-Z_$]/.test(code[i])) {
      let end = i;
      while (end < len && /[a-zA-Z0-9_$]/.test(code[end])) end++;
      const word = code.slice(i, end);

      if (word === 'true' || word === 'false') {
        tokens.push({ type: 'boolean', value: word });
      } else if (word === 'null' || word === 'undefined') {
        tokens.push({ type: 'null', value: word });
      } else if (JS_KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (isTypeScript && TS_KEYWORDS.has(word)) {
        tokens.push({ type: 'type', value: word });
      } else if (code[end] === '(') {
        tokens.push({ type: 'function', value: word });
      } else {
        tokens.push({ type: 'property', value: word });
      }
      i = end;
      continue;
    }

    // 操作符
    if (JS_OPERATORS.test(code[i])) {
      let end = i;
      while (end < len && JS_OPERATORS.test(code[end])) end++;
      tokens.push({ type: 'operator', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // 标点
    if (JS_PUNCTUATION.test(code[i])) {
      tokens.push({ type: 'punctuation', value: code[i] });
      i++;
      continue;
    }

    // 其他字符
    tokens.push({ type: 'punctuation', value: code[i] });
    i++;
  }

  return tokens;
}

// ======================== HTML 词法分析 ========================

function tokenizeHTML(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    // HTML 注释
    if (code.slice(i, i + 4) === '<!--') {
      let end = code.indexOf('-->', i + 4);
      if (end === -1) end = len;
      else end += 3;
      tokens.push({ type: 'comment', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // 标签
    if (code[i] === '<') {
      let end = code.indexOf('>', i);
      if (end === -1) end = len;
      else end++;

      const tagContent = code.slice(i, end);
      const tagMatch = tagContent.match(/^<\/?(\w[\w-]*)/);

      if (tagMatch) {
        tokens.push({ type: 'punctuation', value: tagContent.slice(0, tagMatch[0].length) });
        tokens.push({ type: 'tag', value: tagMatch[1] });

        // 属性
        const attrStr = tagContent.slice(tagMatch[0].length, -1);
        const attrRegex = /(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
        let match: RegExpExecArray | null;
        while ((match = attrRegex.exec(attrStr)) !== null) {
          tokens.push({ type: 'attribute', value: match[1] });
          if (match[2] !== undefined || match[3] !== undefined || match[4] !== undefined) {
            tokens.push({ type: 'operator', value: '=' });
            tokens.push({
              type: 'string',
              value: match[2] !== undefined ? `"${match[2]}"` : match[3] !== undefined ? `'${match[3]}'` : match[4]!,
            });
          }
        }

        // 闭合括号
        if (tagContent.endsWith('/>')) {
          tokens.push({ type: 'punctuation', value: '/>' });
        } else if (tagContent.endsWith('>')) {
          tokens.push({ type: 'punctuation', value: '>' });
        }
      } else {
        tokens.push({ type: 'punctuation', value: tagContent });
      }

      i = end;
      continue;
    }

    // 文本内容
    let end = code.indexOf('<', i);
    if (end === -1) end = len;
    if (end > i) {
      tokens.push({ type: 'value', value: code.slice(i, end) });
    }
    i = end;
  }

  return tokens;
}

// ======================== CSS 词法分析 ========================

function tokenizeCSS(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    // 注释
    if (code[i] === '/' && code[i + 1] === '*') {
      let end = code.indexOf('*/', i + 2);
      if (end === -1) end = len;
      else end += 2;
      tokens.push({ type: 'comment', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // 字符串
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let end = i + 1;
      while (end < len && code[end] !== quote) {
        if (code[end] === '\\') end++;
        end++;
      }
      if (end < len) end++;
      tokens.push({ type: 'string', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // 数字（含单位）
    if (/\d/.test(code[i]) || (code[i] === '.' && i + 1 < len && /\d/.test(code[i + 1]))) {
      let end = i;
      while (end < len && /[\d.]/.test(code[end])) end++;
      while (end < len && /[a-zA-Z%]/.test(code[end])) end++;
      tokens.push({ type: 'number', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // 颜色值 (#hex)
    if (code[i] === '#') {
      let end = i + 1;
      while (end < len && /[0-9a-fA-F]/.test(code[end])) end++;
      if (end - i > 1) {
        tokens.push({ type: 'value', value: code.slice(i, end) });
        i = end;
        continue;
      }
    }

    // 标识符 / 关键字 / 属性
    if (/[a-zA-Z_-]/.test(code[i])) {
      let end = i;
      while (end < len && /[a-zA-Z0-9_-]/.test(code[end])) end++;
      const word = code.slice(i, end);

      const CSS_KEYWORDS = new Set([
        'import', 'media', 'keyframes', 'charset', 'font-face',
        'supports', 'layer', 'container', 'from', 'to',
      ]);

      if (CSS_KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (code[end] === '(') {
        tokens.push({ type: 'function', value: word });
      } else if (code[end] === ':') {
        tokens.push({ type: 'property', value: word });
      } else {
        tokens.push({ type: 'tag', value: word });
      }
      i = end;
      continue;
    }

    // 操作符和标点
    if (/[{}();:,.>+~*]/.test(code[i])) {
      if (code[i] === ':' || code[i] === ';') {
        tokens.push({ type: 'punctuation', value: code[i] });
      } else {
        tokens.push({ type: 'operator', value: code[i] });
      }
      i++;
      continue;
    }

    // 其他
    i++;
  }

  return tokens;
}

// ======================== JSON 词法分析 ========================

function tokenizeJSON(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    // 跳过空白
    if (/\s/.test(code[i])) { i++; continue; }

    // 字符串
    if (code[i] === '"') {
      let end = i + 1;
      while (end < len && code[end] !== '"') {
        if (code[end] === '\\') end++;
        end++;
      }
      if (end < len) end++;

      // 判断是否为 key（后面跟着冒号）
      let next = end;
      while (next < len && /\s/.test(code[next])) next++;
      if (code[next] === ':') {
        tokens.push({ type: 'property', value: code.slice(i, end) });
      } else {
        tokens.push({ type: 'string', value: code.slice(i, end) });
      }
      i = end;
      continue;
    }

    // 数字
    if (/[\d-]/.test(code[i]) && (i === 0 || /[,:\[\s{]/.test(code[i - 1]))) {
      let end = i;
      if (code[end] === '-') end++;
      while (end < len && /[\d.]/.test(code[end])) end++;
      if (end < len && (code[end] === 'e' || code[end] === 'E')) {
        end++;
        if (end < len && (code[end] === '+' || code[end] === '-')) end++;
        while (end < len && /\d/.test(code[end])) end++;
      }
      tokens.push({ type: 'number', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // 布尔值和 null
    if (code.slice(i, i + 4) === 'true') {
      tokens.push({ type: 'boolean', value: 'true' });
      i += 4;
      continue;
    }
    if (code.slice(i, i + 5) === 'false') {
      tokens.push({ type: 'boolean', value: 'false' });
      i += 5;
      continue;
    }
    if (code.slice(i, i + 4) === 'null') {
      tokens.push({ type: 'null', value: 'null' });
      i += 4;
      continue;
    }

    // 标点
    if (/[{}[\]:,]/.test(code[i])) {
      tokens.push({ type: 'punctuation', value: code[i] });
      i++;
      continue;
    }

    i++;
  }

  return tokens;
}

// ======================== Token 转 HTML ========================

function tokensToHtml(tokens: Token[], prefix: string): string {
  return tokens
    .map((token) => {
      const escaped = escapeHtml(token.value);
      return `<span class="${prefix}-${token.type}">${escaped}</span>`;
    })
    .join('');
}

// ======================== 核心高亮函数 ========================

/**
 * 高亮代码字符串
 *
 * @param code - 源代码字符串
 * @param language - 编程语言
 * @param options - 高亮选项（可选）
 * @returns 高亮后的 HTML 字符串
 */
function highlight(
  code: string,
  language: HighlightLanguage,
  options?: HighlightOptions
): string {
  const prefix = options?.classPrefix || 'lyt-hl';
  let tokens: Token[];

  switch (language) {
    case 'javascript':
      tokens = tokenizeJS(code, false);
      break;
    case 'typescript':
      tokens = tokenizeJS(code, true);
      break;
    case 'html':
      tokens = tokenizeHTML(code);
      break;
    case 'css':
      tokens = tokenizeCSS(code);
      break;
    case 'json':
      tokens = tokenizeJSON(code);
      break;
    default:
      // 未知语言，返回转义后的纯文本
      return escapeHtml(code);
  }

  return tokensToHtml(tokens, prefix);
}

/**
 * 高亮代码块（带容器和可选行号）
 *
 * @param code - 源代码字符串
 * @param language - 编程语言
 * @param options - 高亮选项（可选）
 * @returns 高亮结果对象
 */
function highlightBlock(
  code: string,
  language: HighlightLanguage,
  options?: HighlightOptions
): HighlightResult {
  const prefix = options?.classPrefix || 'lyt-hl';
  const startLine = options?.startLine || 1;
  const showLineNumbers = options?.lineNumbers || false;
  const theme = options?.theme || 'light';

  const highlighted = highlight(code, language, options);
  const lines = code.split('\n');
  const lineCount = lines.length;

  let html = '';

  if (showLineNumbers) {
    const lineNumbersHtml = lines
      .map((_, idx) => `<span class="${prefix}-line-numbers">${startLine + idx}</span>`)
      .join('\n');

    html = `<div class="${prefix}-container" data-theme="${theme}">`;
    html += `<table style="border-collapse:collapse;width:100%"><tbody>`;
    html += lines
      .map((line, idx) => {
        const lineHighlighted = highlight(line, language, options);
        return `<tr><td class="${prefix}-line-numbers">${startLine + idx}</td><td><code>${lineHighlighted || ' '}</code></td></tr>`;
      })
      .join('\n');
    html += `</tbody></table></div>`;
  } else {
    html = `<div class="${prefix}-container" data-theme="${theme}"><code>${highlighted}</code></div>`;
  }

  return { html, language, lines: lineCount };
}

/**
 * 注入高亮样式到文档
 *
 * @param theme - 主题名称，默认 'light'
 */
function injectStyles(theme: string = 'light'): void {
  if (typeof document === 'undefined') return;

  const id = 'lyt-highlight-styles';
  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = HIGHLIGHT_STYLES[theme] || HIGHLIGHT_STYLES.light;
  document.head.appendChild(style);
}

export { highlight, highlightBlock, injectStyles };
export type {
  HighlightLanguage,
  HighlightOptions,
  HighlightResult,
  Token,
  TokenType,
};
