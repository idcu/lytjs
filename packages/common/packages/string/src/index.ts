/**
 * @lytjs/common-string
 * 字符串处理工具函数集合
 */

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 转换为 kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * 转换为 camelCase
 */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

/**
 * 转换为 PascalCase
 */
export function pascalCase(str: string): string {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * camelCase 转 kebab-case
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * kebab-case 转 camelCase
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * 转义正则表达式特殊字符
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 转义 HTML 特殊字符的映射表（模块级常量，避免每次调用重复创建）
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

/**
 * 转义 HTML 特殊字符
 */
export function escapeHTML(str: string): string {
  return str.replace(/[&<>"'`]/g, (c) => HTML_ESCAPE_MAP[c] ?? c);
}

/**
 * 转义属性值上下文中的危险字符
 * 比 escapeHTML 更严格，额外覆盖 = 字符
 */
export function escapeAttrValue(str: string): string {
  return escapeHTML(str).replace(/=/g, '&#61;');
}

/**
 * 反转义 HTML 特殊字符的映射表（模块级常量，避免每次调用重复创建）
 */
const HTML_UNESCAPE_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&#96;': '`',
};

/**
 * 反转义 HTML 特殊字符
 */
export function unescapeHTML(str: string): string {
  return str.replace(
    /&(?:amp|lt|gt|quot|#39|apos|#96);/g,
    (entity) => HTML_UNESCAPE_MAP[entity] ?? entity,
  );
}

/**
 * 去除首尾空白字符
 */
export function trim(str: string): string {
  return str.trim();
}

/**
 * 去除首尾指定字符
 */
export function trimChars(str: string, chars: string): string {
  if (!chars) return str;
  // 将 ] 和 - 放在字符类开头，避免在字符类中间需要转义
  // 先从 chars 中提取 ] 和 -，再对其余字符进行标准转义
  const specialChars: string[] = [];
  const normalChars: string[] = [];
  for (const ch of chars) {
    if (ch === ']' || ch === '-') {
      specialChars.push(ch);
    } else {
      normalChars.push(ch);
    }
  }
  const charClass = specialChars.join('') + escapeRegExp(normalChars.join(''));
  const pattern = new RegExp(`^[${charClass}]+|[${charClass}]+$`, 'g');
  return str.replace(pattern, '');
}

/**
 * 重复字符串 n 次
 */
export function repeat(str: string, count: number): string {
  if (count <= 0) return '';
  return str.repeat(count);
}

/**
 * 在字符串开头填充
 */
export function padStart(str: string, length: number, fillStr: string = ' '): string {
  return str.padStart(length, fillStr);
}

/**
 * 在字符串末尾填充
 */
export function padEnd(str: string, length: number, fillStr: string = ' '): string {
  return str.padEnd(length, fillStr);
}

/**
 * 检查字符串是否以指定前缀开头
 */
export function startsWith(str: string, prefix: string, position: number = 0): boolean {
  return str.startsWith(prefix, position);
}

/**
 * 检查字符串是否以指定后缀结尾
 */
export function endsWith(str: string, suffix: string): boolean {
  return str.endsWith(suffix);
}

/**
 * 检查字符串是否包含子串
 */
export function includes(str: string, searchStr: string): boolean {
  return str.includes(searchStr);
}

/**
 * 分割字符串
 */
export function split(str: string, separator: string): string[] {
  return str.split(separator);
}

/**
 * 将字符串拆分为单词数组
 */
export function words(str: string): string[] {
  if (!str) return [];
  return (
    str.match(/[a-zA-Z0-9]+/g)?.flatMap((w) => {
      // Split camelCase boundaries: "helloWorld" -> ["hello", "World"]
      return w.match(/[a-z0-9]+|[A-Z][a-z0-9]*/g) ?? [];
    }) ?? []
  );
}

/**
 * 提取子串
 */
export function substring(str: string, start: number, end?: number): string {
  if (start < 0) {
    start = Math.max(0, str.length + start);
  }
  if (end === undefined) {
    return str.slice(start);
  }
  return str.slice(start, end);
}

/**
 * 截断字符串
 */
export function truncate(str: string, length: number, omission: string = '...'): string {
  if (str.length <= length) return str;
  const truncatedLength = length - omission.length;
  if (truncatedLength <= 0) return omission.slice(0, length);
  return str.slice(0, truncatedLength) + omission;
}

/**
 * 简单模板引擎，使用 {key} 作为占位符
 */
export function template(str: string, data: Record<string, string | number | boolean>): string {
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * 规范化 class 值
 */
export function normalizeClass(
  value: string | Record<string, unknown> | Array<unknown> | undefined | null | boolean | number,
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return (value as Array<string | Record<string, unknown> | null | undefined | boolean | number>)
      .map(normalizeClass)
      .filter(Boolean)
      .join(' ');
  }

  if (typeof value === 'object') {
    const result: string[] = [];
    for (const key in value) {
      if (value[key]) {
        result.push(key);
      }
    }
    return result.join(' ');
  }

  return '';
}

/**
 * 规范化 style 值（返回 CSS 字符串）
 */
export function normalizeStyle(
  value: string | Record<string, string | number> | Array<unknown> | undefined | null,
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return (value as Array<string | Record<string, string | number> | null | undefined>)
      .map(normalizeStyle)
      .filter(Boolean)
      .join('; ');
  }

  if (typeof value === 'object') {
    const result: string[] = [];
    for (const key in value) {
      const cssKey = camelToKebab(key);
      result.push(`${cssKey}: ${value[key]}`);
    }
    return result.join('; ');
  }

  return '';
}

/**
 * 规范化 style 值（返回对象形式，用于 vdom diff）
 * 将 string 解析为对象，array 合并为单一对象，object 直接返回。
 *
 * @param value - style 值（string | array | object）
 * @returns 规范化后的 style 对象，不会返回 undefined
 */
export function normalizeStyleObject(value: unknown): Record<string, string | number> {
  if (Array.isArray(value)) {
    const res: Record<string, string | number> = {};
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (item) {
        const normalized = normalizeStyleObject(item);
        Object.assign(res, normalized);
      }
    }
    return res;
  }
  if (typeof value === 'string') {
    return parseStringStyle(value);
  }
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, string | number>;
  }
  return {} as Record<string, string | number>;
}

