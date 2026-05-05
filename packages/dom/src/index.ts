/**
 * @lytjs/dom - DOM 工具包
 *
 * 提供 Web Components 集成、DOM 操作增强等工具
 *
 * @module @lytjs/dom
 * @version 6.0.0
 */

// Web Components 集成
export {
  // 类型
  type WCPropertyDefinition,
  type WebComponentOptions,
  type AttributeReflectionConfig,
  type LytJSBridgeOptions,

  // 转换器
  StringConverter,
  NumberConverter,
  BooleanConverter,
  ObjectConverter,
  getConverterByType,

  // 属性反射
  AttributeReflector,

  // 增强元素
  createEnhancedElementClass,
  defineLytJSWebComponent,

  // 工具函数
  supportsWebComponents,
  whenDefined,
  isDefined,
  upgradeAll,
  camelToKebab,
  kebabToCamel,
} from './web-components';
