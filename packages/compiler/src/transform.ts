// src/transform.ts
// AST transform pipeline

import { NodeTypes, ElementTypes, PatchFlags } from './constants';
import type {
  RootNode,
  ElementNode,
  InterpolationNode,
  TemplateChildNode,
  DirectiveNode,
  SimpleExpressionNode,
  JSChildNode,
  VNodeCall,
  JSObjectExpression,
  JSProperty,
  JSConditionalExpression,
  TransformContext,
  TransformOptions,
  NodeTransform,
  DirectiveTransform,
  ParentNode,
  ExpressionNode,
  CodegenContext,
  BaseNode,
} from './types';
import {
  createVNodeCall,
  createSimpleExpression,
  createCompoundExpression,
  createCallExpression,
  createObjectExpression,
  createObjectProperty,
  createConditionalExpression,
  createArrayExpression,
} from './ast';

// ============================================================
// ExpressionNode content helper
// ============================================================

function getExpContent(exp: ExpressionNode | undefined): string | undefined {
  if (!exp) return undefined;
  if (exp.type === NodeTypes.SIMPLE_EXPRESSION) return exp.content;
  return undefined;
}

// ============================================================
// Main transform function
// ============================================================

export function transform(root: RootNode, options: TransformOptions = {}): void {
  const context = createTransformContext(root, options);
  traverseNode(root, context, options);

  // Copy context data to root
  root.helpers = Array.from(context.helpers.keys());
  root.components = Array.from(context.components);
  root.directives = Array.from(context.directives);
  root.hoists = context.hoists;
  root.temps = context.temps;
  root.cached = context.cached;

  // Create root codegen node
  if (root.children.length === 1) {
    const child = root.children[0];
    if (child) {
      if (child.type === NodeTypes.ELEMENT && (child as ElementNode).codegenNode) {
        root.codegenNode = (child as ElementNode).codegenNode as JSChildNode;
      } else if (child.type === NodeTypes.TEXT) {
        root.codegenNode = child as unknown as JSChildNode;
      } else if (child.type === NodeTypes.INTERPOLATION) {
        root.codegenNode = createCallExpression(
          context.helper('TO_DISPLAY_STRING'),
          [(child as InterpolationNode).content],
        );
      } else if (isJS(child)) {
        root.codegenNode = child as JSChildNode;
      }
    }
  } else if (root.children.length > 1) {
    // Multiple children - wrap in fragment or array
    const elements = root.children.filter(
      (c) => c.type === NodeTypes.ELEMENT || c.type === NodeTypes.TEXT || c.type === NodeTypes.INTERPOLATION,
    );
    if (elements.length > 0) {
      root.codegenNode = createCallExpression(
        context.helper('CREATE_VNODE'),
        [
          createSimpleExpression('Fragment', true),
          createSimpleExpression('null', true),
          createArrayExpression(elements as unknown as JSChildNode[]),
        ],
      );
    }
  }
}

// ============================================================
// Create Transform Context
// ============================================================

