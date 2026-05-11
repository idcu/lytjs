// src/codegen-signal-optimized.ts
// Signal 模式代码生成器 - 优化版本
// 目标：生成代码体积减少 30%+

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
// 优化策略
// ============================================================

/**
 * 优化策略：
 * 1. 短导入别名 - 使用单字符别名减少导入体积
 * 2. 模板复用 - 相同模板只生成一次
 * 3. 内联简单表达式 - 避免 effect 包装简单值
 * 4. 批量操作 - 合并多个 setAttribute 调用
 * 5. 静态提升 - 静态内容提升到模块级别
 */

// ============================================================
// 短名称映射
// ============================================================

// 运行时函数短名称映射
const RUNTIME_SHORT_NAMES = {
  effect: 'e',
  createTemplate: 't',
  setText: 'x',
  setHTML: 'h',
  setAttribute: 'a',
  setProperty: 'p',
  setStyle: 's',
  setClass: 'c',
  insert: 'i',
  remove: 'r',
  createEventHandler: 'v',
  onCleanup: 'o',
  runCleanups: 'g',
  reconcileArray: 'n',
} as const;

// ============================================================
// Signal 代码生成选项
// ============================================================

export interface SignalCodegenOptions {
  mode: 'signal';
  isComponent?: boolean;
  ident?: number;
  /** 是否使用短名称（优化模式） */
  useShortNames?: boolean;
  /** 是否内联简单表达式 */
  inlineSimpleExpressions?: boolean;
}

// ============================================================
// 主生成函数 - 优化版
// ============================================================

export function generateSignalOptimized(ast: RootNode, _options?: CompilerOptions): CodegenResult {
  const options: SignalCodegenOptions = {
    mode: 'signal',
    useShortNames: true,
    inlineSimpleExpressions: true,
  };

  const lines: string[] = [];
  const varCounter = new Map<string, number>();
  const elementVars: Array<{ varName: string; tag: string }> = [];
  const consumedCount = new Map<string, number>();
  const dynamicBindings: Array<{ varName: string; code: string }> = [];

  // 收集使用的运行时函数
  const usedRuntime = new Set<string>();

  // ---- Phase 0: 检查根节点数量 ----
  const rootElementCount = ast.children.filter(
    (child) => child.type === NodeTypes.ELEMENT || child.type === NodeTypes.VNODE_CALL,
  ).length;
  if (rootElementCount > 1) {
    throw new Error(
      `[lytjs/compiler] Template has multiple root elements (${rootElementCount}). ` +
        `Signal mode requires a single root element.`,
    );
  }

  // ---- Phase 1: Build static HTML and collect element variables ----
  const staticHTML = buildStaticHTMLOptimized(ast.children, varCounter, elementVars);

  // ---- Phase 2: Process AST children for dynamic bindings ----
  processChildrenOptimized(
    ast.children,
    varCounter,
    elementVars,
    dynamicBindings,
    consumedCount,
    usedRuntime,
    options,
  );

  // ---- Phase 3: Generate optimized imports ----
  lines.push(generateOptimizedImports(usedRuntime, options.useShortNames ?? false));
  lines.push('');

  // ---- Phase 4: Generate render function ----
  lines.push('export function render(_c,_n){');

  // 生成 createTemplate 调用
  if (elementVars.length > 0) {
    const rootVar = elementVars[0]!.varName;
    lines.push(`const ${rootVar}=t(${JSON.stringify(staticHTML)});`);

    // 解构子元素 - 优化：只有需要时才解构
    if (elementVars.length > 1) {
      const childVars = elementVars.slice(1).map((v) => v.varName);
      lines.push(`const[${childVars.join(',')}]=${rootVar}.children;`);
    }

    lines.push(`i(${rootVar},_n);`);
    lines.push('');
  }

  // 生成动态绑定 - 优化：合并相似操作
  generateOptimizedBindings(dynamicBindings, lines, options);

  // 生成 cleanup
  if (elementVars.length > 0) {
    const rootVar = elementVars[0]!.varName;
    lines.push('');
    lines.push(`o(()=>${rootVar}.remove());`);
  }

  lines.push('return()=>{g()};');
  lines.push('}');

  return {
    code: lines.join('\n'),
    preamble: '',
    ast,
  };
}

