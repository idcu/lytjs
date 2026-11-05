// packages/ui/src/component-status.ts
// 组件成熟度（**单一真相源**）
//
// ## 为什么需要这个文件
//
// `@lytjs/ui` 对外说「56 个组件」，但 2026-10-30 的全维度审计实测：
// **可用 20 / 半成品 37 / 空壳 4**（详见 `evaluation/LYTJS_全维度评估报告_2026-10-30.md` §3.5）。
// 把「能用」和「能用得放心」混在同一个数字里，是在**消耗用户信任**。
//
// ## 2026-11 / D2：Golden 20 冻结
//
// owner 决策（2026-11-05，D2）：以 10-30 审计的 20 个可用组件为基线，
// 加上本周期修复到可用且已补行为用例的 Pagination / Dialog / Drawer / Modal，
// **总数固定 20**。其余组件**保留导出**，但如实标注 `experimental`，
// 不移出默认导出；`mislabeled_stable = 0` 是硬门禁。
//
// 判定证据（均在仓库内可复跑）：
// - `tests/all-components-smoke.test.ts`：61 个导出全部可渲染（不炸、无空渲染）；
// - `tests/dialog-a11y.test.ts`、`tests/e2e-dialog.test.ts`：Dialog 焦点/ESC；
// - `tests/e2e-pagination.test.ts`、`tests/pagination-controlled.test.ts`：Pagination 受控/非受控；
// - `tests/e2e-interaction-p0.test.ts`：Modal/Drawer/Dialog 的 v-model 回写与点击内容区不关闭；
// - `tests/e2e-input-number.test.ts`：InputNumber 步进与边界；
// - 10-30 审计未把其余 14 个列进 P0/P1（§3.5 U1–U6 点名清单里没有它们）。
//
// ## 分级口径
//
// - `stable`       —— 列入 Golden 20：主要路径 + 常见边界有行为级用例；可用于生产
// - `experimental` —— 保留导出但不作生产承诺：边界/交互/无障碍未系统覆盖，或审计判定空壳
//
// 没有第三级：再细分就是**编造精度**。

/** 组件成熟度（命名带 Maturity 前缀：`ComponentStatus` 已被 Select/Step 的取值类型占用） */
export type ComponentMaturity = 'stable' | 'experimental';

export interface ComponentMaturityInfo {
  status: ComponentMaturity;
  /** stable 之外的组件必须写清已知缺口 */
  note?: string;
}

/** `experimental` 的默认说明（避免几十份措辞不一） */
const EXPERIMENTAL_NOTE =
  '未列入 Golden 20：2026-10-30 审计列为半成品/未复评，边界/交互/无障碍未系统覆盖；保留导出，不作为生产承诺';

/** 审计明确判定的「空壳」（setup 内响应式原语 = 0、事件处理器 = 0） */
const SHELL_NOTE = '2026-10-30 审计判定为空壳（无响应式/无事件），保留导出仅供占位';

/**
 * **Golden 20（冻结，2026-11-05 / D2）**。
 *
 * 约束：`stable` 必须且只能来自本清单；`node scripts/check-component-status.mjs`
 * 断言 `mislabeled_stable = 0`。增删成员必须改这里 + 决策记录 + 证据。
 */
export const GOLDEN_COMPONENTS: readonly string[] = [
  // 10-30 审计「可用」基线（14）
  'Avatar',
  'Badge',
  'Button',
  'Card',
  'Checkbox',
  'Container',
  'Divider',
  'Empty',
  'Icon',
  'Link',
  'Progress',
  'Radio',
  'Spin',
  'Tag',
  // 本周期修复到可用并已补行为用例（6）
  'Dialog', // dialog-a11y / e2e-dialog
  'Drawer', // e2e-interaction-p0：v-model 回写
  'InputNumber', // e2e-input-number
  'Modal', // e2e-interaction-p0：点击内容区不关闭 / v-model 回写
  'Pagination', // e2e-pagination / pagination-controlled
  'Switch',
];

/**
 * 全部对外导出的成熟度。
 *
 * ⚠️ 新增组件必须在这里登记 —— `tests/component-status.test.ts` 会对比
 * `src/index.ts` 的实际导出面，漏登记即红。
 */
export const COMPONENT_STATUS: Record<string, ComponentMaturityInfo> = {
  // ---- Golden 20（stable） ----
  Avatar: { status: 'stable' },
  Badge: { status: 'stable' },
  Button: { status: 'stable' },
  Card: { status: 'stable' },
  Checkbox: { status: 'stable' },
  Container: { status: 'stable' },
  Dialog: { status: 'stable' },
  Divider: { status: 'stable' },
  Drawer: { status: 'stable' },
  Empty: { status: 'stable' },
  Icon: { status: 'stable' },
  InputNumber: { status: 'stable' },
  Link: { status: 'stable' },
  Modal: { status: 'stable' },
  Pagination: { status: 'stable' },
  Progress: { status: 'stable' },
  Radio: { status: 'stable' },
  Spin: { status: 'stable' },
  Switch: { status: 'stable' },
  Tag: { status: 'stable' },
  // ---- 其余导出：保留但标注 experimental ----
  Alert: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Breadcrumb: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  BreadcrumbItem: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Calendar: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Carousel: { status: 'experimental', note: SHELL_NOTE },
  CarouselItem: { status: 'experimental', note: SHELL_NOTE },
  Cascader: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  CheckboxGroup: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  ColorPicker: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  DatePicker: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Descriptions: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  DescriptionsItem: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Form: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  FormItem: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Image: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Input: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Menu: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Message: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Notification: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Popconfirm: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  RadioGroup: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Rate: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  RichTextEditor: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Select: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Slider: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Step: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Steps: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  TabPane: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Table: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Tabs: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  TimePicker: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Timeline: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  TimelineItem: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Toast: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Tooltip: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Transfer: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Transition: { status: 'experimental', note: SHELL_NOTE },
  TransitionGroup: { status: 'experimental', note: SHELL_NOTE },
  Tree: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  TreeSelect: { status: 'experimental', note: EXPERIMENTAL_NOTE },
  Upload: { status: 'experimental', note: EXPERIMENTAL_NOTE },
};

/** 取某个导出的成熟度；未登记返回 `undefined`（守卫会把它当失败） */
export function getComponentStatus(name: string): ComponentMaturityInfo | undefined {
  return COMPONENT_STATUS[name];
}

/** 是否属于「实验性」集合（保留导出，但不作生产承诺） */
export function isExperimentalComponent(name: string): boolean {
  return COMPONENT_STATUS[name]?.status === 'experimental';
}

/** 列出全部 experimental 组件名（按字母序） */
export function listExperimentalComponents(): string[] {
  return Object.keys(COMPONENT_STATUS)
    .filter((n) => COMPONENT_STATUS[n]!.status === 'experimental')
    .sort();
}
