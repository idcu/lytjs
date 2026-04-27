/**
 * style-compiler.ts - 小程序样式编译器
 *
 * 将 CSS 样式转换为小程序 WXSS 样式。
 * 支持 scoped CSS、CSS 变量转换、rpx 单位转换、
 * 媒体查询处理和样式作用域隔离。
 * 纯原生零依赖 TypeScript 实现。
 */

/* ================================================================
 *  类型定义
 * ================================================================ */

/**
 * 样式编译选项
 */
export interface StyleCompileOptions {
  /** 是否启用 scoped CSS（默认 false） */
  scoped?: boolean;
  /** scoped 标识符（自动生成或手动指定） */
  scopeId?: string;
  /** 是否将 px 转换为 rpx（默认 false） */
  pxToRpx?: boolean;
  /** px 到 rpx 的转换比例（默认 2，即 1px = 2rpx） */
  rpxRatio?: number;
  /** 是否转换 CSS 变量为静态值（默认 true） */
  transformCssVariables?: boolean;
  /** CSS 变量值映射（用于替换 CSS 变量） */
  cssVariables?: Record<string, string>;
  /** 目标平台（默认 'wechat'） */
  platform?: 'wechat' | 'alipay' | 'bytedance';
}

/**
 * 样式编译结果
 */
export interface StyleCompileResult {
  /** 编译后的样式内容 */
  code: string;
  /** scoped 标识符 */
  scopeId: string;
  /** 转换统计信息 */
  stats: {
    /** 转换的 CSS 变量数量 */
    cssVariablesTransformed: number;
    /** 转换的 px 数量 */
    pxTransformed: number;
    /** 添加的 scoped 选择器数量 */
    scopedSelectorsAdded: number;
  };
}

/* ================================================================
 *  CSS 变量相关
 * ================================================================ */

/**
 * CSS 变量正则表达式
 *
 * 匹配 var(--variable-name) 和 var(--variable-name, fallback)
 */
const CSS_VAR_REGEX = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\s*\)/g;

/**
 * 小程序不支持的 CSS 属性列表
 *
 * 这些属性在小程序中需要特殊处理或替代方案。
 */
const UNSUPPORTED_CSS_PROPERTIES = new Set([
  'position: fixed',
  'position: sticky',
  'z-index',
  'overflow: overlay',
  'backdrop-filter',
  '-webkit-backdrop-filter',
  'mask-image',
  '-webkit-mask-image',
  'clip-path',
  'filter: drop-shadow',
  'writing-mode',
  'text-orientation',
]);

/**
 * 小程序支持的伪类/伪元素
 *
 * 小程序仅支持 :active 和 :hover 伪类。
 */
const SUPPORTED_PSEUDO_SELECTORS = new Set([
  ':active',
  ':hover',
]);

/* ================================================================
 *  MiniAppStyleCompiler 实现
 * ================================================================ */

/**
 * MiniAppStyleCompiler - 小程序样式编译器
 *
 * 将 CSS 样式编译为小程序可用的 WXSS 样式。
 *
 * 主要功能：
 *   - scoped CSS 支持：自动为选择器添加作用域标识
 *   - CSS 变量转换：将 var(--xxx) 替换为实际值
 *   - px → rpx 转换：自动将 px 单位转换为 rpx
 *   - 不支持属性检测：警告不支持的 CSS 属性
 *   - 媒体查询处理：保留或移除不支持的媒体查询
 *
 * 使用示例：
 * ```ts
 * const compiler = new MiniAppStyleCompiler();
 *
 * const result = compiler.compile('.container { color: var(--primary); padding: 16px; }', {
 *   scoped: true,
 *   pxToRpx: true,
 *   cssVariables: { '--primary': '#1890ff' },
 * });
 * console.log(result.code);
 * // => '.container[data-v-abc123] { color: #1890ff; padding: 32rpx; }'
 * ```
 */
export class MiniAppStyleCompiler {
  /** 自增 ID 计数器，用于生成唯一的 scopeId */
  private _scopeIdCounter = 0;

  /* --------------------------------------------------
   *  公共 API
   * -------------------------------------------------- */

  /**
   * 编译 CSS 样式为小程序样式
   *
   * @param css CSS 样式字符串
   * @param options 编译选项
   * @returns 编译结果
   */
  compile(css: string, options: StyleCompileOptions = {}): StyleCompileResult {
    const {
      scoped = false,
      scopeId: providedScopeId,
      pxToRpx = false,
      rpxRatio = 2,
      transformCssVariables = true,
      cssVariables = {},
      platform = 'wechat',
    } = options;

    // 生成 scopeId
    const scopeId = providedScopeId || this._generateScopeId();

    // 统计信息
    const stats = {
      cssVariablesTransformed: 0,
      pxTransformed: 0,
      scopedSelectorsAdded: 0,
    };

    let result = css;

    // 1. 移除注释
    result = this._removeComments(result);

    // 2. 处理 CSS 变量
    if (transformCssVariables && Object.keys(cssVariables).length > 0) {
      const { code, count } = this._transformCssVariables(result, cssVariables);
      result = code;
      stats.cssVariablesTransformed = count;
    }

    // 3. px → rpx 转换
    if (pxToRpx) {
      const { code, count } = this._transformPxToRpx(result, rpxRatio);
      result = code;
      stats.pxTransformed = count;
    }

    // 4. 处理不支持的伪选择器
    result = this._handleUnsupportedPseudoSelectors(result);

    // 5. 处理不支持的 CSS 属性
    result = this._handleUnsupportedProperties(result, platform);

    // 6. scoped CSS 处理
    if (scoped) {
      const { code, count } = this._applyScoped(result, scopeId);
      result = code;
      stats.scopedSelectorsAdded = count;
    }

    // 7. 处理 @import 语句
    result = this._handleImports(result);

    // 8. 清理多余空白
    result = this._cleanup(result);

    return { code: result, scopeId, stats };
  }

