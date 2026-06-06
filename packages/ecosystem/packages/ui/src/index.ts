/**
 * @lytjs/ui - 入口文件
 *
 * LytJS UI 组件库
 */

// 导入样式
import './styles/index.css';

// 组件导出
export { Button } from './components/Button';
export { Input } from './components/Input';
export { Dialog } from './components/Dialog';
export { Select } from './components/Select';
export { Tabs, TabPane } from './components/Tabs';
export { Table } from './components/Table';
export { Form, FormItem } from './components/Form';
export { Transition, TransitionGroup } from './components/Transition';
export { DatePicker } from './components/DatePicker';
export { Tree } from './components/Tree';
export { Menu } from './components/Menu';
export { Cascader } from './components/Cascader';
export { TreeSelect } from './components/TreeSelect';
export { Transfer } from './components/Transfer';
export { Descriptions, DescriptionsItem } from './components/Descriptions';
export { Modal } from './components/Modal';
export { Drawer } from './components/Drawer';
export { Upload } from './components/Upload';
export { Notification } from './components/Notification';
export { Calendar } from './components/Calendar';
export { Image } from './components/Image';
export { Rate } from './components/Rate';
export { ColorPicker } from './components/ColorPicker';

// 新组件导出
export { Icon } from './components/Icon';
export { Badge } from './components/Badge';
export { Tag } from './components/Tag';
export { Spin } from './components/Spin';
export { Empty } from './components/Empty';
export { Link } from './components/Link';
export { Container } from './components/Container';
export { Divider } from './components/Divider';
export { Toast } from './components/Toast';
export { Alert } from './components/Alert';
export { Tooltip } from './components/Tooltip';
export { Checkbox } from './components/Checkbox';
export { CheckboxGroup } from './components/CheckboxGroup';
export { Radio } from './components/Radio';
export { RadioGroup } from './components/RadioGroup';
export { Switch } from './components/Switch';
export { InputNumber } from './components/InputNumber';
export { Progress } from './components/Progress';
export { Slider } from './components/Slider';
export { Avatar } from './components/Avatar';
export { Card } from './components/Card';
export { Timeline } from './components/Timeline';
export { TimelineItem } from './components/TimelineItem';
export { Steps } from './components/Steps';
export { Step } from './components/Step';
export { Carousel } from './components/Carousel';
export { CarouselItem } from './components/CarouselItem';
export { Popconfirm } from './components/Popconfirm';
export { RichTextEditor } from './components/RichTextEditor';

// 类型导出
export type {
  ComponentSize,
  ComponentStatus,
  ButtonProps,
  ButtonSlots,
  InputProps,
  InputSlots,
  DialogProps,
  DialogSlots,
  DialogSetupProps,
  SelectProps,
  SelectSlots,
  SelectOption,
  SelectSetupProps,
  CascaderProps,
  CascaderSlots,
  CascaderOption,
  CascaderSetupProps,
  TabsProps,
  TabsSlots,
  TabPaneProps,
  TableProps,
  TableSlots,
  TableSetupProps,
  TableColumn,
  TableData,
  TableRowData,
  IconProps,
  IconSlots,
  BadgeProps,
  BadgeSlots,
  BadgeSetupProps,
  TagProps,
  TagSlots,
  TagSetupProps,
  SpinProps,
  SpinSlots,
  EmptyProps,
  EmptySlots,
  LinkProps,
  LinkSlots,
  ContainerProps,
  ContainerSlots,
  DividerProps,
  DividerSlots,
  ToastProps,
  ToastSlots,
  ToastSetupProps,
  AlertProps,
  AlertSlots,
  AlertType,
  AlertEffect,
  AlertSetupProps,
  TooltipProps,
  TooltipSlots,
  CheckboxProps,
  CheckboxSlots,
  CheckboxSetupProps,
  RadioProps,
  RadioSlots,
  RadioSetupProps,
  SwitchProps,
  SwitchSlots,
  SwitchSetupProps,
  InputNumberProps,
  InputNumberSlots,
  InputNumberSetupProps,
  CheckboxGroupProps,
  CheckboxGroupSlots,
  CheckboxGroupSetupProps,
  RadioGroupProps,
  RadioGroupSlots,
  RadioGroupSetupProps,
  ProgressProps,
  ProgressSlots,
  ProgressSetupProps,
  SliderProps,
  SliderSlots,
  SliderSetupProps,
  AvatarProps,
  AvatarSlots,
  AvatarSetupProps,
  CardProps,
  CardSlots,
  CardSetupProps,
  TimelineProps,
  TimelineSlots,
  TimelineSetupProps,
  TimelineItemProps,
  TimelineItemSlots,
  TimelineItemSetupProps,
  StepsProps,
  StepsSlots,
  StepsSetupProps,
  StepProps,
  StepSlots,
  StepSetupProps,
  CarouselProps,
  CarouselSlots,
  CarouselSetupProps,
  CarouselItemProps,
  CarouselItemSlots,
  CarouselItemSetupProps,
  PopconfirmProps,
  PopconfirmSlots,
  PopconfirmSetupProps,
  ImageProps,
  ImageSlots,
  ImageFit,
  NotificationProps,
  NotificationSlots,
  NotificationOptions,
  NotificationType,
  NotificationPosition,
  CalendarProps,
  CalendarSlots,
  CalendarEvent,
  CalendarView,
  ColorPickerProps,
  ColorPickerSlots,
  DescriptionsProps,
  DescriptionsSlots,
  DescriptionsItemProps,
  DescriptionsItemSlots,
  DescriptionsItemData,
  DrawerProps,
  DrawerSlots,
  DrawerDirection,
  RateProps,
  RateSlots,
  TransferProps,
  TransferSlots,
  TransferOption,
  TransferSetupProps,
  TreeProps,
  TreeSlots,
  TreeNode,
  TreeSetupProps,
  TreeSelectProps,
  TreeSelectSlots,
  TreeSelectNode,
  TreeSelectSetupProps,
  UploadProps,
  UploadSlots,
  UploadFile,
  UploadFileStatus,
  UploadSetupProps,
  DatePickerProps,
  DatePickerSlots,
  DatePickerType,
  DatePickerShortcut,
  DatePickerSetupProps,
  FormProps,
  FormSlots,
  FormRule,
  FormRules,
  FormSetupProps,
  FormItemProps,
  FormItemSlots,
  FormItemSetupProps,
  FormValidateStatus,
  MenuProps,
  MenuSlots,
  MenuItem,
  MenuSetupProps,
  RichTextEditorProps,
  RichTextEditorSlots,
  RichTextEditorSetupProps,
} from './components/types';

