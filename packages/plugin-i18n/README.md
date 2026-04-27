# @lytjs/plugin-i18n

> Lyt.js 国际化插件 - 提供多语言支持、消息格式化和语言切换功能

**版本：** 4.2.0

## 安装

```bash
npm install @lytjs/plugin-i18n
```

## 使用

### 注册插件

```typescript
import { createApp } from '@lytjs/core'
import { createI18n } from '@lytjs/plugin-i18n'

const i18n = createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'en',
  messages: {
    'zh-CN': {
      hello: '你好',
      welcome: '欢迎',
      user: { profile: { name: '张三' } },
    },
    en: {
      hello: 'Hello',
      welcome: 'Welcome',
      user: { profile: { name: 'John' } },
    },
  },
})

const app = createApp({})
app.use(i18n)
```

### 在模板中使用

安装插件后，会注入全局 `$t` 方法，可在模板中直接使用：

```html
<template>
  <p>{{ $t('hello') }}</p>
  <p>{{ $t('user.profile.name') }}</p>
</template>
```

### 在 JS 中使用

```typescript
// 通过注入获取
const i18n = inject('i18n')

// 翻译
i18n.t('hello') // '你好'

// 带参数插值
i18n.t('greeting', { name: 'World' }) // 'Hello, World!'

// 带默认值
i18n.t('missing.key', {}, '默认文本') // '默认文本'

// 切换语言
i18n.setLocale('en')

// 获取当前语言
i18n.getLocale() // 'en'

// 可用语言列表
i18n.availableLocales // ['zh-CN', 'en']
```

### 复数形式

```typescript
// 定义复数消息（使用 | 分隔符）
const messages = {
  'zh-CN': {
    apple: '没有苹果 | 1 个苹果 | {count} 个苹果',
  },
}

i18n.t('apple', { count: 0 }) // '没有苹果'
i18n.t('apple', { count: 1 }) // '1 个苹果'
i18n.t('apple', { count: 5 }) // '5 个苹果'
```

### 运行时加载语言包

```typescript
// 浅合并新翻译
i18n.mergeMessage('zh-CN', { newKey: '新翻译' })

// 懒加载替换整个语言包
i18n.loadLocaleMessages('ja', {
  hello: 'こんにちは',
  welcome: 'ようこそ',
})
```

### 监听语言变化

```typescript
const unsubscribe = i18n.onLocaleChange((locale) => {
  console.log('语言已切换为:', locale)
})

// 取消监听
unsubscribe()
```

## API

### Options

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `locale` | `string` | **必填** | 当前语言 |
| `fallbackLocale` | `string` | - | 回退语言，当前语言找不到翻译时使用 |
| `messages` | `Record<string, Record<string, string>>` | **必填** | 语言包映射表 |
| `datetimeFormats` | `Record<string, any>` | - | 日期格式配置（预留） |
| `numberFormats` | `Record<string, any>` | - | 数字格式配置（预留） |
| `legacy` | `boolean` | - | 兼容模式（预留） |

### global 方法

| 方法 | 签名 | 描述 |
|------|------|------|
| `t` | `(key: string, params?: Record<string, any>, defaultValue?: string) => string` | 翻译函数，支持路径式 key、参数插值、回退语言、默认值、复数形式 |
| `setLocale` | `(locale: string) => void` | 切换语言 |
| `getLocale` | `() => string` | 获取当前语言 |
| `availableLocales` | `string[]` | 可用语言列表 |
| `mergeMessage` | `(locale: string, messages: Record<string, string>) => void` | 运行时合并新翻译（浅合并） |
| `mergeLocaleMessages` | `(locale: string, messages: Record<string, string>) => void` | 运行时合并翻译（已废弃，请使用 `mergeMessage`） |
| `loadLocaleMessages` | `(locale: string, messages: Record<string, string>) => void` | 懒加载翻译包（替换指定语言的全部翻译） |
| `onLocaleChange` | `(callback: (locale: string) => void) => () => void` | 注册语言变更监听器，返回取消监听函数 |

## License

MIT