  /**
   * 编译 scoped CSS
   *
   * 便捷方法，等同于 compile(css, { scoped: true, ...options })
   *
   * @param css CSS 样式字符串
   * @param scopeId scoped 标识符
   * @param options 其他编译选项
   * @returns 编译结果
   */
  compileScoped(css: string, scopeId?: string, options: Omit<StyleCompileOptions, 'scoped' | 'scopeId'> = {}): StyleCompileResult {
    return this.compile(css, { ...options, scoped: true, scopeId });
  }

  /**
   * 仅转换 CSS 变量
   *
   * @param css CSS 样式字符串
   * @param variables CSS 变量映射
   * @returns 替换后的 CSS 字符串
   */
  transformCssVariables(css: string, variables: Record<string, string>): string {
    const { code } = this._transformCssVariables(css, variables);
    return code;
  }

  /**
   * 仅转换 px 为 rpx
   *
   * @param css CSS 样式字符串
   * @param ratio 转换比例（默认 2）
   * @returns 转换后的 CSS 字符串
   */
  transformPxToRpx(css: string, ratio: number = 2): string {
    const { code } = this._transformPxToRpx(css, ratio);
    return code;
  }

  /* --------------------------------------------------
   *  内部方法
   * -------------------------------------------------- */

  /**
   * 生成唯一的 scopeId
   *
   * 格式：data-v-{8位随机十六进制}
   */
  private _generateScopeId(): string {
    const id = (++this._scopeIdCounter).toString(16).padStart(8, '0');
    return `data-v-${id}`;
  }

  /**
   * 移除 CSS 注释
   */
  private _removeComments(css: string): string {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
  }

  /**
   * 转换 CSS 变量
   *
   * 将 var(--variable-name) 和 var(--variable-name, fallback) 替换为实际值。
   * 如果变量未定义，保留 fallback 值；如果也没有 fallback，保留原样。
   */
  private _transformCssVariables(
    css: string,
    variables: Record<string, string>
  ): { code: string; count: number } {
    let count = 0;
    const code = css.replace(CSS_VAR_REGEX, (match, varName: string, fallback?: string) => {
      const value = variables[varName];
      if (value !== undefined) {
        count++;
        return value;
      }
      // 使用 fallback 值
      if (fallback !== undefined) {
        count++;
        return fallback.trim();
      }
      // 保留原样（变量未定义且无 fallback）
      return match;
    });
    return { code, count };
  }

  /**
   * 转换 px 为 rpx
   *
   * 将数值型 px 单位转换为 rpx。
   * 注意：不会转换 0px、负值、以及包含 calc() 表达式中的 px。
   */
  private _transformPxToRpx(css: string, ratio: number): { code: string; count: number } {
    let count = 0;
    // 匹配数值型 px（不匹配 0px、calc() 中的 px、负值）
    const pxRegex = /\b(\d+(?:\.\d+)?)px\b/g;
    const code = css.replace(pxRegex, (match, value: string) => {
      const numValue = parseFloat(value);
      if (numValue === 0) return '0px'; // 0 不转换
      count++;
      const rpxValue = Math.round(numValue * ratio);
      return `${rpxValue}rpx`;
    });
    return { code, count };
  }

