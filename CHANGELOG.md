# Changelog

本项目的所有重要变更将记录在此文件中。

## [Unreleased]

### 🛠️ 编译器：signal 表示层对齐 vnode（DOM 层级，2026-11-08）

**行为修正（`rendererMode:'signal'`，base 与 `optimizeSignal:true` 同步）**

- **`template v-for` 每项不再产生外层 `<div>`**：此前列表项的 `create` 返回一个
  `document.createElement('div')` 宿主，渲染结果每项外面都套一层 `div`（与 vnode 路径
  的元素层级不同）。现在先挂到 `DocumentFragment`，再把 **Fragment 自身的子节点整组**
  返回（首尾就是 Fragment 的注释锚点），不产生任何元素包裹。
  为此 `@lytjs/dom-runtime` 的 `reconcileArray` 支持 `create` 返回一组节点（`Node[]`）：
  整组更新 / 重排 / 删除一起处理，`update` 可返回重建后的新组（内容替换不重插旧节点）。
- **用户可见影响**：`template v-for` 的 DOM 元素层级与 vnode 路径一致；`:first-child`、
  `> *`、`children.length`、`querySelectorAll('*')` 的结果不再被每项的外层 `div` 干扰。
  多出的只有注释锚点（与 Fragment 在 vnode 路径中的锚点相同），不是元素。
- **快照点名**（既有条目，逐份说明）：`tf02`、`lf02`、`lf02b`、`lf03b` 的 `expected` /
  `expectedAfter` 与 signal 快照（base + opt 各一份）由「每项外包 `<div>`」变为
  「首尾注释锚点 + 内容」；新增 `lv01`（`template v-for` 键控重排，含 `expectedAfter`），
  其 signal 快照与 vnode/SSR 快照为新增条目。除上述 4 条外，其余既有条目逐字不变。
- **负控**：回退上述 codegen 改动后 parity 10 项红（5 条语料 × 2 profile）、
  signal 快照红；恢复后全绿。

### 🛠️ 编译器：signal 条件/列表正确性修复（vnode 为验收基准，2026-11-08）

**行为修正（`rendererMode:'signal'`，base 与 `optimizeSignal:true` 同步）**

- **`v-if` → `v-else` 切换清理旧节点**：此前只有第 0 支在切换时 `remove()` 旧元素，
  进入 `v-else`/`v-else-if` 后旧分支残留在 DOM 且引用丢失。现在所有分支切换都清理。
  新增 parity 语料 `cf01`（含 `expectedAfter` 更新后断言）；负控回退后 parity 与快照双红。
- **分支内嵌 `v-if/v-else` 不再被丢弃**：元素分支内的条件此前既不参与分支静态 HTML，
  也不参与分支动态绑定，整段内容（含同级的静态文本）静默消失。现在分支 HTML 为内嵌条件
  留 `<span data-lyt-if="1" style="display:contents">` 占位，运行期把选中的分支 vnode 挂进占位；
  分支内嵌 `<template v-if>`（`tf03`）经 vnode 序列化补齐（哨兵映射到 `Fragment`，
  `isComponent` 误判不再让哨兵当普通标签透出）。
- 新增 parity 语料 `cf02`（内嵌 `v-if`）、`cf02b`（内嵌 `v-if/v-else`）、
  `cf02c`（内嵌动态属性 + 插值 + 后续静态兄弟，验证占位顺序与更新），
  `tf03` 升级为带语义基准（`expected`/`expectedAfter`）。负控回退后 parity 7 项红、
  快照 8 份红；恢复后全绿。
- 快照变化仅 `tf03`（本构造）+ 新增 `cf02/2b/2c`：`tf03` 因新增 `Text` 导入与嵌套条件
  序列化而变，属本修复的必然结果；其余 104 条既有条目逐字不变。
- **`v-for` 元素内嵌 `v-if` 引用局部变量时列表项空渲染**：列表项子节点此前只认
  「文本 / 嵌套元素」，条件节点被直接丢弃。现在列表项把选中分支 vnode 挂进元素本身
  （多子节点用 `Fragment` 保序），局部变量（`it` / `i`）经 `locals` 正确前缀化；
  顺带支持 `COMPOUND_EXPRESSION`（`{{it}}!` 这类拼接文本）。
  新增 parity 语料 `lf01`（对象项条件）、`lf01b`（局部索引 + `v-else` + 拼接文本）；
  负控回退后 parity 4 项红、快照 4 份红；恢复后全绿。
- **`template v-for` 内嵌 `v-if` 时 Fragment 只剩注释锚点**：模板列表项的子节点此前
  逐个只走 `serializeVNodeCall`（只认 `VNODE_CALL`），条件节点被丢弃，Fragment 内
  只剩 `<!---->`。现在子节点改走完整 vnode 序列化，内嵌条件与拼接文本都进 Fragment。
  新增 parity 语料 `lf02`（对象项条件）、`lf02b`（局部索引 + `v-else`）；
  负控回退后 parity 4 项红、快照 4 份红；恢复后全绿。
- **`v-for` 与 `v-if` 同元素抛 `Invalid value used as weak map key`**：transform 把
  renderItem 包成条件表达式，但列表分支只认 `VNODE_CALL` ⇒ `renderItem` 为 null ⇒
  `create` 回调返回 `undefined` ⇒ `reconcileArray` 以 `undefined` 作 WeakMap 键。
  现在识别条件包裹并取 consequent 的 vnode；`v-if` 等同一项过滤
  （`source.filter((item, index) => cond)`，隐藏项不创建 DOM，与 vnode 路径一致）。
  新增 parity 语料 `lf03`（元素）、`lf03b`（`template` 列表项）；
  负控回退后 parity 4 项红、快照 4 份红；恢复后全绿。

### 🛠️ 编译器：signal 两套 profile 支持 `<template>` 片段（2026-11-08）

**行为修正（`rendererMode:'signal'`，base 与 `optimizeSignal:true` 同步）**

- `<template>` 的 `__LYTJS_FRAGMENT__` 哨兵不再被当作组件名直传，改为映射到运行时
  `Fragment` 并用 `mountVNode` 挂载：`<template v-if>` 分支此前会抛
  `ReferenceError: __LYTJS_FRAGMENT__ is not defined`，`<template v-for>` 此前静默产出空项；
  修复后在两套 profile 下均真实渲染子内容与多项。