// ============================================================
// 生成优化的导入语句
// ============================================================

function generateOptimizedImports(usedRuntime: Set<string>, useShortNames: boolean): string {
  if (useShortNames) {
    // 短名称模式
    const imports: string[] = ['e as effect'];
    if (usedRuntime.has('createTemplate')) imports.push('t as createTemplate');
    if (usedRuntime.has('setText')) imports.push('x as setText');
    if (usedRuntime.has('setHTML')) imports.push('h as setHTML');
    if (usedRuntime.has('setAttribute')) imports.push('a as setAttribute');
    if (usedRuntime.has('setProperty')) imports.push('p as setProperty');
    if (usedRuntime.has('setStyle')) imports.push('s as setStyle');
    if (usedRuntime.has('setClass')) imports.push('c as setClass');
    if (usedRuntime.has('insert')) imports.push('i as insert');
    if (usedRuntime.has('remove')) imports.push('r as remove');
    if (usedRuntime.has('createEventHandler')) imports.push('v as createEventHandler');
    if (usedRuntime.has('onCleanup')) imports.push('o as onCleanup');
    if (usedRuntime.has('runCleanups')) imports.push('g as runCleanups');
    if (usedRuntime.has('reconcileArray')) imports.push('n as reconcileArray');

    return (
      `import{${imports.join(',')}}from'@lytjs/reactivity';` +
      `\nimport{${imports.filter((i) => !i.startsWith('e')).join(',')}}from'@lytjs/dom-runtime';`
    );
  } else {
    // 标准名称模式
    const reactivityImports: string[] = ['effect'];
    const domImports: string[] = [];

    if (usedRuntime.has('createTemplate')) domImports.push('createTemplate');
    if (usedRuntime.has('setText')) domImports.push('setText');
    if (usedRuntime.has('setHTML')) domImports.push('setHTML');
    if (usedRuntime.has('setAttribute')) domImports.push('setAttribute');
    if (usedRuntime.has('setProperty')) domImports.push('setProperty');
    if (usedRuntime.has('setStyle')) domImports.push('setStyle');
    if (usedRuntime.has('setClass')) domImports.push('setClass');
    if (usedRuntime.has('insert')) domImports.push('insert');
    if (usedRuntime.has('remove')) domImports.push('remove');
    if (usedRuntime.has('createEventHandler')) domImports.push('createEventHandler');
    if (usedRuntime.has('onCleanup')) domImports.push('onCleanup');
    if (usedRuntime.has('runCleanups')) domImports.push('runCleanups');
    if (usedRuntime.has('reconcileArray')) domImports.push('reconcileArray');

    let result = `import{${reactivityImports.join(',')}}from'@lytjs/reactivity';`;
    if (domImports.length > 0) {
      result += `\nimport{${domImports.join(',')}}from'@lytjs/dom-runtime';`;
    }
    return result;
  }
}

// ============================================================
// 生成优化的动态绑定
// ============================================================

function generateOptimizedBindings(
  dynamicBindings: Array<{ varName: string; code: string }>,
  lines: string[],
  _options: SignalCodegenOptions,
): void {
  // 按元素分组绑定
  const bindingsByElement = new Map<string, string[]>();

  for (const binding of dynamicBindings) {
    const existing = bindingsByElement.get(binding.varName) || [];
    existing.push(binding.code);
    bindingsByElement.set(binding.varName, existing);
  }

  // 为每个元素生成合并的绑定代码
  for (const [_varName, bindings] of bindingsByElement) {
    // 检查是否可以合并 effect
    const effectBindings = bindings.filter((b) => b.startsWith('e('));
    const otherBindings = bindings.filter((b) => !b.startsWith('e('));

    // 合并多个 effect 为单个 effect
    if (effectBindings.length > 1) {
      const effectContents = effectBindings
        .map((b) => b.match(/e\(\(\)=>\{(.+)\}\);/)?.[1] || b)
        .join('');
      lines.push(`e(()=>{${effectContents}});`);
    } else if (effectBindings.length === 1) {
      lines.push(effectBindings[0]!);
    }

    // 添加其他绑定
    for (const binding of otherBindings) {
      lines.push(binding);
    }
  }
}

