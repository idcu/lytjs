/**
 * Lyt.js SFC 编译器
 *
 * 将 SFC 描述符编译为 JS 模块代码。
 *
 * 编译流程：
 *   1. <template> 块 → 使用 compile() 编译为 render 函数代码
 *   2. <script> 块 → 提取 export default 内容，与 render 函数合并
 *   3. <script setup> 块 → 编译为 Composition API setup 函数
 *   4. <style scoped> 块 → 生成 scopedId，改写 CSS 选择器，收集样式
 *   5. <style module> 块 → CSS Modules 编译，生成类名映射
 *   6. 处理 :deep() / :slotted() / :global() / v-deep 等深度选择器
 *   7. 输出完整的 JS 模块字符串
 */

import { compile } from '../index';
import type { SFCDescriptor, SFCScriptBlock } from './parse-sfc';
import { extractExportDefault } from './parse-sfc';

// ============================================================
// 类型定义
// ============================================================

/** SFC 编译结果 */
export interface SFCCompileResult {
  /** 生成的 JS 代码 */
  code: string
  /** 提取的 CSS 样式（经过 scoped 改写） */
  styles: string[]
  /** scoped 属性标识（如 data-v-abc123） */
  scopedId: string
}

/** script setup 编译结果 */
interface ScriptSetupCompileResult {
  /** setup 函数代码 */
  setupCode: string
  /** 需要暴露给模板的绑定变量 */
  bindings: string[]
  /** 提取的 props 定义 */
  propsDef: string | null
  /** 提取的 emits 定义 */
  emitsDef: string | null
}

/** CSS Modules 编译结果 */
interface CSSModulesResult {
  /** 改写后的 CSS */
  css: string
  /** 类名映射对象代码 */
  moduleMappingCode: string
}

// ============================================================
// 常量
// ============================================================

/** scopedId 前缀 */
const SCOPED_ID_PREFIX = 'data-v-';

/** 编译器宏列表 */
const COMPILER_MACROS = ['defineProps', 'defineEmits', 'defineModel', 'useTemplateRef', 'defineExpose', 'withDefaults'];

// ============================================================
// 辅助函数
// ============================================================

/**
 * 生成唯一的 scopedId
 *
 * 基于文件名和内容生成短哈希。
 *
 * @param filename 文件名
 * @param content 文件内容（用于哈希）
 * @returns scopedId（如 data-v-3f2a1b）
 */
function generateScopedId(filename: string, content: string): string {
  // 简单哈希算法（djb2 变体）
  let hash = 5381;
  const seed = filename + '\x00' + content;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) & 0xffffffff;
  }
  // 转为 6 位十六进制
  return SCOPED_ID_PREFIX + (hash >>> 0).toString(16).slice(0, 6);
}

/**
 * 生成 CSS Modules 类名哈希
 *
 * @param className 原始类名
 * @param scopedId scopedId（用作哈希种子）
 * @returns 哈希后的类名（如 _title_3f2a1b）
 */
function generateModuleClassName(className: string, scopedId: string): string {
  const seed = className + '\x00' + scopedId;
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) & 0xffffffff;
  }
  const hashStr = (hash >>> 0).toString(36).slice(0, 5);
  return `_${className}_${hashStr}`;
}

// ============================================================
// <script setup> 编译（任务 1, 2, 3）
// ============================================================

/**
 * 编译 <script setup> 语法糖
 *
 * 将 setup 代码编译为等价的 Composition API setup 函数：
 *   1. 移除编译器宏调用（defineProps/defineEmits/defineModel/useTemplateRef）
 *   2. 提取 defineProps 的参数生成 props 定义
 *   3. 提取 defineEmits 的参数生成 emits 定义
 *   4. 将 defineModel 调用转换为 ref + prop + emit 代码
 *   5. 将剩余代码包装为 async setup(props, { emit, slots, attrs, expose }) { ... }
 *   6. 收集需要暴露给模板的变量
 *
 * @param scriptContent script setup 块内容
 * @returns 编译结果
 */