- 分支宿主用 `<span data-lyt-frag="1" style="display:contents">` 承载 Fragment，
  挂载语义与 vnode 路径一致（Fragment 自身不产生布局盒）。
- 门禁补齐 4 条 `<template>` 语料（`tf01` v-if / `tf02` v-for / `tf03` 嵌套 / `tf04` 空分支），
  parity 104/104、signal 快照 104×2 逐字一致；原有 100 模板 × 2 profile 产物
  **逐字不变**（仅新增条目）。负控：回退「哨兵直传」后 parity 4 条新增分叉、快照 4 份报红。
- 已知残余：嵌套 `<template v-if>`（`tf03`）在两套 profile 下仍为空渲染（一致），
  属分支内条件节点的独立缺口，本批未改。

### 🛠️ 编译器：基础 signal 实现修复 8 处缺陷 + vnode/SSR 对拍安全网（B01a，2026-11-06）

**行为变更（默认路径 `rendererMode:'signal'`，`optimizeSignal` 缺省即走基础实现）**

- `v-if` 分支元素不再把静态 `class` 泄漏到父容器（if07）。
- `v-if / v-else-if / v-else` 链不再抛 `Cannot read properties of undefined (reading 'varName')`（if08）。
- 分支内 `:class` / `:style` 改为绑定到**分支元素自身**并补 `_ctx.` 前缀，不再 `ReferenceError`（if09）。
- 列表项动态属性按 item 形参求值，不再把 `:data-k="x"` 写成字面量 `data-k="x"`（for08）。
- 组件出现在 `v-if` 分支时不再编译抛错；分支激活时由 `mountComponent` 挂载（kb05）。
- `v-if` 分支按模板原位置插入（用后一个静态兄弟元素作锚点），不再一律追加到父容器末尾（mx04）。
- 分支子树内的多层插值（`<div v-if><span>{{msg}}</span></div>`）不再整段丢失：分支 HTML 现在为每个插值留文本槽位，运行期 `claimTextSlots` 认领（if05）。
- `<slot/>` 出口改为就地挂载（`mountSlotOutlet`，A/B 两版同改）：插槽内容落在模板原位置，DOM 里不再残留字面量 `<slot>` 包装（mx06）；有 fallback 子内容时仍走原 `mountSlot`。

**门禁与资产**

- `check-compiler-parity`（fast，约 2s）扩出第 ③ 段 **vnode / SSR 模式安全网**：
  100 模板 × 2 模式的编译产物逐字快照（`scripts/compiler-mode-snapshot.json`，用
  `--update-mode-snapshot` 重生成）+ 执行冒烟（vnode 真实 render/mount、SSR 真实求值不得抛错）。
  已知 SSR 抛错 5 条（动态组件名表达式引用未注入的 `comp`：cp02/cp06/cp09/kb02/kb03）记入
  `compiler-parity-baseline.json` 的 `modeParity`，同样只允许减少。
- 100 模板对拍结果从 **一致 74 / 不一致 26、expectedMismatch 5** 收敛到
  **一致 77 / 不一致 23、expectedMismatch 0**；棘轮基线 26 → 23（移除 if07/if08/for08/kb05，
  if05 由「两版同错」转为「基础实现正确、优化实现仍错」的真实分叉）。
- 优化实现（`optimizeSignal:true`）保持原样、未删除；剩余 23 条分叉全部是优化实现侧问题。
- 体积：100 模板基础实现产物合计 77,233 B，优化实现 41,380 B（B 小 46.4%）；修复 8 条模板
  新增分支动态/槽位/原位插入代码合计 9,319 B（此前 if08/kb05 不可编译、其余 6 条为不完整产物）。

### 🔍 编译器：两套 signal codegen 逐字对拍（B01 前置，2026-11-06）

- `check-compiler-parity`（fast，约 2s）在原有「默认路径 5 模板语义正确」之上，
  新增 **100 模板逐字对拍**：同一模板分别以 `optimizeSignal:false`（基础实现）与
  `true`（优化实现）编译 → 各自真实执行 → 断言 `innerHTML` 逐字一致，带 `update`
  的模板再对拍一次响应式更新后的 DOM。资产：`scripts/compiler-parity-templates.json`
  + `scripts/compiler-parity-baseline.json`（棘轮只减不增；修好不收基线也报红）。
- **修复门禁自身的伪分叉**：旧执行器把产物 `import` 行整条剥掉却不绑定短别名
  （优化版产物是 `import { setText as x }`），导致优化版一律 `ReferenceError`，
  被误记为语义分叉。现按 `原名 as 别名` 注入运行时导出。
- 当前结果：**一致 74 / 不一致 26**。不一致归因：优化实现侧 20 条（根级文本缺失 2、
  元素整体 setText 覆盖静态文本 3、v-if 分支动态不生成 4、v-for 列表项嵌套不生成 6、
  kebab 组件被解析成减法崩溃 5）；基础实现侧 6 条（分支 class 泄漏、`v-else-if` 崩溃、
  分支 `:class` 未加 `_ctx.` 前缀、列表项动态属性写成字面量、v-for 内组件名校验崩溃、
  分支节点顺序错误）。另有 2 条两版共有缺陷，5 条基础实现与人工语义基准不符。
- 一致模板上优化实现产物仍小 **42.9%**（51,713 → 29,509 B），说明其体积收益来自
  短别名导入与静态 HTML 复用，不是靠丢语义。
- 结论与建议方案（先补基础实现缺陷、再移植体积手法、暂不删除优化实现）见
  `evaluation/LYTJS_codegen对拍报告_2026-11-06.md` 与
  `evaluation/LYTJS_codegen差异清单_2026-11-06.md`。本批**未改编译器实现、未删代码**。

### 📦 体积预算回到真实基线（2026-11-06）

- `check-bundle-size` 不再把预算写在脚本里：基线移到 `scripts/bundle-baseline.json`，
  预算 = **基线 × 1.02**，`minimal-app` 另有写死在脚本里的阶段上限 **93.7 KB**（95,948 B）。
