# Lyt.js 最佳实践

## 组件开发

### 1. 使用 Composition API

优先使用 Composition API 和 script setup：

```javascript
// ✅ 推荐
<script setup>
import { ref, computed } from '@lytjs/reactivity';

const count = ref(0);
const double = computed(() => count.value * 2);

function increment() {
  count.value++;
}
</script>
```

### 2. 组件命名规范

使用 PascalCase 命名组件：

```
MyComponent.lyt
UserProfile.lyt
```

### 3. Props 定义

完整定义 props 类型和默认值：

```javascript
const props = defineProps({
  title: {
    type: String,
    default: 'Default Title'
  },
  count: {
    type: Number,
    default: 0
  }
});
```

## 响应式数据

### 1. 合理使用 ref vs reactive

```javascript
// 单个值：ref
const count = ref(0);

// 多个值：reactive
const state = reactive({
  name: 'Lyt',
  count: 0
});
```

### 2. 计算属性

将计算属性放前面

```javascript
// ✅ 推荐
const double = computed(() => count.value * 2);

// 使用
function someFunction() {
  // 直接读取 double，不是 double.value
}
```

### 3. 监听数据

```javascript
watch(count, (newVal, oldVal) => {
  console.log(`${oldVal} -> ${newVal}');
});
```

## 状态管理

### 1. 模块化 Store

按功能模块划分 Store：

```
stores/
├── user.js
├── cart.js
└── products.js
```

### 2. Store 中只放业务逻辑

```javascript
// ✅ 推荐
const user = createStore('user', {
  state: {
    name: '',
    isLoading: false
  },
  getters: {
    fullName: state => state.name
  },
  actions: {
    async fetchUser(state, id) {
      state.isLoading = true;
      // fetch...
    }
  }
});
```

## 路由

### 1. 路由懒加载

```javascript
const router = createRouter({
  routes: [
    {
      path: '/about',
      component: () => import('./About.lyt')
    }
  ]
});
```

### 2. 路由参数

```javascript
const route = useRoute();
console.log(route.params.id);
```

## 性能优化

### 1. v-for 加上 key

```html
<li each="item in items" :key="item.id">
  {{ item.name }}
</li>
```

### 2. 避免过度使用 watch

优先使用 computed 代替 watch：

```javascript
// ✅ 推荐
const double = computed(() => count.value * 2);

// ⚠️ 避免
let double = ref(0);
watch(count, val => {
  double.value = val * 2;
});
```

## 代码组织

### 项目结构

```
src/
├── components/
│   ├── Button.lyt
│   ├── Input.lyt
│   └── ...
├── pages/
│   ├── Home.lyt
│   ├── About.lyt
│   └── ...
├── stores/
│   ├── user.js
│   └── ...
├── router/
│   └── index.js
├── api/
│   └── index.js
├── App.lyt
└── main.js
```

## 测试

### 测试响应式数据

```javascript
test('count should increment', () => {
  const count = ref(0);
  count.value++;
  expect(count.value).toBe(1);
});
```

## AI 辅助开发最佳实践

1. 先用模板生成代码，AI 优化细节
2. 使用 `--ai` 选项时确保提供详细描述
3. 始终检查生成的代码，确保质量
4. 建立项目上下文，提高 AI 生成质量
