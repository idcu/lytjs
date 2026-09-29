/**
 * compiler codegen —— **构造全覆盖**批次
 *
 * 目的：`codegen-signal-optimized.ts` / `codegen-signal.ts` / `codegen-ssr.ts` / `codegen.ts`
 * 的分支缺口分散在整条代码生成流水线上（元素/组件/条件/循环/插槽/属性/事件/文本/指令…），
 * 而既有用例只覆盖了少数构造（v-for / v-model / v-if / v-show / v-on / v-bind）。
 *
 * 本文件把同一批模板分别过三条 codegen 路径：
 * - signal（优化版，**默认**）：`{ rendererMode: 'signal', optimizeSignal: true }`
 * - signal（非优化版）：`{ rendererMode: 'signal', optimizeSignal: false }`
 * - SSR：`{ ssrMode: true }`
 *
 * ⚠️ **已知缺陷（本轮仅取证，未修）**：优化版 codegen 仍沿用旧的
 * `validateExpression`（只允许「简单属性路径」正则 `^[a-zA-Z_$][\w$]*(\.[...])*$`），
 * 于是一大批在**非优化版 / SSR 均可用**的表达式（数组/对象/三元、v-bind 带连字符的属性名、
 * v-on 的内联语句 `fn()`、以及 `<slot :a="1">`）在**默认路径下直接编译报错**。
 * 根因：批次 48–50 的「表达式改走 `prefixIdentifiers`」修复**只落在 `codegen-signal.ts`**，
 * 未双写到 `codegen-signal-optimized.ts`（正是「两套 codegen 必须双写」的陷阱）。
 * 下方 `已知缺陷（特征化用例）` 段落把现状钉住；**修复后应把那些用例改为「应可编译」**。
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src';

type Mode = { label: string; options: Record<string, unknown> };

const SIGNAL_OPT: Mode = {
  label: 'signal-opt',
  options: { rendererMode: 'signal', optimizeSignal: true },
};
const SIGNAL_BASE: Mode = {
  label: 'signal-base',
  options: { rendererMode: 'signal', optimizeSignal: false },
};
const SSR: Mode = { label: 'ssr', options: { ssrMode: true } };

const ALL_MODES: Mode[] = [SIGNAL_OPT, SIGNAL_BASE, SSR];

/** 插值表达式的各种形态 */
const INTERPOLATIONS = [
  `<div>{{ a }}</div>`,
  `<div>{{ a + b }}</div>`,
  `<div>{{ fn() }}</div>`,
  `<div>{{ a ? b : c }}</div>`,
  `<div>{{ obj.prop }}</div>`,
  `<div>{{ obj.a.b.c }}</div>`,
  `<div>{{ arr[0] }}</div>`,
  `<div>{{ !a }}</div>`,
  `<div>{{ a ?? b }}</div>`,
  `<div>{{ a?.b }}</div>`,
  `<div>{{ list.map(f).join(',') }}</div>`,
  `<div>{{ 'str' }}|{{ 1 }}|{{ true }}</div>`,
];

/** 结构性指令 */
const STRUCTURES = [
  `<div v-if="a">A</div>`,
  `<div v-if="a">A</div><span v-else>B</span>`,
  `<div v-if="a">A</div><span v-else-if="b">B</span><i v-else>C</i>`,
  `<div v-if="a"><span v-if="b">nested</span></div>`,
  `<ul><li v-for="i in list">{{ i }}</li></ul>`,
  `<ul><li v-for="(i, k) in list">{{ k }}:{{ i }}</li></ul>`,
  `<div v-for="(v, k) in obj">{{ k }}={{ v }}</div>`,
  `<div v-for="n in 5">{{ n }}</div>`,
  `<ul><li v-for="i in list"><span v-for="j in i">{{ j }}</span></li></ul>`,
  `<div v-for="i in list" :key="i.id">{{ i.name }}</div>`,
  `<div v-show="ok">shown</div>`,
  `<div v-if="a" v-show="b">both</div>`,
];

/** 属性绑定（**仅简单路径**，避免落到上面的已知缺陷） */
const BINDINGS = [
  `<div :id="a">x</div>`,
  `<div :id>x</div>`,
  `<div :[dyn]="a">x</div>`,
  `<div :class="cls">x</div>`,
  `<div class="s" :class="c">x</div>`,
  `<div :style="st">x</div>`,
  `<div :disabled="d">x</div>`,
  `<input :value="v" :readonly="r">`,
];

/** 事件（方法引用形态） */
const EVENTS = [
  `<button @click="fn">x</button>`,
  `<button @click.stop="fn">x</button>`,
  `<button @click.prevent="fn">x</button>`,
  `<button @click.stop.prevent.self.once="fn">x</button>`,
  `<button @keyup.enter="fn">x</button>`,
  `<button @keyup.esc="fn">x</button>`,
  `<button @mousedown.left="fn">x</button>`,
  `<button @mousedown.right.middle="fn">x</button>`,
  `<button @[evt]="fn">x</button>`,
];

/** 表单 / 文本 / 静态指令 */
const DIRECTIVES = [
  `<input v-model="x">`,
  `<input v-model.lazy="x">`,
  `<input v-model.number="x">`,
  `<input v-model.trim="x">`,
  `<input type="checkbox" v-model="x">`,
  `<input type="radio" v-model="x" value="1">`,
  `<select v-model="x"><option value="1">1</option></select>`,
  `<textarea v-model="x"></textarea>`,
  `<div v-html="h"></div>`,
  `<div v-text="t"></div>`,
  `<div v-once>{{ a }}</div>`,
  `<div v-pre>{{ a }}</div>`,
  `<div ref="r">x</div>`,
];

