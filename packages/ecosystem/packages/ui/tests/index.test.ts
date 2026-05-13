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
import { Cascader } from '../src/components/Cascader';
import { TreeSelect } from '../src/components/TreeSelect';
import { Transfer } from '../src/components/Transfer';
import { Descriptions, DescriptionsItem } from '../src/components/Descriptions';
import { Modal } from '../src/components/Modal';
import { Drawer } from '../src/components/Drawer';
import { Upload } from '../src/components/Upload';
import { Notification } from '../src/components/Notification';
import { Calendar } from '../src/components/Calendar';
import { Image } from '../src/components/Image';
import { Rate } from '../src/components/Rate';
import { ColorPicker } from '../src/components/ColorPicker';

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

// ===== Cascader 组件测试 =====
describe('Cascader', () => {
  it('should render Cascader with default props', () => {
    expect(Cascader).toBeDefined();
    expect(Cascader.name).toBe('LytCascader');
  });

  it('should have correct props definition', () => {
    const props = Cascader.props;
    expect(props.options).toBeDefined();
    expect(props.modelValue).toBeDefined();
    expect(props.placeholder).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.clearable).toBeDefined();
    expect(props.multiple).toBeDefined();
    expect(props.filterable).toBeDefined();
    expect(props.checkStrictly).toBeDefined();
    expect(props.showAllLevels).toBeDefined();
    expect(props.collapseTags).toBeDefined();
    expect(props.separator).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Cascader.props;
    expect(props.placeholder.default).toBe('请选择');
    expect(props.disabled.default).toBe(false);
    expect(props.clearable.default).toBe(true);
    expect(props.multiple.default).toBe(false);
    expect(props.filterable.default).toBe(false);
    expect(props.checkStrictly.default).toBe(false);
    expect(props.showAllLevels.default).toBe(true);
    expect(props.collapseTags.default).toBe(false);
    expect(props.separator.default).toBe(' / ');
  });
});

// ===== TreeSelect 组件测试 =====
describe('TreeSelect', () => {
  it('should render TreeSelect with default props', () => {
    expect(TreeSelect).toBeDefined();
    expect(TreeSelect.name).toBe('LytTreeSelect');
  });

  it('should have correct props definition', () => {
    const props = TreeSelect.props;
    expect(props.data).toBeDefined();
    expect(props.modelValue).toBeDefined();
    expect(props.placeholder).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.clearable).toBeDefined();
    expect(props.multiple).toBeDefined();
    expect(props.nodeKey).toBeDefined();
    expect(props.defaultExpandAll).toBeDefined();
    expect(props.defaultExpandedKeys).toBeDefined();
    expect(props.load).toBeDefined();
    expect(props.onChange).toBeDefined();
    expect(props.onExpand).toBeDefined();
    expect(props.onVisibleChange).toBeDefined();
    expect(props.onClear).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = TreeSelect.props;
    expect(props.placeholder.default).toBe('请选择');
    expect(props.disabled.default).toBe(false);
    expect(props.clearable.default).toBe(true);
    expect(props.multiple.default).toBe(false);
    expect(props.nodeKey.default).toBe('value');
    expect(props.defaultExpandAll.default).toBe(false);
  });
});

// ===== Transfer 组件测试 =====
describe('Transfer', () => {
  it('should render Transfer with default props', () => {
    expect(Transfer).toBeDefined();
    expect(Transfer.name).toBe('LytTransfer');
  });

  it('should have correct props definition', () => {
    const props = Transfer.props;
    expect(props.data).toBeDefined();
    expect(props.modelValue).toBeDefined();
    expect(props.filterable).toBeDefined();
    expect(props.filterPlaceholder).toBeDefined();
    expect(props.titles).toBeDefined();
    expect(props.buttonTexts).toBeDefined();
    expect(props.leftDefaultChecked).toBeDefined();
    expect(props.rightDefaultChecked).toBeDefined();
    expect(props.onChange).toBeDefined();
    expect(props.onLeftCheckChange).toBeDefined();
    expect(props.onRightCheckChange).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Transfer.props;
    expect(props.filterable.default).toBe(false);
    expect(props.filterPlaceholder.default).toBe('请输入搜索内容');
    expect(props.titles.default).toEqual(['源列表', '目标列表']);
  });
});

