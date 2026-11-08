// tests/ssr.test.ts
// SSR 编译模式测试：执行 ssrMode 产物，断言**渲染出的 HTML**（而非产物文本）

import { describe, it, expect } from 'vitest';
import { compile } from '../src/index';
import { asVNode, execute, executeSsr } from './support/execute';

const ssr = (template: string) => executeSsr(compile(template, { ssrMode: true }));

describe('SSR Compilation Mode', () => {
  describe('compile with ssrMode', () => {
    it('应该在 ssrMode 下产出自包含的 render(_ctx)：直接执行即得 HTML', () => {
      const render = ssr('<div>Hello</div>');
      // 单参签名：SSR 产物不接收 cache；不 import 任何 helper 也能运行
      expect(render.length).toBe(1);
      expect(render({})).toBe('<div>Hello</div>');
    });

    it('应该在 SSR 模式下保留静态文本', () => {
      expect(ssr('<div>Hello World</div>')({})).toBe('<div>Hello World</div>');
    });

    it('应该在 SSR 模式下对插值求值并转义', () => {
      const render = ssr('<div>{{ message }}</div>');
      expect(render({ message: 'M' })).toBe('<div>M</div>');
      expect(render({ message: '<b>' })).toBe('<div>&lt;b&gt;</div>');
    });

    it('应该在 SSR 模式下输出 v-bind 属性', () => {
      expect(ssr('<div :id="myId"></div>')({ myId: 'app' })).toBe('<div id="app"></div>');
    });

    it('应该在 SSR 模式下按条件渲染 v-if 分支', () => {
      const render = ssr('<div v-if="show">content</div>');
      expect(render({ show: true })).toBe('<div>content</div>');
      expect(render({ show: false })).toBe('');
    });

    it('应该在 SSR 模式下展开 v-for 列表', () => {
      const render = ssr('<li v-for="item in items">{{ item }}</li>');
      expect(render({ items: ['a', 'b'] })).toBe('<li>a</li><li>b</li>');
    });
  });

  describe('SSR 模式下跳过客户端事件绑定', () => {
    it('应该在 SSR 模式下跳过 v-on 指令', () => {
      const render = ssr('<div @click="handleClick">text</div>');
      // 产物若绑定事件，输出里会出现 onClick 属性或执行时会调用 handler
      const ctx = {
        handleClick: () => {
          throw new Error('SSR 渲染期不应调用事件处理器');
        },
      };
      expect(render(ctx)).toBe('<div>text</div>');
    });
  });

  describe('SSR 模式下的表单与显示', () => {
    it('v-model 在 SSR 下只输出 value，不产生组件约定属性', () => {
      const html = ssr('<input v-model="message">')({ message: 'M' });
      expect(html).toBe('<input value="M">');
      expect(html).not.toContain('modelValue');
    });

    it('v-show 在 SSR 下以内联样式生效（不生成客户端指令代码）', () => {
      const render = ssr('<div v-show="visible">content</div>');
      expect(render({ visible: true })).toBe('<div style="">content</div>');
      expect(render({ visible: false })).toBe('<div style="display:none">content</div>');
    });
  });

  describe('SSR 模式下保留 SSR 相关指令', () => {
    it('应该在 SSR 模式下保留 v-html（输出原始结构）', () => {
      expect(ssr('<div v-html="htmlContent"></div>')({ htmlContent: '<b>x</b>' })).toBe(
        '<div><b>x</b></div>',
      );
    });

    it('应该在 SSR 模式下保留 v-text（并转义）', () => {
      expect(ssr('<div v-text="textContent"></div>')({ textContent: '<i>' })).toBe(
        '<div>&lt;i&gt;</div>',
      );
    });
  });

  describe('SSR 模式下生成正确的 HTML 结构', () => {
    it('应该生成正确的开始和结束标签', () => {
      expect(ssr('<span>text</span>')({})).toBe('<span>text</span>');
    });

    it('应该处理自闭合标签', () => {
      // void 元素不得输出结束标签
      expect(ssr('<br>')({})).toBe('<br>');
    });

    it('应该处理嵌套元素', () => {
      expect(ssr('<div><span>nested</span></div>')({})).toBe('<div><span>nested</span></div>');
    });

    it('应该处理属性', () => {
      expect(ssr('<div id="app" class="container">text</div>')({})).toBe(
        '<div id="app" class="container">text</div>',
      );
    });
  });

  describe('SSR 与非 SSR 模式对比', () => {
    it('SSR 产出 HTML 字符串，客户端产出 VNode', () => {
      const template = '<div @click="handler">text</div>';
      const ctx = { handler: () => undefined };

      const ssrHtml = executeSsr(compile(template, { ssrMode: true }))(ctx);
      expect(typeof ssrHtml).toBe('string');
      expect(ssrHtml).toBe('<div>text</div>');

      const clientVNode = execute(compile(template))(ctx);
      expect(typeof clientVNode).toBe('object');
      expect(asVNode(clientVNode).type).toBe('div');
    });

    it('SSR 产物内嵌 renderToString/escapeHtml：无 import 也能执行', () => {
      // executeSsr 只注入 sanitizeHTML（执行方职责），其余全靠产物自带
      expect(ssr('<div>text</div>')({})).toBe('<div>text</div>');
    });
  });
});
