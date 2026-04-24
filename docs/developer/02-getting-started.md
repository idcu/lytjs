# 快速开始 - 小白入门

欢迎来到 Lyt.js 开发者文档！这篇文档将带你从零开始了解 Lyt.js。

## 🚀 第一步：了解项目结构

先看看项目的目录结构：

```
lytjs/
├── packages/              # 核心包（重要！）
│   ├── reactivity/        # 响应式系统
│   ├── compiler/          # 模板编译器
│   ├── renderer/          # 渲染器
│   ├── component/         # 组件系统
│   ├── core/              # 核心入口
│   ├── router/            # 路由
│   ├── store/             # 状态管理
│   ├── cli/               # 命令行工具
│   └── agg/               # 聚合包
├── benchmarks/            # 性能基准
├── docs/                  # 文档（你在这里）
│   ├── api/              # API 参考
│   └── developer/        # 开发者文档
└── examples/             # 示例
```

## 📦 第二步：安装依赖

Lyt.js 使用 pnpm 作为包管理器：

```bash
# 安装 pnpm（如果还没有）
npm install -g pnpm

# 进入项目目录
cd lytjs

# 安装依赖
pnpm install
```

## 🛠️ 第三步：构建项目

```bash
# 构建所有包
pnpm build

# 运行测试
pnpm test
```

## 💡 第四步：理解各模块的作用

让我们从最简单的开始，逐个了解核心模块。

### 1. Reactivity（响应式系统）

Reactivity 是最基础的模块，让数据变化时自动更新。

```typescript
import { reactive, effect } from '@lytjs/reactivity';

// 创建响应式对象
const state = reactive({ count: 0 });

// 创建副作用
effect(() => {
  console.log('count is:', state.count);
});

// 修改数据，自动触发副作用
state.count++;
// 输出: count is: 1
```

**文件位置**：`packages/reactivity/src/`

主要文件：
- `reactive.ts` - Proxy 代理实现
- `ref.ts` - Ref 实现
- `effect.ts` - 副作用和依赖收集
- `computed.ts` - 计算属性
- `watch.ts` - 侦听器

**阅读顺序**：`effect.ts` → `reactive.ts` → `ref.ts` → `computed.ts` → `watch.ts`

### 2. Compiler（模板编译器）

Compiler 将模板字符串转换为渲染函数。

```typescript
import { compile } from '@lytjs/compiler';

const template = `<div>{{ title }}</div>`;
const { code } = compile(template);

// 生成的代码类似于:
// h('div', null, _ctx.title)
```

**文件位置**：`packages/compiler/src/`

主要文件：
- `parser/html-parser.ts` - HTML 解析器
- `transform/transform.ts` - AST 转换器
- `optimize/optimize.ts` - 优化器（在 transform 目录下）
- `codegen/codegen.ts` - 代码生成器

### 3. Renderer（渲染器）

Renderer 负责将虚拟 DOM 渲染为真实 DOM。

```typescript
import { createRenderer } from '@lytjs/renderer';

const renderer = createRenderer({
  // 创建元素
  createElement(tag) {
    return document.createElement(tag);
  },
  // 设置文本
  setText(node, text) {
    node.textContent = text;
  },
  // 挂载
  insert(el, parent) {
    parent.appendChild(el);
  }
});

// 渲染虚拟 DOM
renderer.render(vnode, container);
```

**文件位置**：`packages/renderer/src/`

### 4. Component（组件系统）

Component 提供组件化开发能力。

```typescript
import { defineComponent, h } from '@lytjs/component';

const MyComponent = defineComponent({
  props: ['title'],
  setup(props) {
    return () => h('div', props.title);
  }
});
```

**文件位置**：`packages/component/src/`

### 5. Core（核心入口）

Core 提供统一的入口点，整合各个模块。

```typescript
import { createApp, h } from '@lytjs/core';

const app = createApp({
  render() {
    return h('div', 'Hello Lyt.js');
  }
});

app.mount('#app');
```

**文件位置**：`packages/core/src/`

## 🎯 第五步：选择你感兴趣的模块

根据你的兴趣选择一个模块深入研究：

| 如果你想... | 推荐模块 |
|------------|---------|
| 了解响应式原理 | [reactivity](./core/01-reactivity.md) |
| 理解模板编译 | [compiler](./core/02-compiler.md) |
| 学习虚拟 DOM | [renderer](./core/03-renderer.md) |
| 组件化开发 | [component](./core/04-component.md) |
| 路由实现 | [router](./feature/01-router.md) |
| 状态管理 | [store](./feature/02-store.md) |

## 🧪 第六步：运行和调试

### 1. 查看示例

```bash
cd examples/[示例名]
npm install
npm run dev
```

### 2. 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
cd packages/reactivity
pnpm test
```

### 3. 调试代码

你可以使用 Node.js 的调试功能：

```bash
# 启动调试
node --inspect-brk your-script.js

# 然后在 Chrome 中打开 chrome://inspect
```

或者在 VS Code 中使用调试器。

## 📝 第七步：尝试修改代码

从简单的修改开始：

1. **修改响应式系统** - 添加一个新的工具函数
2. **修改编译器** - 添加一个新的指令
3. **修改渲染器** - 添加一个新的平台支持
4. **修改组件系统** - 添加一个新的内置组件

修改后记得运行测试确保功能正常。

## 🤝 第八步：参与贡献

当你对代码有足够了解后，可以：

1. Fork 项目
2. 创建分支
3. 提交代码
4. 创建 Pull Request

详细的贡献指南请查看 [CONTRIBUTING.md](../../CONTRIBUTING.md)。

## 📚 下一步

现在你已经了解了项目结构，接下来可以：

- 阅读 [架构总览](./01-architecture-overview.md) 了解整体设计
- 深入研究你感兴趣的模块文档
- 查看源代码中的注释和测试
