/**
 * 不变量：**生成的代码里不得出现未被引用的提升声明**
 *
 * ## 背景（2026-11-03 修）
 *
 * `ast.hoists` 是静态提升表，但「提升引用」不一定真的被写进 render 正文。
 * 此前 codegen 是「表里有几条就输出几条」，于是 `<div><span>a</span><p>{{x}}</p></div>`
 * 的产物变成：
 *
 *   const _hoisted_1 = createElementVNode("span", null, "a")   ← 声明了
 *   return (openBlock(), createBlock("div", null, [
 *     createElementVNode("span", null, "a"),                    ← 又造了一遍
 *     (openBlock(), createBlock("p", null, toDisplayString(_ctx.x), 1))
 *   ]))
 *
 * `_hoisted_1` **从未被引用** ⇒ 模块级死代码：多一次 vnode 分配、多一行噪音，
 * 还会让人误以为「静态提升生效了」。
 *
 * ## 本测试锁什么
 *
 * 对一批模板逐一编译，断言：
 *   ① 每个 `const _hoisted_N` 都必须在**其余代码**中被引用；
 *   ② 混合内容（静态 + 动态）的模板**不应产生任何提升声明**；
 *   ③ 全静态模板仍应正常提升（不能为了消除死代码把优化也删掉）。
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

/** 取出所有提升声明的名字，并检查它们是否被正文引用 */
function findUnusedHoists(code: string): string[] {
  const declared = [...code.matchAll(/const (_hoisted_\d+)\s*=/g)].map((m) => m[1]);
  const unused: string[] = [];
  for (const name of declared) {
    // 去掉该声明自身所在的那一行，再看剩下的代码里有没有引用
    const withoutDecl = code
      .split('\n')
      .filter((line) => !line.includes(`const ${name} =`))
      .join('\n');
    if (!new RegExp(`\\b${name}\\b`).test(withoutDecl)) unused.push(name);
  }
  return unused;
}

const TEMPLATES: Array<[string, string]> = [
  ['全静态单元素', `<div class="own">inner</div>`],
  ['全静态多元素', `<div><span>a</span><span>b</span></div>`],
  ['静态 + 插值（混合）', `<div><span>a</span><p>{{x}}</p></div>`],
  ['静态 + 事件（混合）', `<div><span>a</span><button @click="f">b</button></div>`],
  ['静态 + v-if（混合）', `<div><span>a</span><p v-if="on">y</p></div>`],
  ['静态 + v-for（混合）', `<div><span>a</span><ul><li v-for="x in list">{{x}}</li></ul></div>`],
  ['深层静态子树 + 动态兄弟', `<div><section><span>a</span><i>b</i></section><p>{{x}}</p></div>`],
  ['纯动态', `<div>{{x}}</div>`],
  ['文本插值 + 静态文本', `<div>hello {{x}}</div>`],
  ['带属性的静态子树 + 动态兄弟', `<div><span class="s" id="i">a</span><em>{{x}}</em></div>`],
];

describe('codegen · 提升声明不得是死代码', () => {
  for (const [name, template] of TEMPLATES) {
    it(`${name}：没有未被引用的提升声明`, () => {
      const { code } = compile(template);
      expect(findUnusedHoists(code)).toEqual([]);
    });
  }

  it('混合内容模板不应产生任何提升声明', () => {
    const { code } = compile(`<div><span>a</span><p>{{x}}</p></div>`);
    expect(code).not.toMatch(/const _hoisted_\d+\s*=/);
  });

  it('全静态模板仍应正常提升（不能把优化一起删掉）', () => {
    const { code } = compile(`<div class="own">inner</div>`);
    expect(code).toMatch(/const _hoisted_1\s*=/);
    expect(code).toMatch(/return _hoisted_1/);
  });

  it('全静态多元素模板仍应正常提升', () => {
    const { code } = compile(`<div><span>a</span><span>b</span></div>`);
    expect(code).toMatch(/const _hoisted_1\s*=/);
    expect(code).toMatch(/return _hoisted_1/);
  });
});
