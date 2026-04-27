/**
 * miniapp-compiler.ts - 小程序编译器
 *
 * 将 Lyt.js 模板编译为小程序模板（WXML / AXML / TTML）。
 * 支持模板语法转换、事件绑定转换、双向绑定转换、插槽转换、
 * 组件引用转换、样式提取和脚本提取。
 * 纯原生零依赖 TypeScript 实现。
 */

import type { MiniAppPlatform } from './miniapp-renderer';
import { generatePageJson, generateComponentJson, normalizeProps, escapeHtml } from './miniapp-utils';
import { MINIAPP_COMPONENT_MAP } from './shared-constants';

/* ================================================================
 *  类型定义
 * ================================================================ */

/**
 * 编译结果
 */
export interface MiniAppCompileResult {
  /** 转换后的模板字符串 */
  template: string;
  /** 提取的样式内容 */
  style: string;
  /** 提取的脚本内容 */
  script: string;
  /** 从脚本中提取的数据对象 */
  data: Record<string, any>;
}

/**
 * 页面配置
 */
export interface MiniAppPageConfig {
  /** Lyt.js 模板字符串 */
  template: string;
  /** 页面初始数据 */
  data?: Record<string, any>;
  /** 页面方法 */
  methods?: Record<string, Function>;
  /** 页面加载回调 */
  onLoad?: (...args: any[]) => void;
  /** 页面显示回调 */
  onShow?: (...args: any[]) => void;
  /** 页面初次渲染完成回调 */
  onReady?: (...args: any[]) => void;
}

/**
 * 页面编译输出
 */
export interface MiniAppPageOutput {
  /** WXML 模板文件内容 */
  wxml: string;
  /** WXSS 样式文件内容 */
  wxss: string;
  /** JS 逻辑文件内容 */
  js: string;
  /** JSON 配置文件内容 */
  json: string;
}

/**
 * 组件配置
 */
export interface MiniAppComponentConfig {
  /** Lyt.js 模板字符串 */
  template: string;
  /** 组件属性定义 */
  props?: string[] | Record<string, any>;
  /** 组件内部数据 */
  data?: Record<string, any>;
  /** 组件方法 */
  methods?: Record<string, Function>;
}

/**
 * 组件编译输出
 */
export interface MiniAppComponentOutput {
  /** WXML 模板文件内容 */
  wxml: string;
  /** WXSS 样式文件内容 */
  wxss: string;
  /** JS 逻辑文件内容 */
  js: string;
  /** JSON 配置文件内容 */
  json: string;
}

/* ================================================================
 *  平台前缀配置
 * ================================================================ */

/**
 * 各平台模板语法前缀
 */
const PLATFORM_PREFIX_MAP: Record<MiniAppPlatform, {
  if: string;
  elif: string;
  else: string;
  for: string;
  forItem: string;
  forKey: string;
  bind: string;
  catch: string;
  model: string;
  slot: string;
}> = {
  wechat: {
    if: 'wx:if',
    elif: 'wx:elif',
    else: 'wx:else',
    for: 'wx:for',
    forItem: 'wx:for-item',
    forKey: 'wx:key',
    bind: 'bind',
    catch: 'catch',
    model: 'model',
    slot: 'slot',
  },
  alipay: {
    if: 'a:if',
    elif: 'a:elif',
    else: 'a:else',
    for: 'a:for',
    forItem: 'a:for-item',
    forKey: 'a:key',
    bind: 'on',
    catch: 'catchEvent',
    model: 'model',
    slot: 'slot',
  },
  bytedance: {
    if: 'tt:if',
    elif: 'tt:elif',
    else: 'tt:else',
    for: 'tt:for',
    forItem: 'tt:for-item',
    forKey: 'tt:key',
    bind: 'bind',
    catch: 'catch',
    model: 'model',
    slot: 'slot',
  },
};

/* ================================================================
 *  事件名映射
 * ================================================================ */

