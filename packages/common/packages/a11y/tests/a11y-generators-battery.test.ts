// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/common-a11y` 的**属性生成器与键盘导航**（`src/index.ts`，550 行）
 *
 * ## 为什么要有这条
 *
 * 同目录 `tests/index.test.ts` 只覆盖 8 个函数（`isFocusable` / `getFocusableElements` /
 * `focusTrap` / `manageFocus` / `getAriaProps` / `setAriaProps` / `assertActiveElement` / `ARIA_ROLES`）；
 * 而 **13 个 `get*Props` 生成器 + `mergeA11yProps` + `getNextEnabledIndex` + `handleListKeydown`
 * 一条判据都没有** —— 实测该文件 40.3% 覆盖、218 条语句未覆盖，缺口就在这一半。
 *
 * 这些生成器是**所有 UI 组件无障碍属性的唯一来源**（role / aria-* / tabindex），
 * 写错一个就等于一整类组件的可访问性坏掉。
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getTabIndex,
  getButtonA11yProps,
  getFormControlA11yProps,
  getInputControlA11yProps,
  getSwitchA11yProps,
  getComboboxA11yProps,
  getOptionA11yProps,
  getSliderA11yProps,
  getSpinbuttonA11yProps,
  getTablistA11yProps,
  getTabA11yProps,
  getTabpanelA11yProps,
  getDialogA11yProps,
  getGroupA11yProps,
  mergeA11yProps,
  getNextEnabledIndex,
  handleListKeydown,
  isFocusable,
  getFocusableElements,
} from '../src/index';

// ==================== tabindex ====================

describe('getTabIndex', () => {
  it('显式 customTabIndex 优先于 disabled', () => {
    expect(getTabIndex(true, 3)).toBe(3);
    expect(getTabIndex(false, 3)).toBe(3);
  });

  it('未给 customTabIndex：禁用 ⇒ -1，否则 0', () => {
    expect(getTabIndex(true)).toBe(-1);
    expect(getTabIndex(false)).toBe(0);
  });
});

// ==================== 属性生成器 ====================

describe('getButtonA11yProps', () => {
  it('role=button，默认 tabindex=0，aria-disabled 不填', () => {
    const p = getButtonA11yProps({});

    expect(p.role).toBe('button');
    expect(p.tabindex).toBe(0);
    expect(p['aria-disabled']).toBeUndefined();
  });

  it('disabled ⇒ aria-disabled=true 且 tabindex=-1', () => {
    const p = getButtonA11yProps({ disabled: true });

    expect(p['aria-disabled']).toBe(true);
    expect(p.tabindex).toBe(-1);
  });

  it('ariaPressed 透传；id / aria-label 透传', () => {
    const p = getButtonA11yProps({ ariaPressed: true, ariaLabel: 'ok', id: 'b1' });

    expect(p['aria-pressed']).toBe(true);
    expect(p['aria-label']).toBe('ok');
    expect(p.id).toBe('b1');
  });
});

describe('getFormControlA11yProps', () => {
  it('required / invalid 有两条来源，显式 aria-* 优先', () => {
    expect(getFormControlA11yProps({ required: true })['aria-required']).toBe(true);
    expect(getFormControlA11yProps({ ariaRequired: false, required: true })['aria-required']).toBe(
      false,
    );
    expect(getFormControlA11yProps({ invalid: true })['aria-invalid']).toBe(true);
    expect(getFormControlA11yProps({ ariaInvalid: false, invalid: true })['aria-invalid']).toBe(
      false,
    );
  });

  it('disabled ⇒ tabindex=-1', () => {
    expect(getFormControlA11yProps({ disabled: true }).tabindex).toBe(-1);
  });
});

describe('getInputControlA11yProps', () => {
  it('在表单属性之上补 aria-checked（支持 mixed）', () => {
    const p = getInputControlA11yProps({ checked: 'mixed', required: true });

    expect(p['aria-checked']).toBe('mixed');
    expect(p['aria-required']).toBe(true);
  });
});

describe('getSwitchA11yProps', () => {
  it('role=switch 且 aria-checked 不被表单属性覆盖', () => {
    const p = getSwitchA11yProps({ checked: true });

    expect(p.role).toBe('switch');
    expect(p['aria-checked']).toBe(true);
  });
});

