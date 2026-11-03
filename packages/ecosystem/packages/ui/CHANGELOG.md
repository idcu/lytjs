# @lytjs/ui

## [Unreleased]

### 🐞 修复（对话框的无障碍契约：焦点 / Escape / aria 树）

三个弹层各自实现了一套焦点与键盘处理，**三套都是错的、错法还各不相同** ——
而它们视觉上完全正常（弹窗出现了、鼠标能点），只有键盘 / 读屏用户用不了。

- **`Modal` 的遮罩层 `aria-hidden="true"` 包着 `role="dialog"`**（P0）：整棵子树被移出
  无障碍树，读屏软件**完全看不到对话框内容**（连「对话框」都不会播报）。
  `aria-hidden` 只能挂在**装饰性兄弟节点**上（`Dialog` / `Drawer` 的遮罩就是兄弟节点，
  那才是正确写法），不能挂在容器上。
- **三个弹层打开后焦点都不进入**：`activeElement` 仍是触发按钮 / `body`，
  Tab 会走到对话框**背后**的页面。
- **`Modal` / `Dialog` 的 Escape 永不生效**：处理函数挂在元素上，而焦点从未进入该元素
  ⇒ 事件收不到。（`Drawer` 用的是 `window` 监听，所以它的 Escape 反而"能关"。）
- **关闭后焦点不回到触发元素**：`activeElement` 落在被移除的节点 / `body`。
- **`Drawer` 的 Escape 是 `window.addEventListener`、在 setup 里注册且从不移除**：
  卸载后仍响应；**N 个抽屉按一次 Escape 全部关闭**（没有「最上层」概念）。
- **`Modal` 的 `top` 默认 `'15vh'` 被拼成 `top: 15vhpx`**：非法 CSS，浏览器整条丢弃
  ⇒ 默认顶部偏移从未生效（实测 `style` 里只剩 `width: 50%`），而且没有任何报错。

### ✨ 新增

- 新增内部模块 `components/overlay-focus.ts`：三个弹层共用的焦点 / Escape 控制器
  （document 级监听 + **只关最上层** + 焦点陷阱 + 卸载清理 + 关闭恢复焦点）。
  底层就是 `@lytjs/common-a11y` 的 `focusTrap` —— 这个工具此前**一次都没被调用过**。
- `Dialog` 的内联焦点陷阱（`getFocusableElements` / `handleTabKey` / `effect`）迁移到
  统一控制器：原来那套用 `offsetParent !== null` 判可见，而 `position: fixed` 元素的
  `offsetParent` 恒为 `null` ⇒ 固定定位对话框里**所有**元素都被判为不可见，列表为空。

### 🐞 修复（Pagination 受控行为 3 个 + v-model）

- **`current` prop 变化被忽略**：内部 `signal(p.current)` 只在创建时取一次值 ⇒
  父组件把页码重置为 1（筛选条件变化）时，分页器**仍停在第 5 页**。
  现在 `watch` props 并同步内部 signal。
- **`pageSize` prop 变化被忽略**：每页条数变了，页码数量不变。同上。
- **`current` 越界时不夹取**：`current=10 / total=30`（只有 3 页）时页码区
  **一个 `--active` 都没有**、「下一页」仍可点。现在渲染时夹到 `[1, totalPages]`。
- **`v-model:current` 静默无效**：组件从不 `emit('update:current')`。
  现在点击页码 / 切换每页条数都会 emit（`update:current` / `update:pageSize`）。

### 🔧 迁出核查

- 依赖清理：移除 `src` / `tests` / `examples` 中完全未引用的 `@lytjs/common-env` / `@lytjs/common-dom` 运行时依赖（同步清理 tsup external / vitest alias / tsconfig paths）
- README 补充「简介·独立声明」「依赖关系」章节，明确 v6.10 迁出为独立仓库 `lytjs-ui` 的规划
- 确认零第三方依赖：仅依赖 LytJS 核心框架（reactivity / component / vdom / core）与通用工具（common-is / common-a11y）

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## 6.6.0

发布日期: 2026-05-21

### 主要更新

- 版本升级至 v6.6.0
- 保持完全向后兼容
- 依赖更新：所有相关依赖包已更新至 6.6.0

## 6.5.0

发布日期: 2026-05-19

### 主要更新

- 版本升级至 v6.5.0
- 保持完全向后兼容
- 依赖更新：所有相关依赖包已更新至 6.5.0

## 6.4.0

发布日期: 2026-05-18

### 主要更新

- Monorepo 包发布
- 核心修复内容：文档完善、构建与发布优化

### 依赖更新

- 更新依赖到 6.4.0 版本：
  - @lytjs/core@6.4.0
  - @lytjs/reactivity@6.4.0
  - @lytjs/vdom@6.4.0
  - @lytjs/component@6.4.0

## 6.1.0

### 主要更新

- chore: 发布 6.1.0，包含改进和错误修复

  ## 摘要

  此版本包含对响应式系统、编译器、渲染器、路由、状态管理、SSR、UI 组件和开发工具的改进。

  ### 核心
  - 增强的应用配置和生命周期管理
  - 改进的插件系统
  - 更好的错误边界处理

  ### 编译器
  - 优化的信号代码生成
  - 改进的单文件组件解析和转换
  - 增强的 SSR 编译支持

  ### 响应式系统
  - 更好的 effect 作用域管理
  - 改进的异步计算和批量更新
  - 增强的信号性能

  ### 渲染器
  - 优化的 DOM 补丁
  - 更好的基于信号的渲染
  - 改进的 SSR 流式传输

  ### 生态系统
  - 路由：增强的导航和匹配
  - 状态管理：改进的状态管理
  - SSR：更好的水合和流式传输
  - UI：组件改进
  - 开发工具：增强的调试工具

### 补丁更新

- 更新依赖
  - @lytjs/reactivity@6.1.0
  - @lytjs/vdom@6.1.0
  - @lytjs/component@6.1.0
