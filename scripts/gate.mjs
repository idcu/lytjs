#!/usr/bin/env node
/**
 * 门禁运行器（独立于 `verify-baseline.sh` 的单一真相源）
 *
 * ## 为什么要它
 *
 * 2026-10-05 实测发现：把慢门禁从快反馈路径里「抽出来」之后，**它们不能消失** ——
 * 仍必须在发布前 / CI / 定时任务里跑，只是不该挡着日常开发。
 * 所以这里把**每一项门禁定义成一条可独立调用的记录**：
 *
 *   node scripts/gate.mjs --list              # 看有哪些门禁、属于哪一档、实测耗时
 *   node scripts/gate.mjs --tier fast         # 只跑快档（秒级，日常开发用）
 *   node scripts/gate.mjs --tier slow         # 只跑慢档（分钟级，发布前 / 定时任务用）
 *   node scripts/gate.mjs build format:check  # 按名字跑指定几项
 *   node scripts/gate.mjs --tier slow --dry   # 只打印将要执行的命令，不真跑
 *
 * ## 两种调用方式
 *
 * - **开发内循环**：`pnpm check:fast`（直连 tsx，6.1s）或
 *   `bash scripts/verify-baseline.sh --fast`（18.3s，含 pnpm 启动开销）；
 * - **定时任务 / CI**：`node scripts/gate.mjs --tier slow`
 *   （可放进 cron / CI job，**不占用本地开发的反馈路径**）。
 *
 * ## 档位划分依据（实测，2026-10-05）
 *
 * 快档 = 只读源码、不需要 dist ⇒ 结论会随每次改动快速变化，适合日常反馈。
 * 慢档 = 全仓级 / 需要 dist ⇒ 结论不随单次改动变化，适合发布前与定时任务。
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

/** @typedef {'fast'|'slow'} Tier */

const ROOT = new URL('..', import.meta.url).pathname;
// ★ 子进程必须能拿到 node_modules/.bin —— 否则 spawnSync 找不到 `tsx` / `pnpm`，
//   退出码会是 **null**（不是 1！）⇒ 表现为「所有门禁瞬间失败」。
//   这条是被实测抓到的：直接 `node scripts/gate.mjs --tier fast` 全部瞬间失败。
const BIN = resolve(ROOT, 'node_modules/.bin');
const ENV = { ...process.env, PATH: `${BIN}:${process.env.PATH ?? ''}` };

/**
 * 门禁登记表（单一真相源）
 * @type {Array<{
 *   name: string, tier: Tier, cmd: string[],
 *   needsDist?: boolean, approx: string, desc: string
 * }>}
 */
