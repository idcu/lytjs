# Lyt.js Cursor IDE 集成

这个目录包含与 Cursor IDE 深度集成的配置和文档。

## 集成特点

- ✅ `.cursorrules`：Cursor 专用提示词
- ✅ 项目上下文自动加载
- ✅ 代码生成规范
- ✅ API 参考文档

## 快速开始

### 1. 在 Cursor 中打开项目

Cursor 会自动检测 `.cursorrules` 文件和 `.trae/` 目录中的内容。

### 2. 使用 Lyt.js 开发

直接在 Cursor 中对话：

**生成组件**：
```
创建一个搜索组件，包含输入框、搜索按钮、结果展示。
```

**生成 Store**：
```
创建一个用户 Store，包含登录、登出、个人信息管理。
```

**问题咨询**：
```
如何在 Lyt.js 中使用 Router？
```

## 项目上下文

Cursor 会自动读取以下文件作为上下文：

| 文件 | 用途 |
|------|------|
| `.trae/context.md` | 完整项目上下文 |
| `.trae/api-reference.md` | API 快速参考 |
| `.trae/quick-start.md` | 快速入门指南 |
| `.trae/best-practices.md` | 最佳实践 |
| `.trae/prompts/` | 专门代码生成提示词 |
| `llms-full.txt` | 项目详细信息 |

## Cursor 特有功能

### 代码生成示例

#### 计数器组件

```typescript
import { defineComponent } from '@lytjs/component'

export default defineComponent({
  name: 'Counter',
  state: {
    count: 0
  },
  methods: {
    increment() {
      this.count++
    }
  },
  template: `
    <div>
      <p>{{ count }}</p>
      <button @click="increment">+</button>
    </div>
  `
})
```

#### 购物车 Store

```typescript
import { createStore } from '@lytjs/store'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

export const useCartStore = createStore('cart', {
  state: {
    items: [] as CartItem[]
  },
  getters: {
    total: (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  },
  actions: {
    addItem(item: Omit<CartItem, 'quantity'>) {
      this.state.items.push({ ...item, quantity: 1)
    }
  }
})
```

## 常见用例

| 场景 | 提示词 |
|------|--------|
| 创建表单 | 创建一个登录表单 |
| 创建模态框 | 创建一个确认对话框 |
| 创建表格 | 创建一个数据表格组件 |
| 路由配置 | 配置项目路由 |
| 状态管理 | 创建状态管理 |

## 更多信息

- [Lyt.js 文档](../docs)
- [Cursor 官方网站](https://cursor.so/)
- [完整集成说明](../.trae/README.md)
