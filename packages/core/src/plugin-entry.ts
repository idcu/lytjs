/**
 * @lytjs/core/plugin — 插件系统子路径入口
 *
 * 按需导入插件系统 API：
 *   import { installPlugin, uninstallPlugin } from '@lytjs/core/plugin'
 */

export {
  createProvidesContext,
  installPlugin,
  uninstallPlugin,
  isPluginObject,
  isPluginFunction,
  getPluginName,
} from '../index'

export type {
  Plugin,
  PluginObject,
  AppAPI,
  AppConfig,
} from '../index'