const EVENT_MAP: Record<string, string> = {
  'click': 'tap',
  'dblclick': 'tap',
  'input': 'input',
  'change': 'change',
  'submit': 'submit',
  'focus': 'focus',
  'blur': 'blur',
  'touchstart': 'touchstart',
  'touchend': 'touchend',
  'touchmove': 'touchmove',
  'scroll': 'scroll',
  'longpress': 'longpress',
  'keydown': 'confirm',
  'keyup': 'confirm',
  'keypress': 'confirm',
};

/* ================================================================
 *  MiniAppCompiler 实现
 * ================================================================ */

/**
 * MiniAppCompiler - 小程序编译器
 *
 * 将 Lyt.js 模板语法编译为小程序模板语法。
 * 支持微信、支付宝、字节跳动三个平台。
 *
 * 使用示例：
 * ```ts
 * const compiler = new MiniAppCompiler();
 *
 * // 编译模板
 * const result = compiler.compile(
 *   '<div lyt:if="show" @click="handleClick">{{ message }}</div>',
 *   'wechat'
 * );
 * console.log(result.template);
 * // => '<view wx:if="{{show}}" bindtap="handleClick">{{message}}</view>'
 *
 * // 编译页面
 * const page = compiler.compilePage({
 *   template: '<view>{{title}}</view>',
 *   data: { title: 'Hello' },
 *   methods: { handleClick() { console.log('clicked'); } }
 * }, 'wechat');
 * ```
 */
export class MiniAppCompiler {
  /* --------------------------------------------------
   *  公共 API
   * -------------------------------------------------- */

  /**
   * 编译模板
   *
   * 将 Lyt.js 模板字符串编译为小程序模板字符串。
   * 同时提取 <style> 和 <script> 标签内容。
   *
   * @param template Lyt.js 模板字符串
   * @param platform 目标小程序平台
   * @returns 编译结果（模板、样式、脚本、数据）
   */
  compile(template: string, platform: MiniAppPlatform): MiniAppCompileResult {
    // 1. 提取 style 和 script 标签
    const { template: cleanTemplate, style, script } = this._extractTags(template);

    // 2. 从 script 中提取 data
    const data = this._extractData(script);

    // 3. 转换模板语法
    const compiledTemplate = this._transformTemplate(cleanTemplate, platform);

    return {
      template: compiledTemplate,
      style,
      script,
      data,
    };
  }

  /**
   * 编译页面
   *
   * 将页面配置编译为小程序页面文件（wxml / wxss / js / json）。
   *
   * @param page 页面配置
   * @param platform 目标小程序平台
   * @returns 页面编译输出
   */
  compilePage(page: MiniAppPageConfig, platform: MiniAppPlatform): MiniAppPageOutput {
    // 编译模板
    const compileResult = this.compile(page.template, platform);

    // 合并 data
    const mergedData = {
      ...compileResult.data,
      ...(page.data || {}),
    };

    // 合并 methods
    const mergedMethods = {
      ...(page.methods || {}),
    };

    // 生成页面 JS
    const js = this._generatePageJs(mergedData, mergedMethods, page, platform);

    // 生成页面 JSON
    const json = generatePageJson({});

    return {
      wxml: compileResult.template,
      wxss: compileResult.style,
      js,
      json,
    };
  }

  /**
   * 编译组件
   *
   * 将组件配置编译为小程序组件文件（wxml / wxss / js / json）。
   *
   * @param component 组件配置
   * @param platform 目标小程序平台
   * @returns 组件编译输出
   */
  compileComponent(component: MiniAppComponentConfig, platform: MiniAppPlatform): MiniAppComponentOutput {
    // 编译模板
    const compileResult = this.compile(component.template, platform);

    // 合并 data
    const mergedData = {
      ...compileResult.data,
      ...(component.data || {}),
    };

    // 合并 methods
    const mergedMethods = {
      ...(component.methods || {}),
    };

    // 规范化 props
    let propertiesDef: Record<string, any> = {};
    let observersDef: string[] = [];

    if (component.props) {
      if (Array.isArray(component.props)) {
        // 简写形式：props: ['title', 'count']
        for (const propName of component.props) {
          propertiesDef[propName] = { type: null };
        }
      } else {
        // 对象形式
        const normalized = normalizeProps(component.props);
        propertiesDef = normalized.properties;
        observersDef = normalized.observers;
      }
    }

    // 生成组件 JS
    const js = this._generateComponentJs(
      propertiesDef,
      mergedData,
      mergedMethods,
      observersDef,
      platform
    );

    // 生成组件 JSON
    const json = generateComponentJson({ component: true });

    return {
      wxml: compileResult.template,
      wxss: compileResult.style,
      js,
      json,
    };
  }

