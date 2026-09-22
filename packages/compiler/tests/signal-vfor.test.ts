/**
 * Signal/Vapor 模式 v-for 项生成测试
 *
 * 修复前实测产物：
 *   reconcileArray(_n, _c.items, { key:(item)=>item.id,
 *     create:(item)=>{ const _li=document.createElement('li'); return _li; } })
 * —— 列表项里的插值（`{{ item.name }}`）与绑定属性**完全没有生成**，
 * 因为优化版 codegen 只认「字符串子节点」和「裸 SIMPLE_EXPRESSION」两种形态，
 * 而插值在 AST 里是 JS_CALL_EXPRESSION(TO_DISPLAY_STRING)。
 */

import { describe, it, expect, vi } from 'vitest';
import { compile } from '../src/index';

const signal = (t: string) => compile(t, { rendererMode: 'signal' }).code;

describe('Signal 模式 - v-for 项内容', () => {
  it('插值应写入元素 textContent', () => {
    const code = signal('<ul><li v-for="item in items">{{ item.name }}</li></ul>');
    expect(code).toContain('textContent=item.name');
  });

  it('应生成 update 回调驱动响应式更新', () => {
    const code = signal('<ul><li v-for="item in items">{{ item.name }}</li></ul>');
    expect(code).toContain('update:(_el,item)=>');
    expect(code).toContain('_el.textContent=item.name');
  });

  it('静态文本子节点应写死', () => {
    const code = signal('<ul><li v-for="item in items">static</li></ul>');
    expect(code).toContain('textContent="static"');
  });

  it('动态属性应写入 create 与 update', () => {
    const code = signal(
      '<ul><li v-for="item in items" :title="item.title">{{ item.name }}</li></ul>',
    );
    expect(code).toContain('_li.setAttribute("title", item.title)');
    expect(code).toContain('_el.setAttribute("title", item.title)');
  });

  it('静态属性只写在 create 里', () => {
    const code = signal('<ul><li v-for="item in items" class="row">{{ item.name }}</li></ul>');
    expect(code).toContain('_li.setAttribute("class", "row")');
    expect(code).not.toContain('_el.setAttribute("class"');
  });

  it('用户 :key 应被采用（不再写死 item.id）', () => {
    const code = signal('<ul><li v-for="item in items" :key="item.uuid">{{ item.name }}</li></ul>');
    expect(code).toContain('key:(item)=>item.uuid');
    expect(code).not.toMatch(/key:\(item\)=>item\.id/);
  });

  it('不应再产出 item.item.name 这类错误路径', () => {
    expect(signal('<ul><li v-for="item in items">{{ item.name }}</li></ul>')).not.toContain(
      'item.item.name',
    );
  });
});

