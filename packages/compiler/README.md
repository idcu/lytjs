# @lytjs/compiler

> LytJS 模板编译器，将模板字符串编译为渲染函数，支持多种编译模式

## 安装

```bash
npm install @lytjs/compiler
```

## 核心 API

### compile

将模板字符串编译为可执行的渲染函数代码

```typescript
import { compile } from '@lytjs/compiler';

const { code, ast } = compile('<div>{{ message }}</div>');
```

### parse

将模板字符串解析为 AST

```typescript
import { parse } from '@lytjs/compiler';

const ast = parse('<div class="container">{{ message }}</div>');
```

### transform

对 AST 应用转换管道（v-if、v-for、v-model 等指令处理）

```typescript
import { parse, transform, builtInTransforms } from '@lytjs/compiler';

const ast = parse(template);
transform(ast, {
  nodeTransforms: [...builtInTransforms],
});
```

### generate

从 AST 生成渲染函数代码

```typescript
import { parse, transform, generate } from '@lytjs/compiler';

const ast = parse(template);
transform(ast, options);
const { code, preamble } = generate(ast, options);
```

### optimize

对 AST 进行静态分析和优化标记（已合并到 transform 阶段，保留导出仅为向后兼容）

```typescript
import { optimize } from '@lytjs/compiler';
```

## 编译模式

编译器支持三种编译模式，通过 `CompilerOptions` 配置：

### VNode 模式（默认）

生成基于 VNode 的渲染函数，适用于传统虚拟 DOM 渲染

```typescript
import { compile } from '@lytjs/compiler';

const { code } = compile('<div>{{ message }}</div>', {
  // 默认模式，无需额外配置
});
```

### Signal 模式

生成基于 Signal 的渲染函数，实现细粒度响应式更新

```typescript
import { compile } from '@lytjs/compiler';

const { code } = compile('<div>{{ message }}</div>', {
  rendererMode: 'signal', // 或 'vapor'
});
```

### SSR 模式

生成服务端渲染代码

```typescript
import { compile } from '@lytjs/compiler';

const { code } = compile('<div>{{ message }}</div>', {
  ssrMode: true,
});
```

## 编译缓存

编译器内置 LRU 缓存机制，避免重复编译相同模板：

```typescript
import { 
  compile, 
  clearCompileCache, 
  getCompileCacheSize,
  getContentHashCacheSize 
} from '@lytjs/compiler';

// 编译结果会被缓存
compile(template, options);

// 查看缓存大小
console.log('Compile cache:', getCompileCacheSize());
console.log('Content hash cache:', getContentHashCacheSize());

// 清除缓存
clearCompileCache();
```

缓存特性：
- 最大缓存 100 条编译结果
- 使用内容哈希作为缓存键
- 支持自定义转换时不使用缓存

## 安全验证

编译器提供安全验证机制：

```typescript
import { compile, setWarningLevel, getWarningLevel } from '@lytjs/compiler';

// 设置警告级别
setWarningLevel('silent'); // 'silent' | 'error' | 'warn'
console.log(getWarningLevel()); // 'silent'

// 编译时会根据警告级别处理问题
const { code } = compile(template);
```

警告级别：
- `silent` - 静默所有警告
- `error` - 将警告视为错误
- `warn` - 输出警告（默认）

## 指令转换

### 内置指令

```typescript
import { 
  transformIf, 
  transformFor, 
  transformOnce,
  transformSlot,
  transformBind,
  transformOn,
  transformModel,
  transformShow,
  transformVMemo
} from '@lytjs/compiler';
```

### 自定义指令转换

```typescript
import { compile, type DirectiveTransform } from '@lytjs/compiler';

const myDirective: DirectiveTransform = (dir, node, context) => {
  // 自定义转换逻辑
  return {
    props: [],
    needRuntime: false,
  };
};

const { code } = compile(template, {
  directiveTransforms: {
    'my-directive': myDirective,
  },
});
```

## AST 辅助函数

```typescript
import {
  createRoot,
  createElement,
  createText,
  createComment,
  createInterpolation,
  createAttribute,
  createDirective,
  createSimpleExpression,
  createCompoundExpression,
  createVNodeCall,
  createObjectExpression,
  createObjectProperty,
  createCallExpression,
  createConditionalExpression,
  createArrayExpression
} from '@lytjs/compiler';
```

## Source Map 支持

```typescript
import { SourceMapGenerator, createSourceMapGenerator } from '@lytjs/compiler';

const sourceMap = createSourceMapGenerator(options);
```

## 子路径入口

```typescript
// Signal 模式代码生成
import { generateSignal } from '@lytjs/compiler/signal';

// SSR 模式代码生成
import { generateSSR } from '@lytjs/compiler/ssr';

// SFC 解析和编译
import { parseSFC, compileSFC } from '@lytjs/compiler/sfc';

// WASM 编译器
import { wasmCompile } from '@lytjs/compiler/wasm';
```

## 类型定义

```typescript
import type {
  RootNode,
  ElementNode,
  TextNode,
  CommentNode,
  InterpolationNode,
  AttributeNode,
  DirectiveNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  VNodeCall,
  CompilerOptions,
  ParserOptions,
  TransformOptions,
  CodegenOptions,
  TransformContext,
  CodegenResult,
  NodeTransform,
  DirectiveTransform,
  BindingMetadata,
  SourceLocation
} from '@lytjs/compiler';
```

## 常量

```typescript
import {
  NodeTypes,
  ElementTypes,
  ConstantTypes,
  TagType,
  TextModes,
  BindingTypes,
  PatchFlags,
  helperNameMap
} from '@lytjs/compiler';
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口，整合所有子包
- [@lytjs/reactivity](../reactivity) - 响应式系统，编译产物依赖其 API
- [@lytjs/renderer](../renderer) - 渲染后端，执行编译产物