const GATES = [
  // ── 快档：只读源码、不需要 dist ──────────────────────────────
  {
    name: 'check-lockfile',
    tier: 'fast',
    cmd: ['node', 'scripts/check-lockfile.mjs'],
    approx: '~0.2s',
    desc:
      '★ 锁文件一致性：每个 workspace package.json 的依赖声明必须与 pnpm-lock.yaml 的 importers 段一致 ' +
      '（不一致时 `install --frozen-lockfile` 会失败，整个验证链起不来；2026-11-05 新增）',
  },
  {
    name: 'check-build-order',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-build-order.ts'],
    approx: '~3.4s',
    desc: '构建顺序表与实际包集合一致、无顺序倒置（单一真相源：build-order.ts）',
  },
  {
    name: 'check-dead-packages',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-dead-packages.ts'],
    approx: '~2s',
    desc:
      '死包棘轮：packages/common 下的内部工具包若「零生产引用」即红（清单见脚本，' +
      '16 个已确认死包已钉住；阻止新增死代码，2026-10-27 新增）',
  },
  {
    name: 'check-e2e-assertions',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-e2e-assertions.ts'],
    approx: '~1.5s',
    desc:
      '端到端断言强度：禁止 toBeDefined() / toContain("createBlock") / typeof==="object" ' +
      '这类「形状断言」冒充「行为断言」（2026-10-27 新增，起因：5,889 条用例全绿却有丢内容 P0）',
  },
  {
    name: 'check-ui-slot-single-node',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-ui-slot-single-node.ts'],
    approx: '~2.3s',
    desc: '红门禁：组件是否只处理数组形态的 slot（单节点内容会被静默丢弃）',
  },
  {
    name: 'check-ui-props-wiring',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-ui-props-wiring.ts'],
    approx: '~2.3s',
    desc: '棘轮红门禁：声明了却从未被引用的 props（基线 scripts/ui-props-wiring-baseline.txt，只拦新增；2026-10-10 由报告型升级）',
  },
  {
    name: 'check-keel-wiring',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-keel-wiring.ts'],
    approx: '~0.3s',
    desc: '治理接线：keel CI 三关卡（keel-lint / test-lint / verify-hooks）必须在 .github/workflows/keel.yml 里 —— 防判据自测被静默移除（2026-10-11）',
  },
  {
    name: 'check-ui-styles',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-ui-styles.ts'],
    approx: '~0.4s',
    desc:
      '★ UI 样式覆盖：每个组件至少有一个自己发出的类名在 styles/index.css 里有规则' +
      ' —— 评估时 18 个组件零命中（Modal/Drawer 变裸 div、Message 出现在页面底部）（2026-10-31）',
  },
  {
    name: 'check-dist-freshness',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-dist-freshness.ts'],
    approx: '~0.5s',
    desc:
      '★ 产物新鲜度：dist 必须比 src 新 —— vitest 的 47 条 alias 指向 dist，' +
      'dist 过期时「测试全绿」证明的是旧产物（2026-10-31）',
  },
  {
    name: 'check-package-exports',
    tier: 'fast',
    cmd: ['node', 'scripts/check-package-exports.mjs'],
    approx: '~1s',
    desc:
      '发布产物体检：每个包的 main/module/types/exports 指向的文件存在、有类型声明、' +
      '能被 require 且导出非空（单测走源码 alias，发现不了"消费者 import 不到"，2026-11-01 新增）',
  },
  {
    name: 'check-consumer-demo',
    tier: 'fast',
    cmd: ['node', 'scripts/check-consumer-demo.mjs'],
    approx: '~2s',
    desc:
      '消费者视角端到端：只用公开 API（dist 导入）写一个真实小应用 —— ' +
      'SSR → 客户端挂载 → v-for / v-if / 子组件 props+emit / 点击响应式 → ' +
      'SSR 与客户端初始结构一致（hydrate 前提）。单测走源码 alias，测不到"装起来能不能用"',
  },
  {
    name: 'check-examples',
    tier: 'fast',
    cmd: ['node', 'scripts/check-examples.mjs'],
    approx: '~0.3s',
    desc:
      '★ 示例可用性：examples/ 里所有 @lytjs/* 裸导入必须能在本仓解析，' +
      '且不得用相对路径穿透到包源码。' +
      '（实测 2026-11-02：28 个示例文件里 15 个有问题、10 个「高」，' +
      '含 8 个已迁出主仓的 @lytjs/plugin-* ⇒ 打开即 Failed to resolve import，' +
      '而此前没有任何门禁覆盖 examples/）',
  },
  {
    name: 'check-render-shapes',
    tier: 'fast',
    cmd: ['node', 'scripts/check-render-shapes.mjs'],
    approx: '~3s',
    desc:
      '★ 模板形态电池：用真实用户会写的模板组合（v-for 与动态兄弟 / 多列表 / ' +
      '嵌套列表 / v-if 与 v-for 混合 / 列表增删重排 / 组件与插槽内列表 / computed 列表）' +
      '逐条驱动**多次更新**，既断言内容也断言**节点位置**。' +
      '（2026-11-02：单特性都测过但组合没测，导致两个 P0 在 8432 用例 + 12 门禁下存活）',
  },
  {
    name: 'check-component-status',
    tier: 'fast',
    cmd: ['node', 'scripts/check-component-status.mjs'],
    approx: '~0.1s',
    desc:
      '★ 组件成熟度诚实性（A14/D2）：Golden 20 冻结，stable ⇔ Golden 20；' +
      '其余导出保留但标注 experimental 且必须写缺口 note。硬门禁 ' +
      '`mislabeled_stable = 0`（注入验证：把 Table 改成 stable ⇒ 立即红）',
  },
  {
    name: 'check-component-shapes',
    tier: 'fast',
    cmd: ['node', 'scripts/check-component-shapes.mjs'],
    approx: '~4s',
    desc:
      '★ 组件级形态电池：KeepAlive / Teleport / Transition / TransitionGroup / ' +
      'Suspense / 异步组件 / 动态组件 / v-model / provide-inject / 具名插槽 / ' +
      '组件 v-for keyed 重排 —— 每个都单独测过，但「和 v-if / v-for / 状态更新组合」' +
      '的形态才是用户真正会写的。末尾含「宿主缺少 getComputedStyle」的健壮性断言' +
      '（2026-11-02：该缺口会让 Transition 离开钩子抛错、元素永不移除）',
  },
  {
    name: 'check-render-cost',
    tier: 'fast',
    cmd: ['node', 'scripts/check-render-cost.mjs'],
    approx: '~3s',
    desc:
      '★ 渲染成本：统计 **DOM 操作次数**（不是耗时，避免 flaky），锁住算法复杂度 —— ' +
      '追加 1 项必须 ≤5 次操作且与列表长度无关（O(1)，不是 O(N)）、改文本 0 次结构操作、' +
      '倒序 ≤2N、N=400 与 N=200 追加成本同量级。含阳性对照（计数器有效）与负向对照' +
      '（全换 key 必然 O(N)，证明阈值有区分力）。' +
      '（2026-11-02 停用 block 快速路径时**没有任何成本度量**，此门禁补上这个缺口）',
  },
  {
    name: 'check-ssr-client-parity',
    tier: 'fast',
    cmd: ['node', 'scripts/check-ssr-client-parity.mjs'],
    approx: '~3s',
    desc:
      '★ SSR ↔ 客户端一致性：同一组件分别走 renderToString 与 createApp().mount()，' +
      '断言两端 HTML **语义等价**（只归一化空白/属性顺序/布尔属性/style 尾分号）。' +
      '「两端不一致」是反复出现的缺陷族（属性透传、组件分发、redirectResponse 漏改），' +
      '单点断言覆盖不住。首次运行抓到 3 个真缺陷：v-html 被当属性转义、' +
      '<component :is> 把组件名当标签、静态模板 attrs 在实例间累积',
  },
  {
    name: 'check-package-deps',
    tier: 'fast',
    cmd: ['node', 'scripts/check-package-deps.mjs'],
    approx: '~2s',
    desc:
      '★ 包依赖声明完整性：src 里的**运行时** import 必须写进 package.json，' +
      '否则 tsup 会把它打包进产物 ⇒ 运行时出现**两份模块实例**，' +
      'nextTick 队列 / setErrorHandler / 任何 let 单例全部不共享，且失效是静默的。' +
      '两层判据：① AST 解析出的运行时导入必须已声明（类型导入只提示）；' +
      '② 产物里不得出现单例包（scheduler / reactivity）的实现。' +
      '2026-11-03：@lytjs/common-scheduler 未在 vdom 声明 ⇒ 被内联，' +
      '导致「给 scheduler 打的修复完全不生效」，排查了很久',
  },
  {
    name: 'check-error-paths',
    tier: 'fast',
    cmd: ['node', 'scripts/check-error-paths.mjs'],
    approx: '~3s',
    desc:
      '★ 错误路径：setup / render / 生命周期 / 事件 / watch / computed / 异步 loader / ' +
      'SSR 各条路径逐条验证「错误被谁接住、会不会静默、出错后还能不能用」。' +
      '这类缺陷的共同点是**所有正常路径的测试都照常通过**。' +
      '2026-11-03 首次运行抓到 3 个：调度器把未处理错误整个丢掉（生产构建无异常无日志）、' +
      '异步组件 loader 失败零上报、SSR setup 抛错输出空串（200 空页）',
  },
  {
    name: 'check-di',
    tier: 'fast',
    cmd: ['node', 'scripts/check-di.mjs'],
    approx: '~2s',
    desc:
      '★ 依赖注入内核（@lytjs/di）：只有 498 行、原本只有 1 个测试文件，' +
      '但它是 @lytjs/component 的 provide/inject 内核。它有两个"危险属性"：' +
      'currentProviderNode 是**模块级全局**、getProviderRoot() 是**进程级单例**。' +
      '2026-11-03 抓到 5 个缺陷：退出作用域后 current 停在进程级 root（⇒ 作用域外 ' +
      'provideValue 写进全局根 ⇒ SSR 跨请求泄漏）、noop scope 的 active 用模块级变量 ' +
      '（一个 stop 污染后续所有 scope）、useExisting 恒解析为 undefined、' +
      'useFactory 提前求值导致 transient 永不生效、resetProviderScope 不 stop 作用域',
  },
  {
    name: 'check-cache',
    tier: 'fast',
    cmd: ['node', 'scripts/check-cache.mjs'],
    approx: '~2s',
    desc:
      '★ 缓存正确性（@lytjs/cache）：缓存是最容易「看起来在工作」的组件 —— get/set 都能跑通、' +
      '单测全绿，但价值全在**边界**上（容量 / 过期 / 失效 / 多层回写）。这些边界出错不会抛异常，' +
      '只会静默地让缓存永久失效或返回已被 invalidate 的陈旧数据。' +
      '2026-11-03 首次运行抓到：覆盖同一 key 时 totalSize 只增不减（1KB×10 次 ⇒ 11022，' +
      '进而每次 set 都触发淘汰 ⇒ 缓存永久失效）、单条超 maxSize 不拒绝、多层回写丢 tags ⇒ ' +
      'invalidateTag 清不掉上层副本',
  },
  {
    name: 'check-ssr-isolation',
    tier: 'fast',
    cmd: ['node', 'scripts/check-ssr-isolation.mjs'],
    approx: '~3s',
    desc:
      '★ SSR 请求隔离：SSR 进程长期存活并服务所有用户，任何**进程级可变状态**都会变成' +
      '跨用户数据泄漏，而单请求场景下一切正常。' +
      '2026-11-03 首次运行抓到两个 P0：① @lytjs/store 的三张表是模块级单例、' +
      '**完全忽略 useStore(pinia) 的 pinia 参数** ⇒ 每请求 createPinia() 也拿到同一个 store，' +
      '匿名请求直接渲染出上一个用户的令牌；② SSR 递归渲染**从不传 parent** ⇒ ' +
      'provide/inject 在 SSR 里完全不生效（4 种写法全返回默认值）',
  },
  {
    name: 'check-lifecycle-release',
    tier: 'fast',
    cmd: ['node', 'scripts/check-lifecycle-release.mjs'],
    approx: '~3s',
    desc:
      '★ 生命周期资源释放：卸载后 setup 里创建的 watch / watchEffect / 渲染 effect ' +
      '必须停止、监听器与定时器必须清理。这类缺陷**不会让任何行为断言变红** —— ' +
      'DOM 会正确移除、onUnmounted 会正确触发，坏掉的是看不见的那一半。' +
      '2026-11-03 实测：组件实例从来没有 effect scope ⇒ 20 轮挂载/卸载后改一次状态，' +
      '20 个已卸载组件的回调全被调用（泄漏正好 +N）',
  },
  {
    name: 'check-http-protocol',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-http-protocol.mjs'],
    approx: '~2s',
    desc:
      '★ HTTP 协议层（@lytjs/http-server）：这是整个后端的入口，缺陷共同点是' +
      '**不抛异常、不影响单测**。2026-11-03 首次运行抓到 8 个：' +
      '① 数组响应头逐项 setHeader ⇒ 两条 Set-Cookie 只剩一条（登录只种上一个 cookie）；' +
      '② 判断 content-type 用精确小写键 ⇒ 处理器写 `Content-Type` 被覆盖成 text/plain；' +
      '③ HEAD 不走 GET 回落 ⇒ 健康检查/CDN 全部 404；' +
      '④ 路径参数不解码 ⇒ params.id 是 %E4%B8%AD%E6%96%87；' +
      '⑤ 路由优先级按**总和**打分 ⇒ /a/b/* 输给 /a/:x/:y，通配符永不命中；' +
      '⑥ body 解析错误直接抛 ⇒ 413/400 无 CORS；' +
      '⑦ 错误响应丢掉 ctx 上已写的头 ⇒ 401/500 无 CORS 无 request-id；' +
      '⑧ 方法不匹配一律 404 ⇒ 无 405/Allow。另修 query 里 + 未解成空格',
  },
  {
    name: 'check-edge-runtime',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-edge-runtime.mjs'],
    approx: '~1s',
    desc:
      '★ 边缘运行时（@lytjs/runtime-edge）：Workers / Deno / Vercel 只接受**真正的 Response**，' +
      '返回鸭子类型对象时本地单测全绿、线上直接 TypeError 或序列化成 {}。' +
      '同一缺陷族已出现三次（10-31 改 json/text/html、11-02 补 redirect、11-03 补路由器的 ' +
      '404/500 与 handle 的透传）。本轮抓到 7 个：404/500 不是 Response 且无 body、' +
      'handle 透传 handler 返回值、相对 URL 抛未捕获 TypeError、basePath 拼出 //、' +
      '无 :param / *、不容忍尾斜杠、缓存无上限。含并发 params 隔离与 405/Allow 判据',
  },
  {
    name: 'check-integration',
    tier: 'slow',
    cmd: ['node', 'scripts/check-integration.mjs'],
    approx: '~3s',
    desc:
      '★ 集成链路：UI（Input/Select/Tabs/Form）+ HTTP（CORS/401/429/JSON body）+ 生态（plugin install / edge Response）' +
      ' —— 这些链路都曾在「单测全绿」时静默失效（2026-10-31）',
  },
  {
    name: 'check-runtime-render',
    tier: 'slow',
    cmd: ['node', 'scripts/check-runtime-render.mjs'],
    approx: '~2s',
    desc:
      '★ 执行编译产物：在裸 Node（无 __DEV__ / 无 vitest define）里挂载真实模板并断言 DOM —— ' +
      '本仓此前没有一条门禁执行过产物，导致 v-html 的 ReferenceError 长期不可见（2026-10-31）',
  },

  // ── 慢档：全仓级 / 需要 dist ────────────────────────────────
  {
    name: 'check-compiler-parity',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-compiler-parity.mjs'],
    approx: '~2s',
    desc:
      '★ signal/vapor **默认编译路径**的语义正确性（A04/D1）：5 个最小模板默认选项编译 → ' +
      '真实执行 → 断言 DOM 与响应式更新（根级 {{msg}}、v-if 动态属性、kebab 组件、v-for 嵌套元素）。' +
      '同时断言「默认产物 == optimizeSignal:false」，显式开启优化器的已知分叉记录在 ' +
      'scripts/compiler-parity-baseline.json（棘轮只减不增）。注入验证：默认切回优化器 ⇒ 6 项红',
  },
  {
    name: 'check-hmr',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-hmr.mjs'],
    approx: '~1s',
    desc:
      '★ HMR 客户端（@lytjs/hmr）：HMR 是开发内循环里被按得最频繁的键，而它的缺陷' +
      '**看起来都像生效了**（页面确实刷新了）。2026-11-03 抓到 5 个：' +
      '① disconnect() 断不掉（onclose 里无条件 2s 重连）；' +
      '② 重复 connect 产生多条重连链（旧 socket 的 onclose 再排定时器）⇒ socket 数量爆炸；' +
      '③ dispose 从不执行（handleUpdate 只调 accept）⇒ 改 N 次就积 N 份旧副作用；' +
      '④ accept() 覆盖 dispose() 的注册；' +
      '⑤ 模块路径按字符串全等匹配 ⇒ 推送带 ./ 或 ?t= 时**每次热更新都退化成整页刷新**。' +
      '另：handler.error 是死字段、无 window/WebSocket 环境直接抛',
  },
  {
    name: 'check-scaffold',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-scaffold.mjs'],
    approx: '~13s',
    desc:
      '★ 脚手架产物自洽性（lyt create）：这是用户接触框架的前五分钟，生成目录自相矛盾' +
      '时用户看到的不是「一个 bug」而是「这框架不能用」。已有测试是**源码级正则**，' +
      '防不住「模板字符串写对了但生成出来的项目不成立」。本门禁**真的生成 6 个模板**再交叉校验。' +
      '2026-11-03 抓到 7 个：store/full 漏声明 @lytjs/reactivity、' +
      'entry-server 只有 named 导出而 server.ts 只读 .default（SSR 全 500）、' +
      'index.html 缺 <!--app-html-->（SSR 输出被丢弃）、preview 用 node 跑 .ts、' +
      '/vite.svg 从不生成、tsconfig 不含 server.ts、' +
      '开发模式创建 Vite 却从不挂载 vite.middlewares（白屏 + HMR 不通）。' +
      '另修生成代码里的目录穿越。' +
      '2026-11-05（A06）：[6] 6 个模板逐个 `tsc --noEmit`（抓到 router/full 的 ' +
      '`components` 选项缺类型 ⇒ TS2353）；[7] 真的启动 SSR 进程并断言首页 200 且含 ' +
      '"Hello LytJS!"（只导出 render 未注入模板编译器 ⇒ 500）；[8] 未知模板必须抛错，' +
      '不许静默落进 default',
  },
  {
    name: 'check-api-routes',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-api-routes.mjs'],
    approx: '~1s',
    desc:
      '★ 文件路由（@lytjs/api）：按目录生成接口 —— 文件名→路由、方法词→HTTP 方法、' +
      '_middleware→鉴权。缺陷形态是**静默 404 / 静默不鉴权**：2026-11-03 抓到 6 个 ——' +
      '① `_middleware` 从未执行（用户以为有鉴权，实际一次都没跑）；' +
      '② `_middleware.ts` 被注册成路由；③ 忽略规则子串匹配 ⇒ `distribution.ts` 被 `dist` 误伤；' +
      '④ 文件名无方法词时只登记 GET ⇒ `export const POST` 永不生效（POST 404 / GET 500）；' +
      '⑤ 构造后首次扫描不等待 ⇒ 启动瞬间 404；⑥ 500 回传 `error.message`（泄漏路径/SQL）。' +
      '另修：参数不解码、query 参与匹配、静态路径被动态路由抢走、方法不匹配 404 而非 405',
  },
  {
    name: 'check-transition-engine',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-transition-engine.mjs'],
    approx: '~1s',
    desc:
      '★ 过渡引擎（@lytjs/common-transition-engine）：过渡是最容易「看起来在工作」的一层 ——' +
      '元素该出现的出现了、该消失的消失了，但 `done` 没被调用时元素只是**没被移除**' +
      '（还在 DOM 里，只是不可见），单测只断言类名加没加，抓不到。' +
      '2026-11-03 抓到 4 个：① 用户钩子抛错**阻断 done()** ⇒ 元素永不移除、phase 停在 entering；' +
      '② 取消过渡**不清类名** ⇒ 元素永久带 `-active`；' +
      '③ 时长 0 的过渡要等满 5 秒超时；④ dispose 只重置状态表（定时器照跑、监听不摘）。' +
      '另修：收敛后 props 不释放、清理表是模块级 WeakMap（两个引擎互相覆盖）',
  },
  {
    name: 'check-event-semantics',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-event-semantics.mjs'],
    approx: '~1s',
    desc:
      '★ 事件修饰符语义（两套实现必须一致）：同一语义有两份实现 —— adapter-web 的 patchEvent' +
      '（DOM）与 common-event-normalizer（RendererHost）。两者都靠「invoker 缓存 + 只换 value」' +
      '省掉重复 addEventListener，代价是**缓存的假设必须与真实监听状态一致**，否则全是静默不触发。' +
      '2026-11-03 抓到 5 个：① normalizeEventName(online) → **line**（@online 永不触发）；' +
      '② .once 更新 handler 后**永不触发**；③ 修饰符更新（→ .stop）不生效；' +
      '④ .self 在 stop 之后判断（子元素点击仍被阻止冒泡）；' +
      '⑤ 值对象 {once:true} → {handler} 后 once 未取消。判据用**同一张场景表跑两套实现**',
  },
  {
    name: 'check-controlled-props',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-controlled-props.mjs'],
    approx: '~2s',
    desc:
      '★ 受控组件（prop → 视图）一致性：这些组件内部都有自己的 signal，初值来自 props。' +
      '只取初值、不跟随 props 就变成「受控组件不受控」：父组件把 current 重置为 1 时分页器' +
      '仍停在第 5 页、改 pageSize 页码数量不变、current 越界时**一个 --active 都没有**。' +
      '三种都不报错、只让视图与数据不一致。2026-11-03 抓到 3 个（全在 Pagination）' +
      '+ v-model:current 静默无效（从不 emit update:current）。判据覆盖 8 个有内部状态的组件',
  },
  {
    name: 'check-dialog-a11y',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-dialog-a11y.mjs'],
    approx: '~3s',
    desc:
      '★ 对话框的无障碍契约（Modal / Dialog / Drawer）：这三个弹层各自实现了一套焦点与键盘处理，' +
      '而三套都是错的、错法还各不相同 —— 视觉上完全正常（弹窗出现了、鼠标能点），' +
      '只有键盘 / 读屏用户用不了，所以单测与肉眼验收都发现不了。2026-11-04 抓到：' +
      '① Modal 的遮罩 aria-hidden="true" **包着** role=dialog ⇒ 整棵子树移出无障碍树；' +
      '② 三个弹层打开后焦点都不进入；③ Modal/Dialog 的 Escape 挂在元素上、焦点不在里面 ⇒ 永不生效；' +
      '④ 关闭后焦点不回触发元素；⑤ Drawer 的 Escape 是**永不移除**的 window 监听 ⇒ 卸载后仍响应、' +
      'N 个抽屉一次全关；⑥ Modal 的 top 默认 15vh 被拼成 15vhpx（非法 CSS）；' +
      '⑦ aria-label="" / aria-describedby="" 铺满 39 个组件；' +
      '⑧ patchElement **从不设置 ref** ⇒ 组件根元素 ref 永不触发（Dialog 的焦点管理是死代码）；' +
      '⑨ 两个焦点陷阱的 focusin 互相拉回 ⇒ 爆栈。判据含 focusTrap 单元级 4 组',
  },
  {
    name: 'check-dev-warnings',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-dev-warnings.mjs'],
    approx: '~0.3s',
    desc:
      '★ 开发期诊断通道（@lytjs/common-error 的 warn / warnOnce）：全仓 250 个调用点、91 个文件' +
      '（prop 冲突、无效 prop、循环 mixin、不安全属性被拦截、v-html 非字符串……）都走它。' +
      '而它的构建把 __DEV__ 编译成了 false ⇒ 产物里是 `function warn(message) { return; }`，' +
      '**整个诊断通道在发布产物里是死的**（实测 warn 输出 0 次、error 正常）。' +
      '这类缺陷不会让任何行为断言变红，唯一症状是 8 条「应当告警」的用例长期红着' +
      '（common-dom 4 条 / vdom 4 条），看起来像「测试写错了」。判据含 dist 形态守卫、' +
      'tsup 不得再烘焙常量、production 反向对照、setDevMode 生效、safeExec 端到端。' +
      '2026-11-04 第二轮补两组：① **浏览器开发模式**（旧 getDevMode 用 typeof process 守卫，' +
      '而浏览器没有 process ⇒ 打包器替换后的 NODE_ENV 用不上 ⇒ 浏览器 dev 一条都不打印；' +
      '判据是真用 esbuild 打浏览器包、在**无 process 的 vm 上下文**里跑）；' +
      '② **「必须不静默」的告警不能被构建删掉**（Transition 的 in-out / 多子节点、' +
      'template 无编译器 —— 这 3 条此前在产物里被整段删除，用户只看到「功能没生效」）。' +
      '2026-11-05 补第 12 组（跨包）：**任何包都不得把 @lytjs/common-error 内联进产物** —— ' +
      '某包若同时 `define: { __DEV__: false }`，esbuild 会把 getDevMode() 的第一句折叠成 ' +
      '`return false`（后面的 NODE_ENV 分支被当成不可达删掉）⇒ 该包所有 warn() 全哑，' +
      '而单测跑的是 src、全绿（实测 @lytjs/store 就是这样）',
  },
  {
    name: 'check-plugin-semantics',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-plugin-semantics.mjs'],
    approx: '~1s',
    desc:
      '★ 插件系统语义（@lytjs/plugin）：插件有**两条安装入口** —— core 的 app.use() 和注册表自己的 ' +
      'await registry.install(name)。两条路一旦分叉，症状全是「插件装上了但没生效」：生命周期钩子没跑、' +
      '依赖没检查、版本范围判错导致直接拒绝安装，都不抛异常。2026-11-05 首次运行抓到 10 个：' +
      '① 独立 install() **不跑 beforeInstall/afterInstall**，且 beforeInstall 返回 false 仍装上；' +
      '② 独立 install() **不检查依赖**（声明了 missing-dep 照样装）；' +
      '③ install() 失败**不发 error 事件**（before:install 已发、after:install 永不到来，配对泄漏）；' +
      '④ 冲突检查**单向** ⇒ conflicts 的生效取决于注册顺序；' +
      '⑤ 版本范围把 `^1.0` / `~1.2` / `1.2` / `*` 全判成「不满足」（而 app.use 会因此**拒绝安装**）；' +
      '⑥ 反向：`>=1.0.0 <2.0.0` 对 3.0.0 判为满足（parseVersion 不锚定结尾）；⑦ `^0.2.3` 放行 0.3.0；' +
      '⑧ resolveLoadOrder() 静默跳过缺失依赖；⑨ unregister() 不检查依赖方；' +
      '⑩ registerKnownPlugins() 是**空操作**（名字进集合，没有任何规则读它，README 却宣传了它）。' +
      '判据 9 组 65 条，含多组对照（可选依赖不阻断、重复 install 只装一次、register 不自动安装）',
  },
  {
    name: 'check-store-semantics',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-store-semantics.mjs'],
    approx: '~0.5s',
    desc:
      '★ 状态管理语义（@lytjs/store）：缺陷形态全是「界面不更新 / 数据没存住」，而它们**都不抛异常**。' +
      '单测很难发现 —— 因为单测直接读 `store.xxx`（拿到的是新值），只有「effect 重跑了吗 / 订阅者收到了吗」才暴露。' +
      '2026-11-05 首次运行抓到 11 个：① **对象/数组原地变更完全无响应**（push 后 effect 只跑过初值、$subscribe 0 条）；' +
      '② getter 不跟随嵌套变更（computedSignal 只订阅 signal）；③ setup store 直接赋值不通知；' +
      '④ **setup store 的 `store.n` 拿到的是信号函数**（reactive 只解包对象型 ref）⇒ `store.n + 1` 变字符串拼接、' +
      '`store.n = 1` 还会把信号整个替换掉 ⇒ 之后 action 改原信号，store 永远不变；' +
      '⑤ storeToRefs 把 action 也转成 ref（解构后调用 ⇒ TypeError）；⑥ setup 的 $state 含 action 函数；' +
      '⑦ `store.$state = {...}` 抛 TypeError（类型里写的是可写）；⑧ setup 的 `$patch(fn)` 写入静默丢失；' +
      '⑨ $patch 静默丢弃未知键；⑩ $reset 按 key 各发一条事件；⑪ $dispose/clearStoreCache 不停内部 effect。' +
      '另修一个**跨包**缺陷：本包 tsup 内联了 common-error + `define __DEV__: false` ⇒ getDevMode() 坍缩成 return false' +
      '（所有 warn 在产物里是哑的，见 check-dev-warnings 第 12 组）。判据 9 组 65 条，含多组对照',
  },
  {
    name: 'check-reactivity-semantics',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-reactivity-semantics.mjs'],
    approx: '~0.2s',
    desc:
      '★ 响应式语义（@lytjs/reactivity）：这类缺陷**都不抛异常** —— 值能读出来，界面就是不更新。' +
      '单测直接读 `obj.prop` / `computed()` 永远拿到「当下的正确值」，只有断言**副作用次数**才暴露。' +
      '2026-11-05（A08）首次运行抓到三处：① `reactive` 只解包对象型 ref，**函数型 Signal 不解包**' +
      '（`reactive({ s: signal(1) }).s` 是 function，`obj.s + 1` 变函数拼接；写侧也没有写穿 ⇒ 赋值把信号整个替换掉）；' +
      '② `Map.set` 新增 key 一律按 SET 触发，**不惊动 ITERATE_KEY** ⇒ `map.size` / `keys()` 的 effect 永不重跑' +
      '（实测 sizes === [1]）；删除/新增对 Set 还**双跑**（显式 ITERATE 与 trigger 内建叠加）；' +
      '非字符串 key 直接不触发（`Set<number>.add(1)` 后 dummy 停在 0）；' +
      '③ `computedSignal` 求值**没有 activeEffect** ⇒ getter 里读 `reactive` 不被追踪（`state.n = 2` 后仍是旧值）。' +
      '判据 3 组 23 条，含三组「回退修复即红」的负向对照（分别 5 / 5 / 3 红）',
  },
  {
    name: 'check-security-html',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-security-html.mjs'],
    approx: '~1s',
    desc:
      '★ `v-html` 消毒的**双模式一致性**（A09）：vnode 在编译期生成 `sanitizeHTML(x)`，' +
      'signal 生成 `setHTML(el, x)` 由 dom-runtime 运行时消毒 —— 两条完全不同的路径。' +
      '只要一边漏消毒，同一模板换个 renderer 就变成 XSS，而各自断言产物字符串的单测**发现不了**。' +
      '本门禁把 8 组不可信载荷（script / onerror / javascript: / svg onload / onclick / style 整段 / ' +
      '实体编码 / 重组 XSS）分别喂给两条真实渲染路径，断言消毒后的 DOM **逐字相同**且无危险构造；' +
      '另断言安全 HTML 被保留（消毒不退化成全删）、signal 更新路径二次消毒、' +
      '以及共用写入原语 `setHTML` **自身**消毒（否则两边会「一致地不安全」）。' +
      '审计原称「signal 直接 setHTML 绕过消毒」已过时（dom-runtime 自 2026-10-27 起消毒），' +
      '故本门禁钉住实现细节而非依赖它。注入验证：摘掉 setHTML 内的 sanitizeHTML ⇒ 16 项红',
  },
  {
    name: 'check-core-signal-contract',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-core-signal-contract.mjs'],
    approx: '~1s',
    desc:
      '★ `@lytjs/core-signal` 的 setup 契约与类型诚实（A10）：Signal 模式的 createApp 是独立路径，' +
      '2026-11-05 审计发现 ① `setup(props, {})` 第二参是空对象 —— `inject/emit/expose` 一调就 TypeError；' +
      '② `app.inject<T>()` 返回类型写成 `T`，缺键却返回 `undefined`（`undefined as T` 类型撒谎）；' +
      '③ `component/directive/mixin` 仅在 `__DEV__` 下 `warn()`，而该函数在生产构建被短路 ⇒ **静默 no-op**。' +
      '本门禁用**运行时行为**断言（非类型断言）：setup 上下文三个方法可用、inject 缺键返回 undefined、' +
      'emit 真正调用 `onXxx` 监听器（含 kebab 映射）、expose 真正限制公共实例，且生产产物里三个注册 API ' +
      '必须输出错误。判据 3 组 15 条。注入验证：setup 回退 `{}` ⇒ 8 项红；注册 API 回退 dev-only warn ⇒ 3 项红；' +
      'inject 对缺键伪造值 ⇒ 2 项红',
  },
  {
    name: 'check-coverage-snapshot',
    tier: 'fast',
    cmd: ['node', 'scripts/check-coverage-snapshot.mjs'],
    approx: '~0.2s',
    desc:
      '★ 覆盖率快照的**时效性与覆盖面**（A11）：`coverage/` 被 .gitignore 忽略，此前没人知道' +
      '「覆盖率 xx%」对应哪个提交、覆盖了哪些文件 —— 这类数字一旦失去因果就会变成长期摆设。' +
      '本门禁校验受版本控制的 scripts/coverage-snapshot.json：① commit 在仓库真实存在；' +
      '② 距今 ≤ 7 天；③ 列出的文件集合 == 当前全部 src 文件（新增 src 必须补快照，否则分母被' +
      '悄悄放大）；④ 已插桩比例 ≥ 97.5%（口径 = 出现在 coverage-final.json，与评估报告' +
      '「437/448 文件」一致，**不是**语句执行率）。真实重跑在慢档 test:coverage；两者配合：' +
      '慢档保证数字是真的，本项保证数字不过期。注入验证：新增 1 个 src 文件 ⇒ 红；' +
      '快照 commit 改到 190 天前的提交 ⇒ 红；把 20 个文件标为未覆盖 ⇒ 93.32% 红',
  },
  {
    name: 'check-release-parity',
    tier: 'fast',
    cmd: ['node', 'scripts/check-release-parity.mjs'],
    approx: '~1s',
    desc:
      '★ 发布一致性（A12 / P1-10）：npm 6.9.6、仓库 76 个 package.json 6.9.6、HEAD 无 tag、' +
      '`.changeset/` 原本零实体 —— 三个地方各说各话，而没有任何测试会因此变红。' +
      '本门禁把三方对齐成可检查的契约：① 76 包版本一致且等于声明值；② HEAD tag 与声明一致；' +
      '③ npm 最新版本与声明一致（离线时回退 scripts/release-state.json 并标注来源）；' +
      '④ 自基线 tag 以来改过的包必须被 changeset 覆盖；⑤ 豁免必须带 reason / ownerSignOff / ' +
      '未过期的 expiresOn（防止「预期不一致」永久免检，评估 R5）。**只读**：不发 npm、不改版本号。' +
      '输出 declared（机制与声明是否成立）与 parity（三方是否真的一致）两个布尔 —— ' +
      '未发布阶段要求 declared=true、parity=false（评估 M5：100% / false，如实记录）。' +
      '注入验证：删掉 changeset 实体 ⇒ 2 项红（实体存在 + 覆盖 100%）；' +
      '把 expiresOn 改成过去日期 ⇒ 1 项红；改动任一包版本号 ⇒ 版本一致性与声明比对 2 项红',
  },
  {
    name: 'check-web-cssvars',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-web-cssvars.mjs'],
    approx: '~1s',
    desc:
      '★ CSS 变量与主题（@lytjs/web）：主题切换是「看起来在工作」的典型 —— apply("dark") 之后' +
      '页面确实变了，但**上一个主题独有的变量还留在内联样式里**（深色底 + 浅色边框），' +
      '不抛异常、不看细节发现不了。另一半是跨环境：同一份组件在 SSR 与浏览器都跑，' +
      '而入口直接写 document.documentElement ⇒ SSR 一调用就 500。2026-11-04 抓到 4 个：' +
      '① ThemeManager.apply 不清理旧主题变量（light{bg,border} → dark{bg} 后 --border 仍是 gray）；' +
      '② setCSSVar("name", value) 抛 `Cannot use "in" operator ...`（而 getCSSVar("name") 就是字符串，' +
      '读写不对称）；③ SSR 下 setCSSVar/getCSSVar 抛 ReferenceError；' +
      '④ observe(["a"]) 之后 subscribe("b") 永远收不到（检查范围被锁死）。' +
      '判据 8 组 36 条（jsdom 真跑，含 SSR 无 document 与「非法形态给出可操作错误」对照）',
  },
  {
    name: 'check-config-semantics',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-config-semantics.mjs'],
    approx: '~0.5s',
    desc:
      '★ 配置系统语义（@lytjs/config）：配置是「上线之后才发现错」的典型地带 —— ' +
      '读到的值不对、默认值没生效、校验报告说 OK、监听器没收到通知，全都不抛异常。' +
      '2026-11-04 首次运行抓到 7 个：① **set("__proto__.x") 污染 Object.prototype**（P0 安全，' +
      '进程内所有对象都被污染；constructor.prototype 同样成立）；② get/has 顺原型链读' +
      '（has("__proto__.toString") 为 true）；③ get() 返回内部引用 ⇒ 外部一改，内部状态静默漂移' +
      '且 0 个监听器触发（getAll() 却是深拷贝）；④ delete() 不通知；⑤ setMultiple(merge=false) ' +
      '不通知被移除的键；⑥ 扁平 JSON Schema 写法 { type:"object", properties } **静默通过**' +
      '（一条规则都没跑却报 valid:true）；⑦ 嵌套对象的字段默认值整个分支被跳过。' +
      '另修同一类型错误被报两次。判据 7 组 32 条，含对照（普通路径不受影响、实例隔离、' +
      '未声明键被丢弃时有告警）',
  },
  {
    name: 'check-router-semantics',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-router-semantics.mjs'],
    approx: '~1s',
    desc:
      '★ 路由语义（@lytjs/router）：路由是 SPA 的主干，但它的缺陷几乎都是「页面能打开、只是不对」' +
      '—— 守卫没跑、重定向没生效、默认子路由不渲染、参数没解码，全都不抛异常，' +
      '肉眼验收时容易被当成「我配错了」。2026-11-04 首次运行抓到 6 个：' +
      '① 优先级用**权重总和**排序 ⇒ /a/b/*(6) 输给 /a/:x/:y(7)，通配符路由永不命中（同一缺陷族第三次）；' +
      '② `RouteRecordRaw.redirect` **从未被读取** ⇒ 重定向完全不生效；' +
      '③ 默认子路由（path: ""）**永不命中**（与父路由同分且父先匹配）⇒ matched 深度 1、name 为 null；' +
      '④ query 的 `+` 不解成空格（第二份 parseQuery 副本漂移）；' +
      '⑤ 未匹配路径**完全静默**（push 后停在原页面，控制台无输出）；' +
      '⑥ **初始导航绕过守卫链** ⇒ 鉴权守卫在深链/刷新时被绕过（最贵的一条）。' +
      '判据 8 组 39 条，含五组对照（无守卫时保持同步首帧、重定向循环有上限、catch-all 可用等）',
  },
  {
    name: 'check-hydration',
    tier: 'fast',
    needsDist: true,
    cmd: ['node', 'scripts/check-hydration.mjs'],
    approx: '~4s',
    desc:
      '★ 水合（hydration）：核心判据是 **`hydrate(ssrHtml)` 的 DOM === `mount()` 的 DOM** ——' +
      '水合是「服务端先送 HTML、客户端再接管」的那一步，两个失败模式都不报错：' +
      '① 接管失败（事件没绑上）⇒ 页面看着完全正常、点了没反应；' +
      '② 接管了但结果不对（多出服务端独有节点 / 少了客户端新增节点 / 顺序错 / 属性残留）' +
      '⇒ 下一次更新时 vnode 与真实 DOM 结构对不上。2026-11-04 两轮共抓到 11 个：' +
      '新增节点被追加到末尾、服务端独有节点/属性不清理、缩进空白不清理、全部静默；' +
      '第二轮（收敛语义）：① 认领是「全局搜索」而非「游标」⇒ SSR `p,span` + 客户端 `span,p`' +
      '水合后仍是 `p,span`（顺序不收敛）；② 根内的 `<script type="application/json">`' +
      '被当多余节点删掉（hydration data 丢失）；③ 按 vnode 无条件写表单 props ⇒' +
      '慢网络下用户先输入的文本被抹掉；④ 多根根节点不做容器级收敛（残留根永远留着）；' +
      '⑤ 片段锚点被追加到末尾、收敛时还会被删（卸载摘不到子节点）；' +
      '⑥ `createHydrationFunctions` 静默产出「点了没反应」的页面。' +
      '判据 12 组 52 条，含五组**对照断言**（普通多余元素仍要删、两端值不同仍以客户端为准、空容器挂载不告警等）',
  },
  {
    name: 'check-vitest-alias-dist',
    tier: 'fast',
    cmd: ['tsx', 'scripts/check-vitest-alias-dist.ts'],
    approx: '~2s',
    desc:
      '★ vitest alias 指向的文件必须存在 —— 否则对应包的测试在**收集阶段**就失败、' +
      '用例一个都不跑（但「Tests N passed」看起来仍像通过）',
  },
  {
    name: 'check-bundle-size',
    tier: 'slow',
    cmd: ['tsx', 'scripts/check-bundle-size.ts'],
    approx: '~8s',
    desc:
      '★ 真实产物体积（esbuild 真打包 + gzip）：vdom-only 与 minimal-app 两条入口的棘轮。' +
      '单包 dist 体积会低估真实成本 —— createApp 静态带编译器，实测最小 app 约 94 KB gzip',
    needsDist: true,
  },
  {
    name: 'build',
    tier: 'slow',
    cmd: ['pnpm', 'run', 'build'],
    approx: '数分钟',
    desc: '构建 76 个包（慢档的第一项，其它依赖 dist 的门禁都排在它后面）',
  },
  {
    name: 'build:fallback',
    tier: 'slow',
    cmd: ['node', 'scripts/build-packages.mjs'],
    approx: '数分钟（串行；每包 10~35s）',
    desc:
      '★ **兜底构建**：不经过 smart-build，逐包 tsup + 拓扑排序。' +
      '在本机用它替代 `build`（后者被 safe-delete 守卫按轮次限额拦住）；' +
      '⚠️ 需在「干净的一轮」里跑，或在无该守卫的 CI 容器里跑',
  },
  {
    name: 'check-runtime-contract',
    tier: 'slow',
    needsDist: true,
    cmd: ['tsx', 'scripts/check-runtime-contract.ts'],
    approx: '~3.7s',
    desc: '产物 import 的绑定名必须在所指包的导出面存在（需要 dist）',
  },
  {
    name: 'check-doc-imports',
    tier: 'slow',
    needsDist: true,
    cmd: ['tsx', 'scripts/check-doc-imports.ts'],
    approx: '~6.9s',
    desc: 'README/docs 里的具名 import 必须真实存在（需要 dist）',
  },
  {
    name: 'check-circular',
    tier: 'slow',
    cmd: ['tsx', 'scripts/check-circular.ts'],
    approx: '~14s（src 模式 ~29s）',
    desc:
      '循环依赖。⚠️ 默认只扫 dist ⇒ 源码里的循环它查不到（详见审计文档 §五十七）。' +
      '2026-11-05（A07）：包发现已递归化（61→76）。',
  },
  {
    name: 'check-circular:src',
    tier: 'slow',
    cmd: ['tsx', 'scripts/check-circular.ts', '--src'],
    approx: '~29s',
    desc:
      '★ 源码循环依赖 + **棘轮基线**（scripts/circular-baseline.txt）：' +
      '只对**基线之外的新循环**报错；默认的 dist 模式查不到源码里的循环（务必跑这个）。' +
      '2026-11-05（A07）：包发现递归化到 **76/76**（旧实现硬编码两层目录只扫 61 个），' +
      '并断言「扫描数 == manifest 目录数」—— 漏扫直接红（注入验证：在旧实现漏掉的 ' +
      'ssg 包里造环 ⇒ 新增 1 条、退出码 1）。基线只减不增',
  },
  {
    name: 'type-check',
    tier: 'slow',
    cmd: ['pnpm', '-r', 'run', 'type-check'],
    approx: '数分钟',
    desc: '全仓类型检查',
  },
  {
    name: 'lint:check',
    tier: 'slow',
    cmd: ['pnpm', 'run', 'lint:check'],
    approx: '~27s',
    desc: '全仓 eslint（pre-commit 的 lint-staged 只查暂存文件，结论会滞后）',
  },
  {
    name: 'format:check',
    tier: 'slow',
    cmd: ['pnpm', 'run', 'format:check'],
    approx: '~89s',
    desc: '全仓 prettier —— ★ 单项最慢的门禁',
  },
  {
    name: 'test',
    tier: 'slow',
    cmd: ['pnpm', 'run', 'test'],
    approx: '数分钟',
    desc: '全量测试（不带覆盖率）',
  },
  {
    name: 'test:coverage',
    tier: 'slow',
    cmd: ['pnpm', 'run', 'test:coverage'],
    approx: '数分钟',
    desc: '全量测试 + 覆盖率（覆盖率棘轮：branches ≥ 85%）',
  },
];

