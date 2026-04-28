# Admin Dashboard - 企业级后台管理系统模板

基于 [Lyt.js](https://gitee.com/lytjs/lytjs) 构建的企业级 Admin Dashboard 模板，提供完整的后台管理功能演示。

## 技术栈

- **框架**: [Lyt.js](https://gitee.com/lytjs/lytjs) v5.0.1（通过 CDN 加载）
- **响应式**: Lyt.js Reactive System（ref, reactive, computed, watch）
- **样式**: 纯 CSS + CSS 变量（无需预处理器）
- **图表**: 原生 Canvas API 绘制
- **构建**: 无需构建，纯静态 HTML/CSS/JS

## 页面列表（10 个页面）

| 页面 | 文件 | 功能描述 |
|------|------|----------|
| 登录页 | `login.html` | 登录/注册切换、表单验证、密码强度检测、验证码、记住密码 |
| 仪表盘 | `index.html` | 统计卡片、折线图/柱状图、快捷操作、活动时间线、待办事项、用户排行 |
| 用户管理 | `users.html` | 数据表格、搜索筛选、分页、CRUD 模态框、角色分配、批量操作 |
| 角色权限 | `roles.html` | RBAC 权限管理、角色列表、权限树勾选、角色增删改 |
| 数据表格 | `table.html` | 排序、多条件筛选、数据导出、批量操作、订单详情查看 |
| 表单页面 | `forms.html` | 输入框、选择器、日期选择、文件上传、富文本编辑器、开关、滑块 |
| 图表页面 | `charts.html` | 折线图、柱状图、饼图、环形图、面积图（Canvas 绘制） |
| 个人设置 | `profile.html` | 头像上传、基本信息修改、密码修改、两步验证、登录设备管理、通知设置 |
| 系统设置 | `settings.html` | 通用配置、主题切换（亮/暗/自动）、主题色选择、通知设置、安全设置、危险操作 |
| 错误页面 | `error.html` | 404/500/403 错误页面、错误详情、返回操作 |

## 功能特性

### 布局系统
- 侧边栏导航（可折叠，支持多级菜单分组）
- 顶部栏（搜索框、通知铃铛、用户菜单）
- 面包屑导航
- 移动端底部导航栏
- 响应式设计（桌面端 / 平板 / 手机）

### 主题系统
- 亮色 / 暗色主题切换（CSS 变量驱动）
- 主题色自定义（6 种预设颜色）
- 紧凑模式
- 主题偏好持久化（localStorage）

### 交互功能
- Toast 通知系统
- 模态框（新增/编辑/查看）
- 表单验证（实时 + 提交时）
- 加载状态（Spinner）
- 确认操作
- 密码显示/隐藏
- 密码强度检测
- 验证码
- 文件上传（模拟）

### 数据展示
- 统计卡片（带趋势指示）
- 数据表格（排序、筛选、分页、全选、批量操作）
- Canvas 图表（折线图、柱状图、饼图、环形图、面积图）
- 活动时间线
- 待办事项列表
- 用户排行榜
- 权限树

## 运行方式

### 方式一：直接打开

由于使用 CDN 加载 Lyt.js，可以直接在浏览器中打开 HTML 文件：

```bash
# 使用任意 HTTP 服务器（推荐，避免 CORS 问题）
cd examples/admin-dashboard

# Python
python3 -m http.server 8080

# Node.js
npx serve .

# 然后访问 http://localhost:8080/login.html
```

### 方式二：VS Code Live Server

安装 Live Server 插件后，右键 `login.html` 选择 "Open with Live Server"。

### 登录提示

- 用户名: `admin`
- 密码: `admin123`

## 文件结构

```
examples/admin-dashboard/
  ├── theme.css          # 共享主题样式（CSS 变量 + 全局组件样式）
  ├── login.html         # 登录页
  ├── index.html         # 仪表盘（首页）
  ├── users.html         # 用户管理
  ├── users.js           # 用户管理逻辑
  ├── roles.html         # 角色权限
  ├── table.html         # 数据表格
  ├── forms.html         # 表单页面
  ├── charts.html        # 图表页面
  ├── profile.html       # 个人设置
  ├── settings.html      # 系统设置
  ├── error.html         # 错误页面
  └── README.md          # 本文件
```

## 设计规范

- 设计风格参考 Ant Design Pro
- 中文界面
- 暗色主题为默认主题
- 圆角 12px 卡片风格
- 蓝色主题色（#3b82f6）
- 代码包含充分的中文注释

## 浏览器兼容性

- Chrome 80+
- Firefox 80+
- Safari 14+
- Edge 80+
