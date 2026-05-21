# LytJS v6.6.0 发布包清单

> 发布日期：2026-05-21
> 总计：85 个可发布包

---

## 包分类统计

| 分类          | 数量   | 说明                      |
| ------------- | ------ | ------------------------- |
| 基础类型包    | 1      | 共享类型定义              |
| 核心运行时    | 1      | 主机契约                  |
| Common 工具包 | 31     | 常用工具函数库            |
| 核心框架包    | 13     | 响应式、虚拟DOM、编译器等 |
| 生态系统包    | 12     | Router、SSR、Store 等     |
| Web 框架包    | 9      | HTTP 服务、中间件等       |
| 插件包        | 14     | Vite 插件、UI 组件等      |
| 工具包        | 4      | CLI、测试工具等           |
| **总计**      | **85** |                           |

---

## 1. 基础类型包（1 个）

| 包名                | 版本  | 说明                       | 状态      |
| ------------------- | ----- | -------------------------- | --------- |
| @lytjs/shared-types | 6.6.0 | 共享类型定义，供所有包使用 | ✅ 已发布 |

---

## 2. 核心运行时包（1 个）

| 包名                 | 版本  | 说明                                | 状态      |
| -------------------- | ----- | ----------------------------------- | --------- |
| @lytjs/host-contract | 6.6.0 | 统一渲染主机接口 - 跨平台渲染适配器 | ✅ 已发布 |

---

## 3. Common 工具包（31 个）

| 包名                            | 版本  | 说明                       | 状态      |
| ------------------------------- | ----- | -------------------------- | --------- |
| @lytjs/common-constants         | 6.6.0 | 常用常量                   | ✅ 已发布 |
| @lytjs/common-is                | 6.6.0 | 类型判断工具               | ✅ 已发布 |
| @lytjs/common-security          | 6.6.0 | 安全相关工具               | ✅ 已发布 |
| @lytjs/common-string            | 6.6.0 | 字符串处理工具             | ✅ 已发布 |
| @lytjs/common-path              | 6.6.0 | 路径处理工具               | ✅ 已发布 |
| @lytjs/common-object            | 6.6.0 | 对象处理工具               | ✅ 已发布 |
| @lytjs/common-error             | 6.6.0 | 错误处理工具               | ✅ 已发布 |
| @lytjs/common-warn              | 6.6.0 | 警告处理工具               | ✅ 已发布 |
| @lytjs/common-events            | 6.6.0 | 事件系统                   | ✅ 已发布 |
| @lytjs/common-cache             | 6.6.0 | 缓存工具                   | ✅ 已发布 |
| @lytjs/common-timing            | 6.6.0 | 计时器工具                 | ✅ 已发布 |
| @lytjs/common-algorithm         | 6.6.0 | 算法工具                   | ✅ 已发布 |
| @lytjs/common-vnode             | 6.6.0 | 虚拟节点工具               | ✅ 已发布 |
| @lytjs/common-scheduler         | 6.6.0 | 调度器                     | ✅ 已发布 |
| @lytjs/common-dom               | 6.6.0 | DOM 操作工具               | ✅ 已发布 |
| @lytjs/common-query             | 6.6.0 | DOM 查询工具               | ✅ 已发布 |
| @lytjs/common-dom-helpers       | 6.6.0 | DOM 辅助工具               | ✅ 已发布 |
| @lytjs/common-a11y              | 6.6.0 | 无障碍访问工具             | ✅ 已发布 |
| @lytjs/common-keyboard          | 6.6.0 | 键盘事件工具               | ✅ 已发布 |
| @lytjs/common-storage           | 6.6.0 | 存储工具                   | ✅ 已发布 |
| @lytjs/common-validate          | 6.6.0 | 数据验证工具               | ✅ 已发布 |
| @lytjs/common-http              | 6.6.0 | HTTP 工具                  | ✅ 已发布 |
| @lytjs/common-raf               | 6.6.0 | requestAnimationFrame 工具 | ✅ 已发布 |
| @lytjs/common-render-queue      | 6.6.0 | 渲染队列                   | ✅ 已发布 |
| @lytjs/common-event-normalizer  | 6.6.0 | 事件标准化工具             | ✅ 已发布 |
| @lytjs/common-node-cache        | 6.6.0 | Node 缓存工具              | ✅ 已发布 |
| @lytjs/common-async-scheduler   | 6.6.0 | 异步调度器                 | ✅ 已发布 |
| @lytjs/common-transition-engine | 6.6.0 | 过渡动画引擎               | ✅ 已发布 |
| @lytjs/common-performance       | 6.6.0 | 性能监控工具               | ✅ 已发布 |
| @lytjs/common-assertions        | 6.6.0 | 断言工具                   | ✅ 已发布 |
| @lytjs/common-memory            | 6.6.0 | 内存管理工具               | ✅ 已发布 |
| @lytjs/common-env               | 6.6.0 | 环境变量工具               | ✅ 已发布 |
| @lytjs/common-rate-limit        | 6.6.0 | 限流工具                   | ✅ 已发布 |
| @lytjs/common                   | 6.6.0 | Common 汇总包              | ✅ 已发布 |

