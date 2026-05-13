/**
 * @lytjs/ui 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { Dialog } from '../src/components/Dialog';
import { Tabs, TabPane } from '../src/components/Tabs';
import { Menu } from '../src/components/Menu';
import { Table } from '../src/components/Table';
import { Tree } from '../src/components/Tree';

// ===== Button 组件测试 =====
describe('Button', () => {
  it('should render button with default props', () => {
    expect(Button).toBeDefined();
    expect(Button.name).toBe('LytButton');
  });

  it('should have correct props definition', () => {
    const props = Button.props;
    expect(props.type).toBeDefined();
    expect(props.size).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.loading).toBeDefined();
    expect(props.plain).toBeDefined();
    expect(props.round).toBeDefined();
    expect(props.circle).toBeDefined();
    expect(props.nativeType).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Button.props;
    expect(props.type.default).toBe('default');
    expect(props.size.default).toBe('medium');
    expect(props.disabled.default).toBe(false);
    expect(props.loading.default).toBe(false);
    expect(props.plain.default).toBe(false);
    expect(props.round.default).toBe(false);
    expect(props.circle.default).toBe(false);
    expect(props.nativeType.default).toBe('button');
  });
});

// ===== Input 组件测试 =====
describe('Input', () => {
  it('should render input with default props', () => {
    expect(Input).toBeDefined();
    expect(Input.name).toBe('LytInput');
  });

  it('should have correct props definition', () => {
    const props = Input.props;
    expect(props.modelValue).toBeDefined();
    expect(props.type).toBeDefined();
    expect(props.placeholder).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.readonly).toBeDefined();
    expect(props.clearable).toBeDefined();
    expect(props.showPassword).toBeDefined();
    expect(props.size).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Input.props;
    expect(props.modelValue.default).toBe('');
    expect(props.type.default).toBe('text');
    expect(props.placeholder.default).toBe('');
    expect(props.disabled.default).toBe(false);
    expect(props.readonly.default).toBe(false);
    expect(props.clearable.default).toBe(false);
    expect(props.showPassword.default).toBe(false);
    expect(props.size.default).toBe('medium');
  });
});

// ===== Dialog 组件测试 =====
describe('Dialog', () => {
  it('should render dialog with default props', () => {
    expect(Dialog).toBeDefined();
    expect(Dialog.name).toBe('LytDialog');
  });

  it('should have correct props definition', () => {
    const props = Dialog.props;
    expect(props.modelValue).toBeDefined();
    expect(props.title).toBeDefined();
    expect(props.width).toBeDefined();
    expect(props.showClose).toBeDefined();
    expect(props.closeOnClickModal).toBeDefined();
    expect(props.closeOnPressEscape).toBeDefined();
    expect(props.lockScroll).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Dialog.props;
    expect(props.modelValue.default).toBe(false);
    expect(props.title.default).toBe('');
    expect(props.width.default).toBe('50%');
    expect(props.showClose.default).toBe(true);
    expect(props.closeOnClickModal.default).toBe(true);
    expect(props.closeOnPressEscape.default).toBe(true);
    expect(props.lockScroll.default).toBe(true);
  });
});

// ===== Tabs 组件测试 =====
describe('Tabs', () => {
  it('should render Tabs with default props', () => {
    expect(Tabs).toBeDefined();
    expect(Tabs.name).toBe('LytTabs');
  });

  it('should have correct props definition', () => {
    const props = Tabs.props;
    expect(props.modelValue).toBeDefined();
    expect(props.type).toBeDefined();
    expect(props.class).toBeDefined();
    expect(props.closable).toBeDefined();
    expect(props.addable).toBeDefined();
    expect(props.editable).toBeDefined();
    expect(props.draggable).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Tabs.props;
    expect(props.modelValue.default).toBe('');
    expect(props.type.default).toBe('');
    expect(props.class.default).toBe('');
    expect(props.closable.default).toBe(false);
    expect(props.addable.default).toBe(false);
    expect(props.editable.default).toBe(false);
    expect(props.draggable.default).toBe(false);
  });
});

// ===== TabPane 组件测试 =====
describe('TabPane', () => {
  it('should render TabPane with default props', () => {
    expect(TabPane).toBeDefined();
    expect(TabPane.name).toBe('LytTabPane');
  });

  it('should have correct props definition', () => {
    const props = TabPane.props;
    expect(props.label).toBeDefined();
    expect(props.name).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.closable).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = TabPane.props;
    expect(props.disabled.default).toBe(false);
    expect(props.closable.default).toBe(false);
  });
});

// ===== Menu 组件测试 =====
describe('Menu', () => {
  it('should render Menu with default props', () => {
    expect(Menu).toBeDefined();
    expect(Menu.name).toBe('LytMenu');
  });

  it('should have correct props definition', () => {
    const props = Menu.props;
    expect(props.data).toBeDefined();
    expect(props.defaultOpenKeys).toBeDefined();
    expect(props.defaultSelectedKeys).toBeDefined();
    expect(props.mode).toBeDefined();
    expect(props.theme).toBeDefined();
    expect(props.collapsible).toBeDefined();
    expect(props.collapsed).toBeDefined();
    expect(props.onClick).toBeDefined();
    expect(props.onOpenChange).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Menu.props;
    expect(props.mode.default).toBe('vertical');
    expect(props.theme.default).toBe('light');
    expect(props.collapsible.default).toBe(false);
    expect(props.collapsed.default).toBe(false);
  });
});

// ===== Table 组件测试 =====
describe('Table', () => {
  it('should render Table with default props', () => {
    expect(Table).toBeDefined();
    expect(Table.name).toBe('LytTable');
  });

  it('should have correct props definition', () => {
    const props = Table.props;
    expect(props.data).toBeDefined();
    expect(props.columns).toBeDefined();
    expect(props.stripe).toBeDefined();
    expect(props.border).toBeDefined();
    expect(props.rowKey).toBeDefined();
    expect(props.showSelection).toBeDefined();
    expect(props.highlightCurrentRow).toBeDefined();
    expect(props.onRowClick).toBeDefined();
    expect(props.onSortChange).toBeDefined();
    expect(props.onSelectionChange).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Table.props;
    expect(props.rowKey.default).toBe('id');
    expect(props.showSelection.default).toBe(false);
    expect(props.highlightCurrentRow.default).toBe(false);
    expect(props.stripe.default).toBe(false);
    expect(props.border.default).toBe(false);
  });
});

// ===== Tree 组件测试 =====
describe('Tree', () => {
  it('should render Tree with default props', () => {
    expect(Tree).toBeDefined();
    expect(Tree.name).toBe('LytTree');
  });

  it('should have correct props definition', () => {
    const props = Tree.props;
    expect(props.data).toBeDefined();
    expect(props.defaultExpandAll).toBeDefined();
    expect(props.defaultExpandedKeys).toBeDefined();
    expect(props.defaultCheckedKeys).toBeDefined();
    expect(props.defaultSelectedKeys).toBeDefined();
    expect(props.checkable).toBeDefined();
    expect(props.showCheckbox).toBeDefined();
    expect(props.draggable).toBeDefined();
    expect(props.nodeKey).toBeDefined();
    expect(props.emptyText).toBeDefined();
    expect(props.highlightCurrent).toBeDefined();
    expect(props.showLine).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Tree.props;
    expect(props.defaultExpandAll.default).toBe(false);
    expect(props.checkable.default).toBe(false);
    expect(props.showCheckbox.default).toBe(false);
    expect(props.draggable.default).toBe(false);
    expect(props.nodeKey.default).toBe('id');
    expect(props.emptyText.default).toBe('暂无数据');
    expect(props.highlightCurrent.default).toBe(false);
    expect(props.showLine.default).toBe(false);
  });
});

// ===== 导出测试 =====
describe('exports', () => {
  it('should export all components', () => {
    expect(Button).toBeDefined();
    expect(Input).toBeDefined();
    expect(Dialog).toBeDefined();
    expect(Tabs).toBeDefined();
    expect(TabPane).toBeDefined();
    expect(Menu).toBeDefined();
    expect(Table).toBeDefined();
    expect(Tree).toBeDefined();
  });
});
