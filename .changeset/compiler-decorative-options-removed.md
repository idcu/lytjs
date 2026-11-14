---
'@lytjs/compiler': major
---

删除「声明存在但从未生效」的公开选项（ADR 0032 及增补）：

- `ParserOptions.isNativeTag`
- `ParserOptions.decodeEntities`
- `TransformOptions.bindingMetadata`
- `TransformOptions.isCustomElement`
- `TransformOptions.isBuiltInComponent`（由 `src/builtin-components.ts` 承载）
- `TransformOptions.expressionPlugins`（本仓无表达式插件管线）
- `TransformOptions.slotted`（由 `transforms/scoped.ts` 处理 `:slotted()`）
- `TransformOptions.inSSR`（由 `ssr` / `ssrMode` 承载）
- `TransformOptions.ssrCssVars`（本仓无 SSR CSS 变量注入管线）
- `TransformOptions.inline`（产物形态由 `CodegenOptions.mode` 承载）
- `TransformOptions.isTS`（TS 由 SFC `<script lang="ts">` 承载）

这些字段在 `src` 内没有任何读取点：传入它们不改变任何可达行为（AST / codegen / SSR
产物完全一致）。删除只让无效配置在 TypeScript 类型检查阶段暴露为未知属性；运行时不涉及。
`BindingMetadata` 类型导出保留。

另外 `TransformOptions.onWarn` **不是**装饰性选项，本轮已接通变换期告警并保留。

如需判断 web component，请使用 **`ParserOptions.isCustomElement`**（命中时含 `-`
的标签按原生 `ELEMENT` 解析）。