---

## 4. 核心框架包（13 个）

| 包名                    | 版本  | 说明            | 状态      |
| ----------------------- | ----- | --------------- | --------- |
| @lytjs/reactivity       | 6.6.0 | 响应式系统核心  | ✅ 已发布 |
| @lytjs/vdom             | 6.6.0 | 虚拟 DOM 实现   | ✅ 已发布 |
| @lytjs/dom-runtime      | 6.6.0 | DOM 运行时      | ✅ 已发布 |
| @lytjs/compiler         | 6.6.0 | 编译器          | ✅ 已发布 |
| @lytjs/renderer         | 6.6.0 | 渲染器核心      | ✅ 已发布 |
| @lytjs/adapter-web      | 6.6.0 | Web 平台适配器  | ✅ 已发布 |
| @lytjs/dom              | 6.6.0 | DOM 操作封装    | ✅ 已发布 |
| @lytjs/web              | 6.6.0 | Web 平台核心    | ✅ 已发布 |
| @lytjs/component        | 6.6.0 | 组件系统        | ✅ 已发布 |
| @lytjs/core             | 6.6.0 | 核心框架        | ✅ 已发布 |
| @lytjs/core-signal      | 6.6.0 | Signal 信号系统 | ✅ 已发布 |
| @lytjs/core-vnode       | 6.6.0 | 核心虚拟节点    | ✅ 已发布 |
| @lytjs/platform-adapter | 6.6.0 | 跨平台适配器    | ✅ 已发布 |
| @lytjs/ui               | 6.6.0 | 官方 UI 组件库  | ✅ 已发布 |

---

## 5. 生态系统包（12 个）

| 包名                      | 版本  | 说明                 | 状态      |
| ------------------------- | ----- | -------------------- | --------- |
| @lytjs/router             | 6.6.0 | 路由系统             | ✅ 已发布 |
| @lytjs/router-fs          | 6.6.0 | 文件系统路由         | ✅ 已发布 |
| @lytjs/store              | 6.6.0 | 状态管理             | ✅ 已发布 |
| @lytjs/ssr                | 6.6.0 | SSR 服务端渲染       | ✅ 已发布 |
| @lytjs/ssg                | 6.6.0 | SSG 静态生成         | ✅ 已发布 |
| @lytjs/cache-isr          | 6.6.0 | ISR 缓存策略         | ✅ 已发布 |
| @lytjs/html-renderer      | 6.6.0 | HTML 渲染器          | ✅ 已发布 |
| @lytjs/hmr                | 6.6.0 | 热模块替换           | ✅ 已发布 |
| @lytjs/api                | 6.6.0 | API 集成层           | ✅ 已发布 |
| @lytjs/bundler            | 6.6.0 | 打包工具             | ✅ 已发布 |
| @lytjs/compat             | 6.6.0 | 兼容性工具           | ✅ 已发布 |
| @lytjs/devtools           | 6.6.0 | 开发工具             | ✅ 已发布 |
| @lytjs/devtools-extension | 6.6.0 | 浏览器 DevTools 扩展 | ✅ 已发布 |
| @lytjs/runtime-edge       | 6.6.0 | Edge 运行时          | ✅ 已发布 |

---

## 6. Web 框架包（9 个）

