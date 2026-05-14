# 最佳实践

本文档收集了 LytJS 开发的最佳实践，帮助你编写更高质量、更易维护的代码。

## 项目结构

### 推荐的目录结构

```
src/
├── components/       # 通用组件
├── composables/      # 组合式函数
├── views/            # 页面组件
├── stores/           # 状态管理
├── router/           # 路由配置
├── utils/            # 工具函数
├── assets/           # 静态资源
├── App.vue           # 根组件
└── main.ts           # 入口文件
```

### 组件组织

- 按功能模块组织组件
- 通用组件放在 `components/`
- 页面组件放在 `views/`
- 相关组件放在同一目录

## 响应式系统

### 合理使用响应式数据

```typescript
// ✅ 好的做法：只对需要响应的数据使用 signal
const count = signal(0);
const userName = signal('');

// ❌ 避免：对静态数据使用响应式
const PI = signal(3.14); // 没必要
const staticConfig = signal({ fixed: true }); // 没必要
```

### 使用 computed 优化性能

```typescript
// ✅ 好的做法：使用 computed 缓存计算结果
const fullName = computed(() => `${firstName()} ${lastName()}`);

// ❌ 避免：在模板中进行复杂计算
// <div>{{ firstName() + ' ' + lastName() }}</div>
```

### 正确清理 effect

```typescript
import { onCleanup } from '@lytjs/core'

// ✅ 好的做法：清理副作用
setup() {
  const stop = effect(() => {
    // ...
  })

  onCleanup(() => stop())
}
```

## 组件开发

### 组件命名

- 使用 PascalCase 命名组件
- 使用多个单词避免冲突
- 组件名要描述功能

```typescript
// ✅ 好的做法
const UserProfile = defineComponent({
  /* ... */
});
const ProductList = defineComponent({
  /* ... */
});

// ❌ 避免
const User = defineComponent({
  /* ... */
}); // 太泛
const List = defineComponent({
  /* ... */
}); // 太泛
```

### Props 定义

```typescript
// ✅ 好的做法：明确定义 props 类型
defineComponent({
  props: {
    title: String,
    count: {
      type: Number,
      default: 0,
      required: true,
    },
    items: {
      type: Array as () => Item[],
      default: () => [],
    },
  },
});
```

### 事件命名

- 使用 kebab-case 命名事件
- 使用动词开头描述动作

```typescript
// ✅ 好的做法
emit('add-item');
emit('update-user');
emit('close-modal');

// ❌ 避免
emit('addItem');
emit('updated');
emit('close');
```

### 组件通信

```typescript
// ✅ 好的做法：Props 向下传递，Events 向上传递
// 父组件
<Child :data="items" @update="handleUpdate" />

// ✅ 好的做法：跨层级使用 provide/inject
// 祖先组件
provide('theme', theme)

// 后代组件
const theme = inject('theme')
```

## 状态管理

### Store 使用时机

- ✅ 全局共享的状态
- ✅ 需要在多处访问的数据
- ✅ 复杂的业务逻辑
- ❌ 组件内部的临时状态

### Store 结构

```typescript
// ✅ 好的做法：按功能组织 Store
export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: '',
    isLoading: false,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    async login(credentials) {
      /* ... */
    },
    logout() {
      /* ... */
    },
  },
});
```

## 路由

### 路由命名

```typescript
// ✅ 好的做法：使用有意义的名称
const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/users/:id', name: 'user-profile', component: UserProfile },
];

// 使用命名路由导航
router.push({ name: 'user-profile', params: { id: 1 } });
```

### 路由守卫

```typescript
// ✅ 好的做法：使用路由守卫处理权限
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'login' });
  } else {
    next();
  }
});
```

## 性能优化

### 列表渲染

```typescript
// ✅ 好的做法：使用 key
<div v-for="item in items" :key="item.id">
  {{ item.name }}
</div>

// ✅ 好的做法：大数据量使用虚拟列表
<VirtualList :items="largeList" :item-height="50" />
```

### 懒加载

```typescript
// ✅ 好的做法：路由懒加载
const routes = [
  {
    path: '/about',
    component: () => import('./views/About.vue'),
  },
];
```

### 避免不必要的渲染

```typescript
// ✅ 好的做法：使用 memo 优化
const expensiveValue = memo(() => {
  // 复杂计算
  return heavyComputation(data());
});
```

## 类型安全

### 充分利用 TypeScript

```typescript
// ✅ 好的做法：定义完整的类型
interface User {
  id: number;
  name: string;
  email: string;
}

const user = signal<User | null>(null);

// ✅ 好的做法：使用 import type
import type { User, Product } from './types';
```

## 测试

### 组件测试

```typescript
// ✅ 好的做法：测试组件行为
describe('Button', () => {
  it('emits click event when clicked', () => {
    const wrapper = mount(Button, { props: { text: 'Click' } });
    wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### 测试响应式逻辑

```typescript
// ✅ 好的做法：独立测试响应式逻辑
describe('useCounter', () => {
  it('increments count', () => {
    const { count, increment } = useCounter();
    increment();
    expect(count()).toBe(1);
  });
});
```

## 可访问性

### 添加 ARIA 属性

```typescript
// ✅ 好的做法：考虑可访问性
defineComponent({
  template: `
    <button 
      :aria-label="label"
      :aria-disabled="isDisabled"
      role="button"
    >
      {{ text }}
    </button>
  `,
});
```

### 键盘导航

```typescript
// ✅ 好的做法：支持键盘操作
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
};
```

## 安全

### 防止 XSS

```typescript
// ✅ 好的做法：使用文本插值而非 v-html
<div>{{ userContent }}</div>

// ✅ 如果必须使用，先净化
<div v-html="sanitize(userContent)"></div>
```

### 验证用户输入

```typescript
// ✅ 好的做法：验证和清理用户输入
const submitForm = (data: FormData) => {
  const validated = validate(data);
  const sanitized = sanitize(validated);
  api.send(sanitized);
};
```

## 开发工作流

### 代码规范

- 使用 ESLint 和 Prettier
- 遵循项目的编码规范
- 定期运行 lint 检查

### Git 提交

```bash
# ✅ 好的做法：使用规范的提交信息
git commit -m "feat: add user authentication"
git commit -m "fix: correct login form validation"
git commit -m "docs: update installation guide"
```

### 持续集成

- 自动运行测试
- 自动进行类型检查
- 自动进行 lint 检查

## 调试技巧

### 使用 DevTools

1. 安装 LytJS DevTools 浏览器扩展
2. 利用时间旅行调试
3. 查看信号依赖图
4. 分析性能数据

### 日志策略

```typescript
// ✅ 好的做法：使用条件日志
if (__DEV__) {
  console.log('Debug info:', data);
}
```

## 文档

### 组件文档

````typescript
/**
 * 用户头像组件
 *
 * @param size - 头像尺寸: 'small' | 'medium' | 'large'
 * @param src - 图片 URL
 * @param alt - 替代文本
 *
 * @example
 * ```vue
 * <UserAvatar size="medium" :src="user.avatar" :alt="user.name" />
 * ```
 */
const UserAvatar = defineComponent({
  /* ... */
});
````

### README 文件

- 为每个组件编写文档
- 提供使用示例
- 说明 Props 和 Events

## 总结

遵循这些最佳实践可以帮助你：

- 🚀 提高代码质量
- 🐛 减少 Bug
- 🔧 提高可维护性
- ⚡ 优化性能
- 👥 便于团队协作

记住，最佳实践不是僵化的规则，要根据具体项目情况灵活应用！
