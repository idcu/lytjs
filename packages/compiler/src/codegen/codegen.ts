/**
 * Lyt.js 模板编译器 — 代码生成
 *
 * 将优化后的 AST 转换为可执行的渲染函数代码字符串。
 *
 * 生成的代码格式：
 *   - 元素节点 → h('tag', props, children)
 *   - 文本节点 → 'text' 或 _ctx.expr（表达式插值）
 *   - v-if    → condition ? h(...) : null（三元表达式）
 *   - v-each  → items.map((item, index) => h(...))
 *   - v-bind  → { ...props, [dynamicKey]: _ctx.value }
 *   - v-on    → { ...props, onClick: _ctx.handler }
 *   - v-slot  → renderSlot(slots, 'name', props, () => [...])
 *   - v-ref   → { ...props, ref: 'name' }
 *
 * 安全说明：
 *   生成的代码不使用 `with` 语句。所有上下文变量通过 `_ctx.` 前缀显式访问，
 *   `h` 函数作为第一个参数传入。这使得生成的代码兼容 CSP（Content Security Policy）。
 */

import {
  type RootNode,
  type ElementNode,
  type TextNode,
  type ASTNode,
} from '../ast/nodes';

// ============================================================
// 代码生成上下文
// ============================================================

/** 代码生成上下文，维护生成过程中的缩进和辅助函数 */
class CodegenContext {
  code = ''
  indentLevel = 0
  private indent = '  '
  private needsNewline = true
  helpers = new Map<string, string>()
  hoistedDecls: string[] = []

  push(line: string): void {
    if (this.needsNewline) {
      this.code += this.indent.repeat(this.indentLevel);
      this.needsNewline = false;
    }
    this.code += line;
  }

  pushLine(line: string): void { this.push(line); this.newline(); }
  newline(): void { this.code += '\n'; this.needsNewline = true; }
  indentIn(): void { this.indentLevel++; }
  indentOut(): void { this.indentLevel--; }
}

// ============================================================
// 代码生成选项
// ============================================================

/** 代码生成选项 */
export interface CodegenOptions {
  /** 是否生成格式化的代码（默认 true） */
  prettify?: boolean;
  /** 是否使用 with 语句包裹（默认 false） */
  with?: boolean;
  /** 是否生成 source-map（暂不支持） */
  sourceMap?: boolean;
}

// ============================================================
// 代码生成结果
// ============================================================

/** 代码生成结果 */
export interface CodegenResult {
  /** 生成的渲染函数代码 */
  code: string;
  /** 提升的静态变量声明 */
  hoisted: string[];
  /** 需要导入的辅助函数列表 */
  helpers: string[];
}

// ============================================================
// 主代码生成函数
// ============================================================

/**
 * 生成渲染函数代码
 *
 * 生成的代码是一个纯表达式体，不包含函数包装。
 * 所有上下文变量通过 `_ctx.` 前缀访问，`h` 函数作为参数传入。
 *
 * 使用方式：
 *   const { code } = compile(template);
 *   const renderFn = new Function('h', '_ctx', 'return ' + code);
 *   const vnode = renderFn(h, proxy);
 *
 * @param ast 优化后的根节点
 * @param options 代码生成选项
 * @returns 代码生成结果
 */
export function generate(ast: RootNode, _options: CodegenOptions = {}): CodegenResult {
  const ctx = new CodegenContext();

  // 注册辅助函数
  registerHelpers(ast, ctx);

  // 生成提升的静态变量声明
  if (ctx.hoistedDecls.length > 0) {
    for (const decl of ctx.hoistedDecls) {
      ctx.pushLine(decl);
    }
    ctx.newline();
  }

  // 生成 return 表达式（不包装在函数中）
  generateChildren(ast.children, ctx);

  return {
    code: ctx.code,
    hoisted: ctx.hoistedDecls,
    helpers: Array.from(ctx.helpers.keys()),
  };
}

// ============================================================
// 辅助函数注册
// ============================================================

/**
 * 根据 AST 中收集的辅助函数信息，注册到代码生成上下文
 */
