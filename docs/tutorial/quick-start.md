# 快速上手指南

欢迎使用 LytJS！本教程将带你从零开始创建你的第一个 LytJS 应用。

## 前置准备

- Node.js 18.0 或更高版本
- pnpm（推荐）或 npm/yarn

## 第一步：创建项目

使用 LytJS CLI 创建新项目：

```bash
npx @lytjs/cli create my-first-app
```

进入项目目录并安装依赖：

```bash
cd my-first-app
pnpm install
```

## 第二步：启动开发服务器

```bash
pnpm dev
```

打开浏览器访问 `http://localhost:5173`，你将看到 LytJS 的欢迎页面！

## 第三步：认识项目结构

让我们看看生成的项目结构：

```
my-first-app/
├── src/
│   ├── components/    # 组件目录
│   ├── App.vue        # 根组件
│   └── main.ts        # 入口文件
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 关键文件说明

- `main.ts` - 应用入口，创建并挂载 LytJS 应用
- `App.vue` - 根组件
- `index.html` - HTML 入口文件

## 第四步：你的第一个组件

让我们创建一个简单的计数器组件。在 `src/components` 目录下创建 `Counter.vue`：

```vue
<script setup lang="ts">
import { signal } from '@lytjs/reactivity';

// 创建响应式状态
const count = signal(0);

// 定义方法
const increment = () => {
  count(count() + 1);
};

const decrement = () => {
  count(count() - 1);
};
</script>

<template>
  <div class="counter">
    <h2>计数器</h2>
    <p>当前计数: {{ count }}</p>
    <button @click="decrement">-</button>
    <button @click="increment">+</button>
  </div>
</template>

<style scoped>
.counter {
  padding: 20px;
  text-align: center;
}

button {
  margin: 0 10px;
  padding: 10px 20px;
  font-size: 18px;
}
</style>
```

## 第五步：使用组件

现在在 `App.vue` 中使用这个计数器组件：

```vue
<script setup lang="ts">
import Counter from './components/Counter.vue';
</script>

<template>
  <div class="app">
    <h1>你好，LytJS！</h1>
    <Counter />
  </div>
</template>

<style>
.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}
</style>
```

## 第六步：添加更多功能

让我们扩展计数器，添加更多功能：

```vue
<script setup lang="ts">
import { signal, computed } from '@lytjs/reactivity';

const count = signal(0);
const step = signal(1);

// 计算属性：判断是否为偶数
const isEven = computed(() => count() % 2 === 0);

const increment = () => {
  count(count() + step());
};

const decrement = () => {
  count(count() - step());
};

const reset = () => {
  count(0);
};
</script>

<template>
  <div class="counter">
    <h2>计数器</h2>
    <p>当前计数: {{ count }}</p>
    <p>是偶数吗? {{ isEven ? '是' : '否' }}</p>

    <div>
      <label>
        步长:
        <input type="number" v-model="step" min="1" />
      </label>
    </div>

    <div class="buttons">
      <button @click="decrement">-</button>
      <button @click="reset">重置</button>
      <button @click="increment">+</button>
    </div>
  </div>
</template>

<style scoped>
.counter {
  padding: 20px;
  text-align: center;
}

button {
  margin: 5px;
  padding: 10px 20px;
  font-size: 18px;
}

.buttons {
  margin-top: 20px;
}
</style>
```

## 第七步：理解响应式系统

在 LytJS 中，有两种主要的响应式 API：

### 1. Signal API（推荐）

```typescript
import { signal, computed, effect } from '@lytjs/reactivity';

const count = signal(0);

// 读取值
console.log(count()); // 0

// 设置值
count(1);
console.log(count()); // 1

// 计算属性
const double = computed(() => count() * 2);

// 副作用
effect(() => {
  console.log('Count changed:', count());
});
```

### 2. Ref/Reactive API（Vue 风格）

```typescript
import { ref, reactive, computed } from '@lytjs/reactivity';

const count = ref(0);

// 读取和设置值
console.log(count.value); // 0
count.value = 1;

const state = reactive({
  name: 'LytJS',
  version: '1.0',
});
```

## 第八步：尝试示例项目

LytJS 提供了丰富的示例项目，让我们查看一下：

1. 访问 [示例页面](../examples/)
2. 尝试完整的 Todo 应用
3. 学习用户管理系统示例

## 下一步

现在你已经掌握了 LytJS 的基础！接下来可以：

- 📚 阅读 [基础概念](./basics.md) 深入学习
- 🎯 学习 [响应式基础](./reactivity.md)
- 🧩 了解 [组件基础](./components.md)
- 🔧 探索 [更多示例](../examples/)
- 📖 查看 [API 文档](../api/)

## 获取帮助

如果你遇到问题：

- 查看 [FAQ](./faq.md) 获取常见问题解答
- 搜索 [GitHub Issues](https://gitee.com/lytjs/lytjs/issues)
- 加入社区讨论

恭喜你完成了快速入门！🎉
