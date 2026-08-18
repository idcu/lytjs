# @lytjs/plugin-i18n

LytJS 官方国际化（i18n）插件，提供多语言翻译、语言切换与语言包动态注册能力。

## 安装

```bash
pnpm add @lytjs/plugin-i18n
```

## 快速开始

### 作为插件使用

```typescript
import { createApp } from '@lytjs/core';
import pluginI18n from '@lytjs/plugin-i18n';

const app = createApp();
app.use(pluginI18n, {
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': { hello: '你好' },
    'en-US': { hello: 'Hello' },
  },
});
```

安装后可通过 `$i18n` 与 `$t`（或 provide 注入的 `lyt-i18n`）使用：

```typescript
// 翻译
$t('hello'); // 你好
$t('greeting', { name: 'Tom' }); // 支持 {name} / {0} 占位插值

// 切换语言
$i18n.setLocale('en-US');
$i18n.locale.value; // en-US

// 检查翻译 / 动态注册
$i18n.te('hello'); // true
$i18n.registerLocale('ja-JP', { hello: 'こんにちは' });
$i18n.availableLocales; // 可用语言列表
$i18n.getMessages(); // 获取所有语言包
```

### 独立使用

```typescript
import { createI18n } from '@lytjs/plugin-i18n';

const i18n = createI18n({ locale: 'zh-CN', messages: { 'zh-CN': { hello: '你好' } } });
i18n.t('hello');
```

## 特性

- 点分路径键值翻译（`t`）
- 命名 / 位置参数插值（`{name}` / `{0}`）
- 默认语言回退与缺失翻译警告
- 动态语言包注册（`registerLocale`）
- 响应式语言状态

## API

### createI18n(options)

创建 i18n 实例。

| 成员                                 | 说明                     |
| ------------------------------------ | ------------------------ |
| `t(key, ...args)`                    | 翻译函数，支持插值       |
| `te(key, locale?)`                   | 检查翻译是否存在         |
| `setLocale(locale)` / `locale.value` | 切换/读取当前语言        |
| `registerLocale(locale, messages)`   | 注册（合并）语言包       |
| `getMessages()`                      | 获取所有语言包（深拷贝） |
| `availableLocales`                   | 可用语言列表             |

### 类型

`I18nOptions`、`I18nInstance`、`Locale`、`LocaleMessages`、`TranslateFn`。

## 相关包

- [@lytjs/core](../../../core)：应用核心，提供 `definePlugin` 与 `createApp`。
- [@lytjs/reactivity](../../../reactivity)：响应式信号机制。

## 许可证

[MIT](../../../../LICENSE)
