/**
 * Lyt.js Renderer DOM 操作集成测试
 *
 * 使用 jsdom 提供真实 DOM 环境，测试 dom-ops.ts 的所有导出函数。
 */

import { JSDOM } from 'jsdom'
import { describe, it, expect } from '../../test-utils/src/index'

import {
  setDOMProp,
  removeDOMProp,
  patchDOMProps,
  isSVGElement,
  getSVGPropName,
} from '../src/dom/dom-ops'

// ================================================================
//  jsdom 环境设置
// ================================================================

let dom: JSDOM
let document: Document

function setupDOM() {
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>')
  document = dom.window.document
}

// ================================================================
//  setDOMProp 测试
// ================================================================

describe('setDOMProp', () => {
  it('设置 class 属性', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'class', 'foo bar')
    expect(el.className).toBe('foo bar')
  })

  it('设置 class 为 null', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'class', null)
    expect(el.className).toBe('')
  })

  it('设置 style 字符串', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'style', 'color: red; font-size: 16px')
    expect(el.style.color).toBe('red')
    expect(el.style.fontSize).toBe('16px')
  })

  it('设置 style 对象', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'style', { color: 'blue', margin: '10px' })
    expect(el.style.color).toBe('blue')
    expect(el.style.margin).toBe('10px')
  })

  it('设置 style 为 null', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'style', 'color: red')
    setDOMProp(el, 'style', null)
    expect(el.style.cssText).toBe('')
  })

  it('设置布尔属性为 true', () => {
    setupDOM()
    const el = document.createElement('input')
    setDOMProp(el, 'disabled', true)
    expect(el.hasAttribute('disabled')).toBe(true)
    expect((el as HTMLInputElement).disabled).toBe(true)
  })

  it('设置布尔属性为 false', () => {
    setupDOM()
    const el = document.createElement('input')
    setDOMProp(el, 'disabled', true)
    setDOMProp(el, 'disabled', false)
    expect(el.hasAttribute('disabled')).toBe(false)
    expect((el as HTMLInputElement).disabled).toBe(false)
  })

  it('设置 DOM property（id）', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'id', 'test')
    expect(el.id).toBe('test')
  })

  it('设置普通属性（data-*）', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'data-value', '123')
    expect(el.getAttribute('data-value')).toBe('123')
  })

  it('设置 value 为 null 清空 property', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'title', 'hello')
    setDOMProp(el, 'title', null)
    // title 是 DOM property，设为 null 会清空 property 而非移除 attribute
    expect(el.title).toBe('')
  })

  it('设置 value 为 false（DOM property 设为 false 字符串）', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'title', 'hello')
    setDOMProp(el, 'title', false)
    // title 是 DOM property，false 不等于 null/undefined，直接设为 false
    // 浏览器将 false 转为字符串 "false"
    expect(el.title).toBe('false')
  })

  it('设置 onClick 事件', () => {
    setupDOM()
    const el = document.createElement('button')
    let called = false
    const handler = () => { called = true }
    setDOMProp(el, 'onClick', handler)
    el.click()
    expect(called).toBe(true)
  })

  it('设置 @click 事件', () => {
    setupDOM()
    const el = document.createElement('button')
    let called = false
    const handler = () => { called = true }
    setDOMProp(el, '@click', handler)
    el.click()
    expect(called).toBe(true)
  })

  it('设置 className 通过 DOM_PROPS 映射', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'className', 'mapped')
    expect(el.className).toBe('mapped')
  })

  it('设置 tabIndex 通过 DOM_PROPS 映射', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'tabIndex', '0')
    expect(el.tabIndex).toBe(0)
  })

  it('设置 checked 布尔属性', () => {
    setupDOM()
    const el = document.createElement('input')
    setDOMProp(el, 'checked', true)
    expect((el as HTMLInputElement).checked).toBe(true)
  })

  it('设置 multiple 布尔属性', () => {
    setupDOM()
    const el = document.createElement('select')
    setDOMProp(el, 'multiple', true)
    expect((el as HTMLSelectElement).multiple).toBe(true)
  })

  it('设置 hidden 布尔属性', () => {
    setupDOM()
    const el = document.createElement('div')
    setDOMProp(el, 'hidden', true)
    expect(el.hasAttribute('hidden')).toBe(true)
  })
})

// ================================================================
//  removeDOMProp 测试
// ================================================================

describe('removeDOMProp', () => {
  it('移除 class', () => {
    setupDOM()
    const el = document.createElement('div')
    el.className = 'test'
    removeDOMProp(el, 'class')
    expect(el.className).toBe('')
  })

  it('移除 style', () => {
    setupDOM()
    const el = document.createElement('div')
    el.style.color = 'red'
    removeDOMProp(el, 'style')
    expect(el.style.cssText).toBe('')
  })

  it('移除布尔属性', () => {
    setupDOM()
    const el = document.createElement('input')
    el.disabled = true
    removeDOMProp(el, 'disabled')
    expect(el.hasAttribute('disabled')).toBe(false)
    expect((el as HTMLInputElement).disabled).toBe(false)
  })

  it('移除 DOM property', () => {
    setupDOM()
    const el = document.createElement('div')
    el.id = 'test'
    removeDOMProp(el, 'id')
    expect(el.id).toBe('')
  })

  it('移除普通属性', () => {
    setupDOM()
    const el = document.createElement('div')
    el.setAttribute('data-value', '123')
    removeDOMProp(el, 'data-value')
    expect(el.hasAttribute('data-value')).toBe(false)
  })

  it('移除事件（无缓存时不报错）', () => {
    setupDOM()
    const el = document.createElement('button')
    expect(() => removeDOMProp(el, 'onClick')).not.toThrow()
  })
})

