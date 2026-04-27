# @lytjs/ai

Lyt.js AI 辅助开发 - 提供 AI 生成组件、页面、Store、API 等能力。

## 安装

```bash
npm install @lytjs/ai

# 或使用 pnpm
pnpm add @lytjs/ai
```

## 特性

- 🤖 OpenAI / Anthropic API 支持
- 📦 自动生成组件
- 📄 自动生成页面
- 📦 自动生成 Store
- 🎯 自动生成 API 路由
- 💡 AI IDE 集成（Trae / Cursor）

## 快速开始

### 初始化配置

```bash
# 初始化 AI 配置
lyt-ai init
```

这会在项目根目录创建 `.lytrc.json` 文件：

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "your-api-key",
    "model": "gpt-4o",
    "baseUrl": "https://api.openai.com/v1"
  }
}
```

### 使用 CLI 生成

```bash
# 生成组件
lytx generate component MyButton --type button --ai

# 生成 Store
lytx generate store counter --ai

# 生成页面
lytx generate page Home --ai

# 生成 API
lytx generate api users --ai
```

## API 参考

### AIGenerator 类

```javascript
import { AIGenerator } from '@lytjs/ai';

const generator = new AIGenerator({
  provider: 'openai',
  apiKey: 'your-api-key',
  model: 'gpt-4o'
});

// 生成组件
const componentCode = await generator.generateComponent({
  name: 'MyButton',
  type: 'button',
  description: '一个漂亮的按钮组件'
});

// 生成 Store
const storeCode = await generator.generateStore({
  name: 'counter',
  description: '计数器状态管理'
});

// 生成页面
const pageCode = await generator.generatePage({
  name: 'Home',
  description: '首页，包含欢迎信息'
});

// 生成 API
const apiCode = await generator.generateAPI({
  name: 'users',
  description: '用户管理 API'
});
```

## 集成到 LytX

```javascript
import { createLytX } from '@lytjs/lytx';
import { aiPlugin } from '@lytjs/ai';

const app = createLytX();
app.use(aiPlugin, {
  apiKey: 'your-api-key',
  model: 'gpt-4o'
});
```

## AI IDE 集成

### .trae 目录结构

```
.trae/
├── README.md              # AI IDE 集成说明
├── context.md             # 项目上下文
├── api-reference.md       # API 快速参考
├── quick-start.md         # 快速入门
├── best-practices.md      # 最佳实践
├── ai-integration-examples.md  # AI 使用示例
└── prompts/
    ├── component.md       # 组件生成提示词
    ├── store.md           # Store 生成提示词
    ├── page.md            # 页面生成提示词
    └── api.md             # API 生成提示词
```

### 在 Trae / Cursor 中使用

1. 打开项目时，IDE 会自动读取 `.trae` 目录下的配置
2. 使用自然语言描述需求，如："创建一个用户登录表单组件"
3. AI 会自动生成符合 Lyt.js 规范的代码

## llms.txt 与 llms-full.txt

为 AI 助手提供项目文档，帮助 AI 更好地理解项目结构和 API。

- **llms.txt**: 精简版摘要 (~150 行)，适合 AI 快速理解
- **llms-full.txt**: 完整 API 参考，包含类型签名和示例

## 示例

### 生成组件

```bash
# 使用 CLI
lytx generate component UserProfile --type profile --ai
```

生成的代码示例：

```vue
<template>
  <div class="user-profile">
    <div class="avatar">
      <img :src="user.avatar" :alt="user.name" />
    </div>
    <div class="info">
      <h2>{{ user.name }}</h2>
      <p>{{ user.bio }}</p>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from '@lytjs/core';

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
.user-profile {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.avatar img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
}
</style>
```

### 生成 Store

```bash
# 使用 CLI
lytx generate store todo --ai
```

生成的代码示例：

```javascript
import { defineStore } from '@lytjs/store';
import { ref, computed } from '@lytjs/reactivity';

export const useTodoStore = defineStore('todo', () => {
  const todos = ref([]);
  
  const completedTodos = computed(() => 
    todos.value.filter(todo => todo.completed)
  );
  
  const pendingTodos = computed(() => 
    todos.value.filter(todo => !todo.completed)
  );
  
  function addTodo(text) {
    todos.value.push({
      id: Date.now(),
      text,
      completed: false
    });
  }
  
  function toggleTodo(id) {
    const todo = todos.value.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  }
  
  function deleteTodo(id) {
    const index = todos.value.findIndex(t => t.id === id);
    if (index > -1) {
      todos.value.splice(index, 1);
    }
  }
  
  return { todos, completedTodos, pendingTodos, addTodo, toggleTodo, deleteTodo };
});
```

### 程序化使用

```javascript
import { AIGenerator } from '@lytjs/ai';

async function main() {
  const generator = new AIGenerator({
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o'
  });
  
  try {
    const code = await generator.generateComponent({
      name: 'ProductCard',
      type: 'card',
      description: '产品卡片，显示产品图片、名称、价格和购买按钮'
    });
    
    console.log('生成的代码:', code);
    
    // 保存到文件
    await fs.writeFile('./src/components/ProductCard.vue', code);
    
  } catch (error) {
    console.error('生成失败:', error);
    
    // AI 失败时降级到模板生成
    const fallbackCode = generator.fallbackComponent('ProductCard');
    console.log('使用模板生成:', fallbackCode);
  }
}

main();
```

## 降级策略

当 AI 生成失败时，会自动降级到模板生成，确保不阻塞开发流程：

```javascript
const generator = new AIGenerator(options);

try {
  const code = await generator.generateComponent(options);
} catch (error) {
  // 自动降级
  const code = generator.fallbackComponent(options);
}
```

## 性能

- 轻量级集成
- 智能缓存机制
- 失败时优雅降级

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
