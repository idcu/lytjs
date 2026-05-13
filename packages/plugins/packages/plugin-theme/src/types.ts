/**
 * @lytjs/plugin-theme - 类型定义
 */

export interface Theme {
  /** 主题名称 */
  name: string;
  /** 主题变量 */
  variables: Record<string, string>;
  /** 是否为深色主题 */
  isDark?: boolean;
}

export interface ThemeOptions {
  /** 默认主题 */
  defaultTheme?: string;
  /** 主题列表 */
  themes?: Theme[];
  /** 是否启用系统主题检测 */
  enableSystemTheme?: boolean;
  /** 本地存储 key */
  storageKey?: string;
  /** CSS 变量前缀 */
  variablePrefix?: string;
}

export interface ThemeInstance {
  /** 当前主题 */
  currentTheme: string;
  /** 可用主题列表 */
  availableThemes: string[];
  /** 设置主题 */
  setTheme: (name: string) => void;
  /** 切换到下一个主题 */
  toggleTheme: () => void;
  /** 注册新主题 */
  registerTheme: (theme: Theme) => void;
  /** 获取主题变量 */
  getThemeVariables: (name?: string) => Record<string, string>;
}
