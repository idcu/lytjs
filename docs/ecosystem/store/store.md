# @lytjs/store

> LytJS 基于 Signal 的状态管理库，支持 Option Store 和 Setup Store 模式。

[![npm version](https://img.shields.io/npm/v/@lytjs/store.svg)](https://www.npmjs.com/package/@lytjs/store)
[![license](https://img.shields.io/npm/l/@lytjs/store.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介

`@lytjs/store` 是 LytJS 框架的官方状态管理库，灵感来源于 Pinia，专为 LytJS 的响应式 Signal 系统设计。它提供了简洁而强大的状态管理方案，支持两种定义风格：Option Store 和 Setup Store。

### 核心特性

- **双模式定义**：支持 Option Store 和 Setup Store 两种定义方式
- **完全类型安全**：完整的 TypeScript 类型推导
- **极小的打包体积**：零外部依赖
- **响应式集成**：深度集成 LytJS Signal 响应式系统
- **插件系统**：支持自定义插件扩展
- **DevTools 支持**：与 @lytjs/devtools 无缝集成
- **自动订阅**：组件中自动订阅，卸载时自动取消

## 安装

```bash
npm install @lytjs/store
```

或使用 pnpm：

```bash
pnpm add @lytjs/store
```

## 依赖关系

`@lytjs/store` 依赖以下 LytJS 核心包：

- `@lytjs/reactivity` - 响应式系统
- `@lytjs/component` - 组件系统
- `@lytjs/common-is` - 工具函数
- `@lytjs/common-object` - 对象工具函数

## 快速开始

### 初始化 Pinia

```typescript
import { createPinia } from '@lytjs/store';

const pinia = createPinia();

export { pinia };
```

### 在应用中使用

```typescript
import { mount } from '@lytjs/vdom';
import App from './App';
import { pinia } from './stores';

const app = mount(document.getElementById('app'), App, {
  plugins: [pinia],
});
```

## Option Store 模式

使用选项式 API 定义 Store，适合简单到中等复杂度的状态管理。

### 定义 Store

```typescript
import { defineStore } from '@lytjs/store';

export const useUserStore = defineStore('user', {
  state: () => ({
    id: '',
    name: '',
    email: '',
    avatar: '',
    isLoggedIn: false,
    permissions: [],
  }),

  getters: {
    displayName: (state) => state.name || state.email || '匿名用户',
    isAdmin: (state) => state.permissions.includes('admin'),
    hasPermission: (state) => (permission: string) => state.permissions.includes(permission),
  },

  actions: {
    async login(credentials: { email: string; password: string }) {
      const response = await api.login(credentials);
      this.id = response.user.id;
      this.name = response.user.name;
      this.email = response.user.email;
      this.avatar = response.user.avatar;
      this.isLoggedIn = true;
      this.permissions = response.user.permissions;
    },

    logout() {
      this.id = '';
      this.name = '';
      this.email = '';
      this.avatar = '';
      this.isLoggedIn = false;
      this.permissions = [];
    },

    updateProfile(data: Partial<{ name: string; avatar: string }>) {
      if (data.name) this.name = data.name;
      if (data.avatar) this.avatar = data.avatar;
    },
  },
});
```

### 使用 Store

```typescript
import { useUserStore } from './stores/user';

export function UserProfile() {
  const userStore = useUserStore();

  return () => (
    <div class="user-profile">
      <img src={userStore.avatar} alt={userStore.name} />
      <h1>{userStore.displayName}</h1>
      {userStore.isAdmin && <span class="badge">管理员</span>}
      <button onClick={() => userStore.logout()}>退出登录</button>
    </div>
  );
}
```

## Setup Store 模式

使用组合式函数定义 Store，适合复杂的状态逻辑和复用。

### 定义 Store

```typescript
import { defineStore } from '@lytjs/store';
import { ref, computed } from '@lytjs/reactivity';

export const useCartStore = defineStore('cart', () => {
  const items = ref([]);
  const couponCode = ref('');

  const itemCount = computed(() => items.value.length);

  const totalPrice = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  const discountedPrice = computed(() => {
    if (couponCode.value === 'SAVE10') {
      return totalPrice.value * 0.9;
    }
    if (couponCode.value === 'SAVE20') {
      return totalPrice.value * 0.8;
    }
    return totalPrice.value;
  });

  function addItem(product: { id: string; name: string; price: number }) {
    const existing = items.value.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      items.value.push({ ...product, quantity: 1 });
    }
  }

  function removeItem(productId: string) {
    const index = items.value.findIndex((item) => item.id === productId);
    if (index !== -1) {
      items.value.splice(index, 1);
    }
  }

  function updateQuantity(productId: string, quantity: number) {
    const item = items.value.find((item) => item.id === productId);
    if (item) {
      if (quantity <= 0) {
        removeItem(productId);
      } else {
        item.quantity = quantity;
      }
    }
  }

  function applyCoupon(code: string) {
    couponCode.value = code;
  }

  function clearCart() {
    items.value = [];
    couponCode.value = '';
  }

  async function checkout() {
    const order = await api.createOrder({
      items: items.value,
      total: discountedPrice.value,
    });
    clearCart();
    return order;
  }

  return {
    items,
    couponCode,
    itemCount,
    totalPrice,
    discountedPrice,
    addItem,
    removeItem,
    updateQuantity,
    applyCoupon,
    clearCart,
    checkout,
  };
});
```

### 使用 Store

```typescript
import { useCartStore } from './stores/cart';

export function ShoppingCart() {
  const cartStore = useCartStore();

  return () => (
    <div class="cart">
      <h2>购物车 ({cartStore.itemCount})</h2>

      <div class="items">
        {cartStore.items.map(item => (
          <div key={item.id} class="cart-item">
            <span>{item.name}</span>
            <span>¥{item.price}</span>
            <input
              type="number"
              value={item.quantity}
              onInput={(e) => cartStore.updateQuantity(item.id, +e.target.value)}
            />
            <button onClick={() => cartStore.removeItem(item.id)}>删除</button>
          </div>
        ))}
      </div>

      <div class="coupon">
        <input
          placeholder="输入优惠码"
          value={cartStore.couponCode}
          onInput={(e) => cartStore.applyCoupon(e.target.value)}
        />
      </div>

      <div class="totals">
        <p>原价: ¥{cartStore.totalPrice.toFixed(2)}</p>
        <p>折后价: ¥{cartStore.discountedPrice.toFixed(2)}</p>
      </div>

      <button onClick={() => cartStore.checkout()}>结算</button>
    </div>
  );
}
```

## 主要 API

### `defineStore(id, options)`

定义 Option Store。

```typescript
import { defineStore } from '@lytjs/store';

const useStore = defineStore('storeId', {
  state: () => ({ count: 0 }),
  getters: {
    /* ... */
  },
  actions: {
    /* ... */
  },
});
```

### `defineStoresetupFn)`

定义 Setup Store。

```typescript
import { defineStore } from '@lytjs/store';

const useStore = defineStore('storeId', () => {
  const count = ref(0);
  const doubled = computed(() => count.value * 2);

  function increment() {
    count.value++;
  }

  return { count, doubled, increment };
});
```

### `createPinia()`

创建 Pinia 实例。

```typescript
import { createPinia } from '@lytjs/store';

const pinia = createPinia({
  plugins: [logPlugin],
  depGroups: {},
});
```

### `storeToRefs(store)`

将 Store 状态转换为响应式引用。

```typescript
import { storeToRefs } from '@lytjs/store';

const store = useStore();
const { name, isActive } = storeToRefs(store);
```

### `getActivePinia()`

获取当前活跃的 Pinia 实例。

```typescript
import { getActivePinia } from '@lytjs/store';

const pinia = getActivePinia();
```

### `setActivePinia(pinia)`

设置当前活跃的 Pinia 实例。

```typescript
import { setActivePinia } from '@lytjs/store';

setActivePinia(pinia);
```

### `clearStoreCache()`

清除 Store 缓存。

```typescript
import { clearStoreCache } from '@lytjs/store';

clearStoreCache();
```

## 插件系统

### 创建插件

```typescript
import { defineStore } from '@lytjs/store';
import type { PiniaPlugin } from '@lytjs/store';

const persistPlugin: PiniaPlugin = ({ store, options }) => {
  const savedState = localStorage.getItem(store.$id);
  if (savedState) {
    store.$patch(JSON.parse(savedState));
  }

  store.$subscribe((mutation, state) => {
    localStorage.setItem(store.$id, JSON.stringify(state));
  });
};
```

### 使用插件

```typescript
import { createPinia } from '@lytjs/store';

const pinia = createPinia({
  plugins: [persistPlugin],
});
```

## Store 实例方法

```typescript
const store = useStore();

// 读取状态
store.$state.count;

// 更新状态
store.$patch({ count: 10 });
store.$patch((state) => {
  state.count++;
});

// 重置状态
store.$reset();

// 替换状态
store.$state = { count: 0 };

// 订阅变化
store.$subscribe((mutation, state) => {
  console.log('状态变化:', mutation.type);
});

// 订阅动作
store.$onAction((context) => {
  console.log('动作执行:', context.name);
});

// 持久化
store.$persist();
```

## TypeScript 类型

```typescript
interface Store<G = any, S = any, A = any> {
  $id: string;
  $state: S;
  $ getters: G;
  $actions: A;
  $patch: (partial: Partial<S> | ((state: S) => void)) => void;
  $reset: () => void;
  $subscribe: (callback: SubscriptionCallback<S>) => () => void;
  $onAction: (callback: ActionCallback<S, A>) => () => void;
  $persist: () => void;
}
```

## 最佳实践

### Store 命名

```typescript
// ✅ 推荐：使用 use 前缀
const useUserStore = defineStore('user', {
  /* ... */
});
const useCartStore = defineStore('cart', {
  /* ... */
});

// ❌ 避免：不使用 use 前缀
const useUser = defineStore('user', {
  /* ... */
});
```

### 状态结构

```typescript
// ✅ 推荐：使用扁平状态结构
state: () => ({
  user: { id: '', name: '', email: '' },
  preferences: { theme: 'light', language: 'zh-CN' },
});

// ❌ 避免：过深的嵌套
state: () => ({
  app: {
    user: {
      profile: {
        name: '',
      },
    },
  },
});
```

### 动作命名

```typescript
// ✅ 推荐：使用动词前缀
actions: {
  fetchUser() { /* 获取用户 */ },
  updateUser() { /* 更新用户 */ },
  deleteUser() { /* 删除用户 */ }
}
```

## 浏览器兼容性

`@lytjs/store` 支持所有现代浏览器。如果需要支持旧版浏览器，可能需要引入 polyfill。

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
