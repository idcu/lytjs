# Todo App - 待办事项

一个使用 Lyt.js 构建的待办事项应用，展示框架的核心响应式系统和组合式 API。

## 功能特性

- **添加/删除待办**：输入任务内容，按回车或点击按钮添加
- **切换完成状态**：点击复选框标记任务完成/未完成
- **过滤视图**：全部 / 进行中 / 已完成
- **计数统计**：实时显示各状态任务数量
- **清除已完成**：一键清除所有已完成的任务
- **LocalStorage 持久化**：数据自动保存到浏览器本地存储

## 技术栈

- **Lyt.js** `@lytjs/core` v5.0.0（CDN 加载）
- 纯 HTML + CSS + JavaScript，无需构建工具

## 展示的框架特性

| 特性 | 说明 |
|------|------|
| `createApp` | 创建应用实例并挂载到 DOM |
| `ref` | 基本类型响应式引用 |
| `computed` | 计算属性（过滤列表、统计计数） |
| `watchEffect` | 副作用（自动持久化到 LocalStorage） |
| `setup()` | 组合式 API 入口 |
| `template` | 模板语法（v-model, v-for, v-if, @click, :class, {{ }}） |

## 运行方式

1. 直接在浏览器中打开 `index.html`
2. 或使用本地服务器：
   ```bash
   npx serve .
   # 访问 http://localhost:3000
   ```
