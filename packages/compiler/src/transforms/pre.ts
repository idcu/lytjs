// src/transforms/pre.ts
// v-pre 指令转换：跳过该元素及其子树的编译

import { NodeTypes } from '../constants';
import type { NodeTransform } from '../types';
import type { ElementNode, InterpolationNode, TemplateChildNode } from '../types';
import { findDirective } from './helpers';
import { createText } from '../ast';

/**
 * `v-pre`：**跳过该元素及其子树的编译** —— 保留 `{{ }}` 字面量，不做插值。
 *
 * 必须排在其它 nodeTransform **之前**：在 enter 阶段就把子树里的插值节点
 * 还原为纯文本，后续遍历与 codegen 自然不会再把它当作动态绑定。
 */
export const transformPre: NodeTransform = (node) => {
  if (node.type !== NodeTypes.ELEMENT) return;
  const element = node as ElementNode;

  const preDir = findDirective(element, 'pre');
  if (!preDir) return;

  // 移除指令本身，避免它进入 props / 产物
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === 'pre'),
  );

  restoreLiterals(element.children);
};

/** 递归把子树里的插值节点还原为原始文本（`{{ msg }}`） */
function restoreLiterals(children: TemplateChildNode[]): void {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child) continue;

    if (child.type === NodeTypes.INTERPOLATION) {
      const interp = child as InterpolationNode;
      // loc.source 保留了原始片段（如 `{{ msg }}`）；退化时按模板语法重建
      const raw = interp.loc?.source ?? buildLiteral(interp);
      children[i] = createText(raw) as unknown as TemplateChildNode;
      continue;
    }

    if (child.type === NodeTypes.ELEMENT) {
      restoreLiterals((child as ElementNode).children);
    }
  }
}

/** loc.source 缺失时，按 `{{ exp }}` 重建字面量 */
function buildLiteral(interp: InterpolationNode): string {
  const content = interp.content as { content?: unknown } | undefined;
  const exp = typeof content?.content === 'string' ? content.content : '';
  return '{{ ' + exp + ' }}';
}
