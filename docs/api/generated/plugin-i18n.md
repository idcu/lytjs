# @lytjs/plugin-i18n

官方国际化（i18n）插件

## 目录

- [deepClone](#deepclone)
- [createI18n](#createi18n)
- [getNestedValue](#getnestedvalue)
- [interpolate](#interpolate)
- [t](#t)
- [te](#te)
- [setLocale](#setlocale)
- [registerLocale](#registerlocale)
- [getMessages](#getmessages)
- [registerLocale](#registerlocale)
- [LocaleMessages](#localemessages)
- [Locale](#locale)
- [I18nOptions](#i18noptions)
- [TranslateFn](#translatefn)
- [I18nInstance](#i18ninstance)

## deepClone

**Function**

深度克隆对象，防止直接修改

### 签名

```typescript
deepClone: T;
```

### 参数

| 参数 | 类型 | 描述 | 可选 | 默认值 |
| ---- | ---- | ---- | ---- | ------ |
| obj  | `T`  |      | 否   | -      |

### 返回值

**类型:** `T`

## createI18n

**Function**

创建 i18n 实例

### 签名

```typescript
createI18n: I18nInstance;
```

### 参数

| 参数    | 类型          | 描述 | 可选 | 默认值 |
| ------- | ------------- | ---- | ---- | ------ |
| options | `I18nOptions` |      | 是   | {}     |

### 返回值

**类型:** `I18nInstance`

## getNestedValue

**Function**

获取嵌套对象的值

### 签名

```typescript
getNestedValue: string | undefined;
```

### 参数

| 参数 | 类型             | 描述 | 可选 | 默认值 |
| ---- | ---------------- | ---- | ---- | ------ |
| obj  | `LocaleMessages` |      | 否   | -      |
| path | `string`         |      | 否   | -      |

### 返回值

**类型:** `string | undefined`

## interpolate

**Function**

替换插值

### 签名

```typescript
interpolate: string;
```

### 参数

| 参数    | 类型        | 描述 | 可选 | 默认值 |
| ------- | ----------- | ---- | ---- | ------ |
| message | `string`    |      | 否   | -      |
| args    | `unknown[]` |      | 否   | -      |

### 返回值

**类型:** `string`

## t

**Function**

翻译函数

### 签名

```typescript
t: string;
```

### 参数

| 参数 | 类型        | 描述 | 可选 | 默认值 |
| ---- | ----------- | ---- | ---- | ------ |
| key  | `string`    |      | 否   | -      |
| args | `unknown[]` |      | 否   | -      |

### 返回值

**类型:** `string`

## te

**Function**

检查翻译是否存在

### 签名

```typescript
te: boolean;
```

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值 |
| ------ | -------- | ---- | ---- | ------ |
| key    | `string` |      | 否   | -      |
| locale | `string` |      | 是   | -      |

### 返回值

**类型:** `boolean`

## setLocale

**Function**

设置当前语言

### 签名

```typescript
setLocale: void
```

### 参数

| 参数   | 类型     | 描述 | 可选 | 默认值 |
| ------ | -------- | ---- | ---- | ------ |
| locale | `string` |      | 否   | -      |

### 返回值

**类型:** `void`

## registerLocale

**Function**

注册语言包

### 签名

```typescript
registerLocale: void
```

### 参数

| 参数     | 类型             | 描述 | 可选 | 默认值 |
| -------- | ---------------- | ---- | ---- | ------ |
| locale   | `string`         |      | 否   | -      |
| messages | `LocaleMessages` |      | 否   | -      |

### 返回值

**类型:** `void`

## getMessages

**Function**

获取所有语言包

### 签名

```typescript
getMessages: Locale;
```

### 返回值

**类型:** `Locale`

## registerLocale

**Function**

注册语言包（独立函数版本）

### 签名

```typescript
registerLocale: void
```

### 参数

| 参数     | 类型             | 描述 | 可选 | 默认值 |
| -------- | ---------------- | ---- | ---- | ------ |
| i18n     | `I18nInstance`   |      | 否   | -      |
| locale   | `string`         |      | 否   | -      |
| messages | `LocaleMessages` |      | 否   | -      |

### 返回值

**类型:** `void`

## LocaleMessages

**Type**

语言消息定义

### 签名

```typescript
LocaleMessages: Record<string, string | Record<string, unknown>>;
```

## Locale

**Interface**

语言包

## I18nOptions

**Interface**

i18n 配置选项

### 成员

| 名称            | 类型      | 描述                       | 可选 |
| --------------- | --------- | -------------------------- | ---- |
| locale          | `string`  | 默认语言                   | 是   |
| fallbackLocale  | `string`  | 回退语言                   | 是   |
| messages        | `Locale`  | 语言包                     | 是   |
| warnHtmlMessage | `boolean` | 是否在控制台警告缺失的翻译 | 是   |

## TranslateFn

**Type**

翻译函数

### 签名

```typescript
TranslateFn: (key: string, ...args: unknown[]) => string;
```

## I18nInstance

**Interface**

i18n 实例

### 成员

| 名称             | 类型                | 描述           | 可选 |
| ---------------- | ------------------- | -------------- | ---- |
| locale           | `{ value: string }` | 当前语言       | 否   |
| setLocale        | -                   | 设置语言       | 否   |
| t                | `TranslateFn`       | 获取翻译       | 否   |
| te               | -                   | 是否存在翻译   | 否   |
| availableLocales | `string[]`          | 获取语言列表   | 否   |
| registerLocale   | -                   | 注册语言包     | 否   |
| getMessages      | -                   | 获取所有语言包 | 否   |
