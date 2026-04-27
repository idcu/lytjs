/**
 * @lytjs/components - 无障碍 (a11y) 工具模块
 *
 * 提供无障碍访问支持的工具函数和类：
 * - Focus Trap: 焦点陷阱，用于 Modal/Dialog/Drawer
 * - Roving Tabindex: 漫游 Tabindex，用于 Tabs/Menu
 * - ARIA Utils: ARIA 属性辅助函数
 * - Keyboard Nav: 键盘导航辅助
 */

export { FocusTrap, createFocusTrap, getFocusableElements } from './focusTrap';
export type { FocusTrapOptions } from './focusTrap';

export { RovingTabIndex, createRovingTabIndex } from './rovingTabIndex';
export type { RovingTabIndexOptions } from './rovingTabIndex';

export {
  generateId,
  resetIdCounter,
  getAriaSelected,
  getAriaExpanded,
  getAriaChecked,
  getAriaDisabled,
  getAriaBusy,
  getAriaPressed,
  getAriaHidden,
  getAriaRequired,
  getAriaInvalid,
  getAriaReadonly,
  setAriaAttribute,
  setAriaAttributes,
  createAriaProps,
  getLiveRegionProps,
  getInputAriaProps,
  getListboxProps,
  getOptionProps,
  getDialogProps,
  getTabProps,
  getTabPanelProps,
  getDropdownTriggerProps,
  getMenuItemProps,
} from './aria-utils';

export {
  createKeyboardHandler,
  handleArrowKeys,
  handleEscape,
  handleActivation,
  handleHomeEnd,
  isKeyboardEvent,
  findFocusableSibling,
} from './keyboard-nav';
export type { KeyboardHandlerOptions } from './keyboard-nav';

export {
  configureAxe,
  runA11yCheck,
  assertNoA11yViolations,
  getAvailableRules,
  getCurrentOptions,
  resetAxeConfig,
} from './axe-helper';
export type { A11yViolation, A11yResult, AxeHelperOptions } from './axe-helper';
