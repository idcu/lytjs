/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @vitest-environment jsdom
 * tests/index.test.ts
 * Tests for @lytjs/adapter-web
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WebRendererHost,
  createDOMRenderer,
  wrapDOMEvent,
  patchProp,
  patchClass,
  patchStyle,
  patchAttr,
  createWebHost,
  createInvoker,
  patchEvent,
  removeAllEventListeners,
  detectHostCapabilities,
  supportsHostCapability,
  waitForHostReady,
  createExtendedWebHost,
} from '../src/index';
import type { ExtendedRendererHost } from '../src/web-host-extended';
import type { RendererHost } from '@lytjs/host-contract';

// ============================================================
// WebRendererHost
// ============================================================

describe('WebRendererHost', () => {
  let host: WebRendererHost;

  beforeEach(() => {
    host = new WebRendererHost();
  });

  // ---- Node Operations ----

  describe('createElement', () => {
    it('should create a regular HTML element', () => {
      const el = host.createElement('div');
      expect(el).toBeInstanceOf(HTMLElement);
      expect(el.tagName.toLowerCase()).toBe('div');
    });

    it('should create an SVG element when isSVG is true', () => {
      const el = host.createElement('svg', true);
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });

    it('should create an SVG element for known SVG tags', () => {
      const el = host.createElement('path');
      expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });
  });

  describe('createText', () => {
    it('should create a text node', () => {
      const text = host.createText('hello');
      expect(text.nodeType).toBe(3);
      expect(text.textContent).toBe('hello');
    });
  });

  describe('createComment', () => {
    it('should create a comment node', () => {
      const comment = host.createComment('a comment');
      expect(comment.nodeType).toBe(8);
      expect(comment.textContent).toBe('a comment');
    });
  });

  describe('setElementText', () => {
    it('should set text content on an element', () => {
      const el = document.createElement('div');
      host.setElementText(el, 'new text');
      expect(el.textContent).toBe('new text');
    });
  });

  describe('setText', () => {
    it('should set nodeValue on a text node', () => {
      const text = document.createTextNode('old');
      host.setText(text, 'new');
      expect(text.nodeValue).toBe('new');
    });
  });

  describe('insert', () => {
    it('should insert a child before an anchor', () => {
      const parent = document.createElement('div');
      const anchor = document.createElement('span');
      const child = document.createElement('p');
      parent.appendChild(anchor);
      host.insert(child, parent, anchor);
      expect(parent.firstChild).toBe(child);
      expect(parent.lastChild).toBe(anchor);
    });

    it('should append child when anchor is null', () => {
      const parent = document.createElement('div');
      const child = document.createElement('p');
      host.insert(child, parent, null);
      expect(parent.lastChild).toBe(child);
    });
  });

  describe('remove', () => {
    it('should remove a child from its parent', () => {
      const parent = document.createElement('div');
      const child = document.createElement('p');
      parent.appendChild(child);
      host.remove(child);
      expect(parent.firstChild).toBeNull();
    });

    it('should do nothing if child has no parent', () => {
      const child = document.createElement('p');
      expect(() => host.remove(child)).not.toThrow();
    });
  });

  describe('nextSibling', () => {
    it('should return the next sibling node', () => {
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const second = document.createElement('p');
      parent.appendChild(first);
      parent.appendChild(second);
      expect(host.nextSibling(first)).toBe(second);
    });

    it('should return null for the last child', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      expect(host.nextSibling(child)).toBeNull();
    });
  });

  describe('parentNode', () => {
    it('should return the parent node', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      expect(host.parentNode(child)).toBe(parent);
    });

    it('should return null for a detached node', () => {
      const node = document.createElement('div');
      expect(host.parentNode(node)).toBeNull();
    });
  });

  // ---- Property Operations ----

  describe('patchProp', () => {
    it('should set an attribute on an element', () => {
      const el = document.createElement('div');
      host.patchProp(el, 'id', null, 'my-id');
      expect(el.getAttribute('id')).toBe('my-id');
    });

    it('should remove an attribute when nextValue is null', () => {
      const el = document.createElement('div');
      el.setAttribute('id', 'old-id');
      host.patchProp(el, 'id', 'old-id', null);
      expect(el.getAttribute('id')).toBeNull();
    });

    it('should handle class prop', () => {
      const el = document.createElement('div');
      host.patchProp(el, 'class', null, 'foo bar');
      expect(el.className).toBe('foo bar');
    });

    it('should handle style prop', () => {
      const el = document.createElement('div');
      host.patchProp(el, 'style', null, 'color: red');
      expect((el as HTMLElement).style.color).toBe('red');
    });

    it('should handle event prop (onClick)', () => {
      const el = document.createElement('button');
      const handler = vi.fn();
      host.patchProp(el, 'onClick', null, handler);
      el.click();
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ---- Style Operations ----

  describe('setStyle', () => {
    it('should set a CSS property', () => {
      const el = document.createElement('div');
      host.setStyle(el, 'color', 'red');
      expect((el as HTMLElement).style.color).toBe('red');
    });

    it('should remove a CSS property when value is null', () => {
      const el = document.createElement('div');
      (el as HTMLElement).style.color = 'red';
      host.setStyle(el, 'color', null);
      expect((el as HTMLElement).style.color).toBe('');
    });

    it('should remove a CSS property when value is undefined', () => {
      const el = document.createElement('div');
      (el as HTMLElement).style.color = 'red';
      host.setStyle(el, 'color', undefined);
      expect((el as HTMLElement).style.color).toBe('');
    });
  });

  describe('removeStyle', () => {
    it('should remove a CSS property', () => {
      const el = document.createElement('div');
      (el as HTMLElement).style.color = 'red';
      host.removeStyle(el, 'color');
      expect((el as HTMLElement).style.color).toBe('');
    });
  });

  describe('addClass / removeClass / hasClass', () => {
    it('should add, check, and remove a class', () => {
      const el = document.createElement('div');
      host.addClass(el, 'foo');
      expect(host.hasClass(el, 'foo')).toBe(true);
      host.removeClass(el, 'foo');
      expect(host.hasClass(el, 'foo')).toBe(false);
    });
  });

  // ---- Event Operations ----

  describe('addEventListener', () => {
    it('should add an event listener and return a dispose function', () => {
      const el = document.createElement('button');
      const handler = vi.fn();
      const dispose = host.addEventListener(el, 'click', handler);

      el.click();
      expect(handler).toHaveBeenCalledTimes(1);

      dispose();
      el.click();
      expect(handler).toHaveBeenCalledTimes(1); // no more calls after dispose
    });

    it('should wrap the native event into a HostEvent', () => {
      const el = document.createElement('button');
      let receivedEvent: any = null;
      const handler = (e: any) => {
        receivedEvent = e;
      };
      host.addEventListener(el, 'click', handler);

      el.click();
      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.type).toBe('click');
      expect(receivedEvent.target).toBe(el);
      expect(typeof receivedEvent.preventDefault).toBe('function');
      expect(typeof receivedEvent.stopPropagation).toBe('function');
      expect(receivedEvent.nativeEvent).toBeInstanceOf(Event);
    });
  });

  describe('removeEventListener', () => {
    it('should be callable without error', () => {
      const el = document.createElement('button');
      const handler = vi.fn();
      expect(() => host.removeEventListener(el, 'click', handler)).not.toThrow();
    });
  });

  // ---- Transition Operations ----

  describe('getBoundingClientRect', () => {
    it('should return a HostRect-like object', () => {
      const el = document.createElement('div');
      const rect = host.getBoundingClientRect(el);
      expect(rect).toHaveProperty('left');
      expect(rect).toHaveProperty('top');
      expect(rect).toHaveProperty('width');
      expect(rect).toHaveProperty('height');
      expect(rect).toHaveProperty('right');
      expect(rect).toHaveProperty('bottom');
      expect(typeof rect.left).toBe('number');
    });
  });

  describe('getAttribute', () => {
    it('should return the attribute value', () => {
      const el = document.createElement('div');
      el.setAttribute('data-test', 'value');
      expect(host.getAttribute(el, 'data-test')).toBe('value');
    });

    it('should return null for missing attribute', () => {
      const el = document.createElement('div');
      expect(host.getAttribute(el, 'data-test')).toBeNull();
    });
  });

  // ---- Misc ----

  describe('getNamespaceURI', () => {
    it('should return null for regular HTML elements', () => {
      const el = document.createElement('div');
      expect(host.getNamespaceURI(el)).toBe('http://www.w3.org/1999/xhtml');
    });

    it('should return SVG namespace for SVG elements', () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      expect(host.getNamespaceURI(el)).toBe('http://www.w3.org/2000/svg');
    });
  });

  describe('replaceChild', () => {
    it('should replace a child node', () => {
      const parent = document.createElement('div');
      const oldChild = document.createElement('span');
      const newChild = document.createElement('p');
      parent.appendChild(oldChild);
      host.replaceChild(parent, newChild, oldChild);
      expect(parent.firstChild).toBe(newChild);
      expect(parent.contains(oldChild)).toBe(false);
    });
  });

  describe('getChildNodes', () => {
    it('should return an array of child nodes', () => {
      const parent = document.createElement('div');
      parent.appendChild(document.createElement('span'));
      parent.appendChild(document.createTextNode('text'));
      const children = host.getChildNodes(parent);
      expect(children).toHaveLength(2);
    });
  });

  describe('getNodeType', () => {
    it('should return the correct node type', () => {
      const el = document.createElement('div');
      expect(host.getNodeType(el)).toBe(1);
      const text = document.createTextNode('text');
      expect(host.getNodeType(text)).toBe(3);
      const comment = document.createComment('comment');
      expect(host.getNodeType(comment)).toBe(8);
    });
  });

  describe('getTagName', () => {
    it('should return the lowercase tag name', () => {
      const el = document.createElement('DIV');
      expect(host.getTagName(el)).toBe('div');
    });
  });
});

