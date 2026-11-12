#!/usr/bin/env node
/**
 * 门禁：Golden 20 × 七类行为契约（B04 六类 + B05 a11y）
 *
 * ## 为什么是「推导 + 登记」双轨
 *
 * 只写一张登记表，时间一长就会有人把红改成绿；只写探针，又没有地方写「为什么红」。
 * 所以本脚本对每一格做两件事：
 *
 *   1. **从源码重新推导**（不允许登记表自说自话）；
 *   2. **与 `scripts/ui-contracts.json` 的登记状态比对**，不一致即红。
 *
 * 红 / n/a 必须带 reason；`--strict` 时任一红即退出 1（逐组件修复完成后使用）。
 * 初始批次允许红，但**不允许 skip**：没有 status 的格子直接算登记缺失。
 *
 * ## 七类探针
 *
 * | 类 | 判据 |
 * |---|---|
 * | vmodel | 值类 prop 存在，且 AST 中存在真实的 emit('update:<prop>') 调用（注释/字符串里的同形文本不算） |
 * | slots | `types.ts` 声明的每个插槽都被渲染函数以 `slots.x` / `slots['x']` / 解构读取（AST 级，注释不算） |
 * | events | 声明的每个 `onX` 回调要么被 `p.onX` 调用，要么 emit 同名事件 |
 * | controlled | 有值类 prop + 内部 signal/reactive + 无 watch ⇒ 红；无受控 prop 但有内部状态 ⇒ n/a |
 * | styles | 源码里的每个静态 `lyt-*` 类名在 `styles/index.css` 有规则 |
 * | keyboard | 有交互的组件必须有 keydown 处理或原生可聚焦元素；span[role=link] 无 tabindex ⇒ 红 |
 * | a11y | 非原生可点击元素需 role+tabindex；图标按钮需 aria-label；img 需 alt；弹层需 role=dialog + aria-modal + createOverlayFocus；无正 tabindex；progressbar/switch/aria-expanded 状态属性完整 |
 *
 * 用法：
 *   node scripts/check-ui-contracts.mjs                 # 报告模式（有红也退出 0）
 *   node scripts/check-ui-contracts.mjs --strict        # 任一红退出 1
 *   node scripts/check-ui-contracts.mjs --component Tag # 只看一个组件
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const UI = path.join(ROOT, 'packages/ecosystem/packages/ui/src');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/ui-contracts.json'), 'utf8'));

const STRICT = process.argv.includes('--strict');
const onlyIdx = process.argv.indexOf('--component');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

const TYPES = fs.readFileSync(path.join(UI, 'components/types.ts'), 'utf8');
const CSS = fs.readFileSync(path.join(UI, 'styles/index.css'), 'utf8');
// 与 check-ui-styles 同一判据：只认**选择器位置**的类名（剥注释、跳过 @keyframes 内部）
const CSS_CLASSES = selectorClassNames(CSS);

function selectorClassNames(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const classes = new Set();
  const stack = [];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') {
      const selector = buf.trim();
      const insideKeyframes = stack.includes('keyframes');
      const isKeyframes = /^@(?:-\w+-)?keyframes/.test(selector);
      const isAtRule = selector.startsWith('@');
      if (!isAtRule && !insideKeyframes) {
        for (const m of selector.matchAll(/\.([a-zA-Z][\w-]*)/g)) classes.add(m[1]);
      }
      stack.push(isKeyframes ? 'keyframes' : isAtRule ? 'at' : 'rule');
      buf = '';
    } else if (c === '}') {
      stack.pop();
      buf = '';
    } else if (c === ';' && stack.length === 0) {
      buf = '';
    } else {
      buf += c;
    }
  }
  return classes;
}

const VALUE_PROPS = ['modelValue', 'current', 'pageSize'];
const CONTROLLED_PROPS = [...VALUE_PROPS, 'src', 'open', 'visible', 'spinning'];

function readSource(name) {
  return fs.readFileSync(path.join(UI, 'components', `${name}.ts`), 'utf8');
}

function hasProp(src, prop) {
  return new RegExp(`\\n    ${prop}: \\{`).test(src);
}

// ── AST 同构判据 ─────────────────────────────────────────────────────────
// 旧探针是对源码做子串匹配：注释、字符串、文档示例里的 `emit('update:x'` /
// `slots.header` 都会让探针误判为「已实现」。这里改为解析同一份 TS 源码的
// AST —— 与打包器看到的语法结构一致 —— 只认真的调用/属性读取。
const AST_CACHE = new Map();

function astOf(name, src) {
  if (!AST_CACHE.has(name)) {
    AST_CACHE.set(
      name,
      ts.createSourceFile(`${name}.ts`, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
    );
  }
  return AST_CACHE.get(name);
}

/** 遍历 AST（含当前节点）。 */
function walk(node, fn) {
  fn(node);
  ts.forEachChild(node, (child) => walk(child, fn));
}

