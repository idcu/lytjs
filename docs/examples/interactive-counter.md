# 交互式示例：计数器

这是一个演示 LytJS 响应式能力的交互式示例！

## 交互式计数器

<InteractiveCounter />

## 代码示例

下面是这个示例的实现代码：

```typescript
import { ref, computed } from '@lytjs/reactivity';

// 创建响应式数据
const count = ref(0);
const history = ref<number[]>([]);

// 计算属性自动更新
const doubled = computed(() => count.value * 2);

// 操作函数
function increment() {
  history.value.push(count.value);
  count.value++;
}

function decrement() {
  history.value.push(count.value);
  count.value--;
}

function reset() {
  history.value.push(count.value);
  count.value = 0;
}
```

## 主要特点

1. **响应式数据** - 使用 `ref` 创建响应式状态
2. **计算属性** - 使用 `computed` 创建自动计算的值
3. **事件处理** - 用户交互触发状态更新
4. **历史记录** - 记录操作历史，最多保存 10 条

尝试点击上面的按钮，体验一下响应式系统的魔力！ ✨
