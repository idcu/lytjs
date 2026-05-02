/**
 * @lytjs/common-a11y
 * 轻量级无障碍访问工具
 */

declare const __DEV__: boolean;

export interface FocusTrapOptions {
  initialFocus?: HTMLElement;
  escapeDeactivates?: boolean;
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