function createTransformContext(root: RootNode, _options: TransformOptions): TransformContext {
  const helpers = new Map<string, number>();
  const components = new Set<string>();
  const directives = new Set<string>();

  let currentNode: RootNode | TemplateChildNode | null = root;

  const context: TransformContext = {
    self: null as unknown as TransformContext,
    parent: null,
    rootNode: root,
    helpers,
    components,
    directives,
    hoists: [],
    temps: 0,
    cached: 0,
    identifiers: new Set(),
    scopes: [{ vFor: 0, vOnce: 0 }],
    childIndex: 0,
    currentNode,

    helper<T extends string>(name: T): T {
      const count = helpers.get(name) ?? 0;
      helpers.set(name, count + 1);
      return name;
    },

    helperString(name: string): string {
      return name;
    },

    replaceNode(node: TemplateChildNode): void {
      if (!context.parent) return;
      const parent = context.parent;
      if (parent.type === NodeTypes.ROOT) {
        const idx = parent.children.indexOf(context.currentNode as TemplateChildNode);
        if (idx !== -1) {
          parent.children[idx] = node;
        }
      } else if (parent.type === NodeTypes.ELEMENT) {
        const idx = parent.children.indexOf(context.currentNode as TemplateChildNode);
        if (idx !== -1) {
          parent.children[idx] = node;
        }
      }
      currentNode = node;
    },

    removeNode(node: TemplateChildNode | null): void {
      const target = node ?? context.currentNode;
      if (!target || !context.parent) return;
      const parent = context.parent;
      if (parent.type === NodeTypes.ROOT) {
        const idx = parent.children.indexOf(target as TemplateChildNode);
        if (idx !== -1) {
          parent.children.splice(idx, 1);
        }
      } else if (parent.type === NodeTypes.ELEMENT) {
        const idx = parent.children.indexOf(target as TemplateChildNode);
        if (idx !== -1) {
          parent.children.splice(idx, 1);
        }
      }
    },

    onNodeRemoved(): void {
      // no-op
    },

    addIdentifiers(exp: ExpressionNode | string): void {
      if (typeof exp === 'string') {
        context.identifiers.add(exp);
      } else if (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.isStatic) {
        context.identifiers.add(exp.content);
      }
    },

    removeIdentifiers(exp: ExpressionNode | string): void {
      if (typeof exp === 'string') {
        context.identifiers.delete(exp);
      } else if (exp.type === NodeTypes.SIMPLE_EXPRESSION && !exp.isStatic) {
        context.identifiers.delete(exp.content);
      }
    },

    addHoist(node: JSChildNode): void {
      context.hoists.push(node);
    },

    addTemp(): number {
      return context.temps++;
    },

    addCache(_index: number): void {
      context.cached++;
    },

    error(msg: string, _node?: BaseNode): void {
      throw new Error(`[lytjs/compiler] ${msg}`);
    },

    createCodegenContext(): CodegenContext {
      return {
        source: root.loc.source,
        code: '',
        line: 1,
        column: 1,
        offset: 0,
        indentLevel: 0,
        pure: false,
        helper(key: string): string {
          return `_${key}`;
        },
        push(_code: string, _node?: BaseNode): void {
          // no-op in context creation
        },
        indent(): void {
          // no-op
        },
        deindent(_withoutNewline?: boolean): void {
          // no-op
        },
        newline(): void {
          // no-op
        },
      };
    },
  };

  context.self = context;

  return context;
}

// ============================================================
// Traverse Node
// ============================================================

function traverseNode(
  node: RootNode | TemplateChildNode,
  context: TransformContext,
  options: TransformOptions,
): void {
  context.currentNode = node;

  // Apply node transforms
  const nodeTransforms = options.nodeTransforms;
  if (nodeTransforms) {
    const exitFns: Array<(() => void) | undefined> = [];
    for (let i = 0; i < nodeTransforms.length; i++) {
      const transform = nodeTransforms[i];
      if (!transform) continue;
      const onExit = transform(node as any, context);
      if (onExit) {
        if (Array.isArray(onExit)) {
          exitFns.push(...onExit);
        } else {
          exitFns.push(onExit);
        }
      }
      if (!context.currentNode) {
        return;
      }
    }

    for (let i = exitFns.length - 1; i >= 0; i--) {
      exitFns[i]?.();
      if (!context.currentNode) {
        return;
      }
    }
  }

  // Traverse children
  switch (node.type) {
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT: {
      const children = (node as RootNode | ElementNode).children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child) {
          context.parent = node as ParentNode;
          context.childIndex = i;
          traverseNode(child, context, options);
        }
      }
      break;
    }
  }
}

// ============================================================
// Built-in transforms
// ============================================================

