# @lytjs/test-utils

Lyt.js 测试工具库 - 提供测试支持的工具函数和组件。

## 安装

```bash
npm install @lytjs/test-utils --save-dev

# 或使用 pnpm
pnpm add @lytjs/test-utils -D
```

## 特性

- 📦 组件挂载工具
- 🔍 元素查询
- 🎯 事件触发
- 💾 状态模拟
- 🚀 零运行时依赖

## 快速开始

```javascript
import { mount } from '@lytjs/test-utils';
import { defineComponent, ref } from '@lytjs/core';

const Counter = defineComponent({
  setup() {
    const count = ref(0);
    const increment = () => count.value++;
    return { count, increment };
  },
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <button @click="increment">Increment</button>
    </div>
  `
});

test('increments counter', () => {
  const wrapper = mount(Counter);
  const button = wrapper.find('button');
  const p = wrapper.find('p');

  expect(p.text()).toBe('Count: 0');
  button.trigger('click');
  expect(p.text()).toBe('Count: 1');
});
```

## API 参考

### mount

挂载组件进行测试

```javascript
import { mount } from '@lytjs/test-utils';

const wrapper = mount(Component, {
  props: {},
  slots: {},
  attachTo: document.body
});
```

### shallowMount

浅层挂载组件，不渲染子组件

```javascript
import { shallowMount } from '@lytjs/test-utils';

const wrapper = shallowMount(Component);
```

### createTestingApp

创建测试用的应用实例

```javascript
import { createTestingApp } from '@lytjs/test-utils';

const app = createTestingApp(Component);
```

### Wrapper API

| 方法 | 说明 |
|------|------|
| `find(selector)` | 查找元素 |
| `findAll(selector)` | 查找所有元素 |
| `trigger(event)` | 触发事件 |
| `text()` | 获取文本内容 |
| `html()` | 获取 HTML |
| `isVisible()` | 检查是否可见 |
| `isEnabled()` | 检查是否启用 |
| `attributes()` | 获取属性 |
| `classes()` | 获取类名 |
| `setProps(props)` | 设置组件属性 |
| `vm` | 访问组件实例 |

## 示例

### 测试组件属性

```javascript
import { mount } from '@lytjs/test-utils';
import { defineComponent } from '@lytjs/core';

const Greeting = defineComponent({
  props: ['name'],
  template: '<p>Hello, {{ name }}!</p>'
});

test('renders with name', () => {
  const wrapper = mount(Greeting, {
    props: { name: 'Alice' }
  });
  expect(wrapper.text()).toBe('Hello, Alice!');
});
```

### 测试事件

```javascript
import { mount } from '@lytjs/test-utils';
import { defineComponent } from '@lytjs/core';

const Button = defineComponent({
  emits: ['click'],
  template: '<button @click="$emit('click')">Click</button>'
});

test('emits click event', () => {
  const wrapper = mount(Button);
  const button = wrapper.find('button');
  button.trigger('click');
  expect(wrapper.emitted('click')).toBeTruthy();
});
```

### 测试插槽

```javascript
import { mount } from '@lytjs/test-utils';
import { defineComponent } from '@lytjs/core';

const Card = defineComponent({
  template: '<div><slot /></div>'
});

test('renders slot content', () => {
  const wrapper = mount(Card, {
    slots: {
      default: '<p>Hello</p>'
    }
  });
  expect(wrapper.text()).toBe('Hello');
});
```

### 测试响应式数据

```javascript
import { mount } from '@lytjs/test-utils';
import { defineComponent, ref } from '@lytjs/core';

const Form = defineComponent({
  setup() {
    const input = ref('');
    return { input };
  },
  template: '<input v-model="input" />'
});

test('updates input value', async () => {
  const wrapper = mount(Form);
  const input = wrapper.find('input');
  input.setValue('Hello');
  expect(wrapper.vm.input).toBe('Hello');
});
```

## 性能

- 轻量级测试工具
- 零运行时依赖
- 快速的组件挂载
- 高效的测试执行

## 兼容性

- Node.js >= 18.0.0
- 支持主流测试框架（Jest、Vitest）

## License

MIT
