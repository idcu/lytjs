# @lytjs/test-utils

LytJS 单元测试与集成测试辅助工具，提供组件挂载、异步等待、Mock、Signal 测试与断言工具，帮助编写 LytJS 应用的测试。

## 安装

```bash
pnpm add @lytjs/test-utils
```

> 在 Node.js 环境中使用需配合 `jsdom` 或 `happy-dom`（当全局 `document` 不存在时，`createDOMEnvironment()` 会抛出提示）。

## API

### 组件挂载

#### `mount(component, options?)`

挂载一个组件，返回 `Wrapper` 对象。

```typescript
import { mount } from '@lytjs/test-utils';
import MyComponent from './MyComponent.lyt';

const wrapper = mount(MyComponent, {
  props: { title: 'Hello' },
  // attachTo: '#app',           // 指定挂载 DOM
  global: {
    plugins: [], // 全局插件
    provide: { theme: 'dark' }, // 全局注入
  },
});

wrapper.text(); // 根节点文本
wrapper.find('.btn'); // 查询元素
wrapper.findAll('li'); // 查询全部匹配元素
await wrapper.setProps({ title: 'World' });
wrapper.trigger('.btn', 'click'); // 触发事件
wrapper.unmount(); // 卸载
```

#### `mountAsync(component, options?)`

挂载组件并在初始渲染完成后返回 `Wrapper`（等待微任务队列清空）。

### 异步工具

```typescript
import { flushPromises, nextTick, waitFor, wait } from '@lytjs/test-utils';

await flushPromises(); // 清空待处理的 Promise
await nextTick(); // 等待下一个 tick
await waitFor(() => wrapper.text().includes('Loaded'), { timeout: 2000 });
await wait(100); // 等待指定毫秒数
```

### Mock 工具

#### `mockFn(implementation?)`

创建带调用记录的 Mock 函数。

```typescript
import { mockFn } from '@lytjs/test-utils';

const fn = mockFn((x: number) => x * 2);
fn(2);
fn.calls; // [[2]]
fn.mockReturnValue(0);
fn.mockResolvedValue(1);
fn.mockClear();
fn.mockReset();
```

#### `spyOn(obj, method, implementation?)`

spy 对象上的方法（可恢复），返回的 mock 提供 `mockRestore()`。

```typescript
const spy = spyOn(service, 'fetch');
service.fetch();
spy.calls; // 调用记录
spy.mockRestore(); // 还原原方法
```

#### `mockComponent(name, options?)`

创建带名称的 Mock 组件。

```typescript
import { mockComponent } from '@lytjs/test-utils';
const FakeChild = mockComponent('FakeChild');
```

### Signal 测试工具

```typescript
import { createTestSignal, trackSignal } from '@lytjs/test-utils';

const sig = createTestSignal(0);
sig.value = 1;
sig.history(); // [0, 1]
sig.reset();

const tracker = trackSignal(sig);
tracker.values(); // 变更值序列
tracker.timestamps(); // 时间戳序列
tracker.count(); // 变更次数
tracker.stop();
```

### 断言与清理

```typescript
import { assertEmits, registerCleanup, runCleanup, mountWithCleanup } from '@lytjs/test-utils';

// 断言组件发出事件
const emitted = await assertEmits(wrapper, 'submit', () => {
  wrapper.trigger('form', 'submit');
});

// 注册/执行清理回调
registerCleanup(() => wrapper.unmount());
runCleanup();

// 带自动清理的挂载（unmount 会在 runCleanup 时执行）
const w = mountWithCleanup(MyComponent);
```

## 相关包

- `@lytjs/core` - LytJS 核心运行时
- `@lytjs/reactivity` - 响应式系统（Signal）
- `@lytjs/component` - 组件系统

## 许可证

[MIT](../../../../LICENSE)
