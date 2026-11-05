#!/usr/bin/env node
/**
 * 门禁：Golden 20 × 六类行为契约（B04）
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
 * ## 六类探针
 *
 * | 类 | 判据 |
 * |---|---|
 * | vmodel | 值类 prop 存在，且源码 emit `update:<prop>` |
 * | slots | `types.ts` 声明的每个插槽都被渲染函数读取 |
 * | events | 声明的每个 `onX` 回调要么被 `p.onX` 调用，要么 emit 同名事件 |
 * | controlled | 有值类 prop + 内部 signal/reactive + 无 watch ⇒ 红；无受控 prop 但有内部状态 ⇒ n/a |
 * | styles | 源码里的每个静态 `lyt-*` 类名在 `styles/index.css` 有规则 |
 * | keyboard | 有交互的组件必须有 keydown 处理或原生可聚焦元素；span[role=link] 无 tabindex ⇒ 红 |
 *
 * 用法：
 *   node scripts/check-ui-contracts.mjs                 # 报告模式（有红也退出 0）
 *   node scripts/check-ui-contracts.mjs --strict        # 任一红退出 1
 *   node scripts/check-ui-contracts.mjs --component Tag # 只看一个组件
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const UI = path.join(ROOT, 'packages/ecosystem/packages/ui/src');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/ui-contracts.json'), 'utf8'));

const STRICT = process.argv.includes('--strict');
const onlyIdx = process.argv.indexOf('--component');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

const TYPES = fs.readFileSync(path.join(UI, 'components/types.ts'), 'utf8');
const CSS = fs.readFileSync(path.join(UI, 'styles/index.css'), 'utf8');
const CSS_CLASSES = new Set([...CSS.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));

const VALUE_PROPS = ['modelValue', 'current', 'pageSize'];
const CONTROLLED_PROPS = [...VALUE_PROPS, 'src', 'open', 'visible', 'spinning'];

function readSource(name) {
  return fs.readFileSync(path.join(UI, 'components', `${name}.ts`), 'utf8');
}

function hasProp(src, prop) {
  return new RegExp(`\\n    ${prop}: \\{`).test(src);
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
  const missing = valueProps.filter((p) => !src.includes(`emit('update:${p}'`));
  return {
    status: missing.length === 0 ? 'pass' : 'red',
    detail: missing.length === 0 ? valueProps.join(',') : `未 emit update:${missing.join(',')}`,
  };
}

function probeSlots(name, src) {
  const declared = declaredSlots(name);
  if (!declared) return { status: 'n/a', detail: '无插槽接口' };
  const used = new Set([...src.matchAll(/slots\.(\w+)/g)].map((m) => m[1]));
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
  const interactive =
    /handleClick|onClick|handleChange|onChange|handleInput|onInput|handleKeydown|onKeyDown/.test(
      src,
    );
  if (!interactive) return { status: 'n/a', detail: '无交互' };
  if (/handleKeydown|onKeyDown|keydown/.test(src)) {
    return { status: 'pass', detail: '有 keydown 处理' };
  }
  const linkFallback = /role:\s*['"]link['"]/.test(src);
  if (linkFallback && !/tabindex|tabIndex/.test(src)) {
    return { status: 'red', detail: 'span[role=link] 无 tabindex / keydown' };
  }
  const native = /createVNode\(\s*['"](button|input|select|textarea)['"]/.test(src);
  if (native) return { status: 'pass', detail: '原生可聚焦元素' };
  return { status: 'red', detail: '无 keydown 处理，也无原生可聚焦元素' };
}

const PROBES = {
  vmodel: probeVmodel,
  slots: probeSlots,
  events: probeEvents,
  controlled: probeControlled,
  styles: probeStyles,
  keyboard: probeKeyboard,
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
console.log('Golden 20 × 六类契约（源码推导）\n');
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
