// src/codegen.ts
// Code generator - generates render function code from AST

import { NodeTypes, PatchFlags } from "./constants";
import type {
  RootNode,
  JSChildNode,
  VNodeCall,
  JSCallExpression,
  JSObjectExpression,
  JSProperty,
  JSArrayExpression,
  JSConditionalExpression,
  TextNode,
  InterpolationNode,
  SimpleExpressionNode,
  CompoundExpressionNode,
  TemplateChildNode,
  ElementNode,
  CodegenResult,
  CodegenContext,
  CodegenOptions,
  BaseNode,
} from "./types";
import { helperNameMap } from "./constants";

// ============================================================
// Main generate function
// ============================================================

export function generate(
  ast: RootNode,
  _options: CodegenOptions = {},
): CodegenResult {
  const context = createCodegenContext(ast);

  // Generate helper imports (preamble)
  const preamble = genHelperImports(ast.helpers);

  // Generate render function
  context.push(`function render(_ctx, _cache) {\n`);
  context.indent();

  if (ast.codegenNode) {
    context.push(`return `);
    genNode(ast.codegenNode, context);
    context.push(`\n`);
  }

  context.deindent();
  context.push(`}`);

  return {
    code: context.code,
    preamble,
    ast,
  };
}

// ============================================================
// Codegen Context
// ============================================================

function createCodegenContext(ast: RootNode): CodegenContext {
  const helpers = new Map<string, string>();
  let indentLevel = 0;
  // 使用数组收集代码片段，避免频繁字符串拼接带来的性能开销
  const codeParts: string[] = [];

  const context: CodegenContext = {
    source: ast.loc.source,
    code: "",
    line: 1,
    column: 1,
    offset: 0,
    indentLevel: 0,
    pure: false,

    helper(key: string): string {
      const mapped = helperNameMap[key] ?? key;
      helpers.set(key, mapped);
      return mapped;
    },

    push(c: string, _node?: BaseNode): void {
      codeParts.push(c);
    },

    indent(): void {
      indentLevel++;
    },

    deindent(withoutNewline?: boolean): void {
      if (indentLevel > 0) {
        indentLevel--;
      }
      if (!withoutNewline) {
        codeParts.push(`\n${"  ".repeat(indentLevel)}`);
      }
    },

    newline(): void {
      codeParts.push(`\n${"  ".repeat(indentLevel)}`);
    },
  };

  // Override code getter - 返回数组拼接后的最终代码
  Object.defineProperty(context, "code", {
    get() {
      return codeParts.join("");
    },
  });

  Object.defineProperty(context, "indentLevel", {
    get() {
      return indentLevel;
    },
    set(v: number) {
      indentLevel = v;
    },
  });

  return context;
}

// ============================================================
// Generate helper imports
// ============================================================

function genHelperImports(helpers: string[]): string {
  if (helpers.length === 0) return "";

  const imports = helpers.map((h) => helperNameMap[h] ?? h);
  const uniqueImports = [...new Set(imports)];

  return `import { ${uniqueImports.join(", ")} } from 'lytjs';\n`;
}

// ============================================================
// Generate node
// ============================================================

function genNode(
  node: JSChildNode | TemplateChildNode,
  context: CodegenContext,
): void {
  switch (node.type) {
    case NodeTypes.VNODE_CALL:
      genVNodeCall(node as VNodeCall, context);
      break;
    case NodeTypes.JS_CALL_EXPRESSION:
      genCallExpression(node as JSCallExpression, context);
      break;
    case NodeTypes.JS_OBJECT_EXPRESSION:
      genObjectExpression(node as JSObjectExpression, context);
      break;
    case NodeTypes.JS_PROPERTY:
      genProperty(node as JSProperty, context);
      break;
    case NodeTypes.JS_ARRAY_EXPRESSION:
      genArrayExpression(node as JSArrayExpression, context);
      break;
    case NodeTypes.JS_CONDITIONAL_EXPRESSION:
      genConditional(node as JSConditionalExpression, context);
      break;
    case NodeTypes.TEXT:
      genText(node as TextNode, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node as InterpolationNode, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node as SimpleExpressionNode, context);
      break;
    case NodeTypes.COMPOUND_EXPRESSION:
      genCompoundExpression(node as CompoundExpressionNode, context);
      break;
    case NodeTypes.ELEMENT:
      genElement(node as ElementNode, context);
      break;
    default:
      context.push(JSON.stringify(node), node);
      break;
  }
}