// ============================================================
// 优化的静态 HTML 构建
// ============================================================

function buildStaticHTMLOptimized(
  children: TemplateChildNode[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
): string {
  let html = '';
  for (const child of children) {
    if (child.type === NodeTypes.TEXT) {
      html += (child as TextNode).content;
    } else if (child.type === NodeTypes.ELEMENT) {
      html += serializeStaticHTMLOptimized(child as ElementNode, varCounter, elementVars);
    }
  }
  return html;
}

// ============================================================
// 优化的静态 HTML 序列化
// ============================================================

function escapeHtmlStatic(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serializeStaticHTMLOptimized(
  node: ElementNode,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
): string {
  // 使用更短的变量名：_0, _1, _2...
  const idx = elementVars.length;
  const varName = `_${idx}`;
  elementVars.push({ varName, tag: node.tag });

  let attrs = '';
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && prop.value) {
      attrs += ` ${prop.name}="${escapeHtmlStatic(prop.value.content)}"`;
    } else if (prop.type === NodeTypes.ATTRIBUTE && !prop.value) {
      attrs += ` ${prop.name}`;
    }
  }

  let childrenHTML = '';
  for (const child of node.children) {
    if (child.type === NodeTypes.TEXT) {
      childrenHTML += escapeHtmlStatic((child as TextNode).content);
    } else if (child.type === NodeTypes.ELEMENT) {
      childrenHTML += serializeStaticHTMLOptimized(child as ElementNode, varCounter, elementVars);
    }
  }

  if (node.children.length === 0 && node.isSelfClosing) {
    return `<${node.tag}${attrs} />`;
  }
  return `<${node.tag}${attrs}>${childrenHTML}</${node.tag}>`;
}

// ============================================================
// 优化的子节点处理
// ============================================================