- 基线**只能下调**：`--record` 在"实测 > 基线"时直接拒绝；上调的唯一路径是把
  `approval.decisionRecord` 指向一份真实存在的 `keel/decisions/*.md`，否则门禁红。
  脚本不再输出"按实测上调预算"的建议。
- **首屏口径修正**：旧实现只量入口 chunk（8.5 KB），现量「入口 + 静态 import 闭包」。
  实测 `@lytjs/core` 首屏 **69.3 KB**（编译器在共享 chunk 内、启动即下载），
  `@lytjs/core/runtime` 首屏 **36.6 KB**（不含编译器）。
- 实测：`minimal-app` 89.2 KB（≤93.7 KB，未增长）；新增 17 条断言。
- 归因结论（编译器边际 35.8 KB gzip = 40.2%；四套 codegen 占编译器 56.6%，
  `signal` 与 `signal-optimized` 行级重复约 48%）见
  `evaluation/LYTJS_体积归因_2026-11-06.md`，作为 B01/B03 的输入。

### 🚦 门禁与 CI：安装链路、覆盖率快照、发布一致性（2026-11-05）

- CI 新增 `install` job（`pnpm install --frozen-lockfile` + lockfile 校验），
  `build-order / keel-gates / audit / changeset-check / lint / type-check / test` 全部 `needs: [install]`，
  pnpm 统一钉在 11.3.0（去掉 test 矩阵里的版本维度）。
- `test:coverage` 显式 `--maxWorkers=2`：并发跑覆盖率会清 `.tmp` 并触发 safe-delete 拦截。
- 新增 `scripts/coverage-snapshot.mjs` + `check-coverage-snapshot`（fast）：
  快照带 commit / 生成时间 / 文件集合 / 阈值，门禁校验 commit 真实、≤7 天、
  文件集合与当前 src 相等、已插桩比例 ≥97.5%。当前 434 个 src 文件，425 已插桩（97.93%）。
- 新增 `check-release-parity`（fast，只读）：76 包版本一致且等于声明值、HEAD tag 与声明一致、
  npm 最新版本（离线回退 `release-state.json`）、自基线 tag 起改动的包被 changeset 覆盖、
  豁免必须带 reason / ownerSignOff / 未过期。输出 `declared=true` / `parity=false`（未发布，如实记录）。
- `release.yml` 补 lockfile 校验、`test:coverage`、`check-coverage-snapshot`、`check-release-parity`。

### 🎭 playground 与 E2E：主路径首次真正跑通（2026-11-05）

- 修复 playground 自始无法渲染：10 个场景组件与根组件都是「函数返回 vnode」，
  不被 vdom 接受（`Component "anonymous" has no render function`）。改为 `setup` 返回 render 闭包，
  ref 只创建一次（此前每帧重建导致点击不更新）。
- 修复表单场景：自实现校验时加 `novalidate`（`type="email"` 原生校验会拦截 submit）；
  markdown 的 textarea 改用子文本而非 `value` 属性。
- `playground/index.html` 移除预置 DOM，避免 hydrate 警告与双份导航。
- E2E：`chromium` 45 条 + `playground` 39 条全绿；根目录 4 个原本访问不存在路由的测试
  改为驱动真实场景（组件契约 / 场景切换 / 状态生命周期 / CRUD 主路径）。

### 🧩 `core-signal`：setup 契约与类型诚实（2026-11-05）

- `setup(props, ctx)` 的第二参不再传空对象：`ctx.inject()` / `ctx.emit()` / `ctx.expose()`
  均可调用（此前调用即 TypeError）。`emit` 会把事件名映射到 props 上的 `onXxx` 监听器。
- `app.inject<T>()` 缺键返回 `undefined`，返回类型改为 `T | undefined`（此前 `undefined as T`）。
- `app.component() / directive() / mixin()` 改用生产环境仍可见的 `error()`，
  不再在 `__DEV__` 之外静默 no-op。
- 新增门禁 `check-core-signal-contract`（fast，15 条运行时断言）。
- 详见 [packages/core-signal/CHANGELOG.md](packages/core-signal/CHANGELOG.md)。

### 🔐 `v-html` 消毒：两条渲染路径的一致性纳入门禁（2026-11-05）

- 审计曾称「signal 模式直接 `setHTML` ⇒ 绕过消毒」。实测已过时：`@lytjs/dom-runtime`
  的 `setHTML` 自 2026-10-27 起在写入前调用 `sanitizeHTML`，vnode 与 signal 两种模式
  对 8 组不可信载荷产出的 DOM **逐字相同**且均已消毒。
- 新增门禁 `check-security-html`（fast，24 条）：两模式逐字比对 + 无危险构造 + 安全 HTML
  保留 + signal 更新路径二次消毒 + `setHTML` 自身消毒（防止两边「一致地不安全」）。
- 注入验证：摘掉 `setHTML` 内的 `sanitizeHTML` ⇒ 16 项红。
- 详见 [packages/dom-runtime/CHANGELOG.md](packages/dom-runtime/CHANGELOG.md)。

### 🧠 响应式语义：三处「不抛异常」的缺口（2026-11-05）

- `reactive` 解包函数型 Signal（读侧返回当前值，写侧写穿到 `signal.set()`），
  readonly 同样生效，数组整数索引与普通函数属性不受影响。
- `Map.set` 新增 key 按 ADD 触发 ⇒ `map.size` / `keys()` 正确更新；移除 add/delete 上
  重复的 ITERATE_KEY 触发（订阅者曾一次变更跑两遍）；非字符串 key 回落到 ITERATE_KEY。
- `computedSignal` 求值时设置 `activeEffect`，getter 内读 `reactive` 可追踪（`dispose()` 生效）。
- 新增门禁 `check-reactivity-semantics`（fast，23 条，断言副作用次数）。
- 详见 [packages/reactivity/CHANGELOG.md](packages/reactivity/CHANGELOG.md)。

### 🛠️ CLI 脚手架与代码生成：生成即可跑（2026-11-05）

