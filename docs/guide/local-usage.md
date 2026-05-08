# 本地开发使用指南

本文档介绍在不发布到 npm 的情况下，如何在项目中使用 LytJS 的各个包。

## 目录

- [方案一：Monorepo 内部引用](#方案一monorepo-内部引用)
- [方案二：pnpm link 本地链接](#方案二pnpm-link-本地链接)
- [方案三：npm pack 本地打包](#方案三npm-pack-本地打包)
- [方案四：私有 npm 仓库](#方案四私有-npm-仓库)
- [各包使用示例](#各包使用示例)

---

## 方案一：Monorepo 内部引用

如果你将项目放在 LytJS monorepo 内部，可以直接使用 `workspace:*` 协议引用。

### 步骤

1. **在 monorepo 中创建你的应用**

```bash
# 在 lytjs 根目录下创建应用
mkdir -p apps/my-app
cd apps/my-app
pnpm init
```

2. **在 package.json 中添加依赖**

```json
{
  "name": "my-app",
  "dependencies": {
    "@lytjs/core": "workspace:*",
    "@lytjs/router": "workspace:*",
    "@lytjs/store": "workspace:*"
  }
}
```

3. **安装依赖**

```bash
# 在 monorepo 根目录执行
pnpm install
```

4. **使用包**

```typescript
import { createApp, signal } from '@lytjs/core';
import { createRouter } from '@lytjs/router';
import { defineStore } from '@lytjs/store';

// 正常使用
```

### 优点

- 开发体验最佳，热更新实时生效
- 适合 LytJS 框架本身的开发

### 缺点

- 需要将项目放在 monorepo 内部

---

## 方案二：pnpm link 本地链接

适用于独立项目，需要使用 LytJS 的本地开发版本。

### 步骤

1. **构建 LytJS 包**

```bash
# 在 lytjs 根目录
cd F:\trae\lytjs
pnpm build
```

2. **创建全局链接**

```bash
# 进入需要链接的包目录
cd packages/ecosystem/packages/router
pnpm link --global

cd ../store
pnpm link --global

cd ../../plugins/packages/plugin-vite
pnpm link --global
```

3. **在目标项目中使用链接**

```bash
cd /path/to/your-project
pnpm link --global @lytjs/router
pnpm link --global @lytjs/store
pnpm link --global @lytjs/plugin-vite
```

4. **使用包**

```typescript
// 正常 import，实际指向本地构建的包
import { createRouter } from '@lytjs/router';
```

### 优点

- 项目可以独立存在
- 可以选择性链接需要的包

### 缺点

- 需要手动管理链接
- 更新后需要重新构建

---

## 方案三：npm pack 本地打包

将 LytJS 包打包成 `.tgz` 文件，直接安装到项目中。

### 步骤

1. **构建并打包**

```bash
# 在 lytjs 根目录
cd F:\trae\lytjs
pnpm build

# 打包各个包
cd packages/ecosystem/packages/router
pnpm pack

cd ../store
pnpm pack
```

这会生成类似 `lytjs-router-6.0.0.tgz` 的文件。

2. **在项目中安装**

```bash
cd /path/to/your-project

# 使用本地 tgz 文件安装
pnpm add F:/trae/lytjs/packages/ecosystem/packages/router/lytjs-router-6.0.0.tgz
pnpm add F:/trae/lytjs/packages/ecosystem/packages/store/lytjs-store-6.0.0.tgz
```

3. **或使用 package.json 配置**

```json
{
  "dependencies": {
    "@lytjs/router": "file:F:/trae/lytjs/packages/ecosystem/packages/router/lytjs-router-6.0.0.tgz",
    "@lytjs/store": "file:F:/trae/lytjs/packages/ecosystem/packages/store/lytjs-store-6.0.0.tgz"
  }
}
```

### 优点

- 安装后与 npm 包行为一致
- 可以分享给团队成员

### 缺点

- 每次更新需要重新打包和安装

---

## 方案四：私有 npm 仓库

如果团队有私有 npm 仓库，可以发布到私有仓库。

### 步骤

1. **配置 npm 仓库**

```bash
# 设置私有仓库地址
npm config set registry https://your-private-registry.com

# 或使用 .npmrc 文件
# @lytjs:registry=https://your-private-registry.com
```

2. **发布到私有仓库**

```bash
# 在 lytjs 根目录
pnpm publish --registry https://your-private-registry.com
```

3. **在项目中安装**

```bash
pnpm add @lytjs/router @lytjs/store
```

### 优点

- 与公共 npm 包使用体验一致
- 适合团队协作

### 缺点

- 需要维护私有仓库

---

## 各包使用示例

### @lytjs/router - 路由

```typescript
import { createApp, signal } from '@lytjs/core';
import { createRouter, createWebHistory, RouterView, RouterLink } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});

const app = createApp(App);
app.use(router);
app.mount('#app');
```

### @lytjs/store - 状态管理

```typescript
import { defineStore, storeToRefs } from '@lytjs/store';
import { signal, computed } from '@lytjs/reactivity';

// Option Store 风格
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: signal(0),
  }),
  getters: {
    double: (state) => computed(() => state.count.value * 2),
  },
  actions: {
    increment() {
      this.count.value++;
    },
  },
});

// Setup Store 风格
export const useUserStore = defineStore('user', () => {
  const name = signal('');
  const isLoggedIn = computed(() => name.value !== '');

  function login(userName: string) {
    name.value = userName;
  }

  return { name, isLoggedIn, login };
});
```

### @lytjs/plugin-vite - Vite 插件

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import lytjs from '@lytjs/plugin-vite';

export default defineConfig({
  plugins: [
    lytjs({
      // 配置选项
      signalMode: true, // 启用 Signal 模式
    }),
  ],
});
```

### @lytjs/cli - CLI 工具

```bash
# 创建新项目
npm create lytjs@latest my-app

# 或使用本地版本
node F:/trae/lytjs/packages/tools/packages/cli/dist/index.mjs create my-app

# 开发模式
cd my-app
pnpm dev

# 构建
pnpm build
```

### @lytjs/devtools - 开发工具

```typescript
import { enable, getComponentTree, getSignals } from '@lytjs/devtools';

// 启用 DevTools
enable();

// 获取组件树
const tree = getComponentTree();
console.log('Component tree:', tree);

// 获取所有 Signal
const signals = getSignals();
console.log('Signals:', signals);
```

### @lytjs/test-utils - 测试工具

```typescript
import { mount, flushPromises, mockFn, waitFor } from '@lytjs/test-utils';
import { describe, it, expect } from 'vitest';
import Counter from './Counter.lyt';

describe('Counter', () => {
  it('should increment count', async () => {
    const wrapper = mount(Counter, {
      props: { initialCount: 0 },
    });

    expect(wrapper.text()).toContain('0');

    wrapper.find('button')?.click();
    await flushPromises();

    expect(wrapper.text()).toContain('1');
    wrapper.unmount();
  });

  it('should track function calls', () => {
    const onClick = mockFn();
    const wrapper = mount(Button, {
      props: { onClick },
    });

    wrapper.find('button')?.click();
    expect(onClick.calls).toHaveLength(1);
  });
});
```

---

## 推荐方案

| 场景             | 推荐方案                  |
| ---------------- | ------------------------- |
| LytJS 框架开发   | 方案一：Monorepo 内部引用 |
| 独立项目开发调试 | 方案二：pnpm link         |
| 分享给团队成员   | 方案三：npm pack          |
| 团队长期协作     | 方案四：私有 npm 仓库     |

---

## 注意事项

1. **依赖关系**：LytJS 包之间有依赖关系，确保同时安装所有需要的包
   - `@lytjs/router` 依赖 `@lytjs/core`, `@lytjs/reactivity`
   - `@lytjs/store` 依赖 `@lytjs/reactivity`
   - `@lytjs/plugin-vite` 依赖 `@lytjs/compiler`

2. **版本一致性**：使用本地包时，确保各包版本一致

3. **构建顺序**：修改源码后需要重新构建才能生效

4. **TypeScript 支持**：本地包已包含类型定义，无需额外安装 `@types/*`