function registerHelpers(ast: RootNode, ctx: CodegenContext): void {
  // 核心辅助函数（始终需要）
  ctx.helpers.set('h', 'Lyt');

  // 根据 AST 中标记的辅助函数按需注册
  for (const helper of ast.helpers) {
    switch (helper) {
      case 'createConditionalVNode':
        // 条件渲染使用三元表达式，不需要额外辅助函数
        break;
      case 'renderList':
        ctx.helpers.set('renderList', 'Lyt');
        break;
      case 'createModelBinding':
        // 双向绑定使用对象字面量，不需要额外辅助函数
        break;
      case 'createEventHandler':
        // 事件处理使用对象字面量，不需要额外辅助函数
        break;
      case 'renderSlot':
        ctx.helpers.set('renderSlot', 'Lyt');
        break;
      case 'createRef':
        // 引用使用 ref 属性，不需要额外辅助函数
        break;
      default:
        ctx.helpers.set(helper, 'Lyt');
    }
  }
}

// ============================================================
// 子节点代码生成
// ============================================================

/**
 * 生成子节点列表的代码
 * 如果只有一个子节点，直接返回该节点；多个子节点包装为数组
 */
function generateChildren(children: (ElementNode | TextNode)[], ctx: CodegenContext): void {
  if (children.length === 0) {
    ctx.push('null');
    return;
  }

  if (children.length === 1) {
    generateNode(children[0], ctx);
    return;
  }

  // 多个子节点包装为数组
  ctx.push('[');
  ctx.indentIn();

  for (let i = 0; i < children.length; i++) {
    if (i > 0) {
      ctx.pushLine(',');
    }
    generateNode(children[i], ctx);
  }

  ctx.indentOut();
  ctx.pushLine('');
  ctx.push(']');
}

// ============================================================
// 节点代码生成
// ============================================================

/**
 * 根据节点类型分发代码生成
 */
function generateNode(node: ASTNode, ctx: CodegenContext): void {
  switch (node.type) {
    case 'Element':
      generateElement(node, ctx);
      break;
    case 'Text':
      generateText(node, ctx);
      break;
  }
}

/**
 * 生成元素节点的代码
 *
 * 基本格式：h('tag', { ...props }, [...children])
 *
 * 根据转换阶段添加的元数据，生成不同的代码结构：
 *   - v-if → condition ? h(...) : null
 *   - v-each → renderList(collection, (item, index) => h(...))
 *   - v-bind → 合并到 props 对象
 *   - v-on → 合并到 props 对象
 */
function generateElement(node: ElementNode, ctx: CodegenContext): void {
  const nodeAny = node as unknown as Record<string, unknown>;

  // 处理 v-if 条件渲染
  if (nodeAny.ifCondition) {
    const condition = nodeAny.ifCondition as string;
    ctx.push(`(${wrapExpression(condition)} ? (`);
    generateElementInner(node, ctx);
    ctx.push(') : null)');
    return;
  }

  // 处理 v-each 循环渲染
  if (nodeAny.eachInfo) {
    const eachInfo = nodeAny.eachInfo as {
      item: string;
      index: string;
      collection: string;
    };
    ctx.push(`renderList(${wrapExpression(eachInfo.collection)}, (${eachInfo.item}`);
    if (eachInfo.index) {
      ctx.push(`, ${eachInfo.index}`);
    }
    ctx.push(') => ');
    generateElementInner(node, ctx);
    ctx.push(')');
    return;
  }

  // 普通元素
  generateElementInner(node, ctx);
}

/**
 * 生成元素节点的内部代码（不含 v-if/v-each 包裹）
 */
function generateElementInner(node: ElementNode, ctx: CodegenContext): void {
  // 生成 props 对象
  const propsCode = generateProps(node, ctx);

  // 生成子节点
  const childrenCode = generateChildrenCode(node.children, ctx);

  // 组装 h() 调用
  const tag = node.isComponent ? node.tag : `'${node.tag}'`;
  ctx.push(`h(${tag}`);

  // 始终传递 props（无 props 时传 null），确保 children 在正确的参数位置
  ctx.push(propsCode ? `, ${propsCode}` : ', null');

  if (childrenCode && childrenCode !== 'null') {
    ctx.push(`, ${childrenCode}`);
  }

  ctx.push(')');
}

/**
 * 生成元素的 props 对象代码
 *
 * 合并静态属性、动态绑定、事件绑定和引用
 */
