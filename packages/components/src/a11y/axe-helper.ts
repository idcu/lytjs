/**
 * @lytjs/components - 轻量级无障碍 (a11y) 规则检查器
 *
 * 由于项目使用自定义 mock DOM 而非 jsdom，axe-core 无法直接运行。
 * 本模块提供一套轻量级的 a11y 规则检查器，覆盖常见的无障碍问题：
 * - 交互元素必须有可访问名称
 * - 图片必须有 alt 属性
 * - 表单元素必须有 label
 * - 模态框必须有 focus trap
 * - 颜色对比度检查
 * - ARIA 属性值有效性
 */

// ================================================================
//  类型定义
// ================================================================

/** a11y 违规项 */
export interface A11yViolation {
  /** 规则 ID */
  id: string;
  /** 规则描述 */
  description: string;
  /** 影响程度: 'critical' | 'serious' | 'moderate' | 'minor' */
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  /** 违规元素信息 */
  element?: string;
  /** 帮助信息 */
  help?: string;
}

/** a11y 检查结果 */
export interface A11yResult {
  /** 是否通过（无违规） */
  passed: boolean;
  /** 违规列表 */
  violations: A11yViolation[];
  /** 通过的规则数 */
  passedRules: number;
  /** 检查的规则总数 */
  totalRules: number;
}

/** axe-core 配置选项（兼容接口） */
export interface AxeHelperOptions {
  /** 要运行的规则 ID 列表，空数组表示运行所有规则 */
  rules?: string[];
  /** 要排除的规则 ID 列表 */
  excludeRules?: string[];
  /** 自定义标签 */
  tags?: string[];
}

/** 简化的元素接口，兼容 mock DOM 和真实 DOM */
interface A11yElement {
  tagName: string;
  attributes?: Record<string, string>;
  textContent?: string;
  children?: A11yElement[];
  parentNode?: A11yElement | null;
  getAttribute?(key: string): string | null;
  hasAttribute?(key: string): boolean;
  querySelectorAll?(selector: string): A11yElement[];
}

// ================================================================
//  默认配置
// ================================================================

const defaultOptions: AxeHelperOptions = {
  rules: [],
  excludeRules: [],
  tags: ['wcag2a', 'wcag2aa'],
};

let currentOptions: AxeHelperOptions = { ...defaultOptions };

// ================================================================
//  规则定义
// ================================================================

/** 可聚焦的交互元素标签 */
const _INTERACTIVE_TAGS = new Set([
  'BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA',
  'SUMMARY', 'DETAILS',
]);

/** 需要可访问名称的交互元素标签 */
const INTERACTIVE_NEED_NAME_TAGS = new Set([
  'BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT',
]);

/** 表单元素标签 */
const FORM_ELEMENT_TAGS = new Set([
  'INPUT', 'TEXTAREA', 'SELECT',
]);

/** 有效的 ARIA 属性及其有效值 */
const ARIA_BOOLEAN_ATTRS = new Set([
  'aria-hidden', 'aria-checked', 'aria-disabled', 'aria-expanded',
  'aria-pressed', 'aria-selected', 'aria-required', 'aria-invalid',
  'aria-readonly', 'aria-modal', 'aria-atomic', 'aria-busy',
  'aria-multiselectable', 'aria-haspopup',
]);

const ARIA_TRUE_FALSE_MIXED_ATTRS = new Set([
  'aria-checked', 'aria-pressed',
]);

const VALID_ROLES = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
  'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
  'contentinfo', 'definition', 'dialog', 'directory', 'document',
  'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
  'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
  'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
  'menuitemradio', 'navigation', 'note', 'option', 'presentation',
  'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
  'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
  'slider', 'spinbutton', 'status', 'switch', 'tab', 'table',
  'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar',
  'tooltip', 'tree', 'treegrid', 'treeitem',
]);

// ================================================================
//  工具函数
// ================================================================

/**
 * 从元素获取属性值（兼容 mock DOM 和真实 DOM）
 */
function getAttr(el: A11yElement, key: string): string | null {
  if (el.getAttribute) {
    return el.getAttribute(key);
  }
  if (el.attributes) {
    return el.attributes[key] ?? null;
  }
  return null;
}

/**
 * 检查元素是否有某个属性（兼容 mock DOM 和真实 DOM）
 */
function _hasAttr(el: A11yElement, key: string): boolean {
  if (el.hasAttribute) {
    return el.hasAttribute(key);
  }
  if (el.attributes) {
    return key in el.attributes;
  }
  return false;
}

/**
 * 检查交互元素是否有可访问名称
 */
