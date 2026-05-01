/**
 * @lytjs/common-string
 * 字符串处理工具函数集合
 */

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 转换为 kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * 转换为 camelCase
 */
export function camelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
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
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
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
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 转义 HTML 特殊字符的映射表（模块级常量，避免每次调用重复创建）
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
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
  return escapeHTML(str).replace(/=/g, "&#61;");
}

/**
 * 反转义 HTML 特殊字符的映射表（模块级常量，避免每次调用重复创建）
 */
const HTML_UNESCAPE_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

/**
 * 反转义 HTML 特殊字符
 */
export function unescapeHTML(str: string): string {
  return str.replace(
    /&(?:amp|lt|gt|quot|#39|apos);/g,
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
    if (ch === "]" || ch === "-") {
      specialChars.push(ch);
    } else {
      normalChars.push(ch);
    }
  }
  const charClass =
    specialChars.join("") + escapeRegExp(normalChars.join(""));
  const pattern = new RegExp(`^[${charClass}]+|[${charClass}]+$`, "g");
  return str.replace(pattern, "");
}

/**
 * 重复字符串 n 次
 */
export function repeat(str: string, count: number): string {
  if (count <= 0) return "";
  return str.repeat(count);
}

/**
 * 在字符串开头填充
 */
export function padStart(
  str: string,
  length: number,
  fillStr: string = " ",
): string {
  return str.padStart(length, fillStr);
}

/**
 * 在字符串末尾填充
 */
export function padEnd(
  str: string,
  length: number,
  fillStr: string = " ",
): string {
  return str.padEnd(length, fillStr);
}

/**
 * 检查字符串是否以指定前缀开头
 */
export function startsWith(
  str: string,
  prefix: string,
  position: number = 0,
): boolean {
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
export function truncate(
  str: string,
  length: number,
  omission: string = "...",
): string {
  if (str.length <= length) return str;
  const truncatedLength = length - omission.length;
  if (truncatedLength <= 0) return omission.slice(0, length);
  return str.slice(0, truncatedLength) + omission;
}

/**
 * 简单模板引擎，使用 {key} 作为占位符
 */
export function template(
  str: string,
  data: Record<string, string | number | boolean>,
): string {
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * 规范化 class 值
 */
export function normalizeClass(
  value:
    | string
    | Record<string, any>
    | Array<any>
    | undefined
    | null
    | boolean
    | number,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(normalizeClass).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    const result: string[] = [];
    for (const key in value) {
      if (value[key]) {
        result.push(key);
      }
    }
    return result.join(" ");
  }

  return "";
}

/**
 * 规范化 style 值
 */
export function normalizeStyle(
  value:
    | string
    | Record<string, string | number>
    | Array<any>
    | undefined
    | null,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(normalizeStyle).filter(Boolean).join("; ");
  }

  if (typeof value === "object") {
    const result: string[] = [];
    for (const key in value) {
      const cssKey = camelToKebab(key);
      result.push(`${cssKey}: ${value[key]}`);
    }
    return result.join("; ");
  }

  return "";
}


// ============================================================
// HTML void elements
// ============================================================

/**
 * HTML void elements that are allowed to use self-closing syntax (<br />, <img />, etc.).
 * Based on the HTML specification: https://html.spec.whatwg.org/multipage/syntax.html#void-elements
 */
export const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

// ============================================================
// Boolean attributes
// ============================================================

/**
 * HTML boolean attributes whose presence means true.
 */
export const BOOLEAN_ATTRS = new Set([
  "disabled",
  "readonly",
  "checked",
  "selected",
  "multiple",
  "autofocus",
  "async",
  "defer",
  "controls",
  "loop",
  "muted",
  "default",
  "open",
  "required",
  "reversed",
  "allowfullscreen",
]);

/**
 * Check if a key is a boolean HTML attribute
 */
export function isBooleanAttr(key: string): boolean {
  return BOOLEAN_ATTRS.has(key);
}

// ============================================================
// 安全工具函数
// ============================================================

/**
 * 危险事件处理器属性黑名单
 */
const DANGEROUS_EVENT_ATTRS = new Set([
  "onclick",
  "ondblclick",
  "onmousedown",
  "onmouseup",
  "onmouseover",
  "onmouseout",
  "onmousemove",
  "onmouseenter",
  "onmouseleave",
  "onkeydown",
  "onkeyup",
  "onkeypress",
  "onfocus",
  "onblur",
  "oninput",
  "onchange",
  "onsubmit",
  "onreset",
  "onload",
  "onerror",
  "onresize",
  "onscroll",
  "oncontextmenu",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "onanimationend",
  "onanimationstart",
  "ontransitionend",
  "onwheel",
  "onpointerdown",
  "onpointerup",
  "onpointermove",
  "oncopy",
  "oncut",
  "onpaste",
]);

/**
 * 危险 URL 属性（需要协议白名单校验）
 */
const DANGEROUS_URL_ATTRS = new Set([
  "src",
  "href",
  "action",
  "formaction",
  "xlink:href",
  "data",
  "srcdoc",
  "poster",
  "background",
]);

/**
 * 允许的 URL 协议
 */
const ALLOWED_URL_PROTOCOLS = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
  "#",
  "",
]);

/**
 * 检查属性是否安全
 * @returns true 表示安全，false 表示应跳过
 */
