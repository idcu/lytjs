/**
 * Lyt.js Plugin Registry — 内置官方插件清单
 *
 * 注册所有官方插件到注册表，作为默认数据源。
 */

import type { PluginManifest } from './registry';
import { PluginRegistry } from './registry';

// ============================================================
// 官方插件清单
// ============================================================

/** 所有官方插件的元数据列表 */
export const BUILT_IN_PLUGINS: PluginManifest[] = [
  {
    name: '@lytjs/plugin-i18n',
    version: '5.0.1',
    description: '国际化插件 - 提供多语言支持、消息格式化、参数插值、复数形式和语言切换功能',
    author: 'lytjs',
    keywords: ['i18n', '国际化', '多语言', '翻译', 'locale', 'translation'],
    license: 'MIT',
    main: 'dist/index.mjs',
    lytjsVersion: '>=5.0.1',
    category: 'tool',
    icon: '🌐',
    homepage: 'https://gitee.com/lytjs/lytjs',
    repository: 'https://gitee.com/lytjs/lytjs',
    official: true,
    downloads: 0,
  },
  {
    name: '@lytjs/plugin-auth',
    version: '5.0.1',
    description: '认证授权插件 - 提供登录、登出、注册、Token 管理、角色权限检查和路由守卫功能',
    author: 'lytjs',
    keywords: ['auth', '认证', '授权', '登录', 'token', '权限', 'role', 'permission'],
    license: 'MIT',
    main: 'dist/index.mjs',
    lytjsVersion: '>=5.0.1',
    category: 'integration',
    icon: '🔐',
    homepage: 'https://gitee.com/lytjs/lytjs',
    repository: 'https://gitee.com/lytjs/lytjs',
    official: true,
    downloads: 0,
  },
  {
    name: '@lytjs/plugin-logger',
    version: '5.0.1',
    description: '日志插件 - 提供分级日志、彩色输出、持久化存储、自定义格式和传输功能',
    author: 'lytjs',
    keywords: ['logger', '日志', 'debug', 'info', 'warn', 'error', 'log'],
    license: 'MIT',
    main: 'dist/index.mjs',
    lytjsVersion: '>=5.0.1',
    category: 'tool',
    icon: '📝',
    homepage: 'https://gitee.com/lytjs/lytjs',
    repository: 'https://gitee.com/lytjs/lytjs',
    official: true,
    downloads: 0,
  },
  {
    name: '@lytjs/plugin-storage',
    version: '5.0.1',
    description: '本地存储持久化插件 - 提供带前缀的 localStorage 封装、过期时间、响应式监听和自动恢复功能',
    author: 'lytjs',
    keywords: ['storage', '存储', 'localStorage', 'sessionStorage', '持久化', '缓存'],
    license: 'MIT',
    main: 'dist/index.mjs',
    lytjsVersion: '>=5.0.1',
    category: 'tool',
    icon: '💾',
    homepage: 'https://gitee.com/lytjs/lytjs',
    repository: 'https://gitee.com/lytjs/lytjs',
    official: true,
    downloads: 0,
  },
  {
    name: '@lytjs/plugin-theme',
    version: '5.0.1',
    description: '主题切换插件 - 提供明暗主题切换、CSS 变量管理、系统偏好检测和动态变量功能',
    author: 'lytjs',
    keywords: ['theme', '主题', 'dark-mode', '暗黑模式', 'CSS变量', '样式'],
    license: 'MIT',
    main: 'dist/index.mjs',
    lytjsVersion: '>=5.0.1',
    category: 'theme',
    icon: '🎨',
    homepage: 'https://gitee.com/lytjs/lytjs',
    repository: 'https://gitee.com/lytjs/lytjs',
    official: true,
    downloads: 0,
  },
  {
    name: '@lytjs/plugin-chart',
    version: '5.0.1',
    description: '图表插件 - 提供柱状图和折线图组件，使用 Canvas API 绘制，零运行时依赖',
    author: 'lytjs',
    keywords: ['chart', '图表', 'bar', 'line', 'canvas', '可视化', 'visualization'],
    license: 'MIT',
    main: 'dist/index.mjs',
    lytjsVersion: '>=5.0.1',
    category: 'ui',
    icon: '📊',
    homepage: 'https://gitee.com/lytjs/lytjs',
    repository: 'https://gitee.com/lytjs/lytjs',
    official: true,
    downloads: 0,
  },
  {
    name: '@lytjs/plugin-highlight',
    version: '5.0.1',
    description: '代码高亮插件 - 支持 JavaScript/TypeScript/HTML/CSS/JSON 语法高亮，使用正则表达式实现，零运行时依赖',
    author: 'lytjs',
    keywords: ['highlight', '代码高亮', 'syntax', 'code', 'javascript', 'typescript'],
    license: 'MIT',
    main: 'dist/index.mjs',
    lytjsVersion: '>=5.0.1',
    category: 'ui',
    icon: '✨',
    homepage: 'https://gitee.com/lytjs/lytjs',
    repository: 'https://gitee.com/lytjs/lytjs',
    official: true,
    downloads: 0,
  },
  {
    name: '@lytjs/plugin-virtual-list',
    version: '5.0.1',
    description: '虚拟列表插件 - 提供高性能虚拟滚动列表组件，支持动态高度和大数据量渲染',
    author: 'lytjs',
    keywords: ['virtual-list', '虚拟列表', 'virtual-scroll', '滚动', '性能', 'performance', '大数据'],
    license: 'MIT',
    main: 'dist/index.mjs',
    lytjsVersion: '>=5.0.1',
    category: 'ui',
    icon: '📋',
    homepage: 'https://gitee.com/lytjs/lytjs',
    repository: 'https://gitee.com/lytjs/lytjs',
    official: true,
    downloads: 0,
  },
];

/**
 * 创建包含所有内置插件的注册表实例
 *
 * @returns 预填充官方插件的 PluginRegistry 实例
 */
export function createDefaultRegistry(): PluginRegistry {
  return new PluginRegistry(BUILT_IN_PLUGINS);
}
