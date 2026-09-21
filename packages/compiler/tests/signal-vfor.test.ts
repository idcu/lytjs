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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compile } from '../src/index';
import { resetVaporComponentWarnings } from '../src/codegen-signal';

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

describe('Signal 模式 - 子组件（已知限制需显式告警）', () => {
  beforeEach(() => resetVaporComponentWarnings());

  it('遇到组件标签应给出一次性告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    compile('<div><Child :title="t"/></div>', { rendererMode: 'signal' });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('暂不支持子组件'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Child'));
    warn.mockRestore();
  });

  it('普通元素不应触发该告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    compile('<div><span>hi</span></div>', { rendererMode: 'signal' });

    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('暂不支持子组件'));
    warn.mockRestore();
  });

  it('VNode 模式不受该限制影响', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const code = compile('<div><Child/></div>').code;

    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('暂不支持子组件'));
    expect(code).toContain('_ctx.Child');
    warn.mockRestore();
  });
});
