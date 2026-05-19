# VDOM 实现原理

深入解析 `@lytjs/vdom` 的虚拟 DOM 实现。

---

## 核心架构

```
@lytjs/vdom
├── VNode 系统        ─── 虚拟节点创建与类型
├── Block Tree        ─── 编译时优化
├── Diff 算法         ─── 高效更新
├── PatchFlags        ─── 精确更新标记
└── 对象池            ─── 性能优化
```

---

## VNode 结构

### 最小 VNode

```ts
interface VNode {
  type: VNodeTypes; // 标签名/组件
  props: VNodeData | null; // 属性
  children: VNodeChildren; // 子节点
  el: HostNode | null; // 真实 DOM 引用
  key: string | null; // 列表 key
  ref: unknown; // ref 引用
  flags: number; // PatchFlags
  shapeFlag: number; // ShapeFlags
}
```

### VNode 类型

| 类型     | 说明          | 示例            |
| -------- | ------------- | --------------- |
| 元素     | HTML/SVG 标签 | `h('div', ...)` |
| 文本     | 文本节点      | `'Hello'`       |
| 注释     | 注释节点      | `<!---->`       |
| Fragment | 片段          | `<></>`         |
| 组件     | 组件实例      | `<MyComponent>` |

---

## Block Tree

Block Tree 是 LytJS 的**编译时优化**机制。

### 为什么需要 Block？

传统 VDOM diff 需遍历所有节点，Block Tree 通过**静态/动态分离**减少比较次数。

### 工作原理

```
模板：
<div class="container">
  <span>Static</span>           ← 静态，不需要比较
  <span>{{ dynamic }}</span>      ← 动态，精确比较
</div>

编译后：
<div class="container">          ← Block (收集动态节点)
  [span: static]                 ← 跳过比较
  <DynamicBlock>
    [dynamic: 精确比较]          ← 只比较这里
  </DynamicBlock>
</div>
```

### PatchFlags 的作用

```ts
// 模板中的动态绑定会被编译为带 PatchFlags 的 VNode
h(
  'div',
  {
    class: 'container', // 静态 → 无 flag
    id: dynamicId, // 动态 → PatchFlags.PROPS
  },
  [
    h('span', dynamicText), // 动态文本 → PatchFlags.TEXT
  ],
);
```

| PatchFlag  | 值  | 说明                         |
| ---------- | --- | ---------------------------- |
| TEXT       | 1   | 文本内容变化                 |
| CLASS      | 2   | class 变化                   |
| STYLE      | 4   | style 变化                   |
| PROPS      | 8   | props 变化（除 class/style） |
| FULL_PROPS | 16  | 完整 props 比较              |

---

## Diff 算法

### 双端 Diff

LytJS 使用双端指针进行列表 diff：

```
旧列表: [A, B, C, D, E]
新列表: [A, C, B, F]

指针:
  oldStart → A
  oldEnd ← E
  newStart → A
  newEnd ← F

1. A vs A → 相同，指针右移
2. B vs C → 不同，尝试匹配
3. E vs F → 不同，尝试匹配
4. ...
```

### 最长递增子序列 (LIS)

移动操作使用 LIS 优化：

```
新列表索引: [0, 2, 1, 3]
           ↓
最长递增: [0, 2, 3]  (索引 0, 1, 2)
           ↓
需移动: 索引 1 (B) 和 索引 2 (C)
最小移动次数 = 列表长度 - LIS 长度
```

---

## 对象池

VNode 对象池避免频繁 GC：

```ts
class VNodePool {
  private pool: VNode[] = [];

  allocate(): VNode {
    return this.pool.pop() ?? createNewVNode();
  }

  release(vnode: VNode): void {
    resetVNode(vnode);
    this.pool.push(vnode);
  }
}
```

---

## 扩展阅读

- [API 参考 - vdom](../api/vdom) — 完整 API 文档
- [编译原理](./compiler-deep) — PatchFlags 如何生成
- [渲染模式](../guide/rendering-modes) — VNode 与 Signal 模式对比
