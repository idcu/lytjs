# 贡献指南

感谢你对 Lyt.js 的关注！本文档将帮助你快速参与项目开发。

## 欢迎贡献者

无论你是资深开发者还是初次参与开源项目，我们都欢迎你的贡献！这里有各种适合不同技能水平的任务：

- **文档贡献**：修复拼写错误、改进文档描述、添加示例
- **代码贡献**：修复 Bug、添加新功能、优化性能
- **测试贡献**：添加单元测试、改进测试覆盖率
- **问题解答**：帮助其他用户、参与讨论

## 开发环境搭建

### 前置要求

- **Node.js** >= 18
- **pnpm** >= 9（推荐使用 pnpm 作为包管理器）
- **Git**（用于版本控制）

### 快速开始

```bash
# 1. 克隆仓库
git clone https://gitee.com/lytjs/lytjs.git
cd lytjs

# 2. 安装依赖
pnpm install

# 3. 构建项目
pnpm build

# 4. 运行测试确保一切正常
pnpm test
```

### 项目结构

```
lytjs/
├── packages/           # 所有子包（核心代码）
│   ├── reactivity/     # 响应式系统（最底层模块）
│   ├── compiler/       # 模板编译器
│   ├── renderer/       # 渲染器
│   ├── component/      # 组件系统
│   ├── core/           # 核心入口
│   ├── router/         # 路由
│   ├── store/          # 状态管理
│   ├── cli/            # 命令行工具
│   ├── devtools/       # 开发者工具
│   ├── components/     # UI 组件库
│   └── agg/            # 聚合包
├── benchmarks/         # 性能基准测试
├── docs/               # 综合文档（VitePress）
│   ├── guide/          # 用户指南
│   ├── api/            # API 文档
│   ├── examples/       # 示例代码
│   └── developer/      # 开发者文档
├── examples/           # 示例项目
└── .github/           # GitHub 相关配置
```

### 常用命令

```bash
# 构建所有包
pnpm build

# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm --filter @lytjs/reactivity test

# 开发模式（watch 模式）
pnpm dev

# 开发文档预览
cd docs
pnpm dev

# 代码格式化
pnpm format

# 代码 lint 检查
pnpm lint
```

## 如何开始贡献

### 新手友好的任务

如果你是第一次贡献，可以尝试以下任务：

1. **修复文档中的拼写错误或不清晰的描述**
2. **添加代码注释，提高可读性**
3. **补充测试用例，提高覆盖率**
4. **修复简单的 Bug（查看 Issue 中标有 `good first issue` 的任务）**

### 贡献流程

1. **选择任务**：查看 Issue 列表或创建新的 Issue 讨论
2. **创建分支**：从 `main` 分支创建新的功能分支
3. **开发代码**：按照代码规范进行开发
4. **测试**：确保所有测试通过
5. **提交 PR**：提交 Pull Request
6. **代码审查**：等待维护者审查并提供反馈

## 代码规范

### TypeScript

- 所有代码使用 TypeScript 编写，目标为 ES2020+
- 使用严格模式（`strict: true`）
- 导出类型使用 `export type` 语法
- 接口优先于类型别名（描述对象结构时）

### 命名规范

- **文件名**：kebab-case（如 `html-parser.ts`、`create-app.ts`）
- **函数/方法**：camelCase（如 `createApp`、`parseHTML`）
- **类/枚举/类型**：PascalCase（如 `ReactiveEffect`、`ShapeFlags`）
- **常量**：UPPER_SNAKE_CASE（如 `ITERATE_KEY`）
- **私有成员**：以下划线开头（如 `_value`、`_dirty`）

### 代码风格

- 缩进使用 2 空格
- 字符串使用单引号
- 语句末尾不加分号
- 使用 `===` 严格等于
- 注释使用 JSDoc 格式

### 注释规范

每个模块和公共 API 都应包含 JSDoc 注释：

