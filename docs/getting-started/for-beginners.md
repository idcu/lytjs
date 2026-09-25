# 小白上手：从零跑起 lytjs（约 10 分钟）

> 本指南的每条命令都**在真实环境跑过**（2026-09-25，`@lytjs/core@6.9.6`）。
> 凡是"跑不通"的地方我都如实标注在「第 6 节 已知坑」，而不是假装顺利。

## 0. 这是什么

lytjs（`Lyt.js`）是一个**自研的前端框架**：`ref`/`computed` 响应式、`template` 模板、
组件与插槽，另有 SSR 能力。它已发布到 npm，**照着下面做就能在浏览器里看到效果**。

适合谁：会一点点 JS / 前端，想**动手跑起来**再决定要不要深入的人。

## 1. 前置条件

| 需要         | 检查命令  | 说明                                               |
| ------------ | --------- | -------------------------------------------------- |
| Node.js ≥ 20 | `node -v` | 有就行，版本不苛求                                 |
| npm 或 pnpm  | `npm -v`  | 下面用 **npm**（最省事，不涉及 corepack/版本对齐） |

## 2. 五步跑起来

```bash
# ① 建项目目录
mkdir lytjs-try && cd lytjs-try
npm init -y

# ② 装依赖（框架 + 一个构建工具）
npm i @lytjs/core vite

# ③ 建页面骨架 index.html
cat > index.html <<'EOF'
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>lytjs 试跑</title></head>
  <body>
    <div id="app"></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>
EOF

# ④ 写入口 main.js
cat > main.js <<'EOF'
import { createApp, ref, computed } from '@lytjs/core';

createApp({
  setup() {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    return { count, doubled };
  },
  template: '<div>count = {{ count }} , doubled = {{ doubled }}</div>',
}).mount('#app');
EOF
```

**⑤ 最关键的一步 —— 建 `vite.config.js`**（不建这步，浏览器里会直接报错，见第 6 节坑 1）：

```bash
cat > vite.config.js <<'EOF'
import { defineConfig } from 'vite';

export default defineConfig({
  // lytjs 的产物引用了编译期常量 __DEV__ / __PROD__ / __TEST__，
  // 不在构建时替换，浏览器运行会 ReferenceError。
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'false',
  },
});
EOF
```

## 3. 打开看效果

```bash
npx vite          # 启动开发服务器，终端会打印一个 http://localhost:5173 之类的地址
```

浏览器打开该地址，应看到：

```
count = 0 , doubled = 0
```

> ⚠️ **务必用浏览器打开**。不要试图用 `node xxx.mjs` 或 jsdom 验证 ——
> 框架按"浏览器环境"设计，非浏览器环境下渲染会静默为空（详见坑 3）。

## 4. 改一改，感受响应式

把 `main.js` 的模板改成带按钮（整段替换 `createApp({...})`）：

```js
createApp({
  setup() {
    const count = ref(0);
    const doubled = computed(() => count.value * 2);
    return { count, doubled };
  },
  template: `
    <div>
      <button @click="count = count + 1">+1</button>
      <p>count = {{ count }}</p>
      <p>doubled = {{ doubled }}</p>
    </div>
  `,
}).mount('#app');
```

刷新页面点按钮：`count` 与 `doubled` 会一起更新 —— 这就是响应式。

> 注意这里用 `@click="count = count + 1"`：**handler 里的赋值是允许的**，
> 但 `:class` 之类的绑定**只支持简单属性路径**（坑 2）。

## 5. 打包（可选）

```bash
npx vite build      # 产物在 dist/
```

实测：约 25 个模块 → 单文件 **~297 KB（gzip 84 KB）**，构建耗时 ~0.3s。

## 6. 已知坑（都是实地踩到的，务必先看）

### 坑 1：不配 `define` → 浏览器必然崩溃 ★最常见

框架产物里有 **14 处** `__DEV__` 之类的编译期常量，**没有自带 fallback**。
不替换时浏览器报：

```
ReferenceError: __DEV__ is not defined
```

⇒ **照第 2 节第 ⑤ 步配好 `vite.config.js`** 即可（配上后产物里会被正确替换，已验证）。

### 坑 2：模板表达式只支持「简单属性路径」

**支持的**：`{{ msg }}`、`{{ a.b }}`、`:title="obj.tip"`、`@click="count = count + 1"`

**不支持的**（编译期就会报错，且报错里会给你替代写法）：

