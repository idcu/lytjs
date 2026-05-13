/**
 * @lytjs/ui - 入口文件
 *
 * LytJS UI 组件库
 */

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
  SelectProps,
  SelectSlots,
  SelectOption,
  TabsProps,
  TabsSlots,
  TabPaneProps,
  TableProps,
  TableSlots,
  TableColumn,
} from './types';

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
}

export default {
  install,
};