```typescript
/**
 * 创建深层响应式代理
 *
 * @param target - 要代理的目标对象（必须是对象类型）
 * @param options - 配置选项
 * @returns 响应式代理对象
 *
 * @example
 * ```ts
 * const state = reactive({ count: 0 })
 * ```
 */
export function reactive<T extends object>(target: T): T { ... }
```

### 设计原则

- **纯原生**：零运行时第三方依赖，所有能力用原生 JS 实现
- **零耦合**：各包可独立运行，不互相依赖
- **最小化**：每个包只实现核心功能，保持轻量

## 提交规范

项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交格式

```
<type>(<scope>): <subject>

<body>
```

### type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（不新增功能、不修复 Bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链相关 |
| `ci` | CI/CD 相关 |

### scope 范围

使用包名作为 scope：`reactivity`、`compiler`、`renderer`、`component`、`router`、`store`、`core`、`cli`、`devtools`。

### 示例

```
feat(reactivity): add watchEffect API
fix(renderer): correct patch order for keyed children
docs(readme): update installation guide
chore: update dependencies
```

## PR 流程

1. **Fork** 项目并创建功能分支
2. **开发** 并确保所有测试通过
3. **提交** 遵循 Conventional Commits 规范
4. **推送** 到你的 Fork 仓库
5. **创建 Pull Request**，描述变更内容和动机

### PR 要求

- 标题遵循 Conventional Commits 格式
- 描述清晰说明变更内容和原因
- 所有现有测试通过
- 新功能需附带对应测试
- 公共 API 变更需更新对应文档

## 测试要求

- 单元测试文件放在各包的 `__tests__/` 目录下
- 测试文件命名为 `*.test.ts`
- 使用项目内置的测试运行器
- 确保测试覆盖核心逻辑和边界情况

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm --filter @lytjs/reactivity test
```

## 问题反馈

如果发现 Bug 或有功能建议，请通过 Gitee Issues 提交。提交 Issue 时请包含：

- 问题描述
- 复现步骤
- 期望行为
- 实际行为
- 运行环境（浏览器/Node.js 版本）

## Composition API 贡献指南

Lyt.js 引入了 Composition API，在贡献相关代码时请遵循以下规范。

### setup() 函数规范

- `setup()` 函数应作为组件逻辑的主要组织方式
- 返回的对象仅包含模板中需要使用的响应式数据和方法
- 副作用（网络请求、事件监听等）应放在对应的生命周期钩子中

```typescript
import { defineComponent, ref, onMounted, onUnmounted } from '@lytjs/component'
import { reactive } from '@lytjs/reactivity'

export default defineComponent({
  setup() {
    const count = ref(0)
    const state = reactive({ loading: false, data: null as any })

    const fetchData = async () => {
      state.loading = true
      try {
        state.data = await fetch('/api/data').then(r => r.json())
      } finally {
        state.loading = false
      }
    }

    onMounted(() => {
      fetchData()
    })

    return { count, state, fetchData }
  }
})
```

### Composable 函数规范

- 可复用的逻辑应抽取为 composable 函数，以 `use` 前缀命名
- composable 函数应放在独立的文件中，文件名与函数名对应
- 始终在 composable 中清理副作用（在 `onUnmounted` 中移除监听器等）

```typescript
// use-counter.ts
import { ref, onMounted, onUnmounted } from '@lytjs/component'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const increment = () => count.value++
  const decrement = () => count.value--

  return { count, increment, decrement }
}
```

### 代码风格补充

- 优先使用 `ref` 和 `reactive`，避免混用
- 从 `@lytjs/reactivity` 导入响应式原语，从 `@lytjs/component` 导入生命周期钩子
- `computed` 用于派生状态，避免在 `watch` 中手动同步
- `watchEffect` 用于自动追踪依赖的副作用，`watch` 用于需要访问旧值的场景

## SFC 组件贡献指南

### 文件结构

SFC（单文件组件）使用 `.lyt` 扩展名，包含 `<template>`、`<script>`、`<style>` 三个顶层块。

```html
<template>
  <div class="example">
    <slot></slot>
  </div>
