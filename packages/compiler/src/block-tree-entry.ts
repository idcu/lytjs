/**
 * Lyt.js 模板编译器 — 块树 (Block Tree) 子路径入口
 *
 * import { createBlock, createVNode, ... } from '@lytjs/compiler/block-tree'
 */

export {
  createBlock,
  createVNode,
  enterBlock,
  exitBlock,
  getCurrentBlock,
  trackDynamicChild,
  traverseBlockChildren,
  countDynamicChildren,
} from './block-tree';
export type { Block, VNode } from './block-tree';