- SSR 模板改为先 `createApp(App)` 注入模板编译器 —— 此前每个 SSR 请求都是 500。
- 未知模板不再静默回退 default：`lyt create --template nope` 报错退出，
  `generateProjectFiles()` 直接抛错且不写文件。
- 生成的 component / page / layout 含 JSX，扩展名由 `.ts` 改为 `.tsx`（`js` 为 `.jsx`）；
  SFC 插值 `{title}` → `{{ title }}`；service / store 模板改用 signal 的 `set()/update()`
  （不再用不存在的 `.value`）；插件模板 tsconfig 内联（不再 extends 一个不存在的文件）。
- `scripts/check-scaffold.mjs` 升级：6 模板 `tsc --noEmit` + 真实启动 SSR 并断言首页
  200 且含 `Hello LytJS!` + 未知模板必须抛错（`gate.mjs` fast tier）。
- `@lytjs/component` 的 `ComponentOptions` 补 `components` / `directives` 字段（与运行时对齐）。
- 详见 [packages/tools/packages/cli/CHANGELOG.md](packages/tools/packages/cli/CHANGELOG.md)。

### ⚠️ 组件成熟度：Golden 20 冻结（2026-11-05）

- `@lytjs/ui` 的 `stable` 收敛为 Golden 20；其余 41 个导出保留但标注 `experimental`
  （不移出默认导出）。硬门禁 `check-component-status`：`mislabeled_stable = 0`。
- 详见 [keel/decisions/0013-golden-20-freeze.md](keel/decisions/0013-golden-20-freeze.md)。

### ⚠️ 默认行为变更：signal/vapor 编译器优化默认关闭（2026-11-05）

- `compile(template, { rendererMode: 'signal' | 'vapor' })` 现在默认走**语义正确**的
  基础实现；优化版仅在显式 `optimizeSignal: true` 时启用。
- 原因：优化版与基础实现存在语义分叉，会静默丢内容（根级插值、`v-if` 动态属性、
  kebab 组件、`v-for` 嵌套元素）。
- 开启方式：`compile(template, { rendererMode: 'signal', optimizeSignal: true })`。
- 新增门禁 `check-compiler-parity`（纳入 `gate.mjs` fast tier）：5 模板真实 DOM 断言 +
  优化器分叉棘轮。
- 详见 [packages/compiler/CHANGELOG.md](packages/compiler/CHANGELOG.md) 与
  [keel/decisions/0012-signal-optimizer-default-off.md](keel/decisions/0012-signal-optimizer-default-off.md)。

## [7.0.0] - 未发布（分支 `v7.0.0-dev`）

> **状态：未发布。** npm 上 `@lytjs/core` 仍是 6.9.6，仓库里没有指向 HEAD 的 tag。
> 三方一致性由 `check-release-parity` 持续记录：当前 `parity = false`（如实标注，不粉饰）。
> 首次发布必须由 owner 显式授权后走 C01，本版本号不因流程而提前改动。

### 本版主题：A 阶段「止血」

- **验证链**：锁文件（CI 独立 install job）、构建顺序、循环依赖（76/76）、
  覆盖率快照（≤ 7 天 + 覆盖全部 src）、发布一致性（changeset + 三方比对）、E2E 主路径。
- **静默失效修复**：编译器优化默认关闭、signal `v-html` 双模式消毒一致、
  CLI 脚手架生成即可跑、core-signal `setup` 契约、响应式三处语义缺口。
- **组件成熟度**：Golden 20 冻结，其余导出标注 `experimental`。

### 延期 / 已知取舍

| 项 | 当前取舍 | 依据 |
| --- | --- | --- |
| Suspense fallback 的边界行为 | 延期，不阻塞 v7 首发 | [ADR 0002](keel/decisions/0002-suspense-fallback-deferred.md) |
| SSR 水合标记 | 默认关闭，显式开启 | [ADR 0003](keel/decisions/0003-ssr-hydrate-markers-default-off.md) |
| `@lytjs/common-*` 合并范围 | 只合并已确认无生产引用的死包 | [ADR 0007](keel/decisions/0007-common-package-merge-scope.md) |
| signal/vapor 优化器 | 默认关闭，`optimizeSignal: true` 显式开启 | [ADR 0012](keel/decisions/0012-signal-optimizer-default-off.md) |
| 组件 stable 面 | 收敛为 Golden 20，其余 `experimental` | [ADR 0013](keel/decisions/0013-golden-20-freeze.md) |
| 主仓 v7 与 npm 6.9.6 的对应关系 | 发布前另开决策处理 | [ADR 0005](keel/decisions/0005-lytx-version-alignment.md) |

## [6.9.6] - 2026-06-06

### 本次更新内容

- ✅ **版本号统一** - 所有包版本统一升级至 v6.9.6
- ✅ **文档梳理与更新** - 全面梳理项目文档，确保所有文档与当前版本同步
  - 更新 CHANGELOG.md 至最新版本
  - 更新 README.md 版本历史
  - 更新 roadmap 文档
  - 创建缺失的发布说明文档

### 修复的问题

- 修复文档版本不一致问题
- 完善项目文档体系

## [6.9.5] - 2026-06-05

### 本次更新内容

- ✅ **@lytjs/store 集成修复** - 修复与 @lytjs/core 的兼容性问题
  - 重构 pinia.ts，使用 `definePlugin` API 创建标准插件
  - 添加 @lytjs/core 作为依赖项
  - 确保与 `app.use()` 完全兼容
  - 修复 defineStore 集成问题导致页面空白的问题

- ✅ **@lytjs/ui 包修复** - 修复 CSS 文件路径和包集成问题
  - 更新 package.json 导出配置，新增多个 CSS 路径别名
    - 支持 `@lytjs/ui/index.css`
    - 支持 `@lytjs/ui/style.css`（向后兼容）
    - 支持 `@lytjs/ui/styles`（向后兼容）
  - 修改 tsup.config.ts，添加 onSuccess 钩子自动复制 CSS 到 dist
  - 重构 index.ts，使用 `definePlugin` API 创建标准 LytJS 插件
  - 添加 @lytjs/core 作为依赖项

- ✅ **所有包版本统一升级** - 86 个包版本统一升级至 v6.9.5

