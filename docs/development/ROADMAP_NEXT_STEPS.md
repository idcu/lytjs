# LytJS v6.0 下一步发展规划

> 基于现状分析的大厂标准开发建议和路线图

---

## 📋 目录

- [1. 现状分析](#1-现状分析)
- [2. 核心优先事项](#2-核心优先事项)
- [3. 详细实施计划](#3-详细实施计划)
- [4. 质量保障体系](#4-质量保障体系)
- [5. 生态建设](#5-生态建设)
- [6. 里程碑](#6-里程碑)

---

## 1. 现状分析

### 1.1 项目概况

**当前版本**: v6.0.0
**架构**: 模块化 Monorepo
**核心特性**:
- ✅ 响应式系统（Proxy 基础）
- ✅ VDOM diff 算法
- ✅ 双核心模式（Signal + VDOM）
- ✅ 30+ common 工具包
- ✅ 完整的类型声明
- ✅ 测试覆盖（待完善）

### 1.2 优势分析

1. **架构设计优秀**
   - 清晰的分层设计
   - 模块化程度高
   - 职责分离明确

2. **技术选型合理**
   - TypeScript 全栈
   - pnpm monorepo
   - 现代构建工具链

3. **代码质量良好**
   - 已有 ESLint 配置
   - Prettier 格式化
   - 类型安全

### 1.3 待改进领域

| 领域 | 现状 | 优先级 |
| --- | --- | --- |
| 生态系统 | 薄弱（router/store 缺失） | 🔴 高 |
| 性能基准 | 缺少竞品对比 | 🟡 中 |
| 文档完整度 | 需完善 | 🟡 中 |
| 测试覆盖 | 核心包需提高 | 🟡 中 |
| CLI 工具 | 类型问题需修复 | 🟢 低 |
| as unknown as | ✅ 已解决（reactivity/vdom 核心模块） | 🟢 低 |

---

## 2. 核心优先事项

### 2.1 P0 - 立即修复（2周内）

#### 2.1.1 修复构建依赖问题
**状态**: ✅ 已完成（pnpm install 成功）

#### 2.1.2 修复类型声明生成
**状态**: ✅ 已完成（core/renderer dts: true）

#### 2.1.3 修复 Playground 配置
**状态**: ✅ 已完成（移除 @lytjs/shared）

#### 2.1.4 修复安全审计
**状态**: ✅ 已完成（移除 continue-on-error）

### 2.2 P1 - 短期目标（1-2个月）

#### 2.2.1 解决 "as unknown as" 问题
**状态**: ✅ 已完成

**完成内容**:
- ✅ 创建并增强 `@lytjs/common-assertions` 包（新增 11 个工具函数）
- ✅ 添加 ESLint 规则禁止新的 `as unknown as` 使用
- ✅ 替换 reactivity 模块全部 12 处类型断言
- ✅ 替换 vdom 模块关键路径 2 处类型断言
- ✅ 剩余 ~35 处为跨平台宿主元素转换（架构层面设计决策）

**提供的工具函数**:
```typescript
import {
  unsafeCast,           // 安全的类型转换
  nullishCoalesce,      // 空值合并
  safeGetProperty,      // 安全属性访问
  safeGetNested,        // 安全嵌套访问
  isFiniteNumber,       // 有限数字检查
  isNonEmptyString,     // 非空字符串检查
  isNonEmptyArray,      // 非空数组检查
  isNonEmptyObject,     // 非空对象检查
  invariant,            // 不变量断言
  warning,              // 警告提示
  asRecord             // 记录类型转换
} from '@lytjs/common-assertions';
```

**ESLint 规则**:
```javascript
'no-restricted-syntax': [
  'error',
  {
    selector: 'TSAsExpression[type.annotation.typeName.name="unknown"] > TSAsExpression',
    message: '禁止使用 "as unknown as" 双重类型断言。请使用 @lytjs/common-assertions 中的 unsafeCast<T>() 或其他更安全的类型断言方式。',
  },
]
```

#### 2.2.2 完善测试覆盖率
**状态**: 🚧 进行中（显著进展）

**已完成**:
- ✅ ref.test.ts 新增 13 个测试用例（覆盖 isShallowRef/isComputedRef/toValue 等新增功能）
- ✅ computed.test.ts 新增 8 个测试用例（cleanupCache、循环依赖检测、嵌套 computed 等）
- ✅ effect.test.ts 新增 6 个测试用例（多 effects、嵌套 effects、onError 处理等）
- ✅ reactive.test.ts 新增 10 个测试用例（深层嵌套、markRaw、null prototype 等）
- ✅ vnode.test.ts 新增 20+ 个测试用例（边界情况、mergeProps 高级用例等）
- ✅ diff.test.ts 新增 25+ 个测试用例（PatchFlags、Fragment、Text 节点等）
- ✅ codegen.test.ts 新增 20+ 个测试用例（指令、动态参数、特殊元素等）
- ✅ optimize.test.ts 新增 10+ 个测试用例（静态标记、hoist、patch flags 等）
- ✅ composition.test.ts 新增 15+ 个测试用例（useSlots/useAttrs/useModel 增强）
- ✅ h.test.ts 新增 30+ 个测试用例（props 边界、复杂 props、嵌套 VNode、特殊元素等）
- ✅ config.test.ts 新增 35+ 个测试用例（边界情况、watch/merge/setMultiple 高级用例）
- ✅ plugin.test.ts 新增 30+ 个测试用例（链式调用、重复检测、async plugin 等）
- ✅ web-component.test.ts 新增 25+ 个测试用例（生命周期、shadow DOM、样式注入等）
- ✅ 增强 @lytjs/common-assertions 包的类型安全工具
- ✅ 总计新增 248+ 个测试用例

**目标**:
- reactivity: 90%+ (🚧 进行中，已有显著提升)
- vdom: 85%+ (🚧 进行中，vnode/diff 测试已增强)
- compiler: 80%+ (🚧 进行中，codegen/optimize 测试已增强)
- core: 80%+ (🚧 进行中，composition/h/config/plugin/web-component 测试已增强)

**策略**:
```typescript
// 1. 添加单元测试
describe('feature', () => {
  it('should work', () => {
    // 测试代码
  });

  it('should handle edge cases', () => {
    // 边界条件测试
  });
});

// 2. 添加性能基准测试
import { bench, group, run } from 'mitata';

group('reactivity', () => {
  bench('ref.set', () => { /* ... */ });
});

// 3. 添加集成测试
test('full app', async ({ page }) => {
  // E2E 测试
});
```

#### 2.2.3 集成 common-transition-engine
**状态**: ✅ 已完成

**完成内容**:
- ✅ 在 `@lytjs/vdom/package.json` 中添加 `@lytjs/common-transition-engine` 依赖
- ✅ 重构 `@lytjs/vdom/transition` 使用 `TransitionEngine` 作为底层引擎
- ✅ 保持 API 完全兼容（host 分支委托给引擎，DOM 回退分支保持不变）
- ✅ 实现 TransitionEngine 实例缓存（按 host 实例 WeakMap 缓存）

**技术实现**:
```typescript
// vdom/transition.ts 现在使用 TransitionEngine
import { TransitionEngine } from '@lytjs/common-transition-engine';

const engineCache = new WeakMap<RendererHost<any, any>, TransitionEngine<any, any>>();

function getOrCreateEngine<HN extends object, HE extends HN>(
  host: RendererHost<HN, HE>,
): TransitionEngine<HN, HE> {
  let engine = engineCache.get(host);
  if (!engine) {
    engine = new TransitionEngine<HN, HE>(host);
    engineCache.set(host, engine);
  }
  return engine as TransitionEngine<HN, HE>;
}

// performEnterTransition / performLeaveTransition 的 host 分支
// 现在委托给 TransitionEngine 执行
const engine = getOrCreateEngine(host);
engine.performEnter(el, props, doneFn);
```

**优势**:
1. 统一过渡动画系统 - 所有平台共享同一套过渡逻辑
2. FLIP 动画支持 - TransitionEngine 提供完整的 FLIP 动画能力
3. 代码复用 - 减少 vdom 中的重复代码
4. 易于维护 - 过渡逻辑集中在 common-transition-engine

### 2.3 P2 - 中期目标（3-6个月）

#### 2.3.1 完善生态系统

**1. Router - 路由系统**
```typescript
// 设计理念: Vue Router 风格，简化 API
import { createRouter, createWebHistory } from '@lytjs/router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ]
});
```

**优先级**: 🔴 高

**2. Store - 状态管理**
```typescript
// 设计理念: Pinia 风格，简化 API
import { defineStore } from '@lytjs/store';

const useUserStore = defineStore('user', {
  state: () => ({
    name: '张三',
    age: 25
  }),
  getters: {
    doubleAge: (state) => state.age * 2
  },
  actions: {
    increment() {
      this.age++;
    }
  }
});
```

**优先级**: 🔴 高

**3. UI 组件库基础**
```typescript
// 设计理念: 提供核心组件，保持轻量
// Button, Input, Dialog 等基础组件
// 可扩展的主题系统
import { Button, Input, Dialog } from '@lytjs/ui';
```

**优先级**: 🟡 中

#### 2.3.2 性能优化与基准

**建立性能基准测试套件**:
```typescript
// 与 Vue, React, Svelte 等对比
// 测试指标:
// - 首次渲染时间
// - 更新性能
// - 内存占用
// - 包体积
```

**优化方向**:
1. VDOM diff 算法进一步优化
2. Signal 模式性能调优
3. Tree Shaking 优化
4. 编译时优化增强

### 2.4 P3 - 长期目标（6-12个月）

#### 2.4.1 DevTools 完善
**功能清单**:
- 组件树检查
- 状态时间旅行
- 性能分析
- 信号依赖可视化
- 事件日志

#### 2.4.2 SSR/SSG 增强
- 流式服务端渲染
- 组件级水合
- 静态站点生成
- 服务端组件

#### 2.4.3 跨平台渲染
- 小程序平台
- 桌面应用（Electron/Tauri）
- 移动端（React Native 风格）

---

## 3. 详细实施计划

### 3.1 阶段一：核心稳定（v6.1）

**时间**: 4周

**目标**: 核心稳定，可用于生产

**任务清单**:
- [x] 修复所有 P0 问题
- [x] 解决关键的 `as unknown as`（reactivity/vdom 核心模块）
- [x] 集成 common-transition-engine（vdom transition 已重构）
- [ ] 测试覆盖率达标（🚧 reactivity/vdom/compiler/core 核心模块测试显著增强，新增 248+ 个用例）
- [ ] 完善核心包文档
- [ ] 性能基准测试建立
- [ ] 修复 CLI 工具类型问题

**交付物**:
- ✅ 稳定的 v6.1 版本
- ✅ 完整的基准测试报告
- ✅ API 文档 100% 覆盖

### 3.2 阶段二：生态起步（v6.2）

**时间**: 8周

**目标**: 基础生态就位

**任务清单**:
- [ ] Router 包 v1.0
- [ ] Store 包 v1.0
- [ ] UI 基础组件
- [ ] 集成示例项目
- [ ] 开发者工具预览版

**交付物**:
- ✅ @lytjs/router v1.0
- ✅ @lytjs/store v1.0
- ✅ @lytjs/ui v0.1
- ✅ 示例项目集合

### 3.3 阶段三：生态完善（v6.3）

**时间**: 8周

**目标**: 生产级生态系统

**任务清单**:
- [ ] DevTools 正式版
- [ ] SSR/SSG 完善
- [ ] 插件系统
- [ ] 模板 CLI 增强
- [ ] 性能优化

**交付物**:
- ✅ @lytjs/devtools v1.0
- ✅ @lytjs/ssr v1.0
- ✅ 完整插件生态
- ✅ 性能优化报告

---

## 4. 质量保障体系

### 4.1 代码质量标准

#### 4.1.1 准入标准

```
任何 PR 合并前必须满足:
✅ CI 通过（测试 + lint + type-check）
✅ 代码审查通过
✅ 有对应的测试（新功能）
✅ 文档更新（API 变更）
✅ 无 `as unknown as`（除非豁免）
✅ 性能无明显回归
```

#### 4.1.2 测试金字塔

```
        /\
       /E2E\         < 5% (关键路径)
      /------\
     /集成测试\   < 15% (包间交互)
    /---------\
   /  单元测试  \  > 80% (核心逻辑)
  /-------------\
```

### 4.2 发布流程

#### 4.2.1 版本管理

使用 Semantic Versioning:
- `v6.0.x` - Bug 修复
- `v6.x.0` - 新功能（向后兼容）
- `v7.0.0` - 重大变更

#### 4.2.2 发布检查清单

```
发布前检查:
[ ] 所有测试通过
[ ] 构建成功
[ ] 类型声明完整
[ ] CHANGELOG 更新
[ ] 基准测试对比
[ ] 文档同步
[ ] 升级指南（如需要）
```

---

## 5. 生态建设

### 5.1 官方包路线图

| 包名 | 版本 | 状态 | 优先级 |
| --- | --- | --- | --- |
| @lytjs/router | 1.0 | 规划中 | 🔴 高 |
| @lytjs/store | 1.0 | 规划中 | 🔴 高 |
| @lytjs/ui | 1.0 | 规划中 | 🟡 中 |
| @lytjs/devtools | 1.0 | 规划中 | 🟡 中 |
| @lytjs/ssr | 1.0 | 规划中 | 🟡 中 |
| @lytjs/test-utils | 1.0 | ✅ 已有 | 🟢 低 |
| @lytjs/cli | 1.0 | 需修复 | 🟢 低 |

### 5.2 社区参与

#### 5.2.1 贡献者路径

```
1. 新手任务
   - 文档改进
   - 错误修复
   - 测试增加

2. 进阶任务
   - 小功能实现
   - 性能优化
   - 插件开发

3. 核心贡献
   - 架构决策
   - 核心功能
   - 发布管理
```

#### 5.2.2 社区资源

- Discord/Slack 社区
- 贡献者指南
- 好的 first issue 标签
- 定期办公时间

---

## 6. 里程碑

### 6.1 里程碑一：v6.1 稳定版（4周）

**日期**: 2026-06-12

**目标**: 生产就绪的核心框架

**验收标准**:
- [x] 所有 P0 问题解决
- [x] P1-2.2.1 解决 "as unknown as" 问题（核心模块）
- [x] P1-2.2.3 集成 common-transition-engine
- [ ] 测试覆盖率达标（🚧 reactivity/vdom/compiler/core 核心模块测试显著增强，新增 248+ 个用例）
- [ ] 核心性能基准建立
- [ ] 文档完整

### 6.2 里程碑二：v6.2 生态版（12周）

**日期**: 2026-08-12

**目标**: 基础生态就位

**验收标准**:
- [ ] Router v1.0 发布
- [ ] Store v1.0 发布
- [ ] UI 组件库预览
- [ ] 示例项目完善

### 6.3 里程碑三：v6.3 完善版（20周）

**日期**: 2026-10-12

**目标**: 完整的开发生态

**验收标准**:
- [ ] DevTools 正式版
- [ ] SSR 完善
- [ ] 插件生态
- [ ] 性能优化完成

### 6.4 里程碑四：v7.0（52周）

**日期**: 2027-05-12

**目标**: 下一代框架

**验收标准**:
- [ ] 性能重大提升
- [ ] 完整生态系统
- [ ] 大型生产应用验证
- [ ] 社区活跃度达标

---

## 7. 资源需求

### 7.1 人力资源

**短期（4周）**:
- 1-2 核心开发者

**中期（12周）**:
- 2-3 核心开发者
- 1 文档/示例维护者

**长期（52周）**:
- 3-5 核心开发者
- 1 DevTools 专家
- 1 文档工程师
- 社区经理（兼职）

### 7.2 基础设施

- CI/CD 服务器
- 性能测试环境
- 文档托管
- 包发布管道

---

## 8. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
| --- | --- | --- | --- |
| 核心成员流失 | 🟡 中 | 🔴 高 | 知识文档化、代码审查 |
| 性能不及预期 | 🟢 低 | 🟡 中 | 早期基准测试、持续优化 |
| 生态发展缓慢 | 🟡 中 | 🟡 中 | 官方示例、社区激励 |
| 竞品竞争 | 🟡 中 | 🟡 中 | 差异化定位、特色功能 |

---

## 总结

LytJS v6.0 有优秀的架构基础，下一步重点是:

1. ✅ **稳定核心** - 解决技术债务，提高质量（P0 问题已修复，as unknown as 已解决，transition-engine 已集成）
2. 🚧 **建立生态** - Router, Store, UI 组件
3. 🚧 **完善测试** - 测试覆盖率提升（reactivity/vdom/compiler/core 核心模块显著增强，新增 248+ 个用例）
4. 📝 **完善文档** - 中文文档，使用指南
5. 🔧 **性能优化** - 建立基准，持续优化
6. 🌱 **社区建设** - 吸引贡献者，扩大影响力

通过有计划的分阶段实施，LytJS 有潜力成为一流的前端框架！

---

**文档版本**: v1.0
**最后更新**: 2026-05-12
**维护者**: LytJS Team
