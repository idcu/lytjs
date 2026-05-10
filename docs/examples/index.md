# 示例项目

这里提供了一些使用 Lyt.js 构建的示例项目，帮助你快速上手框架的各种特性。

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

- 响应式状态 (`ref`)
- 事件处理
- 条件渲染

**难度：** 入门

### [待办事项](./todomvc)

经典的 TodoMVC 应用，展示了：

- 列表渲染 (`v-for`)
- 表单处理
- 计算属性 (`computed`)
- 本地存储持久化

**难度：** 初级

### [用户列表](./user-list)

一个带 API 调用的用户列表应用，展示了：

- 异步数据获取
- 加载状态管理
- 错误处理
- 路由导航

**难度：** 中级

## 贡献示例

欢迎提交你的示例项目！请参考[贡献指南](../guide/contributing)了解如何提交。
