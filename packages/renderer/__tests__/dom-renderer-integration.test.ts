/**
 * Lyt.js DOMRenderer 集成测试
 *
 * 使用 jsdom 提供真实 DOM 环境，测试 DOMRenderer 类的所有方法。
 */

import { JSDOM } from 'jsdom'
import { describe, it, expect } from '../../test-utils/src/index'

import { DOMRenderer, domRenderer } from '../src/dom/dom-renderer'

// ================================================================
//  jsdom 环境设置
// ================================================================

let dom: JSDOM
let document: Document

function setupDOM() {
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>')
  document = dom.window.document
  globalThis.document = document as any
}

// ================================================================
//  DOMRenderer 测试
// ================================================================

describe('DOMRenderer', () => {
  it('createElement 创建普通元素', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = renderer.createElement('div')
    expect(el.tagName).toBe('DIV')
  })

  it('createElement 创建 SVG 元素', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = renderer.createElement('svg')
    expect(el.tagName).toBe('svg')
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg')
  })

  it('createElement 创建其他 SVG 元素', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const path = renderer.createElement('path')
    expect(path.namespaceURI).toBe('http://www.w3.org/2000/svg')
    const circle = renderer.createElement('circle')
    expect(circle.namespaceURI).toBe('http://www.w3.org/2000/svg')
  })

  it('createText 创建文本节点', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const text = renderer.createText('hello')
    expect(text.nodeType).toBe(3)
    expect(text.textContent).toBe('hello')
  })

  it('createComment 创建注释节点', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const comment = renderer.createComment('a comment')
    expect(comment.nodeType).toBe(8)
    expect(comment.textContent).toBe('a comment')
  })

  it('setAttribute 设置属性', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    renderer.setAttribute(el, 'id', 'test')
    expect(el.id).toBe('test')
  })

  it('setAttribute 设置布尔属性', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('input')
    renderer.setAttribute(el, 'disabled', true)
    expect(el.disabled).toBe(true)
  })

  it('removeAttribute 移除属性', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    el.id = 'test'
    renderer.removeAttribute(el, 'id')
    expect(el.id).toBe('')
  })

  it('setStyle 字符串形式', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    renderer.setStyle(el, 'color: red; font-size: 14px')
    expect(el.style.color).toBe('red')
  })

  it('setStyle 对象形式', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    renderer.setStyle(el, { color: 'blue', margin: '10px' })
    expect(el.style.color).toBe('blue')
    expect(el.style.margin).toBe('10px')
  })

  it('setClass 字符串形式', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    renderer.setClass(el, 'foo bar')
    expect(el.className).toBe('foo bar')
  })

  it('setClass 对象形式', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    renderer.setClass(el, { foo: true, bar: false, baz: true })
    expect(el.className).toBe('foo baz')
  })

  it('setClass null/undefined 清空', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    el.className = 'test'
    renderer.setClass(el, null as any)
    expect(el.className).toBe('')
  })

  it('insert 插入到参考节点前', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const parent = document.createElement('div')
    const ref = document.createElement('span')
    const child = document.createElement('p')
    parent.appendChild(ref)
    renderer.insert(parent, child, ref)
    expect(parent.children[0]).toBe(child)
    expect(parent.children[1]).toBe(ref)
  })

  it('insert 追加到末尾（ref 为 null）', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const parent = document.createElement('div')
    const existing = document.createElement('span')
    const child = document.createElement('p')
    parent.appendChild(existing)
    renderer.insert(parent, child, null)
    expect(parent.children[1]).toBe(child)
  })

  it('remove 移除节点', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    renderer.remove(child)
    expect(parent.children.length).toBe(0)
  })

  it('replace 替换节点', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const parent = document.createElement('div')
    const oldChild = document.createElement('span')
    const newChild = document.createElement('p')
    parent.appendChild(oldChild)
    renderer.replace(parent, oldChild, newChild)
    expect(parent.children[0]).toBe(newChild)
  })

  it('addEventListener 添加事件', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('button')
    let called = false
    renderer.addEventListener(el, 'click', () => { called = true })
    el.click()
    expect(called).toBe(true)
  })

  it('removeEventListener 移除事件', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('button')
    let called = false
    const handler = () => { called = true }
    renderer.addEventListener(el, 'click', handler)
    renderer.removeEventListener(el, 'click', handler)
    el.click()
    expect(called).toBe(false)
  })

  it('nextTick 微任务延迟', async () => {
    setupDOM()
    const renderer = new DOMRenderer()
    let called = false
    renderer.nextTick(() => { called = true })
    expect(called).toBe(false)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(called).toBe(true)
  })

  it('parentNode 获取父节点', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    expect(renderer.parentNode(child)).toBe(parent)
  })

  it('nextSibling 获取下一个兄弟节点', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const parent = document.createElement('div')
    const child1 = document.createElement('span')
    const child2 = document.createElement('p')
    parent.appendChild(child1)
    parent.appendChild(child2)
    expect(renderer.nextSibling(child1)).toBe(child2)
  })

  it('querySelector 查询元素', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    el.id = 'test-query'
    document.body.appendChild(el)
    expect(renderer.querySelector('#test-query')).toBe(el)
    document.body.removeChild(el)
  })

  // PatchDOMOperations 接口测试

  it('setElementText 设置元素文本', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    renderer.setElementText(el, 'hello')
    expect(el.textContent).toBe('hello')
  })

  it('setText 设置节点文本', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const text = document.createTextNode('old')
    renderer.setText(text, 'new')
    expect(text.nodeValue).toBe('new')
  })

  it('insertBefore 插入到锚点前', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const parent = document.createElement('div')
    const anchor = document.createElement('span')
    const child = document.createElement('p')
    parent.appendChild(anchor)
    renderer.insertBefore(parent, child, anchor)
    expect(parent.children[0]).toBe(child)
  })

  it('insertBefore 锚点为 null 时追加', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const parent = document.createElement('div')
    const child = document.createElement('p')
    renderer.insertBefore(parent, child, null)
    expect(parent.children[0]).toBe(child)
  })

  it('removeChild 移除子节点', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    renderer.removeChild(parent, child)
    expect(parent.children.length).toBe(0)
  })

  it('setAnchor 设置 vnode 锚点', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const vnode: any = {}
    const anchor = document.createElement('span')
    renderer.setAnchor(vnode, anchor)
    expect(vnode.anchor).toBe(anchor)
  })

  it('getNextSibling 获取下一个兄弟', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const parent = document.createElement('div')
    const child1 = document.createElement('span')
    const child2 = document.createElement('p')
    parent.appendChild(child1)
    parent.appendChild(child2)
    expect(renderer.getNextSibling(child1)).toBe(child2)
  })

  it('cleanupEvents 清理事件', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('button')
    expect(() => renderer.cleanupEvents(el)).not.toThrow()
  })

  it('setClassWithOld 带旧值更新 class', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    renderer.setClassWithOld(el, 'new-class', 'old-class')
    expect(el.className).toBe('new-class')
  })

  it('setStyleWithOld 带旧值更新 style', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    renderer.setStyleWithOld(el, { color: 'blue' }, { color: 'red' })
    expect(el.style.color).toBe('blue')
  })

  it('setAttributeWithOld 带旧值更新属性', () => {
    setupDOM()
    const renderer = new DOMRenderer()
    const el = document.createElement('div')
    renderer.setAttributeWithOld(el, 'data-value', 'new', 'old')
    expect(el.getAttribute('data-value')).toBe('new')
  })
})

describe('domRenderer 单例', () => {
  it('domRenderer 具有 DOMRenderer 的方法', () => {
    expect(typeof domRenderer.createElement).toBe('function')
    expect(typeof domRenderer.createText).toBe('function')
    expect(typeof domRenderer.insert).toBe('function')
  })

  it('domRenderer 可以创建元素', () => {
    setupDOM()
    const el = domRenderer.createElement('div')
    expect(el.tagName).toBe('DIV')
  })
})
