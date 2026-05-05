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
  const consumedCount = new Map<string, number>();

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
  processChildren(ast.children, varCounter, elementVars, dynamicBindings, consumedCount);

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
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
): void {
  for (const child of children) {
    if (child.type === NodeTypes.ELEMENT) {
      processElement(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditional(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        undefined,
        consumedCount,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpression(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
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
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
): void {
  // 查找已由 buildStaticHTML 分配的变量名
  // 使用 elementVars 中已有的条目来获取变量名，而不是重新生成
  const existingEntry = findExistingVar(elementVars, node.tag, consumedCount);
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
      );
    }
  }

  // 处理 codegenNode 中的属性（transform 阶段将 v-text/v-html 转换为 textContent/innerHTML 属性）
  if (node.codegenNode && node.codegenNode.type === NodeTypes.VNODE_CALL) {
    const vnode = node.codegenNode as VNodeCall;
    processVNodeCallProps(vnode, varName, dynamicBindings);
  }

  // 处理子节点中的动态内容
  for (const child of node.children) {
    if (child.type === NodeTypes.INTERPOLATION) {
      const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
      // FIX: P1-27 插值表达式安全验证：检查表达式是否为合法的属性访问路径，
      // 避免注入恶意代码导致 XSS 或运行时错误
      if (!exp || !/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(exp)) {
        if (__DEV__) {
          console.warn(
            `[lytjs/compiler] Invalid interpolation expression: "${exp}". ` +
            `Only simple property access paths are supported in signal mode.`,
          );
        }
        continue;
      }
      dynamicBindings.push({
        varName,
        code: `effect(() => setText(${varName}, _ctx.${exp}));`,
      });
    } else if (child.type === NodeTypes.ELEMENT) {
      processElement(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditional(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        varName,
        consumedCount,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpression(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
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
  consumedCount?: Map<string, number>,
): string | null {
  // 查找匹配标签的、尚未被 processElement 处理过的变量
  // 通过 consumedCount 跟踪每个标签已消费的数量，避免重复标签返回相同变量名
  const matching = elementVars.filter((v) => v.tag === tag);
  if (matching.length > 0) {
    const idx = consumedCount?.get(tag) ?? 0;
    consumedCount?.set(tag, idx + 1);
    return matching[idx]!.varName;
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
      dynamicBindings.push({
        varName,
        code: `effect(() => setText(${varName}, ${value}));`,
      });
    } else if (key === 'innerHTML') {
      // v-html 转换后的结果
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
  tag: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
): void {
  const expContent = dir.exp ? getExpContent(dir.exp as SimpleExpressionNode) : undefined;
  const argContent = dir.arg ? getExpContent(dir.arg as SimpleExpressionNode) : undefined;

  switch (dir.name) {
    case 'if': {
      // v-if 在 transform 阶段已被转换为 JSConditionalExpression
      // 此处作为后备处理，使用 insert/remove 方式
      if (expContent) {
        dynamicBindings.push({
          varName,
          code: `let _ifFallbackEl = null;\n  effect(() => {\n    if (_ctx.${expContent}) {\n      if (!_ifFallbackEl) {\n        _ifFallbackEl = ${varName};\n        insert(_ifFallbackEl, _container);\n      }\n    } else {\n      if (_ifFallbackEl) {\n        remove(_ifFallbackEl);\n        _ifFallbackEl = null;\n      }\n    }\n  });`,
        });
      }
      break;
    }

    case 'show': {
      if (expContent) {
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
        dynamicBindings.push({
          varName,
          code: `effect(() => setHTML(${varName}, _ctx.${expContent}));`,
        });
      }
      break;
    }

    case 'bind': {
      if (argContent && expContent) {
        if (argContent === 'class') {
          dynamicBindings.push({
            varName,
            code: `effect(() => setClass(${varName}, _ctx.${expContent}));`,
          });
        } else if (argContent === 'style') {
          dynamicBindings.push({
            varName,
            code: `effect(() => setStyle(${varName}, _ctx.${expContent}));`,
          });
        } else {
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
        if (dir.modifiers.length > 0) {
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
        const tagLower = tag.toLowerCase();
        const modifiers = dir.modifiers;
        const isLazy = modifiers.includes('lazy');
        const isNumber = modifiers.includes('number');
        const isTrim = modifiers.includes('trim');

        // 确定事件类型和取值方式
        let eventName: string;
        let getValueExpr: string;
        if (tagLower === 'select') {
          eventName = 'change';
          getValueExpr = '$e.target.value';
        } else if (tagLower === 'textarea') {
          eventName = isLazy ? 'change' : 'input';
          getValueExpr = '$e.target.value';
        } else {
          // input 元素（默认）
          eventName = isLazy ? 'change' : 'input';
          getValueExpr = '$e.target.value';
        }

        // 构建赋值表达式（应用修饰符）
        let setValueExpr = getValueExpr;
        if (isNumber) {
          setValueExpr = `Number(${getValueExpr})`;
        }
        if (isTrim) {
          setValueExpr = `(${getValueExpr}).trim()`;
        }
        if (isNumber && isTrim) {
          // .number.trim 组合：先 trim 再转 number
          setValueExpr = `Number((${getValueExpr}).trim())`;
        }

        // 生成双向绑定代码
        dynamicBindings.push({
          varName,
          code: `effect(() => { ${varName}.value = _ctx.${expContent}; });`,
        });
        dynamicBindings.push({
          varName,
          code: `onCleanup(addEventListener(${varName}, '${eventName}', ($e) => { _ctx.${expContent} = ${setValueExpr}; }));`,
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
// 使用 createTemplate + insert/remove 实现真正的 DOM 插入/移除
// ============================================================

function processConditional(
  node: JSConditionalExpression,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  parentVar?: string,
  consumedCount?: Map<string, number>,
): void {
  const testExpr = getTestExpr(node.test);
  if (!testExpr) return;

  // 收集所有条件分支（v-if / v-else-if / v-else 链）
  const branches: Array<{
    condition: string | null; // null 表示 v-else（无条件）
    branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined;
  }> = [];

  // 收集 consequent 分支
  branches.push({
    condition: testExpr,
    branch: node.consequent,
  });

  // 递归收集 alternate 链（v-else-if / v-else）
  let alternate = node.alternate;
  while (alternate) {
    if (
      typeof alternate !== 'string' &&
      !Array.isArray(alternate) &&
      alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION
    ) {
      const altCond = alternate as JSConditionalExpression;
      const altTestExpr = getTestExpr(altCond.test);
      branches.push({
        condition: altTestExpr || null,
        branch: altCond.consequent,
      });
      alternate = altCond.alternate;
    } else {
      // v-else 分支（无条件）
      branches.push({
        condition: null,
        branch: alternate,
      });
      alternate = undefined;
    }
  }

  // 为每个分支注册变量名（确保 varCounter 和 elementVars 正确递增）
  for (let i = 0; i < branches.length; i++) {
    const branchInfo = branches[i]!;
    const elInfo = extractElementFromBranch(branchInfo.branch);
    if (elInfo) {
      const existing = findExistingVar(elementVars, elInfo.tag, consumedCount);
      if (!existing) {
        const varName = genVarName(elInfo.tag, varCounter);
        elementVars.push({ varName, tag: elInfo.tag });
      }
    }
  }

  // 序列化每个分支的 HTML
  const branchHTMLs: string[] = [];
  for (const branchInfo of branches) {
    const html = serializeBranchHTML(branchInfo.branch);
    branchHTMLs.push(html);
  }

  // 确定父容器和参考节点
  const containerVar = parentVar ?? '_container';
  // FIX: P1-28 使用唯一计数器键确保嵌套 v-if 生成唯一变量名，
  // 避免嵌套场景下变量名冲突
  const ifCounterKey = `_if_${varCounter.get('_if_depth') ?? 0}`;
  const ifVarName = `_if${varCounter.get(ifCounterKey) ?? 0}`;
  varCounter.set(ifCounterKey, (varCounter.get(ifCounterKey) ?? 0) + 1);
  varCounter.set('_if_depth', (varCounter.get('_if_depth') ?? 0) + 1);

  // FIX: P2-24 模板缩进保持：生成的代码保持与模板一致的缩进层级
  // 生成条件分支的 DOM 插入/移除代码
  let code = `let ${ifVarName}El = null;\n`;
  code += `let ${ifVarName}Active = -1;\n`;
  code += `effect(() => {\n`;

  for (let i = 0; i < branches.length; i++) {
    const branchInfo = branches[i]!;
    const branchHTML = branchHTMLs[i]!;

    if (i > 0) {
      code += `    } else `;
    }

    if (branchInfo.condition !== null) {
      code += `if (_ctx.${branchInfo.condition}) `;
    }

    code += `{\n`;
    code += `      if (${ifVarName}Active !== ${i}) {\n`;

    // 移除之前的分支元素
    if (i === 0) {
      code += `        if (${ifVarName}El) {\n`;
      code += `          remove(${ifVarName}El);\n`;
      code += `          ${ifVarName}El = null;\n`;
      code += `        }\n`;
    }

    // 创建并插入新分支元素
    code += `        ${ifVarName}El = createTemplate(${JSON.stringify(branchHTML)}).firstElementChild;\n`;
    // FIX: P0-07 添加 null 检查，防止空 HTML 或纯文本 HTML 导致 firstElementChild 为 null 时崩溃
    code += `        if (!${ifVarName}El) { ${ifVarName}El = document.createComment(''); }\n`;
    if (branchHTML.trim()) {
      code += `        insert(${ifVarName}El, ${containerVar});\n`;
    }
    code += `        ${ifVarName}Active = ${i};\n`;

    // 处理分支内的动态绑定（如插值文本）
    const childrenText = extractChildrenText(branchInfo.branch);
    if (childrenText && branchHTML.trim()) {
      code += `        setText(${ifVarName}El, _ctx.${childrenText});\n`;
    }

    code += `      }`;

    // 如果分支已激活，更新动态内容
    const childrenTextUpdate = extractChildrenText(branchInfo.branch);
    if (childrenTextUpdate && branchHTML.trim()) {
      code += ` else {\n`;
      code += `        setText(${ifVarName}El, _ctx.${childrenTextUpdate});\n`;
      code += `      }`;
    }

    code += `\n`;
  }

  // 如果所有条件都不满足，移除元素
  code += `    } else {\n`;
  code += `      if (${ifVarName}El) {\n`;
  code += `        remove(${ifVarName}El);\n`;
  code += `        ${ifVarName}El = null;\n`;
  code += `        ${ifVarName}Active = -1;\n`;
  code += `      }\n`;
  code += `    }\n`;
  code += `  });`;

  dynamicBindings.push({
    varName: containerVar,
    code,
  });

  // 处理每个分支中的子元素动态绑定（如 :class, :style 等）
  for (let i = 0; i < branches.length; i++) {
    processBranchDynamics(
      branches[i]!.branch,
      containerVar,
      varCounter,
      elementVars,
      dynamicBindings,
    );
  }
}

// ============================================================
// Helper: 序列化条件分支为 HTML 字符串
// ============================================================

function serializeBranchHTML(
  branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined,
): string {
  if (!branch) return '';
  if (typeof branch === 'string') return branch;
  if (Array.isArray(branch)) {
    return branch.map((item) => serializeBranchHTML(item)).join('');
  }
  if (branch.type === NodeTypes.VNODE_CALL) {
    const vnode = branch as VNodeCall;
    if (typeof vnode.tag === 'string') {
      const tag = vnode.tag.replace(/^"|"$/g, '');
      let attrs = '';
      // 从 props 中提取静态属性
      if (vnode.props && vnode.props.type === NodeTypes.JS_OBJECT_EXPRESSION) {
        const objExpr = vnode.props as JSObjectExpression;
        for (const prop of objExpr.properties) {
          if (prop.type === NodeTypes.JS_PROPERTY) {
            const jsProp = prop as JSProperty;
            if (
              jsProp.key.type === NodeTypes.SIMPLE_EXPRESSION &&
              jsProp.value.type === NodeTypes.SIMPLE_EXPRESSION
            ) {
              const key = (jsProp.key as SimpleExpressionNode).content.replace(/^"|"$/g, '');
              const value = (jsProp.value as SimpleExpressionNode).content;
              // 只序列化静态属性值（不包含 _ctx 引用的）
              if (!value.includes('_ctx') && !value.includes('(')) {
                attrs += ` ${key}="${value.replace(/^"|"$/g, '')}"`;
              }
            }
          }
        }
      }
      // 序列化 children
      let childrenHTML = '';
      if (vnode.children) {
        if (typeof vnode.children === 'string') {
          childrenHTML = vnode.children;
        } else if (Array.isArray(vnode.children)) {
          childrenHTML = vnode.children.map((c) => serializeBranchHTML(c)).join('');
        }
      }
      return `<${tag}${attrs}>${childrenHTML}</${tag}>`;
    }
  }
  if (branch.type === NodeTypes.ELEMENT) {
    return serializeStaticHTML(branch as ElementNode, new Map(), []);
  }
  return '';
}

// ============================================================
// Process JSCallExpression (v-for 转换结果)
// ============================================================

function processCallExpression(
  node: JSCallExpression,
  _varCounter: Map<string, number>,
  _elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  parentVar?: string,
): void {
  const callee = typeof node.callee === 'string' ? node.callee : String(node.callee);

  // RENDER_LIST 是 v-for 转换后的 callee
  if (callee === 'RENDER_LIST' || callee === 'renderList') {

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
    // 从 compound.children 中的 VNodeCall props 中查找用户指定的 key
    let userKeyExpr: string | null = null;
    if (renderFn && typeof renderFn !== 'string' && !Array.isArray(renderFn)) {
      if (renderFn.type === NodeTypes.COMPOUND_EXPRESSION) {
        const compound = renderFn as CompoundExpressionNode;
        for (const child of compound.children) {
          if (
            typeof child !== 'string' &&
            child.type === NodeTypes.VNODE_CALL
          ) {
            const vnode = child as VNodeCall;
            if (
              vnode.props &&
              vnode.props.type === NodeTypes.JS_OBJECT_EXPRESSION
            ) {
              const objExpr = vnode.props as JSObjectExpression;
              for (const prop of objExpr.properties) {
                if (prop.type === NodeTypes.JS_PROPERTY) {
                  const jsProp = prop as JSProperty;
                  if (
                    jsProp.key &&
                    typeof jsProp.key !== 'string' &&
                    !Array.isArray(jsProp.key) &&
                    jsProp.key.type === NodeTypes.SIMPLE_EXPRESSION &&
                    jsProp.key.content === 'key'
                  ) {
                    // Found the key property, extract its value
                    if (
                      jsProp.value &&
                      typeof jsProp.value !== 'string' &&
                      !Array.isArray(jsProp.value) &&
                      jsProp.value.type === NodeTypes.SIMPLE_EXPRESSION
                    ) {
                      userKeyExpr = jsProp.value.content;
                    }
                    break;
                  }
                }
              }
            }
            if (userKeyExpr) break;
          }
        }
      }
    }
    keyExpr = userKeyExpr ?? `${itemVar}.id`;

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
              dynamicBindings.push({
                varName: _parentVar,
                code: `effect(() => setClass(${_parentVar}, ${value}));`,
              });
            } else if (key === 'style') {
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
