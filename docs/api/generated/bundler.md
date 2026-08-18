# @lytjs/bundler

与 Vite 集成的打包器

## 目录

- [createVitePlugin](#createviteplugin)
- [createWebpackPlugin](#createwebpackplugin)
- [getPreset](#getpreset)
- [createViteConfig](#createviteconfig)
- [LytPluginOptions](#lytpluginoptions)
- [LytPluginConfig](#lytpluginconfig)
- [BundlerPreset](#bundlerpreset)

## createVitePlugin

**Function**

创建 Vite 插件

### 签名

```typescript
createVitePlugin: Record<string, unknown>;
```

### 参数

| 参数      | 类型               | 描述 | 可选 | 默认值 |
| --------- | ------------------ | ---- | ---- | ------ |
| \_options | `LytPluginOptions` |      | 是   | {}     |

### 返回值

**类型:** `Record<string, unknown>`

Vite 插件

## createWebpackPlugin

**Function**

创建 Webpack 插件

### 签名

```typescript
createWebpackPlugin: Record<string, unknown>;
```

### 参数

| 参数      | 类型               | 描述 | 可选 | 默认值 |
| --------- | ------------------ | ---- | ---- | ------ |
| \_options | `LytPluginOptions` |      | 是   | {}     |

### 返回值

**类型:** `Record<string, unknown>`

Webpack 插件

## getPreset

**Function**

获取默认预设配置

### 签名

```typescript
getPreset: BundlerPreset;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值    |
| ---- | -------- | ---- | ---- | --------- |
| name | `string` |      | 是   | 'default' |

### 返回值

**类型:** `BundlerPreset`

预设配置

## createViteConfig

**Function**

创建完整的 Vite 配置

### 签名

```typescript
createViteConfig: Record<string, unknown>;
```

### 参数

| 参数    | 类型               | 描述 | 可选 | 默认值 |
| ------- | ------------------ | ---- | ---- | ------ |
| options | `LytPluginOptions` |      | 是   | {}     |

### 返回值

**类型:** `Record<string, unknown>`

Vite 配置

## LytPluginOptions

**Interface**

### 成员

| 名称     | 类型       | 描述         | 可选 |
| -------- | ---------- | ------------ | ---- |
| ssg      | `boolean`  | 是否启用 SSG | 是   |
| ssgPages | `string[]` | SSG 页面路径 | 是   |
| ssr      | `boolean`  | 是否启用 SSR | 是   |

## LytPluginConfig

**Interface**

### 成员

| 名称    | 类型                      | 描述             | 可选 |
| ------- | ------------------------- | ---------------- | ---- |
| vite    | `Record<string, unknown>` | Vite 插件配置    | 是   |
| webpack | `Record<string, unknown>` | Webpack 插件配置 | 是   |

## BundlerPreset

**Interface**

### 成员

| 名称    | 类型                      | 描述         | 可选 |
| ------- | ------------------------- | ------------ | ---- |
| name    | `string`                  | 预设名称     | 否   |
| vite    | `Record<string, unknown>` | Vite 配置    | 是   |
| webpack | `Record<string, unknown>` | Webpack 配置 | 是   |
