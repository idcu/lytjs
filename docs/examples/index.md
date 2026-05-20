# 示例项目

这里提供了一些使用 Lyt.js 构建的示例项目，帮助你快速上手框架的各种特性。

## 交互式示例

### [交互式计数器](./interactive-counter) - 🔥 立即体验

在浏览器中直接体验响应式系统的魔力！无需安装任何东西！

- ✨ 实时计数
- 🔢 加倍计算
- 📜 历史记录
- 🎨 漂亮的界面

**点击进入 →** [交互式计数器](./interactive-counter)

## 在线演示

所有示例都可以在以下地址在线预览：

- [计数器示例](https://lytjs-examples.netlify.app/counter)
- [待办事项示例](https://lytjs-examples.netlify.app/todomvc)
- [用户列表示例](https://lytjs-examples.netlify.app/user-list)

## 本地运行

你可以克隆示例仓库并在本地运行：

```bash
git clone https://gitee.com/lytjs/lytjs-examples.git
cd lytjs-examples
pnpm install
pnpm dev
```

## 示例列表

### [计数器](./counter)

一个简单的计数器应用，展示了：

- 响应式状态 (`ref`, `signal`)
- 事件处理
- 条件渲染
- 样式绑定

**难度：** 入门  
**代码行数：** ~170 行  
**学习要点：** 响应式基础、组件结构

### [待办事项](./todomvc)

经典的 TodoMVC 应用，展示了：

- 列表渲染 (`v-for`)
- 表单处理
- 计算属性 (`computed`)
- 本地存储持久化
- 动态类绑定
- 双向绑定

**难度：** 初级  
**代码行数：** ~600 行  
**学习要点：** 状态管理、数据持久化、表单交互

### [用户列表](./user-list)

一个带 API 调用的用户列表应用，展示了：

- 异步数据获取
- 加载状态管理
- 错误处理
- 路由导航
- Composable 模式
- 防抖搜索
- 分页加载

**难度：** 中级  
**代码行数：** ~1000 行  
**学习要点：** 路由系统、API 集成、状态管理、代码组织

## 示例项目结构

```
examples/
├── counter/              # 计数器（入门）
│   ├── index.html
│   ├── src/
│   │   ├── App.js
│   │   └── styles.css
│   └── package.json
│
├── todomvc/              # 待办事项（初级）
│   ├── index.html
│   ├── src/
│   │   ├── App.js
│   │   └── styles.css
│   └── package.json
│
└── user-list/            # 用户列表（中级）
    ├── index.html
    ├── src/
    │   ├── App.js
    │   ├── components/
    │   ├── composables/
    │   ├── views/
    │   ├── router/
    │   └── api/
    └── package.json
```

## 学习路径建议

### 第一步：计数器

适合刚接触 LytJS 的开发者：

1. 了解 `createApp` 的基本用法
2. 学习 `ref` 创建响应式数据
3. 掌握事件处理（`onClick`）
4. 理解条件渲染和样式绑定

### 第二步：待办事项

适合已掌握基础的开发者：

1. 学习列表渲染（`map` 方法）
2. 掌握 `computed` 计算属性
3. 理解 `watch` 监听数据变化
4. 学习 `localStorage` 数据持久化
5. 掌握动态类绑定语法

### 第三步：用户列表

适合想要深入学习的开发者：

1. 掌握 Composable 模式
2. 学习路由系统（`@lytjs/router`）
3. 理解异步数据处理
4. 掌握错误处理和加载状态
5. 学习代码组织和模块化

## 贡献示例

我们欢迎社区贡献示例项目！

### 贡献要求

1. **代码质量**
   - 使用 TypeScript（如适用）
   - 遵循项目编码规范
   - 包含完整的注释

2. **文档要求**
   - 包含详细的中文注释
   - 解释关键代码段
   - 提供"下一步学习"指引

3. **示例主题建议**

   | 主题     | 难度 | 说明                 |
   | -------- | ---- | -------------------- |
   | 购物车   | 初级 | 状态管理、计算属性   |
   | 表单验证 | 初级 | 表单处理、验证逻辑   |
   | 博客系统 | 中级 | 路由、数据管理       |
   | 管理后台 | 中级 | 表格CRUD、权限控制   |
   | 实时聊天 | 高级 | WebSocket、状态同步  |
   | SSR 应用 | 高级 | 服务端渲染、数据预取 |

### 提交方式

1. Fork 项目
2. 创建示例目录
3. 编写代码和文档
4. 提交 Pull Request

## 更多资源

- [官方文档](../guide/)
- [API 参考](../api/)
- [教程](../tutorial/)
- [最佳实践](../tutorial/best-practices.md)
- [性能优化](../tutorial/performance.md)