function compileScriptSetup(scriptContent: string): ScriptSetupCompileResult {
  const bindings: string[] = [];
  let propsDef: string | null = null;
  let emitsDef: string | null = null;
  let modelCode = '';
  let cleanedContent = scriptContent;

  // ---- 1. 提取并移除 defineProps 调用 ----
  const definePropsMatch = cleanedContent.match(
    /(?:const\s+\w+\s*=\s*)?defineProps\s*\(\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*\)\s*;?\s*/m
  );
  if (definePropsMatch) {
    const propsArg = definePropsMatch[1].trim();
    propsDef = propsArg;
    cleanedContent = cleanedContent.replace(definePropsMatch[0], '');
  }

  // ---- 2. 提取并移除 defineEmits 调用 ----
  const defineEmitsMatch = cleanedContent.match(
    /(?:const\s+\w+\s*=\s*)?defineEmits\s*\(\s*(\[[\s\S]*?\])\s*\)\s*;?\s*/m
  );
  if (defineEmitsMatch) {
    const emitsArg = defineEmitsMatch[1].trim();
    emitsDef = emitsArg;
    cleanedContent = cleanedContent.replace(defineEmitsMatch[0], '');
  }

  // ---- 3. 提取并移除 defineModel 调用 ----
  const defineModelRe = /(?:const\s+(\w+)\s*=\s*)?defineModel\s*\(\s*(?:'([^']*)'|"([^"]*)")?\s*(?:,\s*([\s\S]*?))?\)\s*;?\s*/g;
  let modelMatch: RegExpExecArray | null;
  const modelVars: string[] = [];

  while ((modelMatch = defineModelRe.exec(cleanedContent)) !== null) {
    const varName = modelMatch[1] || 'model';
    const modelName = modelMatch[2] || modelMatch[3] || 'modelValue';
    const options = modelMatch[4]?.trim() || '';

    // 生成对应的 prop 名和 update 事件名
    const updateEvent = `update:${modelName}`;

    // 生成 ref 代码：读取时返回 prop 值，写入时触发 emit
    modelCode += `  const ${varName} = new Proxy({ value: props.${modelName} }, {\n`;
    modelCode += `    get(target, key) { return key === 'value' ? props.${modelName} : target[key] },\n`;
    modelCode += `    set(target, key, val) { if (key === 'value') { emit('${updateEvent}', val) } else { target[key] = val } return true }\n`;
    modelCode += `  })\n`;

    modelVars.push(varName);

    // 如果 defineModel 指定了非默认的 modelValue，需要添加到 props
    if (modelName !== 'modelValue' && propsDef) {
      // props 已有定义，需要追加
    } else if (modelName !== 'modelValue' && !propsDef) {
      propsDef = `['${modelName}']`;
    }

    // 添加到 emits
    if (emitsDef) {
      emitsDef = emitsDef.replace(/]$/, `, '${updateEvent}']`);
    } else {
      emitsDef = `['${updateEvent}']`;
    }

    cleanedContent = cleanedContent.replace(modelMatch[0], '');
  }

  // ---- 4. 移除 useTemplateRef 调用（运行时处理） ----
  cleanedContent = cleanedContent.replace(
    /(?:const\s+(\w+)\s*=\s*)?useTemplateRef\s*\(\s*(?:'([^']*)'|"([^"]*)")\s*\)\s*;?\s*/g,
    (_match, varName: string | undefined, key1: string, key2: string) => {
      const name = varName || '_templateRef';
      const key = key1 || key2;
      if (varName) {
        bindings.push(varName);
      }
      return `const ${name} = __useTemplateRef('${key}');\n`;
    }
  );

  // ---- 5. 移除 defineExpose 调用 ----
  cleanedContent = cleanedContent.replace(
    /defineExpose\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*/g,
    (_match, exposed: string) => {
      return `__expose(${exposed});\n`;
    }
  );

  // ---- 6. 移除 withDefaults 调用 ----
  cleanedContent = cleanedContent.replace(
    /(?:const\s+\w+\s*=\s*)?withDefaults\s*\([^)]*\)\s*;?\s*/g,
    ''
  );

  // ---- 7. 移除剩余的编译器宏调用（未匹配到的） ----
  for (const macro of COMPILER_MACROS) {
    cleanedContent = cleanedContent.replace(
      new RegExp(`(?:const\\s+\\w+\\s*=\\s*)?${macro}\\s*\\([^)]*\\)\\s*;?\\s*`, 'g'),
      ''
    );
  }

  // ---- 8. 收集顶层绑定变量（需要暴露给模板的） ----
  collectTopLevelBindings(cleanedContent, bindings);

  // ---- 9. 组装 setup 函数 ----
  let setupBody = '';

  // 添加 defineModel 生成的代码
  if (modelCode) {
    setupBody += modelCode + '\n';
  }

  // 添加用户代码
  setupBody += cleanedContent.trim();

  // 构造 setup 函数
  let setupCode = `async function setup(props, { emit, slots, attrs, expose }) {\n`;
  setupCode += `  const __expose = expose || (() => {});\n`;
  setupCode += `  const __useTemplateRef = (key) => {\n`;
  setupCode += `    const ref = { value: null };\n`;
  setupCode += `    if (currentInstance) {\n`;
  setupCode += `      if (!currentInstance._templateRefs) currentInstance._templateRefs = {};\n`;
  setupCode += `      currentInstance._templateRefs[key] = ref;\n`;
  setupCode += `    }\n`;
  setupCode += `    return ref;\n`;
  setupCode += `  };\n`;
  setupCode += setupBody + '\n';
  setupCode += `  return { ${bindings.join(', ')} };\n`;
  setupCode += `}`;

  return {
    setupCode,
    bindings,
    propsDef,
    emitsDef,
  };
}

