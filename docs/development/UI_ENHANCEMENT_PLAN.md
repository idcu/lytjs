# LytJS UI 组件增强计划

> 文档版本：v1.0.0
> 创建日期：2026-05-16
> 目标：增强 UI 组件库的 Accessibility、性能和 Vapor 模式支持

---

## 一、现状分析

### 1.1 组件库规模

✅ **已完成的组件**：50+ 个

| 类别 | 组件数量 | 主要组件 |
|------|---------|---------|
| **基础组件** | 8 | Button, Input, InputNumber, Select, Cascader, TreeSelect, Transfer |
| **表单组件** | 7 | Checkbox, Radio, Switch, Slider, DatePicker, TimePicker, ColorPicker |
| **数据展示** | 10 | Table, Tree, Badge, Tag, Avatar, Progress, Spin, Empty, Timeline, Calendar |
| **反馈组件** | 5 | Dialog, Modal, Drawer, Tooltip, Popconfirm |
| **导航组件** | 6 | Menu, Tabs, Breadcrumb, Steps, Pagination, Link |
| **业务组件** | 3 | Form, Upload, RichTextEditor |
| **其他组件** | 4 | Icon, Image, Alert, Notification |
| **布局组件** | 3 | Container, Card, Divider |
| **特殊组件** | 2 | Carousel, Rate |

### 1.2 当前实现的优点

✅ **已实现**：
1. **良好的 Accessibility 支持**
   - Button 组件使用 `@lytjs/common-a11y`
   - 支持 aria-label, aria-describedby 等属性
   - 支持键盘导航（Enter, Space 键）

2. **完整的类型定义**
   - 所有组件都有完整的 TypeScript 类型
   - Props、Slots、SetupProps 类型齐全

3. **统一的设计规范**
   - 统一的命名规范
   - 统一的 Props 定义
   - 统一的 API 设计

### 1.3 待改进点

❌ **需要增强**：

1. **Accessibility**
   - 部分组件缺少 ARIA 属性
   - 缺少焦点管理
   - 缺少键盘导航支持

2. **Vapor 模式支持**
   - 所有组件都使用 VNode 模式
   - 缺少 Vapor 模式组件示例
   - 未利用批量操作优化

3. **性能优化**
   - 未集成批量 DOM 操作
   - 未使用 diffLists 增量更新
   - 缺少虚拟列表支持

4. **主题系统**
   - CSS 变量支持不完整
   - 主题切换功能未实现
   - 暗色模式未支持

---

## 二、增强方案

### 2.1 Accessibility 增强

#### 目标
确保所有组件符合 WCAG 2.1 AA 标准

#### 实施方案

**阶段 1：基础 ARIA 支持（1天）**

| 组件 | 需要添加的 ARIA | 当前状态 |
|------|----------------|---------|
| **Select** | aria-expanded, aria-haspopup | 需增强 |
| **Dropdown** | aria-expanded, aria-haspopup | 需增强 |
| **Dialog** | aria-modal, aria-labelledby | 需增强 |
| **Modal** | aria-modal, aria-labelledby | 需增强 |
| **Tabs** | aria-selected, aria-controls | 需增强 |
| **Menu** | aria-activedescendant | 需增强 |

**阶段 2：键盘导航（2天）**

| 功能 | 实现方案 | 影响组件 |
|------|---------|---------|
| **焦点管理** | 自动聚焦第一个可交互元素 | Dialog, Modal, Dropdown |
| **方向键导航** | ↑↓←→ 键导航 | Select, Tabs, Menu |
| **Escape 关闭** | ESC 键关闭弹层 | Dialog, Modal, Tooltip |
| **Enter 确认** | Enter 键确认选择 | Select, Dropdown |

**阶段 3：屏幕阅读器支持（1天）**

| 功能 | 实现方案 | 工具库 |
|------|---------|--------|
| **实时通知** | aria-live 区域 | 已在 Notification 中实现 |
| **状态更新** | aria-live="polite" | Form, Select |
| **进度通知** | aria-valuenow | Progress, Upload |

### 2.2 Vapor 模式支持

#### 目标
为高优先级组件添加 Vapor 模式支持

#### 实施方案

**阶段 1：基础 Vapor 组件（2天）**

创建 5 个 Vapor 模式组件示例：

