# @lytjs/dom-runtime

LytJS Signal 模式 DOM 运行时，提供细粒度 DOM 操作能力。

## 安装

```bash
pnpm add @lytjs/dom-runtime
```

## API

### DOM 创建

- `createTemplate(html)` - 从 HTML 字符串创建模板元素，解析一次，后续克隆复用
- `createElement(tag, attrs?, children?)` - 创建 DOM 元素
- `createTextNode(text)` - 创建文本节点

### DOM 插入/删除

- `insert(child, parent, ref?)` - 将节点插入到父元素中，ref 为 null 时追加到末尾
- `remove(child)` - 移除节点
- `clearChildren(parent)` - 清空父元素的所有子节点

### DOM 属性操作

- `setText(el, value)` - 设置元素的文本内容
- `setHTML(el, value)` - 设置元素的 HTML 内容
- `setAttribute(el, key, value)` - 设置元素的属性
- `removeAttribute(el, key)` - 移除元素的属性
- `setProperty(el, key, value)` - 智能设置属性/property
- `setStyle(el, style)` - 设置元素的样式
- `setClass(el, value)` - 设置元素的 class
- `toggleClass(el, className, force?)` - 切换元素的 class

### 事件绑定

- `addEventListener(el, event, handler, options?)` - 添加事件监听器，返回取消监听函数
- `createEventHandler(el, event, handler, modifiers?)` - 创建事件处理器，支持 `.stop`、`.prevent`、`.capture`、`.once` 修饰符

### 列表协调

- `reconcileArray(parent, list, options, ref?)` - 协调列表 DOM（keyed diff 算法）

### effect 绑定辅助

- `bindEffect(fn)` - 创建自动清理的 effect
- `batchDOM(fn)` - 批量执行 DOM 操作

### 卸载

- `onCleanup(fn)` - 注册清理函数
- `runCleanups()` - 执行所有注册的清理函数

## License

MIT