/**
 * 收集顶层绑定变量
 *
 * 通过简单的正则分析，提取顶层 const/let/var 声明和 import 声明中的变量名。
 *
 * @param code 代码内容
 * @param bindings 绑定变量列表（会被修改）
 */
function collectTopLevelBindings(code: string, bindings: string[]): void {
  // 匹配 const/let/var 声明
  const declRe = /(?:const|let|var)\s+(\w+)\s*(?:=[^=]|$)/gm;
  let match: RegExpExecArray | null;
  while ((match = declRe.exec(code)) !== null) {
    const name = match[1];
    // 排除内部变量
    if (!name.startsWith('_') && !bindings.includes(name)) {
      bindings.push(name);
    }
  }

  // 匹配 import 声明中的默认导入和命名导入
  const importDefaultRe = /import\s+(\w+)\s+from/g;
  while ((match = importDefaultRe.exec(code)) !== null) {
    const name = match[1];
    if (!bindings.includes(name)) {
      bindings.push(name);
    }
  }

  const importNamedRe = /import\s*\{([^}]+)\}\s*from/g;
  while ((match = importNamedRe.exec(code)) !== null) {
    const names = match[1].split(',').map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return parts[parts.length - 1].trim();
    }).filter(Boolean);
    for (const name of names) {
      if (!bindings.includes(name)) {
        bindings.push(name);
      }
    }
  }

  // 匹配函数声明
  const funcDeclRe = /function\s+(\w+)\s*\(/g;
  while ((match = funcDeclRe.exec(code)) !== null) {
    const name = match[1];
    if (!name.startsWith('_') && !bindings.includes(name)) {
      bindings.push(name);
    }
  }
}

// ============================================================
// Scoped CSS 编译（任务 5, 7）
// ============================================================

