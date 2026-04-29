// src/transforms/v-slot.ts
// slot 转换逻辑

import { NodeTypes, ElementTypes } from '../constants';
import type {
  RootNode,
  TemplateChildNode,
  ElementNode,
  TransformContext,
} from '../types';
import { transformElement } from './transform-element';

export function transformSlot(node: RootNode | TemplateChildNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  if (element.tagType !== ElementTypes.SLOT && element.tag !== 'slot') return;

  context.helper('RENDER_SLOT');
  transformElement(element, context);
}
