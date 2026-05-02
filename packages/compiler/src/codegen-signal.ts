// src/codegen-signal.ts
// Signal 模式代码生成器 - 生成 effect() + DOM 操作代码

import { NodeTypes } from './constants';
import type {
  RootNode,
  ElementNode,
  TextNode,
  InterpolationNode,
  DirectiveNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  JSChildNode,
  VNodeCall,
  JSCallExpression,
  JSConditionalExpression,
  JSObjectExpression,
  JSProperty,
  TemplateChildNode,
  CodegenResult,
  CompilerOptions,
} from './types';

// ============================================================
// Signal Codegen Options
// ============================================================

export interface SignalCodegenOptions {
  mode: 'signal';
  isComponent?: boolean;
  ident?: number;
}

// ============================================================
// Helper: 生成元素变量名
// ============================================================

/**
 * 根据标签名生成变量名，使用 _ 前缀
 * 重复标签通过计数器后缀区分
 */
function genVarName(tag: string, counter: Map<string, number>): string {
  const count = counter.get(tag) ?? 0;
  counter.set(tag, count + 1);
  if (count === 0) {
    return `_${tag}`;
  }
  return `_${tag}${count}`;
}

// ============================================================
// Helper: 获取表达式内容
// ============================================================

function getExpContent(node: SimpleExpressionNode | CompoundExpressionNode | undefined): string {
  if (!node) return '';
  if (node.type === NodeTypes.SIMPLE_EXPRESSION) return node.content;
  // CompoundExpression: 拼接所有子节点
  return node.children
    .map((c) => {
      if (typeof c === 'string') return c;
      if (c.type === NodeTypes.SIMPLE_EXPRESSION) return c.content;
      return '';
    })
    .join('');
}

// ============================================================
// Helper: 生成静态 HTML 模板
// ============================================================

/**
 * 将静态元素子树序列化为 HTML 字符串，用于 createTemplate
 * 同时收集所有元素节点的变量名和标签名映射
 * 注意：只序列化静态属性（ATTRIBUTE），跳过指令（DIRECTIVE）
 */
function serializeStaticHTML(
  node: ElementNode,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
): string {
  const varName = genVarName(node.tag, varCounter);
  elementVars.push({ varName, tag: node.tag });

  let attrs = '';
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && prop.value) {
      attrs += ` ${prop.name}="${prop.value.content}"`;
    } else if (prop.type === NodeTypes.ATTRIBUTE && !prop.value) {
      attrs += ` ${prop.name}`;
    }
    // 跳过 DIRECTIVE 类型的 props
  }

  let childrenHTML = '';
  for (const child of node.children) {
    if (child.type === NodeTypes.TEXT) {
      childrenHTML += (child as TextNode).content;
    } else if (child.type === NodeTypes.ELEMENT) {
      childrenHTML += serializeStaticHTML(child as ElementNode, varCounter, elementVars);
    }
    // 跳过 CommentNode、InterpolationNode 等动态内容
  }

  if (node.children.length === 0 && node.isSelfClosing) {
    return `<${node.tag}${attrs} />`;
  }
  return `<${node.tag}${attrs}>${childrenHTML}</${node.tag}>`;
}

// ============================================================
// Main generate function
// ============================================================

