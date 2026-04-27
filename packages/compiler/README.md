# @lytjs/compiler

Lyt.js 模板编译器 - 将模板字符串解析、转换、优化并生成渲染函数。

## 安装

```bash
npm install @lytjs/compiler

# 或使用 pnpm
pnpm add @lytjs/compiler
```

## 特性

- 🔍 HTML 解析器
- 📦 AST 转换
- ⚡ 静态节点提升
- 🏷️ Patch Flag 优化
- 🎯 零运行时依赖

## 快速开始

### 编译模板

```javascript
import { compile } from '@lytjs/compiler';

const { render, staticRenderFns } = compile(`
  <div>
    <h1>{{ title }}</h1>
    <p>Hello, {{ name }}!</p>
  </div>
`);

console.log(render); // 渲染函数字符串
```

### 解析模板

```javascript
import { parse } from '@lytjs/compiler';

const ast = parse(`<div>{{ message }}</div>`);
console.log(ast);
```

## API 参考

### 编译选项

```javascript
import { compile } from '@lytjs/compiler';

const options = {
  mode: 'module',
  preserveWhitespace: false,
  comments: false,
  hoistStatic: true
};

const { render, staticRenderFns } = compile(template, options);
```

| 选项 | 类型 | 默认值 | 说明 |
|------|------|------|
| `mode` | `'module' | 'function'` | `'module'` | 输出模式 |
| `preserveWhitespace` | `boolean` | `false` | 是否保留空白字符 |
| `comments` | `boolean` | `false` | 是否保留注释 |
| `hoistStatic` | `boolean` | `true` | 是否提升静态节点 |
| `cacheHandlers` | `boolean` | `true` | 是否缓存事件处理器 |
| `scopeId` | `string` | - | 作用域样式 ID |

## 编译流程

### 1. Parse - 解析

将 HTML 模板 → AST（抽象语法树）

```javascript
import { parse } from '@lytjs/compiler';

const template = `<div>Hello</div>`;
const ast = parse(template);

/*
{
  type: 'Root,
  children: [
    {
      type: 'Element',
      tag: 'div',
      children: [{ type: 'Text', content: 'Hello' }]
    }
  ]
}
*/
```

### 2. Transform - 转换

对 AST 进行优化和标记

```javascript
import { parse, transform } from '@lytjs/compiler';

const ast = parse(template);
transform(ast);
```

### 3. Generate - 生成

将转换后的 AST → 渲染函数

```javascript
import { parse, transform, generate } from '@lytjs/compiler';

const ast = parse(template);
transform(ast);
const { code } = generate(ast);
```

## 优化特性

### 静态提升

```javascript
// 模板
const template = `
  <div>
    <h1>Static Title</h1>
    <p>{{ dynamic }}</p>
  </div>
`;

// 编译后
const _hoisted_1 = /*#__PURE__*/_createVNode("h1", null, "Static Title", -1 /* HOISTED */)

export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createBlock("div", null, [
    _hoisted_1,
    _createVNode("p", null, _toDisplayString(_ctx.dynamic), 1 /* TEXT */)
  ]))
}
```

### Patch Flags

```javascript
// 模板
<div :class="{ active: isActive }">{{ text }}</div>

// 编译后
_createVNode("div", { class: _normalizeClass({ active: _ctx.isActive }) }, _toDisplayString(_ctx.text), 2 /* CLASS, TEXT */)
```

## 示例

### 完整编译示例

```javascript
import { compile } from '@lytjs/compiler';

const template = `
  <div if="show">
    <h1>{{ title }}</h1>
    <ul>
      <li each="item in items" :key="item.id">
        {{ item.text }}
      </li>
    </ul>
  </div>
`;

const result = compile(template);

console.log('Render function:', result.render);
console.log('Static render functions:', result.staticRenderFns);
```

### 自定义插件

```javascript
import { compile } from '@lytjs/compiler';

const customTransform = (node, context) => {
  // 自定义 AST 转换
};

compile(template, {
  transformers: [customTransform]
});
```

## 性能

- 体积：4.97 KB (ESM gzip)
- 零运行时依赖
- 编译时优化，运行时零开销

## 兼容性

- Node.js >= 18.0.0
- 浏览器环境也支持

## License

MIT