/**
 * 改写 CSS 选择器，添加 scoped 属性选择器
 *
 * 规则：
 *   - 最后一个选择器添加 [data-v-xxx] 属性
 *   - .counter → .counter[data-v-xxx]
 *   - .parent .child → .parent .child[data-v-xxx]
 *   - div > span → div > span[data-v-xxx]
 *   - .a, .b → .a[data-v-xxx], .b[data-v-xxx]
 *   - 媒体查询中的选择器同样改写
 *   - @keyframes、@font-face 等规则不改写
 *   - ::before、::after 等伪元素在属性选择器之前
 *     .btn::before → .btn[data-v-xxx]::before
 *   - :deep(.child) → [data-v-xxx] .child
 *   - :slotted(.content) → .content[data-v-xxx]
 *   - :global(.global-class) → .global-class（不加 scope）
 *   - v-deep(.child) → [data-v-xxx] .child
 *   - ::v-deep(.child) → [data-v-xxx] .child
 *   - ::v-deep .child → [data-v-xxx] .child
 *
 * @param css CSS 内容
 * @param scopedId scoped 属性标识
 * @returns 改写后的 CSS
 */
export function scopeCSS(css: string, scopedId: string): string {
  // 使用状态机方式处理，正确跳过 @keyframes 等嵌套块
  let result = '';
  let i = 0;
  const len = css.length;

  while (i < len) {
    // 检查是否是 @ 规则
    if (css[i] === '@') {
      // 读取 @ 规则名称
      const atRuleMatch = css.slice(i).match(/^@([\w-]+)/);
      if (atRuleMatch) {
        const atRuleName = atRuleMatch[1];

        // 需要跳过整个块的规则（不改写内部选择器）
        if (['keyframes', '-webkit-keyframes', '-moz-keyframes', 'font-face'].includes(atRuleName)) {
          // 找到 @ 规则的起始大括号
          const openBrace = css.indexOf('{', i + atRuleMatch[0].length);
          if (openBrace !== -1) {
            const blockEnd = findMatchingBrace(css, openBrace + 1);
            if (blockEnd !== -1) {
              result += css.slice(i, blockEnd);
              i = blockEnd;
              continue;
            }
          }
        }

        // @media, @supports 等包含选择器的块：保留 @ 规则头部，递归处理内部内容
        if (['media', 'supports', 'document'].includes(atRuleName)) {
          const openBrace = css.indexOf('{', i + atRuleMatch[0].length);
          if (openBrace !== -1) {
            const blockEnd = findMatchingBrace(css, openBrace + 1);
            if (blockEnd !== -1) {
              // @ 规则头部（如 @media (max-width: 768px)）保持不变
              const header = css.slice(i, openBrace + 1);
              // 内部内容递归处理
              const innerContent = css.slice(openBrace + 1, blockEnd - 1);
              const scopedInner = scopeCSS(innerContent, scopedId);
              result += header + scopedInner + '}';
              i = blockEnd;
              continue;
            }
          }
        }

        // 其他 @ 规则（@import, @charset 等）：直接保留到行尾或分号
        const semicolonIndex = css.indexOf(';', i);
        if (semicolonIndex !== -1) {
          result += css.slice(i, semicolonIndex + 1);
          i = semicolonIndex + 1;
          continue;
        }
      }
    }

    // 普通选择器：读取到 { 为止
    const braceIndex = css.indexOf('{', i);
    if (braceIndex === -1) {
      // 没有更多规则
      result += css.slice(i);
      break;
    }

    const selector = css.slice(i, braceIndex).trim();

    // 跳过空选择器
    if (!selector) {
      result += css.slice(i, braceIndex + 1);
      i = braceIndex + 1;
      continue;
    }

    // 找到匹配的闭合大括号
    const blockEnd = findMatchingBrace(css, braceIndex + 1);
    if (blockEnd === -1) {
      result += css.slice(i);
      break;
    }

    // 改写选择器
    const scopedSelector = rewriteSelector(selector, scopedId);
    result += scopedSelector + css.slice(braceIndex, blockEnd);

    i = blockEnd;
  }

  return result;
}

