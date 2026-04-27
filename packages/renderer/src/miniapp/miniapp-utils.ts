/**
 * miniapp-utils.ts - 小程序工具函数集
 *
 * 提供小程序开发中常用的工具函数，包括命名转换、样式处理、
 * JSON 配置生成、属性规范化、WXS 模块包装等。
 * 纯原生零依赖 TypeScript 实现。
 */

/* ================================================================
 *  命名转换
 * ================================================================ */

/**
 * 驼峰命名转短横线命名
 *
 * @example
 * camelToKebab('fontSize') // => 'font-size'
 * camelToKebab('backgroundColor') // => 'background-color'
 * camelToKebab('borderTopWidth') // => 'border-top-width'
 *
 * @param str 驼峰命名字符串
 * @returns 短横线命名字符串
 */
export function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * 短横线命名转驼峰命名
 *
 * @example
 * kebabToCamel('font-size') // => 'fontSize'
 * kebabToCamel('background-color') // => 'backgroundColor'
 * kebabToCamel('border-top-width') // => 'borderTopWidth'
 *
 * @param str 短横线命名字符串
 * @returns 驼峰命名字符串
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

/* ================================================================
 *  样式处理
 * ================================================================ */

/**
 * 样式对象转 CSS 字符串
 *
 * 将 JavaScript 样式对象（驼峰命名）转换为 CSS 内联样式字符串（短横线命名）。
 *
 * @example
 * parseStyleObject({ fontSize: '14px', color: 'red' })
 * // => 'font-size: 14px; color: red'
 *
 * @param style 样式对象
 * @returns CSS 样式字符串
 */
export function parseStyleObject(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([key, val]) => {
      const cssKey = camelToKebab(key);
      return `${cssKey}: ${val}`;
    })
    .join('; ');
}

/**
 * 类对象/字符串转类名字符串
 *
 * 支持以下输入格式：
 * - 字符串：直接返回
 * - 对象：将值为 true 的键名拼接为类名字符串
 *
 * @example
 * parseClassObject('active bold') // => 'active bold'
 * parseClassObject({ active: true, disabled: false, bold: true })
 * // => 'active bold'
 *
 * @param cls 类对象或字符串
 * @returns 类名字符串
 */
export function parseClassObject(cls: Record<string, boolean> | string): string {
  if (typeof cls === 'string') {
    return cls;
  }

  if (typeof cls === 'object' && cls !== null) {
    return Object.entries(cls)
      .filter(([, value]) => Boolean(value))
      .map(([name]) => name)
      .join(' ');
  }

  return '';
}

/* ================================================================
 *  JSON 配置生成
 * ================================================================ */

/**
 * 页面 JSON 配置项
 */
export interface PageJsonConfig {
  /** 导航栏标题文字 */
  navigationBarTitleText?: string;
  /** 引用的自定义组件 */
  usingComponents?: Record<string, string>;
  /** 是否开启下拉刷新 */
  enablePullDownRefresh?: boolean;
  /** 下拉刷新窗口的背景色 */
  backgroundColor?: string;
  /** 下拉刷新 loading 的样式 */
  backgroundTextStyle?: 'dark' | 'light';
  /** 导航栏背景颜色 */
  navigationBarBackgroundColor?: string;
  /** 导航栏标题颜色 */
  navigationBarTextStyle?: 'white' | 'black';
}

/**
 * 组件 JSON 配置项
 */
export interface ComponentJsonConfig {
  /** 是否为自定义组件（默认 true） */
  component?: boolean;
  /** 引用的自定义组件 */
  usingComponents?: Record<string, string>;
}

/**
 * 生成页面 JSON 配置字符串
 *
 * @example
 * generatePageJson({
 *   navigationBarTitleText: '首页',
 *   enablePullDownRefresh: true,
 *   usingComponents: { 'my-comp': '/components/my-comp/index' }
 * })
 * // => '{\n  "navigationBarTitleText": "首页",\n  ...}'
 *
 * @param config 页面配置项
 * @returns 格式化的 JSON 字符串
 */