export function transformElement(node: ElementNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  // Handle v-if chain first
  const ifDirective = findDirective(node, 'if');
  if (ifDirective) {
    return;
  }

  // Handle v-for
  const forDirective = findDirective(node, 'for');
  if (forDirective) {
    return;
  }

  // Handle v-once
  const onceDirective = findDirective(node, 'once');
  if (onceDirective) {
    return;
  }

  // Regular element - convert to VNodeCall
  const { tag, props, children } = node;

  const isComponent = node.tagType === ElementTypes.COMPONENT;

  // Build props object
  let propsExpression: JSObjectExpression | undefined;
  const hasDynamicProps = props.some(
    (p) => p.type === NodeTypes.DIRECTIVE,
  );

  if (props.length > 0) {
    const properties: JSProperty[] = [];
    for (const prop of props) {
      if (prop.type === NodeTypes.ATTRIBUTE) {
        const value = prop.value
          ? createSimpleExpression(JSON.stringify(prop.value.content), true, prop.loc, true)
          : createSimpleExpression('true', true, prop.loc, true);
        properties.push(
          createObjectProperty(
            createSimpleExpression(JSON.stringify(prop.name), true, prop.loc, true),
            value,
          ),
        );
      } else if (prop.type === NodeTypes.DIRECTIVE) {
        handleDirective(prop, node, context, properties);
      }
    }
    if (properties.length > 0) {
      propsExpression = createObjectExpression(properties);
    }
  }

  // Build children
  let vnodeChildren: JSChildNode | TemplateChildNode[] | string | undefined;
  if (children.length === 1) {
    const child = children[0];
    if (child) {
      if (child.type === NodeTypes.TEXT) {
        vnodeChildren = child.content;
      } else if (child.type === NodeTypes.INTERPOLATION) {
        context.helper('TO_DISPLAY_STRING');
        vnodeChildren = createCallExpression(
          'TO_DISPLAY_STRING',
          [(child as InterpolationNode).content],
        );
      } else if (child.type === NodeTypes.ELEMENT) {
        vnodeChildren = child as unknown as JSChildNode;
      } else {
        vnodeChildren = child as unknown as JSChildNode;
      }
    }
  } else if (children.length > 1) {
    const hasNonText = children.some(
      (c) => c.type === NodeTypes.ELEMENT,
    );
    if (!hasNonText) {
      const parts: (string | SimpleExpressionNode | InterpolationNode)[] = [];
      for (const child of children) {
        if (child.type === NodeTypes.TEXT) {
          parts.push(JSON.stringify(child.content));
        } else if (child.type === NodeTypes.INTERPOLATION) {
          parts.push(child as InterpolationNode);
        }
      }
      if (parts.length > 0) {
        context.helper('TO_DISPLAY_STRING');
        vnodeChildren = createCompoundExpression(parts as any);
      }
    } else {
      vnodeChildren = children as unknown as JSChildNode[];
    }
  }

  // Determine patch flag
  let patchFlag: number | undefined;
  if (hasDynamicProps) {
    patchFlag = PatchFlags.FULL_PROPS;
  } else if (children.some((c) => c.type === NodeTypes.INTERPOLATION)) {
    patchFlag = PatchFlags.TEXT;
  }

  const vnodeCall = createVNodeCall(
    isComponent ? tag : JSON.stringify(tag),
    propsExpression,
    vnodeChildren as any,
    patchFlag,
    undefined,
    undefined,
    false,
    false,
    isComponent,
  );

  node.codegenNode = vnodeCall;

  context.helper('CREATE_VNODE');

  if (isComponent) {
    context.components.add(tag);
  }
}

// ============================================================
// Handle directive in element transform
// ============================================================

