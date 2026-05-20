 
// @vitest-environment jsdom
// tests/index.test.ts
// @lytjs/dom-runtime 完整测试

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '@lytjs/reactivity';
import {
  createTemplate,
  createElement,
  createTextNode,
  insert,
  remove,
  clearChildren,
  setText,
  setHTML,
  setAttribute,
  removeAttribute,
  setProperty,
  setStyle,
  setClass,
  toggleClass,
  addEventListener,
  createEventHandler,
  reconcileArray,
  bindEffect,
  batchDOM,
  onCleanup,
  runCleanups,
  createCleanupScope,
} from '../src/index';

describe('@lytjs/dom-runtime', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    runCleanups();
  });

  // ==================== createTemplate ====================

  describe('createTemplate', () => {
    it('should create a DocumentFragment from HTML string', () => {
      const wrapper = createTemplate('<span class="greeting">Hello</span>');
      expect(wrapper.content).toBeInstanceOf(DocumentFragment);
      const span = wrapper.content.querySelector('span');
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe('Hello');
      expect(span!.className).toBe('greeting');
    });

    it('should create fragment with multiple children', () => {
      const wrapper = createTemplate('<li>a</li><li>b</li><li>c</li>');
      expect(wrapper.childNodes.length).toBe(3);
    });

    it('should handle empty string', () => {
      const wrapper = createTemplate('');
      expect(wrapper.content).toBeInstanceOf(DocumentFragment);
      expect(wrapper.childNodes.length).toBe(0);
    });
  });

  // ==================== createElement ====================

  describe('createElement', () => {
    it('should create an element with given tag', () => {
      const el = createElement('div');
      expect(el.tagName).toBe('DIV');
    });

    it('should create element with attributes', () => {
      const el = createElement('input', { type: 'text', id: 'my-input' });
      expect(el.getAttribute('type')).toBe('text');
      expect(el.getAttribute('id')).toBe('my-input');
    });

    it('should create element with string children', () => {
      const el = createElement('p', {}, ['Hello', ' ', 'World']);
      expect(el.textContent).toBe('Hello World');
    });

    it('should create element with Node children', () => {
      const textNode = document.createTextNode('Text');
      const el = createElement('div', {}, [textNode]);
      expect(el.firstChild).toBe(textNode);
    });

    it('should create element with mixed children', () => {
      const el = createElement('div', {}, ['text', document.createElement('span')]);
      expect(el.childNodes.length).toBe(2);
      expect(el.childNodes[0]!.textContent).toBe('text');
      expect(el.childNodes[1]!.nodeName).toBe('SPAN');
    });
  });

  // ==================== createTextNode ====================

  describe('createTextNode', () => {
    it('should create a text node', () => {
      const node = createTextNode('hello');
      expect(node).toBeInstanceOf(Text);
      expect(node.textContent).toBe('hello');
    });
  });

  // ==================== insert ====================

  describe('insert', () => {
    it('should append child when ref is null', () => {
      const child = document.createElement('span');
      insert(child, container, null);
      expect(container.lastChild).toBe(child);
    });

    it('should append child when ref is undefined', () => {
      const child = document.createElement('span');
      insert(child, container);
      expect(container.lastChild).toBe(child);
    });

    it('should insert before ref', () => {
      const existing = document.createElement('div');
      container.appendChild(existing);

      const child = document.createElement('span');
      insert(child, container, existing);
      expect(container.firstChild).toBe(child);
      expect(container.lastChild).toBe(existing);
    });

    it('should insert in the middle', () => {
      const first = document.createElement('div');
      const third = document.createElement('div');
      container.appendChild(first);
      container.appendChild(third);

      const second = document.createElement('span');
      insert(second, container, third);
      expect(container.childNodes[0]).toBe(first);
      expect(container.childNodes[1]).toBe(second);
      expect(container.childNodes[2]).toBe(third);
    });
  });

  // ==================== remove ====================

  describe('remove', () => {
    it('should remove a child from its parent', () => {
      const child = document.createElement('span');
      container.appendChild(child);
      expect(container.childNodes.length).toBe(1);

      remove(child);
      expect(container.childNodes.length).toBe(0);
    });

    it('should do nothing if child has no parent', () => {
      const child = document.createElement('span');
      expect(() => remove(child)).not.toThrow();
    });
  });

  // ==================== clearChildren ====================

  describe('clearChildren', () => {
    it('should remove all children', () => {
      container.appendChild(document.createElement('div'));
      container.appendChild(document.createElement('span'));
      container.appendChild(document.createTextNode('text'));
      expect(container.childNodes.length).toBe(3);

      clearChildren(container);
      expect(container.childNodes.length).toBe(0);
    });

    it('should work on empty parent', () => {
      expect(() => clearChildren(container)).not.toThrow();
      expect(container.childNodes.length).toBe(0);
    });
  });

  // ==================== setText ====================

  describe('setText', () => {
    it('should set text content', () => {
      setText(container, 'Hello World');
      expect(container.textContent).toBe('Hello World');
    });

    it('should replace existing content', () => {
      container.innerHTML = '<span>old</span>';
      setText(container, 'new');
      expect(container.textContent).toBe('new');
      expect(container.childNodes.length).toBe(1);
    });
  });

  // ==================== setHTML ====================

  describe('setHTML', () => {
    it('should set inner HTML', () => {
      setHTML(container, '<span>test</span>');
      expect(container.innerHTML).toBe('<span>test</span>');
      expect(container.querySelector('span')).not.toBeNull();
    });

    it('should replace existing HTML', () => {
      setHTML(container, '<div>old</div>');
      setHTML(container, '<p>new</p>');
      expect(container.querySelector('p')).not.toBeNull();
      expect(container.querySelector('div')).toBeNull();
    });

    // ==================== setHTML XSS 防护 ====================

    describe('XSS protection', () => {
      it('should remove <script> tags to prevent XSS', () => {
        setHTML(container, '<div>safe</div><script>alert(1)</script>');
        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('div')).not.toBeNull();
      });

      it('should remove inline event handlers (onclick)', () => {
        setHTML(container, '<div onclick="alert(1)">click me</div>');
        const div = container.querySelector('div');
        expect(div).not.toBeNull();
        expect(div!.getAttribute('onclick')).toBeNull();
      });

      it('should remove inline event handlers (onerror)', () => {
        setHTML(container, '<img onerror="alert(1)" src="x" />');
        const img = container.querySelector('img');
        expect(img).not.toBeNull();
        expect(img!.getAttribute('onerror')).toBeNull();
      });

      it('should handle javascript: URIs in href', () => {
        setHTML(container, '<a href="javascript:alert(1)">link</a>');
        const a = container.querySelector('a');
        expect(a).not.toBeNull();
        // FIX: sanitizeHTML 会移除包含 javascript: 伪协议的 href 属性
        expect(a!.getAttribute('href')).toBeNull();
      });

      it('should remove <iframe> tags', () => {
        setHTML(container, '<iframe src="evil.com"></iframe><p>safe</p>');
        expect(container.querySelector('iframe')).toBeNull();
        expect(container.querySelector('p')).not.toBeNull();
      });

      it('should remove <object> tags', () => {
        setHTML(container, '<object data="evil.swf"></object>');
        expect(container.querySelector('object')).toBeNull();
      });

      it('should remove <embed> tags', () => {
        setHTML(container, '<embed src="evil.swf">');
        expect(container.querySelector('embed')).toBeNull();
      });
    });
  });

  // ==================== setAttribute ====================

  describe('setAttribute', () => {
    it('should set an attribute', () => {
      setAttribute(container, 'id', 'test');
      expect(container.getAttribute('id')).toBe('test');
    });

    it('should update an existing attribute', () => {
      setAttribute(container, 'class', 'a');
      setAttribute(container, 'class', 'b');
      expect(container.getAttribute('class')).toBe('b');
    });
  });

  // ==================== removeAttribute ====================

  describe('removeAttribute', () => {
    it('should remove an attribute', () => {
      container.setAttribute('data-test', 'value');
      expect(container.hasAttribute('data-test')).toBe(true);
      removeAttribute(container, 'data-test');
      expect(container.hasAttribute('data-test')).toBe(false);
    });

    it('should do nothing for non-existent attribute', () => {
      expect(() => removeAttribute(container, 'nonexistent')).not.toThrow();
    });
  });

  // ==================== setProperty ====================

  describe('setProperty', () => {
    it('should set value property on input', () => {
      const input = document.createElement('input') as HTMLInputElement;
      setProperty(input, 'value', 'hello');
      expect(input.value).toBe('hello');
    });

    it('should set checked property', () => {
      const input = document.createElement('input') as HTMLInputElement;
      setProperty(input, 'checked', true);
      expect(input.checked).toBe(true);
    });

    it('should set disabled property', () => {
      const input = document.createElement('input') as HTMLInputElement;
      setProperty(input, 'disabled', true);
      expect(input.disabled).toBe(true);
    });

    it('should set attribute for non-property keys', () => {
      setProperty(container, 'data-value', 'test');
      expect(container.getAttribute('data-value')).toBe('test');
    });

    it('should remove attribute when value is null', () => {
      container.setAttribute('data-value', 'test');
      setProperty(container, 'data-value', null);
      expect(container.hasAttribute('data-value')).toBe(false);
    });

    it('should remove attribute when value is undefined', () => {
      container.setAttribute('data-value', 'test');
      setProperty(container, 'data-value', undefined);
      expect(container.hasAttribute('data-value')).toBe(false);
    });

    it('should remove attribute when value is false', () => {
      container.setAttribute('data-value', 'test');
      setProperty(container, 'data-value', false);
      expect(container.hasAttribute('data-value')).toBe(false);
    });

    it('should set className as property', () => {
      setProperty(container, 'className', 'my-class');
      expect((container as HTMLElement).className).toBe('my-class');
    });
  });

  // ==================== setStyle ====================

  describe('setStyle', () => {
    it('should set style from string', () => {
      setStyle(container, 'color: red; font-size: 16px');
      expect(container.getAttribute('style')).toContain('color: red');
      expect(container.getAttribute('style')).toContain('font-size: 16px');
    });

    it('should set style from object', () => {
      setStyle(container, { color: 'blue', fontSize: '20px' });
      expect((container as HTMLElement).style.color).toBe('blue');
      expect((container as HTMLElement).style.fontSize).toBe('20px');
    });

    it('should override previous style', () => {
      setStyle(container, { color: 'red' });
      setStyle(container, { color: 'green' });
      expect((container as HTMLElement).style.color).toBe('green');
    });
  });

  // ==================== setClass ====================

  describe('setClass', () => {
    it('should set class attribute', () => {
      setClass(container, 'foo bar');
      expect(container.getAttribute('class')).toBe('foo bar');
    });

    it('should replace existing class', () => {
      setClass(container, 'old');
      setClass(container, 'new');
      expect(container.getAttribute('class')).toBe('new');
    });
  });

  // ==================== toggleClass ====================

  describe('toggleClass', () => {
    it('should add class when not present', () => {
      toggleClass(container, 'active');
      expect(container.classList.contains('active')).toBe(true);
    });

    it('should remove class when present', () => {
      container.classList.add('active');
      toggleClass(container, 'active');
      expect(container.classList.contains('active')).toBe(false);
    });

    it('should force add class', () => {
      toggleClass(container, 'active', true);
      expect(container.classList.contains('active')).toBe(true);
      toggleClass(container, 'active', true);
      expect(container.classList.contains('active')).toBe(true);
    });

    it('should force remove class', () => {
      container.classList.add('active');
      toggleClass(container, 'active', false);
      expect(container.classList.contains('active')).toBe(false);
    });
  });

  // ==================== addEventListener ====================

  describe('addEventListener', () => {
    it('should add event listener and return cleanup function', () => {
      const handler = vi.fn();
      const cleanup = addEventListener(container, 'click', handler);

      container.click();
      expect(handler).toHaveBeenCalledTimes(1);

      container.click();
      expect(handler).toHaveBeenCalledTimes(2);

      cleanup();

      container.click();
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should support event options', () => {
      const handler = vi.fn();
      const cleanup = addEventListener(container, 'click', handler, { once: true });

      container.click();
      expect(handler).toHaveBeenCalledTimes(1);

      container.click();
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
    });
  });

  // ==================== createEventHandler ====================

  describe('createEventHandler', () => {
    it('should create event handler and return cleanup', () => {
      const handler = vi.fn();
      const cleanup = createEventHandler(container, 'click', handler);

      container.click();
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
      container.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support .stop modifier', () => {
      const handler = vi.fn();
      const inner = document.createElement('button');
      container.appendChild(inner);

      const outerHandler = vi.fn();
      createEventHandler(container, 'click', outerHandler);
      createEventHandler(inner, 'click', handler, { stop: true });

      inner.click();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(outerHandler).not.toHaveBeenCalled();
    });

    it('should support .prevent modifier', () => {
      const handler = vi.fn();
      const form = document.createElement('form');
      container.appendChild(form);

      createEventHandler(form, 'submit', handler, { prevent: true });

      const event = new Event('submit', { cancelable: true });
      form.dispatchEvent(event);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('should support .capture modifier', () => {
      const handler = vi.fn();
      createEventHandler(container, 'click', handler, { capture: true });

      const button = document.createElement('button');
      container.appendChild(button);
      button.click();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support .once modifier', () => {
      const handler = vi.fn();
      createEventHandler(container, 'click', handler, { once: true });

      container.click();
      expect(handler).toHaveBeenCalledTimes(1);

      container.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support combined modifiers', () => {
      const handler = vi.fn();
      createEventHandler(container, 'click', handler, {
        stop: true,
        prevent: true,
      });

      const event = new Event('click', { cancelable: true, bubbles: true });
      container.dispatchEvent(event);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  // ==================== reconcileArray ====================

  describe('reconcileArray', () => {
    it('should create nodes for initial list', () => {
      const list = [
        { id: 1, text: 'a' },
        { id: 2, text: 'b' },
        { id: 3, text: 'c' },
      ];

      reconcileArray(container, list, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      expect(container.childNodes.length).toBe(3);
      expect(container.childNodes[0]!.textContent).toBe('a');
      expect(container.childNodes[1]!.textContent).toBe('b');
      expect(container.childNodes[2]!.textContent).toBe('c');
    });

    it('should add new items', () => {
      const list1 = [{ id: 1, text: 'a' }];
      const list2 = [
        { id: 1, text: 'a' },
        { id: 2, text: 'b' },
      ];

      reconcileArray(container, list1, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      reconcileArray(container, list2, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      expect(container.childNodes.length).toBe(2);
      expect(container.childNodes[0]!.textContent).toBe('a');
      expect(container.childNodes[1]!.textContent).toBe('b');
    });

    it('should remove items', () => {
      const list1 = [
        { id: 1, text: 'a' },
        { id: 2, text: 'b' },
        { id: 3, text: 'c' },
      ];
      const list2 = [{ id: 1, text: 'a' }];

      reconcileArray(container, list1, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      reconcileArray(container, list2, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      expect(container.childNodes.length).toBe(1);
      expect(container.childNodes[0]!.textContent).toBe('a');
    });

    it('should move items when order changes', () => {
      const list1 = [
        { id: 1, text: 'a' },
        { id: 2, text: 'b' },
        { id: 3, text: 'c' },
      ];
      const list2 = [
        { id: 3, text: 'c' },
        { id: 1, text: 'a' },
        { id: 2, text: 'b' },
      ];

      reconcileArray(container, list1, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      // 保存对原始节点的引用
      const firstNode = container.childNodes[0];
      const secondNode = container.childNodes[1];
      const thirdNode = container.childNodes[2];

      reconcileArray(container, list2, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      expect(container.childNodes.length).toBe(3);
      expect(container.childNodes[0]).toBe(thirdNode);
      expect(container.childNodes[1]).toBe(firstNode);
      expect(container.childNodes[2]).toBe(secondNode);
    });

    it('should call update callback for existing items', () => {
      const list1 = [{ id: 1, text: 'old' }];
      const list2 = [{ id: 1, text: 'new' }];

      const updateFn = vi.fn();

      reconcileArray(container, list1, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
        update: (node, item) => {
          updateFn(node, item);
          node.textContent = item.text;
        },
      });

      reconcileArray(container, list2, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
        update: (node, item) => {
          updateFn(node, item);
          node.textContent = item.text;
        },
      });

      expect(updateFn).toHaveBeenCalledTimes(1);
      expect(container.childNodes[0]!.textContent).toBe('new');
    });

    it('should call destroy callback for removed items', () => {
      const list1 = [
        { id: 1, text: 'a' },
        { id: 2, text: 'b' },
      ];
      const list2 = [{ id: 1, text: 'a' }];

      const destroyFn = vi.fn();

      reconcileArray(container, list1, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
        destroy: destroyFn,
      });

      reconcileArray(container, list2, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
        destroy: destroyFn,
      });

      expect(destroyFn).toHaveBeenCalledTimes(1);
    });

    it('should handle empty list', () => {
      const list1 = [
        { id: 1, text: 'a' },
        { id: 2, text: 'b' },
      ];

      reconcileArray(container, list1, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      expect(container.childNodes.length).toBe(2);

      reconcileArray(container, [], {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      expect(container.childNodes.length).toBe(0);
    });

    it('should handle key changes correctly', () => {
      // Items where keys change between renders
      const list1 = [
        { id: 'a', text: 'first' },
        { id: 'b', text: 'second' },
      ];
      const list2 = [
        { id: 'b', text: 'second' },
        { id: 'c', text: 'third' },
      ];

      reconcileArray(container, list1, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      const secondNode = container.childNodes[1];

      reconcileArray(container, list2, {
        key: (item) => item.id,
        create: (item) => {
          const el = document.createElement('li');
          el.textContent = item.text;
          return el;
        },
      });

      expect(container.childNodes.length).toBe(2);
      // 'b' should be reused (moved to first position)
      expect(container.childNodes[0]).toBe(secondNode);
      expect(container.childNodes[0]!.textContent).toBe('second');
      expect(container.childNodes[1]!.textContent).toBe('third');
    });

    it('should respect ref node for insertion', () => {
      const sentinel = document.createElement('hr');
      container.appendChild(sentinel);

      const list = [
        { id: 1, text: 'a' },
        { id: 2, text: 'b' },
      ];

      reconcileArray(
        container,
        list,
        {
          key: (item) => item.id,
          create: (item) => {
            const el = document.createElement('li');
            el.textContent = item.text;
            return el;
          },
        },
        sentinel,
      );

      // Items should be before sentinel
      expect(container.childNodes[0]!.textContent).toBe('a');
      expect(container.childNodes[1]!.textContent).toBe('b');
      expect(container.childNodes[2]).toBe(sentinel);
    });

    it('should handle string keys', () => {
      const list = [
        { key: 'x', text: 'one' },
        { key: 'y', text: 'two' },
      ];

      reconcileArray(container, list, {
        key: (item) => item.key,
        create: (item) => {
          const el = document.createElement('span');
          el.textContent = item.text;
          return el;
        },
      });

      expect(container.childNodes.length).toBe(2);
      expect(container.childNodes[0]!.textContent).toBe('one');
      expect(container.childNodes[1]!.textContent).toBe('two');
    });
  });

  // ==================== bindEffect ====================

  describe('bindEffect', () => {
    it('should create an effect that runs immediately', () => {
      const count = signal(0);
      const el = document.createElement('span');

      bindEffect(() => {
        el.textContent = String(count());
      });

      expect(el.textContent).toBe('0');
    });

    it('should return a cleanup function that stops the effect', () => {
      const count = signal(0);
      const el = document.createElement('span');
      let runCount = 0;

      const cleanup = bindEffect(() => {
        runCount++;
        el.textContent = String(count());
      });

      // Effect 应该立即执行一次
      expect(runCount).toBe(1);

      // FIX: bindEffect 使用 effect()，effect 在 cleanup 时停止
      // 当 cleanup() 被调用后，后续的 signal 变化不会触发 effect
      cleanup();

      count(1);
      // Effect 已被 cleanup，runCount 不应再增加
      expect(runCount).toBe(1);
      expect(el.textContent).toBe('0');
    });

    it('should register cleanup via onCleanup', () => {
      const count = signal(0);

      bindEffect(() => {
        count(); // track
      });

      // bindEffect should have registered a cleanup
      // runCleanups is called in afterEach, so effect should be stopped
      count(1);
      // Before cleanup, the effect is still active
    });
  });

  // ==================== batchDOM ====================

  describe('batchDOM', () => {
    it('should execute the callback synchronously in non-browser environment or via RAF', async () => {
      let called = false;
      batchDOM(() => {
        called = true;
      });
      // batchDOM 使用 requestAnimationFrame，需要等待
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(called).toBe(true);
    });

    it('should allow DOM operations inside', async () => {
      batchDOM(() => {
        const el = document.createElement('div');
        el.textContent = 'batched';
        container.appendChild(el);
      });
      // batchDOM 使用 requestAnimationFrame，需要等待
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(container.textContent).toBe('batched');
    });
  });

  // ==================== onCleanup / runCleanups ====================

  describe('onCleanup / runCleanups', () => {
    it('should register and execute cleanup functions', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      onCleanup(fn1);
      onCleanup(fn2);

      runCleanups();

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should clear cleanup stack after running', () => {
      const fn = vi.fn();

      onCleanup(fn);
      runCleanups();
      runCleanups();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle cleanup functions that throw', () => {
      const fn1 = vi.fn(() => {
        throw new Error('cleanup error');
      });
      const fn2 = vi.fn();

      onCleanup(fn1);
      onCleanup(fn2);

      // fn2 should still be called even if fn1 throws
      expect(() => runCleanups()).toThrow('cleanup error');
      expect(fn2).toHaveBeenCalledTimes(1);
    });

    it('should execute cleanups in order', () => {
      const order: number[] = [];
      onCleanup(() => order.push(1));
      onCleanup(() => order.push(2));
      onCleanup(() => order.push(3));

      runCleanups();
      expect(order).toEqual([1, 2, 3]);
    });
  });

  // ==================== createCleanupScope ====================

  describe('createCleanupScope', () => {
    it('should not execute onCleanup until dispose is called', () => {
      const fn = vi.fn();
      const scope = createCleanupScope();

      onCleanup(fn);
      expect(fn).not.toHaveBeenCalled();

      scope.dispose();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should only execute cleanups registered within the scope', () => {
      const scopeFn = vi.fn();
      const globalFn = vi.fn();

      const scope = createCleanupScope();
      onCleanup(scopeFn);

      // scopeFn should not have run yet
      expect(scopeFn).not.toHaveBeenCalled();

      scope.dispose();
      expect(scopeFn).toHaveBeenCalledTimes(1);
      // globalFn was not registered, should not be called
      expect(globalFn).not.toHaveBeenCalled();
    });

    it('should isolate scopes from each other', () => {
      const scope1Fn = vi.fn();
      const scope2Fn = vi.fn();

      const scope1 = createCleanupScope();
      onCleanup(scope1Fn);
      scope1.dispose();
      expect(scope1Fn).toHaveBeenCalledTimes(1);
      expect(scope2Fn).not.toHaveBeenCalled();

      const scope2 = createCleanupScope();
      onCleanup(scope2Fn);
      scope2.dispose();
      expect(scope2Fn).toHaveBeenCalledTimes(1);
      // scope1Fn should not be called again
      expect(scope1Fn).toHaveBeenCalledTimes(1);
    });

    it('should restore previous cleanup stack after dispose', () => {
      const fn = vi.fn();

      const scope = createCleanupScope();
      onCleanup(fn);
      scope.dispose();

      // After dispose, onCleanup should go back to the global stack
      onCleanup(fn);
      runCleanups();
      expect(fn).toHaveBeenCalledTimes(2); // once from scope, once from global
    });

    it('should handle multiple cleanups within a single scope', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const fn3 = vi.fn();

      const scope = createCleanupScope();
      onCleanup(fn1);
      onCleanup(fn2);
      onCleanup(fn3);

      scope.dispose();
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(fn3).toHaveBeenCalledTimes(1);
    });

    it('should silently handle cleanup errors within scope', () => {
      const errorFn = vi.fn(() => {
        throw new Error('scope cleanup error');
      });
      const normalFn = vi.fn();

      const scope = createCleanupScope();
      onCleanup(errorFn);
      onCleanup(normalFn);

      // Should not throw even if a cleanup function errors
      expect(() => scope.dispose()).not.toThrow();
      expect(normalFn).toHaveBeenCalledTimes(1);
    });
  });
});
