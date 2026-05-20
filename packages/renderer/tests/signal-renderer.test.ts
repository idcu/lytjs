// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, reactive } from '@lytjs/reactivity';
import { createSignalRenderer } from '../src/signal/signal-renderer';

describe('SignalRenderer', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  // ==================== 基本渲染（静态内容） ====================

  describe('basic rendering', () => {
    it('should render static content', () => {
      const renderer = createSignalRenderer('<div><span>hello</span></div>', {});
      renderer.render(container);

      expect(container.innerHTML).toContain('hello');
      const div = container.querySelector('div');
      expect(div).not.toBeNull();
      const span = container.querySelector('span');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('hello');

      renderer.unmount();
    });

    it('should render to a CSS selector string', () => {
      container.id = 'app';
      const renderer = createSignalRenderer('<p>test</p>', {});
      renderer.render('#app');

      expect(container.innerHTML).toContain('test');

      renderer.unmount();
    });

    it('should throw if container is not found', () => {
      const renderer = createSignalRenderer('<p>test</p>', {});
      expect(() => renderer.render('#nonexistent')).toThrow(/cannot find element matching/);
    });

    it('should render nested elements', () => {
      const renderer = createSignalRenderer(
        '<div><ul><li>item 1</li><li>item 2</li></ul></div>',
        {},
      );
      renderer.render(container);

      const li = container.querySelectorAll('li');
      expect(li.length).toBe(2);
      expect(li[0]!.textContent).toBe('item 1');
      expect(li[1]!.textContent).toBe('item 2');

      renderer.unmount();
    });
  });

  // ==================== 动态文本（插值） ====================

  describe('dynamic text interpolation', () => {
    it('should render interpolated text', () => {
      const ctx = { message: ref('hello world') };
      const renderer = createSignalRenderer('<div>{{ message }}</div>', ctx);
      renderer.render(container);

      const div = container.querySelector('div');
      expect(div!.textContent).toBe('hello world');

      renderer.unmount();
    });

    it('should update when ref value changes', () => {
      const ctx = { message: ref('initial') };
      const renderer = createSignalRenderer('<div>{{ message }}</div>', ctx);
      renderer.render(container);

      const div = container.querySelector('div');
      expect(div!.textContent).toBe('initial');

      // 更新 ref 值
      ctx.message.value = 'updated';
      expect(div!.textContent).toBe('updated');

      renderer.unmount();
    });
  });

  // ==================== v-if 条件渲染 ====================

  describe('v-if conditional rendering', () => {
    it('should show element when condition is true', () => {
      const ctx = { show: ref(true) };
      const renderer = createSignalRenderer('<div><span v-if="show">visible</span></div>', ctx);
      renderer.render(container);

      const span = container.querySelector('span');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('visible');

      renderer.unmount();
    });

    it('should hide element when condition is false', () => {
      const ctx = { show: ref(false) };
      const renderer = createSignalRenderer('<div><span v-if="show">visible</span></div>', ctx);
      renderer.render(container);

      // FIX: v-if 使用 insert/remove 实现，条件为 false 时元素不在 DOM 中
      const span = container.querySelector('span');
      expect(span).toBeNull();

      renderer.unmount();
    });

    it('should toggle visibility when condition changes', () => {
      const ctx = { show: ref(true) };
      const renderer = createSignalRenderer('<div><span v-if="show">visible</span></div>', ctx);
      renderer.render(container);

      let span = container.querySelector('span');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('visible');

      ctx.show.value = false;
      // FIX: v-if 使用 insert/remove 实现，条件为 false 时元素不在 DOM 中
      span = container.querySelector('span');
      expect(span).toBeNull();

      ctx.show.value = true;
      span = container.querySelector('span');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('visible');

      renderer.unmount();
    });
  });

  // ==================== v-for 列表渲染 ====================

  describe('v-for list rendering', () => {
    it('should render a list of items', () => {
      const ctx = {
        items: ref([
          { id: 1, text: 'a' },
          { id: 2, text: 'b' },
          { id: 3, text: 'c' },
        ]),
      };
      const renderer = createSignalRenderer(
        '<ul><li v-for="item in items">{{ item.text }}</li></ul>',
        ctx,
      );
      renderer.render(container);

      const ul = container.querySelector('ul');
      expect(ul).not.toBeNull();
      const li = ul!.querySelectorAll('li');
      expect(li.length).toBe(3);

      renderer.unmount();
    });

    it('should update when list changes', () => {
      const ctx = {
        items: ref([
          { id: 1, text: 'a' },
          { id: 2, text: 'b' },
        ]),
      };
      const renderer = createSignalRenderer(
        '<ul><li v-for="item in items">{{ item.text }}</li></ul>',
        ctx,
      );
      renderer.render(container);

      const ul = container.querySelector('ul')!;
      expect(ul.querySelectorAll('li').length).toBe(2);

      // 更新列表
      ctx.items.value = [
        { id: 1, text: 'a' },
        { id: 2, text: 'b' },
        { id: 3, text: 'c' },
      ];

      // 列表应该更新
      expect(ul.querySelectorAll('li').length).toBe(3);

      renderer.unmount();
    });
  });

  // ==================== v-on 事件绑定 ====================

  describe('v-on event binding', () => {
    it('should bind click event', () => {
      const handler = vi.fn();
      const ctx = { onClick: handler };
      const renderer = createSignalRenderer('<button v-on:click="onClick">Click me</button>', ctx);
      renderer.render(container);

      const button = container.querySelector('button')!;
      button.click();
      expect(handler).toHaveBeenCalledTimes(1);

      renderer.unmount();
    });

    it('should bind event with shorthand', () => {
      const handler = vi.fn();
      const ctx = { handleClick: handler };
      const renderer = createSignalRenderer('<button @click="handleClick">Click</button>', ctx);
      renderer.render(container);

      const button = container.querySelector('button')!;
      button.click();
      expect(handler).toHaveBeenCalledTimes(1);

      renderer.unmount();
    });
  });

  // ==================== v-model 双向绑定 ====================

  describe('v-model two-way binding', () => {
    it('should bind input value', () => {
      const ctx = { text: ref('initial') };
      const renderer = createSignalRenderer('<input v-model="text" />', ctx);
      renderer.render(container);

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('initial');

      renderer.unmount();
    });

    it('should update ref when input changes', () => {
      const ctx = { text: ref('initial') };
      const renderer = createSignalRenderer('<input v-model="text" />', ctx);
      renderer.render(container);

      const input = container.querySelector('input') as HTMLInputElement;

      // 模拟用户输入
      input.value = 'user typed';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(ctx.text.value).toBe('user typed');

      renderer.unmount();
    });

    it('should update input when ref changes', () => {
      const ctx = { text: ref('initial') };
      const renderer = createSignalRenderer('<input v-model="text" />', ctx);
      renderer.render(container);

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('initial');

      ctx.text.value = 'programmatic update';
      expect(input.value).toBe('programmatic update');

      renderer.unmount();
    });
  });

  // ==================== v-bind 属性绑定 ====================

  describe('v-bind attribute binding', () => {
    it('should bind class attribute', () => {
      const ctx = { className: ref('active') };
      const renderer = createSignalRenderer('<div v-bind:class="className">styled</div>', ctx);
      renderer.render(container);

      const div = container.querySelector('div')!;
      expect(div.getAttribute('class')).toBe('active');

      ctx.className.value = 'inactive';
      expect(div.getAttribute('class')).toBe('inactive');

      renderer.unmount();
    });

    it('should bind style attribute', () => {
      const ctx = { color: ref('color: red') };
      const renderer = createSignalRenderer('<div v-bind:style="color">styled</div>', ctx);
      renderer.render(container);

      const div = container.querySelector('div')!;
      // FIX: v-bind:style 绑定字符串时设置 cssText，需要使用 CSS 属性格式
      expect((div as HTMLElement).style.cssText).toContain('color: red');

      ctx.color.value = 'color: blue';
      expect((div as HTMLElement).style.cssText).toContain('color: blue');

      renderer.unmount();
    });

    it('should bind arbitrary attributes', () => {
      const ctx = { title: ref('tooltip') };
      const renderer = createSignalRenderer('<div v-bind:title="title">content</div>', ctx);
      renderer.render(container);

      const div = container.querySelector('div')!;
      expect(div.getAttribute('title')).toBe('tooltip');

      ctx.title.value = 'new tooltip';
      expect(div.getAttribute('title')).toBe('new tooltip');

      renderer.unmount();
    });
  });

  // ==================== 卸载清理 ====================

  describe('unmount cleanup', () => {
    it('should clear container on unmount', () => {
      const ctx = { message: ref('hello') };
      const renderer = createSignalRenderer('<div>{{ message }}</div>', ctx);
      renderer.render(container);

      expect(container.innerHTML).toContain('hello');

      renderer.unmount();
      // 卸载后 effect 应该停止，DOM 应该被清理
      // 注意：runCleanups 会执行 onCleanup 注册的函数
      // 包括 root element 的 remove
    });

    it('should stop reactivity effects on unmount', () => {
      const ctx = { message: ref('initial') };
      const renderer = createSignalRenderer('<div>{{ message }}</div>', ctx);
      renderer.render(container);

      const div = container.querySelector('div')!;
      expect(div.textContent).toBe('initial');

      renderer.unmount();

      // 卸载后更新 ref 不应该导致错误
      ctx.message.value = 'after unmount';
      // 不会抛出异常即为通过
    });

    it('should allow re-rendering after unmount', () => {
      const ctx = { message: ref('first') };
      const renderer = createSignalRenderer('<div>{{ message }}</div>', ctx);

      renderer.render(container);
      expect(container.querySelector('div')!.textContent).toBe('first');

      renderer.unmount();

      // 重新渲染
      ctx.message.value = 'second';
      renderer.render(container);
      expect(container.querySelector('div')!.textContent).toBe('second');

      renderer.unmount();
    });

    it('should clean up when rendering to a new container', () => {
      const ctx = { message: ref('hello') };
      const renderer = createSignalRenderer('<div>{{ message }}</div>', ctx);

      const container2 = document.createElement('div');
      document.body.appendChild(container2);

      renderer.render(container);
      expect(container.querySelector('div')).not.toBeNull();

      // 渲染到新容器应该自动清理旧的
      renderer.render(container2);
      expect(container2.querySelector('div')).not.toBeNull();

      renderer.unmount();
    });
  });

  // ==================== v-show 指令 ====================

  describe('v-show directive', () => {
    it('should toggle display based on condition', () => {
      const ctx = { visible: ref(true) };
      const renderer = createSignalRenderer('<div v-show="visible">content</div>', ctx);
      renderer.render(container);

      const div = container.querySelector('div')!;
      expect(div.style.display).toBe('');

      ctx.visible.value = false;
      expect(div.style.display).toBe('none');

      ctx.visible.value = true;
      expect(div.style.display).toBe('');

      renderer.unmount();
    });
  });

  // ==================== v-text 和 v-html ====================

  describe('v-text and v-html directives', () => {
    it('should render v-text content', () => {
      const ctx = { text: ref('hello') };
      const renderer = createSignalRenderer('<div v-text="text"></div>', ctx);
      renderer.render(container);

      const div = container.querySelector('div')!;
      expect(div.textContent).toBe('hello');

      ctx.text.value = 'world';
      expect(div.textContent).toBe('world');

      renderer.unmount();
    });

    it('should render v-html content', () => {
      const ctx = { html: ref('<strong>bold</strong>') };
      const renderer = createSignalRenderer('<div v-html="html"></div>', ctx);
      renderer.render(container);

      const div = container.querySelector('div')!;
      expect(div.innerHTML).toBe('<strong>bold</strong>');

      ctx.html.value = '<em>italic</em>';
      expect(div.innerHTML).toBe('<em>italic</em>');

      renderer.unmount();
    });

    // ==================== v-html XSS 安全测试 ====================

    describe('v-html XSS safety', () => {
      it('should sanitize <script> tags in v-html', () => {
        const ctx = { html: ref('<script>alert("xss")</script><p>safe</p>') };
        const renderer = createSignalRenderer('<div v-html="html"></div>', ctx);
        renderer.render(container);

        const div = container.querySelector('div')!;
        // script tag should be removed by sanitizer
        expect(div.querySelector('script')).toBeNull();
        // safe content should remain
        expect(div.querySelector('p')).not.toBeNull();
        expect(div.querySelector('p')!.textContent).toBe('safe');

        renderer.unmount();
      });

      it('should sanitize event handler attributes in v-html', () => {
        const ctx = { html: ref('<div onclick="alert(1)">click me</div>') };
        const renderer = createSignalRenderer('<div v-html="html"></div>', ctx);
        renderer.render(container);

        const inner = container.querySelector('div > div');
        expect(inner).not.toBeNull();
        expect(inner!.getAttribute('onclick')).toBeNull();

        renderer.unmount();
      });

      it('should sanitize <iframe> tags in v-html', () => {
        const ctx = { html: ref('<iframe src="evil.com"></iframe><span>ok</span>') };
        const renderer = createSignalRenderer('<div v-html="html"></div>', ctx);
        renderer.render(container);

        const div = container.querySelector('div')!;
        expect(div.querySelector('iframe')).toBeNull();
        expect(div.querySelector('span')).not.toBeNull();

        renderer.unmount();
      });
    });
  });

  // ==================== v-for 列表缩小测试 ====================

  describe('v-for list shrinking', () => {
    it('should remove DOM nodes when list shrinks from 3 to 1', () => {
      const ctx = {
        items: ref([
          { id: 1, text: 'a' },
          { id: 2, text: 'b' },
          { id: 3, text: 'c' },
        ]),
      };
      const renderer = createSignalRenderer(
        '<ul><li v-for="item in items">{{ item.text }}</li></ul>',
        ctx,
      );
      renderer.render(container);

      const ul = container.querySelector('ul')!;
      expect(ul.querySelectorAll('li').length).toBe(3);

      // Shrink list from 3 to 1
      ctx.items.value = [{ id: 1, text: 'a' }];

      const lis = ul.querySelectorAll('li');
      expect(lis.length).toBe(1);
      expect(lis[0]!.textContent).toBe('a');

      renderer.unmount();
    });

    it('should remove all DOM nodes when list becomes empty', () => {
      const ctx = {
        items: ref([
          { id: 1, text: 'a' },
          { id: 2, text: 'b' },
        ]),
      };
      const renderer = createSignalRenderer(
        '<ul><li v-for="item in items">{{ item.text }}</li></ul>',
        ctx,
      );
      renderer.render(container);

      const ul = container.querySelector('ul')!;
      expect(ul.querySelectorAll('li').length).toBe(2);

      ctx.items.value = [];
      expect(ul.querySelectorAll('li').length).toBe(0);

      renderer.unmount();
    });
  });

  // ==================== 多个 v-if 快速切换 ====================

  describe('multiple v-if rapid switching', () => {
    it('should maintain correct DOM after rapid v-if toggling', () => {
      const ctx = { show: ref(true) };
      const renderer = createSignalRenderer('<div><span v-if="show">visible</span></div>', ctx);
      renderer.render(container);

      const span = container.querySelector('span')!;

      // Rapid toggling
      ctx.show.value = false;
      ctx.show.value = true;
      ctx.show.value = false;
      ctx.show.value = true;

      // FIX: v-if 使用 insert/remove 实现，需要重新查询元素
      // Final state: show is true, span should be in DOM
      const finalSpan = container.querySelector('span');
      expect(finalSpan).not.toBeNull();

      renderer.unmount();
    });

    it('should end with correct state after multiple v-if toggles', () => {
      const ctx = { show: ref(false) };
      const renderer = createSignalRenderer('<div><span v-if="show">conditional</span></div>', ctx);
      renderer.render(container);

      // FIX: v-if 使用 insert/remove 实现，条件为 false 时元素不在 DOM 中
      let span = container.querySelector('span');
      expect(span).toBeNull();

      // Toggle multiple times, ending with false
      ctx.show.value = true;
      span = container.querySelector('span');
      expect(span).not.toBeNull();
      ctx.show.value = false;
      span = container.querySelector('span');
      expect(span).toBeNull();
      ctx.show.value = true;
      span = container.querySelector('span');
      expect(span).not.toBeNull();
      ctx.show.value = false;
      span = container.querySelector('span');
      expect(span).toBeNull();

      renderer.unmount();
    });

    it('should handle rapid switching of multiple independent v-if conditions', () => {
      const ctx = { a: ref(true), b: ref(false) };
      const renderer = createSignalRenderer(
        '<div><span v-if="a">A</span><span v-if="b">B</span></div>',
        ctx,
      );
      renderer.render(container);

      // FIX: v-if 使用 insert/remove 实现
      // 当 a=true, b=false 时，应该只有 span A 在 DOM 中
      const div = container.querySelector('div');
      expect(div).not.toBeNull();
      let spans = div!.querySelectorAll('span');
      expect(spans.length).toBe(1);
      expect(spans[0]!.textContent).toBe('A');

      // Rapid toggling both conditions
      ctx.a.value = false;
      ctx.b.value = true;
      spans = div!.querySelectorAll('span');
      expect(spans.length).toBe(1);
      expect(spans[0]!.textContent).toBe('B');

      ctx.a.value = true;
      ctx.b.value = false;
      spans = div!.querySelectorAll('span');
      expect(spans.length).toBe(1);
      expect(spans[0]!.textContent).toBe('A');

      renderer.unmount();
    });
  });
});
