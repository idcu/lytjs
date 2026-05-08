// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createElement,
  insertBefore,
  removeChild,
  nextSibling,
  createTextNode,
  createComment,
  setStyle,
  hasClass,
  addClass,
  removeClass,
} from '../src/index';

describe('@lytjs/common-dom-helpers', () => {
  // createElement
  describe('createElement', () => {
    it('should create an element with given tag', () => {
      const el = createElement('div');
      expect(el.tagName).toBe('DIV');
    });

    it('should create an element with attributes', () => {
      const el = createElement('div', { id: 'test', class: 'container' });
      expect(el.getAttribute('id')).toBe('test');
      expect(el.getAttribute('class')).toBe('container');
    });

    it('should create an element with string children', () => {
      const el = createElement('p', {}, ['Hello', ' ', 'World']);
      expect(el.textContent).toBe('Hello World');
    });

    it('should create an element with Node children', () => {
      const span = document.createElement('span');
      span.textContent = 'inner';
      const el = createElement('div', {}, [span]);
      expect(el.firstChild).toBe(span);
    });

    it('should create an element with mixed children', () => {
      const text = createTextNode('text');
      const el = createElement('div', {}, ['hello', text, 'world']);
      expect(el.childNodes.length).toBe(3);
      expect(el.childNodes[0].textContent).toBe('hello');
      expect(el.childNodes[1]).toBe(text);
      expect(el.childNodes[2].textContent).toBe('world');
    });

    it('should create element without attrs and children', () => {
      const el = createElement('span');
      expect(el.tagName).toBe('SPAN');
      expect(el.attributes.length).toBe(0);
      expect(el.childNodes.length).toBe(0);
    });
  });

  // insertBefore
  describe('insertBefore', () => {
    it('should insert before reference node', () => {
      const parent = document.createElement('div');
      const ref = document.createElement('span');
      const child = document.createElement('p');
      parent.appendChild(ref);
      insertBefore(parent, child, ref);
      expect(parent.firstChild).toBe(child);
      expect(parent.lastChild).toBe(ref);
    });

    it('should append when ref is null', () => {
      const parent = document.createElement('div');
      const existing = document.createElement('span');
      const child = document.createElement('p');
      parent.appendChild(existing);
      insertBefore(parent, child, null);
      expect(parent.firstChild).toBe(existing);
      expect(parent.lastChild).toBe(child);
    });

    it('should insert at beginning when ref is first child', () => {
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const child = document.createElement('p');
      parent.appendChild(first);
      insertBefore(parent, child, first);
      expect(parent.firstChild).toBe(child);
      expect(parent.lastChild).toBe(first);
    });
  });

  // removeChild
  describe('removeChild', () => {
    it('should remove an existing child', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      const result = removeChild(parent, child);
      expect(result).toBe(true);
      expect(parent.childNodes.length).toBe(0);
    });

    it('should return false when child is not a child of parent', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      const result = removeChild(parent, child);
      expect(result).toBe(false);
    });

    it('should return false for already removed child', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      parent.removeChild(child);
      const result = removeChild(parent, child);
      expect(result).toBe(false);
    });
  });

  // nextSibling
  describe('nextSibling', () => {
    it('should return the next sibling node', () => {
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const second = document.createElement('p');
      parent.appendChild(first);
      parent.appendChild(second);
      expect(nextSibling(first)).toBe(second);
    });

    it('should return null when there is no next sibling', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      expect(nextSibling(child)).toBeNull();
    });

    it('should not skip comment nodes by default', () => {
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const comment = document.createComment('comment');
      const second = document.createElement('p');
      parent.appendChild(first);
      parent.appendChild(comment);
      parent.appendChild(second);
      expect(nextSibling(first)).toBe(comment);
    });

    it('should skip comment nodes when skipComments is true', () => {
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const comment = document.createComment('comment');
      const second = document.createElement('p');
      parent.appendChild(first);
      parent.appendChild(comment);
      parent.appendChild(second);
      expect(nextSibling(first, true)).toBe(second);
    });

    it('should skip multiple consecutive comment nodes', () => {
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const comment1 = document.createComment('comment1');
      const comment2 = document.createComment('comment2');
      const second = document.createElement('p');
      parent.appendChild(first);
      parent.appendChild(comment1);
      parent.appendChild(comment2);
      parent.appendChild(second);
      expect(nextSibling(first, true)).toBe(second);
    });

    it('should return null when only comment nodes follow', () => {
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const comment = document.createComment('comment');
      parent.appendChild(first);
      parent.appendChild(comment);
      expect(nextSibling(first, true)).toBeNull();
    });
  });

  // createTextNode
  describe('createTextNode', () => {
    it('should create a text node with given text', () => {
      const text = createTextNode('hello');
      expect(text.nodeType).toBe(Node.TEXT_NODE);
      expect(text.textContent).toBe('hello');
    });

    it('should create empty text node', () => {
      const text = createTextNode('');
      expect(text.textContent).toBe('');
    });
  });

  // createComment
  describe('createComment', () => {
    it('should create a comment node with given text', () => {
      const comment = createComment('this is a comment');
      expect(comment.nodeType).toBe(Node.COMMENT_NODE);
      expect(comment.textContent).toBe('this is a comment');
    });

    it('should create empty comment node', () => {
      const comment = createComment('');
      expect(comment.textContent).toBe('');
    });
  });

  // setStyle
  describe('setStyle', () => {
    it('should set string style values', () => {
      const el = document.createElement('div');
      setStyle(el, { color: 'red', display: 'flex' });
      expect((el as HTMLElement).style.color).toBe('red');
      expect((el as HTMLElement).style.display).toBe('flex');
    });

    it('should set numeric style values', () => {
      const el = document.createElement('div');
      setStyle(el, { zIndex: 10, opacity: 0.5 });
      expect((el as HTMLElement).style.zIndex).toBe('10');
      expect((el as HTMLElement).style.opacity).toBe('0.5');
    });

    it('should set mixed style values', () => {
      const el = document.createElement('div');
      setStyle(el, { fontSize: '16px', margin: 0 });
      expect((el as HTMLElement).style.fontSize).toBe('16px');
      expect((el as HTMLElement).style.margin).toBe('0px');
    });

    it('should handle empty styles object', () => {
      const el = document.createElement('div');
      setStyle(el, {});
      expect((el as HTMLElement).style.cssText).toBe('');
    });
  });

  // hasClass
  describe('hasClass', () => {
    it('should return true when element has the class', () => {
      const el = document.createElement('div');
      el.classList.add('active');
      expect(hasClass(el, 'active')).toBe(true);
    });

    it('should return false when element does not have the class', () => {
      const el = document.createElement('div');
      el.classList.add('active');
      expect(hasClass(el, 'inactive')).toBe(false);
    });

    it('should return false for element with no classes', () => {
      const el = document.createElement('div');
      expect(hasClass(el, 'test')).toBe(false);
    });
  });

  // addClass
  describe('addClass', () => {
    it('should add a single class', () => {
      const el = document.createElement('div');
      addClass(el, 'active');
      expect(el.classList.contains('active')).toBe(true);
    });

    it('should add multiple classes', () => {
      const el = document.createElement('div');
      addClass(el, 'a', 'b', 'c');
      expect(el.classList.contains('a')).toBe(true);
      expect(el.classList.contains('b')).toBe(true);
      expect(el.classList.contains('c')).toBe(true);
    });

    it('should not duplicate existing classes', () => {
      const el = document.createElement('div');
      el.classList.add('active');
      addClass(el, 'active');
      expect(el.classList.length).toBe(1);
    });
  });

  // removeClass
  describe('removeClass', () => {
    it('should remove a single class', () => {
      const el = document.createElement('div');
      el.classList.add('active', 'inactive');
      removeClass(el, 'active');
      expect(el.classList.contains('active')).toBe(false);
      expect(el.classList.contains('inactive')).toBe(true);
    });

    it('should remove multiple classes', () => {
      const el = document.createElement('div');
      el.classList.add('a', 'b', 'c');
      removeClass(el, 'a', 'c');
      expect(el.classList.contains('a')).toBe(false);
      expect(el.classList.contains('b')).toBe(true);
      expect(el.classList.contains('c')).toBe(false);
    });

    it('should not throw when removing non-existent class', () => {
      const el = document.createElement('div');
      expect(() => removeClass(el, 'nonexistent')).not.toThrow();
    });
  });
});