function stringArg(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

/** 收集真实 emit 调用的事件名（忽略注释与普通字符串）。 */
function emittedEvents(name, src) {
  const events = new Set();
  walk(astOf(name, src), (node) => {
    if (!ts.isCallExpression(node)) return;
    const callee = node.expression;
    const isEmit =
      (ts.isIdentifier(callee) && callee.text === 'emit') ||
      (ts.isPropertyAccessExpression(callee) && callee.name.text === 'emit');
    if (!isEmit || node.arguments.length === 0) return;
    const event = stringArg(node.arguments[0]);
    if (event) events.add(event);
  });
  return events;
}

/** 收集插槽的真实读取：slots.x / slots['x'] / const { x } = slots。 */
function slotReads(name, src) {
  const used = new Set();
  walk(astOf(name, src), (node) => {
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'slots') used.add(node.name.text);
      return;
    }
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text !== 'slots') return;
      const key = stringArg(node.argumentExpression);
      if (key) used.add(key);
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.initializer
    ) {
      if (!ts.isIdentifier(node.initializer) || node.initializer.text !== 'slots') return;
      for (const element of node.name.elements) {
        const key = element.propertyName ?? element.name;
        if (ts.isIdentifier(key)) used.add(key.text);
      }
    }
  });
  return used;
}

