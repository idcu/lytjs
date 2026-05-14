/**
 * @lytjs/common-a11y
 * 轻量级无障碍访问工具
 */

declare const __DEV__: boolean;

export interface FocusTrapOptions {
  initialFocus?: HTMLElement;
  escapeDeactivates?: boolean;
}

/**
 * 通用无障碍属性接口
 */
export interface A11yProps {
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  ariaRequired?: boolean;
  ariaInvalid?: boolean;
  ariaDisabled?: boolean;
  ariaHidden?: boolean;
  ariaExpanded?: boolean;
  ariaChecked?: boolean | 'mixed';
  ariaSelected?: boolean;
  ariaPressed?: boolean;
  ariaHasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  ariaControls?: string;
  ariaOwns?: string;
  ariaLive?: 'off' | 'polite' | 'assertive';
  ariaValuenow?: number | string;
  ariaValuemax?: number;
  ariaValuemin?: number;
  ariaModal?: boolean;
  tabIndex?: number;
  role?: string;
}

/**
 * 生成 tabindex 属性值
 */
export function getTabIndex(disabled: boolean, customTabIndex?: number): number | undefined {
  if (customTabIndex !== undefined) return customTabIndex;
  return disabled ? -1 : 0;
}

/**
 * 为按钮组件生成 a11y 属性
 */
export function getButtonA11yProps(props: A11yProps & { disabled?: boolean }): Record<string, any> {
  return {
    role: 'button',
    'aria-label': props.ariaLabel,
    'aria-describedby': props.ariaDescribedBy,
    'aria-labelledby': props.ariaLabelledBy,
    'aria-disabled': props.ariaDisabled ?? props.disabled,
    'aria-pressed': props.ariaPressed,
    'tabindex': getTabIndex(props.disabled ?? !!props.ariaDisabled, props.tabIndex),
    id: props.id,
  };
}

/**
 * 为表单控件生成 a11y 属性
 */
export function getFormControlA11yProps(props: A11yProps & { disabled?: boolean; required?: boolean; invalid?: boolean }): Record<string, any> {
  return {
    'aria-label': props.ariaLabel,
    'aria-describedby': props.ariaDescribedBy,
    'aria-labelledby': props.ariaLabelledBy,
    'aria-required': props.ariaRequired ?? props.required,
    'aria-invalid': props.ariaInvalid ?? props.invalid,
    'aria-disabled': props.ariaDisabled ?? props.disabled,
    tabindex: getTabIndex(props.disabled ?? !!props.ariaDisabled, props.tabIndex),
    id: props.id,
  };
}

/**
 * 为复选框/单选框生成 a11y 属性
 */
export function getInputControlA11yProps(props: A11yProps & { disabled?: boolean; checked?: boolean | 'mixed'; required?: boolean; invalid?: boolean }): Record<string, any> {
  return {
    ...getFormControlA11yProps(props),
    'aria-checked': props.checked,
  };
}

/**
 * 为开关组件生成 a11y 属性
 */
export function getSwitchA11yProps(props: A11yProps & { disabled?: boolean; checked?: boolean; required?: boolean; invalid?: boolean }): Record<string, any> {
  return {
    role: 'switch',
    'aria-checked': props.checked,
    ...getFormControlA11yProps(props),
  };
}

/**
 * 为下拉选择组件生成 a11y 属性
 */
export function getComboboxA11yProps(props: A11yProps & { disabled?: boolean; expanded?: boolean; controls?: string; required?: boolean; invalid?: boolean }): Record<string, any> {
  return {
    role: 'combobox',
    'aria-expanded': props.expanded,
    'aria-controls': props.ariaControls ?? props.controls,
    'aria-haspopup': 'listbox',
    ...getFormControlA11yProps(props),
  };
}

/**
 * 为列表框选项生成 a11y 属性
 */
export function getOptionA11yProps(props: A11yProps & { selected?: boolean; disabled?: boolean }): Record<string, any> {
  return {
    role: 'option',
    'aria-selected': props.selected,
    'aria-disabled': props.disabled,
    tabindex: props.disabled ? -1 : 0,
    id: props.id,
  };
}

/**
 * 为滑块组件生成 a11y 属性
 */
export function getSliderA11yProps(props: A11yProps & { disabled?: boolean; value?: number | string; min?: number; max?: number }): Record<string, any> {
  return {
    role: 'slider',
    'aria-valuenow': props.value,
    'aria-valuemin': props.min,
    'aria-valuemax': props.max,
    ...getFormControlA11yProps(props),
  };
}