export function generateSignal(
  ast: RootNode,
  _options?: CompilerOptions,
): CodegenResult {
  const lines: string[] = [];
  const varCounter = new Map<string, number>();
  const elementVars: Array<{ varName: string; tag: string }> = [];
  const usedImports = new Set<string>();

  // Track which elements have dynamic bindings
  const dynamicBindings: Array<{ varName: string; code: string }> = [];

  // ---- Phase 1: Generate imports ----
  lines.push(
    `import { effect } from '@lytjs/reactivity';`,
    `import { createTemplate, setText, setHTML, setAttribute, setProperty, setStyle, setClass, insert, remove, createEventHandler, onCleanup, reconcileArray } from '@lytjs/dom-runtime';`,
  );
  lines.push('');

  // ---- Phase 2: Build static HTML and collect element variables ----
  // 先通过 buildStaticHTML 收集所有元素变量（使用 varCounter）
  const staticHTML = buildStaticHTML(ast.children, varCounter, elementVars);

  // ---- Phase 3: Process AST children for dynamic bindings ----
  // 此时 varCounter 已被 buildStaticHTML 初始化，processElement 不再重复分配变量名
  processChildren(ast.children, lines, varCounter, elementVars, dynamicBindings, usedImports);

  // ---- Phase 4: Generate render function ----
  lines.push('export function render(_ctx, _container) {');

  // 生成 createTemplate 调用
  if (elementVars.length > 0) {
    // 找到根元素变量名
    const rootVar = elementVars[0]!.varName;
    lines.push(`  const ${rootVar} = createTemplate(${JSON.stringify(staticHTML)});`);

    // 解构子元素
    if (elementVars.length > 1) {
      const childVars = elementVars.slice(1).map((v) => v.varName);
      lines.push(`  const [${childVars.join(', ')}] = ${rootVar}.children;`);
    }

    lines.push(`  insert(${rootVar}, _container);`);
    lines.push('');
  }

  // 生成动态绑定
  for (const binding of dynamicBindings) {
    lines.push(`  ${binding.code}`);
  }

  // 生成 cleanup
  if (elementVars.length > 0) {
    const rootVar = elementVars[0]!.varName;
    lines.push('');
    lines.push(`  onCleanup(() => ${rootVar}.remove());`);
  }

  lines.push('  return () => { runCleanups(); };');
  lines.push('}');

  return {
    code: lines.join('\n'),
    preamble: '',
    ast,
  };
}

// ============================================================
// Build static HTML from children
// ============================================================

