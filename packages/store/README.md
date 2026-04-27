# @lytjs/store

Lyt.js 状态管理 - Pinia 风格的简单直观的状态管理库。

## 安装

```bash
npm install @lytjs/store

# 或使用 pnpm
pnpm add @lytjs/store
```

## 特性

- 🚀 DevTools 支持
- 🔄 热模块替换 (HMR)
- 📦 插件系统
- 🎯 TypeScript 友好
- 🔌 零运行时依赖
- 💾 可通过插件支持持久化

## 快速开始

```javascript
import { defineStore } from '@lytjs/store';

// 1. 定义 Store
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'Lyt.js'
  }),
  getters: {
    doubleCount: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++;
    },
    async fetchData() {
      const res = await api.get('/data');
      this.data = res.data;
    }
  }
});

// 2. 在组件中使用
import { useCounterStore } from './store';

const counter = useCounterStore();

counter.increment();
console.log(counter.count);
console.log(counter.doubleCount);
```

## 组合式 Store

```javascript
import { defineStore } from '@lytjs/store';
import { ref, computed } from '@lytjs/reactivity';

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0);
  const name = ref('Lyt.js');
  const doubleCount = computed(() => count.value * 2);

  function increment() {
    count.value++;
  }

  return { count, name, doubleCount, increment };
});
```

## 核心概念

### State

```javascript
export const useStore = defineStore('main', {
  state: () => ({
    counter: 0,
    user: null
  })
});
```

### Getters

```javascript
export const useStore = defineStore('main', {
  state: () => ({ counter: 0 }),
  getters: {
    doubleCount: (state) => state.counter * 2,
    doublePlusOne() {
      return this.doubleCount + 1;
    }
  }
});
```

### Actions

```javascript
export const useStore = defineStore('main', {
  state: () => ({ counter: 0 }),
  actions: {
    increment() {
      this.counter++;
    },
    randomizeCounter() {
      this.counter = Math.round(100 * Math.random());
    }
  }
});
```

## 在 Setup 中使用

```javascript
import { useCounterStore } from '@/stores/counter';
import { storeToRefs } from '@lytjs/store';

export default {
  setup() {
    const store = useCounterStore();

    // 直接读取
    store.increment();

    // 解构，保持响应式
    const { count, doubleCount } = storeToRefs(store);
    const { increment } = store;

    return { count, doubleCount, increment };
  }
};
```

## 订阅 State

```javascript
const store = useStore();

// 订阅 state 的变化
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log(mutation);
  localStorage.setItem('cart', JSON.stringify(state));
});

// 订阅 actions 的调用
const unsubscribeAction = store.$onAction(({ name, after, onError }) => {
  console.log(`Action ${name} called`);
  
  after((result) => {
    console.log(`Action ${name} finished with result:`, result);
  });
  
  onError((error) => {
    console.error(`Action ${name} failed:`, error);
  });
});
```

## 插件

```javascript
import { createPinia } from '@lytjs/store';

const pinia = createPinia();

// 持久化插件示例
function localStoragePlugin(context) {
  const { store } = context;
  
  const savedState = localStorage.getItem(store.$id);
  if (savedState) {
    store.$patch(JSON.parse(savedState));
  }
  
  store.$subscribe((mutation, state) => {
    localStorage.setItem(store.$id, JSON.stringify(state));
  });
}

pinia.use(localStoragePlugin);
```

## DevTools

```javascript
import { createPinia } from '@lytjs/store';

const pinia = createPinia();

// 启用 DevTools
pinia.use(({ store }) => {
  store.$onAction(({ name, after }) => {
    after(() => {
      console.log(`[Store] ${name}`);
    });
  });
});
```

## 示例

### 完整示例

```javascript
import { defineStore } from '@lytjs/store';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    token: null
  }),
  
  getters: {
    userName: (state) => state.user?.name,
    isLoggedIn: (state) => state.isAuthenticated
  },
  
  actions: {
    async login(credentials) {
      try {
        const response = await api.post('/login', credentials);
        this.user = response.data.user;
        this.token = response.data.token;
        this.isAuthenticated = true;
        localStorage.setItem('token', this.token);
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    },
    
    logout() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      localStorage.removeItem('token');
    }
  }
});
```

### 组合式 API 示例

```javascript
import { defineStore } from '@lytjs/store';
import { ref, computed } from '@lytjs/reactivity';

export const useTodoStore = defineStore('todo', () => {
  const todos = ref([]);
  
  const completedTodos = computed(() => 
    todos.value.filter(todo => todo.completed)
  );
  
  const pendingTodos = computed(() => 
    todos.value.filter(todo => !todo.completed)
  );
  
  function addTodo(text) {
    todos.value.push({
      id: Date.now(),
      text,
      completed: false
    });
  }
  
  function toggleTodo(id) {
    const todo = todos.value.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  }
  
  return { todos, completedTodos, pendingTodos, addTodo, toggleTodo };
});
```

## 性能

- 轻量级，零运行时依赖
- 基于 Proxy 的响应式系统
- 高效的订阅机制

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
