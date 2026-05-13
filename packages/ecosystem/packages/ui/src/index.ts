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
}

export default {
  install,
};