// ===== Descriptions 组件测试 =====
describe('Descriptions', () => {
  it('should render Descriptions with default props', () => {
    expect(Descriptions).toBeDefined();
    expect(Descriptions.name).toBe('LytDescriptions');
  });

  it('should have correct props definition', () => {
    const props = Descriptions.props;
    expect(props.title).toBeDefined();
    expect(props.column).toBeDefined();
    expect(props.border).toBeDefined();
    expect(props.size).toBeDefined();
    expect(props.layout).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Descriptions.props;
    expect(props.column.default).toBe(3);
    expect(props.border.default).toBe(false);
    expect(props.size.default).toBe('medium');
    expect(props.layout.default).toBe('horizontal');
  });
});

describe('DescriptionsItem', () => {
  it('should render DescriptionsItem with default props', () => {
    expect(DescriptionsItem).toBeDefined();
    expect(DescriptionsItem.name).toBe('LytDescriptionsItem');
  });

  it('should have correct props definition', () => {
    const props = DescriptionsItem.props;
    expect(props.label).toBeDefined();
    expect(props.span).toBeDefined();
    expect(props.labelStyle).toBeDefined();
    expect(props.contentStyle).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = DescriptionsItem.props;
    expect(props.span.default).toBe(1);
  });
});

// ===== Modal 组件测试 =====
describe('Modal', () => {
  it('should render Modal with default props', () => {
    expect(Modal).toBeDefined();
    expect(Modal.name).toBe('LytModal');
  });

  it('should have correct props definition', () => {
    const props = Modal.props;
    expect(props.modelValue).toBeDefined();
    expect(props.title).toBeDefined();
    expect(props.width).toBeDefined();
    expect(props.top).toBeDefined();
    expect(props.showClose).toBeDefined();
    expect(props.closeOnClickModal).toBeDefined();
    expect(props.closeOnPressEscape).toBeDefined();
    expect(props.lockScroll).toBeDefined();
    expect(props.draggable).toBeDefined();
    expect(props.fullscreen).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Modal.props;
    expect(props.modelValue.default).toBe(false);
    expect(props.title.default).toBe('');
    expect(props.width.default).toBe('50%');
    expect(props.top.default).toBe('15vh');
    expect(props.showClose.default).toBe(true);
    expect(props.closeOnClickModal.default).toBe(true);
    expect(props.closeOnPressEscape.default).toBe(true);
    expect(props.lockScroll.default).toBe(true);
    expect(props.draggable.default).toBe(false);
    expect(props.fullscreen.default).toBe(false);
  });
});

// ===== Drawer 组件测试 =====
describe('Drawer', () => {
  it('should render Drawer with default props', () => {
    expect(Drawer).toBeDefined();
    expect(Drawer.name).toBe('LytDrawer');
  });

  it('should have correct props definition', () => {
    const props = Drawer.props;
    expect(props.modelValue).toBeDefined();
    expect(props.title).toBeDefined();
    expect(props.size).toBeDefined();
    expect(props.direction).toBeDefined();
    expect(props.showClose).toBeDefined();
    expect(props.closeOnClickModal).toBeDefined();
    expect(props.closeOnPressEscape).toBeDefined();
    expect(props.lockScroll).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Drawer.props;
    expect(props.modelValue.default).toBe(false);
    expect(props.title.default).toBe('');
    expect(props.size.default).toBe('30%');
    expect(props.direction.default).toBe('rtl');
    expect(props.showClose.default).toBe(true);
    expect(props.closeOnClickModal.default).toBe(true);
    expect(props.closeOnPressEscape.default).toBe(true);
    expect(props.lockScroll.default).toBe(true);
  });
});

// ===== Upload 组件测试 =====
describe('Upload', () => {
  it('should render Upload with default props', () => {
    expect(Upload).toBeDefined();
    expect(Upload.name).toBe('LytUpload');
  });

  it('should have correct props definition', () => {
    const props = Upload.props;
    expect(props.action).toBeDefined();
    expect(props.multiple).toBeDefined();
    expect(props.accept).toBeDefined();
    expect(props.drag).toBeDefined();
    expect(props.listType).toBeDefined();
    expect(props.autoUpload).toBeDefined();
    expect(props.limit).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.withCredentials).toBeDefined();
    expect(props.chunkSize).toBeDefined();
    expect(props.showFileList).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Upload.props;
    expect(props.multiple.default).toBe(false);
    expect(props.drag.default).toBe(false);
    expect(props.listType.default).toBe('text');
    expect(props.autoUpload.default).toBe(true);
    expect(props.disabled.default).toBe(false);
    expect(props.withCredentials.default).toBe(false);
    expect(props.chunkSize.default).toBe(10 * 1024 * 1024);
    expect(props.showFileList.default).toBe(true);
  });
});

