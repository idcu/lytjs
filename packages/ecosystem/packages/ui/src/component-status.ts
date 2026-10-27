// packages/ui/src/component-status.ts
// 组件成熟度（**单一真相源**）
//
// ## 为什么需要这个文件
//
// `@lytjs/ui` 对外说「56 个组件」，但 2026-10-26 的全维度审计实测：
// 其中 **24 个是半成品** —— 主要路径能渲染，边界条件、交互闭环、键盘可达性
// 普遍没有系统覆盖（详见 `evaluation/LYTJS_全维度评估报告_2026-10-26.md` §2.7）。
//
// 把「能用」和「能用得放心」混在一个「56 组件」的数字里，是在**消耗用户信任**：
// 用户按文档抄一个 `<Table />`，跑起来发现排序点了没反应，问题不在他。
//
// ## 这个文件做什么
//
// ① 给每个对外导出一个**明确的成熟度**，IDE 悬停即可看到；
// ② 由 `tests/component-status.test.ts` 守卫：新增导出必须登记，且
//    `beta` 组件的源文件头必须有对应的 `@beta` 标签 —— 两边不许漂移。
//
// ## 分级口径（刻意只有两级）
//
// - `stable`  —— 主要路径 + 常见边界有行为级用例；可以放心用于生产
// - `beta`    —— 主要路径可用；**边界/交互/无障碍未系统覆盖**，升级前请自测
//
// 没有 `experimental`：审计只给了「是不是半成品」这一个判断，
// 再细分就是**编造精度**。等有人真的逐个验证过再引入。

/** 组件成熟度（命名带 Maturity 前缀：`ComponentStatus` 已被 Select/Step 的取值类型占用） */
export type ComponentMaturity = 'stable' | 'beta';

export interface ComponentMaturityInfo {
  status: ComponentMaturity;
  /** 为什么是 beta / 已知缺口（stable 不需要） */
  note?: string;
}

/** 审计口径的 `beta` 说明（24 个组件共用，避免 24 份措辞不一） */
const BETA_NOTE = '2026-10-26 审计列为半成品：主要路径可用，边界/交互/无障碍未系统覆盖';

/**
 * 全部对外导出的成熟度。
 *
 * ⚠️ 新增组件必须在这里登记 —— `tests/component-status.test.ts` 会对比
 * `src/index.ts` 的实际导出面，漏登记即红。
 */
export const COMPONENT_STATUS: Record<string, ComponentMaturityInfo> = {
  Alert: { status: 'beta', note: BETA_NOTE },
  Avatar: { status: 'stable' },
  Badge: { status: 'stable' },
  Breadcrumb: { status: 'stable' },
  BreadcrumbItem: { status: 'stable' },
  Button: { status: 'stable' },
  Calendar: { status: 'beta', note: BETA_NOTE },
  Card: { status: 'stable' },
  Carousel: { status: 'stable' },
  CarouselItem: { status: 'stable' },
  Cascader: { status: 'beta', note: BETA_NOTE },
  Checkbox: { status: 'stable' },
  CheckboxGroup: { status: 'beta', note: BETA_NOTE },
  ColorPicker: { status: 'beta', note: BETA_NOTE },
  Container: { status: 'stable' },
  DatePicker: { status: 'beta', note: BETA_NOTE },
  Descriptions: { status: 'stable' },
  DescriptionsItem: { status: 'stable' },
  Dialog: { status: 'beta', note: BETA_NOTE },
  Divider: { status: 'stable' },
  Drawer: { status: 'beta', note: BETA_NOTE },
  Empty: { status: 'stable' },
  Form: { status: 'beta', note: BETA_NOTE },
  FormItem: { status: 'stable' },
  Icon: { status: 'stable' },
  Image: { status: 'stable' },
  Input: { status: 'beta', note: BETA_NOTE },
  InputNumber: { status: 'stable' },
  Link: { status: 'stable' },
  Menu: { status: 'beta', note: BETA_NOTE },
  Message: { status: 'stable' },
  Modal: { status: 'beta', note: BETA_NOTE },
  Notification: { status: 'stable' },
  Pagination: { status: 'beta', note: BETA_NOTE },
  Popconfirm: { status: 'beta', note: BETA_NOTE },
  Progress: { status: 'stable' },
  Radio: { status: 'stable' },
  RadioGroup: { status: 'beta', note: BETA_NOTE },
  Rate: { status: 'beta', note: BETA_NOTE },
  RichTextEditor: { status: 'beta', note: BETA_NOTE },
  Select: { status: 'beta', note: BETA_NOTE },
  Slider: { status: 'beta', note: BETA_NOTE },
  Spin: { status: 'stable' },
  Step: { status: 'stable' },
  Steps: { status: 'stable' },
  Switch: { status: 'stable' },
  TabPane: { status: 'stable' },
  Table: { status: 'beta', note: BETA_NOTE },
  Tabs: { status: 'stable' },
  Tag: { status: 'stable' },
  TimePicker: { status: 'beta', note: BETA_NOTE },
  Timeline: { status: 'stable' },
  TimelineItem: { status: 'stable' },
  Toast: { status: 'stable' },
  Tooltip: { status: 'stable' },
  Transfer: { status: 'stable' },
  Transition: { status: 'stable' },
  TransitionGroup: { status: 'stable' },
  Tree: { status: 'beta', note: BETA_NOTE },
  TreeSelect: { status: 'beta', note: BETA_NOTE },
  Upload: { status: 'beta', note: BETA_NOTE },
};

/** 取某个导出的成熟度；未登记返回 `undefined`（守卫会把它当失败） */
export function getComponentStatus(name: string): ComponentMaturityInfo | undefined {
  return COMPONENT_STATUS[name];
}

/** 是否属于「半成品」集合 */
export function isBetaComponent(name: string): boolean {
  return COMPONENT_STATUS[name]?.status === 'beta';
}

/** 列出全部 beta 组件名（按字母序） */
export function listBetaComponents(): string[] {
  return Object.keys(COMPONENT_STATUS)
    .filter((n) => COMPONENT_STATUS[n]!.status === 'beta')
    .sort();
}
