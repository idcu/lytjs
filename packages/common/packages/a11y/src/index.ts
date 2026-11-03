/**
 * @lytjs/common-a11y
 * 轻量级无障碍访问工具
 */

declare const __DEV__: boolean;

export interface FocusTrapOptions {
  initialFocus?: HTMLElement;
  /**
   * 按下 Escape 时是否自动解除陷阱。
   *
   * ⚠️ 2026-11-04：**提供了 `onEscape` 时默认变为 `false`** —— 由调用方在
   *   「真的关掉对话框之后」自己调 cleanup。否则会出现「陷阱没了、对话框还在」：
   *   焦点可以自由跑到背后的页面上，而视觉上对话框仍是模态的。
   */
  escapeDeactivates?: boolean;
  /** Escape 被按下时回调（陷阱是否解除由 `escapeDeactivates` 决定） */
  onEscape?: () => void;
  /**
   * 解除陷阱时把焦点还给「激活前的元素」，默认 `true`。
   *
   * ⚠️ 2026-11-04：此前 `focusTrap` **从不恢复焦点** —— 对话框关掉后
   *   `document.activeElement` 落在被移除的节点上（或 `body`），
   *   键盘用户的位置丢失，Tab 从头开始。
   */
  restoreFocus?: boolean;
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
 * 过滤「等于没设」的 a11y 属性值。
 *
 * ⚠️ 2026-11-04 修（P1）：生成器此前把 `''`（props 的默认值）原样写进属性表 ——
 *   于是每个用到的组件都渲染出 `aria-label=""` / `aria-describedby=""`。
 *   `aria-describedby=""` 是**非法的 IDREF 列表**（规范要求至少一个 id），
 *   `aria-label=""` 也不是「无标签」的正确表达（正确做法是不设该属性）。
 *   39 个组件、每个实例都在输出这两个空属性。
 *
 * 只丢 `undefined` / `null` / `''`：`false` 与 `0` **必须保留**
 * （`aria-checked="false"` 与 `aria-valuenow="0"` 都是有意义的值）。
 */
function compactA11y(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === '') continue;
    result[key] = value;
  }
  return result;
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
export function getButtonA11yProps(
  props: A11yProps & { disabled?: boolean },
): Record<string, unknown> {
  return compactA11y({
    role: 'button',
    'aria-label': props.ariaLabel,
    'aria-describedby': props.ariaDescribedBy,
    'aria-labelledby': props.ariaLabelledBy,
    'aria-disabled': props.ariaDisabled ?? props.disabled,
    'aria-pressed': props.ariaPressed,
    tabindex: getTabIndex(props.disabled ?? !!props.ariaDisabled, props.tabIndex),
    id: props.id,
  });
}

/**
 * 为表单控件生成 a11y 属性
 */
export function getFormControlA11yProps(
  props: A11yProps & { disabled?: boolean; required?: boolean; invalid?: boolean },
): Record<string, unknown> {
  return compactA11y({
    'aria-label': props.ariaLabel,
    'aria-describedby': props.ariaDescribedBy,
    'aria-labelledby': props.ariaLabelledBy,
    'aria-required': props.ariaRequired ?? props.required,
    'aria-invalid': props.ariaInvalid ?? props.invalid,
    'aria-disabled': props.ariaDisabled ?? props.disabled,
    tabindex: getTabIndex(props.disabled ?? !!props.ariaDisabled, props.tabIndex),
    id: props.id,
  });
}

/**
 * 为复选框/单选框生成 a11y 属性
 */
export function getInputControlA11yProps(
  props: A11yProps & {
    disabled?: boolean;
    checked?: boolean | 'mixed';
    required?: boolean;
    invalid?: boolean;
  },
): Record<string, unknown> {
  return compactA11y({
    ...getFormControlA11yProps(props),
    'aria-checked': props.checked,
  });
}

/**
 * 为开关组件生成 a11y 属性
 */
export function getSwitchA11yProps(
  props: A11yProps & {
    disabled?: boolean;
    checked?: boolean;
    required?: boolean;
    invalid?: boolean;
  },
): Record<string, unknown> {
  return compactA11y({
    role: 'switch',
    'aria-checked': props.checked,
    ...getFormControlA11yProps(props),
  });
}

/**
 * 为下拉选择组件生成 a11y 属性
 */