describe('getComboboxA11yProps', () => {
  it('role=combobox + aria-haspopup=listbox；controls 两种来源', () => {
    const p = getComboboxA11yProps({ expanded: true, controls: 'list-1' });

    expect(p.role).toBe('combobox');
    expect(p['aria-expanded']).toBe(true);
    expect(p['aria-controls']).toBe('list-1');
    expect(p['aria-haspopup']).toBe('listbox');
  });

  it('ariaControls 优先于 controls', () => {
    expect(getComboboxA11yProps({ ariaControls: 'a', controls: 'b' })['aria-controls']).toBe('a');
  });
});

describe('getOptionA11yProps', () => {
  it('role=option，选中项 tabindex=0、禁用项 -1', () => {
    expect(getOptionA11yProps({ selected: true }).tabindex).toBe(0);
    expect(getOptionA11yProps({ disabled: true }).tabindex).toBe(-1);
    expect(getOptionA11yProps({ selected: true })['aria-selected']).toBe(true);
  });
});

describe('getSliderA11yProps / getSpinbuttonA11yProps', () => {
  it('滑块：role=slider + valuenow/min/max', () => {
    const p = getSliderA11yProps({ value: 50, min: 0, max: 100 });

    expect(p.role).toBe('slider');
    expect(p['aria-valuenow']).toBe(50);
    expect(p['aria-valuemin']).toBe(0);
    expect(p['aria-valuemax']).toBe(100);
  });

  it('数字输入：role=spinbutton + valuenow/min/max', () => {
    const p = getSpinbuttonA11yProps({ value: '7', min: 1, max: 9 });

    expect(p.role).toBe('spinbutton');
    expect(p['aria-valuenow']).toBe('7');
    expect(p['aria-valuemax']).toBe(9);
  });
});

describe('标签页三件套', () => {
  it('tablist：role + aria-label 支持 label 回退', () => {
    expect(getTablistA11yProps({ label: 'Tabs' })['aria-label']).toBe('Tabs');
    expect(getTablistA11yProps({ ariaLabel: 'A', label: 'B' })['aria-label']).toBe('A');
    expect(getTablistA11yProps({}).role).toBe('tablist');
  });

  it('tab：选中项 tabindex=0，未选中 -1（roving tabindex）', () => {
    expect(getTabA11yProps({ selected: true }).tabindex).toBe(0);
    expect(getTabA11yProps({ selected: false }).tabindex).toBe(-1);
    expect(getTabA11yProps({ controls: 'p1' })['aria-controls']).toBe('p1');
  });

  it('tabpanel：labelledBy 回退', () => {
    expect(getTabpanelA11yProps({ labelledBy: 't1' })['aria-labelledby']).toBe('t1');
    expect(getTabpanelA11yProps({ ariaLabelledBy: 'x', labelledBy: 'y' })['aria-labelledby']).toBe(
      'x',
    );
  });
});

describe('getDialogA11yProps / getGroupA11yProps', () => {
  it('对话框：aria-modal 默认 true，可被 modal:false 关掉', () => {
    expect(getDialogA11yProps({})['aria-modal']).toBe(true);
    expect(getDialogA11yProps({ modal: false })['aria-modal']).toBe(false);
    expect(getDialogA11yProps({ ariaModal: false, modal: true })['aria-modal']).toBe(false);
  });

  it('对话框：labelledBy / describedBy 回退', () => {
    const p = getDialogA11yProps({ labelledBy: 'l', describedBy: 'd' });

    expect(p['aria-labelledby']).toBe('l');
    expect(p['aria-describedby']).toBe('d');
  });

  it('分组：role 默认 group，可指定 radiogroup', () => {
    expect(getGroupA11yProps({}).role).toBe('group');
    expect(getGroupA11yProps({ role: 'radiogroup' }).role).toBe('radiogroup');
    expect(getGroupA11yProps({ label: 'L' })['aria-label']).toBe('L');
  });
});

// ==================== 合并 ====================

describe('mergeA11yProps', () => {
  it('后者覆盖前者', () => {
    expect(mergeA11yProps({ role: 'a' }, { role: 'b' })).toEqual({ role: 'b' });
  });

  it('丢弃 undefined / null（不产生 aria-x="undefined" 这类脏属性）', () => {
    expect(mergeA11yProps({ a: 1, b: undefined, c: null })).toEqual({ a: 1 });
  });

  it('不修改入参', () => {
    const src = { role: 'x' };
    mergeA11yProps(src, { role: 'y' });
    expect(src.role).toBe('x');
  });
});

