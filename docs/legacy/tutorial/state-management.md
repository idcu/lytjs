# 状态管理

状态管理是大型应用开发中常见的需求。LytJS 提供了内置的响应式系统，同时也提供了官方的 Store 库来处理复杂的状态管理。

## 基础响应式状态

### 组件内部状态

对于简单的组件内状态，使用 `signal` 或 `ref` 即可：

```typescript
import { defineComponent, signal } from '@lytjs/core';

export default defineComponent({
  setup() {
    const count = signal(0);

    const increment = () => count(count() + 1);
    const decrement = () => count(count() - 1);

    return {
      count,
      increment,
      decrement,
    };
  },

  template: `
    <div>
      <p>Count: {{ count }}</p>
      <button @click="decrement">-</button>
      <button @click="increment">+</button>
    </div>
  `,
});
```

### 跨组件状态共享

对于跨组件共享的状态，可以使用 `provide/inject`：

```typescript
// App.vue
import { provide, signal } from '@lytjs/core'

setup() {
  const theme = signal('light')
  provide('theme', theme)
}

// Child.vue
import { inject } from '@lytjs/core'

setup() {
  const theme = inject('theme')
  return { theme }
}
```

## 使用 Store

当状态逻辑变得复杂时，建议使用官方的 Store 库。

### 安装

```bash
pnpm add @lytjs/store
```

### 创建 Store

```typescript
// stores/user.ts
import { defineStore } from '@lytjs/store';
import { signal, computed } from '@lytjs/reactivity';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    token: '',
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    userName: (state) => state.user?.name || 'Guest',
    userInitials: (state) => {
      if (!state.user?.name) return 'G';
      return state.user.name
        .split(' ')
        .map((n) => n[0])
        .join('');
    },
  },

  actions: {
    async login(credentials: Credentials) {
      this.isLoading = true;
      this.error = null;

      try {
        const response = await api.login(credentials);
        this.user = response.user;
        this.token = response.token;
        localStorage.setItem('token', response.token);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },

    logout() {
      this.user = null;
      this.token = '';
      localStorage.removeItem('token');
    },

    async fetchUser() {
      if (!this.token) return;

      this.isLoading = true;
      try {
        this.user = await api.getUser();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.isLoading = false;
      }
    },

    updateUserProfile(data: Partial<User>) {
      if (this.user) {
        this.user = { ...this.user, ...data };
      }
    },
  },
});
```

### 在组件中使用 Store

```typescript
import { useUserStore } from '@/stores/user';

export default defineComponent({
  setup() {
    const userStore = useUserStore();

    const handleLogin = async () => {
      await userStore.login({ email, password });
    };

    return {
      userStore,
      handleLogin,
    };
  },

  template: `
    <div v-if="userStore.isLoggedIn">
      <p>Welcome, {{ userStore.userName }}!</p>
      <button @click="userStore.logout">Logout</button>
    </div>
    
    <div v-else>
      <form @submit.prevent="handleLogin">
        <input v-model="email" type="email" placeholder="Email" />
        <input v-model="password" type="password" placeholder="Password" />
        <button type="submit" :disabled="userStore.isLoading">
          {{ userStore.isLoading ? 'Logging in...' : 'Login' }}
        </button>
        <p v-if="userStore.error" class="error">{{ userStore.error }}</p>
      </form>
    </div>
  `,
});
```

## 多个 Store 组合

对于大型应用，可以拆分为多个 Store：

```typescript
// stores/cart.ts
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
  }),

  getters: {
    total: (state) => state.items.reduce((sum, item) => sum + item.price, 0),
    itemCount: (state) => state.items.length,
  },

  actions: {
    addItem(item: CartItem) {
      this.items.push(item);
    },

    removeItem(itemId: string) {
      this.items = this.items.filter((item) => item.id !== itemId);
    },

    clear() {
      this.items = [];
    },
  },
});

// stores/notification.ts
export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [] as Notification[],
  }),

  actions: {
    addNotification(message: string, type: 'success' | 'error' = 'success') {
      this.notifications.push({
        id: Date.now(),
        message,
        type,
      });

      setTimeout(() => {
        this.removeNotification(notification.id);
      }, 3000);
    },

    removeNotification(id: number) {
      this.notifications = this.notifications.filter((n) => n.id !== id);
    },
  },
});
```

## Store 持久化

使用插件持久化 Store 状态：

```typescript
// stores/index.ts
import { useUserStore } from './user';
import { useCartStore } from './cart';

// 自动从 localStorage 恢复状态
const cartStore = useCartStore();
const savedCart = localStorage.getItem('cart');
if (savedCart) {
  cartStore.items = JSON.parse(savedCart);
}

// 监听变化并保存
cartStore.$subscribe((mutation, state) => {
  localStorage.setItem('cart', JSON.stringify(state.items));
});
```

## 状态管理最佳实践

### ✅ 推荐做法

```typescript
// 1. 将状态放在 Store 中，而不是组件内
export const useAppStore = defineStore('app', {
  state: () => ({ theme: 'light' }),
  actions: {
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
    }
  }
})

// 2. 使用 Getters 派生状态
getters: {
  filteredItems: (state) => state.items.filter(i => i.active),
  sortedItems: (state) => [...state.items].sort((a, b) => a.id - b.id)
}

// 3. 在 Actions 中处理异步操作
async fetchData() {
  this.loading = true
  try {
    const data = await api.fetch()
    this.data = data
  } catch (e) {
    this.error = e.message
  } finally {
    this.loading = false
  }
}
```

### ❌ 避免做法

```typescript
// 避免：直接在组件内复制 Store 状态
const cartItems = ref(cartStore.items); // 会失去响应式

// 避免：在 Store 的 actions 中进行复杂的 UI 逻辑
// UI 逻辑应该在组件中处理
```

## 下一步

- 学习 [路由导航](./routing.md)
- 查看 [表单处理](./forms.md)
- 阅读 [架构文档](../development/ARCHITECTURE.md)
