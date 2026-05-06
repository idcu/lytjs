# 快速开始

## 双核心模式

LytJS 提供两种核心渲染模式，开发者可以根据项目需求选择最适合的模式：

| 模式 | 包名 | 特点 | 适用场景 |
|------|------|------|----------|
| **VNode 模式** | `@lytjs/core` | 虚拟 DOM diff，兼容性最佳 | 通用应用、复杂组件交互 |
| **Signal 模式** | `@lytjs/core-signal` | 细粒度响应式更新，性能更高 | 数据密集型应用、高频更新场景 |

两种模式共享相同的响应式 API（`ref`、`reactive`、`computed`、`watch` 等），主要区别在于渲染机制。

## 创建项目

使用 CLI 创建新项目：

```bash
npx @lytjs/cli create my-app
cd my-app
pnpm install
pnpm dev
```

CLI 会引导你选择渲染模式（VNode 或 Signal），并自动配置项目。

## 手动安装

### VNode 模式（默认）

```bash
pnpm add @lytjs/core
```

### Signal 模式

```bash
pnpm add @lytjs/core-signal
```

## 第一个应用

### VNode 模式示例

```typescript
import { createApp, ref } from '@lytjs/core';

const App = {
  setup() {
    const count = ref(0);
    const increment = () => count.value++;

    return { count, increment };
  },
  template: `
    <div>
      <h1>Hello Lyt.js!</h1>
      <p>Count: {{ count }}</p>
      <button @click="increment">+1</button>
    </div>
  `,
};

createApp(App).mount('#app');
```

### Signal 模式示例

```typescript
import { createApp, ref, computed } from '@lytjs/core-signal';

const App = {
  setup() {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    const increment = () => count.value++;

    return { count, doubled, increment };
  },
  template: `
    <div>
      <h1>Hello Lyt.js Signal!</h1>
      <p>Count: {{ count }}</p>
      <p>Doubled: {{ doubled }}</p>
      <button @click="increment">+1</button>
    </div>
  `,
};

createApp(App).mount('#app');
```

## 安全最佳实践

### XSS 防护

LytJS 默认对模板中的插值表达式进行 HTML 转义，防止 XSS 攻击：

```typescript
// 安全：自动转义
const userInput = ref('<script>alert("xss")</script>');
// 渲染结果：&lt;script&gt;alert("xss")&lt;/script&gt;
```

如需渲染原始 HTML，请使用 `v-html` 指令，但务必确保内容可信：

```html
<!-- 仅用于可信内容 -->
<div v-html="trustedHtml"></div>
```

### SSR 安全

在服务端渲染时，避免直接将用户输入嵌入模板：

```typescript
// 危险：直接使用用户输入
const html = await renderToString({
  template: `<div>${userInput}</div>` // 不安全
});

// 安全：使用响应式数据
const userInput = ref('');
const html = await renderToString({
  setup() {
    return { userInput };
  },
  template: `<div>{{ userInput }}</div>` // 自动转义
});
```

### 敏感数据处理

- 不要在前端代码中存储敏感信息（API 密钥、密码等）
- 使用环境变量管理配置，并通过 `.env.local` 排除敏感文件
- SSR 时不要将服务端敏感数据注入到客户端 hydration 数据中

```typescript
// 错误：暴露敏感信息
const API_KEY = 'sk-xxxxx'; // 不要这样做！

// 正确：使用环境变量
const API_KEY = import.meta.env.VITE_API_KEY;
```

## 下一步

- [安装](./installation) - 了解详细的安装和配置选项
- [响应式系统](./reactivity) - 深入理解响应式原理和 Signal API
- [渲染模式](./rendering-modes) - 详细了解 VNode 和 Signal 模式的区别
- [组件系统](./component) - 学习组件定义和组合
- [模板语法](./template-syntax) - 掌握模板语法
