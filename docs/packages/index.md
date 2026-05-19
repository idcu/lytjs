# 包文档

> LytJS 框架所有官方包的完整文档

---

## 📦 包分类

### 🏗️ 核心包

LytJS 核心运行时包：

- **core** - 核心包（默认使用）
- **core-vnode** - VNode 模式版本
- **core-signal** - Signal/Vapor 模式版本

### ⚡ 响应式系统

响应式系统相关包：

- **reactivity** - 响应式系统核心（Signal、Computed、Effect）

### 🧩 组件系统

组件系统相关包：

- **component** - 组件系统实现

### 🌐 渲染系统

渲染系统相关包：

- **vdom** - 虚拟 DOM 实现
- **renderer** - 渲染器（包含 Vapor、SSR）
- **compiler** - 模板编译器

### 🛠️ Common 系列（重点突出）

公共工具包，零外部依赖：

- **common** - Common 包总览
  - common/constants - 常量定义
  - common/is - 类型判断工具
  - common/object - 对象和数组工具
  - common/string - 字符串工具
  - common/timing - 定时和 Promise 工具
  - common/error - 错误处理工具
  - common/assertions - 类型断言
  - common/warn - 警告和日志工具
  - common/dom - DOM 工具
  - common/dom-helpers - DOM 辅助工具
  - common/a11y - 无障碍工具
  - common/algorithm - 算法工具
  - common/cache - 缓存工具
  - common/env - 环境工具
  - common/events - 事件工具
  - common/http - HTTP 工具
  - common/keyboard - 键盘工具
  - common/memory - 内存工具
  - common/node-cache - Node 缓存工具
  - common/path - 路径工具
  - common/performance - 性能工具
  - common/query - 查询工具
  - common/raf - RAF 工具
  - common/render-queue - 渲染队列
  - common/scheduler - 调度器
  - common/security - 安全工具
  - common/storage - 存储工具
  - common/validate - 验证工具
  - common/vnode - VNode 工具
  - 以及更多...

### 🎯 平台适配

平台适配相关包：

- **adapter-web** - Web 平台适配器
- **dom** - DOM 平台封装
- **dom-runtime** - DOM 运行时
- **web** - Web 平台工具
- **host-contract** - 宿主契约

### 🌍 生态系统

生态系统包（在 ecosystem 目录下）：

- **router** - 路由系统
- **router-fs** - 文件系统路由
- **store** - 状态管理
- **ui** - UI 组件库
- **ssr** - 服务端渲染
- **devtools** - 开发工具
- **api** - API 工具
- **bundler** - 构建工具集成
- **hmr** - 热模块替换
- **runtime-edge** - 边缘运行时
- **compat** - 兼容性包

### 🔌 插件系统

插件系统包（在 plugins 目录下）：

- **plugin-data** - 数据获取插件
- **plugin-data-fetch** - 数据获取基础插件
- **plugin-form** - 表单管理插件
- **plugin-i18n** - 国际化插件
- **plugin-auth** - 认证插件
- **plugin-chart** - 图表插件
- **plugin-theme** - 主题插件
- **plugin-logger** - 日志插件
- **plugin-vite** - Vite 集成插件
- 以及更多...

### 🔧 工具包

工具包（在 tools 目录下）：

- **cli** - LytJS 命令行工具
- **test-utils** - 测试工具

### 📋 共享类型

共享类型包：

- **shared-types** - 共享类型定义

---

## 📂 导航

- [核心包](./core/)
- [响应式系统](./reactivity/)
- [组件系统](./component/)
- [渲染系统](./vdom/)
- [Common 系列](./common/)
- [平台适配](./adapter-web/)
- [生态系统](./ecosystem/)
- [插件系统](./plugins/)
- [工具包](./tools/)
- [共享类型](./shared-types/)
