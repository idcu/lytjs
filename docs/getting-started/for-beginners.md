# 小白上手：从**本仓库**跑起 lytjs（约 15 分钟）

> **为什么不直接 `npm i @lytjs/core`？**
> npm 上发布的是 **6.9.6**（较旧），本仓库当前是 `v7.0.0-dev`，**两者不是同一份代码**。
> 要让小白看到**本仓库的最新能力**，必须从仓库跑。
>
> 本文每一步都在 2026-09-25 **实跑验证过**（含最后的点击交互验证），文末附验证记录。

## 0. 你需要什么

| 需要                     | 检查                           | 说明                                     |
| ------------------------ | ------------------------------ | ---------------------------------------- |
| Node.js ≥ 20             | `node -v`                      | 有就行                                   |
| pnpm（由 corepack 提供） | `corepack --version`           | 本仓库声明 `packageManager: pnpm@11.3.0` |
| 本仓库                   | `cd /Volumes/Data/lytjs/lytjs` | 路径按你的实际情况                       |

## 1. 安装依赖并构建（约 5 分钟）

```bash
cd /Volumes/Data/lytjs/lytjs

# 本仓库声明了 pnpm@11.3.0，用 corepack 保证版本一致
corepack pnpm@11.3.0 install

# 构建全部 76 个包（产出各包 dist/，后续导入要用）
corepack pnpm@11.3.0 run build
```

> 若找不到 `corepack`：先 `npm i -g corepack`，或用 `npx pnpm@11.3.0 ...` 代替。

## 2. ★ 建立 `@lytjs/*` 链接（**最容易漏，漏了必然导入失败**）

本仓库是 **private 聚合仓**：根目录**不依赖**任何子包，所以 `node_modules/@lytjs/` 是空的。
在 `examples/` 里 `import '@lytjs/core-signal'` 会直接报"找不到模块"。

仓库已提供脚本，**一条命令**解决：

```bash
node scripts/link-workspace-packages.mjs
# 输出示例：[link-workspace] @lytjs 包 76 个 —— 新建链接 76，已存在 0（目录 node_modules/@lytjs）
```

（幂等，重复执行只会报"已存在 N"。）

## 3. 写第一个页面

新建 `examples/my-first/`（或直接用仓库里已有的 `examples/hello/`）。

**① `examples/my-first/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>lytjs 第一个页面</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="./bundle.js"></script>
  </body>
</html>
```

**② `examples/my-first/main.js`** —— 注释里是 4 个"实测踩点"

```js
// 踩点 1：支持 template 字符串的 createApp 来自 **@lytjs/core-signal**（不是 @lytjs/core）
import { createApp, ref, computed } from '@lytjs/core-signal';

const host = document.getElementById('app');

const app = createApp({
  setup() {
    const count = ref(0);

    // 踩点 2：模板表达式只支持「简单属性路径」。
    //   @click="count = count + 1" 会编译报错 ⇒ 请在 setup 里定义方法
    const inc = () => {
      count.value = count.value + 1;
    };

    // 踩点 3：同一元素内放多个插值会丢内容（已知缺陷）。
    //   <p>{{ count }} / {{ doubled }}</p> 不可用 ⇒ 用 computed 拼好整串再绑一个插值
    const summary = computed(() => 'count = ' + count.value + ' , doubled = ' + count.value * 2);

    return { count, summary, inc };
  },
  template: `
    <div>
      <button @click="inc">+1</button>
      <p>{{ summary }}</p>
    </div>
  `,
});

// 踩点 4：mount() 返回 Promise，是**异步**的；不 await 会得到空白页且不报错
app.mount(host).then(() => console.log('[demo] mounted'));
```

## 4. 打包并在浏览器打开

各包产物是带 `@lytjs/*` 裸导入的 ESM，需先打包成单文件（用仓库自带 esbuild）：

```bash
# 在仓库根目录
./node_modules/.bin/esbuild examples/my-first/main.js \
  --bundle --format=iife \
  --define:__DEV__=true --define:__PROD__=false --define:__TEST__=false \
  --outfile=examples/my-first/bundle.js

# 起一个静态服务器
cd examples/my-first && python3 -m http.server 8080
```

浏览器打开 `http://localhost:8080`，应看到：

```
[+1]  count = 0 , doubled = 0
```

点按钮：`count` 与 `doubled` 一起变化。