export function getComboboxA11yProps(
  props: A11yProps & {
    disabled?: boolean;
    expanded?: boolean;
    controls?: string;
    required?: boolean;
    invalid?: boolean;
  },
): Record<string, unknown> {
  return compactA11y({
    role: 'combobox',
    'aria-expanded': props.expanded,
    'aria-controls': props.ariaControls ?? props.controls,
    'aria-haspopup': 'listbox',
    ...getFormControlA11yProps(props),
  });
}

/**
 * 为列表框选项生成 a11y 属性
 */
export function getOptionA11yProps(
  props: A11yProps & { selected?: boolean; disabled?: boolean },
): Record<string, unknown> {
  return compactA11y({
    role: 'option',
    'aria-selected': props.selected,
    'aria-disabled': props.disabled,
    tabindex: props.disabled ? -1 : 0,
    id: props.id,
  });
}

/**
 * 为滑块组件生成 a11y 属性
 */
export function getSliderA11yProps(
  props: A11yProps & { disabled?: boolean; value?: number | string; min?: number; max?: number },
): Record<string, unknown> {
  return compactA11y({
    role: 'slider',
    'aria-valuenow': props.value,
    'aria-valuemin': props.min,
    'aria-valuemax': props.max,
    ...getFormControlA11yProps(props),
  });
}

/**
 * 为数字输入组件生成 a11y 属性
 */
export function getSpinbuttonA11yProps(
  props: A11yProps & { disabled?: boolean; value?: number | string; min?: number; max?: number },
): Record<string, unknown> {
  return compactA11y({
    role: 'spinbutton',
    'aria-valuenow': props.value,
    'aria-valuemin': props.min,
    'aria-valuemax': props.max,
    ...getFormControlA11yProps(props),
  });
}

/**
 * 为标签页列表生成 a11y 属性
 */
export function getTablistA11yProps(
  props: A11yProps & { label?: string },
): Record<string, unknown> {
  return compactA11y({
    role: 'tablist',
    'aria-label': props.ariaLabel ?? props.label,
    'aria-describedby': props.ariaDescribedBy,
    id: props.id,
  });
}

/**
 * 为单个标签页生成 a11y 属性
 */
export function getTabA11yProps(
  props: A11yProps & { selected?: boolean; disabled?: boolean; controls?: string },
): Record<string, unknown> {
  return compactA11y({
    role: 'tab',
    'aria-selected': props.selected,
    'aria-disabled': props.disabled,
    'aria-controls': props.ariaControls ?? props.controls,
    tabindex: props.selected ? 0 : -1,
    id: props.id,
  });
}

/**
 * 为标签面板生成 a11y 属性
 */
export function getTabpanelA11yProps(
  props: A11yProps & { labelledBy?: string; hidden?: boolean },
): Record<string, unknown> {
  return compactA11y({
    role: 'tabpanel',
    'aria-labelledby': props.ariaLabelledBy ?? props.labelledBy,
    'aria-hidden': props.hidden,
    id: props.id,
  });
}

/**
 * 为对话框/模态框生成 a11y 属性
 */
export function getDialogA11yProps(
  props: A11yProps & { labelledBy?: string; describedBy?: string; modal?: boolean },
): Record<string, unknown> {
  return compactA11y({
    role: 'dialog',
    'aria-modal': props.ariaModal ?? props.modal ?? true,
    'aria-labelledby': props.ariaLabelledBy ?? props.labelledBy,
    'aria-describedby': props.ariaDescribedBy ?? props.describedBy,
    'aria-label': props.ariaLabel,
    id: props.id,
  });
}

/**
 * 为分组组件（checkboxGroup/radioGroup）生成 a11y 属性
 */
export function getGroupA11yProps(
  props: A11yProps & {
    role?: 'radiogroup' | 'group' | 'listbox';
    required?: boolean;
    label?: string;
  },
): Record<string, unknown> {
  return compactA11y({
    role: props.role ?? 'group',
    'aria-label': props.ariaLabel ?? props.label,
    'aria-describedby': props.ariaDescribedBy,
    'aria-required': props.ariaRequired ?? props.required,
    id: props.id,
  });
}

/**
 * 合并多个 a11y 属性对象
 */
