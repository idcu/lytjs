import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { sharedAliases, sharedDefine, sharedSetupFiles } from './vitest.shared';

export default defineConfig({
  plugins: [tsconfigPaths()],
  // 定义全局变量（与单包配置共享同一份源）
  define: sharedDefine,
  // ⚠️ 2026-10-27 统一策略：**全部 alias 指向 `src/`，不再指向 `dist/`**。
  //
  // 原因（实证）：此前 38 条 alias 指向 `dist/*.mjs`，而 `dist` 是历史构建产物。
  // 2026-10-26 的全维度评估发现 `src` 最后改动是 10-26、`dist` 停在 10-15/10-24
  // ⇒ **测试跑的是旧产物**，"全绿"与"当前源码正确"之间没有因果关系。
  // 同一天报出的两个 P0（`v-if` 子节点被静默删除、原生 `v-model` 只产 modelValue）
  // 全部在这套"全绿"测试的眼皮底下发生。
  //
  // 附带收益：`tsup` 以 `define: { __DEV__: 'false' }` 产出生产版 dist，
  // 其中 `warn` / `warnOnce` 被压成空操作；而本仓多处以「DEV 下应发出警告」为断言。
  // 指向 src 后，裸 `__DEV__` 在运行期解析到 `globalThis.__DEV__`
  // （`vitest.setup.ts` 置 true、`setDevMode()` 可切换），DEV/生产两种预期都成立。
  //
  // S32：别名表已抽到 `vitest.shared.ts`，根配置与单包配置共用同一份源，
  // 不再出现「根配置指 src、单包配置指 dist」的口径分裂。
  // 维护约定：新增包时**只加 `src` alias**。若某个测试确实需要验证产物形态，
  // 请在该测试内显式 import `dist` 路径，而不是把整条 alias 改回 dist。
  resolve: {
    alias: sharedAliases,
    conditions: ['import', 'node', 'default'],
  },
  test: {
    environment: 'node',
    globals: true,
    // 使用绝对路径的全局 setup 文件（与单包配置共享）
    setupFiles: sharedSetupFiles,
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
      // 2026-10-15 十二测（272 文件 / 6485 用例全绿；+ InputNumber 行为电池 29 用例 98.0%，
      //   登记 4 处设计怪癖；串行独占，json 汇总值）：
      //   statements 66.10% / lines 66.10% / functions 72.20% / branches 86.16%
      // 2026-10-15 十三测（273 文件 / 6505 用例全绿；+ Pagination 行为电池 20 用例 100%，
      //   登记 4 处设计怪癖；串行独占，json 汇总值）：
      //   statements 66.50% / lines 66.50% / functions 72.29% / branches 86.21%
      // 阈值随棘轮上调至 lines/statements 66.5、functions 72.2、branches 86.2
      //（小数口径：整数 59/69/85 已是实测值的下界，收紧到小数才真正锁住当前水平、防回退）。
      // 规则：只允许上调，不允许为了让 CI 变绿而下调。
      //
      // ★ 口径声明（N01 / ADR 0028，真相源 scripts/coverage-basis.mjs）：
      //   本 thresholds 的分母是上面 include 展开后的**全部源码文件**（含未被测试加载的
      //   文件），是唯一对外有效的覆盖率口径。`coverage/index.html` 显示的约 87.9%
      //   只统计**已插桩文件**，分母更窄，两者相差约 21 个百分点 —— 不是回退、也不是
      //   数据错误，但**不可**拿后者宣称「全仓覆盖率」。对外引用见 coverage-basis.mjs。
      thresholds: {
        lines: 66.5,
        functions: 72.2,
        branches: 86.2,
        statements: 66.5,
      },
    },
  },
});
