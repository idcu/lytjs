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
import { Icon } from '../src/components/Icon';
import { Badge } from '../src/components/Badge';
import { Tag } from '../src/components/Tag';
import { Spin } from '../src/components/Spin';
import { Empty } from '../src/components/Empty';
import { Link } from '../src/components/Link';
import { Container } from '../src/components/Container';
import { Divider } from '../src/components/Divider';
import { Toast } from '../src/components/Toast';
import { Alert } from '../src/components/Alert';
import { Tooltip } from '../src/components/Tooltip';
import { Checkbox } from '../src/components/Checkbox';
import { Radio } from '../src/components/Radio';
import { Switch } from '../src/components/Switch';
import { InputNumber } from '../src/components/InputNumber';

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
    expect(props.checkable).toBeDefined();
    expect(props.showCheckbox).toBeDefined();
    expect(props.draggable).toBeDefined();
    expect(props.nodeKey).toBeDefined();
    expect(props.showLine).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Tree.props;
    expect(props.defaultExpandAll.default).toBe(false);
    expect(props.checkable.default).toBe(false);
    expect(props.showCheckbox.default).toBe(false);
    expect(props.draggable.default).toBe(false);
    expect(props.nodeKey.default).toBe('id');
    expect(props.showLine.default).toBe(false);
    expect(typeof props.defaultExpandedKeys.default).toBe('function');
    expect(typeof props.defaultCheckedKeys.default).toBe('function');
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
    // 对于函数返回的默认值，我们只验证函数存在
    expect(typeof props.titles.default).toBe('function');
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
    // 对于函数返回的默认值，我们只验证函数存在
    expect(typeof props.events.default).toBe('function');
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

// ===== Icon 组件测试 =====
describe('Icon', () => {
  it('should render Icon with default props', () => {
    expect(Icon).toBeDefined();
    expect(Icon.name).toBe('LytIcon');
  });

  it('should have correct props definition', () => {
    const props = Icon.props;
    expect(props.name).toBeDefined();
    expect(props.size).toBeDefined();
    expect(props.color).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Icon.props;
    expect(props.name.default).toBe('');
    expect(props.size.default).toBe('16px');
    expect(props.color.default).toBe('');
  });
});

// ===== Badge 组件测试 =====
describe('Badge', () => {
  it('should render Badge with default props', () => {
    expect(Badge).toBeDefined();
    expect(Badge.name).toBe('LytBadge');
  });

  it('should have correct props definition', () => {
    const props = Badge.props;
    expect(props.count).toBeDefined();
    expect(props.maxCount).toBeDefined();
    expect(props.dot).toBeDefined();
    expect(props.type).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Badge.props;
    expect(props.count.default).toBe(0);
    expect(props.maxCount.default).toBe(99);
    expect(props.dot.default).toBe(false);
    expect(props.type.default).toBe('danger');
  });
});

// ===== Tag 组件测试 =====
describe('Tag', () => {
  it('should render Tag with default props', () => {
    expect(Tag).toBeDefined();
    expect(Tag.name).toBe('LytTag');
  });

  it('should have correct props definition', () => {
    const props = Tag.props;
    expect(props.type).toBeDefined();
    expect(props.closable).toBeDefined();
    expect(props.color).toBeDefined();
    expect(props.size).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Tag.props;
    expect(props.type.default).toBe('default');
    expect(props.closable.default).toBe(false);
    expect(props.color.default).toBe('');
    expect(props.size.default).toBe('medium');
  });
});

// ===== Spin 组件测试 =====
describe('Spin', () => {
  it('should render Spin with default props', () => {
    expect(Spin).toBeDefined();
    expect(Spin.name).toBe('LytSpin');
  });

  it('should have correct props definition', () => {
    const props = Spin.props;
    expect(props.spinning).toBeDefined();
    expect(props.size).toBeDefined();
    expect(props.tip).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Spin.props;
    expect(props.spinning.default).toBe(true);
    expect(props.size.default).toBe('default');
    expect(props.tip.default).toBe('');
  });
});

// ===== Empty 组件测试 =====
describe('Empty', () => {
  it('should render Empty with default props', () => {
    expect(Empty).toBeDefined();
    expect(Empty.name).toBe('LytEmpty');
  });

  it('should have correct props definition', () => {
    const props = Empty.props;
    expect(props.description).toBeDefined();
    expect(props.image).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Empty.props;
    expect(props.description.default).toBe('暂无数据');
    expect(props.image.default).toBe('');
  });
});

// ===== Link 组件测试 =====
describe('Link', () => {
  it('should render Link with default props', () => {
    expect(Link).toBeDefined();
    expect(Link.name).toBe('LytLink');
  });

  it('should have correct props definition', () => {
    const props = Link.props;
    expect(props.type).toBeDefined();
    expect(props.underline).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.href).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Link.props;
    expect(props.type.default).toBe('default');
    expect(props.underline.default).toBe(true);
    expect(props.disabled.default).toBe(false);
    expect(props.href.default).toBe('');
  });
});

// ===== Container 组件测试 =====
describe('Container', () => {
  it('should render Container with default props', () => {
    expect(Container).toBeDefined();
    expect(Container.name).toBe('LytContainer');
  });
});

// ===== Divider 组件测试 =====
describe('Divider', () => {
  it('should render Divider with default props', () => {
    expect(Divider).toBeDefined();
    expect(Divider.name).toBe('LytDivider');
  });

  it('should have correct props definition', () => {
    const props = Divider.props;
    expect(props.type).toBeDefined();
    expect(props.contentPosition).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Divider.props;
    expect(props.type.default).toBe('horizontal');
    expect(props.contentPosition.default).toBe('center');
  });
});

