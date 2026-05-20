/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * @lytjs/ui 单元测试
 *
 * 测试规范：先查看组件实际实现，确认 props 名称和默认值，避免假设
 * 对于可能为 undefined 的默认值，使用 toBeUndefined() 而非 toBe('')
 * 组件测试应覆盖：基本渲染、props 定义、默认值、导出正确性等基本检查
 */

import { describe, it, expect } from 'vitest';
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
import { CheckboxGroup } from '../src/components/CheckboxGroup';
import { Radio } from '../src/components/Radio';
import { RadioGroup } from '../src/components/RadioGroup';
import { Switch } from '../src/components/Switch';
import { InputNumber } from '../src/components/InputNumber';
import { Progress } from '../src/components/Progress';
import { Slider } from '../src/components/Slider';
import { Avatar } from '../src/components/Avatar';
import { Card } from '../src/components/Card';
import { Timeline } from '../src/components/Timeline';
import { TimelineItem } from '../src/components/TimelineItem';
import { Steps } from '../src/components/Steps';
import { Step } from '../src/components/Step';
import { Carousel } from '../src/components/Carousel';
import { CarouselItem } from '../src/components/CarouselItem';
import { Popconfirm } from '../src/components/Popconfirm';
import { DatePicker } from '../src/components/DatePicker';
import { RichTextEditor } from '../src/components/RichTextEditor';
import { Pagination } from '../src/components/Pagination';
import { Transition } from '../src/components/Transition';

