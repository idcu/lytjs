# @lytjs/cli 更新日志

## [未发布] - 2026-11-05

### 🐞 修复（A06：脚手架与代码生成「生成即可跑」）

- **SSR 模板每个请求 500**：`src/entry-server.ts` 只 `import '@lytjs/core'` 而不调用
  `createApp()` —— 模板编译器是**调用时**注入的，因此组件只有 `template` 字符串时直接抛
  「当前进程没有注入模板编译器」。改为先 `createApp(App)`（借用其副作用，不挂载）。
- **未知模板静默回退 default**：`lyt create --template nope` 与 `generateProjectFiles(..., 'nope')`
  此前都落进 default 分支，用户拿到的东西和选择的模板无关且无提示。现在 `create()` 报错退出，
  `generateProjectFiles()` 直接抛错且不写任何文件。
- **生成的 component / page / layout 落盘为 `.ts` 却含 JSX** ⇒ tsc / vite 语法错误。
  改为 `.tsx`（`language: 'js'` 时为 `.jsx`；`template: 'sfc'` 仍为 `.lyt`）。
- **生成的 SFC 插值写成 `{title}`** ⇒ 模板里是纯文本而非插值。改为 `{{ title }}`。
- **SFC 模板按 `lang` 条件导入 `ref`**，非 TS 时漏导入；改为无条件导入。
- **service / store 模板用 `.value` 写 signal**：本仓 signal 是 `set()/update()`（没有 `.value`），
  生成的代码运行即 TypeError。改为 `isLoading.set(...)` / `error.set(...)` /
  `state.set(...)` / `state.update(prev => ...)`。
- **插件模板 `extends: '@lytjs/core/tsconfig.json'`** 指向 `@lytjs/core` 不发布的文件
  ⇒ 生成的插件项目 tsc 报 "File not found"。改为内联 `compilerOptions`。
- **`add` 命令的 service 模板**同样改用 signal API（`.set()`）。

### 🛡️ 门禁

- `scripts/check-scaffold.mjs` 升级（`gate.mjs` fast tier）：
  - **[6]** 6 个模板逐个 `tsc --noEmit`（真实编译器，不是正则）；
  - **[7]** 真的 `spawn` SSR 服务进程并发起 HTTP 请求，断言 200 且首页含 `Hello LytJS!`；
  - **[8]** 未知模板必须抛错且不产生半成品目录。
  注入验证：去掉 `createApp()` 注入 ⇒ [7] 立刻红（500）。

### 🩹 类型

- `@lytjs/component` 的 `ComponentOptions` 补 `components` / `directives` 字段
  （运行时早已支持，类型缺失导致 router 模板 `components: { RouterLink, RouterView }`
  直接 TS2353）。

## [未发布] - 2026-11-03

### 🐞 修复（脚手架产物 7 个缺陷，均为「生成出来才看得见」）

- **store / full 模板漏声明 `@lytjs/reactivity`**：`src/stores/counter.ts` 直接 import 它，
  但依赖表里只有 `@lytjs/store` ⇒ pnpm 严格 node_modules 下解析不到，装完构建即失败。
- **SSR 模板 `server.ts` 与 `entry-server.ts` 契约不一致**：前者只读 `mod.default`，
  后者只有命名导出 `render` ⇒ 每个 SSR 请求 `entry.render is not a function` → 500。
- **SSR 的 `index.html` 没有 `<!--app-html-->`**：`template.replace()` 是空操作
  ⇒ 服务端渲染结果被整段丢弃，用户拿到空壳 HTML（状态码 200，看起来正常）。
- **开发模式白屏**：`server.ts` 创建了 `middlewareMode` 的 Vite 却从不挂载
  `vite.middlewares` ⇒ `/src/entry-client.ts` 被当作页面返回 HTML，浏览器当模块解析失败；HMR 也不通。
- **`preview: "node server"`** 用 node 跑 `.ts` ⇒ 命令必失败。改为 `tsx server.ts` 并声明 `tsx`。
- **`/vite.svg` 404**：`index.html` 引用它但从不生成 ⇒ 补 `public/vite.svg`。
- **SSR 的 `tsconfig` 不含根目录 `server.ts`** ⇒ 服务端入口完全不做类型检查。

### 🔒 安全

- 生成的 `server.ts` 静态文件解析加了**目录穿越防护**（`/assets/../../x.js` 此前可读项目外文件）。

### ♻️ 其它

- SSR 模板不再同时生成 `main.ts` 与 `entry-client.ts`（后者才是 index.html 引用的入口，前者是死文件）。
- 构建产物目录与读取路径对齐：客户端 `dist/client`、服务端 `dist/server`。
- 导出 `generateProjectFiles`，供门禁/工具直接对生成目录做校验。

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## [6.6.0] - 2026-05-21

### 🚀 版本升级

- 版本升级至 v6.6.0
- 保持完全向后兼容
- 所有依赖包已更新至 6.6.0

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。