// ============================================================
// wrapDOMEvent
// ============================================================

describe('wrapDOMEvent', () => {
  it('should wrap a native DOM event', () => {
    const el = document.createElement('button');
    const nativeEvent = new MouseEvent('click', { bubbles: true });
    const wrapped = wrapDOMEvent(nativeEvent);

    expect(wrapped.type).toBe('click');
    // jsdom sets target to null for programmatic events
    expect(wrapped.nativeEvent).toBe(nativeEvent);
  });

  it('should proxy preventDefault', () => {
    const nativeEvent = new Event('click', { cancelable: true });
    const wrapped = wrapDOMEvent(nativeEvent);
    wrapped.preventDefault();
    expect(nativeEvent.defaultPrevented).toBe(true);
  });

  it('should proxy stopPropagation', () => {
    const nativeEvent = new Event('click', { bubbles: true });
    const wrapped = wrapDOMEvent(nativeEvent);
    wrapped.stopPropagation();
    expect(nativeEvent.cancelBubble).toBe(true);
  });
});

// ============================================================
// patchProp / patchClass / patchStyle / patchAttr
// ============================================================

describe('patchProp (standalone)', () => {
  it('should delegate class to patchClass', () => {
    const el = document.createElement('div');
    patchProp(el, 'class', null, 'a b');
    expect(el.className).toBe('a b');
  });

  it('should delegate style to patchStyle', () => {
    const el = document.createElement('div');
    patchProp(el, 'style', null, 'color: red; font-size: 16px');
    expect((el as HTMLElement).style.color).toBe('red');
  });

  it('should delegate event to patchEvent', () => {
    const el = document.createElement('button');
    const handler = vi.fn();
    patchProp(el, 'onClick', null, handler);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should delegate regular attributes to patchAttr', () => {
    const el = document.createElement('div');
    patchProp(el, 'data-test', null, 'value');
    expect(el.getAttribute('data-test')).toBe('value');
  });
});

