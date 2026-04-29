/**
 * Tests for diff algorithm and renderer patch
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  createVNode,
  createTextVNode,
  createRenderer,
  createDOMRendererOptions,
  ShapeFlags,
  PatchFlags,
  Fragment,
  Text,
} from '../src/index'

describe('Renderer - mount', () => {
  let container: HTMLDivElement
  let renderer: ReturnType<typeof createRenderer>

  beforeEach(() => {
    container = document.createElement('div')
    renderer = createRenderer(createDOMRendererOptions())
  })

  it('should mount an element vnode', () => {
    const vnode = createVNode('div')
    renderer.mount(vnode, container)
    expect(container.firstChild).toBe(vnode.el)
    expect((vnode.el as Element).tagName).toBe('DIV')
  })

  it('should mount element with props', () => {
    const vnode = createVNode('div', { id: 'app', class: 'container' })
    renderer.mount(vnode, container)
    const el = vnode.el as HTMLElement
    expect(el.id).toBe('app')
    expect(el.className).toBe('container')
  })

  it('should mount element with text children', () => {
    const vnode = createVNode('div', null, 'hello world')
    renderer.mount(vnode, container)
    const el = vnode.el as HTMLElement
    expect(el.textContent).toBe('hello world')
  })

  it('should mount element with array children', () => {
    const vnode = createVNode('div', null, [
      createVNode('span', null, 'a'),
      createVNode('span', null, 'b'),
    ])
    renderer.mount(vnode, container)
    const el = vnode.el as HTMLElement
    expect(el.children.length).toBe(2)
    expect(el.children[0]?.textContent).toBe('a')
    expect(el.children[1]?.textContent).toBe('b')
  })

  it('should mount text vnode', () => {
    const vnode = createTextVNode('hello')
    renderer.mount(vnode, container)
    expect(container.firstChild?.nodeType).toBe(Node.TEXT_NODE)
    expect(container.firstChild?.textContent).toBe('hello')
  })

  it('should mount nested elements', () => {
    const vnode = createVNode('div', { id: 'outer' }, [
      createVNode('div', { id: 'inner' }, 'text'),
    ])
    renderer.mount(vnode, container)
    const outer = vnode.el as HTMLElement
    expect(outer.id).toBe('outer')
    expect(outer.children.length).toBe(1)
    expect((outer.children[0] as HTMLElement).id).toBe('inner')
    expect(outer.children[0]?.textContent).toBe('text')
  })
})

describe('Renderer - patch', () => {
  let container: HTMLDivElement
  let renderer: ReturnType<typeof createRenderer>

  beforeEach(() => {
    container = document.createElement('div')
    renderer = createRenderer(createDOMRendererOptions())
  })

  it('should patch element with same type - update props', () => {
    const n1 = createVNode('div', { id: 'old' })
    const n2 = createVNode('div', { id: 'new' })
    renderer.mount(n1, container)
    renderer.patch(n1, n2, container)
    const el = n2.el as HTMLElement
    expect(el.id).toBe('new')
    expect(container.firstChild).toBe(el)
  })

  it('should patch element with different type - replace', () => {
    const n1 = createVNode('div')
    const n2 = createVNode('span')
    renderer.mount(n1, container)
    renderer.patch(n1, n2, container)
    expect((container.firstChild as Element).tagName).toBe('SPAN')
  })

  it('should patch text children', () => {
    const n1 = createVNode('div', null, 'old text')
    const n2 = createVNode('div', null, 'new text')
    renderer.mount(n1, container)
    renderer.patch(n1, n2, container)
    expect((n2.el as HTMLElement).textContent).toBe('new text')
  })

  it('should patch from array children to text children', () => {
    const n1 = createVNode('div', null, [
      createVNode('span', null, 'a'),
      createVNode('span', null, 'b'),
    ])
    const n2 = createVNode('div', null, 'plain text')
    renderer.mount(n1, container)
    renderer.patch(n1, n2, container)
    expect((n2.el as HTMLElement).textContent).toBe('plain text')
    expect((n2.el as HTMLElement).children.length).toBe(0)
  })

  it('should patch from text children to array children', () => {
    const n1 = createVNode('div', null, 'plain text')
    const n2 = createVNode('div', null, [
      createVNode('span', null, 'a'),
    ])
    renderer.mount(n1, container)
    renderer.patch(n1, n2, container)
    const el = n2.el as HTMLElement
    expect(el.children.length).toBe(1)
    expect(el.children[0]?.textContent).toBe('a')
  })

  it('should unmount old element when patching to different type', () => {
    const n1 = createVNode('div', { id: 'old' })
    const n2 = createVNode('span', { id: 'new' })
    renderer.mount(n1, container)
    renderer.patch(n1, n2, container)
    const el = n2.el as HTMLElement
    expect(el.id).toBe('new')
    expect(container.childNodes.length).toBe(1)
  })
})

describe('Renderer - diffChildren', () => {
  let container: HTMLDivElement
  let renderer: ReturnType<typeof createRenderer>

  beforeEach(() => {
    container = document.createElement('div')
    renderer = createRenderer(createDOMRendererOptions())
  })

  it('should add new children at end', () => {
    const n1 = createVNode('div', null, [
      createVNode('span', { key: 'a' }, 'a'),
    ])
    const n2 = createVNode('div', null, [
      createVNode('span', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
    ])
    renderer.mount(n1, container)
    renderer.patch(n1, n2, container)
    const el = n2.el as HTMLElement
    expect(el.children.length).toBe(2)
    expect(el.children[1]?.textContent).toBe('b')
  })

  it('should remove children from end', () => {
    const n1 = createVNode('div', null, [
      createVNode('span', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
    ])
    const n2 = createVNode('div', null, [
      createVNode('span', { key: 'a' }, 'a'),
    ])
    renderer.mount(n1, container)
    renderer.patch(n1, n2, container)
    const el = n2.el as HTMLElement
    expect(el.children.length).toBe(1)
    expect(el.children[0]?.textContent).toBe('a')
  })

  it('should handle reorder with keys', () => {
    const n1 = createVNode('div', null, [
      createVNode('span', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
      createVNode('span', { key: 'c' }, 'c'),
    ])
    const n2 = createVNode('div', null, [
      createVNode('span', { key: 'c' }, 'c'),
      createVNode('span', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
    ])
    renderer.mount(n1, container)
    renderer.patch(n1, n2, container)
    const el = n2.el as HTMLElement
    expect(el.children.length).toBe(3)
    // Check that all children are present
    const texts = Array.from(el.children).map(c => c.textContent)
    expect(texts).toContain('a')
    expect(texts).toContain('b')
    expect(texts).toContain('c')
  })

  it('should handle mixed add/remove with keys', () => {
    const n1 = createVNode('div', null, [
      createVNode('span', { key: 'a' }, 'a'),
      createVNode('span', { key: 'b' }, 'b'),
      createVNode('span', { key: 'c' }, 'c'),
    ])
    const n2 = createVNode('div', null, [
      createVNode('span', { key: 'b' }, 'b'),
      createVNode('span', { key: 'd' }, 'd'),
    ])
    renderer.mount(n1, container)
    renderer.patch(n1, n2, container)
    const el = n2.el as HTMLElement
    expect(el.children.length).toBe(2)
    const texts = Array.from(el.children).map(c => c.textContent)
    expect(texts).toContain('b')
    expect(texts).toContain('d')
  })
})

describe('Renderer - unmount', () => {
  let container: HTMLDivElement
  let renderer: ReturnType<typeof createRenderer>

  beforeEach(() => {
    container = document.createElement('div')
    renderer = createRenderer(createDOMRendererOptions())
  })

  it('should unmount an element', () => {
    const vnode = createVNode('div')
    renderer.mount(vnode, container)
    expect(container.childNodes.length).toBe(1)
    renderer.unmount(vnode, null, null, true)
    expect(container.childNodes.length).toBe(0)
  })

  it('should unmount element with children', () => {
    const vnode = createVNode('div', null, [
      createVNode('span'),
      createVNode('span'),
    ])
    renderer.mount(vnode, container)
    expect(container.childNodes.length).toBe(1)
    renderer.unmount(vnode, null, null, true)
    expect(container.childNodes.length).toBe(0)
  })
})