/**
 * 解析真正要执行的命令。
 *
 * ★ 本机**没有全局 pnpm**（`which pnpm` = not found），而 `corepack` 随 node 自带
 *   ⇒ 凡是用到 `pnpm` 的门禁都会以「退出码 null」失败（进程没起来）。
 *   这里把 `pnpm` 映射成 `corepack pnpm@<版本>`，与仓库既有做法一致。
 */
const PNPM_VERSION = '11.3.0';
function resolveCmd(cmd) {
  if (cmd === 'pnpm') return 'corepack';
  return cmd;
}
function pnpmArgs(cmd) {
  return cmd === 'pnpm' ? [`pnpm@${PNPM_VERSION}`] : [];
}

function diagnoseSpawnFailure(cmd, r) {
  if (r.error && r.error.code === 'ENOENT') {
    const via = cmd === 'pnpm' ? `（已自动改用 corepack pnpm@${PNPM_VERSION}，仍找不到）` : '';
    return `**命令找不到**：${cmd} ${via}`;
  }
  if (r.signal) return `被信号 ${r.signal} 终止`;
  return '进程未启动（无退出码）';
}

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const dry = has('--dry');
const listOnly = has('--list');

const tierArgIdx = argv.findIndex((a) => a === '--tier');
const tier = tierArgIdx !== -1 ? argv[tierArgIdx + 1] : undefined;
const names = argv.filter((a) => !a.startsWith('--') && a !== tier);