// ==================== 键盘导航 ====================

describe('getNextEnabledIndex', () => {
  const all = (): boolean => true;

  it('向前/向后步进', () => {
    expect(getNextEnabledIndex(0, 3, all, 'forward')).toBe(1);
    expect(getNextEnabledIndex(2, 3, all, 'backward')).toBe(1);
  });

  it('两端循环', () => {
    expect(getNextEnabledIndex(2, 3, all, 'forward')).toBe(0);
    expect(getNextEnabledIndex(0, 3, all, 'backward')).toBe(2);
  });

  it('跳过禁用项', () => {
    const enabled = (i: number) => i === 2;
    expect(getNextEnabledIndex(0, 3, enabled, 'forward')).toBe(2);
  });

  it('全部禁用 ⇒ 停在原位', () => {
    expect(getNextEnabledIndex(1, 3, () => false, 'forward')).toBe(1);
  });

  it('★ 列表为空（totalItems=0）不应返回 NaN', () => {
    expect(getNextEnabledIndex(0, 0, all)).toBe(0);
    expect(Number.isNaN(getNextEnabledIndex(0, 0, all))).toBe(false);
  });
});

describe('handleListKeydown', () => {
  const makeEvent = (key: string) => {
    const ev = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
    return ev;
  };

  const run = (key: string, currentIndex = 0, total = 3, enabled = (_i: number) => true) => {
    const selected: number[] = [];
    const onClose = vi.fn();
    const ev = makeEvent(key);
    handleListKeydown(ev, currentIndex, total, enabled, (i) => selected.push(i), onClose);
    return { selected, onClose, ev };
  };

  it('ArrowDown / ArrowRight ⇒ 向前', () => {
    expect(run('ArrowDown').selected).toEqual([1]);
    expect(run('ArrowRight').selected).toEqual([1]);
  });

  it('ArrowUp / ArrowLeft ⇒ 向后', () => {
    expect(run('ArrowUp', 1).selected).toEqual([0]);
    expect(run('ArrowLeft', 1).selected).toEqual([0]);
  });

  it('Home ⇒ 第一个启用项；End ⇒ 最后一个启用项', () => {
    expect(run('Home', 2, 3, (i) => i !== 0).selected).toEqual([1]);
    expect(run('End', 0, 3, (i) => i !== 2).selected).toEqual([1]);
  });

  it('Enter / 空格 ⇒ 选中当前项（仅当启用）', () => {
    expect(run('Enter', 1).selected).toEqual([1]);
    expect(run(' ', 1).selected).toEqual([1]);
    expect(run('Enter', 1, 3, () => false).selected).toEqual([]);
  });

  it('Escape ⇒ 关闭', () => {
    const { onClose } = run('Escape');
    expect(onClose).toHaveBeenCalled();
  });

  it('已处理的键会 preventDefault；未处理的键什么都不做', () => {
    expect(run('ArrowDown').ev.defaultPrevented).toBe(true);

    const { selected, onClose, ev } = run('a');
    expect(selected).toEqual([]);
    expect(onClose).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });
});

// ==================== 可聚焦判定（含隐藏输入） ====================

describe('isFocusable / getFocusableElements：真实可聚焦语义', () => {
  it('★ `input[type=hidden]` 不是可聚焦元素', () => {
    // 隐藏输入在浏览器里 `.focus()` 是**空操作**；若被算作可聚焦，它会成为焦点陷阱的
    // `firstElement` ⇒ 初始焦点落空、焦点仍停在对话框外。
    const el = document.createElement('input');
    el.type = 'hidden';

    expect(isFocusable(el)).toBe(false);
  });

  it('★ `getFocusableElements` 不应把隐藏输入算进来', () => {
    const container = document.createElement('div');
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    const btn = document.createElement('button');
    container.append(hidden, btn);

    expect(getFocusableElements(container)).toEqual([btn]);
  });

  it('★ 无 href 的 <a> 不是可聚焦元素', () => {
    const el = document.createElement('a');

    expect(isFocusable(el)).toBe(false);
  });

  it('有 href 的 <a> 仍可聚焦', () => {
    const el = document.createElement('a');
    el.setAttribute('href', '#');

    expect(isFocusable(el)).toBe(true);
  });
});
