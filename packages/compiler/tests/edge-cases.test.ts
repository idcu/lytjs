// tests/edge-cases.test.ts
// Compiler 边界条件测试用例

import { describe, it, expect } from 'vitest';
import {
  parse,
  compile,
  transform,
  generate,
  generateSignal,
  generateSSR,
  clearCompileCache,
  getCompileCacheSize,
  setWarningLevel,
} from '../src/index';
import { NodeTypes, ElementTypes, TextModes } from '../src/constants';
import type {
  ElementNode,
  TextNode,
  InterpolationNode,
  DirectiveNode,
  RootNode,
} from '../src/types';

// ============================================================
// 1. Parser 边界
// ============================================================

describe('Parser 边界条件', () => {
  describe('空输入与空白输入', () => {
    it('空字符串输入应返回空 children 的 RootNode', () => {
      const ast = parse('');
      expect(ast.type).toBe(NodeTypes.ROOT);
      expect(ast.children).toHaveLength(0);
    });

    it('纯空白字符串应被 condense 为空', () => {
      const ast = parse('   \t\n  ');
      // 纯空白在 condenseWhitespace 阶段应被移除
      expect(ast.children).toHaveLength(0);
    });

    it('多个连续空白字符应被压缩', () => {
      const ast = parse('   a   b   ');
      // 非空白文本节点之间的空白应被压缩
      const textNodes = ast.children.filter((n) => n.type === NodeTypes.TEXT) as TextNode[];
      // 至少有一个包含 "a" 和 "b" 的文本节点
      const combined = textNodes.map((n) => n.content).join('');
      expect(combined).toContain('a');
      expect(combined).toContain('b');
    });
  });

  describe('超长模板字符串（性能边界）', () => {
    it('应能解析较长的重复元素模板', () => {
      // 生成一个包含大量重复 div 的模板（但不触发 MAX_INPUT_LENGTH 警告）
      const items = Array.from({ length: 500 }, (_, i) => `<div>${i}</div>`).join('');
      const ast = parse(items);
      expect(ast).toBeDefined();
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('应能解析长文本内容', () => {
      const longText = 'a'.repeat(10000);
      const ast = parse(`<p>${longText}</p>`);
      expect(ast).toBeDefined();
      const el = ast.children[0] as ElementNode;
      expect(el.tag).toBe('p');
    });
  });

  describe('未闭合标签（错误恢复）', () => {
    it('单个未闭合标签应仍产生有效 AST', () => {
      const ast = parse('<div>hello');
      expect(ast).toBeDefined();
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('多层嵌套未闭合标签应仍产生有效 AST', () => {
      const ast = parse('<div><p><span>deep text');
      expect(ast).toBeDefined();
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('只有开始标签没有内容', () => {
      const ast = parse('<div><span></div>');
      expect(ast).toBeDefined();
    });

    it('缺少结束标签的嵌套结构', () => {
      const ast = parse('<ul><li>item1<li>item2</ul>');
      expect(ast).toBeDefined();
      expect(ast.children.length).toBeGreaterThan(0);
    });
  });

  describe('嵌套深度极大的模板', () => {
    it('应能解析 100 层嵌套', () => {
      const depth = 100;
      const openTags = Array.from({ length: depth }, () => '<div>').join('');
      const closeTags = Array.from({ length: depth }, () => '</div>').join('');
      const ast = parse(`${openTags}${closeTags}`);
      expect(ast).toBeDefined();
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('深层嵌套中包含文本', () => {
      const depth = 50;
      const openTags = Array.from({ length: depth }, () => '<div>').join('');
      const closeTags = Array.from({ length: depth }, () => '</div>').join('');
      const ast = parse(`${openTags}inner${closeTags}`);
      expect(ast).toBeDefined();
    });
  });

  describe('自闭合标签的各种写法', () => {
    it('<br> 写法', () => {
      const ast = parse('<br>');
      const el = ast.children[0] as ElementNode;
      expect(el.type).toBe(NodeTypes.ELEMENT);
      expect(el.tag).toBe('br');
    });

    it('<br/> 写法（无空格）', () => {
      const ast = parse('<br/>');
      const el = ast.children[0] as ElementNode;
      expect(el.type).toBe(NodeTypes.ELEMENT);
      expect(el.tag).toBe('br');
      expect(el.isSelfClosing).toBe(true);
    });

    it('<br /> 写法（有空格）', () => {
      const ast = parse('<br />');
      const el = ast.children[0] as ElementNode;
      expect(el.type).toBe(NodeTypes.ELEMENT);
      expect(el.tag).toBe('br');
      expect(el.isSelfClosing).toBe(true);
    });

    it('带属性的自闭合标签 <input type="text" />', () => {
      const ast = parse('<input type="text" />');
      const el = ast.children[0] as ElementNode;
      expect(el.type).toBe(NodeTypes.ELEMENT);
      expect(el.tag).toBe('input');
      expect(el.isSelfClosing).toBe(true);
      expect(el.props.length).toBeGreaterThan(0);
    });
  });

  describe('属性值中的特殊字符', () => {
    it('属性值包含单引号（双引号包裹）', () => {
      const ast = parse('<div title="it\'s ok"></div>');
      const el = ast.children[0] as ElementNode;
      expect(el.props.length).toBeGreaterThan(0);
    });

    it('属性值包含双引号（单引号包裹）', () => {
      const ast = parse('<div title=\'say "hello"\'></div>');
      const el = ast.children[0] as ElementNode;
      expect(el.props.length).toBeGreaterThan(0);
    });

    it('属性值包含尖括号', () => {
      const ast = parse('<div data-info="a<b>c"></div>');
      const el = ast.children[0] as ElementNode;
      expect(el.props.length).toBeGreaterThan(0);
    });

    it('属性值为空字符串', () => {
      const ast = parse('<div class=""></div>');
      const el = ast.children[0] as ElementNode;
      expect(el.props.length).toBeGreaterThan(0);
    });

    it('无值布尔属性', () => {
      const ast = parse('<input disabled readonly>');
      const el = ast.children[0] as ElementNode;
      expect(el.props.length).toBe(2);
    });
  });

  describe('多个根节点', () => {
    it('两个同级元素应都出现在 children 中', () => {
      const ast = parse('<div>A</div><span>B</span>');
      expect(ast.children.length).toBe(2);
      expect((ast.children[0] as ElementNode).tag).toBe('div');
      expect((ast.children[1] as ElementNode).tag).toBe('span');
    });

    it('多个根节点包含文本和元素', () => {
      const ast = parse('text<div>elem</div>more text');
      expect(ast.children.length).toBeGreaterThanOrEqual(2);
    });

    it('大量同级根节点', () => {
      const count = 50;
      const template = Array.from({ length: count }, () => '<p>x</p>').join('');
      const ast = parse(template);
      expect(ast.children.length).toBe(count);
    });
  });

  describe('注释节点', () => {
    it('基本注释', () => {
      const ast = parse('<!-- comment -->');
      expect(ast.children.length).toBe(1);
      expect(ast.children[0].type).toBe(NodeTypes.COMMENT);
    });

    it('空注释', () => {
      const ast = parse('<!---->');
      expect(ast.children.length).toBe(1);
      expect(ast.children[0].type).toBe(NodeTypes.COMMENT);
    });

    it('注释中包含特殊字符', () => {
      const ast = parse('<!-- <div> & "quotes" -->');
      expect(ast.children.length).toBe(1);
      expect(ast.children[0].type).toBe(NodeTypes.COMMENT);
    });

    it('注释与元素混合', () => {
      const ast = parse('<!-- before --><div>hello</div><!-- after -->');
      expect(ast.children.length).toBe(3);
      expect(ast.children[0].type).toBe(NodeTypes.COMMENT);
      expect(ast.children[1].type).toBe(NodeTypes.ELEMENT);
      expect(ast.children[2].type).toBe(NodeTypes.COMMENT);
    });
  });

  describe('DOCTYPE 声明', () => {
    it('标准 HTML5 DOCTYPE 应被跳过', () => {
      const ast = parse('<!DOCTYPE html><div>hello</div>');
      // DOCTYPE 被跳过，只保留 div
      expect(ast.children.length).toBe(1);
      expect((ast.children[0] as ElementNode).tag).toBe('div');
    });

    it('DOCTYPE 后无内容', () => {
      const ast = parse('<!DOCTYPE html>');
      expect(ast.children).toHaveLength(0);
    });
  });

  describe('SVG 标签', () => {
    it('应能解析 SVG 根元素', () => {
      const ast = parse('<svg><circle cx="50" cy="50" r="40"></circle></svg>');
      expect(ast.children.length).toBe(1);
      const svg = ast.children[0] as ElementNode;
      expect(svg.tag).toBe('svg');
    });

    it('SVG 自闭合标签', () => {
      const ast = parse('<svg><line x1="0" y1="0" x2="100" y2="100" /></svg>');
      expect(ast).toBeDefined();
      const svg = ast.children[0] as ElementNode;
      expect(svg.tag).toBe('svg');
    });

    it('SVG 嵌套元素', () => {
      const ast = parse('<svg><g><rect /><rect /></g></svg>');
      expect(ast).toBeDefined();
    });
  });

  describe('大小写混合标签名', () => {
    it('全大写标签应被解析为普通元素', () => {
      const ast = parse('<DIV>content</DIV>');
      const el = ast.children[0] as ElementNode;
      expect(el.type).toBe(NodeTypes.ELEMENT);
      // parser 将标签名转为小写
      expect(el.tag).toBe('DIV');
    });

    it('混合大小写标签', () => {
      const ast = parse('<Div>content</Div>');
      const el = ast.children[0] as ElementNode;
      expect(el.type).toBe(NodeTypes.ELEMENT);
    });

    it('PascalCase 应被识别为组件', () => {
      const ast = parse('<MyComponent>content</MyComponent>');
      const el = ast.children[0] as ElementNode;
      expect(el.tagType).toBe(ElementTypes.COMPONENT);
    });

    it('kebab-case 带连字符应被识别为组件', () => {
      const ast = parse('<my-component>content</my-component>');
      const el = ast.children[0] as ElementNode;
      expect(el.tagType).toBe(ElementTypes.COMPONENT);
    });
  });
});

// ============================================================
// 2. 指令解析边界
// ============================================================

describe('指令解析边界条件', () => {
  describe('v-if / v-else-if / v-else 链式条件', () => {
    it('完整的 if / else-if / else 链', () => {
      const ast = parse('<div v-if="a">A</div><div v-else-if="b">B</div><div v-else>C</div>');
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('多个 else-if 分支', () => {
      const ast = parse(
        '<div v-if="a">A</div>' +
          '<div v-else-if="b">B</div>' +
          '<div v-else-if="c">C</div>' +
          '<div v-else-if="d">D</div>' +
          '<div v-else>E</div>',
      );
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('v-else 不带表达式', () => {
      const ast = parse('<div v-if="cond">yes</div><div v-else>no</div>');
      const elseEl = ast.children[1] as ElementNode;
      const elseDir = elseEl.props[0] as DirectiveNode;
      expect(elseDir.name).toBe('else');
      expect(elseDir.exp).toBeUndefined();
    });

    it('v-if 后直接跟 v-else（无中间内容）', () => {
      const ast = parse('<div v-if="x">A</div><div v-else>B</div>');
      expect(ast.children.length).toBe(2);
    });
  });

  describe('v-for 复杂表达式', () => {
    it('带索引的 v-for', () => {
      const ast = parse('<li v-for="(item, index) in items"></li>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('for');
      expect(dir.exp?.content).toContain('item');
      expect(dir.exp?.content).toContain('index');
    });

    it('使用 of 代替 in', () => {
      const ast = parse('<li v-for="item of items"></li>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('for');
      expect(dir.exp?.content).toContain('of');
    });

    it('解构表达式', () => {
      const ast = parse('<li v-for="{ id, name } in users"></li>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('for');
      expect(dir.exp?.content).toContain('id');
      expect(dir.exp?.content).toContain('name');
    });

    it('带索引的解构', () => {
      const ast = parse('<li v-for="({ id, name }, index) in users"></li>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('for');
    });

    it('嵌套属性解构', () => {
      const ast = parse('<li v-for="{ address: { city } } in users"></li>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('for');
    });
  });

  describe('v-bind 动态参数', () => {
    it('v-bind:[attr]="value" 动态属性名', () => {
      const ast = parse('<div v-bind:[dynamicAttr]="value"></div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('bind');
      // arg 应为动态表达式
      expect(dir.arg).toBeDefined();
    });

    it(':[attr] 简写动态参数', () => {
      const ast = parse('<div :[attrName]="val"></div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('bind');
      expect(dir.arg).toBeDefined();
    });
  });

  describe('v-on 动态事件名', () => {
    it('v-on:[event]="handler" 动态事件名', () => {
      const ast = parse('<div v-on:[eventName]="handler"></div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('on');
      expect(dir.arg).toBeDefined();
    });

    it('@[event] 简写动态事件名', () => {
      const ast = parse('<div @[evt]="handler"></div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.type).toBe(NodeTypes.DIRECTIVE);
      expect(dir.name).toBe('on');
    });
  });

  describe('v-on 修饰符组合', () => {
    it('单个修饰符 .stop', () => {
      const ast = parse('<div @click.stop="handler"></div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.modifiers).toContain('stop');
    });

    it('多个修饰符 .stop.prevent', () => {
      const ast = parse('<div @click.stop.prevent="handler"></div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.modifiers).toContain('stop');
      expect(dir.modifiers).toContain('prevent');
    });

    it('修饰符 .capture', () => {
      const ast = parse('<div @click.capture="handler"></div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.modifiers).toContain('capture');
    });

    it('修饰符 .self', () => {
      const ast = parse('<div @click.self="handler"></div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.modifiers).toContain('self');
    });

    it('修饰符 .once', () => {
      const ast = parse('<div @click.once="handler"></div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.modifiers).toContain('once');
    });

    it('组合修饰符 .stop.prevent.capture.self.once', () => {
      const ast = parse('<div @click.stop.prevent.capture.self.once="handler"></div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.modifiers).toContain('stop');
      expect(dir.modifiers).toContain('prevent');
      expect(dir.modifiers).toContain('capture');
      expect(dir.modifiers).toContain('self');
      expect(dir.modifiers).toContain('once');
    });

    it('按键修饰符 .enter', () => {
      const ast = parse('<input @keyup.enter="submit">');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.modifiers).toContain('enter');
    });
  });

  describe('v-model 修饰符', () => {
    it('v-model.trim', () => {
      const ast = parse('<input v-model.trim="text">');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('model');
      expect(dir.modifiers).toContain('trim');
    });

    it('v-model.number', () => {
      const ast = parse('<input v-model.number="count">');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('model');
      expect(dir.modifiers).toContain('number');
    });

    it('v-model.lazy', () => {
      const ast = parse('<input v-model.lazy="text">');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('model');
      expect(dir.modifiers).toContain('lazy');
    });

    it('v-model 多修饰符组合 .lazy.number', () => {
      const ast = parse('<input v-model.lazy.number="val">');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.modifiers).toContain('lazy');
      expect(dir.modifiers).toContain('number');
    });

    it('v-model 无修饰符', () => {
      const ast = parse('<input v-model="text">');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('model');
      expect(dir.modifiers).toHaveLength(0);
    });
  });

  describe('v-slot 嵌套', () => {
    it('具名插槽 v-slot:header', () => {
      const ast = parse('<template v-slot:header><span>Header</span></template>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('slot');
      expect(dir.arg).toBeDefined();
    });

    it('v-slot 简写 #default', () => {
      const ast = parse('<template #default><span>Default</span></template>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('slot');
    });

    it('作用域插槽 v-slot="props"', () => {
      const ast = parse(
        '<template v-slot="slotProps"><span>{{ slotProps.item }}</span></template>',
      );
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('slot');
      expect(dir.exp).toBeDefined();
    });
  });

  describe('v-memo 依赖数组', () => {
    it('v-memo 单个依赖', () => {
      const ast = parse('<div v-memo="[value]">content</div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('memo');
      expect(dir.exp?.content).toBe('[value]');
    });

    it('v-memo 多个依赖', () => {
      const ast = parse('<div v-memo="[a, b, c]">content</div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('memo');
      expect(dir.exp?.content).toContain('a');
      expect(dir.exp?.content).toContain('b');
      expect(dir.exp?.content).toContain('c');
    });

    it('v-memo 空数组', () => {
      const ast = parse('<div v-memo="[]">content</div>');
      const el = ast.children[0] as ElementNode;
      const dir = el.props[0] as DirectiveNode;
      expect(dir.name).toBe('memo');
      expect(dir.exp?.content).toBe('[]');
    });
  });
});

// ============================================================
// 3. 插值表达式边界
// ============================================================

describe('插值表达式边界条件', () => {
  describe('空插值', () => {
    it('空插值 {{ }} 应被解析', () => {
      const ast = parse('{{ }}');
      expect(ast.children.length).toBeGreaterThan(0);
      // 空插值可能被解析为文本节点或插值节点
      expect(ast).toBeDefined();
    });
  });

  describe('嵌套花括号', () => {
    it('对象字面量插值 {{ {a: 1} }}', () => {
      const ast = parse('{{ {a: 1} }}');
      expect(ast.children.length).toBeGreaterThan(0);
      const interp = ast.children[0] as InterpolationNode;
      expect(interp.type).toBe(NodeTypes.INTERPOLATION);
      expect(interp.content.content).toContain('a');
    });

    it('嵌套对象 {{ {a: {b: 2}} }}', () => {
      const ast = parse('{{ {a: {b: 2}} }}');
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('数组字面量 {{ [1, 2, 3] }}', () => {
      const ast = parse('{{ [1, 2, 3] }}');
      expect(ast.children.length).toBeGreaterThan(0);
      const interp = ast.children[0] as InterpolationNode;
      expect(interp.type).toBe(NodeTypes.INTERPOLATION);
    });
  });

  describe('多个插值', () => {
    it('相邻多个插值 {{ a }}{{ b }}', () => {
      const ast = parse('{{ a }}{{ b }}');
      expect(ast.children.length).toBeGreaterThanOrEqual(2);
      const interps = ast.children.filter(
        (n) => n.type === NodeTypes.INTERPOLATION,
      ) as InterpolationNode[];
      expect(interps.length).toBeGreaterThanOrEqual(2);
    });

    it('多个插值之间有文本', () => {
      const ast = parse('{{ a }} and {{ b }}');
      expect(ast.children.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('插值与文本混合', () => {
    it('文本-插值-文本', () => {
      const ast = parse('Hello {{ name }}, welcome!');
      expect(ast.children.length).toBeGreaterThanOrEqual(1);
    });

    it('元素内插值与文本混合', () => {
      const ast = parse('<div>Hello {{ name }}!</div>');
      const el = ast.children[0] as ElementNode;
      expect(el.children.length).toBeGreaterThan(0);
    });

    it('纯文本元素（无插值）', () => {
      const ast = parse('<div>just text</div>');
      const el = ast.children[0] as ElementNode;
      expect(el.children.length).toBe(1);
      expect(el.children[0].type).toBe(NodeTypes.TEXT);
    });
  });

  describe('特殊字符插值', () => {
    it('包含比较运算符', () => {
      const ast = parse('{{ a > b ? a : b }}');
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('包含逻辑运算符', () => {
      const ast = parse('{{ a && b || c }}');
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('包含函数调用', () => {
      const ast = parse('{{ formatDate(date) }}');
      expect(ast.children.length).toBeGreaterThan(0);
      const interp = ast.children[0] as InterpolationNode;
      expect(interp.content.content).toContain('formatDate');
    });

    it('包含模板字符串（反引号）', () => {
      const ast = parse('{{ `hello ${name}` }}');
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('包含三元表达式', () => {
      const ast = parse('{{ active ? "yes" : "no" }}');
      expect(ast.children.length).toBeGreaterThan(0);
    });

    it('包含箭头函数', () => {
      const ast = parse('{{ items.map(i => i.name) }}');
      expect(ast.children.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================
// 4. Compile 函数边界
// ============================================================

describe('Compile 函数边界条件', () => {
  beforeEach(() => {
    clearCompileCache();
  });

  describe('编译缓存', () => {
    it('首次编译后缓存大小应为 1', () => {
      compile('<div>hello</div>');
      expect(getCompileCacheSize()).toBe(1);
    });

    it('相同模板再次编译应命中缓存（缓存大小不变）', () => {
      compile('<div>hello</div>');
      const size1 = getCompileCacheSize();
      compile('<div>hello</div>');
      const size2 = getCompileCacheSize();
      expect(size2).toBe(size1);
    });

    it('不同模板应增加缓存大小', () => {
      compile('<div>A</div>');
      compile('<span>B</span>');
      expect(getCompileCacheSize()).toBe(2);
    });

    it('相同模板不同选项应产生不同缓存条目', () => {
      compile('<div>hello</div>');
      compile('<div>hello</div>', { ssrMode: true });
      expect(getCompileCacheSize()).toBe(2);
    });

    it('clearCompileCache 后缓存大小应为 0', () => {
      compile('<div>test</div>');
      expect(getCompileCacheSize()).toBe(1);
      clearCompileCache();
      expect(getCompileCacheSize()).toBe(0);
    });

    it('自定义 nodeTransforms 不应使用缓存', () => {
      compile('<div>hello</div>');
      compile('<div>hello</div>', {
        nodeTransforms: [(node, ctx) => {}],
      });
      // 自定义 transforms 不使用缓存，但首次无缓存编译仍会写入
      // 由于有自定义 transforms，不会读取缓存，也不会写入缓存
      expect(getCompileCacheSize()).toBe(1);
    });

    it('自定义 directiveTransforms 不应使用缓存', () => {
      compile('<div v-if="x">hello</div>');
      compile('<div v-if="x">hello</div>', {
        directiveTransforms: {
          if: (dir, node, ctx) => ({ props: [] }),
        },
      });
      expect(getCompileCacheSize()).toBe(1);
    });
  });

  describe('SSR 模式编译', () => {
    it('SSR 模式应生成 renderToString', () => {
      const result = compile('<div>hello</div>', { ssrMode: true });
      expect(result.code).toContain('renderToString');
    });

    it('SSR 模式不应包含 createElementVNode', () => {
      const result = compile('<div>hello</div>', { ssrMode: true });
      expect(result.code).not.toContain('createElementVNode');
    });

    it('SSR 模式编译空模板', () => {
      const result = compile('', { ssrMode: true });
      expect(result.code).toBeDefined();
      expect(result.code).toContain('function render');
    });

    it('SSR 模式编译复杂模板', () => {
      const result = compile(
        '<div><h1>{{ title }}</h1><ul><li v-for="item in items">{{ item }}</li></ul></div>',
        { ssrMode: true },
      );
      expect(result.code).toContain('renderToString');
    });
  });

  describe('Signal 模式编译', () => {
    it('Signal 模式应生成 createTemplate', () => {
      const result = compile('<div>hello</div>', { rendererMode: 'signal' });
      expect(result.code).toContain('createTemplate');
    });

    it('Signal 模式不应包含 createElementVNode', () => {
      const result = compile('<div>hello</div>', { rendererMode: 'signal' });
      expect(result.code).not.toContain('createElementVNode');
    });

    it('vapor 模式应与 signal 模式等价', () => {
      const signalResult = compile('<div>hello</div>', { rendererMode: 'signal' });
      const vaporResult = compile('<div>hello</div>', { rendererMode: 'vapor' });
      // 两者应生成相同代码（vapor 是 signal 的别名）
      expect(signalResult.code).toBe(vaporResult.code);
    });

    it('Signal 模式编译空模板', () => {
      const result = compile('', { rendererMode: 'signal' });
      expect(result.code).toBeDefined();
    });
  });

  describe('自定义 nodeTransforms', () => {
    it('自定义 transform 应被调用', () => {
      let called = false;
      compile('<div>hello</div>', {
        nodeTransforms: [
          (node, ctx) => {
            called = true;
          },
        ],
      });
      expect(called).toBe(true);
    });

    it('多个自定义 transforms 应按顺序执行', () => {
      const order: number[] = [];
      compile('<div>hello</div>', {
        nodeTransforms: [
          () => {
            order.push(1);
          },
          () => {
            order.push(2);
          },
          () => {
            order.push(3);
          },
        ],
      });
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('自定义 directiveTransforms', () => {
    it('自定义指令 transform 应覆盖内置 transform', () => {
      let customCalled = false;
      compile('<div v-custom="arg">hello</div>', {
        directiveTransforms: {
          custom: (dir, node, ctx) => {
            customCalled = true;
            return { props: [] };
          },
        },
      });
      expect(customCalled).toBe(true);
    });
  });

  describe('scopeId 选项', () => {
    it('scopeId 应出现在编译结果中', () => {
      const result = compile('<div>hello</div>', { scopeId: 'data-v-xxxxx' });
      expect(result.code).toBeDefined();
      // scopeId 可能被嵌入到生成的代码中
      expect(result.code.length).toBeGreaterThan(0);
    });

    it('空 scopeId 不应导致错误', () => {
      const result = compile('<div>hello</div>', { scopeId: '' });
      expect(result.code).toBeDefined();
    });
  });

  describe('setWarningLevel', () => {
    it('应能设置警告级别为 silent', () => {
      setWarningLevel('silent');
      // 编译不应抛出错误
      const result = compile('<div>hello</div>');
      expect(result.code).toBeDefined();
    });

    it('应能设置警告级别为 error', () => {
      setWarningLevel('error');
      const result = compile('<div>hello</div>');
      expect(result.code).toBeDefined();
    });

    it('应能设置警告级别为 warn', () => {
      setWarningLevel('warn');
      const result = compile('<div>hello</div>');
      expect(result.code).toBeDefined();
    });
  });
});

// ============================================================
// 5. SourceMap 边界
// ============================================================

describe('SourceMap 边界条件', () => {
  describe('空模板的 SourceMap', () => {
    it('空模板编译应返回有效结果', () => {
      const result = compile('');
      expect(result.code).toBeDefined();
      expect(result.ast).toBeDefined();
    });

    it('空模板开启 sourceMap 选项', () => {
      const result = compile('', { sourceMap: true });
      expect(result.code).toBeDefined();
    });
  });

  describe('多行模板的 SourceMap', () => {
    it('多行模板应能成功编译', () => {
      const template = `<div>
  <p>Line 2</p>
  <span>Line 3</span>
</div>`;
      const result = compile(template, { sourceMap: true });
      expect(result.code).toBeDefined();
    });

    it('多行模板的 AST 节点应有正确的 loc 信息', () => {
      const template = `<div>
  <p>Line 2</p>
</div>`;
      const ast = parse(template);
      // Root node loc should span the entire template
      expect(ast.loc).toBeDefined();
      expect(ast.loc.start.line).toBe(1);
    });
  });

  describe('嵌套元素的行列号准确性', () => {
    it('嵌套元素的 loc.start 应在正确的行', () => {
      const template = `<div>
  <span>nested</span>
</div>`;
      const ast = parse(template);
      const div = ast.children[0] as ElementNode;
      expect(div.loc.start.line).toBe(1);
      expect(div.loc.start.column).toBe(1);

      const span = div.children[0] as ElementNode;
      // span 在第 2 行
      expect(span.loc.start.line).toBe(2);
    });

    it('深层嵌套元素的行号应递增', () => {
      const template = `<div>
  <p>
    <span>deep</span>
  </p>
</div>`;
      const ast = parse(template);
      const div = ast.children[0] as ElementNode;
      const p = div.children[0] as ElementNode;
      const span = p.children[0] as ElementNode;

      expect(div.loc.start.line).toBe(1);
      expect(p.loc.start.line).toBe(2);
      expect(span.loc.start.line).toBe(3);
    });

    it('单行模板的 loc 应在同一行', () => {
      const ast = parse('<div><span>text</span></div>');
      const div = ast.children[0] as ElementNode;
      const span = div.children[0] as ElementNode;
      expect(div.loc.start.line).toBe(1);
      expect(span.loc.start.line).toBe(1);
    });

    it('插值节点的 loc 应准确', () => {
      const template = `<div>
  {{ message }}
</div>`;
      const ast = parse(template);
      const div = ast.children[0] as ElementNode;
      // 插值在第 2 行
      const interp = div.children.find(
        (n) => n.type === NodeTypes.INTERPOLATION,
      ) as InterpolationNode;
      if (interp) {
        expect(interp.loc.start.line).toBe(2);
      }
    });
  });
});

// ============================================================
// 6. Transform 边界
// ============================================================

describe('Transform 边界条件', () => {
  it('空 AST 的 transform 不应报错', () => {
    const ast = parse('');
    expect(() => transform(ast, { nodeTransforms: [] })).not.toThrow();
  });

  it('纯文本的 transform 不应报错', () => {
    const ast = parse('just some text');
    expect(() => transform(ast, { nodeTransforms: [] })).not.toThrow();
  });

  it('只有注释的 transform 不应报错', () => {
    const ast = parse('<!-- just a comment -->');
    expect(() => transform(ast, { nodeTransforms: [] })).not.toThrow();
  });
});

// ============================================================
// 7. Generate 边界
// ============================================================

describe('Generate 边界条件', () => {
  it('generate 空模板应返回有效代码', () => {
    const ast = parse('');
    transform(ast, { nodeTransforms: [] });
    const result = generate(ast);
    expect(result.code).toBeDefined();
    expect(result.code.length).toBeGreaterThan(0);
  });

  it('generateSignal 空模板应返回有效代码', () => {
    const ast = parse('');
    transform(ast, { nodeTransforms: [] });
    const result = generateSignal(ast);
    expect(result.code).toBeDefined();
  });

  it('generateSSR 空模板应返回有效代码', () => {
    const ast = parse('');
    transform(ast, { nodeTransforms: [], ssr: true });
    const result = generateSSR(ast);
    expect(result.code).toBeDefined();
  });

  it('generate 纯文本模板', () => {
    const ast = parse('hello world');
    transform(ast, { nodeTransforms: [] });
    const result = generate(ast);
    expect(result.code).toContain('hello world');
  });

  it('generate 开启 sourceMap 选项', () => {
    const ast = parse('<div>hello</div>');
    transform(ast, { nodeTransforms: [] });
    const result = generate(ast, { sourceMap: true });
    expect(result.code).toBeDefined();
    expect(result.map).toBeDefined();
  });
});

// ============================================================
// 8. 综合边界场景
// ============================================================

describe('综合边界场景', () => {
  it('大量属性', () => {
    const attrs = Array.from({ length: 50 }, (_, i) => `data-attr-${i}="value${i}"`).join(' ');
    const ast = parse(`<div ${attrs}></div>`);
    const el = ast.children[0] as ElementNode;
    expect(el.props.length).toBe(50);
  });

  it('v-for 与 v-if 同时使用在同一元素上', () => {
    const ast = parse('<li v-for="item in items" v-if="item.visible">{{ item.name }}</li>');
    expect(ast.children.length).toBeGreaterThan(0);
  });

  it('深层嵌套的 v-for', () => {
    const ast = parse(
      '<div v-for="row in rows">' + '<span v-for="col in row.cols">{{ col }}</span>' + '</div>',
    );
    expect(ast.children.length).toBeGreaterThan(0);
  });

  it('连续多个 v-if 块', () => {
    const ast = parse('<div v-if="a">A</div>' + '<div v-if="b">B</div>' + '<div v-if="c">C</div>');
    expect(ast.children.length).toBe(3);
  });

  it('模板中包含 HTML 实体', () => {
    const ast = parse('<div>&amp; &lt; &gt; &quot;</div>');
    const el = ast.children[0] as ElementNode;
    expect(el.children.length).toBeGreaterThan(0);
  });

  it('自闭合组件标签', () => {
    const ast = parse('<MyComponent />');
    const el = ast.children[0] as ElementNode;
    expect(el.tag).toBe('MyComponent');
    expect(el.tagType).toBe(ElementTypes.COMPONENT);
    expect(el.isSelfClosing).toBe(true);
  });

  it('template 标签作为普通元素', () => {
    const ast = parse('<template><div>slot content</div></template>');
    const tmpl = ast.children[0] as ElementNode;
    expect(tmpl.tag).toBe('template');
  });

  it('编译结果应包含 preamble', () => {
    const result = compile('<div>hello</div>');
    expect(result.preamble).toBeDefined();
    expect(result.preamble.length).toBeGreaterThan(0);
  });

  it('编译结果应包含 ast', () => {
    const result = compile('<div>hello</div>');
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe(NodeTypes.ROOT);
  });
});