/**
 * 找到匹配的闭合大括号位置
 *
 * @param css CSS 字符串
 * @param startIndex 从这个位置开始搜索（应在开括号之后）
 * @returns 闭合大括号之后的位置，未找到返回 -1
 */
function findMatchingBrace(css: string, startIndex: number): number {
  let depth = 1;
  let i = startIndex;

  while (i < css.length && depth > 0) {
    if (css[i] === '{') {
      depth++;
    } else if (css[i] === '}') {
      depth--;
    }
    i++;
  }

  return depth === 0 ? i : -1;
}

/**
 * 改写单个选择器组（可能包含逗号分隔的多个选择器）
 *
 * @param selector 选择器字符串（可能包含逗号）
 * @param scopedId scoped 属性标识
 * @returns 改写后的选择器
 */
function rewriteSelector(selector: string, scopedId: string): string {
  // 按逗号分割选择器（注意不要分割括号内的逗号）
  const selectors = splitSelectorList(selector);

  return selectors
    .map(s => rewriteSingleSelector(s.trim(), scopedId))
    .join(', ');
}

/**
 * 分割逗号分隔的选择器列表（忽略括号内的逗号）
 *
 * @param selectorList 选择器列表字符串
 * @returns 分割后的选择器数组
 */
function splitSelectorList(selectorList: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < selectorList.length; i++) {
    const ch = selectorList[i];
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim()) {
    result.push(current);
  }

  return result;
}

/**
 * 改写单个选择器
 *
 * 将 scoped 属性选择器添加到最后一个简单选择器上。
 * 伪元素（::before, ::after 等）需要放在属性选择器之后。
 *
 * 特殊处理：
 *   - :deep(.child) → [data-v-xxx] .child
 *   - :slotted(.content) → .content[data-v-xxx]
 *   - :global(.global-class) → .global-class（不加 scope）
 *   - ::v-deep(.child) → [data-v-xxx] .child
 *   - ::v-deep .child → [data-v-xxx] .child
 *   - v-deep(.child) → [data-v-xxx] .child（作为伪类处理）
 *
 * @param selector 单个选择器
 * @param scopedId scoped 属性标识
 * @returns 改写后的选择器
 */
