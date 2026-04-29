# @lytjs/compiler

> LytJS 模板编译器，将模板字符串编译为渲染函数

## 安装

```bash
npm install @lytjs/compiler
```

## 核心 API

### compile

将模板字符串编译为可执行的渲染函数代码

```typescript
import { compile } from '@lytjs/compiler'

const { code, ast } = compile('<div>{{ message }}</div>')
```

### parse

将模板字符串解析为 AST

```typescript
import { parse } from '@lytjs/compiler'
```

### transform

对 AST 应用转换管道（v-if、v-for、v-model 等指令处理）

```typescript
import { transform } from '@lytjs/compiler'
```

### generate

从 AST 生成渲染函数代码

```typescript
import { generate } from '@lytjs/compiler'
```

### optimize

对 AST 进行静态分析和优化标记

```typescript
import { optimize } from '@lytjs/compiler'
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口，整合所有子包
- [@lytjs/reactivity](../reactivity) - 响应式系统，编译产物依赖其 API