function hasAccessibleName(el: A11yElement): boolean {
  // 1. aria-label
  const ariaLabel = getAttr(el, 'aria-label');
  if (ariaLabel && ariaLabel.trim()) return true;

  // 2. aria-labelledby（简化检查，仅检查属性存在）
  const ariaLabelledby = getAttr(el, 'aria-labelledby');
  if (ariaLabelledby && ariaLabelledby.trim()) return true;

  // 3. 对于 button，检查文本内容
  if (el.tagName === 'BUTTON' && el.textContent && el.textContent.trim()) return true;

  // 4. 对于 a 标签，检查文本内容或 title
  if (el.tagName === 'A') {
    if (el.textContent && el.textContent.trim()) return true;
    const title = getAttr(el, 'title');
    if (title && title.trim()) return true;
  }

  // 5. 对于 input，检查 id 是否被 label 关联（简化检查）
  if (el.tagName === 'INPUT') {
    const type = (getAttr(el, 'type') || '').toLowerCase();
    // hidden, submit, reset, image, button 类型的 input 不需要可访问名称
    if (['hidden', 'submit', 'reset', 'image', 'button'].includes(type)) return true;
    // 有 value 的 input（如 submit/reset）
    const value = getAttr(el, 'value');
    if (value && value.trim() && ['submit', 'reset', 'button'].includes(type)) return true;
  }

  return false;
}

/**
 * 收集元素及其所有子元素
 */
function _collectElements(el: A11yElement): A11yElement[] {
  const result: A11yElement[] = [el];
  if (el.children) {
    for (const child of el.children) {
      result.push(..._collectElements(child));
    }
  }
  return result;
}

/**
 * 收集元素及其所有子元素（使用 querySelectorAll 兼容方式）
 */
function collectAllElements(container: A11yElement): A11yElement[] {
  const elements: A11yElement[] = [];

  function walk(el: A11yElement) {
    elements.push(el);
    if (el.children) {
      for (const child of el.children) {
        walk(child);
      }
    }
  }

  walk(container);
  return elements;
}

/**
 * 简化的相对亮度计算
 * @param hex - 十六进制颜色值，如 '#ffffff'
 */
function getRelativeLuminance(hex: string): number {
  // 移除 # 前缀
  const clean = hex.replace('#', '');
  if (clean.length !== 3 && clean.length !== 6) return 1;

  // 展开缩写
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  }

  // 转换为 [0, 1] 范围
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * 计算两个颜色之间的对比度
 * @param color1 - 前景色（十六进制）
 * @param color2 - 背景色（十六进制）
 */
function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ================================================================
//  规则实现
// ================================================================

/**
 * 规则: 交互元素必须有可访问名称
 */
function checkInteractiveName(elements: A11yElement[]): A11yViolation[] {
  const violations: A11yViolation[] = [];

  for (const el of elements) {
    if (!INTERACTIVE_NEED_NAME_TAGS.has(el.tagName)) continue;

    // 跳过 disabled 的元素
    if (getAttr(el, 'disabled') !== null) continue;

    // 跳过 hidden 的元素
    if (getAttr(el, 'hidden') !== null) continue;
    const ariaHidden = getAttr(el, 'aria-hidden');
    if (ariaHidden === 'true') continue;

    // 跳过 type="hidden" 的 input
    if (el.tagName === 'INPUT' && (getAttr(el, 'type') || '').toLowerCase() === 'hidden') continue;

    if (!hasAccessibleName(el)) {
      violations.push({
        id: 'interactive-name',
        description: `交互元素 <${el.tagName.toLowerCase()}> 缺少可访问名称`,
        impact: 'serious',
        element: `<${el.tagName.toLowerCase()}>`,
        help: '交互元素必须有 aria-label、aria-labelledby 或文本内容作为可访问名称',
      });
    }
  }

  return violations;
}

/**
 * 规则: 图片必须有 alt 属性
 */
function checkImageAlt(elements: A11yElement[]): A11yViolation[] {
  const violations: A11yViolation[] = [];

  for (const el of elements) {
    if (el.tagName !== 'IMG') continue;

    const alt = getAttr(el, 'alt');
    if (alt === null) {
      const role = getAttr(el, 'role');
      // 如果 role 是 presentation 或 none，则不需要 alt
      if (role === 'presentation' || role === 'none') continue;

      violations.push({
        id: 'image-alt',
        description: '图片元素缺少 alt 属性',
        impact: 'critical',
        element: '<img>',
        help: '所有 <img> 元素必须有 alt 属性，描述性图片提供有意义的文本，装饰性图片使用 alt=""',
      });
    }
  }

  return violations;
}