function rewriteSingleSelector(selector: string, scopedId: string): string {
  // ---- 处理 :global() — 不加 scope ----
  const globalMatch = selector.match(/^(?::global\(|::v-global\()([\s\S]*?)\)$/);
  if (globalMatch) {
    return globalMatch[1].trim();
  }

  // ---- 处理 :deep() / ::v-deep() / v-deep() ----
  // 模式 1: :deep(.child) 或 ::v-deep(.child) 或 v-deep(.child)
  const deepMatch = selector.match(/^(?::deep\(|::v-deep\(|v-deep\()([\s\S]*?)\)$/);
  if (deepMatch) {
    return `[${scopedId}] ${deepMatch[1].trim()}`;
  }

  // 模式 2: ::v-deep .child（不带括号的旧语法）
  const vDeepMatch = selector.match(/^::v-deep\s+(.+)$/);
  if (vDeepMatch) {
    return `[${scopedId}] ${vDeepMatch[1].trim()}`;
  }

  // 模式 3: 选择器中包含 :deep() 作为组合部分
  // 例如: .parent :deep(.child) → .parent[data-v-xxx] .child
  const deepInSelector = selector.match(/^(.+?)\s*:deep\(([\s\S]+)\)$/);
  if (deepInSelector) {
    const parentPart = deepInSelector[1].trim();
    const innerPart = deepInSelector[2].trim();
    return `${parentPart}[${scopedId}] ${innerPart}`;
  }

  // 模式 4: 选择器中包含 ::v-deep() 作为组合部分
  const vDeepInSelector = selector.match(/^(.+?)\s*::v-deep\(([\s\S]+)\)$/);
  if (vDeepInSelector) {
    const parentPart = vDeepInSelector[1].trim();
    const innerPart = vDeepInSelector[2].trim();
    return `${parentPart}[${scopedId}] ${innerPart}`;
  }

  // ---- 处理 :slotted() ----
  // :slotted(.content) → .content[data-v-xxx]
  const slottedMatch = selector.match(/^:slotted\(([\s\S]*?)\)$/);
  if (slottedMatch) {
    return `${slottedMatch[1].trim()}[${scopedId}]`;
  }

  // :slotted 作为组合部分: .parent :slotted(.content) → .parent[data-v-xxx] .content[data-v-xxx]
  const slottedInSelector = selector.match(/^(.+?)\s*:slotted\(([\s\S]+)\)$/);
  if (slottedInSelector) {
    const parentPart = slottedInSelector[1].trim();
    const innerPart = slottedInSelector[2].trim();
    return `${parentPart}[${scopedId}] ${innerPart}[${scopedId}]`;
  }

  // ---- 处理 :global() 作为组合部分 ----
  const globalInSelector = selector.match(/^(.+?)\s*:global\(([\s\S]+)\)$/);
  if (globalInSelector) {
    const parentPart = globalInSelector[1].trim();
    const innerPart = globalInSelector[2].trim();
    // 父部分加 scope，global 部分不加
    return `${parentPart}[${scopedId}] ${innerPart}`;
  }

  // ---- 标准 scoped 选择器改写 ----
  // 匹配末尾的伪元素（::before, ::after, ::first-line, ::first-letter, ::selection, ::placeholder 等）
  const pseudoElementRe = /(::(?:before|after|first-line|first-letter|selection|placeholder|backdrop|marker|spelling-error|grammar-error)[\s\S]*)$/;
  const pseudoMatch = selector.match(pseudoElementRe);

  let baseSelector = selector;
  let pseudoElement = '';

  if (pseudoMatch) {
    baseSelector = selector.slice(0, selector.length - pseudoMatch[0].length);
    pseudoElement = pseudoMatch[0];
  }

  // 匹配末尾的伪类（:hover, :focus, :active 等）
  const pseudoClassRe = /(:(?:hover|focus|active|visited|link|first-child|last-child|nth-child\([^)]*\)|nth-of-type\([^)]*\)|not\([^)]*\)|root|empty|checked|disabled|enabled|valid|invalid|required|optional|read-only|read-write)[\s\S]*)$/;
  const pseudoClassMatch = baseSelector.match(pseudoClassRe);

  let selectorBeforePseudo = baseSelector;
  let pseudoClass = '';

  if (pseudoClassMatch) {
    selectorBeforePseudo = baseSelector.slice(0, baseSelector.length - pseudoClassMatch[0].length);
    pseudoClass = pseudoClassMatch[0];
  }

  // 去除末尾空白
  selectorBeforePseudo = selectorBeforePseudo.replace(/\s+$/, '');

  // 组装：baseSelector[scopedId]pseudoClass::pseudoElement
  return `${selectorBeforePseudo}[${scopedId}]${pseudoClass}${pseudoElement}`;
}

// ============================================================
// CSS Modules 编译（任务 6）
// ============================================================

/**
 * 编译 CSS Modules
 *
 * 将 CSS 类名转换为唯一哈希值，并生成类名映射对象。
 *
 * @param css CSS 内容
 * @param scopedId scopedId（用作哈希种子）
 * @returns CSS Modules 编译结果
 */
