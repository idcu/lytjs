# Markdown 编辑器

一个使用 Lyt.js 构建的 Markdown 编辑器，支持实时预览和多种编辑功能。

## 功能特性

- **实时预览**：编辑时同步渲染 Markdown 为 HTML
- **工具栏**：快捷插入粗体、斜体、代码、标题、列表、引用等
- **多种视图模式**：分屏 / 纯编辑 / 纯预览
- **键盘快捷键**：Ctrl+B 粗体、Ctrl+I 斜体、Tab 缩进
- **字数统计**：实时显示编辑区字符数
- **深色主题**：Catppuccin Mocha 配色方案

## 技术栈

- **Lyt.js** `@lytjs/core` v5.0.1（CDN 加载）
- 纯 HTML + CSS + JavaScript，无需构建工具
- 内置简易 Markdown 解析器

## 展示的框架特性

| 特性 | 说明 |
|------|------|
| `createApp` | 创建应用实例，挂载到 body |
| `ref` | 响应式引用（编辑内容、视图模式） |
| `computed` | 计算属性（实时 HTML 渲染、字数统计） |
| `template` | 模板语法（v-model, v-html, v-if, @click, @keydown） |
| `setup()` | 组合式 API，封装所有逻辑 |

## 运行方式

1. 直接在浏览器中打开 `index.html`
2. 或使用本地服务器：
   ```bash
   npx serve .
   ```