/**
 * 为数字输入组件生成 a11y 属性
 */
export function getSpinbuttonA11yProps(props: A11yProps & { disabled?: boolean; value?: number | string; min?: number; max?: number }): Record<string, any> {
  return {
    role: 'spinbutton',
    'aria-valuenow': props.value,
    'aria-valuemin': props.min,
    'aria-valuemax': props.max,
    ...getFormControlA11yProps(props),
  };
}

/**
 * 为标签页列表生成 a11y 属性
 */
export function getTablistA11yProps(props: A11yProps & { label?: string }): Record<string, any> {
  return {
    role: 'tablist',
    'aria-label': props.ariaLabel ?? props.label,
    'aria-describedby': props.ariaDescribedBy,
    id: props.id,
  };
}

/**
 * 为单个标签页生成 a11y 属性
 */
export function getTabA11yProps(props: A11yProps & { selected?: boolean; disabled?: boolean; controls?: string }): Record<string, any> {
  return {
    role: 'tab',
    'aria-selected': props.selected,
    'aria-disabled': props.disabled,
    'aria-controls': props.ariaControls ?? props.controls,
    tabindex: props.selected ? 0 : -1,
    id: props.id,
  };
}

/**
 * 为标签面板生成 a11y 属性
 */
export function getTabpanelA11yProps(props: A11yProps & { labelledBy?: string; hidden?: boolean }): Record<string, any> {
  return {
    role: 'tabpanel',
    'aria-labelledby': props.ariaLabelledBy ?? props.labelledBy,
    'aria-hidden': props.hidden,
    id: props.id,
  };
}

/**
 * 为对话框/模态框生成 a11y 属性
 */
export function getDialogA11yProps(props: A11yProps & { labelledBy?: string; describedBy?: string; modal?: boolean }): Record<string, any> {
  return {
    role: 'dialog',
    'aria-modal': props.ariaModal ?? props.modal ?? true,
    'aria-labelledby': props.ariaLabelledBy ?? props.labelledBy,
    'aria-describedby': props.ariaDescribedBy ?? props.describedBy,
    'aria-label': props.ariaLabel,
    id: props.id,
  };
}

/**
 * 为分组组件（checkboxGroup/radioGroup）生成 a11y 属性
 */
export function getGroupA11yProps(props: A11yProps & { role?: 'radiogroup' | 'group' | 'listbox'; required?: boolean; label?: string }): Record<string, any> {
  return {
    role: props.role ?? 'group',
    'aria-label': props.ariaLabel ?? props.label,
    'aria-describedby': props.ariaDescribedBy,
    'aria-required': props.ariaRequired ?? props.required,
    id: props.id,
  };
}

/**
 * 合并多个 a11y 属性对象
 */
export function mergeA11yProps(...propsList: Array<Record<string, any>>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const props of propsList) {
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
  }
  // 过滤 undefined 值
  return Object.fromEntries(
    Object.entries(result).filter(([_, v]) => v !== undefined && v !== null)
  );
}

/** ARIA 角色到必需属性的映射 */
export const ARIA_ROLES: Record<string, string[]> = {
  alert: ['aria-live'],
  alertdialog: ['aria-labelledby', 'aria-describedby'],
  button: [],
  checkbox: ['aria-checked'],
  combobox: ['aria-expanded', 'aria-controls'],
  dialog: ['aria-labelledby', 'aria-describedby'],
  grid: [],
  gridcell: [],
  link: [],
  listbox: ['aria-label'],
  menu: ['aria-label'],
  menubar: [],
  menuitem: [],
  option: ['aria-selected'],
  progressbar: ['aria-valuenow'],
  radio: ['aria-checked'],
  radiogroup: ['aria-label'],
  slider: ['aria-valuenow'],
  spinbutton: ['aria-valuenow'],
  tab: ['aria-selected'],
  tablist: [],
  tabpanel: ['aria-labelledby'],
  textbox: [],
  tree: ['aria-label'],
  treeitem: ['aria-selected'],
};

/** 可聚焦元素选择器 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * 检查元素是否可聚焦
 */
