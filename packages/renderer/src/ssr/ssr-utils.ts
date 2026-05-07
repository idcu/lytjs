/**
 * @lytjs/renderer - SSR Utilities
 * SSR 渲染共享工具函数
 * FIX: P2-36 提取 ssr-renderer 和 ssr-stream 的共享代码
 */

import { isString, isObject, isNullish } from '@lytjs/common-is';
import { camelToKebab } from '@lytjs/common-string';
import { warn } from '@lytjs/common-error';
import { escapeHtml, isBooleanAttr } from '../utils';

// ============================================================
// HTML 标签验证
// ============================================================

/**
 * 验证是否为有效的 HTML 元素标签名
 * @param tag - 标签名
 * @returns 是否有效
 */
export function isValidHTMLElementTag(tag: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(tag);
}

// ============================================================
// URL 安全验证
// ============================================================

// Security: attributes that carry URLs and need protocol validation
// Extracted to module-level constant to avoid re-creation on every render
export const URL_ATTRS = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'xlink:href',
  'data',
  'srcdoc',
]);

// Named entity decoding constants
export const NAMED_ENTITIES: Record<string, string> = {
  '&colon;': ':',
  '&tab;': '\t',
  '&newline;': '\n',
  '&lpar;': '(',
  '&rpar;': ')',
  '&nbsp;': '\u00A0',
  '&copy;': '\u00A9',
  '&reg;': '\u00AE',
  '&trade;': '\u2122',
  '&times;': '\u00D7',
  '&divide;': '\u00F7',
  '&pound;': '\u00A3',
  '&yen;': '\u00A5',
  '&cent;': '\u00A2',
  '&sect;': '\u00A7',
  '&para;': '\u00B6',
  '&middot;': '\u00B7',
  '&laquo;': '\u00AB',
  '&raquo;': '\u00BB',
  '&iexcl;': '\u00A1',
  '&iquest;': '\u00BF',
  '&deg;': '\u00B0',
  '&plusmn;': '\u00B1',
  '&micro;': '\u00B5',
  '&frac14;': '\u00BC',
  '&frac12;': '\u00BD',
  '&frac34;': '\u00BE',
  '&sup1;': '\u00B9',
  '&sup2;': '\u00B2',
  '&sup3;': '\u00B3',
  '&acute;': '\u00B4',
  '&cedil;': '\u00B8',
  '&ordf;': '\u00AA',
  '&not;': '\u00AC',
  '&shy;': '\u00AD',
  '&macr;': '\u00AF',
  '&uml;': '\u00A8',
  '&circ;': '\u02C6',
  '&tilde;': '\u02DC',
  '&ensp;': '\u2002',
  '&emsp;': '\u2003',
  '&thinsp;': '\u2009',
  '&zwnj;': '\u200C',
  '&zwj;': '\u200D',
  '&lrm;': '\u200E',
  '&rlm;': '\u200F',
  '&ndash;': '\u2013',
  '&mdash;': '\u2014',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&sbquo;': '\u201A',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
  '&bdquo;': '\u201E',
  '&dagger;': '\u2020',
  '&Dagger;': '\u2021',
  '&bull;': '\u2022',
  '&hellip;': '\u2026',
  '&permil;': '\u2030',
  '&prime;': '\u2032',
  '&Prime;': '\u2033',
  '&lsaquo;': '\u2039',
  '&rsaquo;': '\u203A',
  '&oline;': '\u203E',
  '&frasl;': '\u2044',
  '&euro;': '\u20AC',
  '&larr;': '\u2190',
  '&uarr;': '\u2191',
  '&rarr;': '\u2192',
  '&darr;': '\u2193',
  '&harr;': '\u2194',
  '&crarr;': '\u21B5',
  '&lceil;': '\u2308',
  '&rceil;': '\u2309',
  '&lfloor;': '\u230A',
  '&rfloor;': '\u230B',
  '&lang;': '\u27E8',
  '&rang;': '\u27E9',
  '&loz;': '\u25CA',
  '&spades;': '\u2660',
  '&clubs;': '\u2663',
  '&hearts;': '\u2665',
  '&diams;': '\u2666',
  '&OElig;': '\u0152',
  '&oelig;': '\u0153',
  '&Scaron;': '\u0160',
  '&scaron;': '\u0161',
  '&Yuml;': '\u0178',
  '&fnof;': '\u0192',
  '&Alpha;': '\u0391',
  '&Beta;': '\u0392',
  '&Gamma;': '\u0393',
  '&Delta;': '\u0394',
  '&Epsilon;': '\u0395',
  '&Zeta;': '\u0396',
  '&Eta;': '\u0397',
  '&Theta;': '\u0398',
  '&Iota;': '\u0399',
  '&Kappa;': '\u039A',
  '&Lambda;': '\u039B',
  '&Mu;': '\u039C',
  '&Nu;': '\u039D',
  '&Xi;': '\u039E',
  '&Omicron;': '\u039F',
  '&Pi;': '\u03A0',
  '&Rho;': '\u03A1',
  '&Sigma;': '\u03A3',
  '&Tau;': '\u03A4',
  '&Upsilon;': '\u03A5',
  '&Phi;': '\u03A6',
  '&Chi;': '\u03A7',
  '&Psi;': '\u03A8',
  '&Omega;': '\u03A9',
  '&alpha;': '\u03B1',
  '&beta;': '\u03B2',
  '&gamma;': '\u03B3',
  '&delta;': '\u03B4',
  '&epsilon;': '\u03B5',
  '&zeta;': '\u03B6',
  '&eta;': '\u03B7',
  '&theta;': '\u03B8',
  '&iota;': '\u03B9',
  '&kappa;': '\u03BA',
  '&lambda;': '\u03BB',
  '&mu;': '\u03BC',
  '&nu;': '\u03BD',
  '&xi;': '\u03BE',
  '&omicron;': '\u03BF',
  '&pi;': '\u03C0',
  '&rho;': '\u03C1',
  '&sigmaf;': '\u03C2',
  '&sigma;': '\u03C3',
  '&tau;': '\u03C4',
  '&upsilon;': '\u03C5',
  '&phi;': '\u03C6',
  '&chi;': '\u03C7',
  '&psi;': '\u03C8',
  '&omega;': '\u03C9',
  '&thetasym;': '\u03D1',
  '&upsih;': '\u03D2',
  '&piv;': '\u03D6',
  '&apos;': "'",
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
};