// 导入 definePlugin
import { definePlugin } from '@lytjs/core';

// 组件导入
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Dialog } from './components/Dialog';
import { Select } from './components/Select';
import { Tabs, TabPane } from './components/Tabs';
import { Table } from './components/Table';
import { Form, FormItem } from './components/Form';
import { Transition, TransitionGroup } from './components/Transition';
import { DatePicker } from './components/DatePicker';
import { Tree } from './components/Tree';
import { Menu } from './components/Menu';
import { Cascader } from './components/Cascader';
import { TreeSelect } from './components/TreeSelect';
import { Transfer } from './components/Transfer';
import { Descriptions, DescriptionsItem } from './components/Descriptions';
import { Modal } from './components/Modal';
import { Drawer } from './components/Drawer';
import { Upload } from './components/Upload';
import { Notification } from './components/Notification';
import { Calendar } from './components/Calendar';
import { Image } from './components/Image';
import { Rate } from './components/Rate';
import { ColorPicker } from './components/ColorPicker';
import { Icon } from './components/Icon';
import { Badge } from './components/Badge';
import { Tag } from './components/Tag';
import { Spin } from './components/Spin';
import { Empty } from './components/Empty';
import { Link } from './components/Link';
import { Container } from './components/Container';
import { Divider } from './components/Divider';
import { Toast } from './components/Toast';
import { Alert } from './components/Alert';
import { Tooltip } from './components/Tooltip';
import { Checkbox } from './components/Checkbox';
import { CheckboxGroup } from './components/CheckboxGroup';
import { Radio } from './components/Radio';
import { RadioGroup } from './components/RadioGroup';
import { Switch } from './components/Switch';
import { InputNumber } from './components/InputNumber';
import { Progress } from './components/Progress';
import { Slider } from './components/Slider';
import { Avatar } from './components/Avatar';
import { Card } from './components/Card';

/**
 * 创建 LytJS UI 插件
 */
const LytUI = definePlugin({
  name: 'lytjs-ui',
  version: '6.9.6',
  description: 'LytJS 官方 UI 组件库 - 60+ 组件，支持 Vapor 和 VDOM 双模式',
  install: (app) => {
    app.component('LytButton', Button);
    app.component('LytInput', Input);
    app.component('LytDialog', Dialog);
    app.component('LytSelect', Select);
    app.component('LytTabs', Tabs);
    app.component('LytTabPane', TabPane);
    app.component('LytTable', Table);
    app.component('LytForm', Form);
    app.component('LytFormItem', FormItem);
    app.component('LytTransition', Transition);
    app.component('LytTransitionGroup', TransitionGroup);
    app.component('LytDatePicker', DatePicker);
    app.component('LytTree', Tree);
    app.component('LytMenu', Menu);
    app.component('LytCascader', Cascader);
    app.component('LytTreeSelect', TreeSelect);
    app.component('LytTransfer', Transfer);
    app.component('LytDescriptions', Descriptions);
    app.component('LytDescriptionsItem', DescriptionsItem);
    app.component('LytModal', Modal);
    app.component('LytDrawer', Drawer);
    app.component('LytUpload', Upload);
    app.component('LytNotification', Notification);
    app.component('LytCalendar', Calendar);
    app.component('LytImage', Image);
    app.component('LytRate', Rate);
    app.component('LytColorPicker', ColorPicker);
    app.component('LytIcon', Icon);
    app.component('LytBadge', Badge);
    app.component('LytTag', Tag);
    app.component('LytSpin', Spin);
    app.component('LytEmpty', Empty);
    app.component('LytLink', Link);
    app.component('LytContainer', Container);
    app.component('LytDivider', Divider);
    app.component('LytToast', Toast);
    app.component('LytAlert', Alert);
    app.component('LytTooltip', Tooltip);
    app.component('LytCheckbox', Checkbox);
    app.component('LytCheckboxGroup', CheckboxGroup);
    app.component('LytRadio', Radio);
    app.component('LytRadioGroup', RadioGroup);
    app.component('LytSwitch', Switch);
    app.component('LytInputNumber', InputNumber);
    app.component('LytProgress', Progress);
    app.component('LytSlider', Slider);
    app.component('LytAvatar', Avatar);
    app.component('LytCard', Card);
    app.component('LytTimeline', Timeline);
    app.component('LytTimelineItem', TimelineItem);
    app.component('LytSteps', Steps);
    app.component('LytStep', Step);
    app.component('LytCarousel', Carousel);
    app.component('LytCarouselItem', CarouselItem);
    app.component('LytPopconfirm', Popconfirm);
    app.component('LytRichTextEditor', RichTextEditor);
  },
});

export default LytUI;
export { LytUI };