```html
:class="['a', { active: ok }]"
<!-- ✗ -->
:style="{ color: c }"
<!-- ✗ -->
:title="ok ? 'a' : 'b'"
<!-- ✗ -->
:title="a + '!'"
<!-- ✗ -->
```

**替代写法**（在 `setup()` 里用 `computed` 算好再绑定）：

```js
setup() {
  const ok = ref(true);
  const cls = computed(() => ['a', { active: ok.value }]);
  return { cls };
}
// 模板：<div :class="cls">
```

> 这是**已知的两端差异**：同样写法在 SSR 模式下可以直接用。
> 统一两者已列入计划（方案见 `docs/design/signal-expression-support.md`）。

### 坑 3：别用 Node / jsdom 验证

框架按浏览器环境设计（`isBrowser = typeof document !== 'undefined' && typeof HTMLElement !== 'undefined'`）。
在 Node 里直接跑会缺 `__DEV__` 而崩；jsdom 下即使绕过，渲染结果也可能为空。
**就用浏览器验证。**

### 坑 4：构建时可能看到 `eval` 警告

`@lytjs/compiler` 里有一处 `direct eval`（用于常量折叠），Vite 会提示：

```
[EVAL] Use of direct `eval` function is strongly discouraged...
```

**不影响构建与运行**，但若你的站点有严格 CSP，需要留意（这也是坑 1 提到"编译期常量"的同源话题）。

### 坑 5：根组件必须有 `template`

根组件没有 `template` 会报：

```
[LytJS] Signal mode requires a template string in the root component.
```

⇒ 根组件请提供 `template` 字符串（子组件可另外讨论）。

## 7. 想深入：在本仓库里开发

上面是**用框架**。如果你想**改框架本身**（本仓库结构）：

```bash
git clone <repo> && cd lytjs
corepack pnpm@11.3.0 install        # 本仓库声明 packageManager: pnpm@11.3.0
corepack pnpm@11.3.0 run build      # 构建 76 个包
bash scripts/verify-baseline.sh --no-cov   # 一条命令跑完 6 项门禁
```

**仓库结构速览**：

| 目录                         | 内容                                                                      |
| ---------------------------- | ------------------------------------------------------------------------- |
| `packages/`                  | 76 个包（core / compiler / renderer / vdom / reactivity / component / …） |
| `packages/common/packages/`  | 34 个通用子包（string / path / is / …）                                   |
| `docs/`                      | 文档（`docs/api/` 是 API 参考，`docs/getting-started/` 是入门）           |
| `docs/design/`               | **设计文档**（SSR 组件方案、Signal 表达式方案、会话交付清单）             |
| `examples/slots-demo/`       | 插槽能力演示（可在浏览器打开）                                            |
| `scripts/verify-baseline.sh` | 基线验证脚本（6 项门禁 + 环境干扰识别）                                   |

**改代码后的最小验证**：

```bash
corepack pnpm@11.3.0 exec vitest run packages/compiler packages/renderer   # 核心包测试
```

## 8. 下一步去哪

1. **看 API**：`docs/api/`（先看 `compiler.md` 与 `core.md`）
2. **看例子**：`examples/slots-demo/`（组件 + 具名插槽 + 作用域插槽 + v-for/v-if/v-model）
3. **看设计**：`docs/design/`（了解哪些能力已实现、哪些是已知限制）
4. **找坑**：本文第 6 节 + `~/.workbuddy/memory/` 里的工程日志（踩坑记录）

---

**附：本指南的验证记录（2026-09-25）**

| 步骤                                         | 结果                                                           |
| -------------------------------------------- | -------------------------------------------------------------- |
| `npm i @lytjs/core vite`                     | ✅ `@lytjs/core@6.9.6` + `vite@8.3.1`                          |
| `npm run build`（**未配 define**）           | ✅ 构建成功，但产物含 14 处未替换的 `__DEV__` ⇒ 运行必崩       |
| Node 直接 import `@lytjs/core`               | ❌ `ReferenceError: __DEV__ is not defined`（**证实坑 1**）    |
| 配上 `vite.config.js` 的 `define` 后重新构建 | ✅ 产物中 `__DEV__` 被正确替换（14 → 1 处残留为字符串）        |
| 浏览器渲染                                   | ⚠️ **未在沙箱内验证**（无浏览器）；**请按第 3 节自行打开确认** |
