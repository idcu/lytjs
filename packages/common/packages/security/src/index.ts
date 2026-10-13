/**
 * @lytjs/common-security
 * Security utilities: HTML sanitization, dangerous attribute detection, URL safety checks.
 *
 * Extracted from @lytjs/common-string to keep security concerns isolated.
 */

const warn = (...args: unknown[]) => {
  if (typeof console !== 'undefined') console.warn('[LytJS]', ...args);
};

// ============================================================
// Dangerous Event Attributes
// ============================================================

/**
 * Dangerous event handler attribute blacklist.
 * These inline event handler attributes can execute arbitrary JavaScript
 * and should be stripped during HTML sanitization.
 */
export const DANGEROUS_EVENT_ATTRS = new Set([
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmouseout',
  'onmousemove',
  'onmouseenter',
  'onmouseleave',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'onfocus',
  'onblur',
  'oninput',
  'onchange',
  'onsubmit',
  'onreset',
  'onload',
  'onerror',
  'onresize',
  'onscroll',
  'oncontextmenu',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'onanimationend',
  'onanimationstart',
  'onanimationiteration',
  'ontransitionend',
  'ontoggle',
  'onwheel',
  'onpointerdown',
  'onpointerup',
  'onpointermove',
  'onpointerover',
  'onpointerout',
  'onpointerenter',
  'onpointerleave',
  'onpointercancel',
  'onpointerrawupdate',
  'oncopy',
  'oncut',
  'onpaste',
  'ontouchstart',
  'ontouchmove',
  'ontouchend',
  'ontouchcancel',
  'onbeforeinput',
  'oncompositionstart',
  'oncompositionupdate',
  'oncompositionend',
  'onfocusin',
  'onfocusout',
  'onhashchange',
  'onpopstate',
  'onstorage',
  'onmessage',
  'onoffline',
  'ononline',
  'onpagehide',
  'onpageshow',
  'onbeforeunload',
  'onunload',
  'onabort',
  'oncanplay',
  'oncanplaythrough',
  'ondurationchange',
  'onemptied',
  'onended',
  'onloadeddata',
  'onloadedmetadata',
  'onloadstart',
  'onpause',
  'onplay',
  'onplaying',
  'onprogress',
  'onratechange',
  'onseeked',
  'onseeking',
  'onstalled',
  'onsuspend',
  'ontimeupdate',
  'onvolumechange',
  'onwaiting',
  'onshow',
  'onafterprint',
  'onbeforeprint',
  'onfullscreenchange',
  'onfullscreenerror',
  'onlanguagechange',
  'onrejectionhandled',
  'onunhandledrejection',
  'onsecuritypolicyviolation',
]);

// ============================================================
// Dangerous URL Attributes
// ============================================================

/**
 * Dangerous URL attributes that need protocol whitelist validation.
 */
const DANGEROUS_URL_ATTRS = new Set([
  'src',
  'href',
  'action',
  'formaction',
  'xlink:href',
  'data',
  'srcdoc',
  'poster',
  'background',
]);

/**
 * Allowed URL protocols.
 */
const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:', '#', '']);

// ============================================================
// isSafeAttribute
// ============================================================

/**
 * Check if an attribute is safe.
 * @returns true if safe, false if it should be skipped.
 */