// ============================================================
// Generate VNodeCall
// ============================================================

function genVNodeCall(node: VNodeCall, context: CodegenContext): void {
  const { tag, props, children, patchFlag, isBlock } = node;

  const callee = isBlock
    ? context.helper("CREATE_BLOCK")
    : context.helper("CREATE_VNODE");
  context.push(`${callee}(`, node);

  // Tag
  genNodeExpr(tag, context);
  context.push(", ", node);

  // Props
  if (props) {
    genNode(props, context);
  } else {
    context.push("null", node);
  }

  // Children
  if (children !== undefined) {
    context.push(", ", node);
    if (typeof children === "string") {
      context.push(JSON.stringify(children), node);
    } else if (Array.isArray(children)) {
      genChildrenArray(children, context);
    } else {
      genNode(children, context);
    }
  }

  // Patch flag
  if (patchFlag !== undefined) {
    context.push(", ", node);
    const flagStr =
      typeof patchFlag === "string" ? patchFlag : String(patchFlag);
    context.push(flagStr, node);
    const flagNum = parseInt(flagStr, 10);
    if (!isNaN(flagNum)) {
      context.push(` /* ${getPatchFlagName(flagNum)} */`, node);
    }
  }

  context.push(")", node);
}

// ============================================================
// Generate CallExpression
// ============================================================

function genCallExpression(
  node: JSCallExpression,
  context: CodegenContext,
): void {
  const callee =
    typeof node.callee === "string"
      ? context.helper(node.callee)
      : String(node.callee);

  context.push(`${callee}(`, node);

  for (let i = 0; i < node.arguments.length; i++) {
    const arg = node.arguments[i];
    if (arg === undefined) continue;
    if (i > 0) {
      context.push(", ", node);
    }
    if (typeof arg === "string") {
      context.push(arg, node);
    } else if (Array.isArray(arg)) {
      genChildrenArray(arg, context);
    } else {
      genNode(arg, context);
    }
  }

  context.push(")", node);
}

// ============================================================
// Generate ObjectExpression
// ============================================================

function genObjectExpression(
  node: JSObjectExpression,
  context: CodegenContext,
): void {
  const { properties } = node;

  if (properties.length === 0) {
    context.push("{}", node);
    return;
  }

  context.push("{ ", node);

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    if (prop === undefined) continue;
    if (i > 0) {
      context.push(", ", node);
    }
    genNode(prop, context);
  }

  context.push(" }", node);
}

// ============================================================
// Generate Property
// ============================================================

function genProperty(node: JSProperty, context: CodegenContext): void {
  const { key, value } = node;

  if (key.type === NodeTypes.SIMPLE_EXPRESSION) {
    context.push(key.content, node);
  } else {
    genNode(key, context);
  }

  context.push(": ", node);
  genNode(value, context);
}

// ============================================================
// Generate ArrayExpression
// ============================================================

function genArrayExpression(
  node: JSArrayExpression,
  context: CodegenContext,
): void {
  context.push("[", node);

  for (let i = 0; i < node.elements.length; i++) {
    const el = node.elements[i];
    if (el === undefined) continue;
    if (i > 0) {
      context.push(", ", node);
    }
    genNode(el, context);
  }

  context.push("]", node);
}

// ============================================================
// Generate ConditionalExpression
// ============================================================

function genConditional(
  node: JSConditionalExpression,
  context: CodegenContext,
): void {
  const { test, consequent, alternate } = node;

  context.push("(", node);

  if (typeof test === "string") {
    context.push(test, node);
  } else {
    genNode(test, context);
  }

  context.push(" ? ", node);

  if (typeof consequent === "string") {
    context.push(consequent, node);
  } else if (Array.isArray(consequent)) {
    genChildrenArray(consequent, context);
  } else {
    genNode(consequent, context);
  }

  context.push(" : ", node);

  if (typeof alternate === "string") {
    context.push(alternate, node);
  } else if (Array.isArray(alternate)) {
    genChildrenArray(alternate, context);
  } else if (alternate) {
    genNode(alternate, context);
  }

  context.push(")", node);
}

