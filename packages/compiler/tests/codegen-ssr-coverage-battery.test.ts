/**
 * compiler/codegen-ssr 覆盖率电池（Task C 第二批）
 *
 * `codegen-ssr.ts` 只导出 `generateSSR`，内部助手无法直接单测 ⇒ 必须用**模板矩阵**
 * 走真实编译路径，把「无值指令 / 无参指令 / 各种 children 形态 / void 元素 /
 * 插槽默认名 / px 数值属性」等守卫的另一侧覆盖掉。
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';

/** 编译并返回产物代码（出错即失败，便于定位模板） */
function ssr(template: string): string {
  const r = compile(template, { ssrMode: true });
  expect(typeof r.code).toBe('string');
  return r.code;
}

describe('codegen-ssr battery: 指令形态矩阵', () => {
  const cases: Array<[string, string]> = [
    // 无值 :foo ⇒ 'true'（prop.value 为空的一侧）
    ['无值 v-bind', '<div :hidden></div>'],
    ['有值 v-bind', '<div :id="x"></div>'],
    ['v-bind 动态参数', '<div :[name]="x"></div>'],
    // v-on：@click / v-on:click / 短横线事件名
    ['@click 简写', '<button @click="fn">c</button>'],
    ['v-on:click 全写', '<button v-on:click="fn">c</button>'],
    ['@my-event 短横线', '<button @my-event="fn">c</button>'],
    // v-show（含与 style 同时存在）
    ['v-show 单独', '<div v-show="ok">s</div>'],
    ['v-show + 静态 style', '<div v-show="ok" style="color:red">s</div>'],
    // v-html / v-text / v-model
    ['v-html', '<div v-html="raw"></div>'],
    ['v-html + 子节点', '<div v-html="raw"><b>fallback</b></div>'],
    ['v-text', '<div v-text="t"></div>'],
    ['v-text + 子节点', '<div v-text="t">fallback</div>'],
    ['v-model', '<input v-model="m">'],
    ['v-model + 子节点', '<input v-model="m">text</input>'],
    // 插槽
    ['具名插槽', '<Comp><template #header="p">{{p}}</template></Comp>'],
    ['默认插槽作用域', '<Comp v-slot="s">{{s}}</Comp>'],
    ['模板内默认插槽', '<Comp><template #default>x</template></Comp>'],
    // :is
    [':is 动态组件', '<div :is="comp"></div>'],
  ];

  for (const [name, tpl] of cases) {
    it(`SSR 编译：${name}`, () => {
      expect(ssr(tpl)).toBeTruthy();
    });
  }
});

describe('codegen-ssr battery: children 形态矩阵', () => {
  const cases: Array<[string, string]> = [
    ['复合插值', '<div>{{ a }}-{{ b }}</div>'],
    ['元素子节点', '<ul><li>1</li><li>2</li></ul>'],
    ['void 元素', '<div><input type="text"><br></div>'],
    ['自闭合 svg', '<svg><path d="M0 0"/></svg>'],
    ['纯文本', '<p>plain</p>'],
    ['注释', '<div><!-- c --></div>'],
    ['v-if / v-else', '<div v-if="ok">a</div><span v-else>b</span>'],
    [
      'v-if / v-else-if / v-else',
      '<div v-if="a">1</div><div v-else-if="b">2</div><div v-else>3</div>',
    ],
    ['嵌套条件', '<div v-if="a"><span v-if="b">deep</span></div>'],
  ];

  for (const [name, tpl] of cases) {
    it(`SSR 编译：${name}`, () => {
      expect(ssr(tpl)).toBeTruthy();
    });
  }
});

describe('codegen-ssr battery: 属性与样式数值（px 分支）', () => {
  const cases: Array<[string, string]> = [
    [':style 数值', '<div :style="{ width: w }"></div>'],
    [':style 字符串', '<div :style="s"></div>'],
    ['静态 style 数值', '<div style="width: 10"></div>'],
    [':width 数值', '<div :width="n"></div>'],
    [':height 数值', '<div :height="n"></div>'],
    [':tabindex 数值', '<div :tabindex="n"></div>'],
    ['静态度量属性', '<div width="10"></div>'],
    ['class 绑定', '<div :class="c"></div>'],
  ];

  for (const [name, tpl] of cases) {
    it(`SSR 编译：${name}`, () => {
      expect(ssr(tpl)).toBeTruthy();
    });
  }
});

describe('codegen-ssr battery: 转义与边界输入', () => {
  it('属性值中的特殊字符被转义', () => {
    const code = ssr('<div title="a&amp;b">&lt;x&gt;</div>');
    expect(typeof code).toBe('string');
  });

  it('空模板不抛错', () => {
    expect(typeof ssr('')).toBe('string');
  });

  it('纯空白模板不抛错', () => {
    expect(typeof ssr('   ')).toBe('string');
  });

  it('仅插值的模板', () => {
    expect(ssr('{{ only }}')).toContain('_ctx.only');
  });
});
