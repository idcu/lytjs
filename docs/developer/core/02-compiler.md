# Compiler 模板编译器

编译器是将模板字符串转换为渲染函数的工具。

## 🎯 什么是编译器？

编译器的工作流程分为四个阶段：

```
模板字符串 → 解析 → AST → 转换 → 优化 → 代码生成 → 渲染函数
```

## 🏗️ 编译器架构

Compiler 模块由以下部分组成：

| 模块 | 作用 |
|------|------|
| `parse` | HTML 解析器，生成 AST |
| `transform` | AST 转换器，处理指令 |
| `optimize` | 优化器，标记静态节点 |
| `codegen` | 代码生成器，输出渲染函数 |

**源代码位置**：`packages/compiler/src/`

## 📦 核心文件

### parser/html-parser.ts

**位置**：`packages/compiler/src/parser/html-parser.ts`

使用**状态机**逐字符解析 HTML，生成 AST。

### transform/transform.ts

**位置**：`packages/compiler/src/transform/transform.ts`

遍历 AST，应用转换插件，处理各种指令。

内置转换插件：
- `transformIf` - 处理 `v-if` 条件渲染
- `transformEach` - 处理 `v-for` 列表渲染
- `transformBind` - 处理 `v-bind` 动态绑定
- `transformOn` - 处理 `v-on` 事件绑定

### optimize/optimize.ts（在 transform/optimize.ts 中）

优化器标记静态子树，提升静态节点到渲染函数外。

### codegen/codegen.ts

代码生成器将优化后的 AST 转换为可执行的代码。

## 💡 推荐阅读顺序

1. **html-parser.ts - 理解如何解析 HTML
2. **transform.ts - 理解如何转换 AST
3. **codegen.ts - 理解如何生成代码

## 🧪 测试用例

**位置**：`packages/compiler/__tests__/`

## 📚 相关文档

- [reactivity](./01-reactivity.md)
- [renderer](./03-renderer.md)
