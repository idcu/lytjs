# @lytjs/bundler

与 Vite 集成的打包器

## 目录

- [LYT_EXTENSIONS](#lyt-extensions)
- [stripQuery](#stripquery)
- [isLytModule](#islytmodule)
- [stableId](#stableid)
- [buildCssInjection](#buildcssinjection)
- [transformSFC](#transformsfc)
- [createVitePlugin](#createviteplugin)
- [getPreset](#getpreset)
- [createViteConfig](#createviteconfig)
- [LytPluginOptions](#lytpluginoptions)
- [LytConfigOptions](#lytconfigoptions)
- [BundlerPreset](#bundlerpreset)
- [LytTransformResult](#lyttransformresult)

## LYT_EXTENSIONS

**Variable**

默认拦截的扩展名

## stripQuery

**Function**

去掉 Vite 查询串（`?raw` / `?t=123` 等）

### 签名

```typescript
stripQuery: string;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| id   | `string` |      | 否   | -      |

### 返回值

**类型:** `string`

## isLytModule

**Function**

判断某个模块 id 是否需要由本包转换。

### 签名

```typescript
isLytModule: boolean;
```

### 参数

| 参数       | 类型                | 描述 | 可选 | 默认值           |
| ---------- | ------------------- | ---- | ---- | ---------------- |
| id         | `string`            |      | 否   | -                |
| extensions | `readonly string[]` |      | 是   | `LYT_EXTENSIONS` |

### 返回值

**类型:** `boolean`

## stableId

**Function**

由模块 id 生成稳定的短哈希（用于 `<style>` 元素的 id，避免重复注入）

### 签名

```typescript
stableId: string;
```

### 参数

| 参数  | 类型     | 描述 | 可选 | 默认值 |
| ----- | -------- | ---- | ---- | ------ |
| input | `string` |      | 否   | -      |

### 返回值

**类型:** `string`

## buildCssInjection

**Function**

生成运行时 style 注入片段（SSR 安全：无 `document` 时整体跳过）。

### 签名

```typescript
buildCssInjection: string;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值 |
| ---- | -------- | ---- | ---- | ------ |
| id   | `string` |      | 否   | -      |
| css  | `string` |      | 否   | -      |

### 返回值

**类型:** `string`

## transformSFC

**Function**

把 `.lyt` / `.vue` 源码编译为 JS 模块。

这是本包的核心能力，也是 Vite 插件 `transform` 钩子的实现体；
需要 Webpack / Rspack 等其它构建工具时可直接调用本函数写一个 loader。

### 签名

```typescript
transformSFC: LytTransformResult | null;
```

### 参数

| 参数    | 类型               | 描述 | 可选 | 默认值 |
| ------- | ------------------ | ---- | ---- | ------ |
| code    | `string`           |      | 否   | -      |
| id      | `string`           |      | 否   | -      |
| options | `LytPluginOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `LytTransformResult | null`

转换结果；`id` 不属于 `extensions` 时返回 `null`（表示「不处理」）

## createVitePlugin

**Function**

创建 Vite 插件。

该插件对 `.lyt` / `.vue` 模块调用 `transformSFC()`，产出可被 JS 引擎直接执行的
模块源码（render 函数 + 运行时 style 注入）。非 `.lyt` / `.vue` 模块返回 `null`，
交由其它插件处理。

### 签名

```typescript
createVitePlugin: Record<string, unknown>;
```

### 参数

| 参数    | 类型               | 描述 | 可选 | 默认值 |
| ------- | ------------------ | ---- | ---- | ------ |
| options | `LytPluginOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `Record<string, unknown>`

Vite 插件对象

## getPreset

**Function**

获取预设配置。

### 签名

```typescript
getPreset: BundlerPreset;
```

### 参数

| 参数 | 类型     | 描述 | 可选 | 默认值      |
| ---- | -------- | ---- | ---- | ----------- |
| name | `string` |      | 是   | `'default'` |

### 返回值

**类型:** `BundlerPreset`

预设配置；未知名称回退到 `default`

## createViteConfig

**Function**

创建完整的 Vite 配置。

⚠️ 2026-10-10 订正（P1-8）：此前实现是 `{ ...getPreset(...).vite }` ——
它返回的是**预设内部**用空 options 构造的插件，调用方传进来的
`rendererMode` / `scoped` / `injectCss` 等选项被**静默丢弃**。
现在改为用调用方的 options 重新构造插件，选项真正生效。

### 签名

```typescript
createViteConfig: Record<string, unknown>;
```

### 参数

| 参数    | 类型               | 描述 | 可选 | 默认值 |
| ------- | ------------------ | ---- | ---- | ------ |
| options | `LytConfigOptions` |      | 是   | `{}`   |

### 返回值

**类型:** `Record<string, unknown>`

Vite 配置对象

## LytPluginOptions

**Interface**

传给 `createVitePlugin()` 的转换选项

### 成员

| 名称         | 类型                             | 描述                                                                                                                                                                                                                                                                                                       | 可选 |
| ------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| ssr          | `boolean`                        | 是否按 SSR 目标编译模板。 该开关会流入 `@lytjs/compiler` 的 `ssrMode`，使模板产出 `renderToString(...)` + HTML 转义（而非 `createBlock(...)`）。 默认 `false`（CSR）。                                                                                                                                     | 是   |
| scoped       | `boolean`                        | 是否对所有 `<style>` 块强制作用域化。 - `true` → 所有 style 块都加 `[data-v-<id>]` - `false` → 所有 style 块都不加 - 不传（默认）→ **按各 style 块自身的 `scoped` 属性决定**                                                                                                                               | 是   |
| rendererMode | `'vnode' \| 'signal' \| 'vapor'` | 渲染模式，默认 `'vnode'`。透传给 `@lytjs/compiler`。                                                                                                                                                                                                                                                       | 是   |
| extensions   | `readonly string[]`              | 需要拦截的文件扩展名，默认 `['.lyt', '.vue']`                                                                                                                                                                                                                                                              | 是   |
| injectCss    | `boolean`                        | 是否在产出的 JS 末尾追加**运行时 style 注入**片段（默认 `true`）。 ⚠️ 已知限制：本包不做 CSS 抽取，样式由运行时注入 `<style>` 标签。 需要构建期 CSS 抽取 / HMR 样式热更请改用 `@lytjs/plugin-vite` （已迁出至独立仓库）。设为 `false` 时 `transformSFC()` 只在返回值里 给出 `css` 字段，由调用方自行处理。 | 是   |

## LytConfigOptions

**Interface**

传给 `createViteConfig()` 的选项：转换选项 + 预设选择

### 成员

| 名称 | 类型      | 描述                                                          | 可选 |
| ---- | --------- | ------------------------------------------------------------- | ---- |
| ssg  | `boolean` | 选择 SSG 预设（等价于同时开启 `ssr`，因为 SSG 走 SSR 预渲染） | 是   |

## BundlerPreset

**Interface**

构建预设

### 成员

| 名称 | 类型                      | 描述      | 可选 |
| ---- | ------------------------- | --------- | ---- |
| name | `string`                  | 预设名称  | 否   |
| vite | `Record<string, unknown>` | Vite 配置 | 是   |

## LytTransformResult

**Interface**

`transformSFC()` 的返回值（对齐 Vite 的 `transform` 钩子契约）

### 成员

| 名称     | 类型             | 描述                                                       | 可选 |
| -------- | ---------------- | ---------------------------------------------------------- | ---- |
| code     | `string`         | 转换后的 JS 模块源码                                       | 否   |
| map      | `object \| null` | sourcemap；当前编译器未产出，恒为 `null`                   | 否   |
| css      | `string`         | 从 `<style>` 块抽取出的 CSS（无 style 块时为 `undefined`） | 是   |
| scopedId | `string`         | 实际生效的 scope id（无作用域样式时为 `undefined`）        | 是   |