function generateProps(node: ElementNode, _ctx: CodegenContext): string {
  const nodeAny = node as unknown as Record<string, unknown>;
  const parts: string[] = [];

  // 1. 静态属性
  const staticProps = generateStaticProps(node);
  if (staticProps) {
    parts.push(staticProps);
  }

  // 2. 动态绑定（v-bind）
  if (nodeAny.bindings) {
    const bindings = nodeAny.bindings as Array<{
      arg: string;
      value: string;
      isModel: boolean;
    }>;
    for (const binding of bindings) {
      if (binding.isModel) {
        // 双向绑定 → model: { value, callback }
        parts.push(
          `model: { value: ${wrapExpression(binding.value)}, callback: $event => ${wrapExpression(binding.value)} = $event }`
        );
      } else {
        // 普通动态绑定
        parts.push(`'${binding.arg}': ${wrapExpression(binding.value)}`);
      }
    }
  }

  // 3. 事件绑定（v-on）
  if (nodeAny.events) {
    const events = nodeAny.events as Array<{
      name: string;
      value: string;
      modifiers: string[];
    }>;
    for (const event of events) {
      const eventName = `on${capitalize(event.name)}`;
      let handler = wrapExpression(event.value);

      // 处理修饰符
      if (event.modifiers.length > 0) {
        const modifierHandlers = event.modifiers.map(mod => {
          switch (mod) {
            case 'stop':
              return '$event.stopPropagation()';
            case 'prevent':
              return '$event.preventDefault()';
            case 'capture':
              return null; // 在 props 中标记 capture: true
            case 'once':
              return null; // 需要运行时处理
            default:
              return null;
          }
        }).filter(Boolean);

        if (modifierHandlers.length > 0) {
          handler = `($event) => { ${modifierHandlers.join('; ')}; ${wrapExpression(event.value)}($event) }`;
        }
      }

      parts.push(`'${eventName}': ${handler}`);
    }
  }

  // 4. 引用（v-ref）
  if (nodeAny.refInfo) {
    const refInfo = nodeAny.refInfo as { name: string };
    parts.push(`ref: '${refInfo.name}'`);
  }

  // 5. 插槽（v-slot）
  if (nodeAny.slotInfo) {
    const slotInfo = nodeAny.slotInfo as { name: string; value: string };
    parts.push(`'slot': '${slotInfo.name}'`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `{ ${parts.join(', ')} }`;
}

/**
 * 生成静态属性代码
 * 将 AttributeNode 列表转换为对象字面量
 */
function generateStaticProps(node: ElementNode): string {
  const props: string[] = [];

  for (const attr of node.props) {
    if (attr.isDynamic || attr.isEvent) {
      // 动态属性和事件在转换阶段已处理，跳过
      continue;
    }

    if (attr.value === null) {
      // 布尔属性（如 disabled、readonly）
      props.push(`'${attr.name}': true`);
    } else {
      props.push(`'${attr.name}': '${escapeString(attr.value)}'`);
    }
  }

  return props.join(', ');
}

/**
 * 生成子节点代码（返回字符串，不直接写入上下文）
 */
function generateChildrenCode(children: (ElementNode | TextNode)[], _ctx: CodegenContext): string {
  if (children.length === 0) {
    return '';
  }

  // 收集所有子节点的代码片段
  const parts: string[] = [];
  const subCtx = new CodegenContext();

  for (const child of children) {
    generateNode(child, subCtx);
    parts.push(subCtx.code);
    subCtx.code = '';
  }

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `[${parts.join(', ')}]`;
}

/**
 * 生成文本节点的代码
 *
 * 纯文本 → 'text'
 * 表达式插值 → _ctx.expr 或字符串拼接
 */
function generateText(node: TextNode, ctx: CodegenContext): void {
  if (!node.isExpression) {
    // 纯文本
    ctx.push(`'${escapeString(node.content)}'`);
    return;
  }

  // 处理表达式插值 {{ expr }}
  // 将 "text {{ expr1 }} text {{ expr2 }} text" 转换为字符串拼接
  const parts = parseInterpolation(node.content);

  if (parts.length === 1 && parts[0].type === 'expression') {
    // 纯表达式
    ctx.push(wrapExpression(parts[0].value));
    return;
  }

  // 混合文本和表达式，使用模板字符串或字符串拼接
  const segments = parts.map(part => {
    if (part.type === 'text') {
      return `'${escapeString(part.value)}'`;
    }
    return wrapExpression(part.value);
  });

  ctx.push(segments.join(' + '));
}

// ============================================================
// 工具函数
// ============================================================

// ---- 模块级常量（避免每次调用 wrapExpression 时重复创建） ----

/** JavaScript 关键字和全局对象集合（合并以减少 Set 数量） */
const JS_KEYWORDS = new Set([
  'true','false','null','undefined','this','super','new','delete','typeof',
  'instanceof','in','of','void','throw','return','yield','await','async',
  'if','else','for','while','do','switch','case','break','continue',
  'try','catch','finally','class','extends','import','export','from',
  'default','var','let','const','function','debugger',
  'console','window','document','Math','JSON','Date','Array','Object',
  'String','Number','Boolean','RegExp','Error','Map','Set','WeakMap',
  'WeakSet','Promise','Symbol','Proxy','Reflect','parseInt','parseFloat',
  'isNaN','isFinite','NaN','Infinity',
]);

/** 特殊标识符集合（如 $event）不应加前缀 */
const SPECIAL_IDENTS = new Set(['$event','$refs','$el','$emit','$slots','$parent','$root']);

/** 插值解析片段 */
interface InterpolationPart {
  type: 'text' | 'expression';
  value: string;
}

/**
 * 解析包含 {{ }} 插值的文本内容
 *
 * @param content 文本内容
 * @returns 解析后的片段列表
 *
 * @example
 *   parseInterpolation("Hello {{ name }}, age is {{ age }}")
 *   → [
 *       { type: 'text', value: 'Hello ' },
 *       { type: 'expression', value: 'name' },
 *       { type: 'text', value: ', age is ' },
 *       { type: 'expression', value: 'age' },
 *     ]
 */
function parseInterpolation(content: string): InterpolationPart[] {
  const parts: InterpolationPart[] = [];
  const regex = /\{\{([\s\S]*?)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // 表达式前的文本
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.slice(lastIndex, match.index),
      });
    }

    // 表达式内容（去除首尾空白）
    parts.push({
      type: 'expression',
      value: match[1].trim(),
    });

    lastIndex = regex.lastIndex;
  }

  // 剩余文本
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      value: content.slice(lastIndex),
    });
  }

  return parts;
}