if (listOnly) {
  console.log('门禁登记表（tier: fast=快档 / slow=慢档）\n');
  for (const t of ['fast', 'slow']) {
    console.log(`── ${t} ──`);
    for (const g of GATES.filter((x) => x.tier === t)) {
      console.log(`  ${g.name.padEnd(28)} ${g.approx.padEnd(22)} ${g.desc}`);
    }
    console.log('');
  }
  console.log('用法：');
  console.log('  node scripts/gate.mjs --tier fast        # 日常开发（秒级）');
  console.log('  node scripts/gate.mjs --tier slow        # 发布前 / 定时任务（分钟级）');
  console.log('  node scripts/gate.mjs build format:check # 指定几项');
  process.exit(0);
}

let selected = [];
if (tier) {
  if (tier !== 'fast' && tier !== 'slow') {
    console.error(`--tier 只接受 fast | slow（收到：${tier}）`);
    process.exit(2);
  }
  selected = GATES.filter((g) => g.tier === tier);
} else if (names.length > 0) {
  selected = GATES.filter((g) => names.includes(g.name));
  const unknown = names.filter((n) => !GATES.some((g) => g.name === n));
  if (unknown.length > 0) {
    console.error(`未知门禁：${unknown.join(', ')}（用 --list 看全部）`);
    process.exit(2);
  }
} else {
  selected = GATES.filter((g) => g.tier === 'fast');
}

