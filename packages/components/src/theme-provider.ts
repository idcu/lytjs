/**
 * ThemeProvider 主题提供者组件
 * 为所有子组件提供主题上下文
 *
 * Props:
 *   - theme: 自定义主题覆盖
 *   - darkMode: 强制暗色模式
 *   - persist: 持久化到 localStorage
 */

import { defineComponent } from '@lytjs/component'
import {
  createTheme,
  applyTheme,
  setTheme,
  toggleDarkMode,
  isDarkMode,
  getTheme,
  generateCSSVariables,
  defaultDarkTheme,
  defaultLightTheme,
  type ThemeConfig,
} from './theme.ts'

const STORAGE_KEY = 'lyt-theme-dark-mode'

export const ThemeProvider = defineComponent({
  name: 'LytThemeProvider',

  props: {
    /** 自定义主题覆盖 */
    theme: {
      type: Object as () => Partial<ThemeConfig>,
      default: undefined,
    },
    /** 强制暗色模式 */
    darkMode: {
      type: Boolean,
      default: undefined,
    },
    /** 持久化到 localStorage */
    persist: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { slots }) {
    let mediaQueryListener: (() => void) | null = null

    const getSystemDarkMode = (): boolean => {
      if (typeof window === 'undefined' || !window.matchMedia) return false
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    const loadPersistedDarkMode = (): boolean | null => {
      if (!props.persist) return null
      try {
        if (typeof localStorage === 'undefined') return null
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored === 'true'
      } catch {
        return null
      }
    }

    const persistDarkMode = (dark: boolean): void => {
      if (!props.persist) return
      try {
        if (typeof localStorage === 'undefined') return
        localStorage.setItem(STORAGE_KEY, String(dark))
      } catch {
        // localStorage 不可用时静默失败
      }
    }

    const resolveDarkMode = (): boolean => {
      // 优先级：props.darkMode > localStorage > 系统偏好
      if (props.darkMode !== undefined) return props.darkMode
      const persisted = loadPersistedDarkMode()
      if (persisted !== null) return persisted
      return getSystemDarkMode()
    }

    const applyInitialTheme = (): void => {
      const dark = resolveDarkMode()
      if (dark) {
        if (props.theme) {
          const customDark = createTheme(props.theme)
          // 将自定义覆盖应用到暗色主题
          const merged = { ...defaultDarkTheme }
          if (props.theme.colors) merged.colors = { ...defaultDarkTheme.colors, ...props.theme.colors }
          if (props.theme.font) merged.font = { ...defaultDarkTheme.font, ...props.theme.font }
          if (props.theme.spacing) merged.spacing = { ...defaultDarkTheme.spacing, ...props.theme.spacing }
          if (props.theme.radius) merged.radius = { ...defaultDarkTheme.radius, ...props.theme.radius }
          if (props.theme.shadows) merged.shadows = { ...defaultDarkTheme.shadows, ...props.theme.shadows }
          setTheme(merged)
        } else {
          setTheme(defaultDarkTheme)
        }
      } else {
        if (props.theme) {
          setTheme(createTheme(props.theme))
        } else {
          setTheme(defaultLightTheme)
        }
      }
      persistDarkMode(dark)
    }

    const watchSystemPreference = (): void => {
      if (typeof window === 'undefined' || !window.matchMedia) return
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQueryListener = () => {
        // 仅在未手动设置时跟随系统
        if (props.darkMode === undefined) {
          const persisted = loadPersistedDarkMode()
          if (persisted === null) {
            applyInitialTheme()
          }
        }
      }
      mq.addEventListener('change', mediaQueryListener)
    }

    onMounted(() => {
      applyInitialTheme()
      watchSystemPreference()
    })

    onUnmounted(() => {
      if (mediaQueryListener && typeof window !== 'undefined' && window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        mq.removeEventListener('change', mediaQueryListener)
        mediaQueryListener = null
      }
    })

    return { slots }
  },

  template: `
    <div class="lyt-theme-provider">
      <slot></slot>
    </div>
  `,

  styles: `
    .lyt-theme-provider {
      box-sizing: border-box;
    }
  `,
})