export function generatePageJson(config: PageJsonConfig): string {
  const json: Record<string, any> = {};

  if (config.navigationBarTitleText !== undefined) {
    json.navigationBarTitleText = config.navigationBarTitleText;
  }
  if (config.enablePullDownRefresh !== undefined) {
    json.enablePullDownRefresh = config.enablePullDownRefresh;
  }
  if (config.backgroundColor !== undefined) {
    json.backgroundColor = config.backgroundColor;
  }
  if (config.backgroundTextStyle !== undefined) {
    json.backgroundTextStyle = config.backgroundTextStyle;
  }
  if (config.navigationBarBackgroundColor !== undefined) {
    json.navigationBarBackgroundColor = config.navigationBarBackgroundColor;
  }
  if (config.navigationBarTextStyle !== undefined) {
    json.navigationBarTextStyle = config.navigationBarTextStyle;
  }
  if (config.usingComponents && Object.keys(config.usingComponents).length > 0) {
    json.usingComponents = config.usingComponents;
  }

  return JSON.stringify(json, null, 2);
}

/**
 * 生成组件 JSON 配置字符串
 *
 * @example
 * generateComponentJson({
 *   component: true,
 *   usingComponents: { 'child': '/components/child/index' }
 * })
 * // => '{\n  "component": true,\n  ...}'
 *
 * @param config 组件配置项
 * @returns 格式化的 JSON 字符串
 */
export function generateComponentJson(config: ComponentJsonConfig): string {
  const json: Record<string, any> = {
    component: config.component !== false,
  };

  if (config.usingComponents && Object.keys(config.usingComponents).length > 0) {
    json.usingComponents = config.usingComponents;
  }

  return JSON.stringify(json, null, 2);
}

/* ================================================================
 *  属性规范化
 * ================================================================ */

/**
 * 规范化属性定义结果
 */
export interface NormalizedProps {
  /** 小程序 properties 定义 */
  properties: Record<string, any>;
  /** observers 观察器列表 */
  observers: string[];
}

/**
 * 规范化属性定义
 *
 * 将 Lyt.js 风格的 props 定义转换为小程序 Component 的 properties 格式。
 * 对于带有 observer 的属性，会额外生成 observers 观察器代码。
 *
 * @example
 * normalizeProps({
 *   title: { type: String, default: 'Hello' },
 *   count: { type: Number, observer: 'onCountChange' }
 * })
 * // => {
 * //   properties: {
 * //     title: { type: String, value: 'Hello' },
 * //     count: { type: Number }
 * //   },
 * //   observers: ['count: function(count) { this.onCountChange(count); }']
 * // }
 *
 * @param props 属性定义对象
 * @returns 规范化后的 properties 和 observers
 */
export function normalizeProps(props: Record<string, any>): NormalizedProps {
  const properties: Record<string, any> = {};
  const observers: string[] = [];

  for (const [propName, propDef] of Object.entries(props)) {
    if (typeof propDef === 'function') {
      // 简写形式：propName: String
      properties[propName] = { type: propDef.name };
    } else if (typeof propDef === 'object' && propDef !== null) {
      const propEntry: Record<string, any> = {};

      if (propDef.type !== undefined) {
        propEntry.type = propDef.type;
      }
      if (propDef.default !== undefined) {
        // 小程序使用 value 而非 default
        propEntry.value = propDef.default;
      }
      if (propDef.value !== undefined) {
        propEntry.value = propDef.value;
      }
      if (propDef.optional !== undefined) {
        propEntry.optionalTypes = propDef.optional;
      }

      properties[propName] = propEntry;

      // 提取 observer
      if (propDef.observer) {
        const observerName = typeof propDef.observer === 'string'
          ? propDef.observer
          : `_${propName}Observer`;

        observers.push(
          `${propName}: function(${propName}) { this.${observerName}(${propName}); }`
        );
      }
    } else {
      // 基本类型值，默认为 String 类型
      properties[propName] = { type: String, value: propDef };
    }
  }

  return { properties, observers };
}