// Named entity regex (module-level to avoid re-creation)
const NAMED_ENTITY_REGEX = new RegExp(
  Object.keys(NAMED_ENTITIES)
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'g',
);

// Numeric entity regex (module-level to avoid re-creation on every isSafeURL call)
const NUMERIC_ENTITY_REGEX = /&#x?[0-9a-f]+;/gi;

/**
 * 检查 URL 是否安全（防止 XSS 攻击）
 * @param url - 要检查的 URL
 * @returns 是否安全
 */
export function isSafeURL(url: string): boolean {
  // 循环解码 HTML 实体，直到字符串不再变化
  let decoded = url;
  let prev = '';
  let maxIterations = 10;
  while (decoded !== prev && maxIterations-- > 0) {
    prev = decoded;
    decoded = decoded.replace(NUMERIC_ENTITY_REGEX, (match) => {
      const codePoint = match.startsWith('&#x')
        ? parseInt(match.slice(3, -1), 16)
        : parseInt(match.slice(2, -1), 10);
      // Validate the parsed code point is within the valid Unicode range
      if (isNaN(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        return match;
      }
      return String.fromCodePoint(codePoint);
    });
    // 命名实体解码（在数字实体解码之后）
    decoded = decoded.replace(NAMED_ENTITY_REGEX, (match) => NAMED_ENTITIES[match] || match);
  }
  // 使用 URL 构造函数进行额外验证
  try {
    const parsed = new URL(decoded, 'http://example.com');
    const protocol = parsed.protocol.toLowerCase().replace(':', '');
    if (protocol === 'javascript') {
      return false;
    }
    if (protocol === 'data') {
      // 禁止 data:image/svg+xml（可嵌入脚本，存在 XSS 风险）
      if (/^data:image\/svg\+xml/i.test(decoded)) {
        return false;
      }
      // 允许安全的 data:image/* MIME 类型（使用解码后的 URL 进行检查）
      return /^data:image\/(png|jpeg|jpg|gif|webp|bmp|ico|avif);/i.test(decoded);
    }
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// 属性渲染
// ============================================================

/**
 * 将属性渲染为 HTML 字符串（用于 SSR）
 * @param key - 属性名
 * @param value - 属性值
 * @returns HTML 属性字符串
 */
export function renderAttributeToString(key: string, value: unknown): string {
  // Skip null/undefined
  if (isNullish(value)) return '';

  // Skip event handlers
  if (/^on[A-Z]/.test(key)) return '';

  // Class handling
  if (key === 'class') {
    const classValue = value == null ? '' : String(value);
    if (!classValue) return '';
    return ` class="${escapeHtml(classValue)}"`;
  }

  // Style handling
  if (key === 'style') {
    if (isString(value)) {
      if (!value) return '';
      return ` style="${escapeHtml(value)}"`;
    }
    if (isObject(value)) {
      const styles: string[] = [];
      for (const k in value as Record<string, unknown>) {
        const val = (value as Record<string, unknown>)[k];
        if (val != null && val !== '') {
          styles.push(`${camelToKebab(k)}:${String(val)}`);
        }
      }
      if (styles.length === 0) return '';
      return ` style="${escapeHtml(styles.join(';'))}"`;
    }
    return '';
  }

  // Boolean attributes
  if (isBooleanAttr(key)) {
    if (value === false || value === '') return '';
    return ` ${key}`;
  }

  // Security: block dangerous URL protocols on URL attributes
  if (URL_ATTRS.has(key)) {
    if (!isSafeURL(String(value))) {
      if (__DEV__) {
        warn(`Blocked potentially dangerous attribute: ${key}="${String(value)}"`);
      }
      return '';
    }
  }

  // Regular attributes
  return ` ${key}="${escapeHtml(String(value))}"`;
}