### 修复的问题

- 修复 @lytjs/store 和 @lytjs/ui 集成时导致页面空白的问题
- 修复 @lytjs/ui CSS 文件路径不匹配问题
- 修复 @lytjs/store 与现有代码的兼容性问题

## [6.9.0] - 2026-05-24

### 本次更新内容

- ✅ **版本号统一** - 所有包版本统一升级至 v6.9.0
- ✅ **Roadmap 更新** - 更新开发路线图，规划 v6.9.0 功能
- ✅ **类型安全修复** - 修复多个包的类型问题
  - `@lytjs/middleware-rate-limit` - 修复 keyGenerator 和 Response 类型
  - `@lytjs/middleware` - 修复 dispatch 和 compose 类型
  - `@lytjs/http-server` - 修复 HttpMethod 和 Context 类型
- ✅ **编译缓存统计功能** - `@lytjs/compiler` 新增缓存监控功能
  - 添加 `CacheStats` 类型定义，记录缓存命中、未命中、总编译次数和总耗时
  - 添加 `getCacheStats()` 函数获取缓存统计信息
  - 添加 `resetCacheStats()` 函数重置统计信息
  - 在 `compile()` 函数中自动记录编译性能数据
  - 帮助开发者监控和优化编译性能
- ✅ **性能基准测试完善** - 新增编译性能监控和测试工具
  - 增强 `compiler.bench.ts`，添加冷/热缓存性能对比测试
  - 新增 `compiler-monitor.ts` 独立性能监控脚本
  - 支持对比不同复杂度模板的编译性能
  - 提供详细的缓存命中率和性能统计报告
- ✅ **更好的 Tree Shaking** - 新增编译时 Tree Shaking 优化
  - 新增 `treeShaking.ts` 优化模块
  - 支持分析静态化节点检测
  - 支持条件分支简化
  - 支持未使用引用检测
  - 预估体积减少
- ✅ **编译时静态分析** - 新增静态分析功能
  - 新增 `staticAnalysis.ts` 模块
  - 错误和警告检测
  - 最佳实践建议
  - 性能优化提示
  - 支持自定义规则
  - 友好的格式化输出
- ✅ **增量编译支持** - 新增增量编译优化
  - 新增 `incremental-compile.ts` 模块
  - 智能模板差异分析
  - AST 级别的差异比较
  - 编译历史记录
  - 性能信息统计
  - 智能缓存重用
- ✅ **构建性能对比** - 监控构建速度变化
  - 新增 `build-performance.ts` 模块
  - 支持构建性能测试（平均、中位数、最小/最大耗时）
  - 测量输出大小和文件数
  - 自动检测性能回归
  - 支持基线版本保存和比较
  - 提供友好的格式化输出
- ✅ **项目优化检查** - 代码优化分析工具
  - 新增 `project-optimizer.ts` 模块
  - 重复代码检测
  - 公共类型/函数分析
  - 依赖关系梳理
  - 构建产物分析
  - 智能优化建议生成
- ✅ **开发环境配置管理** - 新增环境配置脚本
  - 新增 `scripts/check-env.js` - 开发环境检查脚本
  - 新增 `scripts/setup-env.js` - 开发环境配置脚本
  - 添加 `pnpm env:setup` 和 `pnpm env:check` 命令
  - 支持 Node.js、npm、pnpm 环境配置
  - 自动使用国内镜像源加速依赖安装
  - 支持环境检查和快速配置迁移

### v6.9.0 已实现功能（部分）

#### 编译时优化 ⚡ 中优先级

- ✅ **缓存统计优化** - 添加编译缓存命中率和性能统计
- ✅ **更好的 Tree Shaking** - 优化编译结果体积
- ✅ **编译时静态分析** - 提前发现潜在问题
- ✅ **增量编译支持** - 提升开发体验

#### 性能基准测试完善 ⚡ 高优先级

- ✅ **性能报告更新** - 更新性能基准测试报告至 v6.9.0
- ✅ **编译性能基准** - 新增编译性能监控和测试工具（已实现）
  - 增强 `compiler.bench.ts`，添加冷/热缓存性能对比测试
  - 新增 `compiler-monitor.ts` 独立性能监控脚本
  - 支持对比不同复杂度模板的编译性能
  - 提供详细的缓存命中率和性能统计报告
- ✅ **渲染性能基准** - 完善性能测试套件（已实现）
  - 新增 `rendering-performance.ts` 模块
  - 支持渲染性能测试（平均、中位数、最小/最大耗时）
  - 支持内存使用检测（初始、峰值、结束内存）
  - 自动检测潜在内存泄漏
  - 支持性能基线比较和回归检测
  - 提供快速测试套件，包含常见场景
- ✅ **构建性能对比** - 监控构建速度变化（已实现）
  - 新增 `build-performance.ts` 模块
  - 支持构建性能测试（平均、中位数、最小/最大耗时）
  - 测量输出大小和文件数
  - 自动检测性能回归
  - 支持基线版本保存和比较
  - 提供友好的格式化输出
- **内存泄漏检测** - 自动化内存分析（部分实现，包含在渲染性能基准中）
- **性能回归测试** - 防止性能退化（部分实现，包含在渲染性能基准和构建性能对比中）

#### 项目优化检查 ⚡ 中优先级

- ✅ **公共类型/函数提取** - 减少代码重复（已实现，通过 project-optimizer）
  - 新增 `project-optimizer.ts` 模块
  - 重复代码检测
  - 公共类型/函数分析
- ✅ **代码复用优化** - 提升代码可维护性（已实现）
- ✅ **依赖关系梳理** - 优化包依赖结构（已实现）
- ✅ **构建产物优化** - 减少包体积（已实现）
  - 构建产物分析
  - 大文件检测
  - 智能优化建议生成

### 关于 v6.x 系列

v6.9.0 不一定是 v6.x 系列的最后一个次要版本，根据项目需求可能还会有 v6.10+ 迭代版本。

## [6.8.0] - 2026-05-23

### 类型系统增强