/* ================================================================
 *  WXS 模块
 * ================================================================ */

/**
 * 创建 WXS 模块包装
 *
 * 将 JavaScript 代码包装为 WXS 模块格式。
 * WXS (WeiXin Script) 是微信小程序中运行在渲染层的脚本语言，
 * 语法类似 JavaScript 但有部分限制。
 *
 * @example
 * createWxsModule('function add(a, b) { return a + b; }')
 * // => 'module.exports = {\n  add: add\n};\n// Original code:\nfunction add(a, b) { return a + b; }'
 *
 * @param code JavaScript 代码
 * @returns WXS 模块包装后的代码
 */
export function createWxsModule(code: string): string {
  // 提取所有顶层函数声明
  const functionNames: string[] = [];
  const funcRegex = /function\s+(\w+)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = funcRegex.exec(code)) !== null) {
    functionNames.push(match[1]);
  }

  // 提取所有顶层变量声明（const/let/var）
  const varNames: string[] = [];
  const varRegex = /(?:const|let|var)\s+(\w+)\s*=/g;

  while ((match = varRegex.exec(code)) !== null) {
    varNames.push(match[1]);
  }

  // 构建导出对象
  const exports: string[] = [];
  for (const name of functionNames) {
    exports.push(`  ${name}: ${name}`);
  }
  for (const name of varNames) {
    exports.push(`  ${name}: ${name}`);
  }

  const exportsStr = exports.length > 0
    ? `module.exports = {\n${exports.join(',\n')}\n};`
    : 'module.exports = {};';

  return `${exportsStr}\n\n// Original code:\n${code}`;
}

/* ================================================================
 *  HTML 转义
 * ================================================================ */

/**
 * HTML 特殊字符转义映射
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * HTML 转义正则表达式
 */
const HTML_ESCAPE_REGEX = /[&<>"']/g;

/**
 * HTML 转义
 *
 * 将 HTML 特殊字符转换为对应的 HTML 实体。
 *
 * @example
 * escapeHtml('<div class="test">Hello & World</div>')
 * // => '&lt;div class=&quot;test&quot;&gt;Hello &amp; World&lt;/div&gt;'
 *
 * @param str 需要转义的字符串
 * @returns 转义后的字符串
 */
export function escapeHtml(str: string): string {
  return str.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] || char);
}

/* ================================================================
 *  原生组件判断
 * ================================================================ */

/**
 * 小程序原生组件标签集合
 *
 * 包含微信、支付宝、字节跳动三个平台的通用原生组件。
 */
const NATIVE_TAGS = new Set([
  // 视图容器
  'view',
  'scroll-view',
  'swiper',
  'swiper-item',
  'movable-view',
  'movable-area',
  'cover-view',
  'cover-image',

  // 基础内容
  'text',
  'rich-text',
  'progress',

  // 表单组件
  'button',
  'form',
  'input',
  'textarea',
  'checkbox',
  'checkbox-group',
  'radio',
  'radio-group',
  'switch',
  'slider',
  'picker',
  'picker-view',
  'picker-view-column',

  // 导航
  'navigator',

  // 媒体组件
  'audio',
  'image',
  'video',
  'camera',
  'live-player',
  'live-pusher',

  // 地图
  'map',

  // 画布
  'canvas',

  // 开放能力
  'ad',
  'official-account',
  'open-data',
  'web-view',

  // 微信特有
  'page-container',

  // 无障碍
  'aria-component',
]);

/**
 * 判断是否为小程序原生组件
 *
 * @example
 * isNativeTag('view') // => true
 * isNativeTag('my-component') // => false
 * isNativeTag('div') // => false
 *
 * @param tag 标签名
 * @returns 是否为小程序原生组件
 */
export function isNativeTag(tag: string): boolean {
  return NATIVE_TAGS.has(tag.toLowerCase());
}