function handleDirective(
  prop: DirectiveNode,
  _node: ElementNode,
  context: TransformContext,
  properties: JSProperty[],
): void {
  const expContent = getExpContent(prop.exp);
  const argContent = prop.arg ? getExpContent(prop.arg as ExpressionNode) : undefined;

  if (prop.name === 'bind') {
    if (argContent !== undefined) {
      const valueExpr = expContent !== undefined
        ? createSimpleExpression(expContent, false, prop.loc, false)
        : createSimpleExpression('undefined', true, prop.loc, true);
      properties.push(
        createObjectProperty(
          createSimpleExpression(JSON.stringify(argContent), true, prop.loc, true),
          valueExpr,
        ),
      );
    }
  } else if (prop.name === 'on') {
    if (argContent !== undefined) {
      const handler = expContent !== undefined
        ? createSimpleExpression(expContent, false, prop.loc, false)
        : createSimpleExpression('undefined', true, prop.loc, true);
      properties.push(
        createObjectProperty(
          createSimpleExpression(`"on${capitalize(argContent)}"`, true, prop.loc, true),
          handler,
        ),
      );
    }
  } else if (prop.name === 'model') {
    if (expContent !== undefined) {
      properties.push(
        createObjectProperty(
          createSimpleExpression('"modelValue"', true, prop.loc, true),
          createSimpleExpression(expContent, false, prop.loc, false),
        ),
      );
      properties.push(
        createObjectProperty(
          createSimpleExpression('"onUpdate:modelValue"', true, prop.loc, true),
          createSimpleExpression(`$event => (${expContent} = $event)`, false, prop.loc, false),
        ),
      );
    }
  } else if (prop.name === 'show') {
    if (expContent !== undefined) {
      properties.push(
        createObjectProperty(
          createSimpleExpression('"style"', true, prop.loc, true),
          createConditionalExpression(
            createSimpleExpression(expContent, false, prop.loc, false),
            createSimpleExpression('undefined', true, prop.loc, true),
            createSimpleExpression('"{ display: none }"', true, prop.loc, true),
            false,
          ),
        ),
      );
    }
  } else if (prop.name === 'html') {
    if (expContent !== undefined) {
      // P0-05 XSS fix: 在开发模式下对 v-html 使用发出安全警告
      // 生成: (__DEV__ ? (console.warn("..."), value) : value)
      const safeValue = createCompoundExpression([
        `(${createConditionalExpression(
          createSimpleExpression('__DEV__', false, prop.loc, false),
          createCompoundExpression([
            createCallExpression(
              'console.warn',
              [
                createSimpleExpression(
                  '"[LyticsJS warn] v-html directive can lead to XSS attack. Make sure the content is sanitized before rendering."',
                  true,
                  prop.loc,
                  true,
                ),
              ],
              prop.loc,
            ),
            ', ',
            createSimpleExpression(expContent, false, prop.loc, false),
          ]),
          createSimpleExpression(expContent, false, prop.loc, false),
          false,
          prop.loc,
        )})`,
      ]);
      properties.push(
        createObjectProperty(
          createSimpleExpression('"innerHTML"', true, prop.loc, true),
          safeValue as unknown as JSChildNode,
        ),
      );
    }
  } else if (prop.name === 'text') {
    if (expContent !== undefined) {
      properties.push(
        createObjectProperty(
          createSimpleExpression('"textContent"', true, prop.loc, true),
          createSimpleExpression(expContent, false, prop.loc, false),
        ),
      );
    }
  } else if (prop.name === 'cloak' || prop.name === 'pre') {
    // skip
  } else {
    // Unknown directive - register it
    context.directives.add(prop.name);
  }
}

// ============================================================
// Transform v-if
// ============================================================

