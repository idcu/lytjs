// Lyt.js 官方插件聚合包
//
// 统一导出所有官方插件，方便一次性引入：
//   import { createI18n, createAuth, createLogger, createStorage, createTheme } from '@lytjs/plugins'

export { createI18n } from '@lytjs/plugin-i18n'
export { createAuth } from '@lytjs/plugin-auth'
export { createLogger } from '@lytjs/plugin-logger'
export { createStorage } from '@lytjs/plugin-storage'
export { createTheme, BUILT_IN_THEMES } from '@lytjs/plugin-theme'
