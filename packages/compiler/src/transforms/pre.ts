// src/transforms/pre.ts
// v-pre 指令转换：跳过该元素及其子树的编译

import { NodeTypes, ElementTypes } from '../constants';
import type {
  NodeTransform,
  ElementNode,
  InterpolationNode,
  TemplateChildNode,
  AttributeNode,
  DirectiveNode,
} from '../types';
import { findDirective } from './helpers';
import { createAttribute, createText } from '../ast';

/**
 * `v-pre`：**跳过该元素及其子树的编译** —— 保留 `{{ }}` 字面量，不做插值，
 * 子树内的指令（`v-if` / `:prop` / `@event` / `v-model` …）一律按字面属性保留。
 *
 * 必须排在其它 nodeTransform **之前**：在 enter 阶段就把子树改写为纯静态结构，
 * 后续遍历与 codegen 自然不会再把它当作动态绑定或组件。
 *
 * ⚠️ 2026-11-13 修（C-22）：此前只把插值还原成文本，子树里的指令仍会被编译 ——
 *   `<div v-pre><span v-if="ok">x</span></div>` 在 ok=false 时整个 span 消失，
 *   `:title` 被求值成运行期值。现在指令统一降级为字面属性（名字与原始写法一致），
 *   组件/插槽标签也退化为普通元素（与「跳过编译」语义一致）。
 */
export const transformPre: NodeTransform = (node) => {
  if (node.type !== NodeTypes.ELEMENT) return;
  const element = node as ElementNode;

  const preDir = findDirective(element, 'pre');
  if (!preDir) return;

  // v-pre 元素自身同样不参与编译：移除 v-pre 本身（既有行为），其余指令转字面属性
  element.props = restoreProps(element.props, true);
  element.tagType = ElementTypes.ELEMENT;

  restoreLiterals(element.children);
};

/** 递归把 v-pre 子树改写为字面量 */
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
      const element = child as ElementNode;
      // 组件 / <slot> / <template> 在 v-pre 内都按普通元素渲染
      element.tagType = ElementTypes.ELEMENT;
      element.props = restoreProps(element.props, false);
      restoreLiterals(element.children);
    }
  }
}

/**
 * 指令 → 字面属性。
 *
 * 名称与值直接从 `loc.source` 取，保留原始写法（`:title` 不变成 `v-bind:title`，
 * `@click.stop` 不丢修饰符）。`dropPre` 用于移除 v-pre 指令本身。
 */
function restoreProps(
  props: (AttributeNode | DirectiveNode)[],
  dropPre: boolean,
): (AttributeNode | DirectiveNode)[] {
  const out: (AttributeNode | DirectiveNode)[] = [];
  for (const prop of props) {
    if (prop.type !== NodeTypes.DIRECTIVE) {
      out.push(prop);
      continue;
    }
    if (dropPre && prop.name === 'pre') continue;
    out.push(directiveToAttribute(prop));
  }
  return out;
}

/** 把一条指令还原成 `name="raw"` 的字面属性 */
function directiveToAttribute(dir: DirectiveNode): AttributeNode {
  const source = dir.loc?.source ?? '';
  if (source !== '') {
    const eq = source.indexOf('=');
    const name = (eq === -1 ? source : source.slice(0, eq)).trim();
    if (name !== '') {
      if (eq === -1) return createAttribute(name, undefined, dir.loc);
      return createAttribute(
        name,
        createText(unquote(source.slice(eq + 1).trim()), dir.loc),
        dir.loc,
      );
    }
  }

  // 退化路径：loc.source 缺失时按指令结构重建名称
  return createAttribute(
    reconstructName(dir),
    dir.exp
      ? createText(String((dir.exp as { content?: unknown }).content ?? ''), dir.loc)
      : undefined,
    dir.loc,
  );
}

function reconstructName(dir: DirectiveNode): string {
  const arg = dir.arg ? String((dir.arg as { content?: unknown }).content ?? '') : '';
  const mods = (dir.modifiers ?? []).map((m) => `.${m}`).join('');
  if (dir.name === 'bind') return `:${arg}${mods}`;
  if (dir.name === 'on') return `@${arg}${mods}`;
  if (dir.name === 'slot') return `#${arg}${mods}`;
  return `v-${dir.name}${arg ? `:${arg}` : ''}${mods}`;
}

/** 去掉属性值最外层的成对引号 */
function unquote(raw: string): string {
  if (raw.length >= 2) {
    const first = raw[0];
    const last = raw[raw.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return raw.slice(1, -1);
    }
  }
  return raw;
}

/** loc.source 缺失时，按 `{{ exp }}` 重建字面量 */
function buildLiteral(interp: InterpolationNode): string {
  const content = interp.content as { content?: unknown } | undefined;
  const exp = typeof content?.content === 'string' ? content.content : '';
  return '{{ ' + exp + ' }}';
}