/**
 * 规则: 表单元素必须有 label
 */
function checkFormLabel(elements: A11yElement[]): A11yViolation[] {
  const violations: A11yViolation[] = [];

  for (const el of elements) {
    if (!FORM_ELEMENT_TAGS.has(el.tagName)) continue;

    const type = (getAttr(el, 'type') || '').toLowerCase();

    // 跳过不需要 label 的类型
    if (['hidden', 'submit', 'reset', 'button', 'image'].includes(type)) continue;

    // 跳过 disabled 的元素
    if (getAttr(el, 'disabled') !== null) continue;

    // 跳过 hidden 的元素
    if (getAttr(el, 'hidden') !== null) continue;
    const ariaHidden = getAttr(el, 'aria-hidden');
    if (ariaHidden === 'true') continue;

    // 检查是否有 label 关联
    const hasLabel = hasAccessibleName(el);
    if (!hasLabel) {
      violations.push({
        id: 'form-label',
        description: `表单元素 <${el.tagName.toLowerCase()}> 缺少关联的 label`,
        impact: 'serious',
        element: `<${el.tagName.toLowerCase()}${type ? ` type="${type}"` : ''}>`,
        help: '表单元素必须有 <label> 关联、aria-label 或 aria-labelledby',
      });
    }
  }

  return violations;
}

/**
 * 规则: 模态框必须有 focus trap（检查 aria-modal）
 */
function checkModalFocusTrap(elements: A11yElement[]): A11yViolation[] {
  const violations: A11yViolation[] = [];

  for (const el of elements) {
    const role = getAttr(el, 'role');
    if (role !== 'dialog') continue;

    const ariaModal = getAttr(el, 'aria-modal');
    if (ariaModal !== 'true') {
      violations.push({
        id: 'modal-focus-trap',
        description: '对话框 (role="dialog") 缺少 aria-modal="true" 属性',
        impact: 'serious',
        element: `<div role="dialog">`,
        help: '模态对话框必须设置 aria-modal="true" 以指示焦点被困在对话框内',
      });
    }

    // 检查是否有 aria-labelledby 或 aria-label
    const hasLabelledby = getAttr(el, 'aria-labelledby');
    const hasLabel = getAttr(el, 'aria-label');
    if (!hasLabelledby && !hasLabel) {
      violations.push({
        id: 'dialog-label',
        description: '对话框缺少可访问标题',
        impact: 'serious',
        element: `<div role="dialog">`,
        help: '对话框必须有 aria-labelledby 或 aria-label 属性提供标题',
      });
    }
  }

  return violations;
}

/**
 * 规则: ARIA 属性值有效性
 */
function checkAriaValidity(elements: A11yElement[]): A11yViolation[] {
  const violations: A11yViolation[] = [];

  for (const el of elements) {
    if (!el.attributes) continue;

    for (const [key, value] of Object.entries(el.attributes)) {
      // 检查 role 属性（不以 aria- 开头，但属于 ARIA 规范）
      if (key === 'role' && !VALID_ROLES.has(value)) {
        violations.push({
          id: 'aria-valid-role',
          description: `role 属性值 "${value}" 不是有效的 ARIA role`,
          impact: 'critical',
          element: `<${el.tagName.toLowerCase()} role="${value}">`,
          help: `有效的 role 值包括: ${Array.from(VALID_ROLES).slice(0, 10).join(', ')} 等`,
        });
        continue;
      }

      // 以下仅检查 aria-* 属性
      if (!key.startsWith('aria-')) continue;

      // 检查布尔类型 ARIA 属性
      if (ARIA_BOOLEAN_ATTRS.has(key)) {
        const validValues = ARIA_TRUE_FALSE_MIXED_ATTRS.has(key)
          ? ['true', 'false', 'mixed']
          : ['true', 'false'];
        if (!validValues.includes(value)) {
          violations.push({
            id: 'aria-attr-valid-value',
            description: `ARIA 属性 "${key}" 的值 "${value}" 无效，有效值为: ${validValues.join(', ')}`,
            impact: 'critical',
            element: `<${el.tagName.toLowerCase()} ${key}="${value}">`,
            help: `属性 ${key} 只接受值: ${validValues.join(', ')}`,
          });
        }
      }

      // 检查 aria-* 属性不以 aria- 开头但不是已知属性
      // （宽松检查，仅检查常见拼写错误）
    }
  }

  return violations;
}

/**
 * 规则: 颜色对比度检查（基于内联样式）
 */
