import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 使用 import.meta.url 获取当前目录（ESM 兼容）
const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [tsconfigPaths()],
  // 定义全局变量
  define: {
    __DEV__: 'true',
    __PROD__: 'false',
    __TEST__: 'true',
  },
  resolve: {
    alias: {
      // common 子包
      '@lytjs/common-is': resolve(root, 'packages/common/packages/is/dist/index.mjs'),
      '@lytjs/common-scheduler': resolve(root, 'packages/common/packages/scheduler/dist/index.mjs'),
      // ⚠️ 指向 **src** 而非 dist：`tsup` 以 `define: { __DEV__: 'false' }` 产出**生产版** dist，
      // 其中 `warn` / `warnOnce` 被压成空操作（`function warn(){return;}`）。而本仓多处以
      // 「DEV 下应发出警告」为断言（common-dom / reactivity 等），若走 dist 则**永不触发**
      // ⇒ 测试必然失败。指向 src 后，裸 `__DEV__` 在运行期解析到 `globalThis.__DEV__`
      // （`vitest.setup.ts` 置 true、`setDevMode()` 可切换），DEV/生产两种预期都成立。
      '@lytjs/common-error': resolve(root, 'packages/common/packages/error/src'),
      // 与 common-error 同理：security 的 isSafeAttribute / sanitizeHTML 在 __DEV__ 下会发警告
      // （"DEV 下应发出警告" 类断言），dist 由 tsup 以 __DEV__:false 构建会让这些警告永静默。
      // 故 alias 到 src，使 vitest 的 define(__DEV__:true) 生效；生产侧仍走 dist（已压成 false）。
      '@lytjs/common-security': resolve(root, 'packages/common/packages/security/src'),
      '@lytjs/common-vnode': resolve(root, 'packages/common/packages/vnode/dist/index.mjs'),
      '@lytjs/common-string': resolve(root, 'packages/common/packages/string/dist/index.mjs'),
      '@lytjs/common-events': resolve(root, 'packages/common/packages/events/dist/index.mjs'),
      '@lytjs/common-object': resolve(root, 'packages/common/packages/object/dist/index.mjs'),
      '@lytjs/common-algorithm': resolve(root, 'packages/common/packages/algorithm/dist/index.mjs'),
      '@lytjs/common-timing': resolve(root, 'packages/common/packages/timing/dist/index.mjs'),
      '@lytjs/common-cache': resolve(root, 'packages/common/packages/cache/dist/index.mjs'),
      '@lytjs/common-env': resolve(root, 'packages/common/packages/env/dist/index.mjs'),
      '@lytjs/common-constants': resolve(root, 'packages/common/packages/constants/dist/index.mjs'),
      // 与 common-error / common-security 同理：common-dom 的 patchAttr / patchProp 在 __DEV__
      // 下会发警告（"DEV 下应发出警告" 类断言），dist 由 tsup 以 __DEV__:false 构建会让警告永静默。
      // alias 到 src，使 vitest 的 define(__DEV__:true) 生效；生产侧仍走 dist（已压成 false）。
      '@lytjs/common-dom': resolve(root, 'packages/common/packages/dom/src'),
      '@lytjs/common-dom-helpers': resolve(
        root,
        'packages/common/packages/dom-helpers/dist/index.mjs',
      ),
      '@lytjs/common-path': resolve(root, 'packages/common/packages/path/dist/index.mjs'),
      '@lytjs/common-query': resolve(root, 'packages/common/packages/query/dist/index.mjs'),
      '@lytjs/common-a11y': resolve(root, 'packages/common/packages/a11y/dist/index.mjs'),
      '@lytjs/common-keyboard': resolve(root, 'packages/common/packages/keyboard/dist/index.mjs'),
      '@lytjs/common-storage': resolve(root, 'packages/common/packages/storage/dist/index.mjs'),
      '@lytjs/common-validate': resolve(root, 'packages/common/packages/validate/dist/index.mjs'),
      '@lytjs/common-http': resolve(root, 'packages/common/packages/http/dist/index.mjs'),
      '@lytjs/common-raf': resolve(root, 'packages/common/packages/raf/dist/index.mjs'),
      '@lytjs/common-render-queue': resolve(
        root,
        'packages/common/packages/render-queue/dist/index.mjs',
      ),
      '@lytjs/common-event-normalizer': resolve(
        root,
        'packages/common/packages/event-normalizer/dist/index.mjs',
      ),
      '@lytjs/common-node-cache': resolve(
        root,
        'packages/common/packages/node-cache/dist/index.mjs',
      ),
      '@lytjs/common-async-scheduler': resolve(
        root,
        'packages/common/packages/async-scheduler/dist/index.mjs',
      ),
      '@lytjs/common-transition-engine': resolve(
        root,
        'packages/common/packages/transition-engine/dist/index.mjs',
      ),
      '@lytjs/common-performance': resolve(
        root,
        'packages/common/packages/performance/dist/index.mjs',
      ),
      '@lytjs/common-assertions': resolve(
        root,
        'packages/common/packages/assertions/dist/index.mjs',
      ),
      // 主包
      '@lytjs/shared-types': resolve(root, 'packages/shared-types/src'),
      '@lytjs/host-contract': resolve(root, 'packages/host-contract/src'),
      '@lytjs/vdom': resolve(root, 'packages/vdom/dist/index.mjs'),
      '@lytjs/vdom/transition': resolve(root, 'packages/vdom/dist/transition.mjs'),
      '@lytjs/core': resolve(root, 'packages/core/dist/index.mjs'),
      '@lytjs/reactivity': resolve(root, 'packages/reactivity/dist/index.mjs'),
      '@lytjs/reactivity/scope': resolve(root, 'packages/reactivity/dist/scope.mjs'),
      '@lytjs/reactivity/async': resolve(root, 'packages/reactivity/dist/async.mjs'),
      '@lytjs/renderer': resolve(root, 'packages/renderer/dist/index.mjs'),
      '@lytjs/component': resolve(root, 'packages/component/dist/index.mjs'),
      // ⚠️ 必须**先**给子路径建 alias，且目标指 **src**：
      //   · 顺序无关（Vite 的 alias 匹配是 `id === find || id.startsWith(find + '/')`），
      //     但 `@lytjs/compiler` → `dist/index.mjs` 会**吃掉** `@lytjs/compiler/sfc`
      //     （前缀命中后拼成 `dist/index.mjs/sfc` ⇒ 解析失败）。
      //   · 指 src 而非 `dist/sfc.mjs`：否则每次改编译器 SFC 代码都得先重建 dist，
      //     否则测试跑的是**旧产物**（本仓反复踩过的坑）。
      '@lytjs/compiler/sfc': resolve(root, 'packages/compiler/src/sfc/index.ts'),
      '@lytjs/compiler': resolve(root, 'packages/compiler/dist/index.mjs'),
      '@lytjs/core-vnode': resolve(root, 'packages/core-vnode/src'),
      '@lytjs/core-signal': resolve(root, 'packages/core-signal/src'),
      '@lytjs/adapter-web': resolve(root, 'packages/adapter-web/src'),
      '@lytjs/dom-runtime': resolve(root, 'packages/dom-runtime/src'),
      '@lytjs/dom': resolve(root, 'packages/dom/dist/index.mjs'),
      // 插件包
      '@lytjs/plugin-logger': resolve(
        root,
        'packages/plugins/packages/plugin-logger/dist/index.mjs',
      ),
      '@lytjs/plugin-storage': resolve(
        root,
        'packages/plugins/packages/plugin-storage/dist/index.mjs',
      ),
      // ⚠️ 2026-10-05 移除 `@lytjs/plugin-vite` 的 alias：该包**已迁出本仓**
      //   （`packages/plugins/` 整个目录树都不存在），且全仓**没有任何真实 import**
      //   —— 此前那 10 处「引用」全是**注释与提示字符串**（错误文案 / 注释 /
      //   甚至一条「不得 import 它」的守卫测试）。留着只会让 alias 指向空气。
    },
    conditions: ['import', 'node', 'default'],
  },
  test: {
    environment: 'node',
    globals: true,
    // 使用绝对路径的全局 setup 文件
    setupFiles: [resolve(root, './vitest.setup.ts')],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    // 排除 E2E 测试（使用 Playwright，不是 Vitest）
    // 说明：此前还整体排除了 web / plugin-animation / devtools 等包级测试，
    // 但 CI 只跑根 test:coverage，这些"自己的 vitest 配置"从未被执行 —— 等于没测。
    // 现全部纳入根运行；需要浏览器环境的文件用文件头 `// @vitest-environment jsdom` 声明。
    // `**/dist/**` 必须排除：dist 是构建产物（每个包一份 .mjs/.cjs/.map），
    // 让 vitest 的 glob 去扫描它们既无意义又徒增开销（2026-09-24 环境排查时发现此前遗漏）。
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/playground/e2e/**'],
    coverage: {
      provider: 'v8',
      // 覆盖率分母覆盖全部源码区（此前漏掉 ecosystem / plugins / tools，
      // 导致约 49.5% 源码不参与 85% 阈值校验）
      include: [
        'packages/*/src/**/*.ts',
        'packages/common/packages/*/src/**/*.ts',
        'packages/ecosystem/packages/**/src/**/*.ts',
        'packages/ecosystem/packages/**/packages/*/src/**/*.ts',
        'packages/plugins/packages/*/src/**/*.ts',
        'packages/tools/packages/*/src/**/*.ts',
      ],
      exclude: [
        'packages/*/src/**/*.test.ts',
        'packages/*/src/**/*.spec.ts',
        'packages/shared-types/**',
        'packages/_templates/**',
      ],
      // ⚠️ 阈值口径（2026-10-11 实测校正）
      //
      // 此前 include 只覆盖 packages/*/src 与 common/packages/*/src，
      // 有约 49.5% 的源码（ecosystem / plugins / tools）不计入分母，
      // 于是"85% 达标"只是在半壁江山上成立。分母补全后的真实数字（2026-09-21）为：
      //   statements 48.77% / lines 48.77% / functions 63.46% / branches 80.09%
      // 2026-10-11 全仓实测（258 文件 / 6169 用例全绿）刷新为：
      //   statements 59.76% / lines 59.76% / functions 69.62% / branches 85.45%
      // 2026-10-12 全仓实测（6179 用例全绿；含本轮新增 AOT / 事件收敛用例）刷新为：
      //   statements 59.84% / lines 59.84% / functions 69.76% / branches 85.45%
      // 2026-10-13 全仓实测（261 文件 / 6179 用例全绿；删 1317 行死代码 + 新增测试后）刷新为：
      //   statements 60.34% / lines 60.34% / functions 69.85% / branches 85.49%
      // 2026-10-13 再测（262 文件 / 6204 用例全绿；+ Select 行为电池 22 用例 + aria 守卫 3 条）：
      //   statements 60.95% / lines 60.95% / functions 70.18% / branches 85.64%
      // 2026-10-13 三测（263 文件 / 6232 用例全绿；+ Slider 行为电池 28 用例 + 3 处交互缺陷修复）：
      //   statements 61.56% / lines 61.56% / functions 70.33% / branches 85.64%
      // 2026-10-14 四测（264 文件 / 6249 用例全绿；+ Menu 行为电池 17 用例 + 2 处缺陷修复）：
      //   statements 62.12% / lines 62.12% / functions 70.47% / branches 85.65%
      // 2026-10-14 五测（265 文件 / 6273 用例全绿；+ ColorPicker 行为电池 24 用例 + 3 处缺陷修复）：
      //   statements 62.76% / lines 62.76% / functions 70.63% / branches 85.66%
      // 2026-10-14 六测（266 文件 / 6294 用例全绿；+ DatePicker 行为电池 21 用例 + 3 处缺陷修复）：
      //   statements 63.39% / lines 63.39% / functions 70.93% / branches 85.71%
      // 2026-10-15 七测（267 文件 / 6341 用例全绿；+ Tabs 行为电池 47 用例，登记 1 处受控重置缺陷）：
      //   statements 63.93% / lines 63.93% / functions 71.24% / branches 85.81%
      // 2026-10-15 八测（268 文件 / 6367 用例全绿；+ Cascader 行为电池 26 用例，登记 4 处设计怪癖）：
      //   statements 64.45% / lines 64.45% / functions 71.41% / branches 85.89%
      // 2026-10-15 九测（269 文件 / 6397 用例全绿；+ TreeSelect 行为电池 26 用例 99.7%，
      //   含并行落地的 ADR 0010 Tabs 受控修复；注：另两次并发跑因 coverage/.tmp 互清作废）：
      //   statements 64.93% / lines 64.93% / functions 71.62% / branches 85.98%
      // 2026-10-15 十测（270 文件 / 6427 用例全绿；+ Dialog 行为电池 30 用例 90.5%，
      //   登记 5 处设计怪癖；串行独占复测，json 汇总值）：
      //   statements 65.31% / lines 65.31% / functions 71.86% / branches 86.08%
      // 2026-10-15 十一测（271 文件 / 6456 用例全绿；+ Upload 行为电池 29 用例 97.6%，
      //   登记 6 处设计怪癖；串行独占，json 汇总值）：
      //   statements 65.71% / lines 65.71% / functions 72.07% / branches 86.10%
      // 阈值随棘轮上调至 lines/statements 65.7、functions 72.0、branches 86.1
      //（小数口径：整数 59/69/85 已是实测值的下界，收紧到小数才真正锁住当前水平、防回退）。
      // 规则：只允许上调，不允许为了让 CI 变绿而下调。
      thresholds: {
        lines: 65.7,
        functions: 72.0,
        branches: 86.1,
        statements: 65.7,
      },
    },
  },
});
