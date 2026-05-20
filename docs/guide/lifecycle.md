# 生命周期钩子

每个 LytJS 组件实例在创建时都要经历一系列初始化步骤。在此过程中，LytJS 会在特定阶段调用生命周期钩子函数，让开发者有机会在合适的时机执行自己的代码。

## Options API 生命周期

Options API 提供了一组以组件状态命名的钩子函数。

### beforeCreate

在组件实例初始化之后、响应式数据设置之前调用。此时无法访问 `data`、`computed`、`methods` 等。

```typescript
const MyComponent = {
  data() {
    return { count: 0 };
  },
  beforeCreate() {
    console.log('beforeCreate: 此时 data 尚未初始化');
    // console.log(this.count); // undefined
  },
};
```

### created

在组件实例创建完成后调用。此时已完成响应式数据、计算属性、方法的设置，可以访问 `data` 和 `methods`，但尚未挂载到 DOM。

```typescript
const MyComponent = {
  data() {
    return { count: 0 };
  },
  created() {
    console.log('created: data 已初始化', this.count); // 0
    // 适合在此发起数据请求
    this.fetchData();
  },
  methods: {
    fetchData() {
      // 获取数据...
    },
  },
};
```

### beforeMount

在组件挂载到 DOM 之前调用。此时模板已编译完成，但尚未替换到页面上。

```typescript
const MyComponent = {
  beforeMount() {
    console.log('beforeMount: 模板已编译，即将挂载');
    // 此时 this.$el 尚不可用
  },
};
```

### mounted

在组件挂载到 DOM 完成后调用。此时可以访问 DOM 元素。

```typescript
const MyComponent = {
  mounted() {
    console.log('mounted: 组件已挂载到 DOM');
    // 可以操作 DOM 或初始化第三方库
    const el = this.$el;
    console.log(el); // 组件根 DOM 元素
  },
};
```

### beforeUpdate

在响应式数据变化后、DOM 重新渲染之前调用。适合在更新前访问现有的 DOM 状态。

```typescript
const MyComponent = {
  data() {
    return { count: 0 };
  },
  beforeUpdate() {
    console.log('beforeUpdate: 数据已变化，DOM 即将更新');
    // 可以在此保存滚动位置等信息
  },
};
```

### updated

在 DOM 重新渲染完成后调用。避免在此修改状态，以免触发无限循环。

```typescript
const MyComponent = {
  updated() {
    console.log('updated: DOM 已更新');
    // 可以执行依赖更新后 DOM 的操作
  },
};
```

### beforeUnmount

在组件卸载之前调用。此时组件实例仍然可用，适合执行清理工作。

```typescript
const MyComponent = {
  beforeUnmount() {
    console.log('beforeUnmount: 组件即将卸载');
    // 清除定时器、取消事件监听等
    clearInterval(this.timer);
    window.removeEventListener('resize', this.handleResize);
  },
};
```

### unmounted

在组件卸载完成后调用。所有响应式副作用都已停止。

```typescript
const MyComponent = {
  unmounted() {
    console.log('unmounted: 组件已卸载');
    // 组件的所有子组件也已卸载
  },
};
```

### activated / deactivated

被 `<KeepAlive>` 缓存的组件激活/停用时调用。

```typescript
const MyComponent = {
  activated() {
    console.log('activated: 组件被激活');
    // 恢复数据或重新获取数据
  },
  deactivated() {
    console.log('deactivated: 组件被停用');
    // 保存状态或暂停定时器
  },
};
```

### errorCaptured

捕获后代组件传递的错误。返回 `false` 可以阻止错误继续向上传播。

```typescript
const ParentComponent = {
  errorCaptured(err, instance, info) {
    console.error('捕获到子组件错误:', err);
    console.log('错误来源组件:', instance);
    console.log('错误信息:', info);

    // 返回 false 阻止错误继续向上传播
    return false;
  },
};
```

## Composition API 生命周期

在 `setup()` 中使用 `on*` 系列函数注册生命周期钩子。

### onMounted / onUnmounted

```typescript
import { onMounted, onUnmounted, ref } from '@lytjs/core';

export default {
  setup() {
    const count = ref(0);
    let timer: number;

    onMounted(() => {
      console.log('组件已挂载');
      timer = setInterval(() => count.value++, 1000);
    });

    onUnmounted(() => {
      console.log('组件已卸载');
      clearInterval(timer);
    });

    return { count };
  },
};
```

### onBeforeMount / onBeforeUnmount

```typescript
import { onBeforeMount, onBeforeUnmount } from '@lytjs/core';

export default {
  setup() {
    onBeforeMount(() => {
      console.log('组件即将挂载');
    });

    onBeforeUnmount(() => {
      console.log('组件即将卸载');
      // 执行清理工作
    });
  },
};
```

### onUpdated / onBeforeUpdate

```typescript
import { onUpdated, onBeforeUpdate, ref } from '@lytjs/core';

export default {
  setup() {
    const count = ref(0);

    onBeforeUpdate(() => {
      console.log('DOM 即将更新，当前 count:', count.value);
    });

    onUpdated(() => {
      console.log('DOM 已更新，当前 count:', count.value);
    });

    return { count };
  },
};
```

### onErrorCaptured

```typescript
import { onErrorCaptured } from '@lytjs/core';

export default {
  setup() {
    onErrorCaptured((err, instance, info) => {
      console.error('捕获到错误:', err);
      // 返回 false 阻止错误继续传播
      return false;
    });
  },
};
```

### onRenderTracked / onRenderTriggered

用于调试，追踪响应式依赖的收集和触发。

```typescript
import { onRenderTracked, onRenderTriggered, ref } from '@lytjs/core';

export default {
  setup() {
    const count = ref(0);

    onRenderTracked((e) => {
      console.log('依赖被追踪:', e.target, e.key, e.type);
    });

    onRenderTriggered((e) => {
      console.log('依赖被触发:', e.target, e.key, e.type, e.newValue);
    });

    return { count };
  },
};
```

## 执行顺序

下图展示了组件从创建到销毁的完整生命周期流程：

```
创建阶段:
  beforeCreate → created → beforeMount → mounted

更新阶段:
  beforeUpdate → updated

卸载阶段:
  beforeUnmount → unmounted

KeepAlive 缓存:
  activated ↔ deactivated

错误处理:
  errorCaptured（可拦截子组件错误）
```

### 父子组件执行顺序

当父子组件同时挂载时，执行顺序为：

```
父 beforeCreate → 父 created → 父 beforeMount
  → 子 beforeCreate → 子 created → 子 beforeMount → 子 mounted
→ 父 mounted
```

当父子组件同时更新时，执行顺序为：

```
父 beforeUpdate
  → 子 beforeUpdate → 子 updated
→ 父 updated
```

当父子组件同时卸载时，执行顺序为：

```
父 beforeUnmount
  → 子 beforeUnmount → 子 unmounted
→ 父 unmounted
```

### 完整示例

```typescript
import {
  ref,
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
} from '@lytjs/core';

export default {
  setup() {
    const count = ref(0);

    onBeforeMount(() => console.log('1. beforeMount'));
    onMounted(() => {
      console.log('2. mounted');
      console.log('组件已挂载，可以访问 DOM');
    });

    onBeforeUpdate(() => console.log('3. beforeUpdate'));
    onUpdated(() => console.log('4. updated'));

    onBeforeUnmount(() => {
      console.log('5. beforeUnmount');
      console.log('执行清理工作...');
    });
    onUnmounted(() => console.log('6. unmounted'));

    const increment = () => count.value++;

    return { count, increment };
  },
};
```
