/**
 * @lytjs/ui - 入口文件
 *
 * LytJS UI 组件库
 */

// 组件导出
export { Button } from './components/Button';
export { Input } from './components/Input';
export { Dialog } from './components/Dialog';

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
} from './types';

// 组件安装
import type { AppContext } from '@lytjs/component';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Dialog } from './components/Dialog';

/**
 * 安装所有组件
 */
export function install(app: AppContext): void {
  app.components['LytButton'] = Button;
  app.components['LytInput'] = Input;
  app.components['LytDialog'] = Dialog;
}

export default {
  install,
};
