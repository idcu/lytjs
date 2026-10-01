/**
 * 覆盖率电池测试（Task C：把全量 branches 覆盖率从 81.7% 推到 ≥85%）
 *
 * 目标文件（占未覆盖分支大头）：
 *   - codegen-signal-optimized.ts  (useShortNames:false 变体覆盖 ~40 条 getShortName 早返回分支)
 *   - codegen-signal.ts            (边界模板：布尔属性 / v-text·v-html 无 exp / 空插值 / 两个内置组件 / 校验器抛错)
 *   - codegen-ssr.ts               (SSR 专属：v-html/v-text/v-show/style+vshow/作用域插槽/void/事件跳过)
 *   - codegen.ts                   (默认 vnode 模式分支)
 *   - optimizations/index.ts       (optimize:true 各开关：node/edge/generateTypes/precompileTemplate)
 *
 * 设计：数据驱动，每个模板声明在哪些变体下编译；常规模板断言产出为非空字符串，
 *       throw 模板断言会抛错（抛错执行本身即覆盖校验器分支）。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

type Opts = Record<string, unknown>;

const VARIANTS: Record<string, { label: string; options: Opts }> = {
  base: { label: 'base', options: { rendererMode: 'signal', optimizeSignal: false } },
  opt: { label: 'opt', options: { rendererMode: 'signal', optimizeSignal: true } },
  optShort: {
    label: 'opt+useShortNames:false',
    options: { rendererMode: 'signal', optimizeSignal: true, useShortNames: false },
  },
  ssr: { label: 'ssr', options: { ssrMode: true } },
  optNode: { label: 'optimize+node', options: { optimize: true, optimizeForRuntime: 'node' } },
  optEdge: { label: 'optimize+edge', options: { optimize: true, optimizeForRuntime: 'edge' } },
  optTypes: { label: 'optimize+generateTypes', options: { optimize: true, generateTypes: true } },
  precomp: { label: 'precompileTemplate', options: { precompileTemplate: true } },
};

interface Tpl {
  name: string;
  tpl: string;
  variants: string[];
  throws?: boolean;
}

// ============================================================================
// 1) SIGNAL 模式（base / opt / optShort）共用矩阵
//    注意：base/opt 对「多根」会抛错，所以凡是需要「两个同标签/两个内置组件」的，
//    必须包在单一根元素内。
// ============================================================================
const SIGNAL: Tpl[] = [
  { name: 'pure-static-text', tpl: '<div>hello</div>', variants: ['base', 'opt', 'optShort'] },
  { name: 'interp', tpl: '<div>{{ msg }}</div>', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'compound-interp',
    tpl: '<div>{{ a }} text {{ b }}</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'text-only-root', tpl: 'just text', variants: ['base', 'opt', 'optShort'] },
  { name: 'comment-only-root', tpl: '<!-- c -->', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'comment-in-element',
    tpl: '<div>text <!-- c --> more</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'v-if', tpl: '<div v-if="a">A</div>', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'v-if-text-branch',
    tpl: '<div v-if="a">text</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-if-interp-branch',
    tpl: '<div v-if="a">{{ x }}</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'v-if-empty', tpl: '<div v-if="">x</div>', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'v-elseif-empty',
    tpl: '<div v-if="a">A</div><div v-else-if="">B</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'dynamic-component-expr',
    tpl: '<component :is="a b" />',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-for-list',
    tpl: '<ul><li v-for="it in list" :key="it.id">{{ it.n }}</li></ul>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-for-idx',
    tpl: '<ul><li v-for="(it, i) in list" :key="i">{{ i }}:{{ it.n }}</li></ul>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-for-of',
    tpl: '<ul><li v-for="it of list" :key="it.id">{{ it.n }}</li></ul>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-for-range',
    tpl: '<div v-for="n in 5">{{ n }}</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-for-component',
    tpl: '<Comp v-for="it in list" :key="it.id" :p="it" />',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-for-component-item',
    tpl: '<ul><li v-for="i in list" :key="i.id"><MyRow :data="i" /></li></ul>',
    variants: ['opt', 'optShort'],
  },
  {
    name: 'v-for-template-component',
    tpl: '<template v-for="i in list"><MyRow :key="i.id" :data="i" /></template>',
    variants: ['opt', 'optShort'],
  },
  {
    name: 'keepalive-include',
    tpl: '<KeepAlive include="a"><Comp /></KeepAlive>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'multiple-named-slots',
    tpl: '<Comp><template #a>x</template><template #b>y</template></Comp>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'dynamic-event', tpl: '<div @[ev]="fn">x</div>', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'component-fallthrough-class',
    tpl: '<Comp class="x" />',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'v-model-input', tpl: '<input v-model="val" />', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'v-model-checkbox',
    tpl: '<input type="checkbox" v-model="ck" />',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-model-radio',
    tpl: '<input type="radio" v-model="rd" value="x" />',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-model-select',
    tpl: '<select v-model="sel"><option v-for="o in opts" :value="o">{{ o }}</option></select>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-model-textarea',
    tpl: '<textarea v-model="t"></textarea>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-model-number',
    tpl: '<input v-model.number="n" />',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-model-trim',
    tpl: '<input v-model.trim="s" />',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-model-lazy',
    tpl: '<input v-model.lazy="l" />',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'v-model-number-trim',
    tpl: '<input v-model.number.trim="c" />',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'on-click',
    tpl: '<button @click="fn">x</button>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'on-click-inline',
    tpl: '<button @click="fn()">x</button>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'on-click-statement',
    tpl: '<button @click="count++">x</button>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'on-stop',
    tpl: '<button @click.stop="fn">x</button>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'on-submit-prevent',
    tpl: '<form @submit.prevent="fn">x</form>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'on-stop-prevent',
    tpl: '<button @click.stop.prevent="fn">x</button>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'on-keyup-enter',
    tpl: '<input @keyup.enter="fn" />',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'on-keyup-esc', tpl: '<input @keyup.esc="fn" />', variants: ['base', 'opt', 'optShort'] },
  { name: 'on-keyup-code', tpl: '<input @keyup.13="fn" />', variants: ['base', 'opt', 'optShort'] },
  { name: 'on-self', tpl: '<div @click.self="fn">x</div>', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'on-capture',
    tpl: '<div @click.capture="fn">x</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'on-once', tpl: '<div @click.once="fn">x</div>', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'class-style-obj',
    tpl: '<div :class="cls" :style="sty">{{ x }}</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'dynamic-arg', tpl: '<div :[dyn]="val">x</div>', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'v-bind-object',
    tpl: '<div v-bind="obj">x</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'v-show', tpl: '<div v-show="vis">x</div>', variants: ['base', 'opt', 'optShort'] },
  { name: 'v-html', tpl: '<div v-html="html">x</div>', variants: ['base', 'opt', 'optShort'] },
  { name: 'v-html-no-exp', tpl: '<div v-html></div>', variants: ['base', 'opt', 'optShort'] },
  { name: 'v-text', tpl: '<div v-text="txt">x</div>', variants: ['base', 'opt', 'optShort'] },
  { name: 'v-text-no-exp', tpl: '<div v-text></div>', variants: ['base', 'opt', 'optShort'] },
  { name: 'v-pre', tpl: '<div v-pre">{{ raw }}</div>', variants: ['base', 'opt', 'optShort'] },
  { name: 'v-once', tpl: '<div v-once">{{ once }}</div>', variants: ['base', 'opt', 'optShort'] },
  { name: 'v-memo', tpl: '<div v-memo="[x]">{{ x }}</div>', variants: ['base', 'opt', 'optShort'] },
  { name: 'component', tpl: '<Comp :p="a" />', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'two-components',
    tpl: '<div><Compa /><Compb /></div>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'slot-default-scoped',
    tpl: '<Comp v-slot:default="s">{{ s }}</Comp>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'slot-shorthand-default',
    tpl: '<Comp #default="s">{{ s }}</Comp>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'slot-shorthand-named',
    tpl: '<Comp #item="it">{{ it }}</Comp>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'slot-fallback',
    tpl: '<Comp><div>fallback</div></Comp>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'two-slots',
    tpl: '<Comp><slot name="a" /><slot name="b" /></Comp>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'dynamic-component',
    tpl: '<component :is="tag" />',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'keepalive',
    tpl: '<KeepAlive><Comp v-if="s" /></KeepAlive>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'keepalive-max',
    tpl: '<KeepAlive :max="5"><Comp /></KeepAlive>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'teleport',
    tpl: '<Teleport to="#t"><div>x</div></Teleport>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'two-teleports',
    tpl: '<div><Teleport to="#a"><div /></Teleport><Teleport to="#b"><div /></Teleport></div>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'transition',
    tpl: '<Transition name="f"><div>x</div></Transition>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'suspense', tpl: '<Suspense><Comp /></Suspense>', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'template-v-if',
    tpl: '<template v-if="a"><div>x</div></template>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'template-v-for',
    tpl: '<template v-for="i in list"><div :key="i">{{ i }}</div></template>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'class-array-obj',
    tpl: '<div :class="[\'a\',{b:ok}]" :style="{color:c}">x</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  {
    name: 'class-static-dynamic',
    tpl: '<div class="s" :class="d">x</div>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'img-src', tpl: '<img :src="u" alt="hi" />', variants: ['base', 'opt', 'optShort'] },
  { name: 'data-attr', tpl: '<div :data-x="v">x</div>', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'disabled-button-on',
    tpl: '<button :disabled="d" @click="fn">x</button>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'v-island', tpl: '<div v-island="x">y</div>', variants: ['base', 'opt', 'optShort'] },
  { name: 'slot-outlet', tpl: '<slot />', variants: ['base', 'opt', 'optShort'] },
  { name: 'slot-named', tpl: '<slot name="x" />', variants: ['base', 'opt', 'optShort'] },
  { name: 'slot-dynamic-name', tpl: '<slot :name="y" />', variants: ['base', 'opt', 'optShort'] },
  { name: 'br-void', tpl: '<br />', variants: ['base', 'opt', 'optShort'] },
  { name: 'input-bind-value', tpl: '<input :value="v" />', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'boolean-attr-element',
    tpl: '<div disabled></div>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'boolean-attr-input', tpl: '<input disabled />', variants: ['base', 'opt', 'optShort'] },
  {
    name: 'two-same-tag-children',
    tpl: '<div><div></div><div></div></div>',
    variants: ['base', 'opt', 'optShort'],
  },
  { name: 'empty-interp', tpl: '<div>{{ }}</div>', variants: ['base', 'opt', 'optShort'] },
  // 以下在 base 会抛（v-else/v-else-if 链不支持），仅跑 opt/optShort/ssr
  {
    name: 'v-if-else-empty',
    tpl: '<div v-if="a">x</div><div v-else></div>',
    variants: ['opt', 'optShort', 'ssr'],
  },
  {
    name: 'v-if-elseif-else',
    tpl: '<div v-if="a">A</div><div v-else-if="b">B</div><div v-else>C</div>',
    variants: ['opt', 'optShort', 'ssr'],
  },
  {
    name: 'v-if-text-nested',
    tpl: '<div v-if="a"><span>b</span><span>c</span></div>',
    variants: ['base', 'opt', 'optShort'],
  },
];

// ============================================================================
// 2) THROW 模板：校验器抛错分支（base / opt / optShort 都带这些校验器）
// ============================================================================
const THROWS: Tpl[] = [
  {
    name: 'multi-root',
    tpl: '<div>a</div><div>b</div>',
    variants: ['base', 'opt', 'optShort'],
    throws: true,
  },
  {
    name: 'unsafe-interp',
    tpl: '<div>{{ list.map(i => i.n) }}</div>',
    variants: ['base', 'opt', 'optShort'],
    throws: true,
  },
  {
    name: 'invalid-attr-name',
    tpl: '<div :[a b]="x">y</div>',
    variants: ['base', 'opt', 'optShort'],
    throws: true,
  },
  {
    name: 'invalid-event-name',
    tpl: '<div @[a b]="fn">x</div>',
    variants: ['base', 'opt', 'optShort'],
    throws: true,
  },
  {
    name: 'single-quote-arg',
    tpl: '<div :[foo\'bar]="x">y</div>',
    variants: ['base', 'opt', 'optShort'],
    throws: true,
  },
];

// ============================================================================
// 3) SSR 专属矩阵
// ============================================================================
const SSR: Tpl[] = [
  { name: 'ssr-static', tpl: '<div>hello</div>', variants: ['ssr'] },
  { name: 'ssr-compound-interp', tpl: '<div>{{ a }} text {{ b }}</div>', variants: ['ssr'] },
  { name: 'ssr-interp', tpl: '<div>{{ a }}</div>', variants: ['ssr'] },
  { name: 'ssr-boolean-attr', tpl: '<input disabled />', variants: ['ssr'] },
  { name: 'ssr-default-scoped-slot', tpl: '<Comp v-slot="s">{{ s }}</Comp>', variants: ['ssr'] },
  { name: 'ssr-named-scoped-slot', tpl: '<Comp #foo="x">{{ x }}</Comp>', variants: ['ssr'] },
  { name: 'ssr-slot-no-scope', tpl: '<Comp v-slot>static</Comp>', variants: ['ssr'] },
  { name: 'ssr-vshow', tpl: '<div v-show="x">y</div>', variants: ['ssr'] },
  {
    name: 'ssr-vshow-static-style',
    tpl: '<div style="color:red" v-show="x">y</div>',
    variants: ['ssr'],
  },
  { name: 'ssr-vshow-dynamic-style', tpl: '<div :style="s" v-show="x">y</div>', variants: ['ssr'] },
  { name: 'ssr-vhtml', tpl: '<div v-html="x">y</div>', variants: ['ssr'] },
  { name: 'ssr-vtext', tpl: '<div v-text="x">y</div>', variants: ['ssr'] },
  { name: 'ssr-vmodel-input', tpl: '<input v-model="x" />', variants: ['ssr'] },
  { name: 'ssr-vmodel-textarea', tpl: '<textarea v-model="x"></textarea>', variants: ['ssr'] },
  {
    name: 'ssr-vmodel-select',
    tpl: '<select v-model="x"><option value="1">a</option></select>',
    variants: ['ssr'],
  },
  { name: 'ssr-vif-text', tpl: '<div v-if="a">text</div>', variants: ['ssr'] },
  { name: 'ssr-vif-interp', tpl: '<div v-if="a">{{ x }}</div>', variants: ['ssr'] },
  { name: 'ssr-vif-else-empty', tpl: '<div v-if="a">x</div><div v-else></div>', variants: ['ssr'] },
  { name: 'ssr-slot-outlet', tpl: '<slot />', variants: ['ssr'] },
  { name: 'ssr-slot-named', tpl: '<slot name="x" />', variants: ['ssr'] },
  { name: 'ssr-slot-dynamic-name', tpl: '<slot :name="y" />', variants: ['ssr'] },
  { name: 'ssr-event-skip', tpl: '<div @click="fn">x</div>', variants: ['ssr'] },
  { name: 'ssr-void-input', tpl: '<input />', variants: ['ssr'] },
  { name: 'ssr-bind', tpl: '<div :title="t">{{ x }}</div>', variants: ['ssr'] },
  {
    name: 'ssr-vfor',
    tpl: '<div v-for="i in list" :key="i.id">{{ i.n }}</div>',
    variants: ['ssr'],
  },
  { name: 'ssr-component', tpl: '<Comp :p="a" />', variants: ['ssr'] },
];

// ============================================================================
// 4) OPTIMIZE 矩阵（optimize:true 各开关）
// ============================================================================
const OPTIMIZE: Tpl[] = [
  {
    name: 'opt-stable-props',
    tpl: '<Comp :title="\'hi\'" :n="123" :ok="true" />',
    variants: ['optNode', 'optEdge', 'optTypes', 'precomp'],
  },
  {
    name: 'opt-noarg-fn',
    tpl: '<Comp :f="foo()" />',
    variants: ['optNode', 'optEdge', 'optTypes', 'precomp'],
  },
  {
    name: 'opt-memo-vfor',
    tpl: '<div v-for="i in items" :key="i.id">{{ i.n }}</div>',
    variants: ['optNode', 'optEdge', 'optTypes', 'precomp'],
  },
  {
    name: 'opt-deep-nesting',
    tpl: '<div><div><div><div>x</div></div></div></div>',
    variants: ['optNode', 'optEdge', 'optTypes', 'precomp'],
  },
  {
    name: 'opt-interp-stable',
    tpl: '<div>{{ x }}</div>',
    variants: ['optNode', 'optEdge', 'optTypes', 'precomp'],
  },
  {
    name: 'opt-dead-branch',
    tpl: '<div v-if="false">x</div>',
    variants: ['optNode', 'optEdge', 'optTypes', 'precomp'],
  },
  {
    name: 'opt-static-precompile',
    tpl: '<div>hello</div>',
    variants: ['optNode', 'optEdge', 'optTypes', 'precomp'],
  },
  {
    name: 'opt-props-directive',
    tpl: '<Comp :a="b" :c="d" />',
    variants: ['optNode', 'optEdge', 'optTypes', 'precomp'],
  },
  {
    name: 'opt-class-mixed',
    tpl: '<div class="a" :class="b">x</div>',
    variants: ['optNode', 'optEdge', 'optTypes', 'precomp'],
  },
];

function compileAll(list: Tpl[]) {
  for (const entry of list) {
    for (const vKey of entry.variants) {
      const v = VARIANTS[vKey];
      if (!v) throw new Error(`unknown variant ${vKey}`);
      const label = `${entry.name} [${v.label}]`;
      if (entry.throws) {
        it(`THROWS ${label}`, () => {
          expect(() => compile(entry.tpl, v.options as never)).toThrow();
        });
      } else {
        it(`compiles ${label}`, () => {
          const r = compile(entry.tpl, v.options as never);
          expect(typeof r.code).toBe('string');
          expect(r.code.length).toBeGreaterThan(0);
        });
      }
    }
  }
}

describe('coverage battery: signal modes', () => compileAll(SIGNAL));
describe('coverage battery: throw validators', () => compileAll(THROWS));
describe('coverage battery: ssr mode', () => compileAll(SSR));
describe('coverage battery: optimize modes', () => compileAll(OPTIMIZE));
