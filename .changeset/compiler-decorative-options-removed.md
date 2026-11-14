---
'@lytjs/compiler': major
---

删除四个「声明存在但从未生效」的公开选项（ADR 0032）：

- `ParserOptions.isNativeTag`
- `ParserOptions.decodeEntities`
- `TransformOptions.bindingMetadata`
- `TransformOptions.isCustomElement`

这四个字段在 `src` 内没有任何读取点：传入它们不改变任何可达行为（AST / codegen / SSR
产物完全一致）。删除只让无效配置在 TypeScript 类型检查阶段暴露为未知属性；运行时不涉及。
`BindingMetadata` 类型导出保留。

如需判断 web component，请使用 **`ParserOptions.isCustomElement`**（本轮已接入，命中时含 `-`
的标签按原生 `ELEMENT` 解析）。