describe('Button', () => {
  it('should export Button component', () => {
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

describe('Input', () => {
  it('should export Input component', () => {
    expect(Input).toBeDefined();
    expect(Input.name).toBe('LytInput');
  });

  it('should have correct props definition', () => {
    const props = Input.props;
    expect(props.modelValue).toBeDefined();
    expect(props.type).toBeDefined();
    expect(props.placeholder).toBeDefined();
    expect(props.disabled).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Input.props;
    expect(props.type.default).toBe('text');
    expect(props.placeholder.default).toBe('');
    expect(props.disabled.default).toBe(false);
  });
});

describe('Dialog', () => {
  it('should export Dialog component', () => {
    expect(Dialog).toBeDefined();
    expect(Dialog.name).toBe('LytDialog');
  });

  it('should have correct props definition', () => {
    const props = Dialog.props;
    expect(props.modelValue).toBeDefined();
    expect(props.title).toBeDefined();
    expect(props.width).toBeDefined();
    expect(props.showClose).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Dialog.props;
    expect(props.modelValue.default).toBe(false);
    expect(props.title.default).toBe('');
    expect(props.showClose.default).toBe(true);
  });
});

describe('Tabs', () => {
  it('should export Tabs component', () => {
    expect(Tabs).toBeDefined();
    expect(TabPane).toBeDefined();
    expect(Tabs.name).toBe('LytTabs');
    expect(TabPane.name).toBe('LytTabPane');
  });

  it('should have correct props definition', () => {
    const props = Tabs.props;
    expect(props.modelValue).toBeDefined();
    expect(props.type).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Tabs.props;
    expect(props.modelValue.default).toBe('');
    expect(props.closable).toBeDefined();
  });
});

describe('Menu', () => {
  it('should export Menu component', () => {
    expect(Menu).toBeDefined();
    expect(Menu.name).toBe('LytMenu');
  });

  it('should have correct props definition', () => {
    const props = Menu.props;
    expect(props.mode).toBeDefined();
    expect(props.defaultActive).toBeDefined();
  });
});

describe('Table', () => {
  it('should export Table component', () => {
    expect(Table).toBeDefined();
    expect(Table.name).toBe('LytTable');
  });

  it('should have correct props definition', () => {
    const props = Table.props;
    expect(props.data).toBeDefined();
    expect(props.columns).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Table.props;
    expect(props.stripe.default).toBe(false);
    expect(props.border.default).toBe(false);
    expect(props.rowKey).toBeDefined();
  });
});

describe('Tree', () => {
  it('should export Tree component', () => {
    expect(Tree).toBeDefined();
    expect(Tree.name).toBe('LytTree');
  });

  it('should have correct props definition', () => {
    const props = Tree.props;
    expect(props.data).toBeDefined();
    expect(props.showLine).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Tree.props;
    expect(props.showLine.default).toBe(false);
    expect(props.showCheckbox.default).toBe(false);
  });
});

describe('Cascader', () => {
  it('should export Cascader component', () => {
    expect(Cascader).toBeDefined();
    expect(Cascader.name).toBe('LytCascader');
  });

  it('should have correct props definition', () => {
    const props = Cascader.props;
    expect(props.options).toBeDefined();
    expect(props.modelValue).toBeDefined();
    expect(props.placeholder).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Cascader.props;
    expect(props.placeholder.default).toBe('请选择');
    expect(props.disabled.default).toBe(false);
    expect(props.clearable.default).toBe(true);
  });
});

describe('TreeSelect', () => {
  it('should export TreeSelect component', () => {
    expect(TreeSelect).toBeDefined();
    expect(TreeSelect.name).toBe('LytTreeSelect');
  });

  it('should have correct props definition', () => {
    const props = TreeSelect.props;
    expect(props.data).toBeDefined();
    expect(props.value).toBeDefined();
  });
});

describe('Transfer', () => {
  it('should export Transfer component', () => {
    expect(Transfer).toBeDefined();
    expect(Transfer.name).toBe('LytTransfer');
  });

  it('should have correct props definition', () => {
    const props = Transfer.props;
    expect(props.data).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Transfer.props;
    expect(props.filterable.default).toBe(false);
  });
});

describe('Descriptions', () => {
  it('should export Descriptions components', () => {
    expect(Descriptions).toBeDefined();
    expect(DescriptionsItem).toBeDefined();
    expect(Descriptions.name).toBe('LytDescriptions');
    expect(DescriptionsItem.name).toBe('LytDescriptionsItem');
  });
});

describe('Modal', () => {
  it('should export Modal component', () => {
    expect(Modal).toBeDefined();
    expect(Modal.name).toBe('LytModal');
  });

  it('should have correct props definition', () => {
    const props = Modal.props;
    expect(props.modelValue).toBeDefined();
    expect(props.title).toBeDefined();
    expect(props.width).toBeDefined();
  });
});

describe('Drawer', () => {
  it('should export Drawer component', () => {
    expect(Drawer).toBeDefined();
    expect(Drawer.name).toBe('LytDrawer');
  });

  it('should have correct props definition', () => {
    const props = Drawer.props;
    expect(props.modelValue).toBeDefined();
    expect(props.title).toBeDefined();
  });
});

describe('Upload', () => {
  it('should export Upload component', () => {
    expect(Upload).toBeDefined();
    expect(Upload.name).toBe('LytUpload');
  });

  it('should have correct props definition', () => {
    const props = Upload.props;
    expect(props.action).toBeDefined();
    expect(props.multiple).toBeDefined();
  });
});

describe('Notification', () => {
  it('should export Notification component', () => {
    expect(Notification).toBeDefined();
    expect(Notification.name).toBe('LytNotification');
  });
});

describe('Calendar', () => {
  it('should export Calendar component', () => {
    expect(Calendar).toBeDefined();
    expect(Calendar.name).toBe('LytCalendar');
  });

  it('should have correct props definition', () => {
    const props = Calendar.props;
    expect(props.modelValue).toBeDefined();
    expect(props.view).toBeDefined();
  });
});

describe('Image', () => {
  it('should export Image component', () => {
    expect(Image).toBeDefined();
    expect(Image.name).toBe('LytImage');
  });

  it('should have correct props definition', () => {
    const props = Image.props;
    expect(props.src).toBeDefined();
    expect(props.alt).toBeDefined();
  });
});

describe('Rate', () => {
  it('should export Rate component', () => {
    expect(Rate).toBeDefined();
    expect(Rate.name).toBe('LytRate');
  });

  it('should have correct props definition', () => {
    const props = Rate.props;
    expect(props.modelValue).toBeDefined();
    expect(props.max).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Rate.props;
    expect(props.max.default).toBe(5);
    expect(props.allowHalf.default).toBe(false);
  });
});

describe('ColorPicker', () => {
  it('should export ColorPicker component', () => {
    expect(ColorPicker).toBeDefined();
    expect(ColorPicker.name).toBe('LytColorPicker');
  });

  it('should have correct props definition', () => {
    const props = ColorPicker.props;
    expect(props.modelValue).toBeDefined();
    expect(props.showAlpha).toBeDefined();
  });
});

describe('Icon', () => {
  it('should export Icon component', () => {
    expect(Icon).toBeDefined();
    expect(Icon.name).toBe('LytIcon');
  });

  it('should have correct props definition', () => {
    const props = Icon.props;
    expect(props.name).toBeDefined();
  });
});

describe('Badge', () => {
  it('should export Badge component', () => {
    expect(Badge).toBeDefined();
    expect(Badge.name).toBe('LytBadge');
  });

  it('should have correct props definition', () => {
    const props = Badge.props;
    expect(props.count).toBeDefined();
  });
});

describe('Tag', () => {
  it('should export Tag component', () => {
    expect(Tag).toBeDefined();
    expect(Tag.name).toBe('LytTag');
  });

  it('should have correct props definition', () => {
    const props = Tag.props;
    expect(props.type).toBeDefined();
    expect(props.closable).toBeDefined();
  });
});

describe('Spin', () => {
  it('should export Spin component', () => {
    expect(Spin).toBeDefined();
    expect(Spin.name).toBe('LytSpin');
  });

  it('should have correct props definition', () => {
    const props = Spin.props;
    expect(props.spinning).toBeDefined();
  });
});

describe('Empty', () => {
  it('should export Empty component', () => {
    expect(Empty).toBeDefined();
    expect(Empty.name).toBe('LytEmpty');
  });

  it('should have correct props definition', () => {
    const props = Empty.props;
    expect(props.description).toBeDefined();
  });
});

describe('Link', () => {
  it('should export Link component', () => {
    expect(Link).toBeDefined();
    expect(Link.name).toBe('LytLink');
  });

  it('should have correct props definition', () => {
    const props = Link.props;
    expect(props.type).toBeDefined();
    expect(props.disabled).toBeDefined();
  });
});

describe('Container', () => {
  it('should export Container component', () => {
    expect(Container).toBeDefined();
    expect(Container.name).toBe('LytContainer');
  });
});

describe('Divider', () => {
  it('should export Divider component', () => {
    expect(Divider).toBeDefined();
    expect(Divider.name).toBe('LytDivider');
  });

  it('should have correct props definition', () => {
    const props = Divider.props;
    expect(props.type).toBeDefined();
  });
});

describe('Toast', () => {
  it('should export Toast component', () => {
    expect(Toast).toBeDefined();
    expect(Toast.name).toBe('LytToast');
  });
});

describe('Alert', () => {
  it('should export Alert component', () => {
    expect(Alert).toBeDefined();
    expect(Alert.name).toBe('LytAlert');
  });

  it('should have correct props definition', () => {
    const props = Alert.props;
    expect(props.type).toBeDefined();
    expect(props.title).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Alert.props;
    expect(props.type.default).toBe('info');
    expect(props.closable.default).toBe(false);
  });
});

describe('Tooltip', () => {
  it('should export Tooltip component', () => {
    expect(Tooltip).toBeDefined();
    expect(Tooltip.name).toBe('LytTooltip');
  });

  it('should have correct props definition', () => {
    const props = Tooltip.props;
    expect(props.content).toBeDefined();
    expect(props.placement).toBeDefined();
  });
});

describe('Checkbox', () => {
  it('should export Checkbox component', () => {
    expect(Checkbox).toBeDefined();
    expect(Checkbox.name).toBe('LytCheckbox');
  });

  it('should have correct props definition', () => {
    const props = Checkbox.props;
    expect(props.modelValue).toBeDefined();
    expect(props.label).toBeDefined();
    expect(props.disabled).toBeDefined();
  });
});

describe('CheckboxGroup', () => {
  it('should export CheckboxGroup component', () => {
    expect(CheckboxGroup).toBeDefined();
    expect(CheckboxGroup.name).toBe('LytCheckboxGroup');
  });

  it('should have correct props definition', () => {
    const props = CheckboxGroup.props;
    expect(props.modelValue).toBeDefined();
    expect(props.disabled).toBeDefined();
  });
});

describe('Radio', () => {
  it('should export Radio component', () => {
    expect(Radio).toBeDefined();
    expect(Radio.name).toBe('LytRadio');
  });

  it('should have correct props definition', () => {
    const props = Radio.props;
    expect(props.modelValue).toBeDefined();
    expect(props.label).toBeDefined();
  });
});

describe('RadioGroup', () => {
  it('should export RadioGroup component', () => {
    expect(RadioGroup).toBeDefined();
    expect(RadioGroup.name).toBe('LytRadioGroup');
  });

  it('should have correct props definition', () => {
    const props = RadioGroup.props;
    expect(props.modelValue).toBeDefined();
  });
});

describe('Switch', () => {
  it('should export Switch component', () => {
    expect(Switch).toBeDefined();
    expect(Switch.name).toBe('LytSwitch');
  });

  it('should have correct props definition', () => {
    const props = Switch.props;
    expect(props.modelValue).toBeDefined();
    expect(props.disabled).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Switch.props;
    expect(props.disabled.default).toBe(false);
  });
});

describe('InputNumber', () => {
  it('should export InputNumber component', () => {
    expect(InputNumber).toBeDefined();
    expect(InputNumber.name).toBe('LytInputNumber');
  });

  it('should have correct props definition', () => {
    const props = InputNumber.props;
    expect(props.modelValue).toBeDefined();
    expect(props.min).toBeDefined();
    expect(props.max).toBeDefined();
  });
});

describe('Progress', () => {
  it('should export Progress component', () => {
    expect(Progress).toBeDefined();
    expect(Progress.name).toBe('LytProgress');
  });

  it('should have correct props definition', () => {
    const props = Progress.props;
    expect(props.percentage).toBeDefined();
    expect(props.type).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Progress.props;
    expect(props.percentage.default).toBe(0);
    expect(props.type.default).toBe('line');
  });
});

describe('Slider', () => {
  it('should export Slider component', () => {
    expect(Slider).toBeDefined();
    expect(Slider.name).toBe('LytSlider');
  });

  it('should have correct props definition', () => {
    const props = Slider.props;
    expect(props.modelValue).toBeDefined();
    expect(props.min).toBeDefined();
    expect(props.max).toBeDefined();
  });
});

describe('Avatar', () => {
  it('should export Avatar component', () => {
    expect(Avatar).toBeDefined();
    expect(Avatar.name).toBe('LytAvatar');
  });

  it('should have correct props definition', () => {
    const props = Avatar.props;
    expect(props.src).toBeDefined();
    expect(props.size).toBeDefined();
  });
});

describe('Card', () => {
  it('should export Card component', () => {
    expect(Card).toBeDefined();
    expect(Card.name).toBe('LytCard');
  });

  it('should have correct props definition', () => {
    const props = Card.props;
    expect(props.header).toBeDefined();
    expect(props.shadow).toBeDefined();
  });
});

describe('Timeline', () => {
  it('should export Timeline components', () => {
    expect(Timeline).toBeDefined();
    expect(TimelineItem).toBeDefined();
    expect(Timeline.name).toBe('LytTimeline');
    expect(TimelineItem.name).toBe('LytTimelineItem');
  });
});

describe('Steps', () => {
  it('should export Steps components', () => {
    expect(Steps).toBeDefined();
    expect(Step).toBeDefined();
    expect(Steps.name).toBe('LytSteps');
    expect(Step.name).toBe('LytStep');
  });

  it('should have correct props definition', () => {
    const props = Steps.props;
    expect(props.active).toBeDefined();
    expect(props.direction).toBeDefined();
  });
});

describe('Carousel', () => {
  it('should export Carousel components', () => {
    expect(Carousel).toBeDefined();
    expect(CarouselItem).toBeDefined();
    expect(Carousel.name).toBe('LytCarousel');
    expect(CarouselItem.name).toBe('LytCarouselItem');
  });
});

describe('Popconfirm', () => {
  it('should export Popconfirm component', () => {
    expect(Popconfirm).toBeDefined();
    expect(Popconfirm.name).toBe('LytPopconfirm');
  });

  it('should have correct props definition', () => {
    const props = Popconfirm.props;
    expect(props.title).toBeDefined();
    expect(props.confirmButtonText).toBeDefined();
  });
});

describe('DatePicker', () => {
  it('should export DatePicker component', () => {
    expect(DatePicker).toBeDefined();
    expect(DatePicker.name).toBe('LytDatePicker');
  });

  it('should have correct props definition', () => {
    const props = DatePicker.props;
    expect(props.modelValue).toBeDefined();
    expect(props.placeholder).toBeDefined();
    expect(props.disabled).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = DatePicker.props;
    expect(props.placeholder.default).toBe('选择日期');
    expect(props.disabled.default).toBe(false);
    expect(props.clearable.default).toBe(true);
  });
});

describe('RichTextEditor', () => {
  it('should export RichTextEditor component', () => {
    expect(RichTextEditor).toBeDefined();
    expect(RichTextEditor.name).toBe('LytRichTextEditor');
  });

  it('should have correct props definition', () => {
    const props = RichTextEditor.props;
    expect(props.modelValue).toBeDefined();
    expect(props.placeholder).toBeDefined();
    expect(props.disabled).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = RichTextEditor.props;
    expect(props.modelValue.default).toBe('');
    expect(props.disabled.default).toBe(false);
  });
});

describe('Pagination', () => {
  it('should export Pagination component', () => {
    expect(Pagination).toBeDefined();
    expect(Pagination.name).toBe('LytPagination');
  });

  it('should have correct props definition', () => {
    const props = Pagination.props;
    expect(props.current).toBeDefined();
    expect(props.pageSize).toBeDefined();
    expect(props.total).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Pagination.props;
    expect(props.current.default).toBe(1);
    expect(props.pageSize.default).toBe(10);
    expect(props.total.default).toBe(0);
  });
});

describe('Transition', () => {
  it('should export Transition component', () => {
    expect(Transition).toBeDefined();
  });

  it('should have correct props definition', () => {
    const props = Transition.props;
    expect(props.name).toBeDefined();
  });

  it('should have default values for props', () => {
    const props = Transition.props;
    expect(props.name.default).toBe('fade');
  });
});