export function transformIf(node: RootNode | TemplateChildNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const ifDir = findDirective(element, 'if');
  if (!ifDir && !findDirective(element, 'else-if') && !findDirective(element, 'else')) return;

  // Find the start of the if chain
  const parent = context.parent;
  if (!parent) return;

  const siblings = parent.children;
  const currentIndex = siblings.indexOf(node as TemplateChildNode);

  // Find the first v-if in the chain
  let chainStart = currentIndex;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const sibling = siblings[i];
    if (
      sibling &&
      sibling.type === NodeTypes.ELEMENT &&
      (findDirective(sibling as ElementNode, 'if') ||
        findDirective(sibling as ElementNode, 'else-if'))
    ) {
      chainStart = i;
    } else {
      break;
    }
  }

  // Build the conditional chain
  let conditional: JSConditionalExpression | undefined;

  for (let i = chainStart; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (!sibling || sibling.type !== NodeTypes.ELEMENT) break;

    const sibElement = sibling as ElementNode;
    const sibIf = findDirective(sibElement, 'if');
    const sibElseIf = findDirective(sibElement, 'else-if');
    const sibElse = findDirective(sibElement, 'else');

    if (!sibIf && !sibElseIf && !sibElse) break;

    // Remove v-if/v-else-if/v-else directive from props
    sibElement.props = sibElement.props.filter(
      (p) =>
        !(p.type === NodeTypes.DIRECTIVE && (p.name === 'if' || p.name === 'else-if' || p.name === 'else')),
    );

    // Transform the element (without v-if)
    const savedParent = context.parent;
    context.parent = parent;
    transformElement(sibElement, context);
    context.parent = savedParent;

    const branchNode = sibElement.codegenNode as VNodeCall;

    if (sibIf || sibElseIf) {
      const testExpr = sibIf?.exp ?? sibElseIf?.exp;
      const testContent = testExpr ? getExpContent(testExpr as ExpressionNode) : undefined;
      const test = testContent
        ? createSimpleExpression(testContent, false, sibElement.loc, false)
        : createSimpleExpression('true', true, sibElement.loc, true);

      if (!conditional) {
        conditional = createConditionalExpression(test, branchNode as unknown as JSChildNode, undefined as any, true);
      } else {
        conditional.alternate = createConditionalExpression(test, branchNode as unknown as JSChildNode, undefined as any, true);
        conditional = conditional.alternate as JSConditionalExpression;
      }
    } else {
      // v-else
      if (!conditional) {
        conditional = createConditionalExpression(
          createSimpleExpression('true', true, sibElement.loc, true),
          branchNode as unknown as JSChildNode,
          undefined as any,
          true,
        );
      } else {
        conditional.alternate = branchNode as unknown as JSChildNode;
      }
    }

    // Remove the sibling from parent's children
    siblings.splice(i, 1);
    i--;
  }

  if (conditional) {
    siblings.splice(chainStart, 0, conditional as unknown as TemplateChildNode);
  }
}

// ============================================================
// Transform v-for
// ============================================================

export function transformFor(node: RootNode | TemplateChildNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const forDir = findDirective(element, 'for');
  if (!forDir || !forDir.exp) return;

  // Remove v-for directive from props
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === 'for'),
  );

  // Parse v-for expression
  const expContent = getExpContent(forDir.exp);
  if (!expContent) return;

  const inMatch = expContent.match(/^\s*(\S+)\s+in\s+(.+)$/);
  if (!inMatch) return;

  const left = inMatch[1]!.trim();
  const right = inMatch[2]!.trim();

  let itemVar: string;
  let indexVar: string | undefined;

  if (left.startsWith('(') && left.endsWith(')')) {
    const inner = left.slice(1, -1).trim();
    const parts = inner.split(',').map((p: string) => p.trim());
    itemVar = parts[0] ?? 'item';
    indexVar = parts[1];
  } else if (left.startsWith('[') && left.endsWith(']')) {
    const inner = left.slice(1, -1).trim();
    const parts = inner.split(',').map((p: string) => p.trim());
    itemVar = parts[0] ?? 'item';
    indexVar = parts[1];
  } else {
    itemVar = left;
  }

  // Transform the element
  transformElement(element, context);

  context.helper('RENDER_LIST');

  const renderListCall = createCallExpression('RENDER_LIST', [
    createSimpleExpression(right, false, forDir.exp.loc, false),
    createSimpleExpression(
      `(${itemVar}${indexVar ? `, ${indexVar}` : ''}) => `,
      false,
      forDir.exp.loc,
      false,
    ),
  ]);

  context.replaceNode(renderListCall as unknown as TemplateChildNode);
}

// ============================================================
// Transform v-once
// ============================================================