export function isFocusable(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if ('disabled' in element && (element as { disabled: boolean }).disabled) return false;
  if (element.getAttribute('tabindex') === '-1') return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;

  const tag = element.tagName.toLowerCase();
  const focusableTags = new Set([
    'a', 'button', 'input', 'select', 'textarea',
    'details', 'summary',
  ]);

  if (focusableTags.has(tag)) return true;
  if (element.getAttribute('tabindex') !== null) return true;
  if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') return true;

  return false;
}

/**
 * 获取容器内所有可聚焦元素
 */
export function getFocusableElements(container: Element): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  return elements.filter(
    (el): el is HTMLElement => el instanceof HTMLElement && isFocusable(el),
  );
}

/**
 * 在容器内创建焦点陷阱
 *
 * @param container - 陷阱容器
 * @param options - 配置选项
 * @returns 清理函数
 */
export function focusTrap(
  container: HTMLElement,
  options?: FocusTrapOptions,
): () => void {
  const { initialFocus, escapeDeactivates = true } = options || {};

  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0] || container;
  const lastElement = focusableElements[focusableElements.length - 1] || container;

  // 设置初始焦点
  if (initialFocus) {
    initialFocus.focus();
  } else {
    firstElement.focus();
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && escapeDeactivates) {
      cleanup();
      return;
    }

    if (event.key !== 'Tab') return;

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  const cleanup = () => {
    document.removeEventListener('keydown', handleKeyDown);
  };

  return cleanup;
}

/**
 * 管理焦点：保存之前的焦点，将焦点移入容器，返回恢复函数
 *
 * @param container - 目标容器
 * @param triggerEl - 触发元素，恢复焦点时优先回到此元素
 * @returns 恢复函数
 */
export function manageFocus(
  container: HTMLElement,
  triggerEl?: HTMLElement,
): () => void {
  const previousFocus = document.activeElement as HTMLElement | null;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0]!.focus();
  } else {
    container.setAttribute('tabindex', '-1');
    container.focus();
  }

  return () => {
    const target = triggerEl || previousFocus;
    if (target && typeof target.focus === 'function') {
      target.focus();
    }
  };
}

/**
 * 获取元素上所有 aria-* 属性
 */
export function getAriaProps(element: Element): Record<string, string> {
  const result: Record<string, string> = {};
  const attrs = element.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i]!;
    if (attr.name.startsWith('aria-')) {
      result[attr.name] = attr.value!;
    }
  }
  return result;
}

/**
 * 批量设置 aria-* 属性
 */
export function setAriaProps(
  element: Element,
  props: Record<string, string>,
): void {
  for (const key of Object.keys(props)) {
    if (key.startsWith('aria-')) {
      element.setAttribute(key, props[key]!);
    }
  }
}

/**
 * 检查给定元素是否是当前活动元素
 */
export function assertActiveElement(element: Element): boolean {
  return document.activeElement === element;
}

/**
 * 键盘导航辅助函数 - 在启用的选项间循环
 */
export function getNextEnabledIndex(
  currentIndex: number,
  totalItems: number,
  isEnabled: (index: number) => boolean,
  direction: 'forward' | 'backward' = 'forward'
): number {
  const step = direction === 'forward' ? 1 : -1;
  let nextIndex = (currentIndex + step + totalItems) % totalItems;
  
  for (let i = 0; i < totalItems; i++) {
    if (isEnabled(nextIndex)) {
      return nextIndex;
    }
    nextIndex = (nextIndex + step + totalItems) % totalItems;
  }
  
  return currentIndex;
}

/**
 * 处理列表组件的键盘导航
 */
export function handleListKeydown(
  event: KeyboardEvent,
  currentIndex: number,
  totalItems: number,
  isEnabled: (index: number) => boolean,
  onSelect: (index: number) => void,
  onClose?: () => void
): void {
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault();
      onSelect(getNextEnabledIndex(currentIndex, totalItems, isEnabled, 'forward'));
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault();
      onSelect(getNextEnabledIndex(currentIndex, totalItems, isEnabled, 'backward'));
      break;
    case 'Home':
      event.preventDefault();
      for (let i = 0; i < totalItems; i++) {
        if (isEnabled(i)) {
          onSelect(i);
          break;
        }
      }
      break;
    case 'End':
      event.preventDefault();
      for (let i = totalItems - 1; i >= 0; i--) {
        if (isEnabled(i)) {
          onSelect(i);
          break;
        }
      }
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      if (isEnabled(currentIndex)) {
        onSelect(currentIndex);
      }
      break;
    case 'Escape':
      event.preventDefault();
      onClose?.();
      break;
  }
}
