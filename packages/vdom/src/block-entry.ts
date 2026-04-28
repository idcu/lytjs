/**
 * @lytjs/vdom/block — Block Tree 子路径入口
 *
 * 按需导入 Block Tree 相关 API：
 *   import { openBlock, closeBlock, createBlock, trackDynamicChild, isBlock } from '@lytjs/vdom/block'
 */

export {
  openBlock,
  closeBlock,
  createBlock,
  trackDynamicChild,
  isBlock,
} from './block';
export type { Block } from './block';
