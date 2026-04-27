/**
 * Lyt.js SFC 解析器
 *
 * 将 .lyt 单文件组件内容解析为描述符对象。
 *
 * 支持的块：
 *   - <template>  — 模板内容
 *   - <script>    — 组件脚本
 *   - <style>     — 样式（支持 scoped 属性，支持多个）
 *
 * 解析规则：
 *   - 使用正则匹配提取各块
 *   - 忽略 HTML 注释（<!-- -->）
 *   - <script> 块中提取 export default { ... } 的内容
 *   - <style scoped> 属性会被标记
 */

// ============================================================
// 类型定义
// ============================================================

/** SFC 块基础接口 */
export interface SFCBlock {
  type: 'template' | 'script' | 'style'
  content: string
  start: number
  end: number
  attrs: Record<string, string>
}

/** SFC 样式块接口 */
export interface SFCStyleBlock extends SFCBlock {
  type: 'style'
  scoped: boolean
}

/** SFC 描述符 */
export interface SFCDescriptor {
  filename: string
  template: SFCBlock | null
  script: SFCBlock | null
  styles: SFCStyleBlock[]
}

// ============================================================
// 常量
// ============================================================

/** 匹配 HTML 注释 */
const COMMENT_RE = /<!--[\s\S]*?-->/g;

/** 匹配 <template> 块的开始标签 */
const TEMPLATE_OPEN_RE = /<template(\s[^>]*)?\s*>/;

/** 匹配 <template> 块的结束标签 */
const _TEMPLATE_CLOSE_RE = /<\/template>/;

/** 匹配 <script> 块的开始标签 */
const SCRIPT_OPEN_RE = /<script(\s[^>]*)?\s*>/;

/** 匹配 <script> 块的结束标签 */
const _SCRIPT_CLOSE_RE = /<\/script>/;

/** 匹配 <style> 块的开始标签（含 scoped 属性） */
const STYLE_OPEN_RE = /<style(\s[^>]*)?\s*>/;

/** 匹配 <style> 块的结束标签 */
const _STYLE_CLOSE_RE = /<\/style>/;

/** 匹配 export default { ... } 内容（非贪婪匹配，避免跨块贪婪） */
const EXPORT_DEFAULT_RE = /export\s+default\s*\{([\s\S]*?)\}\s*$/;

/** 匹配标签属性 */
const ATTR_RE = /(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;

// ============================================================
// 辅助函数
// ============================================================

/**
 * 解析标签属性字符串为属性对象
 *
 * @param attrStr 属性字符串（如 `scoped lang="css"`）
 * @returns 属性键值对
 */
function parseAttrs(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!attrStr || !attrStr.trim()) return attrs;

  ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(attrStr)) !== null) {
    const name = match[1];
    const value = match[2] !== undefined ? match[2]
      : match[3] !== undefined ? match[3]
        : match[4] !== undefined ? match[4]
          : '';
    attrs[name] = value;
  }

  return attrs;
}

/**
 * 查找匹配的闭合标签位置
 *
 * 支持嵌套同名标签的匹配。
 *
 * @param source 源字符串
 * @param openTagRe 开始标签正则
 * @param closeTag 结束标签字符串
 * @param startIndex 开始搜索的位置
 * @returns 闭合标签结束后的位置，未找到返回 -1
 */
function findClosingTag(
  source: string,
  openTagRe: RegExp,
  closeTag: string,
  startIndex: number
): number {
  let depth = 1;
  let pos = startIndex;

  while (pos < source.length && depth > 0) {
    // 查找下一个开始标签或结束标签
    const nextOpen = source.slice(pos).search(openTagRe);
    const nextClose = source.indexOf(closeTag, pos);

    if (nextClose === -1) {
      return -1; // 没有找到闭合标签
    }

    if (nextOpen !== -1 && nextOpen + pos < nextClose) {
      // 先遇到开始标签，深度 +1
      depth++;
      pos = nextOpen + pos + 1;
    } else {
      // 先遇到结束标签，深度 -1
      depth--;
      if (depth === 0) {
        return nextClose + closeTag.length;
      }
      pos = nextClose + closeTag.length;
    }
  }

  return -1;
}

