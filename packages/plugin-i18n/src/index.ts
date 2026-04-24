// Lyt.js 国际化插件
//
// 用法：
//   import { createI18n } from '@lytjs/plugin-i18n'
//   const i18n = createI18n({
//     locale: 'zh-CN',
//     fallbackLocale: 'en',
//     messages: {
//       'zh-CN': { hello: '你好', welcome: '欢迎' },
//       'en': { hello: 'Hello', welcome: 'Welcome' }
//     }
//   })
//   app.use(i18n)
//   // 在模板中使用：{{ $t('hello') }}
//   // 在 JS 中使用：i18n.global.t('hello')

// ======================== 类型定义 ========================

/** 国际化配置选项 */
interface I18nOptions {
  /** 当前语言 */
  locale: string
  /** 回退语言，当前语言找不到翻译时使用 */
  fallbackLocale?: string
  /** 语言包映射表 */
  messages: Record<string, Record<string, string>>
  /** 日期格式配置 */
  datetimeFormats?: Record<string, any>
  /** 数字格式配置 */
  numberFormats?: Record<string, any>
  /** 兼容模式（预留） */
  legacy?: boolean
}

/** 国际化插件实例 */
interface I18n {
  /** 安装到 Lyt 应用 */
  install: (app: any, options?: any) => void
  /** 全局国际化 API */
  global: {
    /** 翻译函数，支持路径式 key、参数插值、回退语言、默认值、复数形式 */
    t: (key: string, params?: Record<string, any>, defaultValue?: string) => string
    /** 当前语言 */
    locale: string
    /** 切换语言 */
    setLocale: (locale: string) => void
    /** 获取当前语言 */
    getLocale: () => string
    /** 可用语言列表 */
    availableLocales: string[]
    /** 运行时合并新翻译（浅合并） */
    mergeMessage: (locale: string, messages: Record<string, string>) => void
    /** 运行时合并翻译（与 mergeMessage 功能一致） */
    mergeLocaleMessages: (locale: string, messages: Record<string, string>) => void
    /** 懒加载翻译包（替换指定语言的全部翻译） */
    loadLocaleMessages: (locale: string, messages: Record<string, string>) => void
    /** 注册语言变更监听器，返回取消监听函数 */
    onLocaleChange: (callback: (locale: string) => void) => () => void
  }
}

// ======================== 工具函数 ========================

/**
 * 根据路径式 key 从对象中取值
 * 例如：resolvePath({ user: { profile: { name: '张三' } } }, 'user.profile.name') => '张三'
 */
function resolvePath(obj: Record<string, any>, path: string): string | undefined {
  const keys = path.split('.')
  let current: any = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[key]
  }
  return typeof current === 'string' ? current : undefined
}

/**
 * 参数插值
 * 将消息模板中的 {name} 替换为 params.name 的值
 * 例如：interpolate('Hello, {name}!', { name: 'World' }) => 'Hello, World!'
 */
function interpolate(message: string, params: Record<string, any>): string {
  return message.replace(/\{(\w+)\}/g, (_match: string, key: string): string => {
    return params[key] !== undefined ? String(params[key]) : _match
  })
}

/**
 * 处理复数形式
 * 根据消息模板中的 | 分隔符选择正确的复数形式
 * 例如：
 *   pluralize('0 items | 1 item | {count} items', 0) => '0 items'
 *   pluralize('0 items | 1 item | {count} items', 1) => '1 item'
 *   pluralize('0 items | 1 item | {count} items', 5) => '5 items'
 */
function pluralize(message: string, count: number, params: Record<string, any>): string {
  // 如果消息中没有 | 分隔符，直接插值返回
  if (!message.includes('|')) {
    return interpolate(message, params)
  }

  // 按 | 分割复数形式
  const forms = message.split('|').map((s) => s.trim())

  let selected: string
  if (count === 0 && forms.length > 0) {
    // 零值形式（如果提供了零值形式）
    selected = forms.length >= 3 ? forms[0] : forms[0]
  } else if (count === 1) {
    // 单数形式
    selected = forms.length >= 2 ? forms[1] : forms[0]
  } else {
    // 复数形式
    selected = forms.length >= 3 ? forms[2] : (forms.length >= 2 ? forms[1] : forms[0])
  }

  // 将 {count} 替换为实际数量
  return interpolate(selected, { ...params, count })
}