// ===== Toast 组件测试 =====
describe('Toast', () => {
  it('should render Toast with default props', () => {
    expect(Toast).toBeDefined();
    expect(Toast.name).toBe('LytToast');
  });

  it('should have correct props definition', () => {
    const props = Toast.props;
    expect(props.message).toBeDefined();
    expect(props.type).toBeDefined();
    expect(props.duration).toBeDefined();
    expect(props.position).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Toast.props;
    expect(props.message.default).toBe('');
    expect(props.type.default).toBe('info');
    expect(props.duration.default).toBe(3000);
    expect(props.position.default).toBe('top');
  });
});

// ===== Alert 组件测试 =====
describe('Alert', () => {
  it('should render Alert with default props', () => {
    expect(Alert).toBeDefined();
    expect(Alert.name).toBe('LytAlert');
  });

  it('should have correct props definition', () => {
    const props = Alert.props;
    expect(props.type).toBeDefined();
    expect(props.title).toBeDefined();
    expect(props.description).toBeDefined();
    expect(props.closable).toBeDefined();
    expect(props.showIcon).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Alert.props;
    expect(props.type.default).toBe('info');
    expect(props.title.default).toBe('');
    expect(props.description.default).toBe('');
    expect(props.closable.default).toBe(false);
    expect(props.showIcon.default).toBe(true);
  });
});

// ===== Tooltip 组件测试 =====
describe('Tooltip', () => {
  it('should render Tooltip with default props', () => {
    expect(Tooltip).toBeDefined();
    expect(Tooltip.name).toBe('LytTooltip');
  });

  it('should have correct props definition', () => {
    const props = Tooltip.props;
    expect(props.content).toBeDefined();
    expect(props.placement).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.trigger).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Tooltip.props;
    expect(props.content.default).toBe('');
    expect(props.placement.default).toBe('top');
    expect(props.disabled.default).toBe(false);
    expect(props.trigger.default).toBe('hover');
  });
});

// ===== Checkbox 组件测试 =====
describe('Checkbox', () => {
  it('should render Checkbox with default props', () => {
    expect(Checkbox).toBeDefined();
    expect(Checkbox.name).toBe('LytCheckbox');
  });

  it('should have correct props definition', () => {
    const props = Checkbox.props;
    expect(props.modelValue).toBeDefined();
    expect(props.label).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.checked).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Checkbox.props;
    expect(props.modelValue.default).toBe(false);
    expect(props.label.default).toBe('');
    expect(props.disabled.default).toBe(false);
    expect(props.checked.default).toBe(false);
  });
});

// ===== Radio 组件测试 =====
describe('Radio', () => {
  it('should render Radio with default props', () => {
    expect(Radio).toBeDefined();
    expect(Radio.name).toBe('LytRadio');
  });

  it('should have correct props definition', () => {
    const props = Radio.props;
    expect(props.modelValue).toBeDefined();
    expect(props.label).toBeDefined();
    expect(props.disabled).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Radio.props;
    expect(props.modelValue.default).toBeUndefined();
    expect(props.label.default).toBeUndefined();
    expect(props.disabled.default).toBe(false);
  });
});

// ===== Switch 组件测试 =====
describe('Switch', () => {
  it('should render Switch with default props', () => {
    expect(Switch).toBeDefined();
    expect(Switch.name).toBe('LytSwitch');
  });

  it('should have correct props definition', () => {
    const props = Switch.props;
    expect(props.modelValue).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.activeText).toBeDefined();
    expect(props.inactiveText).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Switch.props;
    expect(props.modelValue.default).toBe(false);
    expect(props.disabled.default).toBe(false);
    expect(props.activeText.default).toBe('');
    expect(props.inactiveText.default).toBe('');
  });
});

// ===== InputNumber 组件测试 =====
describe('InputNumber', () => {
  it('should render InputNumber with default props', () => {
    expect(InputNumber).toBeDefined();
    expect(InputNumber.name).toBe('LytInputNumber');
  });

  it('should have correct props definition', () => {
    const props = InputNumber.props;
    expect(props.modelValue).toBeDefined();
    expect(props.min).toBeDefined();
    expect(props.max).toBeDefined();
    expect(props.step).toBeDefined();
    expect(props.disabled).toBeDefined();
    expect(props.controls).toBeDefined();
    expect(props.controlsPosition).toBeDefined();
    expect(props.precision).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = InputNumber.props;
    expect(props.modelValue.default).toBeUndefined();
    expect(props.disabled.default).toBe(false);
    expect(props.controls.default).toBe(true);
    expect(props.controlsPosition.default).toBe('');
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
    expect(Icon).toBeDefined();
    expect(Badge).toBeDefined();
    expect(Tag).toBeDefined();
    expect(Spin).toBeDefined();
    expect(Empty).toBeDefined();
    expect(Link).toBeDefined();
    expect(Container).toBeDefined();
    expect(Divider).toBeDefined();
    expect(Toast).toBeDefined();
    expect(Alert).toBeDefined();
    expect(Tooltip).toBeDefined();
    expect(Checkbox).toBeDefined();
    expect(Radio).toBeDefined();
    expect(Switch).toBeDefined();
    expect(InputNumber).toBeDefined();
  });
});
