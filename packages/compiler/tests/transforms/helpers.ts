// tests/transforms/helpers.ts
// 共享测试辅助函数 - 用于构建 mock AST 节点和 TransformContext

import { ElementTypes } from '../../src/constants';
import type {
  ElementNode,
  TextNode,
  DirectiveNode,
  AttributeNode,
  TransformContext,
  TemplateChildNode,
  JSChildNode,
} from '../../src/types';
import {
  createRoot,
  createElement,
  createText,
  createDirective,
  createSimpleExpression,
  createAttribute,
} from '../../src/ast';

/**
 * 创建一个最小化的 TransformContext mock
 */
export function createMockContext(overrides?: Partial<TransformContext>): TransformContext {
  const helpers = new Map<string, number>();
  const components = new Set<string>();
  const directives = new Set<string>();
  const hoists: JSChildNode[] = [];
  const identifiers = new Set<string>();

  const rootNode = createRoot([]);

  const context: TransformContext = {
    self: null as unknown as TransformContext,
    parent: null,
    rootNode,
    helpers,
    components,
    directives,
    hoists,
    temps: 0,
    cached: 0,
    identifiers,
    scopes: [{ vFor: 0, vOnce: 0 }],
    childIndex: 0,
    currentNode: rootNode,
    helper<T extends string>(name: T): T {
      const count = helpers.get(name) ?? 0;
      helpers.set(name, count + 1);
      return name;
    },
    helperString(name: string): string {
      return name;
    },
    replaceNode(_node: TemplateChildNode): void {},
    removeNode(_node: TemplateChildNode | null): void {},
    onNodeRemoved(): void {},
    addIdentifiers(_exp: unknown): void {},
    removeIdentifiers(_exp: unknown): void {},
    addHoist(node: JSChildNode): void {
      hoists.push(node);
    },
    addTemp(): number {
      return context.temps++;
    },
    addCache(_index: number): void {
      context.cached++;
    },
    error(msg: string, _node?: unknown): void {
      throw new Error(`[LytJS] ${msg}`);
    },
    ...overrides,
  };

  context.self = context;
  return context;
}

/**
 * 创建一个 slot 类型的元素节点
 */
export function createSlotElement(
  options: {
    tag?: string;
    tagType?: (typeof ElementTypes)[keyof typeof ElementTypes];
    props?: (AttributeNode | DirectiveNode)[];
    children?: TemplateChildNode[];
  } = {},
): ElementNode {
  const element = createElement(options.tag ?? 'slot', options.props ?? [], options.children ?? []);
  element.tagType = options.tagType ?? ElementTypes.SLOT;
  return element;
}

/**
 * 创建一个带有 v-once 指令的元素节点
 */
export function createOnceElement(
  options: {
    tag?: string;
    children?: TemplateChildNode[];
    extraProps?: (AttributeNode | DirectiveNode)[];
  } = {},
): ElementNode {
  const onceDir = createDirective('once');
  const props = [onceDir, ...(options.extraProps ?? [])];
  return createElement(options.tag ?? 'div', props, options.children ?? []);
}

/**
 * 创建一个带有 v-model 指令的 DirectiveNode
 */
export function createModelDirective(expContent: string, modifiers: string[] = []): DirectiveNode {
  const exp = createSimpleExpression(expContent, false);
  return createDirective('model', undefined, exp, modifiers);
}

/**
 * 创建一个带有 v-show 指令的 DirectiveNode
 */
export function createShowDirective(expContent: string): DirectiveNode {
  const exp = createSimpleExpression(expContent, false);
  return createDirective('show', undefined, exp);
}

/**
 * 创建一个文本子节点
 */
export function createTextChild(content: string): TextNode {
  return createText(content);
}

/**
 * 创建一个属性节点
 */
export function createAttr(name: string, value: string) {
  return createAttribute(name, createText(value));
}