function declaredSlots(name) {
  const m = TYPES.match(new RegExp(`export interface ${name}Slots\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!m) return null;
  return [...m[1].matchAll(/(\w+)\??:/g)].map((x) => x[1]);
}

function callbackProps(name, src) {
  let body = null;
  const fromTypes = TYPES.match(new RegExp(`export interface ${name}SetupProps[\\s\\S]*?\\n\\}`));
  if (fromTypes) body = fromTypes[0];
  else {
    const fromSrc = src.match(new RegExp(`interface ${name}SetupProps[\\s\\S]*?\\n\\}`));
    if (fromSrc) body = fromSrc[0];
  }
  if (!body) return [];
  return [...new Set([...body.matchAll(/(on[A-Z]\w*)\??:/g)].map((x) => x[1]))];
}

/** 回调名 → 事件名：onChange → change、onSizeChange → sizeChange */
function eventName(cb) {
  const rest = cb.slice(2);
  return rest[0].toLowerCase() + rest.slice(1);
}

function probeVmodel(name, src) {
  const valueProps = VALUE_PROPS.filter((p) => hasProp(src, p));
  if (valueProps.length === 0) {
    return { status: 'n/a', detail: '无值类 prop' };
  }
  const emitted = emittedEvents(name, src);
  const missing = valueProps.filter((p) => !emitted.has(`update:${p}`));
  return {
    status: missing.length === 0 ? 'pass' : 'red',
    detail: missing.length === 0 ? valueProps.join(',') : `未 emit update:${missing.join(',')}`,
  };
}

function probeSlots(name, src) {
  const declared = declaredSlots(name);
  if (!declared) return { status: 'n/a', detail: '无插槽接口' };
  const used = slotReads(name, src);
  const unused = declared.filter((k) => !used.has(k));
  return {
    status: unused.length === 0 ? 'pass' : 'red',
    detail: unused.length === 0 ? declared.join(',') : `声明未渲染: ${unused.join(',')}`,
  };
}

function probeEvents(name, src) {
  const cbs = callbackProps(name, src);
  if (cbs.length === 0) return { status: 'n/a', detail: '无事件回调' };
  const missing = cbs.filter((cb) => {
    if (src.includes(`p.${cb}`) || src.includes(`_props.${cb}`)) return false;
    return !src.includes(`emit('${eventName(cb)}'`);
  });
  return {
    status: missing.length === 0 ? 'pass' : 'red',
    detail: missing.length === 0 ? cbs.join(',') : `声明未触发: ${missing.join(',')}`,
  };
}

function probeControlled(name, src, reg) {
  const valueProps = CONTROLLED_PROPS.filter((p) => hasProp(src, p));
  const internal = /signal\(|reactive\(/.test(src);
  const hasWatch = /watch\(/.test(src);
  // 特殊情况：错误态信号把「加载失败」粘住，换 src 也不恢复（Avatar）
  if (reg?.probe === 'sticky') {
    const sticky = /signal\(/.test(src) && /isImageExist\(\)/.test(src) && !hasWatch;
    return {
      status: sticky ? 'red' : 'pass',
      detail: sticky ? '错误态 signal 无 watch，换 prop 不恢复' : '无粘滞错误态',
    };
  }
  // 仅当内部状态是「初值快照」（来自 props）时才构成受控失效
  const reactiveInit = src.match(/reactive\(\s*\{([^}]*)\}/);
  const snapshot =
    (reactiveInit &&
      /\b(modelValue|current|pageSize|checked|value|spinning|src)\s*:/.test(reactiveInit[1])) ||
    /(?:signal|ref)\(\s*(?:props|_props)\.\w+/.test(src);
  if (valueProps.length > 0 && snapshot && !hasWatch) {
    return { status: 'red', detail: `值类 prop ${valueProps.join(',')} 变更无 watch` };
  }
  if (valueProps.length === 0 && internal) {
    return { status: 'n/a', detail: '有内部状态但无受控 prop' };
  }
  return {
    status: 'pass',
    detail: valueProps.length > 0 ? valueProps.join(',') : '直接读取 props',
  };
}

function probeStyles(name, src) {
  const literals = [
    ...new Set([...src.matchAll(/['"`](lyt-[a-z0-9_-]+)['"`]/g)].map((m) => m[1])),
  ].filter((c) => !c.endsWith('-'));
  const missing = literals.filter((c) => !CSS_CLASSES.has(c));
  return {
    status: missing.length === 0 ? 'pass' : 'red',
    detail:
      missing.length === 0 ? `${literals.length} 个类名全部命中` : `无规则: ${missing.join(',')}`,
  };
}

