# @lytjs/reactivity

Lyt.js 响应式系统 - 提供响应式数据、计算属性、侦听器等核心响应式能力。

## 安装

```bash
npm install @lytjs/reactivity

# 或使用 pnpm
pnpm add @lytjs/reactivity
```

## 特性

- 🚀 Proxy 代理实现，性能优异
- 🔄 Signal 细粒度响应式 API
- 📦 完全兼容 Vue 3 响应式 API
- 🎯 零运行时依赖，体积仅 2.86KB (gzip)

## 快速开始

### ref - 响应式引用

```javascript
import { ref } from '@lytjs/reactivity';

const count = ref(0);
console.log(count.value); // 0

count.value++;
console.log(count.value); // 1
```

### reactive - 响应式对象

```javascript
import { reactive } from '@lytjs/reactivity';

const state = reactive({
  count: 0,
  name: 'Lyt.js'
});

console.log(state.count); // 0
state.count++;
console.log(state.count); // 1
```

### computed - 计算属性

```javascript
import { ref, computed } from '@lytjs/reactivity';

const count = ref(0);
const doubled = computed(() => count.value * 2);

console.log(doubled.value); // 0

count.value++;
console.log(doubled.value); // 2
```

### watch - 数据侦听

```javascript
import { ref, watch } from '@lytjs/reactivity';

const count = ref(0);

watch(count, (newValue, oldValue) => {
  console.log(`count 变化: ${oldValue} -> ${newValue}`);
});

count.value++; // count 变化: 0 -> 1
```

### effect - 副作用

```javascript
import { ref, effect } from '@lytjs/reactivity';

const count = ref(0);

effect(() => {
  console.log(`count 当前值: ${count.value}`);
});
// count 当前值: 0

count.value++; // count 当前值: 1
```

## Signal API

Signal 提供细粒度响应式能力，性能更优：

```javascript
import { signal, computed } from '@lytjs/reactivity/signal';

const count = signal(0);
const doubled = computed(() => count() * 2);

console.log(count()); // 0
console.log(doubled()); // 0

count.set(1);
console.log(count()); // 1
console.log(doubled()); // 2
```

## API 参考

### 响应式 API

| API | 说明 |
|------|------|
| `ref(value)` | 创建响应式引用 |
| `reactive(obj)` | 创建响应式对象 |
| `shallowRef(value)` | 创建浅层响应式引用 |
| `readonly(obj)` | 创建只读响应式对象 |
| `toRef(obj, key)` | 将对象属性转为 ref |
| `toRefs(obj)` | 将对象所有属性转为 ref |

### 计算与侦听

| API | 说明 |
|------|------|
| `computed(fn)` | 创建计算属性 |
| `watch(source, fn, options)` | 数据变化时执行回调 |
| `watchEffect(fn)` | 立即执行并追踪响应式依赖 |
| `effect(fn, options)` | 创建副作用 |
| `stop(effect)` | 停止副作用 |

### 工具函数

| API | 说明 |
|------|------|
| `isRef(v)` | 判断是否为 ref |
| `isReactive(v)` | 判断是否为 reactive |
| `isReadonly(v)` | 判断是否为 readonly |
| `unref(v)` | 解包 ref |
| `nextTick(fn)` | 在下一次 DOM 更新后执行 |

## 示例

### 表单验证

```javascript
import { reactive, computed } from '@lytjs/reactivity';

const form = reactive({
  email: '',
  password: ''
});

const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
});

const isValidPassword = computed(() => {
  return form.password.length >= 6;
});

const isFormValid = computed(() => {
  return isValidEmail.value && isValidPassword.value;
});
```

### 计数器

```javascript
import { ref, computed } from '@lytjs/reactivity';

const count = ref(0);
const doubled = computed(() => count.value * 2);

function increment() {
  count.value++;
}

function decrement() {
  count.value--;
}
```

## 性能

- 体积：2.86 KB (ESM gzip)
- 零运行时依赖
- 原生 Proxy 实现，性能优异

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