/**
 * 提取一个块的内容
 *
 * @param source 源字符串
 * @param openTagRe 开始标签正则
 * @param closeTag 结束标签字符串
 * @returns 块信息或 null
 */
function extractBlock(
  source: string,
  openTagRe: RegExp,
  closeTag: string
): { content: string; start: number; end: number; attrs: Record<string, string> } | null {
  openTagRe.lastIndex = 0;
  const openMatch = openTagRe.exec(source);
  if (!openMatch) return null;

  const start = openMatch.index;
  const attrStr = openMatch[1] || '';
  const attrs = parseAttrs(attrStr);
  const contentStart = openMatch.index + openMatch[0].length;

  const closeEnd = findClosingTag(source, openTagRe, closeTag, contentStart);
  if (closeEnd === -1) return null;

  const content = source.slice(contentStart, closeEnd - closeTag.length);

  return {
    content: content.trim(),
    start,
    end: closeEnd,
    attrs,
  };
}

// ============================================================
// 主解析函数
// ============================================================

/**
 * 解析 .lyt 单文件组件内容
 *
 * @param source  .lyt 文件内容
 * @param filename 文件名（用于错误信息和调试）
 * @returns SFC 描述符
 *
 * @example
 *   const descriptor = parseSFC(`
 *     <template>
 *       <div class="app">{{ message }}</div>
 *     </template>
 *     <script>
 *       export default {
 *         data() { return { message: 'hello' } }
 *       }
 *     </script>
 *     <style scoped>
 *       .app { color: red; }
 *     </style>
 *   `, 'App.lyt')
 */
export function parseSFC(source: string, filename = 'anonymous.lyt'): SFCDescriptor {
  // 移除 HTML 注释
  const cleaned = source.replace(COMMENT_RE, '');

  // 提取 template 块
  const templateBlock = extractBlock(cleaned, TEMPLATE_OPEN_RE, '</template>');
  const template: SFCBlock | null = templateBlock
    ? {
      type: 'template',
      content: templateBlock.content,
      start: templateBlock.start,
      end: templateBlock.end,
      attrs: templateBlock.attrs,
    }
    : null;

  // 提取 script 块
  const scriptBlock = extractBlock(cleaned, SCRIPT_OPEN_RE, '</script>');
  const script: SFCBlock | null = scriptBlock
    ? {
      type: 'script',
      content: scriptBlock.content,
      start: scriptBlock.start,
      end: scriptBlock.end,
      attrs: scriptBlock.attrs,
    }
    : null;

  // 提取所有 style 块
  const styles: SFCStyleBlock[] = [];
  let searchSource = cleaned;
  STYLE_OPEN_RE.lastIndex = 0;

   
  while (true) {
    const styleBlock = extractBlock(searchSource, STYLE_OPEN_RE, '</style>');
    if (!styleBlock) break;

    styles.push({
      type: 'style',
      content: styleBlock.content,
      start: styleBlock.start,
      end: styleBlock.end,
      attrs: styleBlock.attrs,
      scoped: 'scoped' in styleBlock.attrs,
    });

    // 从已提取块之后继续搜索
    searchSource = searchSource.slice(styleBlock.end);
  }

  return {
    filename,
    template,
    script,
    styles,
  };
}

/**
 * 从 script 块中提取 export default 的内容
 *
 * @param scriptContent script 块内容
 * @returns export default 对象的内容字符串，未找到返回 null
 *
 * @example
 *   extractExportDefault('export default { data() { return {} } }')
 *   // → ' data() { return {} } '
 */
export function extractExportDefault(scriptContent: string): string | null {
  EXPORT_DEFAULT_RE.lastIndex = 0;
  const match = EXPORT_DEFAULT_RE.exec(scriptContent);
  return match ? match[1].trim() : null;
}