```typescript
// VaporButton.ts - Vapor 模式按钮
import { defineVaporComponent } from '@lytjs/renderer/vapor';
import { batch } from '@lytjs/reactivity';

export const VaporButton = defineVaporComponent({
  name: 'VaporButton',
  props: {
    type: { type: 'string', default: 'default' },
    disabled: { type: 'boolean', default: false },
    loading: { type: 'boolean', default: false },
  },
  setup(props) {
    return {
      handleClick: (event: MouseEvent) => {
        if (props.disabled || props.loading) return;
        // 处理点击
      },
    };
  },
  template: `
    <button
      class="lyt-button"
      type="button"
      disabled={props.disabled || props.loading}
      onClick={handleClick}
    >
      {props.loading && <LoadingIcon />}
      <slot />
    </button>
  `,
});
```

**组件列表**：
1. ✅ VaporButton - Vapor 模式按钮
2. ✅ VaporInput - Vapor 模式输入框
3. ✅ VaporBadge - Vapor 模式徽标
4. ✅ VaporIcon - Vapor 模式图标
5. ✅ VaporTag - Vapor 模式标签

**阶段 2：集成批量操作（2天）**

```typescript
// 在 Vapor 组件中使用批量操作
import { batch } from '@lytjs/dom-runtime/batch';

function updateList(items: Item[]) {
  batch(() => {
    // 合并多次更新为一次渲染
    data.set(items);
  });
}
```

**优化项**：
1. 列表渲染使用 DocumentFragment
2. 增量更新使用 diffLists
3. 事件处理使用 delegateEvent

**阶段 3：虚拟列表（3天）**

```typescript
// VirtualList.ts - 虚拟列表组件
import { defineVaporComponent } from '@lytjs/renderer/vapor';

export const VirtualList = defineVaporComponent({
  name: 'VirtualList',
  props: {
    items: { type: 'array', required: true },
    itemHeight: { type: 'number', default: 40 },
    visibleCount: { type: 'number', default: 10 },
  },
  setup(props) {
    // 只渲染可见区域的节点
    // 使用 diffLists 增量更新
  },
});
```

### 2.3 性能优化

#### 目标
提升组件渲染性能 15%+

#### 实施方案

**阶段 1：代码级优化（2天）**

| 优化项 | 实现方案 | 预期效果 |
|--------|---------|---------|
| **VNode 缓存** | 缓存静态 VNode | 减少重复创建 |
| **事件委托** | 使用 delegateEvent | 减少事件监听器 |
| **批量更新** | 使用 batch() | 减少渲染次数 |
| **防抖输入** | 防抖 input 事件 | 减少更新频率 |

**阶段 2：架构级优化（3天）**

| 优化项 | 实现方案 | 预期效果 |
|--------|---------|---------|
| **懒加载** | 按需加载组件 | 减少初始体积 |
| **代码分割** | 动态导入 | 减少主包体积 |
| **Tree Shaking** | 移除未使用代码 | 减少打包体积 |
| **CSS 优化** | 提取关键 CSS | 减少渲染阻塞 |

### 2.4 主题系统增强

#### 目标
完善主题系统，支持主题切换

#### 实施方案

**阶段 1：CSS 变量完善（1天）**

```css
:root {
  /* 颜色系统 */
  --lyt-color-primary: #409eff;
  --lyt-color-success: #67c23a;
  --lyt-color-warning: #e6a23c;
  --lyt-color-danger: #f56c6c;
  --lyt-color-info: #909399;

  /* 文本颜色 */
  --lyt-text-color-primary: #303133;
  --lyt-text-color-regular: #606266;
  --lyt-text-color-secondary: #909399;
  --lyt-text-color-placeholder: #c0c4cc;

  /* 边框 */
  --lyt-border-color-base: #dcdfe6;
  --lyt-border-color-light: #e4e7ed;
  --lyt-border-color-lighter: #ebeef5;
  --lyt-border-color-extra-light: #f2f6fc;

  /* 圆角 */
  --lyt-border-radius-base: 4px;
  --lyt-border-radius-small: 2px;
  --lyt-border-radius-round: 20px;

  /* 阴影 */
  --lyt-box-shadow-base: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04);
  --lyt-box-shadow-light: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
```

