# @lytjs/compat

Lyt.js Vue 3 兼容层 - 让 Vue 3 用户可以无缝迁移到 Lyt.js。

## 安装

```bash
npm install @lytjs/compat

# 或使用 pnpm
pnpm add @lytjs/compat
```

## 特性

- 🚀 完全兼容 Vue 3 API
- 📦 SFC 文件转换器
- 🔄 自动迁移工具
- 💡 渐进式迁移策略
- 🎯 零运行时依赖

## 快速开始

### 迁移工具

```bash
# 转换单个文件
vue-to-lyt src/App.vue

# 转换整个目录
vue-to-lyt src/components/
```

### 在代码中使用

```javascript
// 从 'vue' 改为 '@lytjs/compat'
import { ref, computed, watch, createApp } from '@lytjs/compat';

// 代码完全相同！
const count = ref(0);
const doubled = computed(() => count.value * 2);
watch(count, (newVal) => console.log(newVal));

createApp(App).mount('#app');
```

## API 兼容性

### 响应式 API（完全兼容）

```javascript
import {
  ref, shallowRef, toRef, toRefs, unref, proxyRefs,
  reactive, readonly, shallowReactive,
  computed,
  watch, watchEffect, watchPostEffect, watchSyncEffect,
  effect, stop,
  provide, inject,
  nextTick
} from '@lytjs/compat';
```

### 组件选项（完全兼容）

```javascript
import { defineComponent, defineAsyncComponent } from '@lytjs/compat';

const Component = defineComponent({
  props: {},
  emits: [],
  setup(props, context) {
    return {};
  },
  data() { return {}; },
  computed: {},
  methods: {},
  watch: {},
  components: {},
  directives: {}
});
```

### 生命周期钩子（完全兼容）

```javascript
import {
  onBeforeMount, onMounted,
  onBeforeUpdate, onUpdated,
  onBeforeUnmount, onUnmounted,
  onErrorCaptured,
  onRenderTracked, onRenderTriggered,
  onActivated, onDeactivated,
  onServerPrefetch
} from '@lytjs/compat';
```

## SFC 转换

转换前后对比：

```vue
<!-- 转换前 (Vue SFC) -->
<template>
  <div>
    <h1>{{ title }}</h1>
    <button v-if="showButton" @click="handleClick">
      Click me
    </button>
    <ul>
      <li v-for="item in items" :key="item.id">{{ item.text }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const title = ref('Hello Vue');
const showButton = ref(true);
const items = ref([{ id: 1, text: 'Item 1' }]);

function handleClick() {
  console.log('Button clicked');
}
</script>
```

```vue
<!-- 转换后 (Lyt SFC) -->
<template>
  <div>
    <h1>{{ title }}</h1>
    <button if="showButton" @click="handleClick">
      Click me
    </button>
    <ul>
      <li each="item in items" :key="item.id">{{ item.text }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from '@lytjs/compat';

const title = ref('Hello Vue');
const showButton = ref(true);
const items = ref([{ id: 1, text: 'Item 1' }]);

function handleClick() {
  console.log('Button clicked');
}
</script>
```

## 模板语法转换

| Vue 3 | Lyt.js |
|------|------|
| `v-if` | `if` |
| `v-else-if` | `else-if` |
| `v-else` | `else` |
| `v-for` | `each` |
| `v-on:click` | `@click` |
| `v-bind:prop` | `:prop` |
| `v-model` | `v-model` |

## 程序化使用转换器

```javascript
import { convertVueSfcToLyt, VueSfcConverter } from '@lytjs/compat';

// 便捷函数
const lytCode = convertVueSfcToLyt(vueCode);

// 类实例方式
const converter = new VueSfcConverter(vueCode);
const parsed = converter.parse();  // 解析 SFC 结构
const converted = converter.convert(); // 执行完整转换
```

## 渐进式迁移策略

### 阶段 1：引入兼容层

```javascript
// 在 main.js 中
import { createApp } from '@lytjs/compat'; // 替换 'vue'

const app = createApp(App);
app.mount('#app');
```

### 阶段 2：逐个转换组件

```bash
vue-to-lyt src/components/Header.vue
vue-to-lyt src/components/Footer.vue
```

### 阶段 3：完全迁移

移除兼容层，直接使用原生 Lyt.js API：

```javascript
// 从 '@lytjs/compat' 改为 '@lytjs/core' 和 '@lytjs/reactivity'
import { createApp } from '@lytjs/core';
import { ref, computed } from '@lytjs/reactivity';
```

## 内置组件兼容

| Vue 3 组件 | Lyt.js 组件 | 兼容状态 |
|----------|------------|---------|
| `KeepAlive` | `KeepAlive` | ✅ 完全兼容 |
| `Teleport` | `Teleport` | ✅ 完全兼容 |
| `Transition` | `Transition` | ✅ 完全兼容 |
| `TransitionGroup` | `TransitionGroup` | ✅ 完全兼容 |
| `Suspense` | `Suspense` | ✅ 完全兼容 |

## 示例

### 完整迁移示例

```javascript
// Vue 3 代码
import { ref, computed, watch, onMounted } from 'vue';

export default {
  props: {
    title: String
  },
  emits: ['update'],
  setup(props, { emit }) {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    
    watch(count, (newVal) => {
      emit('update', newVal);
    });
    
    onMounted(() => {
      console.log('Mounted');
    });
    
    return { count, doubled };
  }
};
```

```javascript
// Lyt.js 兼容层代码（几乎不变）
import { ref, computed, watch, onMounted } from '@lytjs/compat';

export default {
  props: {
    title: String
  },
  emits: ['update'],
  setup(props, { emit }) {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    
    watch(count, (newVal) => {
      emit('update', newVal);
    });
    
    onMounted(() => {
      console.log('Mounted');
    });
    
    return { count, doubled };
  }
};
```

### 批量迁移脚本

```bash
# 创建迁移脚本
cat > migrate.sh << 'EOF'
#!/bin/bash

# 转换所有 .vue 文件
find src -name "*.vue" -exec vue-to-lyt {} \;

# 更新所有 import 语句
find src -name "*.js" -o -name "*.ts" -o -name "*.vue" | xargs sed -i 's/from "vue"/from "@lytjs\/compat"/g'
find src -name "*.js" -o -name "*.ts" -o -name "*.vue" | xargs sed -i "s/from 'vue'/from '@lytjs\/compat'/g"

echo "迁移完成！"
EOF

chmod +x migrate.sh
./migrate.sh
```

## 性能

- 完全兼容但零运行时开销
- 转换后的代码直接使用 Lyt.js 核心
- 转换器本身也是零依赖

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