function compileCSSModules(css: string, scopedId: string): CSSModulesResult {
  const classMap: Record<string, string> = {};

  // 匹配 CSS 类选择器中的类名
  // 处理 .className { ... } 和 .class1.class2 { ... } 等形式
  let result = css;

  // 匹配所有类名定义（选择器中的 .className）
  const classRe = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
  let match: RegExpExecArray | null;

  // 先收集所有需要替换的类名
  const classNames = new Set<string>();
  while ((match = classRe.exec(css)) !== null) {
    const className = match[1];
    // 排除伪类和伪元素（如 :hover, ::before）
    if (!className.startsWith(':') && !className.startsWith('::')) {
      classNames.add(className);
    }
  }

  // 生成映射并替换
  for (const className of classNames) {
    const hashedName = generateModuleClassName(className, scopedId);
    classMap[className] = hashedName;

    // 在 CSS 中替换类名（使用全局替换）
    // 使用负向后瞻确保不会替换已经是哈希后的类名
    const re = new RegExp(`\\.(?![a-zA-Z0-9_-]*_)([a-zA-Z_-][a-zA-Z0-9_-]*)`, 'g');
    result = result.replace(re, (fullMatch: string, name: string) => {
      if (name === className) {
        return `.${hashedName}`;
      }
      return fullMatch;
    });
  }

  // 生成模块映射对象代码
  const mappingEntries = Object.entries(classMap)
    .map(([original, hashed]) => `  '${original}': '${hashed}'`)
    .join(',\n');
  const moduleMappingCode = `{\n${mappingEntries}\n}`;

  return {
    css: result,
    moduleMappingCode,
  };
}

// ============================================================
// 主编译函数
// ============================================================

/**
 * 编译 SFC 描述符为 JS 模块
 *
 * @param descriptor SFC 描述符
 * @returns 编译结果
 *
 * @example
 *   const descriptor = parseSFC(source, 'App.lyt')
 *   const result = compileSFC(descriptor)
 *   console.log(result.code)    // JS 模块代码
 *   console.log(result.styles)  // CSS 样式数组
 *   console.log(result.scopedId) // data-v-abc123
 */