/**
 * 将 CSS 字符串（如 "color:red; font-size:16px"）解析为对象
 */
function parseStringStyle(cssText: string): Record<string, string> {
  const res: Record<string, string> = {};
  const list = cssText.split(';');
  for (let i = 0; i < list.length; i++) {
    const item = list[i]?.trim();
    if (!item) continue;
    const colonIdx = item.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = item.slice(0, colonIdx).trim();
    const val = item.slice(colonIdx + 1).trim();
    if (!prop) continue;
    const camelProp = prop.replace(/-\w/g, (m) => m[1]?.toUpperCase() ?? '');
    res[camelProp] = val;
  }
  return res;
}

// ============================================================
// HTML void elements
// ============================================================

/**
 * HTML void elements that are allowed to use self-closing syntax (<br />, <img />, etc.).
 * Based on the HTML specification: https://html.spec.whatwg.org/multipage/syntax.html#void-elements
 */
export const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

// ============================================================
// Boolean attributes
// ============================================================

/**
 * HTML boolean attributes whose presence means true.
 */
export const BOOLEAN_ATTRS = new Set([
  'disabled',
  'readonly',
  'checked',
  'selected',
  'multiple',
  'autofocus',
  'async',
  'defer',
  'controls',
  'loop',
  'muted',
  'default',
  'open',
  'required',
  'reversed',
  'allowfullscreen',
]);

/**
 * Check if a key is a boolean HTML attribute
 */
export function isBooleanAttr(key: string): boolean {
  return BOOLEAN_ATTRS.has(key);
}

// ============================================================
// 安全工具函数（从 @lytjs/common-security re-export，保持向后兼容）
// ============================================================

export { sanitizeHTML, DANGEROUS_EVENT_ATTRS, isSafeAttribute } from '@lytjs/common-security';

export { escapeHTML as escapeHtml };

// ============================================================
// CSS 工具
// ============================================================

/**
 * 解析 CSS 时长字符串为毫秒数。
 * 支持逗号分隔的多个值（取最大值）。
 * @param value - CSS 时长字符串，如 '0.3s', '300ms', '0.3s, 0.1s'
 */
export function parseDuration(value: string | undefined | null): number {
  if (value == null || value === '' || value === '0s' || value === '0ms') return 0;
  const values = value.split(',').map(v => {
    v = v.trim();
    if (v.endsWith('ms')) return parseFloat(v);
    if (v.endsWith('s')) return parseFloat(v) * 1000;
    return parseFloat(v);
  });
  return Math.max(0, ...values);
}
