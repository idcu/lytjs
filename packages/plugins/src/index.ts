// Lyt.js 官方插件聚合包
//
// 统一导出所有官方插件，方便一次性引入：
//   import { createI18n, createAuth, createLogger, createStorage, createTheme } from '@lytjs/plugins'
//   import { createChart, highlight, createVirtualList } from '@lytjs/plugins'
//   import { PluginManager, PluginValidator, PluginRegistry, PluginScaffold } from '@lytjs/plugins'

// 官方插件
export { createI18n } from '@lytjs/plugin-i18n'
export { createAuth } from '@lytjs/plugin-auth'
export { createLogger } from '@lytjs/plugin-logger'
export { createStorage } from '@lytjs/plugin-storage'
export { createTheme, BUILT_IN_THEMES } from '@lytjs/plugin-theme'

// 示例插件
export { createChart } from '@lytjs/plugin-chart'
export { highlight, highlightBlock, injectStyles, HIGHLIGHT_STYLES } from '@lytjs/plugin-highlight'
export { createVirtualList } from '@lytjs/plugin-virtual-list'

// 插件注册表
export { PluginRegistry as MarketplaceRegistry, BUILT_IN_PLUGINS, createDefaultRegistry } from '@lytjs/plugin-registry'

// 插件开发 SDK
export {
  PluginManager,
  PluginValidator,
  PluginRegistry,
  PluginScaffold,
  PluginInstaller,
} from '@lytjs/plugin-sdk'

export type {
  LytPlugin,
  LytPluginManifest,
  LytPluginAPI,
  LytPluginHook,
  LytPluginPermission,
  LytPluginCategory,
  LytPluginConfig,
  LytPluginResult,
  ValidationResult,
} from '@lytjs/plugin-sdk'