describe('Signal 模式 - 子组件（两版 codegen 均已支持挂载）', () => {
  it('应生成 mountComponent 调用（而不是把标签当 HTML 输出）', () => {
    const code = compile('<div><Child :title="t"/></div>', { rendererMode: 'signal' }).code;

    expect(code).toContain('mountComponent');
    expect(code).toContain('_c.Child');
    expect(code).toContain('"title":_c.t');
    // 不再出现字面量组件标签
    expect(code).not.toContain('<Child');
  });

  it('组件应被序列化为占位元素以保持结构位置', () => {
    const code = compile('<div><Child/></div>', { rendererMode: 'signal' }).code;
    // 占位必须是元素（不是注释）：注释不在 element.children 里会打乱下标
    expect(code).toContain('lyt-comp');
    expect(code).toContain('data-lyt-comp');
    expect(code).not.toContain('<Child');
  });

  it('静态属性应进入 props 对象', () => {
    const code = compile('<div><Child a="1"/></div>', { rendererMode: 'signal' }).code;
    expect(code).toContain('{"a":"1"}');
  });

  it('无值静态属性应写为 true', () => {
    const code = compile('<div><Child flag/></div>', { rendererMode: 'signal' }).code;
    expect(code).toContain('{"flag":true}');
  });

  it('v-bind 对象语法（无 arg）应被忽略而不是产出非法 props', () => {
    const code = compile('<div><Child v-bind="obj"/></div>', { rendererMode: 'signal' }).code;
    expect(code).toContain('mountComponent');
    expect(code).not.toContain('{undefined:');
  });

  it('事件指令应编译为 onXxx prop（供组件 emit 回查）', () => {
    const code = compile('<div><Child @click="onClick"/></div>', { rendererMode: 'signal' }).code;
    expect(code).toContain('mountComponent');
    expect(code).toContain('"onClick":_c.onClick');
  });

  it('kebab-case 事件名应 camelize 为 onXxx', () => {
    const code = compile('<div><Child @my-event="fn"/></div>', { rendererMode: 'signal' }).code;
    expect(code).toContain('"onMyEvent":_c.fn');
  });

  it('非优化版（optimizeSignal:false）同样支持组件挂载，不再误报告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const code = compile('<div><Child/></div>', {
      rendererMode: 'signal',
      optimizeSignal: false,
    }).code;

    // 非优化版此前会把组件标签当普通 HTML 输出，现已与优化版对齐
    expect(code).toContain('mountComponent');
    expect(code).toContain('_ctx.Child');
    // 不再输出"暂不支持子组件"的误导性告警
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('暂不支持子组件'));
    warn.mockRestore();
  });

  it('组件子内容应编译为默认插槽（vnode 形态，短别名）', () => {
    const code = compile('<div><Child>hello</Child></div>', { rendererMode: 'signal' }).code;
    expect(code).toContain('{default:()=>[V(T,null,"hello")]}');
    expect(code).toContain("from'@lytjs/vdom'");
  });

  it('无子内容的组件不应带插槽参数', () => {
    const code = compile('<div><Child/></div>', { rendererMode: 'signal' }).code;
    expect(code).not.toContain('@lytjs/vdom');
    expect(code).not.toContain('default:');
  });

  it('插槽内插值应编译为动态文本 vnode', () => {
    const code = compile('<div><Child>{{ msg }}</Child></div>', { rendererMode: 'signal' }).code;
    expect(code).toContain('{default:()=>[V(T,null,_c.msg)]}');
  });

  it('插槽内元素的绑定与事件应进入 vnode props', () => {
    const bind = compile('<div><Child><span :title="t">x</span></Child></div>', {
      rendererMode: 'signal',
    }).code;
    expect(bind).toContain('V("span",{"title":_c.t}');

    const on = compile('<div><Child><span @click="fn">x</span></Child></div>', {
      rendererMode: 'signal',
    }).code;
    expect(on).toContain('V("span",{"onClick":_c.fn}');
  });

  it('插槽内 v-if 应编译为条件 vnode', () => {
    const code = compile('<div><Child><span v-if="ok">x</span></Child></div>', {
      rendererMode: 'signal',
    }).code;
    expect(code).toContain('(_c.ok?V("span",null,[V(T,null,"x")]):null)');
  });

  it('插槽内 v-else 应编译为三元另支', () => {
    const code = compile(
      '<div><Child><span v-if="ok">a</span><span v-else>b</span></Child></div>',
      {
        rendererMode: 'signal',
      },
    ).code;
    expect(code).toContain(':V("span",null,[V(T,null,"b")])');
  });

  it('插槽内 v-else-if 链应编译为嵌套三元', () => {
    const code = compile(
      '<div><Child><span v-if="a">x</span><span v-else-if="b">y</span><span v-else>z</span></Child></div>',
      { rendererMode: 'signal' },
    ).code;
    expect(code).toContain('(_c.b?V("span",null,[V(T,null,"y")])');
    expect(code).toContain(':V("span",null,[V(T,null,"z")])');
  });

  it('插槽内 v-if 内容含 v-for 时整体跳过', () => {
    const code = compile(
      '<div><Child><span v-if="ok"><i v-for="x in xs">y</i></span></Child></div>',
      {
        rendererMode: 'signal',
      },
    ).code;
    expect(code).not.toContain('default:');
  });

  it('插槽内 v-if 空内容应生成 null children', () => {
    const code = compile('<div><Child><span v-if="ok"></span></Child></div>', {
      rendererMode: 'signal',
    }).code;
    expect(code).toContain('(_c.ok?V("span",null,null):null)');
  });

  it('插槽内 v-show 应编译为 style.display 绑定', () => {
    const code = compile('<div><Child><i v-show="s">y</i></Child></div>', {
      rendererMode: 'signal',
    }).code;
    expect(code).toContain("style:{\"display\":(_c.s?'':'none')}");
  });

  it('插槽内 v-for 应编译为 map 展开（短别名）', () => {
    const code = compile(
      '<div><Child><li v-for="item in items">{{ item.name }}</li></Child></div>',
      {
        rendererMode: 'signal',
      },
    ).code;
    expect(code).toContain('...(_c.items.map((item)=>V("li",null,[V(T,null,item.name)])))');
  });

  it('插槽内 v-for 的循环变量不应被加前缀', () => {
    const code = compile(
      '<div><Child><li v-for="(item, i) in items" :key="item.id">{{ item.name }}</li></Child></div>',
      { rendererMode: 'signal' },
    ).code;
    expect(code).toContain('{"key":item.id}');
    expect(code).not.toContain('_c.item.');
  });

  it('VNode 模式组件标签应前缀化', () => {
    const code = compile('<div><Child/></div>').code;
    expect(code).toContain('_ctx.Child');
  });
});
