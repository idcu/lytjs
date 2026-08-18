# @lytjs/plugin-theme

官方主题插件，管理 CSS 变量主题

## 目录

- [getSystemTheme](#getsystemtheme)
- [createThemeManager](#createthememanager)
- [Theme](#theme)
- [ThemeOptions](#themeoptions)
- [ThemeInstance](#themeinstance)

## getSystemTheme

**Function**

### 签名

```typescript
getSystemTheme: string;
```

### 返回值

**类型:** `string`

## createThemeManager

**Function**

### 签名

```typescript
createThemeManager: ThemeInstance;
```

### 参数

| 参数    | 类型           | 描述 | 可选 | 默认值 |
| ------- | -------------- | ---- | ---- | ------ |
| options | `ThemeOptions` |      | 是   | {}     |

### 返回值

**类型:** `ThemeInstance`

## Theme

**Interface**

### 成员

| 名称      | 类型                     | 描述           | 可选 |
| --------- | ------------------------ | -------------- | ---- |
| name      | `string`                 | 主题名称       | 否   |
| variables | `Record<string, string>` | 主题变量       | 否   |
| isDark    | `boolean`                | 是否为深色主题 | 是   |

## ThemeOptions

**Interface**

### 成员

| 名称              | 类型      | 描述                 | 可选 |
| ----------------- | --------- | -------------------- | ---- |
| defaultTheme      | `string`  | 默认主题             | 是   |
| themes            | `Theme[]` | 主题列表             | 是   |
| enableSystemTheme | `boolean` | 是否启用系统主题检测 | 是   |
| storageKey        | `string`  | 本地存储 key         | 是   |
| variablePrefix    | `string`  | CSS 变量前缀         | 是   |

## ThemeInstance

**Interface**

### 成员

| 名称              | 类型                                        | 描述             | 可选 |
| ----------------- | ------------------------------------------- | ---------------- | ---- |
| currentTheme      | `string`                                    | 当前主题         | 否   |
| availableThemes   | `string[]`                                  | 可用主题列表     | 否   |
| setTheme          | `(name: string) => void`                    | 设置主题         | 否   |
| toggleTheme       | `() => void`                                | 切换到下一个主题 | 否   |
| registerTheme     | `(theme: Theme) => void`                    | 注册新主题       | 否   |
| getThemeVariables | `(name?: string) => Record<string, string>` | 获取主题变量     | 否   |