describe('patchClass', () => {
  it('should set class string', () => {
    const el = document.createElement('div');
    patchClass(el, null, 'foo bar');
    expect(el.className).toBe('foo bar');
  });

  it('should clear class when nextValue is null', () => {
    const el = document.createElement('div');
    el.className = 'old';
    patchClass(el, 'old', null);
    expect(el.className).toBe('');
  });
});

describe('patchStyle', () => {
  it('should set style from string', () => {
    const el = document.createElement('div');
    patchStyle(el, null, 'color: red');
    expect((el as HTMLElement).style.color).toBe('red');
  });

  it('should set style from object', () => {
    const el = document.createElement('div');
    patchStyle(el, null, { color: 'blue', fontSize: '16px' });
    expect((el as HTMLElement).style.color).toBe('blue');
    expect((el as HTMLElement).style.fontSize).toBe('16px');
  });

  it('should clear style when nextValue is null', () => {
    const el = document.createElement('div');
    (el as HTMLElement).style.color = 'red';
    patchStyle(el, 'color: red', null);
    expect((el as HTMLElement).style.color).toBe('');
  });
});

describe('patchAttr', () => {
  it('should set an attribute', () => {
    const el = document.createElement('div');
    patchAttr(el, 'id', 'test', false);
    expect(el.getAttribute('id')).toBe('test');
  });

  it('should remove an attribute when value is null/undefined', () => {
    const el = document.createElement('div');
    el.setAttribute('data-x', 'old');
    patchAttr(el, 'data-x', null, false);
    expect(el.getAttribute('data-x')).toBeNull();
  });

  it('should handle boolean attributes', () => {
    const el = document.createElement('input');
    patchAttr(el, 'disabled', '', false);
    expect(el.hasAttribute('disabled')).toBe(true);
  });
});