export function transformOnce(node: RootNode | TemplateChildNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  const onceDir = findDirective(element, 'once');
  if (!onceDir) return;

  // Remove v-once directive from props
  element.props = element.props.filter(
    (p) => !(p.type === NodeTypes.DIRECTIVE && p.name === 'once'),
  );

  // Transform the element normally
  transformElement(element, context);

  // Mark as hoistable
  if (element.codegenNode) {
    context.addHoist(element.codegenNode);
  }
}

// ============================================================
// Transform slot
// ============================================================

export function transformSlot(node: RootNode | TemplateChildNode, context: TransformContext): void {
  if (node.type !== NodeTypes.ELEMENT) return;

  const element = node as ElementNode;
  if (element.tagType !== ElementTypes.SLOT && element.tag !== 'slot') return;

  context.helper('RENDER_SLOT');
  transformElement(element, context);
}

// ============================================================
// Built-in directive transforms
// ============================================================

export const transformBind: DirectiveTransform = (dir, _node, _context) => {
  const { arg, exp } = dir;
  const props: Array<{ key: string; value: string }> = [];

  const argContent = arg ? getExpContent(arg as ExpressionNode) : undefined;
  const expContent = getExpContent(exp);

  if (argContent && expContent) {
    props.push({
      key: argContent,
      value: expContent,
    });
  }

  return { props };
};

export const transformOn: DirectiveTransform = (dir, _node, _context) => {
  const { arg, exp, modifiers } = dir;
  const props: Array<{ key: string; value: string }> = [];

  const argContent = arg ? getExpContent(arg as ExpressionNode) : undefined;
  const expContent = getExpContent(exp);

  if (argContent && expContent) {
    let eventName = argContent;
    if (modifiers.length > 0) {
      eventName += modifiers.map((m) => `_${m}`).join('');
    }
    props.push({
      key: `on${capitalize(eventName)}`,
      value: expContent,
    });
  }

  return { props };
};

export const transformModel: DirectiveTransform = (dir, _node, _context) => {
  const { exp } = dir;
  const props: Array<{ key: string; value: string }> = [];

  const expContent = getExpContent(exp);

  if (expContent) {
    props.push({
      key: 'modelValue',
      value: expContent,
    });
    props.push({
      key: 'onUpdate:modelValue',
      value: `$event => (${expContent} = $event)`,
    });
  }

  return { props };
};

export const transformShow: DirectiveTransform = (dir, _node, _context) => {
  const { exp } = dir;
  const props: Array<{ key: string; value: string }> = [];

  const expContent = getExpContent(exp);

  if (expContent) {
    props.push({
      key: 'style',
      value: expContent + " ? undefined : { display: 'none' }",
    });
  }

  return { props };
};

// ============================================================
// Default transforms
// ============================================================

export const builtInTransforms: NodeTransform[] = [
  transformIf as NodeTransform,
  transformFor as NodeTransform,
  transformOnce as NodeTransform,
  transformElement as unknown as NodeTransform,
];

export const builtInDirectiveTransforms: Record<string, DirectiveTransform> = {
  bind: transformBind,
  on: transformOn,
  model: transformModel,
  show: transformShow,
};

// ============================================================
// Helpers
// ============================================================

function findDirective(node: ElementNode, name: string): DirectiveNode | undefined {
  return node.props.find(
    (p): p is DirectiveNode => p.type === NodeTypes.DIRECTIVE && p.name === name,
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function isJS(node: TemplateChildNode): boolean {
  return (
    node.type === NodeTypes.JS_CALL_EXPRESSION ||
    node.type === NodeTypes.JS_OBJECT_EXPRESSION ||
    node.type === NodeTypes.JS_PROPERTY ||
    node.type === NodeTypes.JS_ARRAY_EXPRESSION ||
    node.type === NodeTypes.JS_FUNCTION_EXPRESSION ||
    node.type === NodeTypes.JS_CONDITIONAL_EXPRESSION ||
    node.type === NodeTypes.JS_CACHE_EXPRESSION ||
    node.type === NodeTypes.VNODE_CALL
  );
}