function buildStaticHTML(
  children: TemplateChildNode[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
): string {
  let html = '';
  for (const child of children) {
    if (child.type === NodeTypes.TEXT) {
      html += (child as TextNode).content;
    } else if (child.type === NodeTypes.ELEMENT) {
      html += serializeStaticHTML(child as ElementNode, varCounter, elementVars);
    }
    // Skip dynamic nodes (JSConditionalExpression, JSCallExpression, etc.)
  }
  return html;
}

// ============================================================
// Process children nodes
// ============================================================

function processChildren(
  children: TemplateChildNode[],
  lines: string[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedImports: Set<string>,
): void {
  for (const child of children) {
    if (child.type === NodeTypes.ELEMENT) {
      processElement(
        child as ElementNode,
        lines,
        varCounter,
        elementVars,
        dynamicBindings,
        usedImports,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditional(
        child as JSConditionalExpression,
        lines,
        varCounter,
        elementVars,
        dynamicBindings,
        usedImports,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpression(
        child as JSCallExpression,
        lines,
        varCounter,
        elementVars,
        dynamicBindings,
        usedImports,
      );
    }
    // TextNode, CommentNode, InterpolationNode at root level are handled
    // by the static HTML generation
  }
}

// ============================================================
// Process Element Node
// ============================================================

function processElement(
  node: ElementNode,
  _lines: string[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedImports: Set<string>,
): void {
  // 查找已由 buildStaticHTML 分配的变量名
  // 使用 elementVars 中已有的条目来获取变量名，而不是重新生成
  const existingEntry = findExistingVar(elementVars, node.tag);
  const varName = existingEntry ?? genVarName(node.tag, varCounter);

  if (!existingEntry) {
    elementVars.push({ varName, tag: node.tag });
  }

  // 处理 props（指令）- 直接从 ElementNode.props 中查找
  for (let i = 0; i < node.props.length; i++) {
    const prop = node.props[i];
    if (!prop) continue;
    if (prop.type === NodeTypes.DIRECTIVE) {
      const dir = prop as DirectiveNode;
      // v-text 和 v-html 在解析器中不解析 exp（解析器只对特定指令名解析 = 后面的值）
      // 解析器会将 ="value" 解析为独立的 AttributeNode { name: '="value"', value: undefined }
      // 所以需要从后续属性中提取值
      if ((dir.name === 'text' || dir.name === 'html') && !dir.exp) {
        for (let j = i + 1; j < node.props.length; j++) {
          const nextProp = node.props[j]!;
          if (nextProp.type === NodeTypes.ATTRIBUTE) {
            // 匹配 ="value" 格式的属性名
            const eqMatch = nextProp.name.match(/^="(.*)"$/);
            if (eqMatch) {
              dir.exp = createSimpleExpressionFor(eqMatch[1]!, dir.loc);
              break;
            }
          }
        }
      }
      processDirective(
        dir,
        varName,
        node.tag,
        dynamicBindings,
        usedImports,
      );
    }
  }

  // 处理 codegenNode 中的属性（transform 阶段将 v-text/v-html 转换为 textContent/innerHTML 属性）
  if (node.codegenNode && node.codegenNode.type === NodeTypes.VNODE_CALL) {
    const vnode = node.codegenNode as VNodeCall;
    processVNodeCallProps(vnode, varName, dynamicBindings, usedImports);
  }

  // 处理子节点中的动态内容
  for (const child of node.children) {
    if (child.type === NodeTypes.INTERPOLATION) {
      const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
      usedImports.add('effect');
      usedImports.add('setText');
      dynamicBindings.push({
        varName,
        code: `effect(() => setText(${varName}, _ctx.${exp}));`,
      });
    } else if (child.type === NodeTypes.ELEMENT) {
      processElement(
        child as ElementNode,
        _lines,
        varCounter,
        elementVars,
        dynamicBindings,
        usedImports,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditional(
        child as JSConditionalExpression,
        _lines,
        varCounter,
        elementVars,
        dynamicBindings,
        usedImports,
        varName,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpression(
        child as JSCallExpression,
        _lines,
        varCounter,
        elementVars,
        dynamicBindings,
        usedImports,
        varName,
      );
    }
  }
}

// ============================================================
// Helper: 在 elementVars 中查找已有变量名
// ============================================================

function createSimpleExpressionFor(
  content: string,
  _loc?: { start: { line: number; column: number; offset: number }; end: { line: number; column: number; offset: number }; source: string },
): SimpleExpressionNode {
  return {
    type: NodeTypes.SIMPLE_EXPRESSION,
    content,
    isStatic: false,
    isConstant: false,
    loc: _loc ?? {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
      source: content,
    },
  };
}

function findExistingVar(
  elementVars: Array<{ varName: string; tag: string }>,
  tag: string,
): string | null {
  // 查找匹配标签的、尚未被 processElement 处理过的变量
  // 通过检查 elementVars 中该标签的计数来确定下一个可用变量名
  const matching = elementVars.filter((v) => v.tag === tag);
  // 返回第一个匹配的（按插入顺序）
  if (matching.length > 0) {
    return matching[0]!.varName;
  }
  return null;
}

// ============================================================
// Process VNodeCall props (for transformed directives like v-text, v-html)
// ============================================================

function processVNodeCallProps(
  vnode: VNodeCall,
  varName: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedImports: Set<string>,
): void {
  if (!vnode.props || vnode.props.type !== NodeTypes.JS_OBJECT_EXPRESSION) return;

  const objExpr = vnode.props as JSObjectExpression;
  for (const prop of objExpr.properties) {
    if (prop.type !== NodeTypes.JS_PROPERTY) continue;
    const jsProp = prop as JSProperty;
    if (
      jsProp.key.type !== NodeTypes.SIMPLE_EXPRESSION ||
      jsProp.value.type !== NodeTypes.SIMPLE_EXPRESSION
    ) {
      continue;
    }

    const key = (jsProp.key as SimpleExpressionNode).content.replace(/^"|"$/g, '');
    const value = (jsProp.value as SimpleExpressionNode).content;

    if (key === 'textContent') {
      // v-text 转换后的结果
      usedImports.add('effect');
      usedImports.add('setText');
      dynamicBindings.push({
        varName,
        code: `effect(() => setText(${varName}, ${value}));`,
      });
    } else if (key === 'innerHTML') {
      // v-html 转换后的结果
      usedImports.add('effect');
      usedImports.add('setHTML');
      dynamicBindings.push({
        varName,
        code: `effect(() => setHTML(${varName}, ${value}));`,
      });
    } else if (key === 'modelValue') {
      // v-model 转换后的结果 - 已在 processDirective 中处理
      // 跳过
    } else if (key.startsWith('onUpdate:')) {
      // v-model 的更新事件 - 已在 processDirective 中处理
      // 跳过
    } else if (key.startsWith('on')) {
      // v-on 转换后的结果 - 已在 processDirective 中处理
      // 跳过
    }
  }
}

// ============================================================
// Process Directive Node
// ============================================================

function processDirective(
  dir: DirectiveNode,
  varName: string,
  _tag: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedImports: Set<string>,
): void {
  const expContent = dir.exp ? getExpContent(dir.exp as SimpleExpressionNode) : undefined;
  const argContent = dir.arg ? getExpContent(dir.arg as SimpleExpressionNode) : undefined;

  switch (dir.name) {
    case 'if': {
      // v-if 在 transform 阶段已被转换为 JSConditionalExpression
      // 此处作为后备处理
      if (expContent) {
        usedImports.add('effect');
        dynamicBindings.push({
          varName,
          code: `effect(() => {\n    if (_ctx.${expContent}) {\n      ${varName}.style.display = '';\n    } else {\n      ${varName}.style.display = 'none';\n    }\n  });`,
        });
      }
      break;
    }

    case 'show': {
      if (expContent) {
        usedImports.add('effect');
        dynamicBindings.push({
          varName,
          code: `effect(() => {\n    ${varName}.style.display = _ctx.${expContent} ? '' : 'none';\n  });`,
        });
      }
      break;
    }

    case 'text': {
      // v-text 在 transform 阶段已被转换为 textContent 属性
      // 在 processVNodeCallProps 中处理
      // 此处作为后备
      if (expContent) {
        usedImports.add('effect');
        usedImports.add('setText');
        dynamicBindings.push({
          varName,
          code: `effect(() => setText(${varName}, _ctx.${expContent}));`,
        });
      }
      break;
    }

    case 'html': {
      // v-html 在 transform 阶段已被转换为 innerHTML 属性
      // 在 processVNodeCallProps 中处理
      // 此处作为后备
      if (expContent) {
        usedImports.add('effect');
        usedImports.add('setHTML');
        dynamicBindings.push({
          varName,
          code: `effect(() => setHTML(${varName}, _ctx.${expContent}));`,
        });
      }
      break;
    }

    case 'bind': {
      if (argContent && expContent) {
        usedImports.add('effect');
        if (argContent === 'class') {
          usedImports.add('setClass');
          dynamicBindings.push({
            varName,
            code: `effect(() => setClass(${varName}, _ctx.${expContent}));`,
          });
        } else if (argContent === 'style') {
          usedImports.add('setStyle');
          dynamicBindings.push({
            varName,
            code: `effect(() => setStyle(${varName}, _ctx.${expContent}));`,
          });
        } else {
          usedImports.add('setAttribute');
          dynamicBindings.push({
            varName,
            code: `effect(() => setAttribute(${varName}, '${argContent}', _ctx.${expContent}));`,
          });
        }
      }
      break;
    }

    case 'on': {
      if (argContent && expContent) {
        usedImports.add('addEventListener');
        usedImports.add('onCleanup');
        if (dir.modifiers.length > 0) {
          usedImports.add('createEventHandler');
          const mods = dir.modifiers.map((m) => `${m}: true`).join(', ');
          dynamicBindings.push({
            varName,
            code: `onCleanup(createEventHandler(${varName}, '${argContent}', _ctx.${expContent}, { ${mods} }));`,
          });
        } else {
          dynamicBindings.push({
            varName,
            code: `onCleanup(addEventListener(${varName}, '${argContent}', _ctx.${expContent}));`,
          });
        }
      }
      break;
    }

    case 'model': {
      if (expContent) {
        usedImports.add('effect');
        usedImports.add('onCleanup');
        usedImports.add('addEventListener');
        dynamicBindings.push({
          varName,
          code: `effect(() => { ${varName}.value = _ctx.${expContent}; });`,
        });
        dynamicBindings.push({
          varName,
          code: `onCleanup(addEventListener(${varName}, 'input', ($e) => { _ctx.${expContent} = $e.target.value; }));`,
        });
      }
      break;
    }

    case 'for': {
      // v-for 在 transform 阶段已被转换为 JSCallExpression (renderList)
      // 此处作为后备处理
      break;
    }
  }
}

// ============================================================
// Process JSConditionalExpression (v-if 转换结果)
// ============================================================

function processConditional(
  node: JSConditionalExpression,
  _lines: string[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedImports: Set<string>,
  parentVar?: string,
): void {
  const testExpr = getTestExpr(node.test);
  if (!testExpr) return;

  // 获取条件分支中的元素信息
  const consequentInfo = extractElementFromBranch(node.consequent);

  // 确定目标变量名
  let targetVar = parentVar;
  if (!targetVar && consequentInfo) {
    // 查找已有变量名
    const existing = findExistingVar(elementVars, consequentInfo.tag);
    if (existing) {
      targetVar = existing;
    } else {
      const varName = genVarName(consequentInfo.tag, varCounter);
      elementVars.push({ varName, tag: consequentInfo.tag });
      targetVar = varName;
    }
  }

  if (targetVar) {
    usedImports.add('effect');
    // 检查 consequent 中是否有插值
    const consequentChildren = extractChildrenText(node.consequent);
    const alternateChildren = node.alternate ? extractChildrenText(node.alternate) : null;

    if (consequentChildren) {
      dynamicBindings.push({
        varName: targetVar,
        code: `effect(() => {\n    if (_ctx.${testExpr}) {\n      ${targetVar}.style.display = '';\n      setText(${targetVar}, _ctx.${consequentChildren});\n    } else {\n      ${targetVar}.style.display = 'none';${alternateChildren ? `\n      setText(${targetVar}, _ctx.${alternateChildren});` : ''}\n    }\n  });`,
      });
    } else {
      dynamicBindings.push({
        varName: targetVar,
        code: `effect(() => {\n    if (_ctx.${testExpr}) {\n      ${targetVar}.style.display = '';\n    } else {\n      ${targetVar}.style.display = 'none';\n    }\n  });`,
      });
    }

    // 处理 consequent 分支中的子元素动态绑定
    processBranchDynamics(
      node.consequent,
      targetVar,
      varCounter,
      elementVars,
      dynamicBindings,
      usedImports,
    );

    // 处理 alternate 分支中的子元素动态绑定
    if (node.alternate) {
      processBranchDynamics(
        node.alternate,
        targetVar,
        varCounter,
        elementVars,
        dynamicBindings,
        usedImports,
      );
    }
  }
}

// ============================================================
// Process JSCallExpression (v-for 转换结果)
// ============================================================

function processCallExpression(
  node: JSCallExpression,
  _lines: string[],
  _varCounter: Map<string, number>,
  _elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedImports: Set<string>,
  parentVar?: string,
): void {
  const callee = typeof node.callee === 'string' ? node.callee : String(node.callee);

  // RENDER_LIST 是 v-for 转换后的 callee
  if (callee === 'RENDER_LIST' || callee === 'renderList') {
    usedImports.add('effect');
    usedImports.add('reconcileArray');

    // 提取迭代源和渲染函数
    const sourceExpr = node.arguments[0];
    const renderFn = node.arguments[1];

    const source = getTestExpr(sourceExpr as JSChildNode | string | undefined);
    if (!source) return;

    // 从渲染函数中提取 item 变量名和 key
    let itemVar = 'item';
    let keyExpr = '';
    let createBody = '';

    if (renderFn && typeof renderFn !== 'string' && !Array.isArray(renderFn)) {
      if (renderFn.type === NodeTypes.COMPOUND_EXPRESSION) {
        const compound = renderFn as CompoundExpressionNode;
        // 第一个子节点通常是参数列表 "(item) => " 或 "(item, index) => "
        for (const child of compound.children) {
          if (typeof child === 'string') {
            const match = child.match(/\((\w+)/);
            if (match) {
              itemVar = match[1]!;
            }
          }
        }
        // 后续子节点是 VNodeCall，提取 tag 和 children
        for (const child of compound.children) {
          if (
            typeof child !== 'string' &&
            child.type === NodeTypes.VNODE_CALL
          ) {
            const vnode = child as VNodeCall;
            const tagInfo = extractTagFromVNode(vnode);
            if (tagInfo) {
              createBody = `const ${tagInfo.varName} = document.createElement('${tagInfo.tag}');`;

              // 提取 children 中的插值
              if (vnode.children) {
                if (typeof vnode.children === 'string') {
                  createBody += `\n      setText(${tagInfo.varName}, '${vnode.children}');`;
                } else if (
                  vnode.children &&
                  typeof vnode.children === 'object' &&
                  'type' in vnode.children &&
                  (vnode.children as SimpleExpressionNode).type === NodeTypes.SIMPLE_EXPRESSION
                ) {
                  createBody += `\n      setText(${tagInfo.varName}, ${itemVar}.${(vnode.children as SimpleExpressionNode).content});`;
                } else if (
                  vnode.children &&
                  typeof vnode.children === 'object' &&
                  'type' in vnode.children &&
                  (vnode.children as JSCallExpression).type === NodeTypes.JS_CALL_EXPRESSION
                ) {
                  const callExpr = vnode.children as JSCallExpression;
                  const callCallee =
                    typeof callExpr.callee === 'string'
                      ? callExpr.callee
                      : String(callExpr.callee);
                  if (
                    callCallee === 'TO_DISPLAY_STRING' ||
                    callCallee === 'toDisplayString'
                  ) {
                    const arg = callExpr.arguments[0];
                    if (
                      arg &&
                      typeof arg !== 'string' &&
                      !Array.isArray(arg) &&
                      arg.type === NodeTypes.SIMPLE_EXPRESSION
                    ) {
                      const propAccess = (arg as SimpleExpressionNode).content;
                      createBody += `\n      setText(${tagInfo.varName}, ${itemVar}.${propAccess});`;
                    }
                  }
                }
              }

              createBody += `\n      return ${tagInfo.varName};`;
            }
          }
        }
      }
    }

    // 提取 :key 绑定
    keyExpr = `${itemVar}.id`;

    // 确定父容器变量名
    const containerVar = parentVar ?? '_ul';

    dynamicBindings.push({
      varName: containerVar,
      code: `effect(() => {\n    reconcileArray(${containerVar}, _ctx.${source}, {\n      key: (${itemVar}) => ${keyExpr},\n      create: (${itemVar}) => {\n        ${createBody}\n      }\n    });\n  });`,
    });
  }
}

// ============================================================
// Helper: 从 VNodeCall 提取标签信息
// ============================================================

function extractTagFromVNode(
  vnode: VNodeCall,
): { tag: string; varName: string } | null {
  if (typeof vnode.tag === 'string') {
    // 去掉引号
    const tag = vnode.tag.replace(/^"|"$/g, '');
    return { tag, varName: `_${tag}` };
  }
  return null;
}

// ============================================================
// Helper: 获取 test 表达式
// ============================================================

function getTestExpr(test: JSChildNode | string | undefined): string {
  if (!test) return '';
  if (typeof test === 'string') return test;
  if (test.type === NodeTypes.SIMPLE_EXPRESSION) return test.content;
  if (test.type === NodeTypes.COMPOUND_EXPRESSION) {
    return getExpContent(test as CompoundExpressionNode);
  }
  return '';
}

// ============================================================
// Helper: 从条件分支中提取元素信息
// ============================================================

function extractElementFromBranch(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): { tag: string } | null {
  if (!branch) return null;
  if (typeof branch === 'string') return null;
  if (Array.isArray(branch)) {
    for (const item of branch) {
      const result = extractElementFromBranch(item);
      if (result) return result;
    }
    return null;
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (typeof vnode.tag === 'string') {
      return { tag: vnode.tag.replace(/^"|"$/g, '') };
    }
  }
  if (branch.type === NodeTypes.ELEMENT) {
    return { tag: (branch as ElementNode).tag };
  }
  return null;
}

// ============================================================
// Helper: 从条件分支中提取插值文本
// ============================================================

function extractChildrenText(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): string | null {
  if (!branch) return null;
  if (typeof branch === 'string') return null;
  if (Array.isArray(branch)) {
    for (const item of branch) {
      const result = extractChildrenText(item);
      if (result) return result;
    }
    return null;
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (vnode.children && typeof vnode.children === 'string') {
      // 静态文本子节点，不需要动态绑定
      return null;
    }
    if (
      vnode.children &&
      typeof vnode.children !== 'string' &&
      !Array.isArray(vnode.children) &&
      vnode.children.type === NodeTypes.JS_CALL_EXPRESSION
    ) {
      const call = vnode.children as JSCallExpression;
      const callee =
        typeof call.callee === 'string' ? call.callee : String(call.callee);
      if (
        callee === 'TO_DISPLAY_STRING' ||
        callee === 'toDisplayString'
      ) {
        const arg = call.arguments[0];
        if (
          arg &&
          typeof arg !== 'string' &&
          !Array.isArray(arg) &&
          arg.type === NodeTypes.SIMPLE_EXPRESSION
        ) {
          return (arg as SimpleExpressionNode).content;
        }
      }
    }
  }
  return null;
}

// ============================================================
// Helper: 处理条件分支中的动态绑定
// ============================================================

function processBranchDynamics(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
  _parentVar: string,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedImports: Set<string>,
): void {
  if (!branch || typeof branch === 'string') return;
  if (Array.isArray(branch)) {
    for (const item of branch) {
      processBranchDynamics(
        item,
        _parentVar,
        varCounter,
        elementVars,
        dynamicBindings,
        usedImports,
      );
    }
    return;
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (vnode.props && vnode.props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
      const objExpr = vnode.props as JSObjectExpression;
      for (const prop of objExpr.properties) {
        if (prop.type === NodeTypes.JS_PROPERTY) {
          const jsProp = prop as JSProperty;
          if (
            jsProp.key.type === NodeTypes.SIMPLE_EXPRESSION &&
            jsProp.value.type === NodeTypes.SIMPLE_EXPRESSION
          ) {
            const key = (jsProp.key as SimpleExpressionNode).content.replace(
              /^"|"$/g,
              '',
            );
            const value = (jsProp.value as SimpleExpressionNode).content;
            // 处理 :class, :style, 其他属性绑定
            if (key === 'class') {
              usedImports.add('effect');
              usedImports.add('setClass');
              dynamicBindings.push({
                varName: _parentVar,
                code: `effect(() => setClass(${_parentVar}, ${value}));`,
              });
            } else if (key === 'style') {
              usedImports.add('effect');
              usedImports.add('setStyle');
              dynamicBindings.push({
                varName: _parentVar,
                code: `effect(() => setStyle(${_parentVar}, ${value}));`,
              });
            }
          }
        }
      }
    }
  }
}