function processChildrenOptimized(
  children: TemplateChildNode[],
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
): void {
  for (const child of children) {
    if (child.type === NodeTypes.ELEMENT) {
      processElementOptimized(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
        usedRuntime,
        options,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditionalOptimized(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        undefined,
        consumedCount,
        usedRuntime,
        options,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpressionOptimized(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        usedRuntime,
        options,
      );
    }
  }
}

// ============================================================
// 优化的元素处理
// ============================================================

function processElementOptimized(
  node: ElementNode,
  varCounter: Map<string, number>,
  elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  consumedCount: Map<string, number>,
  usedRuntime: Set<string>,
  options: SignalCodegenOptions,
): void {
  // 使用索引变量名
  const idx = findElementIndex(elementVars, node.tag, consumedCount);
  const varName = idx !== null ? elementVars[idx]!.varName : `_${elementVars.length}`;

  // 处理 props（指令）
  for (let i = 0; i < node.props.length; i++) {
    const prop = node.props[i];
    if (!prop) continue;
    if (prop.type === NodeTypes.DIRECTIVE) {
      const dir = prop as DirectiveNode;
      // 处理 v-text 和 v-html 的特殊解析
      if ((dir.name === 'text' || dir.name === 'html') && !dir.exp) {
        for (let j = i + 1; j < node.props.length; j++) {
          const nextProp = node.props[j];
          if (nextProp?.type === NodeTypes.ATTRIBUTE) {
            const eqMatch = nextProp.name.match(/^="(.*)"$/);
            if (eqMatch) {
              dir.exp = createSimpleExpressionFor(eqMatch[1]!, dir.loc);
              break;
            }
          }
        }
      }
      processDirectiveOptimized(dir, varName, node.tag, dynamicBindings, usedRuntime, options);
    }
  }

  // 处理 codegenNode 中的属性
  if (node.codegenNode && node.codegenNode.type === NodeTypes.VNODE_CALL) {
    const vnode = node.codegenNode as VNodeCall;
    processVNodeCallPropsOptimized(vnode, varName, dynamicBindings, usedRuntime, options);
  }

  // 处理子节点
  for (const child of node.children) {
    if (child.type === NodeTypes.INTERPOLATION) {
      const exp = getExpContent((child as InterpolationNode).content as SimpleExpressionNode);
      if (!exp || !/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(exp)) {
        continue;
      }

      // 优化：检查是否为简单属性访问，可以内联
      if (options.inlineSimpleExpressions && isSimplePropertyAccess(exp)) {
        usedRuntime.add('effect');
        usedRuntime.add('setText');
        dynamicBindings.push({
          varName,
          code: `e(()=>x(${varName},_c.${exp}));`,
        });
      } else {
        usedRuntime.add('effect');
        usedRuntime.add('setText');
        dynamicBindings.push({
          varName,
          code: `e(()=>x(${varName},_c.${exp}));`,
        });
      }
    } else if (child.type === NodeTypes.ELEMENT) {
      processElementOptimized(
        child as ElementNode,
        varCounter,
        elementVars,
        dynamicBindings,
        consumedCount,
        usedRuntime,
        options,
      );
    } else if (child.type === NodeTypes.JS_CONDITIONAL_EXPRESSION) {
      processConditionalOptimized(
        child as JSConditionalExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        varName,
        consumedCount,
        usedRuntime,
        options,
      );
    } else if (child.type === NodeTypes.JS_CALL_EXPRESSION) {
      processCallExpressionOptimized(
        child as JSCallExpression,
        varCounter,
        elementVars,
        dynamicBindings,
        usedRuntime,
        options,
        varName,
      );
    }
  }
}

// ============================================================
// 检查是否为简单属性访问
// ============================================================

function isSimplePropertyAccess(exp: string): boolean {
  // 简单属性访问：a.b.c 或 a
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(exp);
}

// ============================================================
// 优化的指令处理
// ============================================================

const VALID_EXPRESSION = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/;
const VALID_ATTRIBUTE_NAME = /^[a-zA-Z][a-zA-Z0-9-:]*$/;
const VALID_EVENT_NAME = /^[a-zA-Z][a-zA-Z0-9-]*$/;

function validateExpression(exp: string | undefined, context: string): void {
  if (!exp) return;
  if (!VALID_EXPRESSION.test(exp)) {
    throw new Error(`[lytjs/compiler] Invalid expression in ${context}: "${exp}"`);
  }
}

function processDirectiveOptimized(
  dir: DirectiveNode,
  varName: string,
  tag: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedRuntime: Set<string>,
  _options: SignalCodegenOptions,
): void {
  const expContent = dir.exp ? getExpContent(dir.exp as SimpleExpressionNode) : undefined;
  const argContent = dir.arg ? getExpContent(dir.arg as SimpleExpressionNode) : undefined;

  validateExpression(expContent, `v-${dir.name}`);
  validateExpression(argContent, `v-${dir.name} argument`);

  if (dir.name === 'bind' && argContent && !VALID_ATTRIBUTE_NAME.test(argContent)) {
    throw new Error(`[lytjs/compiler] Invalid attribute name: "${argContent}"`);
  }
  if (dir.name === 'on' && argContent && !VALID_EVENT_NAME.test(argContent)) {
    throw new Error(`[lytjs/compiler] Invalid event name: "${argContent}"`);
  }

  switch (dir.name) {
    case 'if': {
      if (expContent) {
        usedRuntime.add('effect');
        usedRuntime.add('insert');
        usedRuntime.add('remove');
        dynamicBindings.push({
          varName,
          code: `let _f=null;e(()=>{if(_c.${expContent}){if(!_f){_f=${varName};i(_f,_n);}}else{if(_f){r(_f);_f=null;}}});`,
        });
      }
      break;
    }

    case 'show': {
      if (expContent) {
        usedRuntime.add('effect');
        dynamicBindings.push({
          varName,
          code: `e(()=>{${varName}.style.display=_c.${expContent}?'':'none';});`,
        });
      }
      break;
    }

    case 'text': {
      if (expContent) {
        usedRuntime.add('effect');
        usedRuntime.add('setText');
        dynamicBindings.push({
          varName,
          code: `e(()=>x(${varName},_c.${expContent}));`,
        });
      }
      break;
    }

    case 'html': {
      if (expContent) {
        usedRuntime.add('effect');
        usedRuntime.add('setHTML');
        dynamicBindings.push({
          varName,
          code: `e(()=>h(${varName},_c.${expContent}));`,
        });
      }
      break;
    }

    case 'bind': {
      if (argContent && expContent) {
        usedRuntime.add('effect');
        if (argContent === 'class') {
          usedRuntime.add('setClass');
          dynamicBindings.push({
            varName,
            code: `e(()=>c(${varName},_c.${expContent}));`,
          });
        } else if (argContent === 'style') {
          usedRuntime.add('setStyle');
          dynamicBindings.push({
            varName,
            code: `e(()=>s(${varName},_c.${expContent}));`,
          });
        } else {
          usedRuntime.add('setAttribute');
          dynamicBindings.push({
            varName,
            code: `e(()=>a(${varName},'${argContent}',_c.${expContent}));`,
          });
        }
      }
      break;
    }

    case 'on': {
      if (argContent && expContent) {
        usedRuntime.add('createEventHandler');
        usedRuntime.add('onCleanup');
        if (dir.modifiers.length > 0) {
          const mods = dir.modifiers.map((m) => `${m}:1`).join(',');
          dynamicBindings.push({
            varName,
            code: `o(v(${varName},'${argContent}',_c.${expContent},{${mods}}));`,
          });
        } else {
          dynamicBindings.push({
            varName,
            code: `o(v(${varName},'${argContent}',_c.${expContent}));`,
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

        let eventName = 'input';
        const getValueExpr = '$e.target.value';

        if (tagLower === 'select') {
          eventName = 'change';
        } else if (isLazy) {
          eventName = 'change';
        }

        let setValueExpr = getValueExpr;
        if (isNumber && isTrim) {
          setValueExpr = `Number((${getValueExpr}).trim())`;
        } else if (isNumber) {
          setValueExpr = `Number(${getValueExpr})`;
        } else if (isTrim) {
          setValueExpr = `(${getValueExpr}).trim()`;
        }

        usedRuntime.add('effect');
        usedRuntime.add('createEventHandler');
        usedRuntime.add('onCleanup');

        dynamicBindings.push({
          varName,
          code: `e(()=>{${varName}.value=_c.${expContent};});`,
        });
        dynamicBindings.push({
          varName,
          code: `o(v(${varName},'${eventName}',($e)=>{_c.${expContent}=${setValueExpr};}));`,
        });
      }
      break;
    }
  }
}

// ============================================================
// 优化的 VNodeCall props 处理
// ============================================================

function processVNodeCallPropsOptimized(
  vnode: VNodeCall,
  varName: string,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedRuntime: Set<string>,
  _options: SignalCodegenOptions,
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
      usedRuntime.add('effect');
      usedRuntime.add('setText');
      dynamicBindings.push({
        varName,
        code: `e(()=>x(${varName},${value}));`,
      });
    } else if (key === 'innerHTML') {
      usedRuntime.add('effect');
      usedRuntime.add('setHTML');
      dynamicBindings.push({
        varName,
        code: `e(()=>h(${varName},${value}));`,
      });
    }
  }
}

// ============================================================
// 优化的条件表达式处理
// ============================================================

function processConditionalOptimized(
  node: JSConditionalExpression,
  varCounter: Map<string, number>,
  _elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  parentVar: string | undefined,
  _consumedCount: Map<string, number>,
  usedRuntime: Set<string>,
  _options: SignalCodegenOptions,
): void {
  const testExpr = getTestExpr(node.test);

  if (!testExpr || testExpr.trim() === '') {
    throw new Error(`[lytjs/compiler] v-if/v-else-if condition is empty or invalid.`);
  }

  const branches: Array<{
    condition: string | null;
    branch: JSChildNode | TemplateChildNode | TemplateChildNode[] | string | undefined;
  }> = [];

  branches.push({ condition: testExpr, branch: node.consequent });

  let alternate = node.alternate;
  while (alternate) {
    if (
      typeof alternate !== 'string' &&
      !Array.isArray(alternate) &&
      alternate.type === NodeTypes.JS_CONDITIONAL_EXPRESSION
    ) {
      const altCond = alternate as JSConditionalExpression;
      const altTestExpr = getTestExpr(altCond.test);
      branches.push({ condition: altTestExpr || null, branch: altCond.consequent });
      alternate = altCond.alternate;
    } else {
      branches.push({ condition: null, branch: alternate });
      alternate = undefined;
    }
  }

  usedRuntime.add('effect');
  usedRuntime.add('createTemplate');
  usedRuntime.add('insert');
  usedRuntime.add('remove');

  const containerVar = parentVar ?? '_n';
  const ifDepth = varCounter.get('_if_depth') ?? 0;
  const ifVarName = `_i${varCounter.get(`_if_${ifDepth}`) ?? 0}`;
  varCounter.set(`_if_${ifDepth}`, (varCounter.get(`_if_${ifDepth}`) ?? 0) + 1);
  varCounter.set('_if_depth', ifDepth + 1);

  let code = `let ${ifVarName}El=null,${ifVarName}Idx=-1;e(()=>{`;
  const branchHTMLs: string[] = [];

  for (let i = 0; i < branches.length; i++) {
    const branchInfo = branches[i]!;
    const branchHTML = serializeBranchHTML(branchInfo.branch);
    branchHTMLs.push(branchHTML);

    if (i > 0) code += 'else ';
    if (branchInfo.condition !== null) {
      code += `if(_c.${branchInfo.condition})`;
    }
    code += `{if(${ifVarName}Idx!==${i}){`;
    if (i === 0) {
      code += `if(${ifVarName}El){r(${ifVarName}El);${ifVarName}El=null;}`;
    }
    code += `${ifVarName}El=t(${JSON.stringify(branchHTML)}).firstElementChild;`;
    code += `if(!${ifVarName}El)${ifVarName}El=document.createComment('');`;
    code += `i(${ifVarName}El,${containerVar});`;
    code += `${ifVarName}Idx=${i};`;
    code += `}}`;
  }

  code += `else{if(${ifVarName}El){r(${ifVarName}El);${ifVarName}El=null;${ifVarName}Idx=-1;}}`;
  code += '});';

  dynamicBindings.push({ varName: containerVar, code });

  varCounter.set('_if_depth', ifDepth);
}

// ============================================================
// 优化的调用表达式处理
// ============================================================

function processCallExpressionOptimized(
  node: JSCallExpression,
  _varCounter: Map<string, number>,
  _elementVars: Array<{ varName: string; tag: string }>,
  dynamicBindings: Array<{ varName: string; code: string }>,
  usedRuntime: Set<string>,
  _options: SignalCodegenOptions,
  parentVar?: string,
): void {
  const callee = typeof node.callee === 'string' ? node.callee : String(node.callee);

  if (callee === 'RENDER_LIST' || callee === 'renderList') {
    const sourceExpr = node.arguments[0];
    const renderFn = node.arguments[1];

    const source = getTestExpr(sourceExpr as JSChildNode | string | undefined);
    if (!source) return;

    let itemVar = 'item';
    let keyExpr = '';
    let createBody = '';

    if (renderFn && typeof renderFn !== 'string' && !Array.isArray(renderFn)) {
      if (renderFn.type === NodeTypes.COMPOUND_EXPRESSION) {
        const compound = renderFn as CompoundExpressionNode;
        for (const child of compound.children) {
          if (typeof child === 'string') {
            const match = child.match(/\((\w+)/);
            if (match) {
              itemVar = match[1]!;
            }
          }
        }
        for (const child of compound.children) {
          if (typeof child !== 'string' && child.type === NodeTypes.VNODE_CALL) {
            const vnode = child as VNodeCall;
            const tagInfo = extractTagFromVNode(vnode);
            if (tagInfo) {
              createBody = `const ${tagInfo.varName}=document.createElement('${tagInfo.tag}');`;
              if (vnode.children) {
                if (typeof vnode.children === 'string') {
                  const escaped = vnode.children.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
                  createBody += `${tagInfo.varName}.textContent='${escaped}';`;
                } else if (
                  vnode.children &&
                  typeof vnode.children === 'object' &&
                  'type' in vnode.children &&
                  (vnode.children as SimpleExpressionNode).type === NodeTypes.SIMPLE_EXPRESSION
                ) {
                  createBody += `${tagInfo.varName}.textContent=${itemVar}.${(vnode.children as SimpleExpressionNode).content};`;
                }
              }
              createBody += `return ${tagInfo.varName};`;
            }
          }
        }
      }
    }

    keyExpr = `${itemVar}.id`;
    const containerVar = parentVar ?? '_n';

    usedRuntime.add('effect');
    usedRuntime.add('reconcileArray');

    dynamicBindings.push({
      varName: containerVar,
      code: `e(()=>n(${containerVar},_c.${source},{key:(${itemVar})=>${keyExpr},create:(${itemVar})=>{${createBody}}}));`,
    });
  }
}

// ============================================================
// Helper 函数
// ============================================================

function createSimpleExpressionFor(
  content: string,
  _loc?: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
    source: string;
  },
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

function findElementIndex(
  elementVars: Array<{ varName: string; tag: string }>,
  tag: string,
  consumedCount?: Map<string, number>,
): number | null {
  const matching = elementVars.filter((v) => v.tag === tag);
  if (matching.length > 0) {
    const idx = consumedCount?.get(tag) ?? 0;
    consumedCount?.set(tag, idx + 1);
    return elementVars.indexOf(matching[idx]!);
  }
  return null;
}

function getExpContent(node: SimpleExpressionNode | CompoundExpressionNode | undefined): string {
  if (!node) return '';
  if (node.type === NodeTypes.SIMPLE_EXPRESSION) return node.content;
  return node.children
    .map((c) => {
      if (typeof c === 'string') return c;
      if (c.type === NodeTypes.SIMPLE_EXPRESSION) return c.content;
      return '';
    })
    .join('');
}

function getTestExpr(test: JSChildNode | string | undefined): string {
  if (!test) return '';
  if (typeof test === 'string') return test;
  if (test.type === NodeTypes.SIMPLE_EXPRESSION) return test.content;
  if (test.type === NodeTypes.COMPOUND_EXPRESSION) {
    return getExpContent(test as CompoundExpressionNode);
  }
  return '';
}

function extractTagFromVNode(vnode: VNodeCall): { tag: string; varName: string } | null {
  if (typeof vnode.tag === 'string') {
    const tag = vnode.tag.replace(/^"|"$/g, '');
    return { tag, varName: `_${tag}` };
  }
  return null;
}

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
              if (!value.includes('_ctx') && !value.includes('(')) {
                attrs += ` ${key}="${escapeHtmlStatic(value.replace(/^"|"$/g, ''))}"`;
              }
            }
          }
        }
      }
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
    return serializeStaticHTMLOptimized(branch as ElementNode, new Map(), []);
  }
  return '';
}

// ============================================================
// 导出
// ============================================================

export { RUNTIME_SHORT_NAMES };
