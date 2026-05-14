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
} from './components/types';

// 组件安装
import type { AppContext } from '@lytjs/component';
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
 * 安装所有组件
 */
export function install(app: AppContext): void {
  app.components['LytButton'] = Button;
  app.components['LytInput'] = Input;
  app.components['LytDialog'] = Dialog;
  app.components['LytSelect'] = Select;
  app.components['LytTabs'] = Tabs;
  app.components['LytTabPane'] = TabPane;
  app.components['LytTable'] = Table;
  app.components['LytForm'] = Form;
  app.components['LytFormItem'] = FormItem;
  app.components['LytTransition'] = Transition;
  app.components['LytTransitionGroup'] = TransitionGroup;
  app.components['LytDatePicker'] = DatePicker;
  app.components['LytTree'] = Tree;
  app.components['LytMenu'] = Menu;
  app.components['LytCascader'] = Cascader;
  app.components['LytTreeSelect'] = TreeSelect;
  app.components['LytTransfer'] = Transfer;
  app.components['LytDescriptions'] = Descriptions;
  app.components['LytDescriptionsItem'] = DescriptionsItem;
  app.components['LytModal'] = Modal;
  app.components['LytDrawer'] = Drawer;
  app.components['LytUpload'] = Upload;
  app.components['LytNotification'] = Notification;
  app.components['LytCalendar'] = Calendar;
  app.components['LytImage'] = Image;
  app.components['LytRate'] = Rate;
  app.components['LytColorPicker'] = ColorPicker;
  // 新组件
  app.components['LytIcon'] = Icon;
  app.components['LytBadge'] = Badge;
  app.components['LytTag'] = Tag;
  app.components['LytSpin'] = Spin;
  app.components['LytEmpty'] = Empty;
  app.components['LytLink'] = Link;
  app.components['LytContainer'] = Container;
  app.components['LytDivider'] = Divider;
  app.components['LytToast'] = Toast;
  app.components['LytAlert'] = Alert;
  app.components['LytTooltip'] = Tooltip;
  app.components['LytCheckbox'] = Checkbox;
  app.components['LytCheckboxGroup'] = CheckboxGroup;
  app.components['LytRadio'] = Radio;
  app.components['LytRadioGroup'] = RadioGroup;
  app.components['LytSwitch'] = Switch;
  app.components['LytInputNumber'] = InputNumber;
  app.components['LytProgress'] = Progress;
  app.components['LytSlider'] = Slider;
  app.components['LytAvatar'] = Avatar;
  app.components['LytCard'] = Card;
}

export default {
  install,
};