// ======================== 核心实现 ========================

/**
 * 创建国际化插件实例
 * @param options 国际化配置
 * @returns I18n 插件实例
 */
function createI18n(options: I18nOptions): I18n {
  const { locale: initialLocale, fallbackLocale, messages } = options

  // 深拷贝语言包，避免外部修改影响内部状态
  const messageMap: Record<string, Record<string, string>> = {}
  for (const lang of Object.keys(messages)) {
    messageMap[lang] = { ...messages[lang] }
  }

  // 当前语言
  let currentLocale = initialLocale

  // 语言变更监听器列表
  const listeners: Array<(locale: string) => void> = []

  /** 注册语言变更监听器 */
  function onLocaleChange(callback: (locale: string) => void): () => void {
    listeners.push(callback)
    // 返回取消监听函数
    return () => {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /** 通知所有监听器语言已变更 */
  function notifyLocaleChange(locale: string): void {
    for (const listener of listeners) {
      listener(locale)
    }
  }

  /** 翻译函数 */
  function t(key: string, params?: Record<string, any>, defaultValue?: string): string {
    const effectiveParams = params || {}

    // 1. 从当前语言包中查找
    let message = resolvePath(messageMap[currentLocale] || {}, key)

    // 2. 当前语言找不到，尝试回退语言
    if (message === undefined && fallbackLocale) {
      message = resolvePath(messageMap[fallbackLocale] || {}, key)
    }

    // 3. 都找不到，使用默认值或返回 key 本身
    if (message === undefined) {
      if (defaultValue !== undefined) {
        message = defaultValue
      } else {
        return key
      }
    }

    // 4. 处理复数形式（当 params 中包含 count 时）
    if (effectiveParams.count !== undefined && typeof effectiveParams.count === 'number') {
      return pluralize(message, effectiveParams.count, effectiveParams)
    }

    // 5. 参数插值
    return interpolate(message, effectiveParams)
  }

  /** 切换语言 */
  function setLocale(locale: string): void {
    if (locale === currentLocale) return
    currentLocale = locale
    // 触发响应式更新通知
    notifyLocaleChange(locale)
  }

  /** 获取当前语言 */
  function getLocale(): string {
    return currentLocale
  }

  /** 获取可用语言列表 */
  function getAvailableLocales(): string[] {
    return Object.keys(messageMap)
  }

  /** 运行时合并新翻译 */
  function mergeMessage(locale: string, newMessages: Record<string, string>): void {
    if (!messageMap[locale]) {
      messageMap[locale] = {}
    }
    for (const key of Object.keys(newMessages)) {
      messageMap[locale][key] = newMessages[key]
    }
  }

  /** 运行时合并翻译（与 mergeMessage 功能一致） */
  function mergeLocaleMessages(locale: string, newMessages: Record<string, string>): void {
    mergeMessage(locale, newMessages)
  }

  /** 懒加载翻译包（替换指定语言的全部翻译） */
  function loadLocaleMessages(locale: string, newMessages: Record<string, string>): void {
    messageMap[locale] = { ...newMessages }
  }

  // 构造插件实例
  const i18n: I18n = {
    /**
     * 安装插件到 Lyt 应用
     * 向 app 注入 $t 方法和 $i18n 对象
     */
    install(app: any, _options?: any): void {
      // 注入全局属性 $t
      app.config = app.config || {}
      app.config.globalProperties = app.config.globalProperties || {}

      app.config.globalProperties.$t = t
      app.config.globalProperties.$i18n = i18n.global

      // 如果 app 提供 provide 方法，也通过 provide 注入
      if (typeof app.provide === 'function') {
        app.provide('i18n', i18n.global)
      }
    },

    global: {
      t,
      get locale(): string {
        return currentLocale
      },
      setLocale,
      getLocale,
      get availableLocales(): string[] {
        return getAvailableLocales()
      },
      mergeMessage,
      mergeLocaleMessages,
      loadLocaleMessages,
      onLocaleChange,
    },
  }

  return i18n
}

export { createI18n }
export type { I18n, I18nOptions }