  /* --------------------------------------------------
   *  模板语法转换
   * -------------------------------------------------- */

  /**
   * 转换模板语法
   *
   * 处理以下转换：
   * - 标签名映射（div -> view 等）
   * - 条件渲染指令（lyt:if / lyt:else -> wx:if / wx:else 等）
   * - 列表渲染指令（lyt:each -> wx:for 等）
   * - 事件绑定（@click -> bindtap 等）
   * - 双向绑定（:value -> model:value 等）
   * - 插槽（slot -> slot/name="xxx"）
   * - 组件引用（ref -> id）
   * - 显示/隐藏（lyt:show -> hidden）
   * - 插值表达式（{{ expr }}）
   */
  private _transformTemplate(template: string, platform: MiniAppPlatform): string {
    const prefix = PLATFORM_PREFIX_MAP[platform];

    let result = template;

    // 1. 转换标签名
    result = this._transformTags(result);

    // 2. 转换条件渲染指令
    result = this._transformConditional(result, prefix);

    // 3. 转换列表渲染指令
    result = this._transformIteration(result, prefix);

    // 4. 转换事件绑定
    result = this._transformEvents(result, platform, prefix);

    // 5. 转换双向绑定
    result = this._transformModelBindings(result, prefix);

    // 6. 转换插槽
    result = this._transformSlots(result, prefix);

    // 7. 转换组件引用
    result = this._transformRefs(result);

    // 8. 转换显示/隐藏
    result = this._transformShow(result);

    // 9. 转换属性绑定（:attr -> attr="{{value}}"）
    result = this._transformAttributeBindings(result);

    // 10. 清理剩余的 lyt: 前缀指令
    result = this._cleanupLytDirectives(result);

    return result;
  }