// ============================================================
// Generate Text
// ============================================================

function genText(node: TextNode, context: CodegenContext): void {
  context.push(JSON.stringify(node.content), node);
}

// ============================================================
// Generate Interpolation
// ============================================================

function genInterpolation(
  node: InterpolationNode,
  context: CodegenContext,
): void {
  context.push(`${context.helper("TO_DISPLAY_STRING")}(`, node);
  genNode(node.content, context);
  context.push(")", node);
}

// ============================================================
// Generate Expression
// ============================================================

function genExpression(
  node: SimpleExpressionNode,
  context: CodegenContext,
): void {
  context.push(node.content, node);
}

// ============================================================
// Generate CompoundExpression
// ============================================================

function genCompoundExpression(
  node: CompoundExpressionNode,
  context: CodegenContext,
): void {
  for (const child of node.children) {
    if (typeof child === "string") {
      context.push(child, node);
    } else if (child.type === NodeTypes.SIMPLE_EXPRESSION) {
      context.push(child.content, node);
    } else if (child.type === NodeTypes.INTERPOLATION) {
      context.push(`${context.helper("TO_DISPLAY_STRING")}(`, node);
      genNode(child.content, context);
      context.push(")", node);
    } else {
      genNode(child, context);
    }
  }
}

// ============================================================
// Generate Element
// ============================================================

function genElement(node: ElementNode, context: CodegenContext): void {
  if (node.codegenNode) {
    genNode(node.codegenNode, context);
  } else {
    const callee = context.helper("CREATE_VNODE");
    context.push(`${callee}(${JSON.stringify(node.tag)}`, node);

    if (node.props.length > 0) {
      context.push(", { ", node);
      for (let i = 0; i < node.props.length; i++) {
        const prop = node.props[i];
        if (prop === undefined) continue;
        if (i > 0) context.push(", ", node);
        if (prop.type === NodeTypes.ATTRIBUTE) {
          context.push(`${JSON.stringify(prop.name)}: `, node);
          if (prop.value) {
            context.push(JSON.stringify(prop.value.content), node);
          } else {
            context.push("true", node);
          }
        }
      }
      context.push(" }", node);
    }

    if (node.children.length > 0) {
      context.push(", ", node);
      genChildrenArray(node.children, context);
    }

    context.push(")", node);
  }
}

// ============================================================
// Generate children array
// ============================================================

function genChildrenArray(
  children: TemplateChildNode[],
  context: CodegenContext,
): void {
  context.push("[", undefined);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child === undefined) continue;
    if (i > 0) {
      context.push(", ", undefined);
    }
    genNode(child, context);
  }

  context.push("]", undefined);
}

// ============================================================
// Generate node expression (string or node)
// ============================================================

function genNodeExpr(
  expr: string | JSChildNode,
  context: CodegenContext,
): void {
  if (typeof expr === "string") {
    context.push(expr, undefined);
  } else {
    genNode(expr, context);
  }
}

// ============================================================
// Helpers
// ============================================================

function getPatchFlagName(flag: number): string {
  const names: string[] = [];
  if (flag & PatchFlags.TEXT) names.push("TEXT");
  if (flag & PatchFlags.CLASS) names.push("CLASS");
  if (flag & PatchFlags.STYLE) names.push("STYLE");
  if (flag & PatchFlags.PROPS) names.push("PROPS");
  if (flag & PatchFlags.FULL_PROPS) names.push("FULL_PROPS");
  if (flag & PatchFlags.HYDRATE_EVENTS) names.push("HYDRATE_EVENTS");
  if (flag & PatchFlags.STABLE_FRAGMENT) names.push("STABLE_FRAGMENT");
  if (flag & PatchFlags.KEYED_FRAGMENT) names.push("KEYED_FRAGMENT");
  if (flag & PatchFlags.UNKEYED_FRAGMENT) names.push("UNKEYED_FRAGMENT");
  if (flag & PatchFlags.NEED_PATCH) names.push("NEED_PATCH");
  if (flag & PatchFlags.DYNAMIC_SLOTS) names.push("DYNAMIC_SLOTS");
  if (flag === PatchFlags.HOISTED) return "HOISTED";
  if (flag === PatchFlags.BAIL) return "BAIL";
  return names.join(" | ") || String(flag);
}