function probeKeyboard(name, src) {
  // B05 收紧：从「文件里有没有 keydown」改为「**每个**可点击元素有没有键盘路径」。
  // 旧判据下 InputNumber 的加减按钮只有 onClick，却因为输入框有 ArrowUp/Down 而判过 ——
  // 这正是「文件级绿灯、元素级红灯」的典型漏洞。
  const nodes = scanVNodes(src);
  const interactiveNodes = nodes.filter(
    (n) =>
      /\bonClick\b|\bonKeyDown\b|\bonChange\b|\bonInput\b/.test(n.props) &&
      !/stopPropagation/.test(n.props),
  );
  if (interactiveNodes.length === 0) {
    const interactive = /onClick|onChange|onInput|onKeyDown/.test(src);
    return {
      status: 'n/a',
      detail: interactive ? '交互不落在可扫描的 VNode 节点上' : '无交互',
    };
  }
  const offenders = [];
  let checked = 0;
  for (const n of interactiveNodes) {
    const cls = (n.props.match(/class\s*:\s*(['"`])([^'`]*)\1/) ?? [])[2] ?? '';
    // 遮罩点击的键盘等价物是 ESC（浏览器交互用例验证），不要求遮罩可聚焦。
    if (/overlay|mask|backdrop/i.test(cls)) continue;
    const native =
      n.tag === 'button' ||
      n.tag === 'input' ||
      n.tag === 'select' ||
      n.tag === 'textarea' ||
      (n.tag === 'a' && /\bhref\s*:/.test(n.props));
    checked++;
    if (native) continue;
    if (
      /\bonClick\b|\bonKeyDown\b/.test(n.props) &&
      !/\bonKeyDown\b|\bonKeydown\b|\bkeydown\b/.test(n.props)
    ) {
      offenders.push(n.tag);
    }
  }
  return offenders.length === 0
    ? { status: 'pass', detail: `${checked} 个可交互元素均有键盘路径` }
    : { status: 'red', detail: `仅 onClick、无 keydown: <${offenders.join('>, <')}>` };
}

// ── a11y（B05）────────────────────────────────────────────────────────────
// 判据详见 ui-contracts.json 的 a11y 登记与 `keel/checks/rules.md`。
// 只看能从源码确定的四件事：
//   1. 可聚焦：非原生可点击元素必须有 role + tabindex（或标准 a11y 助手）；
//   2. 可访问名称：图标按钮（子节点只有符号）必须有 aria-label；img 必须有 alt；
//   3. 弹层语义与焦点：Dialog/Modal/Drawer 必须有 role=dialog + aria-modal，
//      且通过 createOverlayFocus 保证「打开移入 / 关闭归还」；
//   4. tab 顺序：不得出现正 tabindex；角色状态属性（progressbar 三值 / switch checked /
//      aria-expanded 动态绑定）必须齐全。
// 遮罩层点击是**指针辅助**（键盘等价物是 ESC），不要求遮罩本身可聚焦 —— 见 isBackdrop 跳过。
const NATIVE_FOCUSABLE = new Set(['button', 'input', 'select', 'textarea', 'a']);
const A11Y_HELPERS = [
  'getButtonA11yProps',
  'getFormControlA11yProps',
  'getInputControlA11yProps',
  'getSpinbuttonA11yProps',
  'getSwitchA11yProps',
  'getDialogA11yProps',
];
const LITERAL = /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
/** 纯符号文本（×、‹、›、−、+ …）不构成可访问名称。 */
const SYMBOL_ONLY = /^[\s×✕✖‹›«»◌+\-−–—…·.,;:!?/\\|()[\]{}'"*#&^%$@~`]+$/;

function balancedEnd(text, openParen) {
  let depth = 0;
  let quote = null;
  for (let i = openParen; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitArgs(text) {
  const args = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') depth--;
    else if (c === ',' && depth === 0) {
      args.push(text.slice(start, i));
      start = i + 1;
    }
  }
  args.push(text.slice(start));
  return args;
}

/** 扫描源码里的 `createVNode('tag', props, children…)`，返回 tag / props / children 原文。 */
function scanVNodes(src) {
  const nodes = [];
  for (const m of src.matchAll(/createVNode\(\s*(['"])([^'"]+)\1/g)) {
    const open = src.indexOf('(', m.index);
    const end = balancedEnd(src, open);
    if (end < 0) continue;
    const args = splitArgs(src.slice(open + 1, end));
    nodes.push({
      tag: m[2],
      props: args[1] ?? '',
      children: args.slice(2).join(','),
    });
  }
  return nodes;
}

/** 把 `mergeA11yProps(btnProps, …)` 里的变量声明（getXxxA11yProps 调用）找回来。 */
function propsHelperSource(src, propsText) {
  const parts = [];
  for (const m of propsText.matchAll(/(get[A-Za-z]+A11yProps)\s*\(/g)) {
    const open = propsText.indexOf('(', m.index + m[1].length);
    const end = balancedEnd(propsText, open);
    if (end >= 0) parts.push(propsText.slice(m.index, end + 1));
  }
  const merged = propsText.match(/mergeA11yProps\s*\(\s*(\w+)/);
  if (merged) {
    const id = merged[1];
    const re = new RegExp(`(?:const|let|var)\\s+${id}\\s*=\\s*(get[A-Za-z]+A11yProps)\\s*\\(`);
    const dm = re.exec(src);
    if (dm) {
      const open = src.indexOf('(', dm.index + dm[1].length);
      const end = balancedEnd(src, open);
      if (end >= 0) parts.push(src.slice(dm.index, end + 1));
    }
  }
  return parts.join('\n');
}

function probeA11y(name, src) {
  const nodes = scanVNodes(src);
  const issues = [];
  const isDialogFamily = name === 'Dialog' || name === 'Modal' || name === 'Drawer';
  const hasDialogHelper = /getDialogA11yProps\s*\(/.test(src);
  const hasDialogRole = /role\s*:\s*'dialog'/.test(src) || hasDialogHelper;
  const hasAriaSurface =
    /role\s*:\s*['"]\w+['"]/.test(src) ||
    /'aria-[a-z]+'\s*:/.test(src) ||
    /aria-[a-z]+\s*:/.test(src);
  const clickable = nodes.some((n) =>
    /\bonClick\b|\bonKeyDown\b|\bonChange\b|\bonInput\b/.test(n.props),
  );

  if (!clickable && !hasAriaSurface && !isDialogFamily && !nodes.some((n) => n.tag === 'img')) {
    return { status: 'n/a', detail: '无交互、无 aria 语义、无 img' };
  }

  // 1. img 必须有 alt；空值时不能把属性整个省掉（读屏会退化为读文件名）
  for (const n of nodes.filter((x) => x.tag === 'img')) {
    const alt = n.props.match(/alt\s*:\s*([^,}]+)/);
    if (!alt) issues.push('img 缺 alt');
    else if (/\bundefined\b/.test(alt[1])) issues.push('img alt 在空值时被省略（应为空串）');
  }

  // 2. 可点击元素：可聚焦 + 可访问名称
  for (const n of nodes) {
    if (!/\bonClick\b|\bonKeyDown\b/.test(n.props)) continue;
    const cls = (n.props.match(/class\s*:\s*(['"`])([^'`]*)\1/) ?? [])[2] ?? '';
    // 遮罩层点击是指针辅助，键盘等价物是 ESC，不要求遮罩可聚焦。
    if (/overlay|mask|backdrop/i.test(cls)) continue;
    // 仅用于阻止冒泡的 onClick（内容区常见）不是可激活语义，不要求可聚焦。
    if (/stopPropagation/.test(n.props)) continue;

    const helper = propsHelperSource(src, n.props);
    const named =
      /\baria-label\b|\bariaLabel\b/.test(n.props) || /\baria-label\b|\bariaLabel\b/.test(helper);

    if (NATIVE_FOCUSABLE.has(n.tag)) {
      if (n.tag === 'a' && !/\bhref\s*:/.test(n.props)) {
        if (!/role\s*:/.test(n.props) || !/tabindex\b/i.test(n.props)) {
          issues.push('a 无 href 却可点击，且缺 role+tabindex');
        }
      }
    } else {
      const explicit = /role\s*:/.test(n.props) && /tabindex\b/i.test(n.props);
      const viaHelper = A11Y_HELPERS.some((h) => helper.includes(h));
      if (!explicit && !viaHelper) issues.push(`可点击 <${n.tag}> 缺 role+tabindex`);
    }

    const literals = [...n.children.matchAll(LITERAL)]
      .map((m) => m[1] ?? m[2] ?? m[3] ?? '')
      .filter((s) => s.trim());
    const dynamic =
      /t\(\s*['"`]|\bString\(|\bslots\.|_props\.|\bp\.\w+|effectiveCurrent|totalPages/.test(
        n.children,
      );
    if (literals.length > 0 && literals.every((s) => SYMBOL_ONLY.test(s)) && !dynamic && !named) {
      issues.push(`图标按钮无可访问名称（<${n.tag}> 仅符号 ${literals.join('/')}）`);
    }
  }

  // 3. 弹层语义 + 焦点管理
  if (isDialogFamily || hasDialogHelper) {
    if (!hasDialogRole) issues.push('弹层缺 role=dialog');
    const hasModalAttr =
      hasDialogHelper || /'aria-modal'\s*:/.test(src) || /"aria-modal"\s*:/.test(src);
    if (!hasModalAttr) issues.push('弹层缺 aria-modal');
  }
  if (isDialogFamily && !/createOverlayFocus\s*\(/.test(src)) {
    issues.push('未见 createOverlayFocus（打开移入/关闭归还没有保证）');
  }

  // 4. 角色状态属性
  if (/role\s*:\s*['"]progressbar['"]/.test(src)) {
    for (const attr of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax']) {
      if (!new RegExp(`'${attr}'`).test(src)) issues.push(`progressbar 缺 ${attr}`);
    }
  }
  if (/getSwitchA11yProps\s*\(/.test(src) || /role\s*:\s*['"]switch['"]/.test(src)) {
    if (!/getSwitchA11yProps\s*\(/.test(src) && !/'aria-checked'\s*:/.test(src)) {
      issues.push('switch 缺 aria-checked');
    }
  }
  for (const m of src.matchAll(/'aria-expanded'\s*:\s*([^,\n}]+)/g)) {
    if (/^['"](true|false)['"]$/.test(m[1].trim())) {
      issues.push('aria-expanded 静态写死（必须绑定状态）');
    }
  }

  // 5. tab 顺序
  for (const m of src.matchAll(/tabIndex\s*:\s*(\d+)/g)) {
    if (Number(m[1]) > 0) issues.push(`正 tabindex ${m[1]} 破坏文档顺序`);
  }
  for (const m of src.matchAll(/tabindex\s*:\s*(?:'|")?(\d+)/g)) {
    if (Number(m[1]) > 0) issues.push(`正 tabindex ${m[1]} 破坏文档顺序`);
  }

  return issues.length === 0
    ? { status: 'pass', detail: '可聚焦/命名/弹层/状态/tab 顺序均通过' }
    : { status: 'red', detail: issues.join('；') };
}

const PROBES = {
  vmodel: probeVmodel,
  slots: probeSlots,
  events: probeEvents,
  controlled: probeControlled,
  styles: probeStyles,
  keyboard: probeKeyboard,
  a11y: probeA11y,
};

const components = ONLY ? [ONLY] : REG.components;
if (ONLY && !REG.components.includes(ONLY)) {
  console.error(`未知组件: ${ONLY}`);
  process.exit(2);
}

const rows = [];
const mismatches = [];
const malformed = [];
let total = 0;

// 维护用：只打印 a11y 推导结果（供登记时对照），不参与门禁。
if (process.argv.includes('--derive-a11y')) {
  const out = {};
  for (const name of components) out[name] = probeA11y(name, readSource(name));
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

for (const name of components) {
  const src = readSource(name);
  const row = { name, cells: {} };
  for (const cap of REG.capabilities) {
    const reg = REG.cells?.[name]?.[cap];
    const derived = PROBES[cap](name, src, reg);
    total++;
    if (!reg || !reg.status) {
      malformed.push(`${name}/${cap}: 登记缺失`);
      row.cells[cap] = derived;
      continue;
    }
    if (reg.status !== derived.status) {
      mismatches.push(
        `${name}/${cap}: 登记=${reg.status} 推导=${derived.status}（${derived.detail}）`,
      );
    }
    if (reg.status !== 'pass' && !reg.reason) {
      malformed.push(`${name}/${cap}: ${reg.status} 缺 reason`);
    }
    row.cells[cap] = { status: derived.status, detail: derived.detail, reason: reg.reason };
  }
  rows.push(row);
}

const count = (cap, s) => rows.filter((r) => r.cells[cap].status === s).length;
console.log('Golden 20 × 七类契约（源码推导）\n');
console.log('| 类 | 通过 | 红 | N/A |');
console.log('|---|---|---|---|');
for (const cap of REG.capabilities) {
  console.log(`| ${cap} | ${count(cap, 'pass')} | ${count(cap, 'red')} | ${count(cap, 'n/a')} |`);
}
const all = ['pass', 'red', 'n/a'];
console.log(
  `\n合计 ${total} 格: ` +
    all
      .map(
        (s) =>
          `${s}=${rows.flatMap((r) => Object.values(r.cells)).filter((c) => c.status === s).length}`,
      )
      .join(' / '),
);

console.log('\n红项');
for (const r of rows) {
  for (const cap of REG.capabilities) {
    const c = r.cells[cap];
    if (c.status === 'red')
      console.log(` ❌ ${r.name}/${cap}: ${c.reason ?? '(缺 reason)'} → ${c.detail}`);
  }
}

if (mismatches.length || malformed.length) {
  console.log('\n登记表与源码不一致（先改代码或先改登记，不允许静默漂移）');
  for (const m of mismatches) console.log(` ❌ ${m}`);
  for (const m of malformed) console.log(` ❌ ${m}`);
  process.exit(1);
}

if (STRICT) {
  const reds = rows.flatMap((r) =>
    Object.entries(r.cells)
      .filter(([, c]) => c.status === 'red')
      .map(([cap]) => `${r.name}/${cap}`),
  );
  if (reds.length) {
    console.log(`\n--strict: ${reds.length} 个红项未清`);
    process.exit(1);
  }
  console.log('\n--strict: 全部通过');
}