</template>

<script>
import { defineComponent, ref } from '@lytjs/component'

export default defineComponent({
  props: {
    title: { type: String, default: '' }
  },
  setup(props) {
    const isVisible = ref(true)
    return { isVisible }
  }
})
</script>

<style scoped>
.example {
  padding: 16px;
}
</style>
```

### 编写规范

- `<template>` 块必须包含唯一根元素（Fragment 支持除外）
- `<script>` 块使用 ES Module 导出，默认导出为组件定义
- `<style scoped>` 用于组件级样式隔离，避免样式污染
- 模板中避免复杂表达式，应使用 `computed` 或方法替代
- Props 定义使用对象语法，包含 `type`、`default`、`required` 等字段

## 插件开发指南

Lyt.js 支持通过插件系统扩展框架能力。开发插件时请遵循以下规范。

### 插件基本结构

```typescript
import type { App, Plugin } from '@lytjs/core'

interface MyPluginOptions {
  debug?: boolean
}

const MyPlugin: Plugin = {
  install(app: App, options: MyPluginOptions = {}) {
    // 1. 提供全局属性或方法
    app.provide('myPluginOptions', options)

    // 2. 添加全局组件
    app.component('MyComponent', MyComponent)

    // 3. 添加全局指令或混入（如需要）
  }
}

export default MyPlugin
```

### 插件开发规范

- 插件必须实现 `install(app, options)` 方法
- 插件选项使用接口定义，提供合理的默认值
- 插件不应有强依赖，应通过 `app.provide` / `app.inject` 与应用通信
- 插件应提供 `uninstall` 能力，支持从应用中移除
- 插件包名遵循 `@lytjs/plugin-xxx` 命名规范
- 插件应包含完整的 TypeScript 类型定义
- 插件应附带单元测试和集成测试

### 现有插件参考

- `@lytjs/plugin-i18n`：国际化插件，支持多语言切换
- `@lytjs/plugin-auth`：认证插件，支持路由守卫和角色权限
- `@lytjs/plugin-logger`：日志插件，支持分级日志输出

## PR 模板

提交 Pull Request 时，请使用以下模板填写 PR 描述：

```markdown
## 变更类型
<!-- 勾选适用的类型 -->
- [ ] feat（新功能）
- [ ] fix（Bug 修复）
- [ ] docs（文档更新）
- [ ] refactor（代码重构）
- [ ] perf（性能优化）
- [ ] test（测试相关）
- [ ] chore（构建/工具链）

## 变更描述
<!-- 简要描述本次变更的内容 -->

## 动机
<!-- 为什么需要这个变更？解决了什么问题？ -->

## 关联 Issue
<!-- 关联的 Issue 编号，如 #123 -->

## 变更详情
<!-- 详细描述技术实现 -->

## 测试
- [ ] 已添加单元测试
- [ ] 已添加集成测试
- [ ] 所有现有测试通过
- [ ] 已在示例中手动验证

## 破坏性变更
- [ ] 无破坏性变更
- [ ] 有破坏性变更（请描述迁移方案）

## 检查清单
- [ ] 遵循代码规范
- [ ] 遵循提交规范
- [ ] 公共 API 已更新文档
- [ ] TypeScript 类型定义已更新
```

## 社区指南

### 获取帮助

- **Issue 讨论**：在 Gitee Issues 中讨论问题
- **文档**：查看 `docs/` 目录下的文档
- **贡献者指南**：查看本文档

### 行为准则

本项目欢迎所有人参与，请遵循以下原则：
- 尊重他人，友善沟通
- 接受建设性批评
- 关注项目目标是改进软件
- 展现同理心

## 感谢贡献

每一份贡献都是有价值的，无论大小！感谢你对 Lyt.js 社区的参与！
