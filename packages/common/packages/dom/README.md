# @lytjs/common-dom

LytJS 共享 DOM 工具。提供统一的 SVG 标签检测与 DOM 属性补丁函数（`patchClass` / `patchStyle` / `patchAttr` / `patchProp`），供 `@lytjs/vdom` 与 `@lytjs/renderer` 共享使用。

## 安装

```bash
pnpm add @lytjs/common-dom
```

## 使用示例

```ts
import {
  SVG_TAGS,
  SVG_NS,
  isSVGTag,
  patchClass,
  patchStyle,
  patchAttr,
  patchProp,
} from '@lytjs/common-dom';

isSVGTag('circle'); // true
isSVGTag('div'); // false
SVG_NS; // 'http://www.w3.org/2000/svg'

const el = document.createElement('div');
patchProp(el, 'class', '', 'foo bar'); // 委托给 patchClass
patchProp(el, 'style', '', { color: 'red' }); // 委托给 patchStyle
patchProp(el, 'id', '', 'app'); // 委托给 patchAttr
```

## API 说明

### SVG 常量与检测

- `SVG_TAGS: Set<string>`——完整的 SVG 元素集合（基本形状、分组容器、文本、渐变、滤镜、动画等）
- `SVG_NS: string`——SVG 命名空间 URI（`http://www.w3.org/2000/svg`）
- `isSVGTag(tag: string): boolean`——判断某个标签名是否为 SVG 元素

### 补丁函数

- `patchClass(el, prev, next)`——补丁 class 属性。通过 `String()` 转换来稳健处理 null/undefined，仅在前后不一致时更新 `className`
- `patchStyle(el, prev, next)`——补丁 style。处理字符串与对象之间的切换、camelCase 与 kebab-case 转换，并通过 `removeProperty` 正确移除不再存在的样式属性
- `patchAttr(el, key, value, _isSVG)`——补丁普通属性和布尔属性。null/false 时移除属性；布尔属性特殊处理；所有写入前均通过 `isSafeAttribute` 安全校验
- `patchProp(el, key, prevValue, nextValue, isSVG)`——统一补丁入口。按 key 分发：`class`/`style` 委托给对应补丁函数，`innerHTML` 走 `sanitizeHTML` 消毒，`textContent` 直接赋值，其余走 `patchAttr`。注意：**事件处理不在此处**，需由消费方（vdom/renderer）按自身策略处理

差异说明：

- 四个函数均为底层属性补丁原语，`patchProp` 是网关/分发器，其余三个是专用处理单元
- `patchClass` 只处理 class 字符串，`patchStyle` 处理样式对象/字符串，`patchAttr` 处理普通与布尔属性，而 `patchProp` 负责根据 key 路由到正确单元并额外处理 `innerHTML` / `textContent`

## 相关包

- [`@lytjs/common`](../common/README.md) — 聚合包，re-export 全部 `@lytjs/common-*` 子包

## 许可证

[MIT](../../../../LICENSE)
