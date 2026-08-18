# @lytjs/plugin-testing

LytJS 官方测试插件，提供组件挂载、mock、DOM/Signal 断言、模糊测试与性能回归测试等测试工具。

## 安装

```bash
pnpm add @lytjs/plugin-testing
```

## 使用示例

### 作为插件使用

插件按 LytJS 惯例在应用实例中注册。注册后可通过 `app.config.globalProperties.$testing` 或依赖注入 `lyt-testing` 访问测试上下文。

```typescript
import { createApp } from '@lytjs/core';
import pluginTesting from '@lytjs/plugin-testing';

const app = createApp();

app.use(pluginTesting, {
  defaultTimeout: 5000,
  autoCleanup: true,
  environment: 'jsdom',
});
```

### 独立使用

```typescript
import { createTestingContext, createMockFn } from '@lytjs/plugin-testing';

const t = createTestingContext();

// 创建 mock 函数
const fn = t.mockFn();
fn('lytjs');
console.log(fn.callCount); // 1
console.log(fn.calls); // [['lytjs']]

// DOM 断言
await t.dom.waitForElement('#app');
t.dom.fillForm({ username: 'test', remember: true });
t.dom.click('#submit');
console.log(t.dom.text('#status'));
console.log(t.dom.hasClass('#btn', 'active'));

// 等待条件 / 定时
await t.waitFor(() => t.dom.exists('#result'));
await t.wait(100);

// 模糊测试
const result = await t.fuzz(
  () => t.fuzz.randomString({ maxLength: 20 }),
  (input) => {
    /* 对输入执行测试 */
  },
  10,
);
console.log(result.success, result.passedCases, result.failedCases);
```

## API 说明

### 导出

- 默认导出：`pluginTesting`（插件，通过 `app.use` 注册）
- `createTestingContext(options?: TestingPluginOptions): TestingContext` 创建测试上下文
- `createMockFn(options?: MockOptions): MockFn` 创建独立 mock 函数

### TestingContext

| 成员            | 说明                                              |
| --------------- | ------------------------------------------------- |
| `mount`         | 挂载组件并包装为 `ComponentWrapper`               |
| `mockFn`        | 创建 mock 函数                                    |
| `mockModule`    | 模拟模块（按名注册）                              |
| `clearAllMocks` | 清除全部 mock                                     |
| `signal`        | Signal 测试助手（`trackUpdates`/`waitForUpdate`） |
| `dom`           | DOM 测试助手                                      |
| `fuzz`          | 模糊测试助手                                      |
| `performance`   | 性能基准/回归测试助手                             |
| `wait`          | 等待指定毫秒                                      |
| `waitFor`       | 等待条件满足                                      |
| `nextTick`      | 等待下一帧                                        |

### DOM 测试助手（`dom`）

`waitForElement`、`waitForElementToDisappear`、`waitForText`、`fillForm`、`click`、`exists`、`isVisible`、`isDisabled`、`text`、`attribute`、`classes`、`hasClass`。

### 模糊测试助手（`fuzz`）

`randomString`、`randomNumber`、`randomBoolean`、`randomArray`、`randomObject`、`randomDate`、`fuzz`（返回 `FuzzTestResult`）。

### 性能测试助手（`performance`）

`benchmark`、`compare`、`regressionTest`、`saveBaseline`、`loadBaseline`。

### 类型导出

`TestingPluginOptions`、`WrapperOptions`、`ComponentWrapper`、`MockOptions`、`MockFn`、`SignalTestHelpers`、`DOMTestHelpers`、`TestingContext`、`FuzzTestHelpers`、`PerformanceTestHelpers`、`FuzzGeneratorOptions`、`FuzzTestResult`、`BenchmarkOptions`、`BenchmarkResult`、`RegressionTestOptions`、`RegressionTestResult`。

## 相关包

- [@lytjs/core](../../../core) 插件定义与运行时核心
- [@lytjs/reactivity](../../../reactivity) Signal 测试所需的响应式能力

## 许可证

[MIT](../../../../LICENSE)