export function compileSFC(descriptor: SFCDescriptor): SFCCompileResult {
  const { template, script, styles, filename } = descriptor;

  // 生成 scopedId（基于文件名和完整源内容）
  const fullContent = [
    template?.content || '',
    script?.content || '',
    ...styles.map(s => s.content),
  ].join('\x00');

  const scopedId = generateScopedId(filename, fullContent);

  // 1. 编译 template → render 函数代码
  let renderCode = 'null';
  if (template) {
    const compileResult = compile(template.content);
    renderCode = `function(_ctx) { return ${compileResult.code} }`;
  }

  // 2. 处理 script 块（区分普通 script 和 script setup）
  let scriptOptions = '{}';
  let setupCode: string | null = null;
  let setupBindings: string[] = [];

  if (script) {
    if (script.setup) {
      // <script setup> 模式
      const setupResult = compileScriptSetup(script.content);
      setupCode = setupResult.setupCode;
      setupBindings = setupResult.bindings;

      // 构建 props 和 emits 选项
      const optionsParts: string[] = [];

      if (setupResult.propsDef) {
        // 判断是数组形式还是对象形式
        if (setupResult.propsDef.startsWith('[')) {
          // 数组形式: ['prop1', 'prop2'] → 转为对象形式
          const propsArray = setupResult.propsDef.slice(1, -1)
            .split(',')
            .map(p => p.trim().replace(/['"]/g, ''))
            .filter(Boolean);
          const propsObj = propsArray.map(p => `    ${p}: { type: null }`).join(',\n');
          optionsParts.push(`  props: {\n${propsObj}\n  }`);
        } else {
          optionsParts.push(`  props: ${setupResult.propsDef}`);
        }
      }

      if (setupResult.emitsDef) {
        optionsParts.push(`  emits: ${setupResult.emitsDef}`);
      }

      scriptOptions = optionsParts.length > 0
        ? `{\n${optionsParts.join(',\n')}\n}`
        : '{}';
    } else {
      // 普通 <script> 模式
      const exported = extractExportDefault(script.content);
      if (exported) {
        scriptOptions = `{ ${exported} }`;
      }
    }
  }

  // 3. 处理样式（scoped / module）
  const processedStyles: string[] = [];
  const cssModuleMappings: Array<{ name: string; mappingCode: string }> = [];

  for (const style of styles) {
    let css = style.content;

    // CSS Modules 处理
    if (style.module) {
      const moduleResult = compileCSSModules(css, scopedId);
      css = moduleResult.css;
      cssModuleMappings.push({
        name: style.module,
        mappingCode: moduleResult.moduleMappingCode,
      });
    }

    // Scoped CSS 处理
    if (style.scoped) {
      css = scopeCSS(css, scopedId);
    }

    processedStyles.push(css);
  }

  // 4. 生成 JS 模块代码
  const code = generateModuleCode(
    renderCode,
    scriptOptions,
    scopedId,
    processedStyles,
    setupCode,
    setupBindings,
    cssModuleMappings
  );

  return {
    code,
    styles: processedStyles,
    scopedId,
  };
}

/**
 * 生成 JS 模块代码字符串
 *
 * @param renderCode render 函数代码
 * @param scriptOptions 组件选项对象代码
 * @param scopedId scoped 属性标识
 * @param styles 样式数组
 * @param setupCode setup 函数代码（script setup 模式）
 * @param setupBindings setup 绑定变量列表
 * @param cssModuleMappings CSS Modules 映射
 * @returns JS 模块代码字符串
 */
function generateModuleCode(
  renderCode: string,
  scriptOptions: string,
  scopedId: string,
  styles: string[],
  setupCode: string | null = null,
  setupBindings: string[] = [],
  cssModuleMappings: Array<{ name: string; mappingCode: string }> = []
): string {
  const lines: string[] = [];

  lines.push('// Generated by Lyt.js SFC Compiler');
  lines.push('');
  lines.push(`const _sfcId = '${scopedId}'`);
  lines.push('');

  // 样式注入代码
  if (styles.length > 0) {
    lines.push('const _styles = [');
    for (const style of styles) {
      lines.push(`  ${JSON.stringify(style)},`);
    }
    lines.push(']')
    lines.push('');
    lines.push('function _injectStyles() {');
    lines.push('  if (typeof document === \'undefined\') {');
    lines.push('    throw new Error(\'[Lyt Compiler] SFC 编译需要 DOM 环境\')');
    lines.push('  }');
    lines.push('  for (const css of _styles) {');
    lines.push('    const style = document.createElement("style")');
    lines.push('    style.setAttribute("data-sfc-id", _sfcId)');
    lines.push('    style.textContent = css');
    lines.push('    document.head.appendChild(style)');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('_injectStyles()');
    lines.push('');
  }

  // script setup 模式：注入 CSS Modules 映射到 setup
  if (setupCode) {
    // 如果有 CSS Modules，需要在 setup 中注入 $style 对象
    if (cssModuleMappings.length > 0) {
      // 在 setup 函数体开头注入 CSS Modules 引用
      for (const mod of cssModuleMappings) {
        const injectCode = `  const ${mod.name} = ${mod.mappingCode};`;
        // 在 setup 函数体的第一行之后注入
        setupCode = setupCode.replace(
          /(async function setup\(props, \{ emit, slots, attrs, expose \}\) \{\n)/,
          `$1${injectCode}\n`
        );
        // 将 CSS Modules 变量添加到绑定列表
        if (!setupBindings.includes(mod.name)) {
          setupBindings.push(mod.name);
        }
      }

      // 更新 return 语句
      setupCode = setupCode.replace(
        /return \{ ([^}]+) \};/,
        (_, bindings) => `return { ${setupBindings.join(', ')} };`
      );
    }

    // 组件定义（script setup 模式）
    lines.push('export default {');
    lines.push('  __sfcId: _sfcId,');
    lines.push(`  render: ${renderCode},`);
    lines.push(`  ...${scriptOptions},`);
    lines.push(`  setup: ${setupCode},`);
    lines.push('}');
  } else {
    // 组件定义（普通模式）
    lines.push('export default {');
    lines.push('  __sfcId: _sfcId,');
    lines.push(`  render: ${renderCode},`);
    lines.push(`  ...${scriptOptions},`);
    lines.push('}');
  }

  return lines.join('\n');
}
