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
 * camelToKebab - kebabCase 的别名
 *
 * 与 kebabCase 功能一致，提供更直观的命名。
 * @see kebabCase
 */
export const camelToKebab = kebabCase;

/**
 * kebabToCamel - camelCase 的别名
 *
 * 与 camelCase 功能一致，提供更直观的命名。
 * @see camelCase
 */
export const kebabToCamel = camelCase;

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

/**
 * 标准化 class 值
 *
 * 支持多种形式的 class 输入：
 *   - 字符串：'foo bar'
 *   - 数组：['foo', 'bar']
 *   - 对象：{ foo: true, bar: false }
 *   - 混合：['foo', { bar: true }]
 *
 * @param value class 值
 * @returns 标准化后的 class 字符串
 */
export function normalizeClass(value: any): string {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeClass).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    const classes: string[] = [];
    for (const key in value) {
      if (value[key]) {
        classes.push(key);
      }
    }
    return classes.join(' ');
  }

  return String(value);
}

/**
 * 标准化 style 值
 *
 * 支持两种形式的 style 输入：
 *   - 字符串：'color: red; font-size: 14px'
 *   - 对象：{ color: 'red', fontSize: '14px' }
 *
 * @param value style 值
 * @returns 标准化后的 style 字符串
 */
export function normalizeStyle(value: any): string {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    const styles: string[] = [];
    for (const key in value) {
      if (value[key]) {
        // 将驼峰命名转换为 kebab-case
        const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        styles.push(`${kebabKey}: ${value[key]}`);
      }
    }
    return styles.join('; ');
  }

  return String(value);
}
