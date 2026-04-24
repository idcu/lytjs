/**
 * Lyt.js Core Shared - String Utilities
 *
 * 字符串处理工具函数
 * 纯原生零依赖实现
 */

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 驼峰命名转短横线命名
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * 短横线命名转驼峰命名
 */
export function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * 短横线命名转大驼峰命名（PascalCase）
 */
export function pascalCase(str: string): string {
  return capitalize(camelCase(str));
}

/**
 * 转义正则特殊字符
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 去除字符串两端空白
 */
export function trim(str: string): string {
  return str.trim();
}

/**
 * 去除字符串两端空白及指定字符
 */
export function trimChars(str: string, chars: string): string {
  const escaped = escapeRegExp(chars);
  return str.replace(new RegExp(`^[${escaped}]+|[${escaped}]+$`, 'g'), '');
}

/**
 * 重复字符串
 */
export function repeat(str: string, count: number): string {
  return str.repeat(count);
}

/**
 * 填充字符串到指定长度
 */
export function padStart(str: string, targetLength: number, padString: string = ' '): string {
  return str.padStart(targetLength, padString);
}

/**
 * 填充字符串到指定长度（从末尾）
 */
export function padEnd(str: string, targetLength: number, padString: string = ' '): string {
  return str.padEnd(targetLength, padString);
}

/**
 * 判断字符串是否以指定前缀开头
 */
export function startsWith(str: string, prefix: string): boolean {
  return str.startsWith(prefix);
}

/**
 * 判断字符串是否以指定后缀结尾
 */
export function endsWith(str: string, suffix: string): boolean {
  return str.endsWith(suffix);
}

/**
 * 判断字符串是否包含指定子串
 */
export function includes(str: string, searchString: string): boolean {
  return str.includes(searchString);
}

/**
 * 将字符串分割为数组
 */
export function split(str: string, separator: string | RegExp, limit?: number): string[] {
  return str.split(separator, limit);
}

/**
 * 将字符串按单词边界分割
 */
export function words(str: string): string[] {
  return str.match(/[a-zA-Z0-9]+/g) || [];
}

/**
 * 截取字符串
 */
export function substring(str: string, start: number, end?: number): string {
  return str.substring(start, end);
}

/**
 * 截取指定长度字符串，超出部分用省略号表示
 */
export function truncate(str: string, length: number, omission: string = '...'): string {
  if (str.length <= length) return str;
  return str.slice(0, length - omission.length) + omission;
}

/**
 * 字符串模板替换
 */
export function template(str: string, data: Record<string, any>): string {
  return str.replace(/\${([^}]+)}/g, (_, key) => data[key] ?? '');
}