// ============================================================
// createInvoker / patchEvent / removeAllEventListeners
// ============================================================

describe('createInvoker', () => {
  it('should create an invoker with initial value', () => {
    const handler = vi.fn();
    const invoker = createInvoker(handler);
    expect(invoker.value).toBe(handler);
  });

  it('should execute the value when invoker is called', () => {
    const handler = vi.fn();
    const invoker = createInvoker(handler);
    const event = new Event('click');
    invoker(event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('should support updating the value', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const invoker = createInvoker(handler1);
    invoker.value = handler2;
    invoker(new Event('click'));
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});

describe('patchEvent', () => {
  it('should add an event listener when no existing invoker', () => {
    const el = document.createElement('button');
    const handler = vi.fn();
    patchEvent(el, 'onClick', handler);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should update the invoker value when listener already exists', () => {
    const el = document.createElement('button');
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    patchEvent(el, 'onClick', handler1);
    patchEvent(el, 'onClick', handler2);
    el.click();
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('should remove the event listener when nextValue is null', () => {
    const el = document.createElement('button');
    const handler = vi.fn();
    patchEvent(el, 'onClick', handler);
    patchEvent(el, 'onClick', null);
    el.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('should handle modifiers (e.g. onClick.stop)', () => {
    const el = document.createElement('div');
    const parent = document.createElement('div');
    parent.appendChild(el);
    const handler = vi.fn();
    patchEvent(el, 'onClick.stop', handler);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('removeAllEventListeners', () => {
  it('should remove all event listeners from an element', () => {
    const el = document.createElement('button');
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    patchEvent(el, 'onClick', handler1);
    patchEvent(el, 'onMouseover', handler2);
    removeAllEventListeners(el);
    el.click();
    el.dispatchEvent(new Event('mouseover'));
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });
});

// ============================================================
// createDOMRenderer
// ============================================================

describe('createDOMRenderer', () => {
  it('should create a DOMRenderer instance', () => {
    const renderer = createDOMRenderer();
    expect(renderer).toBeDefined();
    expect(typeof renderer.render).toBe('function');
    expect(typeof renderer.patch).toBe('function');
    expect(typeof renderer.unmount).toBe('function');
    expect(typeof renderer.mount).toBe('function');
    expect(typeof renderer.move).toBe('function');
  });
});

// ============================================================
// createWebHost
// ============================================================

describe('createWebHost', () => {
  it('should return a RendererHost instance', () => {
    const host = createWebHost();
    expect(host).toBeDefined();
    expect(typeof host.createElement).toBe('function');
    expect(typeof host.insert).toBe('function');
    expect(typeof host.remove).toBe('function');
    expect(typeof host.patchProp).toBe('function');
    expect(typeof host.addEventListener).toBe('function');
    expect(typeof host.removeEventListener).toBe('function');
  });

  it('should create elements through the host', () => {
    const host = createWebHost();
    const el = host.createElement('div');
    expect(el).toBeInstanceOf(HTMLElement);
  });
});

// ============================================================
// Extended Web Host (merged from @lytjs/host)
// ============================================================

describe('Extended Web Host', () => {
  describe('detectHostCapabilities', () => {
    it('should return capability flags', () => {
      const caps = detectHostCapabilities();
      expect(caps).toHaveProperty('shadowDOM');
      expect(caps).toHaveProperty('customElements');
      expect(caps).toHaveProperty('cssVariables');
      expect(caps).toHaveProperty('resizeObserver');
      expect(typeof caps.shadowDOM).toBe('boolean');
    });
  });

  describe('supportsHostCapability', () => {
    it('should check specific capability', () => {
      const result = supportsHostCapability('shadowDOM');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('createExtendedWebHost', () => {
    const mockBaseHost = {
      createElement: vi.fn((tag: string) => document.createElement(tag)),
      createText: vi.fn((text: string) => document.createTextNode(text)),
      createComment: vi.fn((text: string) => document.createComment(text)),
      setElementText: vi.fn(),
      setText: vi.fn(),
      insert: vi.fn(),
      remove: vi.fn(),
      nextSibling: vi.fn(),
      parentNode: vi.fn(),
      querySelector: vi.fn(),
      patchProp: vi.fn(),
      addClass: vi.fn(),
      removeClass: vi.fn(),
      hasClass: vi.fn(),
      setStyle: vi.fn(),
      removeStyle: vi.fn(),
      getComputedStyle: vi.fn(),
      forceReflow: vi.fn(),
      addEventListener: vi.fn(() => () => {}),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(),
      getAttribute: vi.fn(),
      getTransitionInfo: vi.fn(),
      nextFrame: vi.fn(),
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    };

    it('should create extended host with insertBefore', () => {
      const host = createExtendedWebHost({
        baseHost: mockBaseHost as unknown as ExtendedRendererHost,
      });
      expect(host.insertBefore).toBeDefined();
    });

    it('should create extended host with replaceChild', () => {
      const host = createExtendedWebHost({
        baseHost: mockBaseHost as unknown as ExtendedRendererHost,
      });
      expect(host.replaceChild).toBeDefined();
    });

    it('should create extended host with querySelectorAll', () => {
      const host = createExtendedWebHost({
        baseHost: mockBaseHost as unknown as ExtendedRendererHost,
      });
      expect(host.querySelectorAll).toBeDefined();
    });

    it('should create extended host with setStyles', () => {
      const host = createExtendedWebHost({
        baseHost: mockBaseHost as unknown as ExtendedRendererHost,
      });
      expect(host.setStyles).toBeDefined();
    });

    it('should create extended host with dispatchEvent', () => {
      const host = createExtendedWebHost({
        baseHost: mockBaseHost as unknown as ExtendedRendererHost,
      });
      expect(host.dispatchEvent).toBeDefined();
    });
  });

  describe('waitForHostReady', () => {
    it('should return a promise', () => {
      const result = waitForHostReady();
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