- ✅ **通用类型工具库** - `@lytjs/shared-types` 大幅增强
  - 新增 80+ 实用类型工具（Parameters、ReturnType、ConstructorParameters 等）
  - 新增类型守卫类型定义和运行时工具
  - 新增字符串模板类型支持（Join、Split、CamelToSnake 等）
  - 增强类型安全和类型推断能力

### 类型安全的事件系统

- ✅ **新增类型安全的事件发射器** - `@lytjs/shared-types/src/event-emitter.ts`
  - 完整的泛型事件系统
  - 类型安全的事件监听和触发
  - 支持 on、off、emit、once、removeAllListeners 方法

### 开发体验优化

- ✅ **DevTools 调试增强** - `@lytjs/devtools/src/debugEnhancer.ts`
  - 新增结构化日志系统（debug、info、warn、error、trace）
  - 新增调试断点工具
  - 新增性能测量装饰器（measurePerformance、measureAsyncPerformance）
  - 新增状态检查点系统（createCheckpoint、compareCheckpoints）
  - 全局调试工具支持

### 版本升级

- 所有包版本统一升级至 v6.8.0
- 保持完全向后兼容

## [6.7.0] - 2026-05-23

### 核心功能增强

- ✅ **中间件系统** - 完整的洋葱圈模型中间件实现
  - @lytjs/middleware - 中间件核心系统
  - @lytjs/middleware-auth - 认证中间件
  - @lytjs/middleware-cors - CORS 中间件
  - @lytjs/middleware-rate-limit - 速率限制中间件

- ✅ **流式 SSR 增强** - 支持流式服务端渲染
  - 流式渲染器 renderToStream
  - Web Streams API 支持
  - Suspense 边界支持
  - 分块传输编码

- ✅ **Suspense 完善** - 完整的 Suspense 组件和异步状态管理
  - 服务端 Suspense 支持
  - useSuspense Hook
  - startTransition API
  - Suspense 错误边界
  - 超时处理

- ✅ **数据获取与缓存系统** - 统一的缓存接口
  - 多层缓存（Memory → Redis → HTTP）
  - 缓存标签失效
  - TTL 过期控制
  - 缓存统计信息

### 版本升级

- 所有包版本统一升级至 v6.7.0
- 将 .changeset 目录添加到 .gitignore
- 保持完全向后兼容

## [6.6.0] - 2026-05-21

### 核心功能增强

- ✅ **@lytjs/common-query 增强** - 支持数组查询参数解析
  - 新增 `parseQueryStringWithArrays` 函数，直接支持数组值
  - 增强 `stringifyQueryString`，支持数组、布尔值、数字等多种类型
  - 完整的 TypeScript 类型支持
- ✅ **@lytjs/common-http 增强** - 完善的 HTTP 客户端工具
  - 新增便捷方法：`get`, `post`, `put`, `patch`, `del`
  - 新增直接返回数据的 JSON 方法：`getJson`, `postJson`, `putJson`, `patchJson`, `deleteJson`, `requestJson`
  - 集成 `@lytjs/common-query`，支持数组查询参数
  - 新增完整的测试用例

### 包复用优化

- ✅ **@lytjs/http-server 重构** - 移除重复代码，直接使用 common-query
  - 移除了重复的 `parseQuery` 实现
  - 直接使用 `@lytjs/common-query` 中的 `parseQueryStringWithArrays`
  - 添加 `@lytjs/common-query` 依赖
  - 保持完全的功能完整性

### 文档完善

- ✅ **@lytjs/common-http** - 添加完整的 README 文档
- ✅ **@lytjs/api** - 添加完整的 README 文档

### 版本升级

- 所有相关包统一升级至 v6.6.0
- 保持完全向后兼容

## [6.5.0] - 2026-05-19

### 核心增强

- ✅ **新增验证插件** - @lytjs/plugin-validation 完整实现
  - 支持多种验证规则（required, email, phone, minLength 等）
  - 自定义验证规则支持
  - 完整的 TypeScript 类型定义

- ✅ **新增数据获取插件** - @lytjs/plugin-data
  - 乐观更新支持
  - 请求去重
  - TTL 和 LRU 缓存策略
  - 与 @lytjs/plugin-data-fetch 深度集成

- ✅ **新增文件系统路由引擎** - @lytjs/router-fs
  - 基于文件系统的自动路由生成
  - 动态路由参数支持
  - 嵌套路由支持
  - 零外部依赖

- ✅ **新增 API 路由引擎** - @lytjs/api
  - 文件系统驱动的 API 路由
  - RESTful API 规范支持
  - 中间件支持

### 静态与构建

- ✅ **新增构建工具集成** - @lytjs/bundler
  - Vite 插件支持
  - Webpack 插件支持
  - SSG/SSR 预设配置

- ✅ **新增热模块替换** - @lytjs/hmr
  - WebSocket 连接管理
  - 模块更新处理
  - 自动重连

- ✅ **SSG/ISR 支持** - 已完整包含在 @lytjs/ssr
  - 静态站点生成
  - 增量静态再生成
  - 预渲染支持

### 生态完善

- ✅ **新增边缘运行时支持** - @lytjs/runtime-edge
  - 边缘函数支持
  - 边缘路由器
  - 内存缓存
  - 响应辅助工具

- ✅ **现有插件升级**
  - @lytjs/plugin-i18n - 国际化插件 v6.5.0
  - @lytjs/plugin-auth - 认证插件 v6.5.0
  - @lytjs/plugin-storage - 存储插件 v6.5.0
  - @lytjs/plugin-testing - 测试插件 v6.5.0
  - @lytjs/plugin-data-fetch - 数据获取基础插件 v6.5.0

- ✅ **核心包升级**
  - @lytjs/core - v6.4.0 → v6.5.0
  - @lytjs/reactivity - v6.4.0 → v6.5.0

### 性能优化

- ✅ **Tree-shaking 优化** - 所有包已添加 sideEffects: false
- ✅ **构建配置统一** - 完善所有包的 tsup 配置
- ✅ **版本统一** - 所有相关包统一为 v6.5.0

### 文档完善

- ✅ **完整的发布文档** - docs/community/RELEASE_v6.5.0.md
- ✅ **路线图更新** - docs/development/ROADMAP_NEXT_STEPS.md
- ✅ **新包 README** - 所有 6 个新包的完整文档

