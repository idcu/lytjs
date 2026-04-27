/**
 * ARIA 属性辅助函数
 * 提供生成唯一 ID、设置 ARIA 属性等工具函数
 */

let idCounter = 0;

/**
 * 生成唯一 ID，用于 ARIA 属性关联
 * @param prefix - ID 前缀，默认为 'lyt'
 * @returns 唯一 ID 字符串
 */
export function generateId(prefix: string = 'lyt'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * 重置 ID 计数器（用于测试）
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * 获取 aria-selected 属性值
 */
export function getAriaSelected(selected: boolean): 'true' | 'false' {
  return selected ? 'true' : 'false';
}

/**
 * 获取 aria-expanded 属性值
 */
export function getAriaExpanded(expanded: boolean): 'true' | 'false' {
  return expanded ? 'true' : 'false';
}

/**
 * 获取 aria-checked 属性值
 * 支持 'mixed' 状态（用于 indeterminate checkbox）
 */
export function getAriaChecked(
  checked: boolean | 'mixed'
): 'true' | 'false' | 'mixed' {
  if (checked === 'mixed') return 'mixed';
  return checked ? 'true' : 'false';
}

/**
 * 获取 aria-disabled 属性值
 */
export function getAriaDisabled(disabled: boolean): 'true' | 'false' {
  return disabled ? 'true' : 'false';
}

/**
 * 获取 aria-busy 属性值
 */
export function getAriaBusy(busy: boolean): 'true' | 'false' {
  return busy ? 'true' : 'false';
}

/**
 * 获取 aria-pressed 属性值
 */
export function getAriaPressed(pressed: boolean): 'true' | 'false' {
  return pressed ? 'true' : 'false';
}

/**
 * 获取 aria-hidden 属性值
 */
export function getAriaHidden(hidden: boolean): 'true' | 'false' | undefined {
  return hidden ? 'true' : undefined;
}

/**
 * 获取 aria-required 属性值
 */
export function getAriaRequired(required: boolean): 'true' | 'false' | undefined {
  return required ? 'true' : undefined;
}

/**
 * 获取 aria-invalid 属性值
 */
export function getAriaInvalid(invalid: boolean): 'true' | 'false' | undefined {
  return invalid ? 'true' : undefined;
}

/**
 * 获取 aria-readonly 属性值
 */
export function getAriaReadonly(readonly: boolean): 'true' | 'false' | undefined {
  return readonly ? 'true' : undefined;
}

/**
 * 设置 ARIA 属性到元素
 */
export function setAriaAttribute(
  element: HTMLElement,
  attribute: string,
  value: string | boolean | undefined
): void {
  if (value === undefined) {
    element.removeAttribute(attribute);
  } else {
    element.setAttribute(attribute, String(value));
  }
}

/**
 * 批量设置 ARIA 属性
 */
export function setAriaAttributes(
  element: HTMLElement,
  attributes: Record<string, string | boolean | undefined>
): void {
  for (const [key, value] of Object.entries(attributes)) {
    setAriaAttribute(element, key, value);
  }
}

/**
 * 创建 ARIA 属性对象（用于模板绑定）
 * 返回一个对象，可以直接展开到模板属性中
 */
export function createAriaProps(
  attributes: Record<string, string | boolean | undefined>
): Record<string, string | boolean | undefined> {
  // 过滤掉 undefined 值
  const result: Record<string, string | boolean | undefined> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * 获取 ARIA live region 的属性
 * @param politeness - 'polite' | 'assertive' | 'off'
 */
export function getLiveRegionProps(
  politeness: 'polite' | 'assertive' | 'off' = 'polite',
  atomic: boolean = true
): Record<string, string> {
  return {
    role: politeness === 'assertive' ? 'alert' : 'status',
    'aria-live': politeness,
    'aria-atomic': String(atomic),
  };
}

/**
 * 关联 label 和 input 元素
 * @param inputId - input 元素的 ID
 * @param labelId - label 元素的 ID（可选）
 * @returns ARIA 属性对象
 */
export function getInputAriaProps(options: {
  id?: string;
  labelId?: string;
  label?: string;
  required?: boolean;
  invalid?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  describedbyId?: string;
}): Record<string, string | boolean | undefined> {
  const props: Record<string, string | boolean | undefined> = {};

  if (options.labelId) {
    props['aria-labelledby'] = options.labelId;
  } else if (options.label) {
    props['aria-label'] = options.label;
  }

  if (options.required) props['aria-required'] = 'true';
  if (options.invalid) props['aria-invalid'] = 'true';
  if (options.readonly) props['aria-readonly'] = 'true';
  if (options.describedbyId) props['aria-describedby'] = options.describedbyId;

  return props;
}

/**
 * 获取列表框 ARIA 属性
 */
export function getListboxProps(options: {
  id?: string;
  labelId?: string;
  label?: string;
  required?: boolean;
  expanded?: boolean;
  activedescendantId?: string;
  multiselectable?: boolean;
}): Record<string, string | boolean | undefined> {
  const props: Record<string, string | boolean | undefined> = {
    role: 'listbox',
  };

  if (options.labelId) {
    props['aria-labelledby'] = options.labelId;
  } else if (options.label) {
    props['aria-label'] = options.label;
  }

  if (options.required) props['aria-required'] = 'true';
  if (options.expanded !== undefined) props['aria-expanded'] = String(options.expanded);
  if (options.activedescendantId) props['aria-activedescendant'] = options.activedescendantId;
  if (options.multiselectable) props['aria-multiselectable'] = 'true';

  return props;
}

/**
 * 获取选项 ARIA 属性
 */
export function getOptionProps(options: {
  selected: boolean;
  disabled?: boolean;
  id?: string;
}): Record<string, string | boolean | undefined> {
  const props: Record<string, string | boolean | undefined> = {
    role: 'option',
    'aria-selected': String(options.selected),
  };

  if (options.disabled) props['aria-disabled'] = 'true';
  if (options.id) props.id = options.id;

  return props;
}

/**
 * 获取对话框 ARIA 属性
 */
export function getDialogProps(options: {
  titleId?: string;
  descriptionId?: string;
  modal?: boolean;
  labelledby?: string;
  describedby?: string;
}): Record<string, string | boolean | undefined> {
  const props: Record<string, string | boolean | undefined> = {
    role: 'dialog',
  };

  if (options.modal !== false) props['aria-modal'] = 'true';
  if (options.titleId) props['aria-labelledby'] = options.titleId;
  if (options.descriptionId) props['aria-describedby'] = options.descriptionId;
  if (options.labelledby) props['aria-labelledby'] = options.labelledby;
  if (options.describedby) props['aria-describedby'] = options.describedby;

  return props;
}

/**
 * 获取标签页 ARIA 属性
 */
export function getTabProps(options: {
  selected: boolean;
  controlsId: string;
  id?: string;
}): Record<string, string | boolean | undefined> {
  return {
    role: 'tab',
    'aria-selected': String(options.selected),
    'aria-controls': options.controlsId,
    id: options.id,
    tabindex: options.selected ? '0' : '-1',
  };
}

/**
 * 获取标签面板 ARIA 属性
 */
export function getTabPanelProps(options: {
  labelledbyId: string;
  id?: string;
  hidden?: boolean;
}): Record<string, string | boolean | undefined> {
  return {
    role: 'tabpanel',
    'aria-labelledby': options.labelledbyId,
    id: options.id,
    tabindex: '0',
  };
}

/**
 * 获取下拉菜单触发器 ARIA 属性
 */
export function getDropdownTriggerProps(options: {
  expanded: boolean;
  hasPopup?: string;
  controlsId?: string;
  id?: string;
}): Record<string, string | boolean | undefined> {
  return {
    'aria-expanded': String(options.expanded),
    'aria-haspopup': options.hasPopup || 'listbox',
    ...(options.controlsId ? { 'aria-controls': options.controlsId } : {}),
    ...(options.id ? { id: options.id } : {}),
  };
}

/**
 * 获取菜单项 ARIA 属性
 */
export function getMenuItemProps(options: {
  disabled?: boolean;
  id?: string;
}): Record<string, string | boolean | undefined> {
  const props: Record<string, string | boolean | undefined> = {
    role: 'menuitem',
  };

  if (options.disabled) props['aria-disabled'] = 'true';
  if (options.id) props.id = options.id;

  return props;
}