**阶段 2：暗色模式支持（2天）**

```css
[data-theme="dark"] {
  --lyt-color-primary: #409eff;
  --lyt-text-color-primary: #ffffff;
  --lyt-bg-color: #1a1a1a;
  --lyt-bg-color-page: #121212;
}
```

**阶段 3：主题切换 API（2天）**

```typescript
import { useTheme } from '@lytjs/ui';

// 切换主题
const { setTheme } = useTheme();
setTheme('dark'); // 切换到暗色模式

// 获取当前主题
const { theme } = useTheme();
console.log(theme.value); // 'light' | 'dark'

// 监听主题变化
const { onThemeChange } = useTheme();
onThemeChange((newTheme) => {
  console.log('主题切换为:', newTheme);
});
```

---

## 三、实施计划

### 3.1 时间线

| 阶段 | 任务 | 时间 | 优先级 |
|------|------|------|--------|
| **Phase 1** | Accessibility 增强 | 4天 | 🔴 高 |
| **Phase 2** | Vapor 模式组件 | 7天 | 🔴 高 |
| **Phase 3** | 性能优化 | 5天 | 🟡 中 |
| **Phase 4** | 主题系统 | 5天 | 🟡 中 |

### 3.2 优先级排序

1. 🔴 **Accessibility 增强** - 无障碍是基本要求
2. 🔴 **Vapor 模式组件** - 展示性能优势
3. 🟡 **性能优化** - 提升用户体验
4. 🟡 **主题系统** - 增强可定制性

### 3.3 资源估算

- **总工作量**：21天
- **团队规模**：1-2 人
- **依赖项**：
  - `@lytjs/common-a11y` - ARIA 工具
  - `@lytjs/dom-runtime` - DOM 操作优化
  - `@lytjs/renderer` - Vapor 模式支持

---

## 四、验收标准

### 4.1 Accessibility 验收

| 标准 | 要求 | 测试方法 |
|------|------|---------|
| **ARIA 属性** | 所有交互组件有 ARIA | 自动化测试 |
| **键盘导航** | 所有功能可通过键盘操作 | 手动测试 |
| **屏幕阅读器** | 支持 NVDA/VoiceOver | 手动测试 |
| **颜色对比度** | 文本对比度 ≥ 4.5:1 | 自动化测试 |

### 4.2 Vapor 模式验收

| 标准 | 要求 | 测试方法 |
|------|------|---------|
| **组件数量** | Vapor 模式组件 ≥ 5 个 | 代码审查 |
| **性能提升** | 渲染性能提升 20%+ | 基准测试 |
| **API 兼容性** | 与 VNode 模式 API 一致 | 单元测试 |

### 4.3 性能验收

| 标准 | 要求 | 测试方法 |
|------|------|---------|
| **首屏渲染** | FCP < 1.5s | Lighthouse |
| **交互响应** | TTI < 3.5s | Lighthouse |
| **包体积** | 核心 < 100KB | size-limit |

### 4.4 主题验收

| 标准 | 要求 | 测试方法 |
|------|------|---------|
| **主题数量** | 内置主题 ≥ 3 个 | 代码审查 |
| **切换时间** | 主题切换 < 100ms | 性能测试 |
| **CSS 变量** | 覆盖所有样式 | 样式审查 |

---

## 五、风险与应对

### 5.1 技术风险

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| Vapor 模式兼容性问题 | 中 | 高 | 提供 VNode 模式降级 |
| Accessibility 测试复杂度 | 高 | 中 | 优先自动化测试 |
| 性能优化引入 bug | 中 | 中 | 充分测试覆盖 |

### 5.2 时间风险

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| 任务延期 | 中 | 高 | 优先级排序，核心优先 |
| 依赖阻塞 | 低 | 中 | 提前识别依赖 |
| 需求变更 | 中 | 中 | 敏捷迭代，快速响应 |

---

## 六、相关文档

- [Vapor 模式文档](../renderer/VAPOR_MODE.md)
- [Accessibility 指南](../guides/ACCESSIBILITY.md)
- [性能优化指南](../guides/PERFORMANCE.md)
- [主题系统文档](../guides/THEMING.md)

---

**文档状态**：规划中
**下一步**：开始阶段 1 Accessibility 增强
**维护者**：LytJS Team