/** 插槽 / 组件 / 内置组件 */
const COMPONENTS_AND_SLOTS = [
  `<div><slot></slot></div>`,
  `<div><slot name="x"></slot></div>`,
  `<div><template #hdr>h</template><template #ftr>f</template></div>`,
  `<Comp/>`,
  `<Comp :p="1">slot content</Comp>`,
  `<Comp><template #named>n</template></Comp>`,
  `<component :is="dyn"/>`,
  `<Teleport to="#x"><div>a</div></Teleport>`,
  `<Transition><div>a</div></Transition>`,
  `<Suspense><div>a</div></Suspense>`,
  `<KeepAlive><Comp/></KeepAlive>`,
];

/** 静态提升 / 注释 / SVG / 深嵌套 */
const MISC = [
  `<div><div><div><span>{{ deep }}</span></div></div></div>`,
  `<div><!-- comment --></div>`,
  `<svg><circle cx="1" cy="2"></circle></svg>`,
  `<div><span>static</span><span>also static</span><i>{{ dyn }}</i></div>`,
];

const GROUPS: Array<[string, string[]]> = [
  ['插值表达式', INTERPOLATIONS],
  ['结构性指令', STRUCTURES],
  ['属性绑定', BINDINGS],
  ['事件与修饰符', EVENTS],
  ['表单 / 文本 / 静态指令', DIRECTIVES],
  ['插槽 / 组件 / 内置组件', COMPONENTS_AND_SLOTS],
  ['静态提升 / 注释 / SVG / 深嵌套', MISC],
];

/** 三模式通用的模板：断言「不抛错 + 产出非空代码」 */
const TEMPLATES_OK_IN_ALL_MODES = GROUPS;

/** **仅优化版拒绝**的模板（已知缺陷）：非优化版与 SSR 均可编译 */
const REJECTED_ONLY_BY_SIGNAL_OPT = [
  `<div :data-x="a">x</div>`,
  `<div :class="[a, b]">x</div>`,
  `<div :class="{ on: a }">x</div>`,
  `<div :class="a ? 'x' : 'y'">z</div>`,
  `<div :style="[a, b]">x</div>`,
  `<div :style="{ color: 'red' }">x</div>`,
  `<button @click="fn()">x</button>`,
  `<button @click="count++">x</button>`,
  `<button @[evt]="fn()">x</button>`,
  `<div><slot :a="1"></slot></div>`,
];

function okOrThrow(mode: Mode, template: string): boolean {
  try {
    const r = compile(template, mode.options as never);
    return typeof r.code === 'string' && r.code.length > 0;
  } catch {
    return false;
  }
}

describe('compiler codegen · 构造全覆盖批次', () => {
  for (const [groupName, templates] of TEMPLATES_OK_IN_ALL_MODES) {
    describe(groupName, () => {
      for (const mode of ALL_MODES) {
        for (const template of templates) {
          it(`[${mode.label}] ${template.replace(/\s+/g, ' ').slice(0, 56)}`, () => {
            const result = compile(template, mode.options as never);
            expect(result.code).toBeTypeOf('string');
            expect(result.code.length).toBeGreaterThan(0);
          });
        }
      }
    });
  }

  // ==================== 已知缺陷（特征化用例） ====================
  // ⚠️ 这些表达式在 **非优化版 / SSR 可用**，但在**默认（优化版）**下编译报错。
  //    根因见文件头的说明。**修复后**请把这里的 `expect(...).toBe(false)`
  //    改为「应可编译」，并把模板挪回上面的通用表。
  describe('已知缺陷：优化版对非简单表达式的过度拒绝', () => {
    for (const template of REJECTED_ONLY_BY_SIGNAL_OPT) {
      it(`[signal-opt] 目前会拒绝： ${template.replace(/\s+/g, ' ').slice(0, 52)}`, () => {
        expect(okOrThrow(SIGNAL_OPT, template)).toBe(false);
        // 对照：非优化版与 SSR 必须**可编译**（证明这是优化版独有的缺口）
        expect(okOrThrow(SIGNAL_BASE, template)).toBe(true);
        expect(okOrThrow(SSR, template)).toBe(true);
      });
    }
  });

  // ==================== 特征标记断言（非形状断言） ====================
  describe('特征标记', () => {
    it('signal（两版）：插值都应被前缀化为 _ctx./_c.', () => {
      for (const mode of [SIGNAL_OPT, SIGNAL_BASE]) {
        const r = compile(`<div>{{ message }}</div>`, mode.options as never);
        expect(r.code).toMatch(/_ctx\.message|_c\.message/);
      }
    });

    it('signal（两版）：v-for 的循环源出现在产物中（标识符被前缀化）', () => {
      for (const mode of [SIGNAL_OPT, SIGNAL_BASE]) {
        const r = compile(`<ul><li v-for="i in list">{{ i }}</li></ul>`, mode.options as never);
        // 注意：两版的循环辅助函数**别名不同**（优化版取短名），故只断言「循环源被正确前缀化」。
        expect(r.code).toMatch(/_ctx\.list|_c\.list/);
      }
    });

    it('SSR：插值经 String(_ctx.x)', () => {
      const r = compile(`<div>{{ message }}</div>`, SSR.options as never);
      expect(r.code).toContain('String(_ctx.message)');
    });

    it('v-pre：不编译插值（原文保留）', () => {
      const r = compile(`<div v-pre>{{ raw }}</div>`, SIGNAL_OPT.options as never);
      expect(r.code).toContain('{{ raw }}');
    });

    it('事件：@click="fn" 编译为 onClick / createEventHandler', () => {
      const r = compile(`<button @click="fn">x</button>`, SIGNAL_OPT.options as never);
      expect(r.code).toMatch(/onClick|cev|createEventHandler/i);
    });
  });
});