export function isSafeAttribute(attrName: string, attrValue: string): boolean {
  const lowerName = attrName.toLowerCase();

  // 1. 检查事件处理器属性
  if (DANGEROUS_EVENT_ATTRS.has(lowerName)) {
    if (__DEV__) {
      console.warn(
        `[LytJS] Blocked dangerous event attribute: ${attrName}`,
      );
    }
    return false;
  }

  // 2. 检查 URL 类属性
  if (DANGEROUS_URL_ATTRS.has(lowerName)) {
    const trimmed = (attrValue ?? "").trim().toLowerCase();
    const protocolMatch = trimmed.match(/^([a-z]+:|#)/);
    const protocol = protocolMatch?.[1] ?? "";
    if (!ALLOWED_URL_PROTOCOLS.has(protocol)) {
      if (__DEV__) {
        console.warn(
          `[LytJS] Blocked dangerous URL in attribute "${attrName}": ` +
            `protocol "${protocol}" is not allowed`,
        );
      }
      return false;
    }
  }

  return true;
}

// ============================================================
// HTML sanitization
// ============================================================

// Pre-compiled RegExp constants for sanitizeHTML (avoid re-creation on every call)
const DANGEROUS_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "select",
  "button",
  "link",
  "meta",
  "base",
  "applet",
  "frame",
  "frameset",
  "details",
  "marquee",
  "math",
  "svg",
];
const DANGEROUS_TAG_PATTERN = DANGEROUS_TAGS.join("|");
const RE_DANGEROUS_OPEN_CLOSE_TAG = new RegExp(
  `<\\/?(${DANGEROUS_TAG_PATTERN})\\b(?:[^>"']|"[^"]*"|'[^']*')*>`,
  "gi",
);
const RE_EVENT_HANDLER_ATTR =
  /(<[^>]*?)\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const URI_ATTRS =
  "href|src|action|formaction|xlink:href|data|codebase|cite|background|poster|dynsrc|lowsrc";
const RE_URI_ATTR = new RegExp(
  `(?:(${URI_ATTRS})\\s*=\\s*)(?:"([^"]*)"|'([^']*)')`,
  "gi",
);
const RE_WHITESPACE_CTRL =
  /[\u0000-\u0020\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]+/g;
const RE_DANGEROUS_SCHEME =
  /^(javascript|vbscript|data|mhtml|x-javascript)\s*:/i;
const DECODE_MAP: [RegExp, string | ((...args: any[]) => string)][] = [
  [
    /&#x0*([0-9a-fA-F]+);/g,
    (_: any, code: any) => String.fromCodePoint(parseInt(code, 16)),
  ],
  [
    /&#0*([0-9]+);/g,
    (_: any, code: any) => String.fromCodePoint(parseInt(code, 10)),
  ],
  [/&amp;/gi, "&"],
  [/&lt;/gi, "<"],
  [/&gt;/gi, ">"],
  [/&quot;/gi, '"'],
  [/&apos;/gi, "'"],
  [/&#x27;/gi, "'"],
  [/&#x22;/gi, '"'],
];

/**
 * Runtime HTML sanitization for innerHTML (v-html directive).
 *
 * Security strategy:
 * 1. Entity decoding: Decodes HTML entities (including nested/double-encoded
 *    forms like &amp;lt;) before inspection, so encoded payloads cannot bypass
 *    tag/attribute checks. Decoding runs up to 5 rounds until the string
 *    stabilises.
 * 2. Dangerous tag removal: Strips both opening and closing forms of dangerous
 *    tags (script, iframe, object, embed, form, input, textarea, select,
 *    button, link, meta, base, applet, frame, frameset, details, marquee,
 *    math, svg) via case-insensitive regex.
 * 3. Event-handler stripping: Removes on* attributes (e.g. onclick, onerror)
 *    from any remaining tags.
 * 4. Dangerous URI neutralisation: Inspects href, src, action, formaction,
 *    xlink:href, data, codebase, cite, background, poster, dynsrc, lowsrc
 *    attributes and neutralises javascript:, vbscript:, data:, mhtml:, and
 *    x-javascript: schemes. Strips whitespace/control characters before
 *    scheme detection to prevent obfuscation.
 *
 * @param str - The raw HTML string to sanitize (typically from v-html binding).
 * @returns The sanitized HTML string with dangerous content removed.
 */
export function sanitizeHTML(str: string): string {
  // 1. Decode HTML entities so encoded payloads are not missed.
  //    We apply decode repeatedly until the string stabilises (handles
  //    double-encoding like &amp;lt;script&amp;gt;).
  let decoded = str;
  // Run up to 5 rounds to handle nested encoding.
  // Fast path: skip decoding entirely if the string contains no '&' character,
  // since HTML entities always start with '&'.
  if (str.includes("&")) {
    for (let i = 0; i < 5; i++) {
      const prev = decoded;
      for (const [re, repl] of DECODE_MAP) {
        decoded = decoded.replace(re, repl as any);
      }
      if (decoded === prev) break;
    }
  }

  // 2. Remove dangerous tags (both self-closing and normal forms).
  decoded = decoded.replace(RE_DANGEROUS_OPEN_CLOSE_TAG, "");

  // 3. Remove event-handler attributes (on*).
  //    Matches on<word>=  inside any tag, consuming the quoted value.
  decoded = decoded.replace(RE_EVENT_HANDLER_ATTR, "$1");

  // 4. Neutralise dangerous URI schemes in href / src / action / formaction / xlink:href.
  decoded = decoded.replace(
    RE_URI_ATTR,
    (_match, attr: string, dq: string, sq: string) => {
      const value = dq ?? sq ?? "";
      // Strip whitespace / null bytes / control chars that could hide the scheme
      const cleaned = value
        .replace(RE_WHITESPACE_CTRL, "")
        .toLowerCase();
      if (RE_DANGEROUS_SCHEME.test(cleaned)) {
        return `${attr}=""`;
      }
      return _match;
    },
  );

  return decoded;
}

export { escapeHTML as escapeHtml };