## [6.4.0] - 2026-05-18

### 完整 Monorepo 发布
- ✅ **所有官方包发布到 npm**
  - @lytjs/shared-types@6.4.0
  - @lytjs/reactivity@6.4.0
  - @lytjs/vdom@6.4.0
  - @lytjs/component@6.4.0
  - @lytjs/renderer@6.4.0
  - @lytjs/compiler@6.4.0
  - @lytjs/core@6.4.0
  - @lytjs/core-signal@6.4.0
  - @lytjs/core-vnode@6.4.0
  - @lytjs/dom@6.4.0
  - @lytjs/web@6.4.0
  - @lytjs/adapter-web@6.4.0
  - @lytjs/host-contract@6.4.0
  - @lytjs/dom-runtime@6.4.0
  - @lytjs/router@6.4.0
  - @lytjs/store@6.4.0
  - @lytjs/ssr@6.4.0
  - @lytjs/ui@6.4.0
  - @lytjs/devtools@6.4.0
  - @lytjs/compat@6.4.0
  - @lytjs/platform-adapter@6.4.0
  - @lytjs/plugin-vite@6.4.0
  - @lytjs/plugin-theme@6.4.0
  - @lytjs/plugin-logger@6.4.0
  - @lytjs/plugin-auth@6.4.0
  - @lytjs/plugin-storage@6.4.0
  - @lytjs/plugin-i18n@6.4.0
  - @lytjs/cli@6.4.0
  - @lytjs/devtools-extension@6.4.0
  - @lytjs/test-utils@6.4.0
  - 所有 common-* 工具包 @6.4.0

### 核心修复
- ✅ **类型系统修复**
  - 修复 ColorPicker 组件 const 赋值错误
  - 将 const 变量改为 let 以允许赋值
- ✅ **文档体系完善**
  - 全项目文档版本统一为 v6.4.0
  - 所有包的 CHANGELOG 更新
  - 文档站配置检查完成
- ✅ **构建与发布**
  - npm 令牌配置
  - Monorepo 包发布流程优化

---

## [6.0.1] - 2026-05-16

### 教程与实战案例体系
- ✅ **完整的 LytJS 学习资源体系**
  - Vue → LytJS 迁移指南
  - React → LytJS 迁移指南
  - 实战案例教程（Todo、用户管理系统、购物车、博客系统）
  - 官方插件使用指南（所有 11 个官方插件）

### TypeScript 类型系统增强
- ✅ **通用类型工具库** `packages/shared-types/src/type-utils.ts`
  - 80+ 个实用类型工具
  - 完整类型导出和文档
- ✅ **TypeScript 开发体验优化**
  - TypeScript 类型指南文档
  - 完整类型示例代码库
  - 类型系统导出完善

### 文档体系完善
- ✅ **全面的文档体系**
  - 综合文档索引 `docs/SUMMARY.md`
  - 快速入门指南
  - 常见问题 FAQ
  - SSR/SSG 使用指南
  - CLI 使用指南
  - 管理后台完整示例应用

### 开发工具增强
- ✅ **CLI 工具功能增强**
  - 新增 5 种代码生成类型：directive, composable, hook, util, middleware
  - 完善插件创建和管理流程
- ✅ **Vapor 模式性能优化**
  - DOM 操作批量处理优化
  - 事件委托机制
  - 增量更新优化

### 测试体系增强
- ✅ **完整测试体系**
  - 管理后台 E2E 测试（Playwright）
  - 完整测试指南文档
  - 模糊测试和性能回归测试功能

### 文档站点优化
- ✅ **美观且功能完善的文档站点**
  - 交互式组件示例
  - VitePress 主题优化（渐变色彩、代码块美化）
  - 完整导航结构
  - VitePress 本地搜索功能

### SSR/SSG 增强
- ✅ **完整的服务端渲染能力**
  - ISR（Incremental Static Regeneration）增量静态再生成
  - 服务端组件架构
  - Server Actions 服务端函数调用
  - 特殊类型数据序列化支持

### DevTools 完善
- ✅ **强大的调试能力**
  - 信号检查器与时间旅行调试
  - 性能监控与告警
  - 基准测试与回归检测
  - 完整的 API 参考文档

### 插件类型问题修复
- ✅ **所有官方插件类型安全**
  - plugin-animation：修复 signal API 使用和导出问题
  - plugin-data-fetch：修复命名冲突和类型问题
  - plugin-form：使用 signalComputed 替代 computed
  - shared-types：简化复杂类型定义
  - 所有包通过完整类型检查

### 官方插件测试覆盖增强
- ✅ **11 个官方插件测试完全通过**
  - plugin-testing：修复信号跟踪问题
  - plugin-vite：优化测试配置
  - 所有插件通过完整测试套件

### 开发体验增强
- ✅ **Trae 可调用的 skill 支持**
  - LytJS ROADMAP 维护与性能优化 skill
  - 完整的项目状态检查流程
  - 类型安全问题修复流程
  - 性能优化完整指南

### 性能基准测试完善
- ✅ **完整的性能基准测试体系**
  - 修复基准测试文件以适配 LytJS signal API
  - 涵盖 signal 读写、signalComputed、effect、深度计算链、VNode 树创建
  - 完整的测试环境构建

### 官方插件扩展
- ✅ **新增 4 个官方插件（共 11 个）**
  - plugin-form：表单管理与验证
  - plugin-animation：动画库
  - plugin-data-fetch：数据获取与缓存
  - plugin-testing：测试工具集成
  - 所有插件零第三方运行时依赖

---

## [6.0.0] - 2026-05-15

### 核心功能完善

- ✅ **8层架构设计** 已完整实现
  - L0 基础工具层：common-* 系列工具包
  - L1 核心原语层：响应式系统、虚拟 DOM、编译器
  - L2 渲染引擎层：Vapor + VDOM 双渲染模式
  - L3 核心运行时层：应用实例、生命周期、插件机制
  - L4 插件与适配层：官方插件、Web 适配器
  - L5 组件基础层：组件通用逻辑
  - L6 生态系统层：UI 组件库、路由、状态管理
  - L7 工程化工具层：构建工具、CLI、DevTools