export function mergeA11yProps(
  ...propsList: Array<Record<string, unknown>>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const props of propsList) {
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
  }
  // 过滤 undefined 值
  return Object.fromEntries(
    Object.entries(result).filter(([_, v]) => v !== undefined && v !== null),
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
 * 元素是否「不可见 / 不可达」—— 沿祖先链检查。
 *
 * ⚠️ 2026-11-04 修（P1）：此前只检查元素**自身**的 `aria-hidden`，于是
 *   `hidden` 属性、`inert`、内联 `display:none`、祖先的 `aria-hidden="true"`
 *   全部漏掉。这些元素在浏览器里 `.focus()` 是**空操作**，但会被算进
 *   「可聚焦列表」⇒ 一旦它排在最前，焦点陷阱的初始焦点就落空
 *   （焦点仍停在对话框外，键盘用户被挡在门外）。
 *
 * 与 2026-10-19 那次 `input[type=hidden]` 的修复是**同一个缺陷族**：
 * 当时只补了那一个特例，没有补「隐藏」这个一般情况。
 *
 * 注意：只读**内联样式**与属性，不依赖 `getComputedStyle` / 布局 ——
 * 无 DOM 布局的环境（jsdom / 服务端）里同样成立。
 */
export function isHiddenFromAccessibility(element: Element): boolean {
  let node: Element | null = element;
  while (node) {
    if (node.hasAttribute('hidden')) return true;
    if (node.hasAttribute('inert')) return true;
    if (node.getAttribute('aria-hidden') === 'true') return true;
    const style = (node as HTMLElement).style;
    if (style) {
      if (style.display === 'none') return true;
      if (style.visibility === 'hidden' || style.visibility === 'collapse') return true;
    }
    node = node.parentElement;
  }
  return false;
}

/**
 * 检查元素是否可聚焦
 */
export function isFocusable(element: Element): boolean {
  // 非 DOM 环境（SSR / 纯 Node）里 `HTMLElement` 根本不存在 —— 直接引用会 ReferenceError
  if (typeof HTMLElement === 'undefined' || !(element instanceof HTMLElement)) return false;
  if ('disabled' in element && (element as { disabled: boolean }).disabled) return false;
  if (element.getAttribute('tabindex') === '-1') return false;
  if (isHiddenFromAccessibility(element)) return false;

  const tag = element.tagName.toLowerCase();

  // ★ 2026-10-19 修复：`<input type="hidden">` **不是**可聚焦元素。
  //   浏览器里对隐藏输入调 `.focus()` 是**空操作**；而 `getFocusableElements` 的选择器
  //   是 `input:not([disabled])` ⇒ 隐藏输入会混进候选集，再被这里误判为可聚焦
  //   ⇒ 一旦它排在最前，就会成为 `focusTrap` 的 `firstElement` ⇒ **初始焦点落空**
  //   （焦点仍停在对话框外，键盘用户被卡在陷阱之外）。
  if (tag === 'input' && (element as HTMLInputElement).type === 'hidden') return false;

  // ★ 2026-10-19 修复：**无 href 的 `<a>` 不可聚焦**（不在 Tab 序列中）。
  //   容器路径因选择器写的是 `a[href]` 而侥幸正确，但直接调用本函数会误判。
  if (tag === 'a' && !element.hasAttribute('href')) return false;

  const focusableTags = new Set([
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'details',
    'summary',
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
  return elements.filter((el): el is HTMLElement => el instanceof HTMLElement && isFocusable(el));
}

/**
 * 在容器内创建焦点陷阱
 *
 * @param container - 陷阱容器
 * @param options - 配置选项
 * @returns 清理函数
 */
/**
 * 同时存在的焦点陷阱（后进先出）。
 *
 * ⚠️ 2026-11-04 新增：没有这个栈时，**两个陷阱会互相抢焦点** ——
 *   陷阱 A 的 `focusin` 监听发现焦点跑到了自己的容器外，就把焦点拉回 A 的第一个元素；
 *   这又触发陷阱 B 的 `focusin`，B 再拉回自己…… 于是 `focus()` 递归到爆栈
 *   （实测：`RangeError: Maximum call stack size exceeded`）。
 *
 *   嵌套弹层（弹窗里再开一个确认框）本来就会同时存在两个陷阱，所以这不是边缘情况。
 *   只有**最上层**的陷阱才处理 `Tab` / `Escape` / `focusin`，下层的保持沉默；
 *   上层关闭后自动交还给下层。
 */
const activeTraps: symbol[] = [];

export function focusTrap(container: HTMLElement, options?: FocusTrapOptions): () => void {
  const { initialFocus, onEscape, restoreFocus = true } = options || {};
  // 提供了 onEscape ⇒ 默认**不**自动解除（由调用方在真正关闭后 cleanup），
  // 否则会出现「陷阱没了、对话框还在」。
  const escapeDeactivates = options?.escapeDeactivates ?? onEscape === undefined;

  const doc = container.ownerDocument;
  const previouslyFocused = (doc.activeElement as HTMLElement | null) ?? null;

  /**
   * ⚠️ 2026-11-04 修（P1）：可聚焦列表必须**每次用到时重算**。
   *   此前在 `focusTrap()` 调用时算一次就固定了 —— 而对话框内容几乎总是后到的
   *   （loading → 表单、异步数据、条件按钮）⇒ 后加入的元素「不在陷阱里」，
   *   Tab 到它时 `document.activeElement === lastElement` 永不成立 ⇒ **焦点逃出对话框**，
   *   而视觉上它还是模态的。
   */
  const focusables = (): HTMLElement[] => getFocusableElements(container);

  const token = Symbol('lyt-focus-trap');
  activeTraps.push(token);
  /** 只有最上层的陷阱才生效（见 `activeTraps` 的说明） */
  const isTopmost = (): boolean =>
    activeTraps.length > 0 && activeTraps[activeTraps.length - 1] === token;

  let trapped = true;
  /** 临时给容器加的 tabindex（容器内一个可聚焦元素都没有时） */
  let temporaryTabIndex = false;

  const focusInitial = (): void => {
    const list = focusables();
    const target = initialFocus ?? list[0];
    if (target && typeof target.focus === 'function') {
      target.focus();
      return;
    }
    // 容器内没有任何可聚焦元素：`container.focus()` 对不可聚焦元素是**空操作**
    // ⇒ 焦点仍留在对话框外。临时让它可聚焦（cleanup 时摘掉）。
    if (!container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1');
      temporaryTabIndex = true;
    }
    container.focus();
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!isTopmost()) return;
    if (event.key === 'Escape' && (escapeDeactivates || onEscape)) {
      if (escapeDeactivates) cleanup();
      onEscape?.();
      return;
    }

    if (event.key !== 'Tab') return;

    const list = focusables();
    if (list.length === 0) {
      event.preventDefault();
      return;
    }

    const first = list[0]!;
    const last = list[list.length - 1]!;
    const active = doc.activeElement;

    // 焦点已经在容器外（点了外部、程序化 focus）⇒ 拉回容器内
    if (!active || !container.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }

    if (event.shiftKey) {
      if (active === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  /**
   * 鼠标点击对话框外部会让焦点**逃出**陷阱 —— 这条路径完全不经过 `keydown`。
   * 用 `focusin` 兜底把焦点拉回（`inert` 在旧浏览器上不可用，只能这样兜）。
   */
  const handleFocusIn = (event: Event): void => {
    if (!trapped || !isTopmost()) return;
    const target = event.target as Node | null;
    if (target && container.contains(target)) return;
    const list = focusables();
    (list[0] ?? container).focus();
  };

  doc.addEventListener('keydown', handleKeyDown);
  doc.addEventListener('focusin', handleFocusIn);

  focusInitial();

  function cleanup(): void {
    if (!trapped) return;
    trapped = false;
    doc.removeEventListener('keydown', handleKeyDown);
    doc.removeEventListener('focusin', handleFocusIn);

    const index = activeTraps.indexOf(token);
    if (index >= 0) activeTraps.splice(index, 1);

    if (temporaryTabIndex) {
      container.removeAttribute('tabindex');
      temporaryTabIndex = false;
    }

    if (restoreFocus) {
      const target = previouslyFocused;
      if (target && typeof target.focus === 'function' && target.isConnected !== false) {
        target.focus();
      }
    }
  }

  return cleanup;
}

/**
 * 管理焦点：保存之前的焦点，将焦点移入容器，返回恢复函数
 *
 * @param container - 目标容器
 * @param triggerEl - 触发元素，恢复焦点时优先回到此元素
 * @returns 恢复函数
 */
export function manageFocus(container: HTMLElement, triggerEl?: HTMLElement): () => void {
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
export function setAriaProps(element: Element, props: Record<string, string>): void {
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
  direction: 'forward' | 'backward' = 'forward',
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
  onClose?: () => void,
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
