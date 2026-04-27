# Lyt.js 企业级 Admin Dashboard 模板

> 内置登录、布局、权限、图表等完整后台管理功能的企业级管理后台模板。

## 功能特性

- **登录认证** - 完整的登录页面，支持记住密码、自动跳转
- **响应式布局** - 可折叠侧边栏 + 顶栏 + 内容区，适配移动端
- **路由管理** - 基于文件的路由配置，支持路由守卫和权限控制
- **状态管理** - 模块化 Store，包含用户、应用、权限三大模块
- **国际化** - 内置中英文双语支持，可扩展更多语言
- **主题切换** - 支持亮色/暗色主题一键切换
- **仪表盘** - 统计卡片、柱状图、折线图、活动列表、快捷操作
- **用户管理** - 搜索、新增、编辑、删除、分页
- **角色管理** - 角色列表、权限分配（树形结构 + 复选框）
- **系统设置** - 基本设置、安全设置、通知设置（Tabs 组件）
- **个人中心** - 头像上传、基本信息编辑、密码修改
- **404 页面** - 友好的未找到页面提示

## 快速开始

### 创建项目

```bash
# 使用 Lyt.js CLI 创建项目
lytx create my-admin --template admin

# 或手动安装
mkdir my-admin && cd my-admin
npm init -y
npx lytx init --template @lytjs/template-admin
```

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 项目结构

```
admin-dashboard/
├── index.html                  # HTML 入口文件
├── package.json                # 项目配置
├── README.md                   # 项目说明
└── src/
    ├── main.ts                 # 应用入口（插件注册）
    ├── App.lyt                 # 根组件
    ├── styles.css              # 全局样式
    ├── router/
    │   └── index.ts            # 路由配置
    ├── store/
    │   └── index.ts            # 状态管理（用户/应用/权限）
    ├── layouts/
    │   └── AdminLayout.lyt     # 管理后台布局（侧边栏+顶栏+内容区）
    └── pages/
        ├── Dashboard.lyt       # 仪表盘
        ├── Login.lyt           # 登录页
        ├── Users.lyt           # 用户管理
        ├── Roles.lyt           # 角色管理
        ├── Settings.lyt        # 系统设置
        ├── Profile.lyt         # 个人中心
        └── NotFound.lyt        # 404 页面
```

## 页面说明

| 页面 | 路由 | 说明 |
|------|------|------|
| 登录页 | `/login` | 用户名密码登录，支持记住密码 |
| 仪表盘 | `/dashboard` | 统计卡片、图表、活动列表、快捷操作 |
| 用户管理 | `/users` | 用户列表搜索、新增、编辑、删除、分页 |
| 角色管理 | `/roles` | 角色列表、权限分配（侧滑面板） |
| 系统设置 | `/settings` | 基本设置 / 安全设置 / 通知设置 |
| 个人中心 | `/profile` | 头像上传、信息编辑、密码修改 |
| 404 页面 | `*` | 未找到页面提示 |

## 技术栈

- **Lyt.js Core** - 核心框架
- **@lytjs/router** - 路由管理
- **@lytjs/store** - 状态管理
- **@lytjs/plugin-i18n** - 国际化
- **@lytjs/plugin-auth** - 认证授权
- **@lytjs/plugin-logger** - 日志系统
- **@lytjs/plugin-theme** - 主题管理

## 模板语法

本模板使用 Lyt.js 模板语法：

| 功能 | 语法 | 说明 |
|------|------|------|
| 条件渲染 | `if={condition}` | 条件为真时渲染 |
| 列表渲染 | `each={item in list}` | 遍历数组渲染 |
| 属性绑定 | `:attr="value"` | 动态绑定属性 |
| 事件绑定 | `on:event="handler"` | 绑定事件处理 |
| 双向绑定 | `bind:value="data"` | 表单双向绑定 |

## 截图

> 模板运行后可查看以下页面效果：

- 登录页面 - 居中登录卡片，渐变背景
- 仪表盘 - 统计卡片、柱状图、折线图
- 用户管理 - 数据表格、搜索、分页
- 角色管理 - 角色列表、权限分配面板
- 系统设置 - Tabs 切换、表单组件
- 个人中心 - 头像、信息编辑、密码修改

## License

MIT