export function isSafeAttribute(attrName: string, attrValue: string): boolean {
  const lowerName = attrName.toLowerCase();

  // 1. Check event handler attributes
  if (DANGEROUS_EVENT_ATTRS.has(lowerName)) {
    if (__DEV__) {
      warn(`Blocked dangerous event attribute: ${attrName}`);
    }
    return false;
  }

  // 2. Check URL-type attributes
  if (DANGEROUS_URL_ATTRS.has(lowerName)) {
    const trimmed = (attrValue ?? '').trim().toLowerCase();
    const protocolMatch = trimmed.match(/^([a-z]+:|#)/);
    const protocol = protocolMatch?.[1] ?? '';
    if (!ALLOWED_URL_PROTOCOLS.has(protocol)) {
      if (__DEV__) {
        warn(
          `Blocked dangerous URL in attribute "${attrName}": ` +
            `protocol "${protocol}" is not allowed`,
        );
      }
      return false;
    }
  }

  return true;
}

// ============================================================
// HTML Sanitization
// ============================================================

// Pre-compiled RegExp constants for sanitizeHTML
const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'textarea',
  'select',
  'button',
  'link',
  'meta',
  'base',
  'applet',
  'frame',
  'frameset',
  'marquee',
];
const DANGEROUS_TAG_PATTERN = DANGEROUS_TAGS.join('|');
const RE_DANGEROUS_OPEN_CLOSE_TAG = new RegExp(
  `<\\/?(${DANGEROUS_TAG_PATTERN})\\b(?:[^>"']|"[^"]*"|'[^']*')*>`,
  'gi',
);
const RE_EVENT_HANDLER_ATTR = /(<[^>]*?)\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const RE_EVENT_HANDLER_ATTR_NOVALUE = /(<[^>]*?)\s+on[a-zA-Z]+(?=\s|>|\/>)/gi;
const RE_EVENT_HANDLER_ATTR_UNQUOTED = /(<[^>]*?)\s+on[a-zA-Z]+\s*=\s*(?![\s"'])([^\s>]+)/gi;
const URI_ATTRS =
  'href|src|action|formaction|xlink:href|data|codebase|cite|background|poster|dynsrc|lowsrc';
const RE_URI_ATTR = new RegExp(`(?:(${URI_ATTRS})\\s*=\\s*)(?:"([^"]*)"|'([^']*)')`, 'gi');
const RE_WHITESPACE_CTRL =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0020\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]+/g;
const RE_DANGEROUS_SCHEME = /^(javascript|vbscript|data|mhtml|x-javascript)\s*:/i;
const RE_DATA_SVG = /^data\s*:\s*image\/svg\+xml/i;
const RE_CSS_EXPRESSION = /expression\s*\(/gi;
const RE_STYLE_ATTR = /(<[^>]*?)\s+(style)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

// Tag-pair removal: for these tags the *content* is itself dangerous
// (CSS injection via <style>, SVG/HTML injection via <foreignObject>), so the
// opening tag, inner content, and closing tag must all be removed together.
// A single-tag pass (RE_DANGEROUS_OPEN_CLOSE_TAG) would otherwise leave the
// inner payload behind.
const RE_DANGEROUS_TAG_PAIR =
  /<\s*(?:style|foreignObject|noscript|template)[^>]*>[\s\S]*?<\s*\/\s*(?:style|foreignObject|noscript|template)\s*>/gi;
// Self-closing foreignObject fallback (no closing tag).
const RE_FOREIGNOBJECT_SELF = /<\s*foreignObject[^>]*\/?>/gi;
// Attributes that permit arbitrary HTML/script injection regardless of scheme.
const RE_DANGEROUS_INJECT_ATTR =
  /\s+(?:srcdoc|formaction|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;

const DECODE_MAP: [RegExp, string | ((substring: string, ...args: string[]) => string)][] = [
  [/&#x0*([0-9a-fA-F]+);/g, (_: string, code: string) => String.fromCodePoint(parseInt(code, 16))],
  [/&#0*([0-9]+);/g, (_: string, code: string) => String.fromCodePoint(parseInt(code, 10))],
  [/&amp;/gi, '&'],
  [/&lt;/gi, '<'],
  [/&gt;/gi, '>'],
  [/&quot;/gi, '"'],
  [/&apos;/gi, "'"],
  [/&#x27;/gi, "'"],
  [/&#x22;/gi, '"'],
];

/**
 * Runtime HTML sanitization for innerHTML (v-html directive).
 *
 * Security strategy:
 * 1. Entity decoding: Decodes HTML entities before inspection.
 * 2. Dangerous tag removal: Strips dangerous tags via case-insensitive regex.
 * 3. Event-handler stripping: Removes on* attributes.
 * 4. Dangerous URI neutralisation: Inspects URL attributes and neutralises dangerous schemes.
 * 5. Dangerous tag-pair removal: Strips <style>/<foreignObject>/... including their inner content.
 * 6. Injection-prone attribute stripping: Removes srcdoc/formaction/xlink:href entirely
 *    (these allow arbitrary HTML/script injection regardless of scheme).
 * 7. Iterate (2)–(6) until the output stabilises (bounded): defeats mutation /
 *    recombination XSS where stripping one tag exposes another
 *    (e.g. `<scr<script>ipt>` collapses to `<script>` once the inner tag is gone).
 *
 * @param str - The raw HTML string to sanitize.
 * @returns The sanitized HTML string with dangerous content removed.
 *
 * @remarks
 * **Limitations:**
 * - This is a best-effort sanitizer and should NOT be the sole defense against XSS.
 * - It does NOT parse HTML into a DOM tree; regex-based approaches have inherent blind spots.
 * - For production-grade sanitization, consider a dedicated library like DOMPurify.
 */
export function sanitizeHTML(str: string): string {
  // 1. Decode HTML entities so encoded payloads are not missed.
  let decoded = str;
  if (str.includes('&')) {
    for (let i = 0; i < 5; i++) {
      const prev = decoded;
      for (const [re, repl] of DECODE_MAP) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        decoded = decoded.replace(re, repl as any);
      }
      if (decoded === prev) break;
    }
  }

  // 2–6. 危险内容清除。包进**有界循环（最多 10 轮，直至稳定）**：
  // 标签 / 属性移除可能暴露出新标签（mutation / 重组 XSS，例如
  // `<div><scr<script>ipt>…</script></div>` —— 删掉内层 `<script>` 后，
  // `<scr` 与 `ipt>` 会重新拼成 `<script>`），故需反复清理直到输出不再变化。
  let output = decoded;
  const MAX_ITERATIONS = 10;
  let iterations = 0;
  let prev = '';
  do {
    prev = output;

    // 2. Remove dangerous tags.
    output = output.replace(RE_DANGEROUS_OPEN_CLOSE_TAG, '');

    // 2b. Remove dangerous tag *pairs* (content included). The single-tag pass above
    // would otherwise leave the inner CSS / SVG payload behind
    // (<style>…</style>, <foreignObject>…</foreignObject>, etc.).
    output = output.replace(RE_DANGEROUS_TAG_PAIR, '');
    output = output.replace(RE_FOREIGNOBJECT_SELF, '');

    // 3. Remove event-handler attributes (on*).
    output = output.replace(RE_EVENT_HANDLER_ATTR, '$1');
    output = output.replace(RE_EVENT_HANDLER_ATTR_NOVALUE, '$1');
    output = output.replace(RE_EVENT_HANDLER_ATTR_UNQUOTED, '$1');

    // 3b. Strip attributes that permit arbitrary HTML/script injection regardless
    // of their (possibly absent) scheme — srcdoc / formaction / xlink:href.
    output = output.replace(RE_DANGEROUS_INJECT_ATTR, '');

    // 4. Neutralise dangerous URI schemes.
    output = output.replace(RE_URI_ATTR, (_match, attr: string, dq: string, sq: string) => {
      const value = dq ?? sq ?? '';
      const cleaned = value.replace(RE_WHITESPACE_CTRL, '').toLowerCase();
      if (RE_DANGEROUS_SCHEME.test(cleaned)) {
        if (RE_DATA_SVG.test(cleaned)) {
          return `${attr}=""`;
        }
        return `${attr}=""`;
      }
      return _match;
    });

    // 5. Remove expression() CSS expressions from style attributes.
    output = output.replace(
      RE_STYLE_ATTR,
      (_match, tagPrefix: string, _attrName: string, dq: string, sq: string) => {
        const value = dq ?? sq ?? '';
        const cleaned = value.replace(RE_WHITESPACE_CTRL, '');
        if (RE_CSS_EXPRESSION.test(cleaned)) {
          const sanitized = cleaned.replace(RE_CSS_EXPRESSION, '').trim();
          return `${tagPrefix} style="${sanitized}"`;
        }
        return _match;
      },
    );

    // 6. Remove any remaining javascript:/vbscript: in any context (catch-all).
    output = output.replace(/(?:javascript|vbscript)\s*:/gi, 'blocked:');

    iterations++;
  } while (output !== prev && iterations < MAX_ITERATIONS);

  return output;
}

declare const __DEV__: boolean;