> 那三个 `--define:*` **不能省**：各包产物引用了这些编译期常量，未替换会 `ReferenceError`。

## 5. 想改框架本身？常用命令

```bash
corepack pnpm@11.3.0 exec vitest run packages/core-signal              # 跑单个包的测试
corepack pnpm@11.3.0 exec vitest run packages/compiler packages/renderer
bash scripts/verify-baseline.sh --no-cov    # 6 项门禁（build / type-check / lint / format / test…）
```

**仓库地图**：

| 目录                         | 内容                                                                       |
| ---------------------------- | -------------------------------------------------------------------------- |
| `packages/`                  | 76 个包。**先看** `core-signal`（Signal 应用入口）、`compiler`、`renderer` |
| `packages/common/packages/`  | 34 个通用子包（string / path / is / error …）                              |
| `examples/hello/`            | 最小可跑示例（与本文第 3 节同款）                                          |
| `examples/slots-demo/`       | 插槽能力演示（具名 / 作用域 / v-for / v-if / v-model）                     |
| `docs/api/`                  | API 参考（先看 `compiler.md`）                                             |
| `docs/design/`               | 设计文档与**已知缺陷登记**（**建议先读**）                                 |
| `scripts/verify-baseline.sh` | 基线验证脚本；`scripts/link-workspace-packages.mjs` 建包链接               |

## 6. 已知限制（**都是从零跑一遍踩出来的**）

| #   | 限制                                                      | 现象                                                                                 | 当前应对                                                                    |
| --- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 1   | ~~同元素多插值丢内容~~ **已修复**（2026-09-26）           | 现在 `<div>{{ a }} - {{ b }}</div>` 正常渲染（修复前只剩 `b`）                       | 无需规避；实现与回归测试见 `docs/design/known-issue-multi-interpolation.md` |
| 2   | ~~模板表达式只支持简单属性路径~~ **已支持**（2026-09-26） | `:class="['a',{b:ok}]"` / `:style="{...}"` / 三元 / 拼接 **都可用了**（与 SSR 一致） | 无需规避；实现见 `docs/design/signal-expression-support.md`                 |
| 3   | 编译期常量需注入                                          | 不配 `--define`（或 vite 的 `define`）→ `ReferenceError: __DEV__ is not defined`     | 见第 4 节的 `--define:*`                                                    |
| 4   | 用错包会**静默空白**                                      | `@lytjs/core` 的 `createApp` 不认 `template` 字符串                                  | 用 **`@lytjs/core-signal`**                                                 |

> 另：打包时可能看到 `import "@lytjs/common-error"` 被 esbuild 判定为「无副作用」而忽略的**警告** ——
> 目前不影响运行，但值得留意。

## 7. 下一步

1. **看示例**：`examples/slots-demo/`（插槽全能力）
2. **看 API**：`docs/api/compiler.md`、`docs/api/core.md`
3. **看设计与缺陷**：`docs/design/`（尤其 `known-issue-multi-interpolation.md`、
   `signal-expression-support.md`、`ssr-component-slots.md`）
4. **改代码**：改完跑 `corepack pnpm@11.3.0 exec vitest run <包路径>`

---

## 附：本文的验证记录（2026-09-25）

| 步骤                                         | 结果                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| `corepack pnpm@11.3.0 install` + `run build` | ✅ 76 包构建通过（另有基线脚本验证 6/6 全绿）                               |
| `node scripts/link-workspace-packages.mjs`   | ✅ 新建链接 76；重复执行幂等（已存在 76）                                   |
| esbuild 打包 `examples/hello`                | ✅ 698KB / ~120ms；产物中 `__DEV__` 已正确替换                              |
| **渲染验证**（jsdom 执行打包产物）           | ✅ `<div><button>+1</button><p>count = 0 , doubled = 0</p></div>`           |
| **点击交互验证**                             | ✅ 点 1 次 → `count = 1 , doubled = 2`；点 2 次 → `count = 2 , doubled = 4` |
| 浏览器实机打开                               | ⚠️ 未在沙箱内验证（无浏览器），**请按第 4 节自行确认**                      |

> 验证方式说明：沙箱无法起浏览器，故用 jsdom 执行**打包产物**做端到端检查。
> 该方式已能证明"编译 → 打包 → 挂载 → 响应式更新"整条链路可用。
