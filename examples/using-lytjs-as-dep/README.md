# 使用 LytJS 作为依赖的完整示例项目

> 本示例展示如何将 LytJS 作为第三方依赖引入到你的项目中，并使用 AI 辅助开发流程。

---

## 📚 目录

- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [AI 辅助开发流程](#ai-辅助开发流程)
- [LytJS 功能演示](#lytjs-功能演示)
- [进阶使用](#进阶使用)

---

## 快速开始

### 1. 创建项目

```bash
# 创建新目录
mkdir my-lytjs-app
cd my-lytjs-app

# 初始化项目
npm init -y
# 或者使用 pnpm（推荐）
pnpm init
```

### 2. 安装 LytJS 依赖

```bash
# 安装核心包（支持双模式）
npm install @lytjs/core
# 安装生态包（根据需要选择）
npm install @lytjs/ui @lytjs/store @lytjs/router

# 使用 pnpm
pnpm add @lytjs/core @lytjs/ui @lytjs/store @lytjs/router
```

### 3. 创建基础文件

创建 `index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>My LytJS App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/main.js"></script>
</body>
</html>
```

创建 `main.js` (或 `main.ts`):
```javascript
import { createApp, ref, computed } from '@lytjs/core';

const App = {
  setup() {
    const count = ref(0);
    const double = computed(() => count.value * 2);
    
    const increment = () => count.value++;
    const decrement = () => count.value--;
    
    return { count, double, increment, decrement };
  },
  template: `
    <div>
      <h1>Hello LytJS!</h1>
      <p>Count: {{ count }}</p>
      <p>Double: {{ double }}</p>
      <button @click="increment">+1</button>
      <button @click="decrement">-1</button>
    </div>
  `
};

createApp(App).mount('#app');
```

---

## 项目结构

```
my-lytjs-app/
├── src/
│   ├── components/      # 组件目录
│   ├── stores/          # 状态管理
│   ├── views/           # 页面视图
│   ├── utils/           # 工具函数
│   ├── App.js           # 根组件
│   └── main.js          # 入口文件
├── public/              # 静态资源
├── index.html           # HTML 模板
├── package.json
└── vite.config.js       # 可选，使用 Vite
```

---

## AI 辅助开发流程

### 🎯 场景 1：快速搭建项目

**用户问题**："帮我创建一个使用 LytJS 的任务管理应用"

**AI 工作流**：
1. 读取 [LytJS 快速参考](docs/getting-started/quick-reference.md)
2. 查看 [examples/](../) 目录寻找相关示例
3. 生成项目结构和基础代码

---

### 🎯 场景 2：使用 LytJS UI 组件

**用户问题**："我需要一个表单组件"

**AI 可以这样做**：

1. 查找 LytJS UI 文档
2. 推荐组件使用方式
3. 生成示例代码

```javascript
// AI 推荐的代码
import { Button, Input, Form, FormItem } from '@lytjs/ui';
import '@lytjs/ui/index.css';

const LoginForm = {
  components: { Button, Input, Form, FormItem },
  setup() {
    const formData = ref({
      username: '',
      password: ''
    });
    
    const handleSubmit = () => {
      console.log('Submit:', formData.value);
    };
    
    return { formData, handleSubmit };
  },
  template: `
    <Form :model="formData">
      <FormItem label="用户名">
        <Input v-model="formData.username" placeholder="请输入用户名" />
      </FormItem>
      <FormItem label="密码">
        <Input v-model="formData.password" type="password" placeholder="请输入密码" />
      </FormItem>
      <Button type="primary" @click="handleSubmit">登录</Button>
    </Form>
  `
};
```

---

### 🎯 场景 3：状态管理

**用户问题**："如何管理全局状态？"

**AI 可以推荐使用 @lytjs/store**：

```javascript
// stores/user.js
import { defineStore } from '@lytjs/store';

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
    isLoggedIn: false,
  }),
  getters: {
    username: (state) => state.userInfo?.name || '',
  },
  actions: {
    login(userData) {
      this.userInfo = userData;
      this.isLoggedIn = true;
    },
    logout() {
      this.userInfo = null;
      this.isLoggedIn = false;
    },
  },
});
```

---

### 🎯 场景 4：性能优化

**用户问题**："页面更新很慢，怎么优化？"

**AI 可以推荐 Vapor 模式**：

```javascript
// 使用 Vapor 模式获得更好的性能
import { createApp, signal } from '@lytjs/core-signal';

const App = {
  setup() {
    const count = signal(0);  // 使用 signal 获得细粒度更新
    
    return { count };
  },
  template: `<div>{{ count }}</div>`
};

createApp(App).mount('#app');
```

---

## LytJS 功能演示

### 1. 响应式系统

#### Ref
```javascript
import { ref, computed } from '@lytjs/reactivity';

const count = ref(0);
const double = computed(() => count.value * 2);

count.value++;
console.log(count.value);  // 1
console.log(double.value); // 2
```

#### Signal (推荐，性能更好)
```javascript
import { signal, computed, effect } from '@lytjs/reactivity';

const count = signal(0);
const double = computed(() => count.value * 2);

effect(() => {
  console.log('Count changed:', count.value);
});

count.value++;
```

### 2. 组件定义

```javascript
import { defineComponent } from '@lytjs/core';

const MyComponent = defineComponent({
  name: 'MyComponent',
  props: {
    title: String,
    initialCount: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const count = ref(props.initialCount);
    
    const increment = () => count.value++;
    
    return { count, increment };
  },
  template: `
    <div class="my-component">
      <h2>{{ title }}</h2>
      <p>Count: {{ count }}</p>
      <button @click="increment">+1</button>
    </div>
  `
});
```

### 3. 状态管理

```javascript
import { createPinia, defineStore } from '@lytjs/store';

// 创建 pinia 实例
const pinia = createPinia();

// 定义 store
const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    history: []
  }),
  getters: {
    double: (state) => state.count * 2,
    historyLength: (state) => state.history.length
  },
  actions: {
    increment() {
      this.count++;
      this.history.push(this.count);
    }
  }
});

// 使用 store
const store = useCounterStore(pinia);
store.increment();
console.log(store.count); // 1
```

### 4. UI 组件库

```javascript
import { Button, Input, Table, Modal, Form } from '@lytjs/ui';
import '@lytjs/ui/index.css';

// 直接在组件中使用
const App = {
  components: { Button, Input, Table, Modal, Form },
  setup() {
    const visible = ref(false);
    const data = ref([
      { id: 1, name: '张三', age: 28 },
      { id: 2, name: '李四', age: 32 }
    ]);
    
    return { visible, data };
  },
  template: `
    <div>
      <Button type="primary" @click="visible = true">
        打开弹窗
      </Button>
      
      <Modal v-model="visible" title="用户列表">
        <Table 
          :data="data" 
          :columns="[
            { prop: 'name', label: '姓名' },
            { prop: 'age', label: '年龄' }
          ]" 
        />
      </Modal>
    </div>
  `
};
```

---

## 进阶使用

### 使用 Vite 构建工具

```bash
npm install vite -D
```

创建 `vite.config.js`:
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  }
});
```

更新 `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### TypeScript 支持

```bash
npm install typescript -D
npx tsc --init
```

创建 `main.ts`:
```typescript
import { createApp, ref, Ref } from '@lytjs/core';

interface User {
  id: number;
  name: string;
}

const App = {
  setup() {
    const user: Ref<User | null> = ref(null);
    
    return { user };
  },
  template: `...`
};

createApp(App).mount('#app');
```

---

## 相关资源

- [LytJS 官方文档](../docs/)
- [LytJS 快速参考](../docs/getting-started/quick-reference.md)
- [更多示例](../)
- [LytJS 仓库](https://gitee.com)