function checkColorContrast(elements: A11yElement[]): A11yViolation[] {
  const violations: A11yViolation[] = [];

  for (const el of elements) {
    // 检查内联 style 中的 color 和 background-color
    const style = (el as HTMLElement).style;
    if (!style || typeof style !== 'object') continue;

    const color = style.color || style.getPropertyValue?.('color');
    const bgColor = style.backgroundColor || style.getPropertyValue?.('backgroundColor');

    if (!color || !bgColor) continue;

    // 尝试解析颜色值
    const fgHex = parseColorToHex(color);
    const bgHex = parseColorToHex(bgColor);

    if (!fgHex || !bgHex) continue;

    const ratio = getContrastRatio(fgHex, bgHex);

    // WCAG AA 标准要求普通文本对比度 >= 4.5:1
    if (ratio < 4.5) {
      violations.push({
        id: 'color-contrast',
        description: `元素颜色对比度不足: ${ratio.toFixed(2)}:1 (要求 >= 4.5:1)`,
        impact: 'serious',
        element: `<${el.tagName.toLowerCase()}>`,
        help: '文本与背景的对比度至少为 4.5:1 (WCAG AA 标准)',
      });
    }
  }

  return violations;
}

/**
 * 尝试将 CSS 颜色值解析为十六进制
 */
function parseColorToHex(color: string): string | null {
  if (!color || typeof color !== 'string') return null;

  const trimmed = color.trim();

  // 已经是十六进制
  if (trimmed.startsWith('#')) {
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed) || /^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      return trimmed;
    }
    return null;
  }

  // rgb(r, g, b) 格式
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return '#' + [r, g, b].map(c => Math.min(255, c).toString(16).padStart(2, '0')).join('');
  }

  return null;
}

// ================================================================
//  公共 API
// ================================================================

/** 所有可用的规则 */
const ALL_RULES: Record<string, (elements: A11yElement[]) => A11yViolation[]> = {
  'interactive-name': checkInteractiveName,
  'image-alt': checkImageAlt,
  'form-label': checkFormLabel,
  'modal-focus-trap': checkModalFocusTrap,
  'aria-attr-valid-value': checkAriaValidity,
  'color-contrast': checkColorContrast,
};

/**
 * 配置 axe-core（兼容接口）
 *
 * @param options - 配置选项
 */
export function configureAxe(options: Partial<AxeHelperOptions> = {}): void {
  currentOptions = {
    ...defaultOptions,
    ...options,
  };
}

/**
 * 运行无障碍检查
 *
 * @param container - 要检查的容器元素（HTMLElement 或 mock 元素）
 * @returns 检查结果
 */
export function runA11yCheck(container: A11yElement): A11yResult {
  const elements = collectAllElements(container);
  const allViolations: A11yViolation[] = [];
  let passedRules = 0;
  let totalRules = 0;

  // 确定要运行的规则
  const rulesToRun = currentOptions.rules && currentOptions.rules.length > 0
    ? currentOptions.rules
    : Object.keys(ALL_RULES);

  const excludeRules = new Set(currentOptions.excludeRules || []);

  for (const ruleId of rulesToRun) {
    if (excludeRules.has(ruleId)) continue;
    if (!ALL_RULES[ruleId]) continue;

    totalRules++;
    const violations = ALL_RULES[ruleId](elements);

    if (violations.length === 0) {
      passedRules++;
    } else {
      allViolations.push(...violations);
    }
  }

  return {
    passed: allViolations.length === 0,
    violations: allViolations,
    passedRules,
    totalRules,
  };
}

/**
 * 断言无 a11y 违规
 *
 * 如果存在违规，抛出包含详细信息的 Error。
 *
 * @param container - 要检查的容器元素
 * @throws 当存在 a11y 违规时
 */
export function assertNoA11yViolations(container: A11yElement): void {
  const result = runA11yCheck(container);

  if (!result.passed) {
    const messages = result.violations.map(v => {
      const parts = [
        `[${v.impact.toUpperCase()}] ${v.id}: ${v.description}`,
      ];
      if (v.element) parts.push(`  元素: ${v.element}`);
      if (v.help) parts.push(`  帮助: ${v.help}`);
      return parts.join('\n');
    });

    throw new Error(
      `发现 ${result.violations.length} 个无障碍违规:\n\n${messages.join('\n\n')}`
    );
  }
}

/**
 * 获取所有可用的规则 ID
 */
export function getAvailableRules(): string[] {
  return Object.keys(ALL_RULES);
}

/**
 * 获取当前配置
 */
export function getCurrentOptions(): Readonly<AxeHelperOptions> {
  return { ...currentOptions };
}

/**
 * 重置配置为默认值
 */
export function resetAxeConfig(): void {
  currentOptions = { ...defaultOptions };
}
