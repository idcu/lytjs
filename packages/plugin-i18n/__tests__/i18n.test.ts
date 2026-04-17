/**
 * Lyt.js 国际化插件 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试 createI18n、翻译函数 t、语言切换、懒加载、合并翻译等。
 *
 * 测试覆盖：
 *   - createI18n 创建插件实例
 *   - t() 基本翻译
 *   - t() 参数插值
 *   - t() 回退语言
 *   - t() 默认值
 *   - t() 复数形式
 *   - setLocale / getLocale 语言切换
 *   - availableLocales 可用语言列表
 *   - mergeMessage 合并翻译
 *   - mergeLocaleMessages 合并翻译
 *   - loadLocaleMessages 懒加载翻译包
 *   - onLocaleChange 语言变更监听
 *   - install 安装到应用
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

import { createI18n } from '../src/index'

// ================================================================
//  辅助函数
// ================================================================

function createTestI18n() {
  return createI18n({
    locale: 'zh-CN',
    fallbackLocale: 'en',
    messages: {
      'zh-CN': { hello: '你好', welcome: '欢迎', goodbye: '再见' },
      'en': { hello: 'Hello', welcome: 'Welcome' },
    },
  })
}

// ================================================================
//  测试用例
// ================================================================

describe('createI18n 创建插件实例', () => {

  it('返回包含 install 方法的插件对象', () => {
    const i18n = createTestI18n()
    expect(i18n).toBeDefined()
    expect(typeof i18n.install).toBe('function')
  })

  it('global 对象包含所有必要方法', () => {
    const i18n = createTestI18n()
    expect(typeof i18n.global.t).toBe('function')
    expect(typeof i18n.global.setLocale).toBe('function')
    expect(typeof i18n.global.getLocale).toBe('function')
    expect(typeof i18n.global.mergeMessage).toBe('function')
    expect(typeof i18n.global.mergeLocaleMessages).toBe('function')
    expect(typeof i18n.global.loadLocaleMessages).toBe('function')
    expect(typeof i18n.global.onLocaleChange).toBe('function')
  })

  it('locale 属性返回当前语言', () => {
    const i18n = createTestI18n()
    expect(i18n.global.locale).toBe('zh-CN')
  })
})

describe('t() 基本翻译', () => {

  it('翻译当前语言的 key', () => {
    const i18n = createTestI18n()
    expect(i18n.global.t('hello')).toBe('你好')
    expect(i18n.global.t('welcome')).toBe('欢迎')
  })

  it('找不到 key 时返回 key 本身', () => {
    const i18n = createTestI18n()
    expect(i18n.global.t('nonexistent')).toBe('nonexistent')
  })

  it('支持参数插值', () => {
    const i18n = createI18n({
      locale: 'zh-CN',
      messages: {
        'zh-CN': { greeting: '你好, {name}!' },
      },
    })
    expect(i18n.global.t('greeting', { name: '世界' })).toBe('你好, 世界!')
  })

  it('支持默认值', () => {
    const i18n = createTestI18n()
    expect(i18n.global.t('missing_key', {}, '默认翻译')).toBe('默认翻译')
  })
})

describe('t() 回退语言', () => {

  it('当前语言找不到时回退到 fallbackLocale', () => {
    const i18n = createTestI18n()
    // 'goodbye' 只在 zh-CN 中有，en 中没有
    // 切换到 en 后，'goodbye' 在 en 中没有，但 zh-CN 有
    // 由于 fallbackLocale 是 'en'，不会回退到 zh-CN
    // 所以应该返回 key 本身
    i18n.global.setLocale('en')
    expect(i18n.global.t('goodbye')).toBe('goodbye')
  })

  it('fallbackLocale 中存在的 key 可以被找到', () => {
    const i18n = createI18n({
      locale: 'ja',
      fallbackLocale: 'en',
      messages: {
        'ja': {},
        'en': { hello: 'Hello' },
      },
    })
    expect(i18n.global.t('hello')).toBe('Hello')
  })
})

describe('t() 复数形式', () => {

  it('count=0 使用零值形式', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        'en': { items: '0 items | 1 item | {count} items' },
      },
    })
    expect(i18n.global.t('items', { count: 0 })).toBe('0 items')
  })

  it('count=1 使用单数形式', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        'en': { items: '0 items | 1 item | {count} items' },
      },
    })
    expect(i18n.global.t('items', { count: 1 })).toBe('1 item')
  })

  it('count>1 使用复数形式', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        'en': { items: '0 items | 1 item | {count} items' },
      },
    })
    expect(i18n.global.t('items', { count: 5 })).toBe('5 items')
  })
})

describe('setLocale / getLocale 语言切换', () => {

  it('getLocale 返回当前语言', () => {
    const i18n = createTestI18n()
    expect(i18n.global.getLocale()).toBe('zh-CN')
  })

  it('setLocale 切换语言后 t() 使用新语言', () => {
    const i18n = createTestI18n()
    i18n.global.setLocale('en')
    expect(i18n.global.getLocale()).toBe('en')
    expect(i18n.global.t('hello')).toBe('Hello')
  })

  it('setLocale 相同语言不触发变更', () => {
    const i18n = createTestI18n()
    let changeCount = 0
    i18n.global.onLocaleChange(() => { changeCount++ })
    i18n.global.setLocale('zh-CN') // 相同语言
    expect(changeCount).toBe(0)
  })
})

describe('availableLocales 可用语言列表', () => {

  it('返回所有已注册的语言', () => {
    const i18n = createTestI18n()
    const locales = i18n.global.availableLocales
    expect(locales).toContain('zh-CN')
    expect(locales).toContain('en')
    expect(locales.length).toBe(2)
  })
})

describe('mergeMessage 合并翻译', () => {

  it('合并新翻译到已有语言', () => {
    const i18n = createTestI18n()
    i18n.global.mergeMessage('zh-CN', { newKey: '新翻译' })
    expect(i18n.global.t('newKey')).toBe('新翻译')
  })

  it('合并翻译不影响已有翻译', () => {
    const i18n = createTestI18n()
    i18n.global.mergeMessage('zh-CN', { newKey: '新翻译' })
    expect(i18n.global.t('hello')).toBe('你好')
  })

  it('合并翻译到新语言自动创建语言包', () => {
    const i18n = createTestI18n()
    i18n.global.mergeMessage('ja', { hello: 'こんにちは' })
    i18n.global.setLocale('ja')
    expect(i18n.global.t('hello')).toBe('こんにちは')
  })
})

describe('mergeLocaleMessages 合并翻译', () => {

  it('功能与 mergeMessage 一致', () => {
    const i18n = createTestI18n()
    i18n.global.mergeLocaleMessages('zh-CN', { merged: '已合并' })
    expect(i18n.global.t('merged')).toBe('已合并')
  })

  it('合并到新语言', () => {
    const i18n = createTestI18n()
    i18n.global.mergeLocaleMessages('fr', { bonjour: 'Bonjour' })
    i18n.global.setLocale('fr')
    expect(i18n.global.t('bonjour')).toBe('Bonjour')
  })
})

describe('loadLocaleMessages 懒加载翻译包', () => {

  it('替换指定语言的全部翻译', () => {
    const i18n = createI18n({
      locale: 'zh-CN',
      fallbackLocale: undefined, // 无回退语言
      messages: {
        'zh-CN': { hello: '你好', welcome: '欢迎', goodbye: '再见' },
      },
    })
    // zh-CN 原有 hello=你好, welcome=欢迎, goodbye=再见
    i18n.global.loadLocaleMessages('zh-CN', { newHello: '新你好' })
    // 原有翻译应被替换
    expect(i18n.global.t('newHello')).toBe('新你好')
    expect(i18n.global.t('hello')).toBe('hello') // 已不存在，返回 key
  })

  it('加载新语言的翻译包', () => {
    const i18n = createTestI18n()
    i18n.global.loadLocaleMessages('ko', { hello: '안녕하세요' })
    i18n.global.setLocale('ko')
    expect(i18n.global.t('hello')).toBe('안녕하세요')
  })

  it('加载后 availableLocales 包含新语言', () => {
    const i18n = createTestI18n()
    i18n.global.loadLocaleMessages('de', { hello: 'Hallo' })
    expect(i18n.global.availableLocales).toContain('de')
  })
})

describe('onLocaleChange 语言变更监听', () => {

  it('语言变更时触发回调', () => {
    const i18n = createTestI18n()
    let receivedLocale = ''
    i18n.global.onLocaleChange((locale) => {
      receivedLocale = locale
    })
    i18n.global.setLocale('en')
    expect(receivedLocale).toBe('en')
  })

  it('取消监听后不再触发回调', () => {
    const i18n = createTestI18n()
    let callCount = 0
    const unsubscribe = i18n.global.onLocaleChange(() => {
      callCount++
    })
    i18n.global.setLocale('en')
    expect(callCount).toBe(1)

    unsubscribe()
    i18n.global.setLocale('zh-CN')
    expect(callCount).toBe(1) // 不再增加
  })

  it('多个监听器都被触发', () => {
    const i18n = createTestI18n()
    let count1 = 0
    let count2 = 0
    i18n.global.onLocaleChange(() => { count1++ })
    i18n.global.onLocaleChange(() => { count2++ })
    i18n.global.setLocale('en')
    expect(count1).toBe(1)
    expect(count2).toBe(1)
  })
})

describe('install 安装到应用', () => {

  it('向 app 注入 $t 和 $i18n', () => {
    const i18n = createTestI18n()
    const app: any = {}
    i18n.install(app)

    expect(app.config.globalProperties.$t).toBeDefined()
    expect(app.config.globalProperties.$i18n).toBeDefined()
    expect(typeof app.config.globalProperties.$t).toBe('function')
  })

  it('$t 方法正常翻译', () => {
    const i18n = createTestI18n()
    const app: any = {}
    i18n.install(app)

    expect(app.config.globalProperties.$t('hello')).toBe('你好')
  })

  it('通过 provide 注入 i18n', () => {
    const i18n = createTestI18n()
    const provided: Record<string, any> = {}
    const app: any = {
      provide(key: string, value: any) {
        provided[key] = value
      },
    }
    i18n.install(app)

    expect(provided['i18n']).toBeDefined()
    expect(typeof provided['i18n'].t).toBe('function')
  })
})