  /**
   * 转换 HTML 标签为小程序组件标签
   */
  private _transformTags(template: string): string {
    // 匹配开标签和自闭合标签
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]*)/g;

    return template.replace(tagRegex, (match, tagName: string) => {
      const lowerTag = tagName.toLowerCase();
      const miniTag = MINIAPP_COMPONENT_MAP[lowerTag];
      if (miniTag) {
        return match.replace(tagName, miniTag);
      }
      return match;
    });
  }

  /**
   * 转换条件渲染指令
   *
   * lyt:if="condition" -> wx:if="{{condition}}"
   * lyt:elif="condition" -> wx:elif="{{condition}}"
   * lyt:else -> wx:else
   * v-if="condition" -> wx:if="{{condition}}"
   * v-else-if="condition" -> wx:elif="{{condition}}"
   * v-else -> wx:else
   */
  private _transformConditional(template: string, prefix: { if: string; elif: string; else: string }): string {
    // lyt:if="expr" -> prefix.if="{{expr}}"
    let result = template.replace(
      /lyt:if="([^"]*)"/g,
      (_, expr) => `${prefix.if}="{{${expr}}}"`
    );

    // v-if="expr" -> prefix.if="{{expr}}"
    result = result.replace(
      /v-if="([^"]*)"/g,
      (_, expr) => `${prefix.if}="{{${expr}}}"`
    );

    // lyt:elif="expr" -> prefix.elif="{{expr}}"
    result = result.replace(
      /lyt:elif="([^"]*)"/g,
      (_, expr) => `${prefix.elif}="{{${expr}}}"`
    );

    // v-else-if="expr" -> prefix.elif="{{expr}}"
    result = result.replace(
      /v-else-if="([^"]*)"/g,
      (_, expr) => `${prefix.elif}="{{${expr}}}"`
    );

    // lyt:else -> prefix.else
    result = result.replace(
      /\blyt:else\b/g,
      prefix.else
    );

    // v-else -> prefix.else
    result = result.replace(
      /\bv-else\b/g,
      prefix.else
    );

    return result;
  }

  /**
   * 转换列表渲染指令
   *
   * lyt:each="item in list" -> wx:for="{{list}}" wx:for-item="item" wx:key="item"
   * lyt:each="(item, index) in list" -> wx:for="{{list}}" wx:for-item="item" wx:for-index="index" wx:key="item"
   * v-for="item in list" -> wx:for="{{list}}" wx:for-item="item" wx:key="item"
   */
  private _transformIteration(template: string, prefix: {
    for: string; forItem: string; forKey: string;
  }): string {
    const transformForExpr = (expr: string): string => {
      // 匹配 "(item, index) in list" 或 "item in list"
      const match = expr.match(/(?:\((\w+),\s*(\w+)\)|(\w+))\s+in\s+(.+)/);
      if (match) {
        const item = match[1] || match[3];
        const index = match[2];
        const dataSource = match[4].trim();

        let result = `${prefix.for}="{{${dataSource}}}" ${prefix.forItem}="${item}" ${prefix.forKey}="${item}"`;
        if (index) {
          result += ` ${prefix.forIndex}="${index}"`;
        }
        return result;
      }
      // 简写形式：直接是数据源
      return `${prefix.for}="{{${expr.trim()}}}"`;
    };

    // lyt:each="expr"
    let result = template.replace(
      /lyt:each="([^"]*)"/g,
      (_, expr) => transformForExpr(expr)
    );

    // v-for="expr"
    result = result.replace(
      /v-for="([^"]*)"/g,
      (_, expr) => transformForExpr(expr)
    );

    return result;
  }

  /**
   * 转换事件绑定
   *
   * @click="handler" -> bindtap="handler"（微信/字节）
   * @click="handler" -> onTap="handler"（支付宝）
   * @click.stop="handler" -> catchtap="handler"（阻止冒泡）
   * @click.capture="handler" -> capture-bind:tap="handler"（捕获阶段）
   */
  private _transformEvents(template: string, platform: MiniAppPlatform, prefix: {
    bind: string; catch: string;
  }): string {
    // 匹配 @event 或 @event.modifier
    const eventRegex = /@(\w+)(?:\.(\w+))*="([^"]*)"/g;

    return template.replace(eventRegex, (match, eventName: string, modifier: string | undefined, handler: string) => {
      const miniEvent = EVENT_MAP[eventName.toLowerCase()] || eventName.toLowerCase();

      // 阻止冒泡修饰符
      if (modifier === 'stop' || modifier === 'prevent') {
        if (platform === 'alipay') {
          // 支付宝使用 catchEvent
          return `catchEvent${this._capitalize(miniEvent)}="${handler}"`;
        }
        return `${prefix.catch}${miniEvent}="${handler}"`;
      }

      // 捕获阶段修饰符
      if (modifier === 'capture') {
        return `capture-bind:${miniEvent}="${handler}"`;
      }

      // 普通事件绑定
      if (platform === 'alipay') {
        // 支付宝使用 onXxx 形式
        return `on${this._capitalize(miniEvent)}="${handler}"`;
      }

      return `${prefix.bind}${miniEvent}="${handler}"`;
    });
  }

  /**
   * 转换双向绑定
   *
   * :value="data" -> model:value="{{data}}"
   * v-model="data" -> model:value="{{data}}"
   */
  private _transformModelBindings(template: string, prefix: { model: string }): string {
    // :value="expr" -> model:value="{{expr}}"
    let result = template.replace(
      /:value="([^"]*)"/g,
      (_, expr) => `${prefix.model}:value="{{${expr}}}"`
    );

    // v-model="expr" -> model:value="{{expr}}"
    result = result.replace(
      /v-model="([^"]*)"/g,
      (_, expr) => `${prefix.model}:value="{{${expr}}}"`
    );

    // :checked="expr" -> model:checked="{{expr}}"
    result = result.replace(
      /:checked="([^"]*)"/g,
      (_, expr) => `${prefix.model}:checked="{{${expr}}}"`
    );

    return result;
  }

  /**
   * 转换插槽
   *
   * <slot> -> <slot></slot>
   * <slot name="header"> -> <slot name="header"></slot>
   * <slot name="header">default content</slot> -> <slot name="header">default content</slot>
   */
  private _transformSlots(template: string, prefix: { slot: string }): string {
    // <slot name="xxx"> -> <slot name="xxx">
    // <slot> -> <slot>
    // 已经是标准小程序语法，保持不变
    return template;
  }

  /**
   * 转换组件引用
   *
   * ref="myRef" -> id="myRef"
   */
  private _transformRefs(template: string): string {
    return template.replace(
      /\bref="([^"]*)"/g,
      'id="$1"'
    );
  }

  /**
   * 转换显示/隐藏
   *
   * lyt:show="condition" -> hidden="{{!condition}}"
   * v-show="condition" -> hidden="{{!condition}}"
   */
  private _transformShow(template: string): string {
    // lyt:show="expr" -> hidden="{{!expr}}"
    let result = template.replace(
      /lyt:show="([^"]*)"/g,
      (_, expr) => `hidden="{{!${expr}}}"`
    );

    // v-show="expr" -> hidden="{{!expr}}"
    result = result.replace(
      /v-show="([^"]*)"/g,
      (_, expr) => `hidden="{{!${expr}}}"`
    );

    return result;
  }

  /**
   * 转换属性绑定
   *
   * :class="expr" -> class="{{expr}}"
   * :style="expr" -> style="{{expr}}"
   * :src="expr" -> src="{{expr}}"
   * :disabled="expr" -> disabled="{{expr}}"
   * 其他 :attr="expr" -> attr="{{expr}}"
   */
  private _transformAttributeBindings(template: string): string {
    // 匹配 :attr="value" 但排除已被处理的 :value（双向绑定）
    // 注意：:value 已在 _transformModelBindings 中处理
    const attrRegex = /:([a-zA-Z][a-zA-Z0-9-]*)="([^"]*)"/g;

    return template.replace(attrRegex, (match, attrName: string, value: string) => {
      // 跳过已被双向绑定处理的属性
      if (attrName === 'value' || attrName === 'checked') {
        return match;
      }

      // class 和 style 特殊处理（小程序中 class/style 可以直接绑定对象或字符串）
      return `${attrName}="{{${value}}}"`;
    });
  }

  /**
   * 清理剩余的 lyt: 前缀指令
   *
   * 移除所有未被处理的 lyt:xxx 指令属性。
   */
  private _cleanupLytDirectives(template: string): string {
    return template.replace(
      /\s*lyt:[a-zA-Z-]+(?:="[^"]*")?/g,
      ''
    );
  }

  /* --------------------------------------------------
   *  标签提取
   * -------------------------------------------------- */

  /**
   * 从模板中提取 <style> 和 <script> 标签内容
   *
   * @param template 原始模板字符串
   * @returns 清理后的模板、样式内容、脚本内容
   */
  private _extractTags(template: string): {
    template: string;
    style: string;
    script: string;
  } {
    let cleanTemplate = template;
    let style = '';
    let script = '';

    // 提取 <style> 标签内容
    const styleMatch = template.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (styleMatch) {
      style = styleMatch[1].trim();
      cleanTemplate = cleanTemplate.replace(styleMatch[0], '');
    }

    // 提取 <script> 标签内容
    const scriptMatch = template.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
      script = scriptMatch[1].trim();
      cleanTemplate = cleanTemplate.replace(scriptMatch[0], '');
    }

    // 清理多余空白
    cleanTemplate = cleanTemplate.trim();

    return { template: cleanTemplate, style, script };
  }

  /**
   * 从脚本内容中提取 data 对象
   *
   * 支持以下格式：
   * - data: { key: value }
   * - data() { return { key: value } }
   * - const data = { key: value }
   * - export default { data() { ... } }
   */
  private _extractData(script: string): Record<string, any> {
    const data: Record<string, any> = {};

    if (!script) return data;

    // 尝试匹配 data: { ... } 格式
    const dataPropMatch = script.match(/data\s*:\s*(\{[\s\S]*?\})(?:\s*[,}])/);
    if (dataPropMatch) {
      try {
        // 简单解析：提取键值对
        const dataStr = dataPropMatch[1];
        this._parseSimpleObject(dataStr, data);
      } catch (e) {
        console.warn('[Lyt MiniApp Compiler] 解析 data 对象失败:', e instanceof Error ? e.message : e)
      }
    }

    // 尝试匹配 data() { return { ... } } 格式
    const dataFuncMatch = script.match(/data\s*\(\s*\)\s*\{[\s\S]*?return\s*(\{[\s\S]*?\})\s*;?\s*\}/);
    if (dataFuncMatch) {
      try {
        const dataStr = dataFuncMatch[1];
        this._parseSimpleObject(dataStr, data);
      } catch (e) {
        console.warn('[Lyt MiniApp Compiler] 解析 data() 函数返回值失败:', e instanceof Error ? e.message : e)
      }
    }

    return data;
  }

  /**
   * 简单对象解析器
   *
   * 解析简单的 JavaScript 对象字面量，提取键值对。
   * 仅支持字符串、数字、布尔值和简单表达式。
   */
  private _parseSimpleObject(str: string, target: Record<string, any>): void {
    // 移除首尾大括号
    const inner = str.replace(/^\s*\{/, '').replace(/\}\s*$/, '').trim();

    if (!inner) return;

    // 按行分割，提取键值对
    const lines = inner.split(/\n|,/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 匹配 key: value 格式
      const kvMatch = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1];
        const valueStr = kvMatch[2].trim().replace(/[,;]\s*$/, '');

        // 解析值
        if (valueStr === 'true') {
          target[key] = true;
        } else if (valueStr === 'false') {
          target[key] = false;
        } else if (valueStr === 'null') {
          target[key] = null;
        } else if (valueStr === 'undefined') {
          target[key] = undefined;
        } else if (/^'[^']*'$/.test(valueStr) || /^"[^"]*"$/.test(valueStr)) {
          target[key] = valueStr.slice(1, -1);
        } else if (/^-?\d+$/.test(valueStr)) {
          target[key] = parseInt(valueStr, 10);
        } else if (/^-?\d+\.\d+$/.test(valueStr)) {
          target[key] = parseFloat(valueStr);
        } else if (/^\[/.test(valueStr)) {
          target[key] = valueStr; // 保持原样，无法简单解析
        } else if (/^\{/.test(valueStr)) {
          target[key] = valueStr; // 保持原样
        } else {
          target[key] = valueStr;
        }
      }
    }
  }

  /* --------------------------------------------------
   *  JS 代码生成
   * -------------------------------------------------- */

  /**
   * 生成页面 JS 代码
   */
  private _generatePageJs(
    data: Record<string, any>,
    methods: Record<string, Function>,
    page: MiniAppPageConfig,
    platform: MiniAppPlatform
  ): string {
    const lines: string[] = [];

    lines.push('// Auto-generated by MiniAppCompiler');
    lines.push(`// Platform: ${platform}`);
    lines.push('');

    // 生成 data 部分
    lines.push('Page({');
    lines.push('  data: ' + JSON.stringify(data, null, 4).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n') + ',');

    // 生成生命周期钩子
    if (page.onLoad) {
      lines.push('');
      lines.push('  onLoad(options) {');
      lines.push('    // Lyt.js onBeforeMount -> onLoad');
      lines.push('  },');
    }

    if (page.onShow) {
      lines.push('');
      lines.push('  onShow() {');
      lines.push('    // Lyt.js onShow');
      lines.push('  },');
    }

    if (page.onReady) {
      lines.push('');
      lines.push('  onReady() {');
      lines.push('    // Lyt.js onMounted -> onReady');
      lines.push('  },');
    }

    // 生成方法
    const methodEntries = Object.entries(methods);
    if (methodEntries.length > 0) {
      lines.push('');
      for (const [methodName, methodFn] of methodEntries) {
        const fnStr = methodFn.toString();
        // 提取函数体
        const bodyMatch = fnStr.match(/(?:function\s*\w*\s*\(|=>\s*\{?\s*)([\s\S]*)/);
        const body = bodyMatch ? bodyMatch[1].trim().replace(/^\{|\}$/g, '').trim() : '';
        lines.push(`  ${methodName}(${this._extractParamNames(fnStr).join(', ')}) {`);
        if (body) {
          for (const bodyLine of body.split('\n')) {
            lines.push(`    ${bodyLine}`);
          }
        }
        lines.push('  },');
      }
    }

    lines.push('});');

    return lines.join('\n');
  }

  /**
   * 生成组件 JS 代码
   */
  private _generateComponentJs(
    properties: Record<string, any>,
    data: Record<string, any>,
    methods: Record<string, Function>,
    observers: string[],
    platform: MiniAppPlatform
  ): string {
    const lines: string[] = [];

    lines.push('// Auto-generated by MiniAppCompiler');
    lines.push(`// Platform: ${platform}`);
    lines.push('');

    lines.push('Component({');

    // 生成 properties
    if (Object.keys(properties).length > 0) {
      lines.push('  properties: ' + JSON.stringify(properties, null, 4).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n') + ',');
    }

    // 生成 data
    lines.push('  data: ' + JSON.stringify(data, null, 4).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n') + ',');

    // 生成 observers
    if (observers.length > 0) {
      lines.push('');
      lines.push('  observers: {');
      for (const observer of observers) {
        lines.push(`    ${observer},`);
      }
      lines.push('  },');
    }

    // 生成生命周期
    lines.push('');
    lines.push('  lifetimes: {');
    lines.push('    attached() {');
    lines.push('      // Lyt.js setup -> attached');
    lines.push('    },');
    lines.push('    ready() {');
    lines.push('      // Lyt.js onMounted -> ready');
    lines.push('    },');
    lines.push('    detached() {');
    lines.push('      // Lyt.js onUnmounted -> detached');
    lines.push('    },');
    lines.push('  },');

    // 生成方法
    const methodEntries = Object.entries(methods);
    if (methodEntries.length > 0) {
      lines.push('');
      lines.push('  methods: {');
      for (const [methodName, methodFn] of methodEntries) {
        const fnStr = methodFn.toString();
        const bodyMatch = fnStr.match(/(?:function\s*\w*\s*\(|=>\s*\{?\s*)([\s\S]*)/);
        const body = bodyMatch ? bodyMatch[1].trim().replace(/^\{|\}$/g, '').trim() : '';
        lines.push(`    ${methodName}(${this._extractParamNames(fnStr).join(', ')}) {`);
        if (body) {
          for (const bodyLine of body.split('\n')) {
            lines.push(`      ${bodyLine}`);
          }
        }
        lines.push('    },');
      }
      lines.push('  },');
    }

    lines.push('});');

    return lines.join('\n');
  }

  /* --------------------------------------------------
   *  辅助方法
   * -------------------------------------------------- */

  /**
   * 首字母大写
   */
  private _capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * 从函数字符串中提取参数名
   */
  private _extractParamNames(fnStr: string): string[] {
    const match = fnStr.match(/(?:function\s*\w*\s*|\w+\s*=>\s*(?:\([^)]*\)|([^)]*)))\s*\(?([^)]*)\)?/);
    if (match && match[2]) {
      return match[2].split(',').map(p => p.trim()).filter(Boolean);
    }

    // 尝试箭头函数匹配
    const arrowMatch = fnStr.match(/\(([^)]*)\)\s*=>/);
    if (arrowMatch) {
      return arrowMatch[1].split(',').map(p => p.trim()).filter(Boolean);
    }

    // 单参数箭头函数
    const singleArrowMatch = fnStr.match(/(\w+)\s*=>/);
    if (singleArrowMatch) {
      return [singleArrowMatch[1].trim()];
    }

    return [];
  }
}