- ✅ **运行时零第三方依赖** 严格执行
  - 所有 L0-L6 层运行时代码无第三方依赖
  - 仅开发/构建工具允许引入第三方依赖

### 核心包修复与优化

- ✅ **核心包依赖修复**
  - @lytjs/core: 添加 common-error、common-object
  - @lytjs/reactivity: 添加 common-error、common-constants、common-assertions
  - @lytjs/component: 添加 common-error、common-string
  - @lytjs/vdom: 添加 common-assertions、common-error、common-object、common-constants
  - @lytjs/renderer: 添加 common-error
  - @lytjs/compiler: 添加 common-string、common-constants

- ✅ **性能优化**
  - VNode 对象池优化：将最大大小从 200 扩大到 500，减少 GC 压力
  - Signal 通知机制优化：使用迭代器替代 for...of 循环遍历 subscribers，提升性能

### 测试与质量保障

- ✅ **基准测试配置修复**
  - benchmarks/vitest.config.ts: 修改别名指向 dist 而非 src
  - 基准测试现已全部通过（render/update/memory）

- ✅ **E2E 测试增强**
  - 修复 e2e/playwright.config.ts 中的 filter 名称
  - 新增 e2e/tests/scenarios.test.ts，覆盖 7 个典型场景
    - 计数器组件测试
    - 待办事项组件测试
    - 颜色选择器组件测试
    - 计时器组件测试
    - 购物车组件测试
    - 井字棋组件测试
    - 天气仪表盘组件测试

- ✅ **E2E 测试环境完善**
  - 将 playground 加入 pnpm workspace
  - 重构 playground/package.json，使用 workspace 依赖
  - 更新 e2e/playwright.config.ts 使用正确的包名
  - 添加 e2e/README.md 使用指南

- ✅ **UI 包类型修复**
  - 修复 ui 包中类型错误
  - 清理重复类型定义

- ✅ **测试覆盖率提升**
  - UI 组件测试重构，提升测试质量
  - reactivity 包测试覆盖率 > 90%
  - vdom 包测试覆盖率 > 85%

### CI/CD 集成完善

- ✅ **CI/CD 配置**
  - 项目已有完整的 GitHub Actions CI/CD 配置
  - 在 .github/workflows/ci.yml 中新增基准测试 job
  - 基准测试结果会自动上传并保留 14 天
  - 简化 E2E 测试矩阵（仅保留 chromium）以提升 CI 速度

### 生态系统建设

- ✅ **官方插件**（6个）
  - plugin-theme：主题管理
  - plugin-logger：日志记录
  - plugin-auth：权限控制
  - plugin-storage：本地存储
  - plugin-i18n：国际化
  - plugin-chart：图表渲染

- ✅ **UI 组件库**（56 个组件）
  - 完整的 UI 组件体系
  - 支持主题定制
  - 支持 Vapor 渲染模式

- ✅ **生态包**（7个）
  - router：路由
  - store：状态管理
  - ui：UI 组件库
  - devtools：开发者工具
  - ssr：服务端渲染
  - platform-adapter：平台适配器

### 架构整改

#### BREAKING CHANGES

- 删除 `@lytjs/shared` 包，功能合并到 `@lytjs/common-*` 子包
- 删除 `@lytjs/host` 包，功能合并到 `@lytjs/adapter-web`
- 删除 `@lytjs/runtime-convergence` 包，拆分为 6 个独立子包

#### 新增包

- `@lytjs/common-render-queue` - 渲染队列，批量合并渲染操作
- `@lytjs/common-event-normalizer` - 事件归一化工具
- `@lytjs/common-node-cache` - 节点缓存，管理容器-VNode 映射
- `@lytjs/common-async-scheduler` - 异步调度器，支持优先级
- `@lytjs/common-transition-engine` - 过渡引擎，支持 FLIP 动画
- `@lytjs/common-performance` - 性能监控 API
- `@lytjs/common-constants` - 全局常量

### 安全修复

- 修复 v-html SSR 模式下未转义输出导致的 XSS 漏洞
- 修复 v-html Signal 模式下直接设置 innerHTML 的安全问题
- 修复 Island hydration 使用 innerHTML 创建 DOM 的安全问题
- 添加 CSP 严格模式检测和优雅降级
- 修复 Source Map encodeMappings 始终使用 sources[0] 的问题

### Bug 修复

- 添加 v-bind 动态属性名验证
- 添加 v-on 事件名验证
- 添加组件名验证
- 添加 v-for 无 key 警告完善
- 添加 v-if 空条件报错
- 添加模板多根节点检测
- 添加组件递归深度限制（100层）
- 完善响应式数组方法处理
- 添加计算属性循环依赖检测
- 添加 watch 回调错误捕获

### 性能优化

- 添加 VNode 对象池，减少 GC 压力
- 添加编译缓存，避免重复编译
- 添加 DOM 批量操作队列
- 添加正则表达式预编译缓存
- 添加懒加载渲染器支持
- 优化首次渲染性能

### 代码质量改进

- 添加全局常量包 `@lytjs/common-constants`
- 完善 JSDoc 注释
- 添加类型守卫函数
- 添加错误恢复机制
- 统一代码风格

---

## 迁移指南

### 从 5.x 升级到 6.0

#### 包名变更

| 旧包名 | 新包名/替代方案 |
| --- | --- |
| `@lytjs/shared` | 使用 `@lytjs/common-*` 系列包 |
| `@lytjs/host` | 使用 `@lytjs/adapter-web` |
| `@lytjs/runtime-convergence` | 使用拆分后的 `@lytjs/common-*` 包 |

#### 导入路径更新

```typescript
// 旧版本
import { xxx } from '@lytjs/shared';

// 新版本
import { xxx } from '@lytjs/common-xxx';
```

#### 架构分层

6.0 版本引入了严格的分层架构：

- **L0 基础层**: 无外部依赖的基础工具包
- **L1 核心原语层**: 框架核心功能实现
- **L2 平台/组件层**: 平台适配和组件系统
- **L3 应用层**: 用户面向的应用 API

请确保您的代码遵循分层依赖规则，避免跨层依赖。
