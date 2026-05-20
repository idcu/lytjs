# @lytjs/compat

> LytJS Vue 2/3 兼容性层，为从 Vue 项目迁移到 LytJS 提供平滑过渡支持。

[![npm version](https://img.shields.io/npm/v/@lytjs/compat.svg)](https://www.npmjs.com/package/@lytjs/compat)
[![license](https://img.shields.io/npm/l/@lytjs/compat.svg)](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 简介

`@lytjs/compat` 是 LytJS 框架的官方兼容性层包，旨在帮助开发团队从 Vue 2 或 Vue 3 项目平滑迁移到 LytJS。它提供了一系列兼容性适配器、生命周期钩子映射、状态管理兼容层和路由兼容工具，最大程度地减少迁移成本。

### 核心特性

- **生命周期兼容**：自动映射 Vue 2/3 生命周期钩子到 LytJS
- **Vuex 兼容层**：`mapState`、`mapGetters`、`mapActions` 等工具函数
- **Vue Router 兼容**：路由守卫命名和参数映射
- **响应式 API 兼容**：Vue 响应式 API 到 LytJS Signal 的桥接
- **零运行时开销**：生产环境自动剥离兼容代码
- **渐进式迁移**：支持部分迁移，逐步替换

## 安装

```bash
npm install @lytjs/compat
```

或使用 pnpm：

```bash
pnpm add @lytjs/compat
```

## 依赖关系

`@lytjs/compat` 依赖以下 LytJS 核心包：

- `@lytjs/core` - 核心运行时
- `@lytjs/component` - 组件系统
- `@lytjs/reactivity` - 响应式系统

## 快速开始

### 启用兼容性模式

```typescript
import { enableCompat } from '@lytjs/compat';

enableCompat({
  vue2Mode: true,
  vue3Mode: false,
});
```

### 在组件中使用 Vue 生命周期

```typescript
import { defineComponent } from '@lytjs/compat';

export const MyComponent = defineComponent({
  // Vue 2/3 生命周期钩子自动映射到 LytJS
  beforeCreate() {
    console.log('组件创建前');
  },

  created() {
    console.log('组件已创建');
  },

  beforeMount() {
    console.log('组件挂载前');
  },

  mounted() {
    console.log('组件已挂载');
    this.$refs.input.focus();
  },

  beforeUpdate() {
    console.log('组件更新前');
  },

  updated() {
    console.log('组件已更新');
  },

  beforeUnmount() {
    console.log('组件卸载前');
  },

  unmounted() {
    console.log('组件已卸载');
  },

  render() {
    return <div>Hello LytJS</div>;
  }
});
```

## 生命周期钩子映射

### Vue 2 → LytJS 映射

| Vue 2 钩子      | LytJS 对应        |
| --------------- | ----------------- |
| `beforeCreate`  | `onBeforeInit`    |
| `created`       | `onInit`          |
| `beforeMount`   | `onBeforeMount`   |
| `mounted`       | `onMounted`       |
| `beforeUpdate`  | `onBeforeUpdate`  |
| `updated`       | `onUpdated`       |
| `beforeDestroy` | `onBeforeUnmount` |
| `destroyed`     | `onUnmounted`     |
| `errorCaptured` | `onErrorCaptured` |

### Vue 3 → LytJS 映射

| Vue 3 钩子          | LytJS 对应          |
| ------------------- | ------------------- |
| `setup`             | `onInit`            |
| `onMounted`         | `onMounted`         |
| `onUpdated`         | `onUpdated`         |
| `onUnmounted`       | `onUnmounted`       |
| `onErrorCaptured`   | `onErrorCaptured`   |
| `onRenderTracked`   | `onRenderTracked`   |
| `onRenderTriggered` | `onRenderTriggered` |

### 使用示例

```typescript
import { defineComponent } from '@lytjs/compat';

export const DataFetcher = defineComponent({
  data() {
    return {
      users: [],
      loading: false
    };
  },

  async created() {
    this.loading = true;
    this.users = await fetchUsers();
    this.loading = false;
  },

  beforeDestroy() {
    console.log('清理资源');
  },

  render() {
    if (this.loading) {
      return <div>加载中...</div>;
    }
    return (
      <ul>
        {this.users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    );
  }
});
```

## Vuex 兼容层

### mapState

将 Vuex store 状态映射到组件。

```typescript
import { mapState } from '@lytjs/compat';
import { useStore } from '@lytjs/store';

export const UserProfile = defineComponent({
  computed: {
    ...mapState('user', {
      userName: 'name',
      userEmail: 'email',
      isAdmin: (state) => state.permissions.includes('admin')
    })
  },

  render() {
    return (
      <div>
        <p>姓名: {this.userName}</p>
        <p>邮箱: {this.userEmail}</p>
        {this.isAdmin && <span>管理员</span>}
      </div>
    );
  }
});
```

### mapGetters

映射 Vuex getters。

```typescript
import { mapGetters } from '@lytjs/compat';

export const ProductList = defineComponent({
  computed: {
    ...mapGetters('product', {
      sortedProducts: 'sortedList',
      totalPrice: 'cartTotal'
    })
  },

  render() {
    return (
      <div>
        <p>总价: ¥{this.totalPrice}</p>
        {this.sortedProducts.map(p => (
          <ProductItem key={p.id} product={p} />
        ))}
      </div>
    );
  }
});
```

### mapActions

映射 Vuex actions。

```typescript
import { mapActions } from '@lytjs/compat';

export const LoginForm = defineComponent({
  data() {
    return {
      email: '',
      password: ''
    };
  },

  methods: {
    ...mapActions('user', {
      login: 'login',
      logout: 'logout'
    }),

    async handleSubmit() {
      await this.login({
        email: this.email,
        password: this.password
      });
    }
  },

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <input v-model={this.email} type="email" />
        <input v-model={this.password} type="password" />
        <button type="submit">登录</button>
      </form>
    );
  }
});
```

### mapMutations

映射 Vuex mutations。

```typescript
import { mapMutations } from '@lytjs/compat';

export const Counter = defineComponent({
  data() {
    return { count: 0 };
  },

  methods: {
    ...mapMutations('counter', {
      increment: 'INCREMENT',
      decrement: 'DECREMENT'
    })
  },

  render() {
    return (
      <div>
        <span>{this.count}</span>
        <button onClick={() => this.increment()}>+</button>
        <button onClick={() => this.decrement()}>-</button>
      </div>
    );
  }
});
```

### createNamespacedHelpers

创建命名空间辅助函数。

```typescript
import { createNamespacedHelpers } from '@lytjs/compat';

const { mapState, mapActions } = createNamespacedHelpers('cart');

export const CartItems = defineComponent({
  computed: {
    ...mapState({
      items: 'items',
      total: 'totalPrice'
    })
  },

  methods: {
    ...mapActions(['addItem', 'removeItem'])
  },

  render() {
    return (
      <div>
        {this.items.map(item => (
          <CartItem
            key={item.id}
            item={item}
            onRemove={() => this.removeItem(item.id)}
          />
        ))}
        <p>总计: ¥{this.total}</p>
      </div>
    );
  }
});
```

## Vue Router 兼容

### 路由守卫命名映射

| Vue Router          | LytJS Router          |
| ------------------- | --------------------- |
| `beforeEach`        | `beforeEach`          |
| `beforeResolve`     | `beforeResolve`       |
| `afterEach`         | `afterEach`           |
| `beforeRouteEnter`  | `onBeforeRouteEnter`  |
| `beforeRouteUpdate` | `onBeforeRouteUpdate` |
| `beforeRouteLeave`  | `onBeforeRouteLeave`  |

### 使用示例

```typescript
import { defineComponent, onBeforeRouteEnter, onBeforeRouteLeave } from '@lytjs/compat';

export const UserEdit = defineComponent({
  data() {
    return {
      hasChanges: false
    };
  },

  onBeforeRouteEnter(to, from, next) {
    if (this.hasChanges) {
      const answer = window.confirm('有未保存的更改，确定离开吗？');
      if (answer) {
        next();
      } else {
        next(false);
      }
    } else {
      next();
    }
  },

  onBeforeRouteLeave(to, from, next) {
    if (this.hasChanges) {
      const answer = window.confirm('有未保存的更改，确定离开吗？');
      next(answer);
    } else {
      next();
    }
  },

  render() {
    return <div>用户编辑</div>;
  }
});
```

## 响应式 API 兼容

### reactive 和 ref

```typescript
import { ref, reactive } from '@lytjs/compat';

export const ReactiveDemo = defineComponent({
  setup() {
    const count = ref(0);
    const state = reactive({
      name: 'LytJS',
      version: '6.0'
    });

    function increment() {
      count.value++;
    }

    return { count, state, increment };
  },

  render() {
    return (
      <div>
        <p>计数: {this.count}</p>
        <p>名称: {this.state.name}</p>
        <p>版本: {this.state.version}</p>
        <button onClick={() => this.increment()}>增加</button>
      </div>
    );
  }
});
```

### computed

```typescript
import { ref, computed } from '@lytjs/compat';

export const ComputedDemo = defineComponent({
  setup() {
    const firstName = ref('张');
    const lastName = ref('三');

    const fullName = computed(() => `${firstName.value} ${lastName.value}`);
    const nameLength = computed(() => fullName.value.length);

    return { firstName, lastName, fullName, nameLength };
  },

  render() {
    return (
      <div>
        <p>姓名: {this.fullName}</p>
        <p>长度: {this.nameLength}</p>
      </div>
    );
  }
});
```

### watch 和 watchEffect

```typescript
import { ref, watch, watchEffect } from '@lytjs/compat';

export const WatchDemo = defineComponent({
  setup() {
    const count = ref(0);
    const userId = ref('123');

    watch(count, (newVal, oldVal) => {
      console.log(`count 从 ${oldVal} 变为 ${newVal}`);
    });

    watchEffect(() => {
      console.log(`当前 count: ${count.value}`);
    });

    return { count };
  },

  render() {
    return (
      <div>
        <p>计数: {this.count}</p>
        <button onClick={() => this.count.value++}>增加</button>
      </div>
    );
  }
});
```

## $emit 兼容

```typescript
import { defineComponent } from '@lytjs/compat';

export const CustomButton = defineComponent({
  props: {
    type: { type: String, default: 'button' }
  },

  methods: {
    handleClick(event) {
      this.$emit('click', event);
      this.$emit('custom-event', { timestamp: Date.now() });
    }
  },

  render() {
    return (
      <button type={this.type} onClick={this.handleClick}>
        {this.$slots.default?.()}
      </button>
    );
  }
});

export const Parent = defineComponent({
  render() {
    return (
      <CustomButton onClick={(e) => console.log('点击', e)}>
        点击我
      </CustomButton>
    );
  }
});
```

## $refs 兼容

```typescript
import { defineComponent } from '@lytjs/compat';

export const FocusInput = defineComponent({
  mounted() {
    this.$refs.input.focus();
  },

  render() {
    return <input ref="input" type="text" />;
  }
});
```

## $slots 兼容

```typescript
import { defineComponent } from '@lytjs/compat';

export const Card = defineComponent({
  props: {
    title: { type: String }
  },

  render() {
    return (
      <div class="card">
        <div class="card-header">
          <h2>{this.title}</h2>
        </div>
        <div class="card-body">
          {this.$slots.default?.()}
        </div>
        <div class="card-footer">
          {this.$slots.footer?.()}
        </div>
      </div>
    );
  }
});

export const Parent = defineComponent({
  render() {
    return (
      <Card title="我的卡片">
        <p>卡片内容</p>
        <template #footer>
          <button>确定</button>
        </template>
      </Card>
    );
  }
});
```

## 主要 API

### `enableCompat(options)`

启用兼容性模式。

```typescript
import { enableCompat } from '@lytjs/compat';

enableCompat({
  vue2Mode: true,
  vue3Mode: false,
  silent: false,
});
```

### `defineComponent(options)`

定义兼容组件。

```typescript
import { defineComponent } from '@lytjs/compat';

const MyComponent = defineComponent({
  data() {
    /* ... */
  },
  methods: {
    /* ... */
  },
  computed: {
    /* ... */
  },
  render() {
    /* ... */
  },
});
```

### `mapState(namespace, map)`

映射状态到计算属性。

```typescript
import { mapState } from '@lytjs/compat';

export default {
  computed: {
    ...mapState('user', ['name', 'email']),
    ...mapState('cart', {
      cartCount: 'items.length',
      isEmpty: (state) => state.items.length === 0,
    }),
  },
};
```

### `mapGetters(namespace, map)`

映射 getters。

```typescript
import { mapGetters } from '@lytjs/compat';

export default {
  computed: {
    ...mapGetters('product', ['sortedList', 'featuredItems']),
  },
};
```

### `mapActions(namespace, map)`

映射 actions。

```typescript
import { mapActions } from '@lytjs/compat';

export default {
  methods: {
    ...mapActions('user', ['login', 'logout']),
    ...mapActions('cart', {
      addToCart: 'addItem',
      removeFromCart: 'removeItem',
    }),
  },
};
```

### `mapMutations(namespace, map)`

映射 mutations。

```typescript
import { mapMutations } from '@lytjs/compat';

export default {
  methods: {
    ...mapMutations('counter', ['INCREMENT', 'DECREMENT']),
  },
};
```

### `createNamespacedHelpers(namespace)`

创建命名空间辅助函数。

```typescript
import { createNamespacedHelpers } from '@lytjs/compat';

const { mapState, mapGetters, mapActions } = createNamespacedHelpers('module');
```

## 配置选项

```typescript
interface CompatOptions {
  vue2Mode?: boolean;
  vue3Mode?: boolean;
  silent?: boolean;
  onWarn?: (message: string) => void;
}
```

## 迁移策略

### 渐进式迁移

```typescript
// 1. 安装兼容包
npm install @lytjs/compat

// 2. 在入口启用兼容模式
import { enableCompat } from '@lytjs/compat';
enableCompat();

// 3. 逐个组件迁移
// 从简单组件开始，逐步迁移复杂组件

// 4. 移除兼容代码
// 迁移完成后，可选择性移除兼容包
```

### 组件迁移检查表

- [ ] 替换 `data()` 为响应式变量
- [ ] 替换 `methods` 为普通函数
- [ ] 替换 `computed` 为 `computed()`
- [ ] 替换 `watch` 为 `watch()`
- [ ] 替换 `beforeDestroy` 为 `onBeforeUnmount`
- [ ] 替换 `Vuex` 为 `@lytjs/store`
- [ ] 替换 `$emit` 为 `emit()`
- [ ] 清理 `this` 引用

## 浏览器兼容性

`@lytjs/compat` 支持所有现代浏览器。

## 许可证

MIT License - [查看许可证](https://gitee.com/lytjs/lytjs/blob/main/LICENSE)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- [Gitee 仓库](https://gitee.com/lytjs/lytjs)
- [问题反馈](https://gitee.com/lytjs/lytjs/issues)
