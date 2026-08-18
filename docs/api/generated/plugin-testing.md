# @lytjs/plugin-testing

官方测试插件

## 目录

- [createMockFn](#createmockfn)
- [createDOMTestHelpers](#createdomtesthelpers)
- [createSignalTestHelpers](#createsignaltesthelpers)
- [createFuzzTestHelpers](#createfuzztesthelpers)
- [createPerformanceTestHelpers](#createperformancetesthelpers)
- [createTestingContext](#createtestingcontext)
- [TestingPluginOptions](#testingpluginoptions)
- [WrapperOptions](#wrapperoptions)
- [ComponentWrapper](#componentwrapper)
- [MockOptions](#mockoptions)
- [MockFn](#mockfn)
- [SignalTestHelpers](#signaltesthelpers)
- [DOMTestHelpers](#domtesthelpers)
- [FuzzGeneratorOptions](#fuzzgeneratoroptions)
- [FuzzTestResult](#fuzztestresult)
- [BenchmarkOptions](#benchmarkoptions)
- [BenchmarkResult](#benchmarkresult)
- [RegressionTestOptions](#regressiontestoptions)
- [RegressionTestResult](#regressiontestresult)
- [FuzzTestHelpers](#fuzztesthelpers)
- [PerformanceTestHelpers](#performancetesthelpers)
- [TestingContext](#testingcontext)

## createMockFn

**Function**

创建 mock 函数

### 签名

```typescript
createMockFn: MockFn;
```

### 参数

| 参数    | 类型          | 描述 | 可选 | 默认值 |
| ------- | ------------- | ---- | ---- | ------ |
| options | `MockOptions` |      | 是   | {}     |

### 返回值

**类型:** `MockFn`

## createDOMTestHelpers

**Function**

创建 DOM 测试助手

### 签名

```typescript
createDOMTestHelpers: DOMTestHelpers;
```

### 返回值

**类型:** `DOMTestHelpers`

## createSignalTestHelpers

**Function**

创建 Signal 测试助手

### 签名

```typescript
createSignalTestHelpers: SignalTestHelpers;
```

### 返回值

**类型:** `SignalTestHelpers`

## createFuzzTestHelpers

**Function**

创建模糊测试助手

### 签名

```typescript
createFuzzTestHelpers: FuzzTestHelpers;
```

### 返回值

**类型:** `FuzzTestHelpers`

## createPerformanceTestHelpers

**Function**

创建性能测试助手

### 签名

```typescript
createPerformanceTestHelpers: PerformanceTestHelpers;
```

### 返回值

**类型:** `PerformanceTestHelpers`

## createTestingContext

**Function**

创建测试上下文

### 签名

```typescript
createTestingContext: TestingContext;
```

### 参数

| 参数      | 类型                   | 描述 | 可选 | 默认值 |
| --------- | ---------------------- | ---- | ---- | ------ |
| \_options | `TestingPluginOptions` |      | 是   | {}     |

### 返回值

**类型:** `TestingContext`

## TestingPluginOptions

**Interface**

### 成员

| 名称           | 类型      | 描述                 | 可选       |
| -------------- | --------- | -------------------- | ---------- | ------------ | --- |
| defaultTimeout | `number`  | 默认超时时间（毫秒） | 是         |
| autoCleanup    | `boolean` | 是否启用自动清理     | 是         |
| environment    | `'node'   | 'jsdom'              | 'browser'` | 测试环境配置 | 是  |

## WrapperOptions

**Interface**

### 成员

| 名称      | 类型                      | 描述           | 可选     |
| --------- | ------------------------- | -------------- | -------- | --- |
| container | `Element                  | string`        | 挂载目标 | 是  |
| props     | `Record<string, unknown>` | 组件 props     | 是       |
| slots     | `Record<string, unknown>` | 插槽内容       | 是       |
| attach    | `boolean`                 | 是否挂载到 DOM | 是       |

## ComponentWrapper

**Interface**

### 成员

| 名称     | 类型                                             | 描述         | 可选     |
| -------- | ------------------------------------------------ | ------------ | -------- | --- |
| instance | `T`                                              | 实例         | 否       |
| element  | `Element`                                        | 根元素       | 否       |
| unmount  | `() => void`                                     | 组件卸载     | 否       |
| rerender | `(props?: Record<string, unknown>) => void`      | 重新渲染     | 否       |
| find     | `(selector: string) => Element                   | null`        | 查找元素 | 否  |
| findAll  | `(selector: string) => Element[]`                | 查找所有元素 | 否       |
| trigger  | `(eventName: string, payload?: unknown) => void` | 触发事件     | 否       |

## MockOptions

**Interface**

### 成员

| 名称             | 类型                              | 描述           | 可选 |
| ---------------- | --------------------------------- | -------------- | ---- |
| preserveOriginal | `boolean`                         | 是否保留原实现 | 是   |
| implementation   | `(...args: unknown[]) => unknown` | 模拟实现       | 是   |

## MockFn

**Interface**

### 成员

| 名称               | 类型                                            | 描述             | 可选               |
| ------------------ | ----------------------------------------------- | ---------------- | ------------------ | --- |
| callCount          | `number`                                        | 调用次数         | 否                 |
| calls              | `unknown[][]`                                   | 所有调用参数     | 否                 |
| lastCall           | `unknown[]                                      | undefined`       | 最后一次调用参数   | 否  |
| mockReturnValue    | `(value: unknown) => void`                      | 模拟返回值       | 否                 |
| mockImplementation | `(fn: (...args: unknown[]) => unknown) => void` | 模拟实现         | 否                 |
| mockReset          | `() => void`                                    | 重置 mock        | 否                 |
| mockClear          | `() => void`                                    | 清除所有调用记录 | 否                 |
| originalFn         | `((...args: unknown[]) => unknown)              | undefined`       | 原始函数（如果有） | 否  |

## SignalTestHelpers

**Interface**

### 成员

| 名称          | 类型                                                                                                       | 描述                 | 可选 |
| ------------- | ---------------------------------------------------------------------------------------------------------- | -------------------- | ---- |
| trackUpdates  | `<T>(signal: { value: T }) => { readonly value: T; readonly updateCount: number; readonly history: T[]; }` | 检查 signal 是否更新 | 否   |
| waitForUpdate | `<T>(signal: { value: T }, timeout?: number) => Promise<void>`                                             | 等待 signal 更新     | 否   |

## DOMTestHelpers

**Interface**

### 成员

| 名称                      | 类型                                                       | 描述                                    | 可选                 |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------- | -------------------- | ------------ | --- |
| waitForElement            | `(selector: string, timeout?: number) => Promise<Element>` | 等待元素出现                            | 否                   |
| waitForElementToDisappear | `(selector: string, timeout?: number) => Promise<void>`    | 等待元素消失                            | 否                   |
| waitForText               | `(text: string, timeout?: number) => Promise<Element>`     | 等待文本出现                            | 否                   |
| fillForm                  | `(data: Record<string, string                              | boolean>) => void`                      | 模拟用户输入         | 否           |
| click                     | `(selector: string                                         | Element) => void`                       | 模拟点击             | 否           |
| exists                    | `(selector: string) => boolean`                            | 检查元素是否存在                        | 否                   |
| isVisible                 | `(selector: string                                         | Element) => boolean`                    | 检查元素是否可见     | 否           |
| isDisabled                | `(selector: string                                         | Element) => boolean`                    | 检查元素是否禁用     | 否           |
| text                      | `(selector: string                                         | Element) => string`                     | 获取元素文本         | 否           |
| attribute                 | `(selector: string                                         | Element, name: string) => string        | null`                | 获取元素属性 | 否  |
| classes                   | `(selector: string                                         | Element) => string[]`                   | 获取元素类名         | 否           |
| hasClass                  | `(selector: string                                         | Element, className: string) => boolean` | 检查元素是否包含类名 | 否           |

## FuzzGeneratorOptions

**Interface**

模糊测试生成器配置

### 成员

| 名称           | 类型      | 描述                                   | 可选 |
| -------------- | --------- | -------------------------------------- | ---- |
| maxLength      | `number`  | 生成值的最大长度（针对字符串、数组等） | 是   |
| min            | `number`  | 最小值（针对数字）                     | 是   |
| max            | `number`  | 最大值（针对数字）                     | 是   |
| allowNull      | `boolean` | 是否允许 null/undefined                | 是   |
| allowUndefined | `boolean` | 是否允许 undefined                     | 是   |

## FuzzTestResult

**Interface**

模糊测试结果

### 成员

| 名称        | 类型                                       | 描述             | 可选 |
| ----------- | ------------------------------------------ | ---------------- | ---- |
| totalCases  | `number`                                   | 测试用例总数     | 否   |
| passedCases | `number`                                   | 通过的测试用例数 | 否   |
| failedCases | `Array<{ input: unknown; error: Error; }>` | 失败的测试用例   | 否   |
| success     | `boolean`                                  | 是否全部通过     | 否   |

## BenchmarkOptions

**Interface**

性能基准测试配置

### 成员

| 名称             | 类型      | 描述             | 可选 |
| ---------------- | --------- | ---------------- | ---- |
| iterations       | `number`  | 迭代次数         | 是   |
| warmupIterations | `number`  | 预热次数         | 是   |
| verbose          | `boolean` | 是否输出详细信息 | 是   |

## BenchmarkResult

**Interface**

性能基准测试结果

### 成员

| 名称         | 类型     | 描述                 | 可选 |
| ------------ | -------- | -------------------- | ---- |
| name         | `string` | 操作名称             | 否   |
| totalTime    | `number` | 总执行时间（毫秒）   | 否   |
| averageTime  | `number` | 平均执行时间（毫秒） | 否   |
| minTime      | `number` | 最快执行时间（毫秒） | 否   |
| maxTime      | `number` | 最慢执行时间（毫秒） | 否   |
| iterations   | `number` | 操作次数             | 否   |
| opsPerSecond | `number` | 每秒操作数           | 否   |

## RegressionTestOptions

**Interface**

性能回归测试配置

### 成员

| 名称      | 类型              | 描述                                                         | 可选 |
| --------- | ----------------- | ------------------------------------------------------------ | ---- |
| threshold | `number`          | 性能阈值（百分比），如果新的性能比基准慢超过这个百分比则失败 | 是   |
| baseline  | `BenchmarkResult` | 基准数据                                                     | 是   |

## RegressionTestResult

**Interface**

性能回归测试结果

### 成员

| 名称              | 类型              | 描述                                         | 可选 |
| ----------------- | ----------------- | -------------------------------------------- | ---- |
| passed            | `boolean`         | 是否通过回归测试                             | 否   |
| baseline          | `BenchmarkResult` | 基准结果                                     | 否   |
| current           | `BenchmarkResult` | 当前结果                                     | 否   |
| regressionPercent | `number`          | 性能差异百分比（正值表示变慢，负值表示变快） | 否   |
| message           | `string`          | 消息                                         | 否   |

## FuzzTestHelpers

**Interface**

### 成员

| 名称          | 类型                                                             | 描述                                                              | 可选         |
| ------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- | ------------ | --- |
| randomString  | `(options?: FuzzGeneratorOptions) => string`                     | 生成随机字符串                                                    | 否           |
| randomNumber  | `(options?: FuzzGeneratorOptions) => number`                     | 生成随机数字                                                      | 否           |
| randomBoolean | `() => boolean`                                                  | 生成随机布尔值                                                    | 否           |
| randomArray   | `<T>(generator: () => T, options?: FuzzGeneratorOptions) => T[]` | 生成随机数组                                                      | 否           |
| randomObject  | `(options?: FuzzGeneratorOptions) => Record<string, unknown>`    | 生成随机对象                                                      | 否           |
| randomDate    | `(options?: FuzzGeneratorOptions) => Date`                       | 生成随机日期                                                      | 否           |
| fuzz          | `<T>( generator: () => T, testFn: (input: T) => void             | Promise<void>, iterations?: number, ) => Promise<FuzzTestResult>` | 运行模糊测试 | 否  |

## PerformanceTestHelpers

**Interface**

### 成员

| 名称           | 类型                                                                                                                          | 描述                                                                                                           | 可选         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------ | --- |
| benchmark      | `( name: string, fn: () => void                                                                                               | Promise<void>, options?: BenchmarkOptions, ) => Promise<BenchmarkResult>`                                      | 运行基准测试 | 否  |
| compare        | `( baseline: BenchmarkResult, current: BenchmarkResult, ) => { percentChange: number; isFaster: boolean; isSlower: boolean }` | 比较两次基准测试结果                                                                                           | 否           |
| regressionTest | `( name: string, fn: () => void                                                                                               | Promise<void>, baseline: BenchmarkResult, options?: RegressionTestOptions, ) => Promise<RegressionTestResult>` | 性能回归测试 | 否  |
| saveBaseline   | `(result: BenchmarkResult, path?: string) => void`                                                                            | 保存基准数据                                                                                                   | 否           |
| loadBaseline   | `(name: string, path?: string) => BenchmarkResult                                                                             | null`                                                                                                          | 加载基准数据 | 否  |

## TestingContext

**Interface**

### 成员

| 名称          | 类型                                                                                 | 描述                                                  | 可选         |
| ------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------- | ------------ | --- |
| mount         | `<T = unknown>(component: unknown, options?: WrapperOptions) => ComponentWrapper<T>` | 组件包装器                                            | 否           |
| mockFn        | `(options?: MockOptions) => MockFn`                                                  | 创建 mock 函数                                        | 否           |
| mockModule    | `(moduleName: string, factory: () => unknown) => void`                               | 模拟模块                                              | 否           |
| clearAllMocks | `() => void`                                                                         | 清除所有 mock                                         | 否           |
| signal        | `SignalTestHelpers`                                                                  | 信号测试助手                                          | 否           |
| dom           | `DOMTestHelpers`                                                                     | DOM 测试助手                                          | 否           |
| wait          | `(ms: number) => Promise<void>`                                                      | 等待指定时间                                          | 否           |
| waitFor       | `(condition: () => boolean                                                           | Promise<boolean>, timeout?: number) => Promise<void>` | 等待条件满足 | 否  |
| nextTick      | `() => Promise<void>`                                                                | 下一帧                                                | 否           |
| fuzz          | `FuzzTestHelpers`                                                                    | 模糊测试助手                                          | 否           |
| performance   | `PerformanceTestHelpers`                                                             | 性能测试助手                                          | 否           |
