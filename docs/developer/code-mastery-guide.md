# 🔧 Lyt.js 代码层面完全掌控指南

> **从原理到实践，深度理解和完全掌控 Lyt.js 的每一行代码**

---

## 📋 目录

- [🎯 前言：为什么需要这份指南](#前言)
- [🏗️ 第一部分：项目架构深度解析](#第一部分)
- [⚛️ 第二部分：核心模块源码详解](#第二部分)
- [🔧 第三部分：开发和构建系统](#第三部分)
- [🛠️ 第四部分：扩展和贡献](#第四部分)
- [🎨 第五部分：组件库开发](#第五部分)
- [🔐 第六部分：质量保障和测试](#第六部分)
- [🚀 第七部分：发布和运维](#第七部分)
- [💡 第八部分：最佳实践和高级技巧](#第八部分)

---

## <a id="前言"></a> 🎯 前言：为什么需要这份指南

Lyt.js 是一个完全从零用原生实现的前端框架，零依赖、超轻量、设计优雅。这份指南将帮助你：

- **深度理解框架原理** - 从响应式系统到虚拟 DOM
- **完全掌控源代码** - 每个模块的实现细节
- **自信扩展和修改** - 根据需求定制框架
- **高效定位和解决问题** - 快速理解和修复 Bug
- **参与框架开发** - 成为社区贡献者

---

## <a id="第一部分"></a> 🏗️ 第一部分：项目架构深度解析

### 1.1 项目整体结构

```
lytjs/
├── packages/                  # 核心包（最重要的目录）
│   ├── reactivity/           # 响应式系统
│   ├── vdom/                 # 虚拟 DOM（核心）
│   ├── compiler/             # 模板编译器
│   ├── renderer/             # 渲染器（平台适配）
│   ├── component/            # 组件系统
│   ├── core/                 # 核心入口
│   ├── router/               # 路由系统
│   ├── store/                # 状态管理
│   ├── cli/                  # 命令行工具
│   ├── devtools/             # 开发者工具
│   ├── components/           # UI 组件库
│   ├── lytx/                 # 元框架
│   ├── lytjs/                # 聚合包
│   ├── vscode-extension/     # VSCode 扩展
│   ├── plugin-*              # 官方插件
│   └── test-utils/           # 测试工具
├── examples/                 # 示例项目
├── tests/                    # 集成测试
├── benchmarks/               # 性能基准
├── scripts/                  # 构建脚本
└── docs/                     # 文档
```

### 1.2 包依赖关系图

```
lytjs (聚合包)
│
├── core (整合包)
│   ├── component (组件系统)
│   │   └── reactivity
│   ├── renderer (渲染器)
│   │   ├── vdom
│   │   └── reactivity
│   ├── compiler (编译器)
│   └── reactivity
│
├── router (路由)
│   └── reactivity
│
├── store (状态管理)
│   └── reactivity
│
├── devtools
└── components
```

### 1.3 架构分层详解

| 层级 | 包含内容 | 职责 | 关键文件 |
|------|---------|------|---------|
| **应用层** | `core`、`lytx` | 应用创建、插件管理、全局配置 | `create-app.ts` |
| **组件层** | `component` | 组件实例、生命周期、插槽 | `component.ts` |
| **渲染层** | `renderer`、`vdom` | 虚拟 DOM、Diff、平台适配 | `vnode.ts`、`patch.ts` |
| **编译层** | `compiler` | 模板解析、优化、代码生成 | `compiler.ts` |
| **响应式层** | `reactivity` | 响应式数据、依赖追踪、更新调度 | `reactive.ts`、`effect.ts` |
| **工具层** | `router`、`store`、`devtools` | 路由、状态管理、调试工具 | `router.ts`、`store.ts` |
| **UI层** | `components` | UI 组件库（38+ 组件） | `components/src/` |

---

## <a id="第二部分"></a> ⚛️ 第二部分：核心模块源码详解

### 2.1 Reactivity - 响应式系统（最核心）

#### 文件结构
```
packages/reactivity/src/
├── index.ts               # 统一导出
├── reactive.ts            # Proxy 响应式代理 ✨
├── effect.ts              # 副作用系统 ✨
├── ref.ts                 # Ref 响应式引用
├── computed.ts            # 计算属性
├── watch.ts               # 侦听器
├── scheduler.ts           # 调度器
├── signal.ts              # Signal 响应式（新）
└── signal-component.ts    # Signal 组件集成
```

#### 核心文件详解：`reactive.ts`

```typescript
// 关键数据结构
const proxyMap = new WeakMap<object, any>()    // 原始对象 → 代理对象
const readonlyMap = new WeakMap<object, any>() // 原始对象 → 只读代理
```

**工作原理：**
1. `reactive(target)` 用 Proxy 包装对象
2. Proxy 的 `get` 劫持触发 `track()` 收集依赖
3. Proxy 的 `set` 劫持触发 `trigger()` 通知更新
4. 递归代理嵌套对象（默认深层响应式）

#### 核心文件详解：`effect.ts`

```typescript
// 核心概念
let activeEffect: ReactiveEffect | undefined    // 当前活跃的副作用

// 数据结构
type Dep = Set<ReactiveEffect>                   // 单个 key 的依赖
type KeyToDepMap = Map<any, Dep>                // key → 依赖集合
const targetMap = new WeakMap<object, KeyToDepMap>() // 对象 → key → 依赖集合
```

**工作流程：**
```
用户代码 → reactive() → Proxy()
              ↓
effect(fn) → activeEffect = this → 运行 fn()
              ↓
fn() 中访问响应式数据 → get 劫持 → track()
              ↓
track() 在 targetMap 中记录 activeEffect 为依赖
              ↓
数据更新 → set 劫持 → trigger()
              ↓
trigger() 从 targetMap 找到对应 effects → run()
              ↓
effect.run() → 重新执行 fn() → 视图更新 ✅
```

#### 响应式系统实战技巧

**调试响应式系统：**

```typescript
// 在 effect.ts 中添加调试代码
const debug = true

function track(target: object, key: any) {
  if (debug) {
    console.log('🔍 追踪依赖:', target, key)
  }
  // ...原有代码
}

function trigger(target: object, key: any) {
  if (debug) {
    console.log('⚡ 触发更新:', target, key)
  }
  // ...原有代码
}
```

**性能优化：**
- 使用 `shallowReactive` 避免深层代理
- 使用 `markSkip` 跳过特定对象代理
- 计算属性自动缓存，避免重复计算

---

### 2.2 VDOM - 虚拟 DOM 引擎

#### 文件结构
```
packages/vdom/src/
├── index.ts               # 统一导出
├── vnode.ts               # VNode 定义 ✨
├── patch.ts               # Patch 算法 ✨
├── list-diff.ts           # 列表 Diff（LIS 算法）✨
├── block.ts               # Block Tree 优化
├── fragment.ts            # Fragment 片段
└── patch-flag.ts          # 补丁标记（编译优化）
```

#### VNode 数据结构

```typescript
interface VNode {
  type: any                // 组件类型或 HTML 标签
  props: any              // 属性
  children: any           // 子节点
  shapeFlag: number       // 形状标志（位运算）
  patchFlag: number       // 补丁标志（优化提示）
  key: any                // 唯一键（列表优化）
  el: any                 // 对应的真实 DOM
  component: any          // 组件实例
}
```

#### Patch 算法详解

`patch.ts` - 虚拟 DOM 差异对比和更新的核心

```typescript
// 核心流程
function patch(n1: VNode | null, n2: VNode) {
  if (n1 === n2) return
  
  // 步骤 1: 类型不同，完全替换
  if (n1.type !== n2.type) {
    replaceNode(n1, n2)
    return
  }
  
  // 步骤 2: 类型相同，增量更新
  // 更新 props
  patchProps(n1.el, n1.props, n2.props)
  
  // 更新 children
  patchChildren(n1, n2)
}
```

#### 列表 Diff：LIS（最长递增子序列）算法

`list-diff.ts` - 高效处理列表重新排序

```typescript
function patchKeyedChildren(c1: VNode[], c2: VNode[]) {
  // 双端对比算法 + LIS 优化
  // 时间复杂度 O(n log n)
}
```

#### Patch Flag 编译优化

编译器在编译时生成 Patch Flag，运行时根据标记快速确定需要更新的内容：

```typescript
export const enum PatchFlags {
  TEXT = 1,                  // 动态文本
  CLASS = 1 << 1,           // 动态 class
  STYLE = 1 << 2,           // 动态 style
  PROPS = 1 << 3,           // 动态 props
  NEED_PATCH = 1 << 4,      // 需要完整 patch
}
```

---

### 2.3 Renderer - 渲染器（平台适配）

#### 文件结构
```
packages/renderer/src/
├── index.ts               # 主入口
├── create-renderer.ts     # 渲染器工厂 ✨
├── mount.ts               # 挂载
├── unmount.ts             # 卸载
└── dom/                   # DOM 平台
    └── index.ts
    └── dom-renderer.ts
    └── patch-props.ts
    └── patch-events.ts
    └── dom-ops.ts
├── ssr/                   # SSR 平台
├── native/                # Native 平台
├── miniapp/               # 小程序平台
└── vapor/                 # Vapor 模式（无 VDOM）
```

#### 渲染器架构：平台无关设计

```typescript
// create-renderer.ts
export function createRenderer(options: RendererOptions) {
  return {
    render,
    hydrate,
    createApp,
    // ...
  }
}

interface RendererOptions {
  createElement,          // 由平台实现
  createText,
  insert,
  remove,
  setText,
  patchProp,
  // ...
}
```

**支持多平台的关键：**
- DOM Renderer：浏览器环境
- SSR Renderer：Node.js 环境，生成 HTML 字符串
- Vapor Renderer：编译优化，接近原生性能
- Native/MiniApp：可扩展其他平台

---

### 2.4 Component - 组件系统

#### 文件结构
```
packages/component/src/
├── index.ts               # 统一导出
├── component.ts           # 组件实例 ✨
├── lifecycle.ts           # 生命周期钩子
├── slots.ts               # 插槽
├── builtins-entry.ts      # 内置组件入口
└── builtins/              # 内置组件
    ├── transition.ts
    ├── keep-alive.ts
    ├── suspense.ts
    └── teleport.ts
```

#### 组件实例生命周期

```typescript
interface ComponentInstance {
  data: any                // 组件数据
  props: any              // 组件 props
  setupResult: any        // setup 返回值
  render: Function        // 渲染函数
  isMounted: boolean      // 是否已挂载
  vnode: VNode            // 对应的 VNode
  
  // 生命周期钩子
  mounted: Function[]
  unmounted: Function[]
  updated: Function[]
  beforeUnmount: Function[]
}
```

#### 组件挂载流程

```
createApp()
  ↓
mount(container)
  ↓
创建根组件 VNode
  ↓
patch() → 遇到组件 VNode
  ↓
mountComponent()
  ↓
创建组件实例 → setup()
  ↓
执行 render() → 子 VNode 树
  ↓
patch() 子树 → 真实 DOM
  ↓
调用 mounted 钩子 ✅
```

---

### 2.5 Compiler - 模板编译器

#### 文件结构
```
packages/compiler/src/
├── index.ts               # 统一导出
├── compile.ts             # 编译入口 ✨
├── parse.ts               # HTML 解析
├── transform.ts           # AST 转换
├── optimize.ts            # 静态优化
├── generate.ts            # 代码生成
└── sfc-entry.ts           # SFC 支持
```

#### 编译流程（三步曲）

```
模板字符串
    ↓
【1. parse()】→ AST 抽象语法树
    ↓
【2. transform()】→ 转换和优化
    ↓
【3. generate()】→ 渲染函数字符串
    ↓
new Function() → 可执行的 render 函数
```

#### 示例：编译过程

输入模板：
```html
<div @click="increment">
  <p>Count: {{ count }}</p>
</div>
```

输出代码：
```javascript
function render(h, ctx) {
  return h('div', { onClick: ctx.increment }, [
    h('p', null, ['Count: ', ctx.count])
  ])
}
```

---

### 2.6 Core - 核心整合包

#### 文件结构
```
packages/core/src/
├── index.ts               # 统一导出
├── create-app.ts          # 应用创建 ✨
├── h.ts                   # h() 函数
├── plugin.ts              # 插件系统
├── error-entry.ts         # 错误处理
├── shared-entry.ts        # 共享工具
└── web-component-entry.ts # Web Component
```

#### createApp 详解

```typescript
export function createApp(rootComponent) {
  const app = {
    _component: rootComponent,
    _container: null,
    
    mount(container) {
      // 创建 VNode
      const vnode = createVNode(rootComponent)
      // 渲染
      render(vnode, container)
      return app
    },
    
    use(plugin) {
      // 安装插件
      plugin.install(app)
      return app
    },
    
    provide(key, value) {
      // 全局依赖注入
      provides[key] = value
      return app
    },
    
    component(name, comp) {
      // 全局组件注册
      components[name] = comp
      return app
    }
  }
  
  return app
}
```

---

## <a id="第三部分"></a> 🔧 第三部分：开发和构建系统

### 3.1 脚本系统详解

#### `scripts/build-all.sh` - 核心构建脚本

构建流程：
```
【1】清理 dist 目录（可选）
  ↓
【2】按依赖顺序构建各包
  ├─ reactivity → 先构建
  ├─ vdom → 依赖 reactivity
  ├─ compiler → 无依赖
  ├─ renderer → 依赖 vdom + reactivity
  ├─ component → 依赖 reactivity
  ├─ core → 依赖 compiler + renderer + component
  ├─ router → 依赖 reactivity
  ├─ store → 依赖 reactivity
  └─ lytjs → 依赖上面所有
  ↓
【3】生成 TypeScript 类型声明（.d.ts）
  ↓
【4】输出体积报告
```

#### 关键构建脚本功能

- **打包工具**：`esbuild`（超快）
- **模块格式**：ESM + CJS 双输出
- **Tree Shaking**：自动优化，移除未使用代码
- **体积压缩**：minify + tree shaking
- **类型声明**：tsc 生成 `.d.ts`

#### 常用开发命令

```bash
# 完整构建
pnpm build

# 清理后重新构建
pnpm build --clean

# 只构建特定包
pnpm build --filter=reactivity

# 运行所有测试
pnpm test

# 只运行响应式测试
pnpm --filter=reactivity test

# 代码 lint
pnpm lint
pnpm lint:fix
```

---

### 3.2 TypeScript 配置详解

根目录 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,                  // 关键：严格类型检查
    "declaration": true,             // 生成 .d.ts
    "declarationMap": true,
    "baseUrl": ".",
    "paths": {                       // 关键：开发时直接引用源码
      "@lytjs/reactivity": ["packages/reactivity/src"],
      "@lytjs/reactivity/*": ["packages/reactivity/src/*"],
      "@lytjs/*": ["packages/*/src"],
      "@lytjs/*/*": ["packages/*/src/*"]
    }
  }
}
```

**开发技巧：**
由于 `paths` 配置，你可以：
1. 直接修改 `packages/reactivity/src/reactive.ts`
2. 运行 `tests/test-reactivity-direct.ts` 立即生效
3. 无需先构建！

---

## <a id="第四部分"></a> 🛠️ 第四部分：扩展和贡献

### 4.1 修改现有模块的标准流程

#### 场景 1：修复 reactivity 中的 Bug

```bash
# 1. 理解问题 - 找到对应测试
cat packages/reactivity/__tests__/reactive.test.ts

# 2. 修改源代码
nano packages/reactivity/src/reactive.ts

# 3. 运行测试
pnpm test

# 4. 如果通过，构建
pnpm build --filter=reactivity

# 5. 测试其他包是否受影响
pnpm test
```

#### 场景 2：添加新的响应式 API

1. 在 `packages/reactivity/src/your-api.ts` 中实现
2. 在 `packages/reactivity/src/index.ts` 中导出
3. 添加测试到 `packages/reactivity/__tests__/your-api.test.ts`
4. 运行测试确保通过
5. 构建并检查类型声明

---

### 4.2 创建新包的完整流程

以创建 `@lytjs/animation` 为例：

#### 步骤 1：创建目录结构

```bash
mkdir -p packages/animation/src
touch packages/animation/package.json
touch packages/animation/src/index.ts
touch packages/animation/__tests__/animation.test.ts
```

#### 步骤 2：编写 package.json

```json
{
  "name": "@lytjs/animation",
  "version": "4.0.1",
  "description": "Lyt.js 动画系统",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "dependencies": {
    "@lytjs/reactivity": "workspace:*"
  }
}
```

#### 步骤 3：实现核心代码

```typescript
// packages/animation/src/index.ts
import { ref, watchEffect } from '@lytjs/reactivity'

export function useAnimation(duration = 300) {
  const progress = ref(0)
  // ... 你的实现
  
  return { progress }
}
```

#### 步骤 4：在构建脚本中注册

编辑 `scripts/build-all.sh`：

```bash
# 在 ALL_PACKAGES 数组中添加
ALL_PACKAGES=(
  reactivity vdom compiler renderer component core
  router store cli devtools components
  plugin-i18n plugin-auth plugin-logger
  test-utils plugins lytjs lytx vscode-extension
  animation  # ← 添加你的包
)
```

#### 步骤 5：在 tsconfig.json 中添加路径映射

```json
{
  "paths": {
    "@lytjs/animation": ["packages/animation/src"],
    "@lytjs/animation/*": ["packages/animation/src/*"]
  }
}
```

#### 步骤 6：在 lytjs 聚合包中导出（可选）

编辑 `packages/lytjs/src/index.ts`（如果需要统一导出）

---

### 4.3 插件系统开发

#### 创建插件的标准模板

```typescript
// packages/plugin-myfeature/src/index.ts
import type { App, Plugin } from '@lytjs/core'

export interface MyFeatureOptions {
  optionA?: boolean
  optionB?: string
}

function createMyFeature(options: MyFeatureOptions = {}) {
  return {
    install(app: App) {
      // 1. 提供全局属性
      app.provide('my-feature', options)
      
      // 2. 添加全局方法
      app.config.globalProperties.$myMethod = () => {
        console.log('Hello from my plugin!')
      }
      
      // 3. 注册组件
      app.component('MyFeature', MyComponent)
      
      // 4. 添加钩子
      app.mixin({
        created() { /* ... */ }
      })
    }
  }
}

export default createMyFeature
```

---

## <a id="第五部分"></a> 🎨 第五部分：组件库开发

### 5.1 组件库结构

```
packages/components/src/
├── index.ts               # 统一导出
├── base/                  # 基础组件
│   ├── button.ts
│   ├── icon.ts
│   └── ...
├── form/                  # 表单组件
│   ├── input.ts
│   ├── checkbox.ts
│   ├── select.ts
│   └── ...
├── feedback/              # 反馈组件
│   ├── modal.ts
│   ├── toast.ts
│   └── ...
├── navigation/            # 导航组件
│   ├── tabs.ts
│   ├── pagination.ts
│   └── ...
├── data-display/          # 数据展示
│   ├── table.ts
│   └── ...
└── styles/                # 样式系统
    ├── theme.ts
    └── variables.ts
```

---

### 5.2 创建新组件的标准流程

#### 示例：创建 Avatar 组件

1. **创建组件文件**：`packages/components/src/avatar.ts`

```typescript
import { defineComponent, ref, computed } from '@lytjs/component'

export const LyAvatar = defineComponent({
  name: 'LyAvatar',
  props: {
    size: { type: String, default: 'medium' },
    shape: { type: String, default: 'circle' },
    src: String,
    alt: String
  },
  setup(props) {
    const classes = computed(() => [
      'ly-avatar',
      `ly-avatar--${props.size}`,
      `ly-avatar--${props.shape}`
    ])
    
    return () => h('span', { class: classes.value }, [
      props.src ? h('img', { src: props.src, alt: props.alt }) : props.name
    ])
  }
})
```

2. **在 index.ts 中导出**

```typescript
export { LyAvatar } from './avatar'
```

3. **添加测试**：`packages/components/__tests__/avatar.test.ts`

4. **构建测试**

---

## <a id="第六部分"></a> 🔐 第六部分：质量保障和测试

### 6.1 测试架构

```
tests/
├── test-runner.ts          # 测试运行器
├── test-all-core.ts        # 核心包集成测试
├── test-reactivity-direct.ts  # 响应式直接测试
└── test-vdom-direct.ts     # VDOM 直接测试

packages/*/__tests__/       # 各包独立单元测试
```

### 6.2 测试工具

项目使用内置的 `@lytjs/test-utils`：

```typescript
import { describe, it, expect, assert } from '@lytjs/test-utils'

describe('我的模块', () => {
  it('应该工作正常', () => {
    expect(1 + 1).toBe(2)
  })
})
```

---

## <a id="第七部分"></a> 🚀 第七部分：发布和运维

### 7.1 发布流程

```bash
# 1. 确保所有测试通过
pnpm test

# 2. 完整构建
pnpm build

# 3. 试运行发布（不实际发布）
pnpm publish:dry-run

# 4. 正式发布
pnpm publish:all
```

---

## <a id="第八部分"></a> 💡 第八部分：最佳实践和高级技巧

### 8.1 代码调试技巧

#### 调试响应式系统

```typescript
// 在 effect.ts 中添加
const trackStack: string[] = []

function track(target, key) {
  if (DEBUG) {
    console.group('📌 track')
    console.log('target:', target, 'key:', key)
    console.log('activeEffect:', activeEffect)
    console.trace('堆栈:')
    console.groupEnd()
  }
  // ...原有代码
}
```

#### 调试 VDOM Patch

```typescript
// 在 patch.ts 中添加
let patchDepth = 0

function patch(n1, n2) {
  const indent = '  '.repeat(patchDepth)
  console.log(indent + '🔧 patch', n1?.type || 'new', '→', n2.type)
  
  patchDepth++
  try {
    // ...原有代码
  } finally {
    patchDepth--
  }
}
```

---

### 8.2 性能优化技巧

#### 1. 响应式优化

```typescript
// 大型列表：用 shallowReactive 避免深层代理
const largeList = shallowReactive([
  { id: 1, text: '...' },
  // ... 1000+ 项
])

// 或者直接用 Signal，更轻量
const list = signal([...])
```

#### 2. 虚拟 DOM 优化

```typescript
// 给列表添加 key，优化 Diff
h('ul', null, items.map(item => 
  h('li', { key: item.id }, item.text)
))
```

---

### 8.3 代码审查清单

修改代码前检查：

- [ ] 是否影响其他包？（检查模块依赖）
- [ ] 是否添加了测试？（覆盖率至少 80%）
- [ ] 类型声明是否正确？（运行 `tsc --noEmit`）
- [ ] 是否破坏了现有 API？（遵循 SemVer）
- [ ] 性能是否有影响？（运行 benchmarks）
- [ ] 文档是否需要更新？

---

### 8.4 常见问题和解决方案

| 问题 | 可能原因 | 解决方法 |
|-----|---------|---------|
| 构建失败 | 依赖顺序问题 | 检查 `scripts/build-all.sh` 中的 ALL_PACKAGES 顺序 |
| 类型错误 | TypeScript 版本不匹配 | 确保用 pnpm 安装依赖，用项目的 tsc |
| 测试失败 | 测试文件编码问题 | 确保用 UTF-8，运行 `tests/test-all-core-full.ts` 检查 |
| 包体积过大 | 引入了不必要依赖 | 检查构建脚本的 external 配置，确保正确 |

---

## 🎓 学习路径建议

### 阶段 1：理解响应式系统（3-7天）
1. 阅读 `reactivity.ts`、`effect.ts`
2. 单步调试响应式系统
3. 修改一些小功能，看看效果

### 阶段 2：理解虚拟 DOM（5-10天）
1. 阅读 `vdom/src/vnode.ts`、`vdom/src/patch.ts`
2. 理解 Patch Flag 优化
3. 研究 LIS 列表 Diff 算法

### 阶段 3：理解渲染器（3-5天）
1. 阅读 `renderer/src/dom/dom-renderer.ts`
2. 理解平台适配层
3. 尝试添加一个简单的自定义渲染器

### 阶段 4：理解组件系统（3-5天）
1. 阅读 `component/src/component.ts`
2. 理解生命周期流程
3. 修改一个内置组件

### 阶段 5：全面整合和贡献（持续）
1. 参与修复 Bug
2. 添加新功能
3. 改进文档
4. 性能优化

---

## 🔗 快速跳转

### 核心包快速索引

| 功能 | 文件位置 | 优先级 |
|------|---------|--------|
| 响应式核心 | `packages/reactivity/src/reactive.ts` | ⭐⭐⭐⭐⭐ |
| 副作用系统 | `packages/reactivity/src/effect.ts` | ⭐⭐⭐⭐⭐ |
| VNode 定义 | `packages/vdom/src/vnode.ts` | ⭐⭐⭐⭐ |
| Patch 算法 | `packages/vdom/src/patch.ts` | ⭐⭐⭐⭐⭐ |
| 列表 Diff | `packages/vdom/src/list-diff.ts` | ⭐⭐⭐ |
| DOM 渲染 | `packages/renderer/src/dom/dom-renderer.ts` | ⭐⭐⭐⭐ |
| 组件系统 | `packages/component/src/component.ts` | ⭐⭐⭐⭐⭐ |
| 应用创建 | `packages/core/src/create-app.ts` | ⭐⭐⭐⭐ |
| 编译入口 | `packages/compiler/src/compile.ts` | ⭐⭐⭐ |

---

## 📚 延伸阅读

- [架构总览](./01-architecture-overview.md)
- [开发者入门](./02-getting-started.md)
- [代码规范](./03-coding-standards.md)
- [贡献指南](../../CONTRIBUTING.md)
- [项目评估](../../PROJECT_ASSESSMENT.md)

---

## 💪 现在开始！

你已经具备了从代码层面完全掌控 Lyt.js 的所有知识。记住：

> **理解框架的最好方法，是修改它！**

从一个小改动开始，逐步深入。如果遇到问题，查看测试、阅读文档、或查看 Git 历史（如果仓库已经初始化）。

祝你探索愉快！🚀

---

**文档版本**：1.0  
**最后更新**：2026-04-24  
**作者**：Lyt.js Team