// ===== Notification 组件测试 =====
describe('Notification', () => {
  it('should render Notification with default props', () => {
    expect(Notification).toBeDefined();
    expect(Notification.name).toBe('LytNotification');
  });

  it('should have correct props definition', () => {
    const props = Notification.props;
    expect(props.position).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Notification.props;
    expect(props.position.default).toBe('top-right');
  });

  it('should have static methods', () => {
    expect(Notification.open).toBeDefined();
    expect(Notification.success).toBeDefined();
    expect(Notification.warning).toBeDefined();
    expect(Notification.error).toBeDefined();
    expect(Notification.info).toBeDefined();
    expect(Notification.close).toBeDefined();
    expect(Notification.closeAll).toBeDefined();
  });
});

// ===== Calendar 组件测试 =====
describe('Calendar', () => {
  it('should render Calendar with default props', () => {
    expect(Calendar).toBeDefined();
    expect(Calendar.name).toBe('LytCalendar');
  });

  it('should have correct props definition', () => {
    const props = Calendar.props;
    expect(props.modelValue).toBeDefined();
    expect(props.view).toBeDefined();
    expect(props.events).toBeDefined();
    expect(props.disabledDates).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Calendar.props;
    expect(props.view.default).toBe('month');
    expect(props.events.default).toEqual([]);
  });
});

// ===== Image 组件测试 =====
describe('Image', () => {
  it('should render Image with default props', () => {
    expect(Image).toBeDefined();
    expect(Image.name).toBe('LytImage');
  });

  it('should have correct props definition', () => {
    const props = Image.props;
    expect(props.src).toBeDefined();
    expect(props.fit).toBeDefined();
    expect(props.lazy).toBeDefined();
    expect(props.preview).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Image.props;
    expect(props.src.default).toBe('');
    expect(props.fit.default).toBe('cover');
    expect(props.lazy.default).toBe(false);
    expect(props.preview.default).toBe(true);
  });
});

// ===== Rate 组件测试 =====
describe('Rate', () => {
  it('should render Rate with default props', () => {
    expect(Rate).toBeDefined();
    expect(Rate.name).toBe('LytRate');
  });

  it('should have correct props definition', () => {
    const props = Rate.props;
    expect(props.modelValue).toBeDefined();
    expect(props.max).toBeDefined();
    expect(props.allowHalf).toBeDefined();
    expect(props.readonly).toBeDefined();
    expect(props.disabled).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Rate.props;
    expect(props.modelValue.default).toBe(0);
    expect(props.max.default).toBe(5);
    expect(props.allowHalf.default).toBe(false);
    expect(props.readonly.default).toBe(false);
    expect(props.disabled.default).toBe(false);
  });
});

// ===== ColorPicker 组件测试 =====
describe('ColorPicker', () => {
  it('should render ColorPicker with default props', () => {
    expect(ColorPicker).toBeDefined();
    expect(ColorPicker.name).toBe('LytColorPicker');
  });

  it('should have correct props definition', () => {
    const props = ColorPicker.props;
    expect(props.modelValue).toBeDefined();
    expect(props.showAlpha).toBeDefined();
    expect(props.showClear).toBeDefined();
    expect(props.showPreset).toBeDefined();
    expect(props.showHistory).toBeDefined();
    expect(props.presets).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = ColorPicker.props;
    expect(props.modelValue.default).toBe('#409eff');
    expect(props.showAlpha.default).toBe(false);
    expect(props.showClear.default).toBe(true);
    expect(props.showPreset.default).toBe(true);
    expect(props.showHistory.default).toBe(true);
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
    expect(Cascader).toBeDefined();
    expect(TreeSelect).toBeDefined();
    expect(Transfer).toBeDefined();
    expect(Descriptions).toBeDefined();
    expect(DescriptionsItem).toBeDefined();
    expect(Modal).toBeDefined();
    expect(Drawer).toBeDefined();
    expect(Upload).toBeDefined();
    expect(Notification).toBeDefined();
    expect(Calendar).toBeDefined();
    expect(Image).toBeDefined();
    expect(Rate).toBeDefined();
    expect(ColorPicker).toBeDefined();
  });
});