// ================================================================
//  patchDOMProps 测试
// ================================================================

describe('patchDOMProps', () => {
  it('从 null 到有属性', () => {
    setupDOM()
    const el = document.createElement('div')
    patchDOMProps(el, null, { id: 'test', class: 'foo' })
    expect(el.id).toBe('test')
    expect(el.className).toBe('foo')
  })

  it('更新已有属性', () => {
    setupDOM()
    const el = document.createElement('div')
    el.id = 'old'
    patchDOMProps(el, { id: 'old' }, { id: 'new' })
    expect(el.id).toBe('new')
  })

  it('移除不存在的属性（title 是 DOM property，清空而非移除）', () => {
    setupDOM()
    const el = document.createElement('div')
    el.setAttribute('title', 'hello')
    patchDOMProps(el, { title: 'hello' }, null)
    // title 是 DOM property，removeDOMProp 清空 property
    expect(el.title).toBe('')
  })

  it('跳过 key 和 ref', () => {
    setupDOM()
    const el = document.createElement('div')
    patchDOMProps(el, null, { key: 'k1', ref: 'r1', id: 'test' })
    expect(el.id).toBe('test')
    expect(el.hasAttribute('key')).toBe(false)
  })

  it('值未变化不更新', () => {
    setupDOM()
    const el = document.createElement('div')
    el.id = 'same'
    patchDOMProps(el, { id: 'same' }, { id: 'same' })
    expect(el.id).toBe('same')
  })

  it('更新 class', () => {
    setupDOM()
    const el = document.createElement('div')
    patchDOMProps(el, { class: 'old' }, { class: 'new' })
    expect(el.className).toBe('new')
  })

  it('更新 style 字符串', () => {
    setupDOM()
    const el = document.createElement('div')
    patchDOMProps(el, { style: 'color: red' }, { style: 'color: blue' })
    expect(el.style.color).toBe('blue')
  })

  it('更新 style 对象', () => {
    setupDOM()
    const el = document.createElement('div')
    patchDOMProps(el, { style: { color: 'red' } }, { style: { color: 'blue', fontSize: '16px' } })
    expect(el.style.color).toBe('blue')
    expect(el.style.fontSize).toBe('16px')
  })

  it('混合更新和删除', () => {
    setupDOM()
    const el = document.createElement('div')
    el.id = 'test'
    el.setAttribute('data-value', 'hello')
    patchDOMProps(el, { id: 'test', 'data-value': 'hello' }, { id: 'new' })
    expect(el.id).toBe('new')
    // data-value 不是 DOM property，走 removeAttribute 路径
    expect(el.hasAttribute('data-value')).toBe(false)
  })

  it('新旧 props 都为 null', () => {
    setupDOM()
    const el = document.createElement('div')
    expect(() => patchDOMProps(el, null, null)).not.toThrow()
  })

  it('事件属性不在此处理', () => {
    setupDOM()
    const el = document.createElement('button')
    let called = false
    const handler = () => { called = true }
    patchDOMProps(el, null, { onClick: handler })
    // patchDOMProps 跳过事件属性
    el.click()
    expect(called).toBe(false)
  })
})

// ================================================================
//  isSVGElement 测试
// ================================================================

describe('isSVGElement', () => {
  it('识别 svg 元素', () => {
    expect(isSVGElement('svg')).toBe(true)
    expect(isSVGElement('path')).toBe(true)
    expect(isSVGElement('circle')).toBe(true)
    expect(isSVGElement('rect')).toBe(true)
    expect(isSVGElement('line')).toBe(true)
    expect(isSVGElement('g')).toBe(true)
    expect(isSVGElement('defs')).toBe(true)
    expect(isSVGElement('use')).toBe(true)
    expect(isSVGElement('text')).toBe(true)
    expect(isSVGElement('clipPath')).toBe(true)
    expect(isSVGElement('filter')).toBe(true)
    expect(isSVGElement('linearGradient')).toBe(true)
    expect(isSVGElement('animate')).toBe(true)
  })

  it('非 SVG 元素返回 false', () => {
    expect(isSVGElement('div')).toBe(false)
    expect(isSVGElement('span')).toBe(false)
    expect(isSVGElement('input')).toBe(false)
    expect(isSVGElement('button')).toBe(false)
    expect(isSVGElement('')).toBe(false)
  })
})

// ================================================================
//  getSVGPropName 测试
// ================================================================

describe('getSVGPropName', () => {
  it('映射 kebab-case 到 camelCase', () => {
    expect(getSVGPropName('fill-opacity')).toBe('fillOpacity')
    expect(getSVGPropName('stroke-width')).toBe('strokeWidth')
    expect(getSVGPropName('font-size')).toBe('fontSize')
    expect(getSVGPropName('text-anchor')).toBe('textAnchor')
    expect(getSVGPropName('stop-color')).toBe('stopColor')
    expect(getSVGPropName('clip-path')).toBe('clipPath')
  })

  it('未知属性名原样返回', () => {
    expect(getSVGPropName('unknown-attr')).toBe('unknown-attr')
    expect(getSVGPropName('id')).toBe('id')
  })
})
