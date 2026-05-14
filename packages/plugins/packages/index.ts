/**
 * @lytjs/plugins 统一入口
 *
 * LytJS 官方插件集合
 */

export { default as pluginTheme } from '@lytjs/plugin-theme';
export type { Theme, ThemeOptions, ThemeInstance } from '@lytjs/plugin-theme';
export { createThemeManager } from '@lytjs/plugin-theme';

export { default as pluginLogger } from '@lytjs/plugin-logger';
export type { LogLevel, LogEntry, LoggerOptions, PerformanceMetric, LoggerInstance } from '@lytjs/plugin-logger';
export { createLogger, LOG_LEVELS } from '@lytjs/plugin-logger';

export { default as pluginAuth } from '@lytjs/plugin-auth';
export type { User, AuthOptions, AuthInstance } from '@lytjs/plugin-auth';
export { createAuth } from '@lytjs/plugin-auth';

export { default as pluginStorage } from '@lytjs/plugin-storage';
export type { StorageType, StorageItem, StorageOptions, StorageInstance } from '@lytjs/plugin-storage';
export { createStorage } from '@lytjs/plugin-storage';

export { default as pluginI18n } from '@lytjs/plugin-i18n';
export type { I18nOptions, I18nInstance, Locale, LocaleMessages, TranslateFn } from '@lytjs/plugin-i18n';
export { createI18n, registerLocale } from '@lytjs/plugin-i18n';

export { default as pluginVite } from '@lytjs/plugin-vite';

export { default as pluginChart } from '@lytjs/plugin-chart';
export type {
  ChartDataPoint,
  ChartDataset,
  ChartType,
  ChartConfig,
  ChartInstance,
  ChartPluginOptions,
} from '@lytjs/plugin-chart';
export { createChart, DEFAULT_COLORS } from '@lytjs/plugin-chart';