/**
 * 将表达式包装为 _ctx.expr 形式
 *
 * 策略：
 *   1. 已经是 _ctx.xxx → 直接返回
 *   2. 纯标识符（如 name, user.name）→ _ctx.name, _ctx.user.name
 *   3. 函数调用（如 fn(), obj.method()）→ _ctx.fn(), _ctx.obj.method()
 *   4. 箭头函数（如 $event => ...）→ 直接返回（内联处理器）
 *   5. 复杂表达式（如 count > 0, show && items.length）
 *      → 替换其中所有裸标识符为 _ctx.xxx（排除关键字和字面量）
 *
 * 注意：所有上下文标识符都需要 _ctx. 前缀，因为不再使用 `with` 语句。
 */
function wrapExpression(expr: string): string {
  expr = expr.trim();

  // 已经是 _ctx.xxx 形式
  if (expr.startsWith('_ctx.')) {
    return expr;
  }

  // 纯标识符（如 name, user.name）
  if (/^\w+(\.\w+)*$/.test(expr)) {
    return `_ctx.${expr}`;
  }

  // 函数调用（如 handleSubmit(), obj.method()）
  const fnCallMatch = expr.match(/^(\w+(?:\.\w+)*)\s*\(/);
  if (fnCallMatch) {
    return `_ctx.${expr}`;
  }

  // 箭头函数（如 $event => ..., (item) => ...）→ 直接返回
  if (expr.includes('=>')) {
    return expr;
  }

  // 复杂表达式：替换所有裸标识符为 _ctx.xxx
  // JavaScript 关键字和全局对象不应加前缀（使用模块级常量）

  // 先提取字符串字面量和模板字面量，避免替换其中的标识符
  const placeholders: string[] = [];
  let processed = expr.replace(/(['"`])(?:(?!\1|\\).|\\.)*\1/g, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });

  // 匹配标识符（包括点号访问链），但排除已有 _ctx. 前缀的
  processed = processed.replace(/(?<!_ctx\.)(?<!\w)(\w+(?:\.\w+)*)/g, (match) => {
    // 检查是否是关键字、全局对象或特殊标识符
    if (JS_KEYWORDS.has(match) || SPECIAL_IDENTS.has(match)) {
      return match;
    }
    // 检查是否是数字字面量
    if (/^\d/.test(match)) {
      return match;
    }
    // 检查是否是占位符
    if (/^__PH\d+__$/.test(match)) {
      return match;
    }
    return `_ctx.${match}`;
  });

  // 恢复字符串字面量
  for (let i = 0; i < placeholders.length; i++) {
    processed = processed.replace(`__PH${i}__`, placeholders[i]);
  }

  return processed;
}

/**
 * 转义字符串中的特殊字符
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * 首字母大写，支持 kebab-case → camelCase 转换
 *
 * @example
 *   capitalize('click')       → 'Click'
 *   capitalize('key-down')    → 'KeyDown'
 *   capitalize('change-event') → 'ChangeEvent'
 */
function capitalize(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
