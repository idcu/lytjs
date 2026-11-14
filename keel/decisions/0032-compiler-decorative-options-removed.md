---
scope: compiler
status: active
last-verified: 2026-11-14
keywords: [编译器, 选项, 装饰性, 公开 API, 删除, C-14]
type: decision
created: 2026-11-14
superseded-by:
---

# ADR 0032 · 删除编译器四个「声明存在但从未生效」的选项

- 状态：**已批准**（owner 2026-11-14 授权 C-14 方案，包含本删除清单）。
- 范围：仅删除下列四个选项的**类型声明**；不删除任何逻辑，因为不存在读取点。

## 背景

编译器审计 C-14 发现：`CompilerOptions`（含 `ParserOptions` / `TransformOptions`）
中有若干字段只出现在 `types.ts` 与文档里，`src` 内没有任何读取点。
调用方传入这些字段不会改变任何行为——它们是「装饰性选项」，
会让人误以为存在尚未连接的扩展能力。

本轮对四个字段逐项做了删除前确认：

| 选项 | 声明位置 | src 读取点 | 测试引用 | 文档引用 |
| --- | --- | --- | --- | --- |
| `ParserOptions.isNativeTag` | `types.ts` | 0 | 0 | 仅选项文档 |
| `ParserOptions.decodeEntities` | `types.ts` | 0 | 0 | 仅选项文档 |
| `TransformOptions.bindingMetadata` | `types.ts` | 0 | 0 | 仅选项文档 |
| `TransformOptions.isCustomElement` | `types.ts` | 0 | 0 | 仅选项文档 |

确认方式：全仓（排除 `dist/`）检索字段名，并复核 `options.<key>` 与解构读取；
`packages/compiler/src/index.ts` 的命中仅为注释与「函数/对象整体跳过缓存」的
通用判定（`hasUncacheableOptions` 按 `typeof` 遍历，不读具体键），不构成读取点。
`BindingMetadata` **类型本身**仍从 `packages/compiler/src/index.ts` 导出，
不在本删除范围内。

## 决定

删除上述四个字段的声明，并同步 `docs/api/compiler.md`。

**删除不改变任何可达行为**：没有任何代码读取这些字段，删除前后对相同输入
产出的 AST / codegen / SSR 结果完全一致。对调用方的唯一影响是：再传这些字段
会得到 TypeScript 的「对象字面量未知属性」报错，从而在编译期暴露此前的无效配置。

## 被否掉的选项

| 选项 | 为什么没选 |
| --- | --- |
| 保留声明并逐个实现 | 四个字段均缺少明确的消费语义（实体解码、原生标签判定、绑定元数据、transform 侧自定义元素），实现等于新增功能，超出缺陷修复范围 |
| 保留声明并标 `@deprecated` | 会继续误导调用方「传了有效果」；且无迁移路径（从未生效，无需迁移） |
| 同时删除 `BindingMetadata` 类型导出 | 属于额外的公开导出收缩，owner 未批准；且类型可被用户独立使用 |

## 后果

- 好处：公开选项面与真实能力一致；后续「零读取点」门禁可直接覆盖这些名字。
- 代价：依赖 `Record<string, unknown>` 方式透传这些字段的代码在类型检查时会报错；
  运行时无影响。属于预期内的编译期暴露。
- 防回归：后续门禁要求每个公开选项字段在 `src` 至少有一个真实读取点，
  零读取点即红（C-14 第 3 条）。
