# 编译器架构

深入解析 `@lytjs/compiler` 的编译流程。

---

## 编译流程

```
源码 (Template)
     ↓
┌─────────┐
│  Parse  │  → AST (抽象语法树)
└─────────┘
     ↓
┌──────────┐
│ Transform │  → 转换后的 AST (带代码生成信息)
└──────────┘
     ↓
┌───────────┐
│  Generate │  → 渲染函数代码
└───────────┘
     ↓
渲染函数
```

---

## Parse (解析)

### 解析器任务

1. **词法分析** — 源码 → Token 流
2. **语法分析** — Token 流 → AST

### AST 节点类型

```ts
enum NodeTypes {
  ELEMENT = 1
  TEXT = 2
  INTERPOLATION = 3          // {{ xxx }}
  SIMPLE_EXPRESSION = 4      // 简单表达式
  COMPOUND_EXPRESSION = 5    // 复合表达式
  DIRECTIVE = 6              // 指令
  IF = 7
  FOR = 8
  SLOT = 9
  TEXT_CALL = 10
  VNODE_CALL = 11           // VNode 调用
}
```

---

## Transform (转换)

Transform 阶段为 AST 节点添加代码生成信息。

### 关键 Transform

| Transform                | 说明                      |
| ------------------------ | ------------------------- |
| `transformElement`       | 处理元素节点              |
| `transformText`          | 处理文本节点              |
| `transformInterpolation` | 处理插值                  |
| `transformDirective`     | 处理指令 (v-if, v-for 等) |
| `transformBind`          | 处理 `:prop` 绑定         |
| `transformOn`            | 处理 `@event` 事件        |
| `transformModel`         | 处理 `v-model`            |
| `transformShow`          | 处理 `v-show`             |
| `transformFor`           | 处理 `v-for`              |
| `transformIf`            | 处理 `v-if`               |

### PatchFlags 生成

```ts
// transformElement 中
if (hasDynamicClass) {
  node.flag |= PatchFlags.CLASS;
}
if (hasDynamicStyle) {
  node.flag |= PatchFlags.STYLE;
}
if (hasDynamicProps) {
  node.flag |= PatchFlags.PROPS;
}
```

---

## Generate (代码生成)

### 生成策略

LytJS 支持多种代码生成策略：

| 模式       | 目标            | 用途            |
| ---------- | --------------- | --------------- |
| **VNode**  | `createVNode()` | VNode 模式渲染  |
| **Signal** | Signal 赋值     | Signal 模式渲染 |
| **SSR**    | 字符串拼接      | 服务端渲染      |
| **WASM**   | WASM 二进制     | 高性能编译      |

### VNode 模式生成

```ts
// 源码
<div class="container">
  <span>{{ message }}</span>
</div>

// 生成的代码
const _VueElementDiv = _createVNode('div', {
  class: "container"
}, null)

const _VueElementSpan = _createVNode('span', null, [_toDisplayString(message)])
_createVNode(_Fragment, null, [_VueElementDiv, _VueElementSpan])
```

### Signal 模式生成

```ts
// 源码
<div>{{ message }}</div>

// 生成的代码
_element('div')
_text(_toDisplayString(message))
```

---

## 缓存机制

### 模板缓存

```ts
const compileCache = new Map<string, CompiledResult>();

function compile(template: string, options?: CompilerOptions): CompiledResult {
  const cacheKey = template + JSON.stringify(options);

  if (compileCache.has(cacheKey)) {
    return compileCache.get(cacheKey);
  }

  const result = doCompile(template, options);
  compileCache.set(cacheKey, result);
  return result;
}
```

### 编译时优化

1. **静态提升** — 不变的代码提取到渲染函数外
2. **缓存事件处理函数** — 避免每次渲染创建新函数
3. **Block Tree** — 减少动态节点比较

---

## SFC 编译

### .vue 文件结构

```vue
<template>
  <!-- 编译为渲染函数 -->
</template>

<script setup>
// 编译为 setup() 函数
</script>

<style>
/* 保持原样或提取 */
</style>
```

### 编译输出

```ts
// .vue 编译后的结构
{
  descriptor: {
    template: { ast: AST, code: string },
    script: { content: string, lang: 'ts' },
    styles: [{ content: string, scoped: boolean }]
  }
}
```

---

## 扩展阅读

- [API 参考 - compiler](../api/compiler) — 完整 API 文档
- [模板语法](../guide/template-syntax) — 模板语法参考
- [SSR](../guide/ssr) — SSR 编译模式
