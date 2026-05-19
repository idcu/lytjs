# @lytjs/dom

> DOM 工具包，提供 Web Components 集成、属性反射与自定义元素增强能力

## 安装

```bash
npm install @lytjs/dom
```

## 核心 API

### 类型转换器

内置类型转换器，用于在 JavaScript 属性值与 HTML attribute 字符串之间进行双向转换

```typescript
import {
  StringConverter,
  NumberConverter,
  BooleanConverter,
  ObjectConverter,
  getConverterByType,
} from '@lytjs/dom';

// 字符串转换
StringConverter.toAttribute('hello'); // 'hello'
StringConverter.fromAttribute(null); // ''

// 数字转换
NumberConverter.toAttribute(42); // '42'
NumberConverter.fromAttribute('42'); // 42
NumberConverter.fromAttribute('abc'); // null

// 布尔转换
BooleanConverter.toAttribute(true); // ''
BooleanConverter.toAttribute(false); // null
BooleanConverter.fromAttribute(''); // true
BooleanConverter.fromAttribute(null); // false

// 对象转换（JSON 序列化）
ObjectConverter.toAttribute({ a: 1 }); // '{"a":1}'
ObjectConverter.fromAttribute('{"a":1}'); // { a: 1 }

// 根据类型自动获取转换器
const converter = getConverterByType('number'); // NumberConverter
```

### AttributeReflector

属性反射管理器，处理 JavaScript 属性与 HTML attribute 之间的双向同步

```typescript
import { AttributeReflector } from '@lytjs/dom';

const reflector = new AttributeReflector();

// 注册属性反射配置
reflector.register({
  prop: 'disabled',
  attr: 'disabled',
  converter: BooleanConverter,
});

// 批量注册
reflector.registerAll([
  { prop: 'title', converter: StringConverter },
  { prop: 'count', converter: NumberConverter },
]);

// 属性值同步到 attribute
reflector.reflectToAttribute(element, 'disabled', true);

// 从 attribute 同步到属性值
const result = reflector.reflectFromAttribute(element, 'disabled');
// result: { prop: 'disabled', value: true }

// 获取所有观察的 attribute 名称
reflector.getObservedAttributes(); // ['disabled', 'title', 'count']
```

### createEnhancedElementClass

创建增强的 Web Component 基类，提供属性反射、变更观察和生命周期钩子

```typescript
import { createEnhancedElementClass } from '@lytjs/dom';

const MyElement = createEnhancedElementClass({
  shadow: true,
  styles: ':host { display: block; }',
  properties: [
    { name: 'title', type: 'string', default: 'Hello' },
    { name: 'count', type: 'number', default: 0 },
  ],
});

// 继承并实现自定义逻辑
class MyCustomElement extends MyElement {
  protected onConnected(): void {
    console.log('Connected:', this.getProperty('title'));
  }

  protected onPropertyChanged(name: string, newValue: unknown): void {
    console.log(`${name} changed to`, newValue);
  }
}

customElements.define('my-element', MyCustomElement);
```

### defineLytJSWebComponent

将 LytJS 组件注册为 Web Component（桥接功能开发中）

```typescript
import { defineLytJSWebComponent } from '@lytjs/dom';

defineLytJSWebComponent(
  'my-lytjs-component',
  {
    component: MyLytJSComponent,
    propMapping: { title: 'label' },
    eventMapping: { change: 'on-change' },
  },
  {
    shadow: true,
    styles: ':host { display: block; }',
  },
);
```

### 工具函数

Web Components 环境检测与辅助函数

```typescript
import {
  supportsWebComponents,
  whenDefined,
  isDefined,
  upgradeAll,
  camelToKebab,
  kebabToCamel,
} from '@lytjs/dom';

// 检测浏览器支持
if (supportsWebComponents()) {
  console.log('Web Components 可用');
}

// 等待自定义元素定义完成
await whenDefined('my-element');

// 检查是否已定义
isDefined('my-element'); // true

// 升级所有未升级的自定义元素
upgradeAll(document.body);

// 命名转换
camelToKebab('myComponent'); // 'my-component'
kebabToCamel('my-component'); // 'myComponent'
```

## 类型定义

```typescript
import type {
  WCPropertyDefinition,
  WebComponentOptions,
  AttributeReflectionConfig,
  LytJSBridgeOptions,
} from '@lytjs/dom';
```

### WCPropertyDefinition

Web Component 属性定义

```typescript
interface WCPropertyDefinition {
  name: string;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  default?: unknown;
  reflect?: boolean;
  onChange?: (newValue: unknown, oldValue: unknown) => void;
}
```

### WebComponentOptions

Web Component 配置选项

```typescript
interface WebComponentOptions {
  properties?: WCPropertyDefinition[];
  shadow?: boolean | ShadowRootInit;
  styles?: string;
  observedAttributes?: string[];
  extends?: string;
}
```

### AttributeReflectionConfig

属性反射配置

```typescript
interface AttributeReflectionConfig {
  prop: string;
  attr?: string;
  converter?: {
    toAttribute?: (value: unknown) => string | null;
    fromAttribute?: (value: string | null) => unknown;
  };
}
```

### LytJSBridgeOptions

LytJS 组件与 Web Component 桥接选项

```typescript
interface LytJSBridgeOptions {
  component: unknown;
  propMapping?: Record<string, string>;
  eventMapping?: Record<string, string>;
  slotMapping?: Record<string, string>;
}
```

## 相关包

- [@lytjs/core](../core) - 框架核心入口
- [@lytjs/host-contract](../host-contract) - 渲染器宿主抽象
- [@lytjs/dom-runtime](../dom-runtime) - DOM 运行时工具

## 依赖版本

- [@lytjs/common-is](https://www.npmjs.com/package/@lytjs/common-is): ^6.4.0
- [@lytjs/common-string](https://www.npmjs.com/package/@lytjs/common-string): ^6.4.0