| 包名                         | 版本  | 说明        | 状态      |
| ---------------------------- | ----- | ----------- | --------- |
| @lytjs/middleware            | 6.6.0 | 中间件核心  | ✅ 已发布 |
| @lytjs/middleware-auth       | 6.6.0 | 认证中间件  | ✅ 已发布 |
| @lytjs/middleware-cors       | 6.6.0 | CORS 中间件 | ✅ 已发布 |
| @lytjs/middleware-rate-limit | 6.6.0 | 限流中间件  | ✅ 已发布 |
| @lytjs/http-server           | 6.6.0 | HTTP 服务器 | ✅ 已发布 |
| @lytjs/metadata              | 6.6.0 | 元数据管理  | ✅ 已发布 |

---

## 7. 插件包（14 个）

| 包名                     | 版本  | 说明          | 状态      |
| ------------------------ | ----- | ------------- | --------- |
| @lytjs/plugin-vite       | 6.6.0 | Vite 集成插件 | ✅ 已发布 |
| @lytjs/plugin-animation  | 6.6.0 | 动画插件      | ✅ 已发布 |
| @lytjs/plugin-auth       | 6.6.0 | 认证插件      | ✅ 已发布 |
| @lytjs/plugin-chart      | 6.6.0 | 图表插件      | ✅ 已发布 |
| @lytjs/plugin-data       | 6.6.0 | 数据管理插件  | ✅ 已发布 |
| @lytjs/plugin-data-fetch | 6.6.0 | 数据获取插件  | ✅ 已发布 |
| @lytjs/plugin-form       | 6.6.0 | 表单处理插件  | ✅ 已发布 |
| @lytjs/plugin-i18n       | 6.6.0 | 国际化插件    | ✅ 已发布 |
| @lytjs/plugin-logger     | 6.6.0 | 日志插件      | ✅ 已发布 |
| @lytjs/plugin-storage    | 6.6.0 | 存储插件      | ✅ 已发布 |
| @lytjs/plugin-theme      | 6.6.0 | 主题插件      | ✅ 已发布 |
| @lytjs/plugin-testing    | 6.6.0 | 测试插件      | ✅ 已发布 |
| @lytjs/plugin-validation | 6.6.0 | 验证插件      | ✅ 已发布 |

---

## 8. 工具包（4 个）

| 包名              | 版本  | 说明       | 状态      |
| ----------------- | ----- | ---------- | --------- |
| @lytjs/test-utils | 6.6.0 | 测试工具   | ✅ 已发布 |
| @lytjs/cli        | 6.6.0 | 命令行工具 | ✅ 已发布 |

---

## 不发布的包（Monorepo 配置包）

以下包是 monorepo 配置文件，不需要发布：

| 包名                                                                | 说明                   |
| ------------------------------------------------------------------- | ---------------------- |
| packages/ecosystem/packages/monorepo                                | Monorepo 配置          |
| packages/ecosystem/packages/plugins-monorepo                        | 插件 monorepo 配置     |
| packages/ecosystem/packages/ssr-kit/packages/ssr-kit-monorepo       | SSR Kit monorepo       |
| packages/ecosystem/packages/web-framework/packages/ssr-kit-monorepo | Web Framework monorepo |
| packages/ecosystem/packages/tools-monorepo                          | 工具 monorepo 配置     |
| playground                                                          | 开发 playground        |
| examples                                                            | 示例项目               |
| e2e                                                                 | 端到端测试             |
| docs                                                                | 文档站点               |
| benchmarks                                                          | 性能基准测试           |

---

## 发布状态

- **总包数**：85 个
- **已发布**：85 个
- **发布成功率**：100%
- **版本**：6.6.0
- **发布令牌**：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（已过期，需更新）
- **npm 组织**：@lytjs

---

## 发布脚本使用

```bash
# 发布所有包
tsx scripts/publish-all.ts

# 查看发布状态
cat publish-summary.json

# 验证包是否发布成功
npm view @lytjs/core version
npm view @lytjs/router version
npm view @lytjs/ssr version
npm view @lytjs/hmr version
```

---

## 安全说明

⚠️ **重要提醒**：

- `.npmrc_for_publish` 文件包含 npm token，已加入 `.gitignore`
- `.npmrc` 文件不应该包含 token
- 发布时 token 从 `.npmrc_for_publish` 读取，无需手动配置
