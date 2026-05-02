# 响应式系统

LytJS 提供了一套基于 Proxy 的响应式系统，能够自动追踪依赖并在数据变化时触发更新。

## reactive

使用 `reactive` 创建响应式对象。对响应式对象的属性进行读写会自动被追踪。

```typescript
import { reactive } from '@lytjs/reactivity';

const state = reactive({
  count: 0,
  message: 'hello',
});

state.count++;
console.log(state.message); // "hello"
```

## ref

`ref` 用于创建一个包含单个值的响应式引用。在 JS 中通过 `.value` 访问，在模板中会自动解包。

```typescript
import { ref } from '@lytjs/reactivity';

const count = ref(0);
count.value++;

console.log(count.value); // 1
```

## computed

`computed` 创建一个计算属性，只有在其依赖发生变化时才会重新计算。

```typescript
import { ref, computed } from '@lytjs/reactivity';

const firstName = ref('张');
const lastName = ref('三');

const fullName = computed(() => `${firstName.value}${lastName.value}`);

console.log(fullName.value); // "张三"
```

## watch

`watch` 用于观察响应式数据的变化并执行副作用。

```typescript
import { ref, watch } from '@lytjs/reactivity';

const count = ref(0);

watch(
  () => count.value,
  (newVal, oldVal) => {
    console.log(`count 从 ${oldVal} 变为 ${newVal}`);
  },
);

count.value++; // 控制台输出: count 从 0 变为 1
```

## watchEffect

`watchEffect` 会立即执行回调函数，并自动追踪其中使用的响应式依赖。

```typescript
import { ref, watchEffect } from '@lytjs/reactivity';

const count = ref(0);

watchEffect(() => {
  console.log(`当前 count: ${count.value}`);
});
// 立即输出: 当前 count: 0
```