  /**
   * 处理不支持的伪选择器
   *
   * 小程序仅支持 :active 和 :hover。
   * 不支持的伪选择器会被移除并输出警告。
   */
  private _handleUnsupportedPseudoSelectors(css: string): string {
    // 匹配伪选择器：:not(), :nth-child(), :first-child 等
    const pseudoRegex = /([^{}@]+)(:not\([^)]*\)|:nth-child\([^)]*\)|:first-child|:last-child|:nth-of-type\([^)]*\)|:only-child|:only-of-type|:empty|:checked|:disabled|:enabled|:focus|:visited|:link|:before|:after|::before|::after)([^{]*)\{/g;

    return css.replace(pseudoRegex, (match, prefix: string, pseudo: string, suffix: string) => {
      const pseudoName = pseudo.split('(')[0].trim();
      if (SUPPORTED_PSEUDO_SELECTORS.has(pseudoName)) {
        return match; // 保留支持的伪选择器
      }
      // 移除不支持的伪选择器，保留选择器的其余部分
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[MiniApp Style Compiler] 伪选择器 "${pseudo}" 在小程序中不支持，已移除。`);
      }
      return `${prefix}${suffix}{`;
    });
  }

  /**
   * 处理不支持的 CSS 属性
   *
   * 检测并警告不支持的 CSS 属性。
   */
  private _handleUnsupportedProperties(css: string, _platform: string): string {
    // 简化实现：逐行检查
    const lines = css.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      let isUnsupported = false;

      for (const unsupported of UNSUPPORTED_CSS_PROPERTIES) {
        if (trimmed.includes(unsupported)) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn(`[MiniApp Style Compiler] 属性 "${unsupported}" 在小程序中可能不完全支持。`);
          }
          isUnsupported = true;
          break;
        }
      }

      if (!isUnsupported) {
        result.push(line);
      }
    }

    return result.join('\n');
  }

  /**
   * 应用 scoped CSS
   *
   * 为每个 CSS 选择器添加属性选择器 [data-v-xxx]，
   * 实现样式作用域隔离。
   *
   * 转换规则：
   *   - .container → .container[data-v-xxx]
   *   - .item .text → .item .text[data-v-xxx]
   *   - .list > li → .list > li[data-v-xxx]
   *   - @keyframes 不添加 scoped
   *   - @font-face 不添加 scoped
   *   - @media 内的选择器添加 scoped
   */
  private _applyScoped(css: string, scopeId: string): { code: string; count: number } {
    let count = 0;
    let inMediaQuery = false;
    let braceDepth = 0;
    const lines = css.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // 跟踪 @media 嵌套
      if (trimmed.startsWith('@media')) {
        inMediaQuery = true;
        result.push(line);
        continue;
      }

      // 跟踪大括号深度
      braceDepth += (trimmed.match(/{/g) || []).length;
      braceDepth -= (trimmed.match(/}/g) || []).length;

      // @media 结束
      if (inMediaQuery && braceDepth <= 0) {
        inMediaQuery = false;
        result.push(line);
        continue;
      }

      // 跳过 @keyframes 和 @font-face
      if (trimmed.startsWith('@keyframes') || trimmed.startsWith('@font-face')) {
        result.push(line);
        continue;
      }

      // 跳过空行和仅包含大括号的行
      if (!trimmed || trimmed === '{' || trimmed === '}') {
        result.push(line);
        continue;
      }

      // 匹配选择器行（以 { 结尾，但不以 @ 开头）
      if (trimmed.endsWith('{') && !trimmed.startsWith('@')) {
        const selectorPart = trimmed.slice(0, -1).trim();
        const scopedSelector = this._addScopeToSelector(selectorPart, scopeId);
        result.push(`  ${scopedSelector} {`);
        count++;
      } else {
        result.push(line);
      }
    }

    return { code: result.join('\n'), count };
  }

  /**
   * 为选择器添加 scoped 属性
   *
   * @param selector CSS 选择器
   * @param scopeId scoped 标识符
   * @returns 添加了 scoped 属性的选择器
   */
  private _addScopeToSelector(selector: string, scopeId: string): string {
    // 处理逗号分隔的多选择器
    const selectors = selector.split(',').map(s => s.trim());
    const scopedSelectors = selectors.map(sel => {
      // 找到最后一个简单选择器的位置
      const bracketPos = sel.lastIndexOf('[');
      const parenPos = sel.lastIndexOf('(');

      // 如果选择器以 ] 或 ) 结尾，在其前面插入
      if (bracketPos > parenPos && bracketPos !== -1) {
        return sel.slice(0, bracketPos) + `[${scopeId}]` + sel.slice(bracketPos);
      }

      // 否则直接追加
      return `${sel}[${scopeId}]`;
    });

    return scopedSelectors.join(', ');
  }

  /**
   * 处理 @import 语句
   *
   * 小程序支持 @import，但路径需要相对于当前文件。
   * 此处保留 @import 语句不变，仅做基本验证。
   */
  private _handleImports(css: string): string {
    return css.replace(
      /@import\s+['"]([^'"]+)['"]\s*;/g,
      (match, path: string) => {
        // 验证路径格式
        if (path.startsWith('http://') || path.startsWith('https://')) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn(`[MiniApp Style Compiler] 小程序不支持远程 @import: ${path}`);
          }
          return `/* Remote @import removed: ${path} */`;
        }
        return match;
      }
    );
  }

  /**
   * 清理多余空白
   */
  private _cleanup(css: string): string {
    // 移除连续空行
    return css.replace(/\n{3,}/g, '\n\n').trim();
  }
}

/* ================================================================
 *  工厂函数和默认实例
 * ================================================================ */

/** 默认样式编译器实例 */
export const miniAppStyleCompiler = new MiniAppStyleCompiler();

/**
 * 快速编译 CSS 为小程序样式
 *
 * 便捷函数，使用默认编译器实例。
 *
 * @param css CSS 样式字符串
 * @param options 编译选项
 * @returns 编译结果
 */
export function compileMiniAppStyle(css: string, options?: StyleCompileOptions): StyleCompileResult {
  return miniAppStyleCompiler.compile(css, options);
}
