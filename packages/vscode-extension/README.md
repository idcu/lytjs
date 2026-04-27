# Lyt.js VSCode Extension

> Lyt.js 语言支持扩展 - 提供语法高亮、类型检查、代码补全、调试、代码片段和 Emmet 支持

**版本：** 4.2.0

## 功能特性

- **语法高亮** - 为 `.lyt` 文件提供完整的语法高亮
- **代码补全** - 内置指令（`v-if`、`v-model` 等）和组件（`Transition`、`KeepAlive` 等）的智能补全
- **代码片段** - 丰富的代码片段，快速生成常用代码结构
- **类型检查** - 实时类型检查和诊断
- **调试支持** - 支持 Launch 和 Attach 两种调试模式
- **Emmet 支持** - 在 `.lyt` 文件中使用 Emmet 缩写

## 安装

### 从 VSCode 市场安装

在 VSCode 扩展市场搜索 **Lyt.js Language Support** 并安装。

### 从源码安装

```bash
# 克隆仓库
git clone https://gitee.com/lytjs/lytjs.git
cd lytjs/packages/vscode-extension

# 安装依赖
npm install

# 编译
npm run build

# 在 VSCode 中按 F5 启动调试
```

## 命令

| 命令 | 描述 |
|------|------|
| `Lyt.js: Show Welcome` | 显示欢迎信息 |
| `Lyt.js: Create Component` | 创建新组件 |
| `Lyt.js: Create Page` | 创建新页面 |
| `Lyt.js: Create Store` | 创建新 Store |
| `Lyt.js: Toggle Theme` | 切换编辑器主题 |

## 代码补全

插件为 `.lyt` 文件提供以下补全内容：

### 内置指令

| 指令 | 说明 |
|------|------|
| `v-if` | 条件渲染 |
| `v-else` | 条件渲染 - else 分支 |
| `v-else-if` | 条件渲染 - else if 分支 |
| `v-each` | 列表渲染 |
| `v-bind` | 属性绑定 |
| `v-model` | 双向绑定 |
| `v-on` | 事件监听 |
| `v-show` | 显示切换 |

### 内置组件

| 组件 | 说明 |
|------|------|
| `Transition` | 过渡动画组件 |
| `TransitionGroup` | 列表过渡组件 |
| `KeepAlive` | 缓存组件 |
| `Suspense` | 异步组件加载 |

触发字符：`v-`、`@`、`:`

## 调试配置

### Launch 模式

```json
{
  "type": "lytjs",
  "request": "launch",
  "name": "Lyt.js: Launch Dev Server",
  "url": "http://localhost:5173",
  "webRoot": "${workspaceFolder}",
  "sourceMaps": true
}
```

### Attach 模式

```json
{
  "type": "lytjs",
  "request": "attach",
  "name": "Lyt.js: Attach to Dev Server",
  "port": 9229,
  "webRoot": "${workspaceFolder}",
  "sourceMaps": true
}
```

## 配置项

在 VSCode 设置中可配置以下选项：

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `lytjs.enableTypeChecking` | `boolean` | `true` | 启用 .lyt 文件的类型检查 |
| `lytjs.enableAutoComplete` | `boolean` | `true` | 启用 .lyt 文件的代码补全 |
| `lytjs.snippets.enabled` | `boolean` | `true` | 启用 Lyt.js 代码片段 |
| `lytjs.debug.port` | `number` | `5173` | 默认调试端口 |
| `lytjs.debug.url` | `string` | `http://localhost:5173` | 默认调试 URL |
| `lytjs.emmet.enabled` | `boolean` | `true` | 启用 Emmet 支持 |

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 监听编译
npm run watch

# 代码检查
npm run lint

# 运行测试
npm test
```

## License

MIT