console.log(
  `门禁运行器：${selected.length} 项（${[...new Set(selected.map((g) => g.tier))].join('+')}）` +
    `${dry ? ' · dry-run' : ''}\n`,
);

let pass = 0;
const failed = [];
const started = Date.now();

for (const g of selected) {
  console.log('─'.repeat(60));
  console.log(`▶ ${g.name}  (${g.tier} · ${g.approx})`);
  console.log('─'.repeat(60));
  if (dry) {
    console.log(`  would run: ${g.cmd.join(' ')}\n`);
    continue;
  }
  const t0 = Date.now();
  const r = spawnSync(resolveCmd(g.cmd[0]), [...pnpmArgs(g.cmd[0]), ...g.cmd.slice(1)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: ENV,
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status === 0) {
    pass += 1;
    console.log(`\n✅ ${g.name} 通过（${dt}s）\n`);
  } else {
    failed.push(g.name);
    // ★ 退出码 null = **进程根本没起来**（命令找不到 / 被信号杀死），
    //   绝大多数情况是「该命令不在 PATH」—— 直接说清楚，别只丢一个 null。
    const why = r.status === null ? diagnoseSpawnFailure(g.cmd[0], r) : `退出码 ${r.status}`;
    console.log(`\n❌ ${g.name} 失败（${dt}s，${why}）\n`);
  }
}

const total = ((Date.now() - started) / 1000).toFixed(1);
console.log('═'.repeat(60));
if (dry) {
  console.log(`dry-run：共 ${selected.length} 项，未实际执行。`);
} else {
  console.log(`结果：✅ ${pass} 项通过 · ❌ ${failed.length} 项失败 · 耗时 ${total}s`);
  if (failed.length > 0) console.log(`失败项：${failed.join(', ')}`);
}
console.log('═'.repeat(60));

process.exit(failed.length > 0 ? 1 : 0);
