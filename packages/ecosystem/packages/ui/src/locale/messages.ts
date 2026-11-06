/**
 * @lytjs/ui - Golden 20 文案表（i18n 单一真相源）
 *
 * ## 为什么是「表」而不是散落在组件里的字符串
 *
 * B05 之前，Golden 20 面向用户的文案**全部硬编码在组件里**（含 17 条 aria-label）。
 * 硬编码的两个直接后果：
 *   1. 无法切换语言 —— 一套二进制只能有一种界面语言；
 *   2. 同一句话在多处重复（「取消 / 确定」Dialog 与 Modal 各一份）⇒ 改一处漏一处。
 *
 * 现在所有文案集中到本文件，组件只允许通过 `t(key, params)` 取值。
 * `scripts/check-ui-i18n.ts` 会扫描 Golden 20 源码，发现新的硬编码即红。
 *
 * ## 缺键策略（明确，不静默）
 *
 * `t()` 的查找顺序：当前 locale → `FALLBACK_LOCALE`（zh-CN）→ **抛出错误**。
 * 任何情况下都**不会返回空串**：空串会让界面「静默少一句话」，比报错更难发现。
 *
 * ## 参数占位
 *
 * 文案里的 `{name}` 由 `t()` 第二参数替换。缺少参数同样抛错，不做「保留花括号」的
 * 静默降级。中英文占位符集合必须一致（门禁检查）。
 */

/** 内置 locale。新增语言时在这里扩展，并在 `UI_LOCALE_MESSAGES` 补全同键文案。 */
export type UiLocaleName = 'zh-CN' | 'en-US';

/** 缺当前 locale 时回退到这里；它同时也是默认 locale。 */
export const FALLBACK_LOCALE: UiLocaleName = 'zh-CN';

export interface UiLocaleMessages {
  /** 对话框右上角关闭按钮的 aria-label。Modal 复用（它同样是 dialog 语义）。 */
  'dialog.close': string;
  /** 内置 footer 的取消按钮。 */
  'dialog.cancel': string;
  /** 内置 footer 的确定按钮。 */
  'dialog.confirm': string;
  /** 抽屉右上角关闭按钮的 aria-label。 */
  'drawer.close': string;
  /** Empty 无 `description` 时的可见文案。 */
  'empty.description': string;
  /** Empty 自带图片的 alt（用户传 `image` 时）。 */
  'empty.imageAlt': string;
  /** InputNumber 减号按钮 aria-label。 */
  'inputNumber.decrease': string;
  /** InputNumber 加号按钮 aria-label。 */
  'inputNumber.increase': string;
  /** 分页器根节点 aria-label。 */
  'pagination.label': string;
  /** 总数文案，`{total}` 为总条数。 */
  'pagination.total': string;
  /** 页码按钮 aria-label，`{page}` 为页码。 */
  'pagination.page': string;
  /** 上一页按钮（可见文案与 aria-label 共用）。 */
  'pagination.prev': string;
  /** 下一页按钮（可见文案与 aria-label 共用）。 */
  'pagination.next': string;
  /** 每页条数下拉的 aria-label。 */
  'pagination.pageSize': string;
  /** 每页条数选项文案，`{size}` 为条数。 */
  'pagination.pageSizeOption': string;
  /** 跳页输入框 aria-label。 */
  'pagination.jumpTo': string;
  /** 跳页输入框前的可见文案。 */
  'pagination.jump': string;
  /** 跳页输入框后的单位文案。 */
  'pagination.pageUnit': string;
  /** Progress 无 `ariaLabel` 时的 aria-label。 */
  'progress.label': string;
  /** Tag 关闭按钮 aria-label。 */
  'tag.close': string;
}

/**
 * 简体中文：**逐字保留** B05 之前的可见文案，确保迁移零行为回归。
 * （此前遗留的英文 aria-label —— Close dialog / Cancel / Confirm / Progress —
 *   属于未翻译，本次按中文补齐；测试同步更新。）
 */
export const zhCN: UiLocaleMessages = {
  'dialog.close': '关闭对话框',
  'dialog.cancel': '取消',
  'dialog.confirm': '确定',
  'drawer.close': '关闭抽屉',
  'empty.description': '暂无数据',
  'empty.imageAlt': '空状态',
  'inputNumber.decrease': '减少',
  'inputNumber.increase': '增加',
  'pagination.label': '分页',
  'pagination.total': '共 {total} 条',
  'pagination.page': '第{page}页',
  'pagination.prev': '上一页',
  'pagination.next': '下一页',
  'pagination.pageSize': '每页条数',
  'pagination.pageSizeOption': '{size} 条/页',
  'pagination.jumpTo': '跳转到第几页',
  'pagination.jump': '跳至',
  'pagination.pageUnit': '页',
  'progress.label': '进度条',
  'tag.close': '关闭标签',
};

export const enUS: UiLocaleMessages = {
  'dialog.close': 'Close dialog',
  'dialog.cancel': 'Cancel',
  'dialog.confirm': 'Confirm',
  'drawer.close': 'Close drawer',
  'empty.description': 'No data',
  'empty.imageAlt': 'Empty state',
  'inputNumber.decrease': 'Decrease',
  'inputNumber.increase': 'Increase',
  'pagination.label': 'Pagination',
  'pagination.total': '{total} total',
  'pagination.page': 'Page {page}',
  'pagination.prev': 'Previous page',
  'pagination.next': 'Next page',
  'pagination.pageSize': 'Page size',
  'pagination.pageSizeOption': '{size} / page',
  'pagination.jumpTo': 'Jump to page',
  'pagination.jump': 'Go to',
  'pagination.pageUnit': 'page',
  'progress.label': 'Progress',
  'tag.close': 'Close tag',
};

export const UI_LOCALE_MESSAGES: Record<UiLocaleName, UiLocaleMessages> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};
