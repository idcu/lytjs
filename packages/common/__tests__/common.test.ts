/**
 * @lytjs/common 包单元测试
 */

import { describe, it, expect, beforeEach } from '@lytjs/test-utils'

// ================================================================
//  is.ts 测试
// ================================================================

describe('is', () => {
  // 需要动态导入，因为 common 包可能使用不同的导出方式
  let is: Record<string, (val: unknown) => boolean>

  beforeEach(() => {
    // 使用 require 风格同步导入，因为 beforeEach 不支持 async
    const mod = require('../src/is')
    is = mod as unknown as Record<string, (val: unknown) => boolean>
  })

  describe('isString', () => {
    it('应该正确识别字符串', () => {
      expect(is.isString('hello')).toBe(true)
      expect(is.isString('')).toBe(true)
    })
    it('应该拒绝非字符串', () => {
      expect(is.isString(123)).toBe(false)
      expect(is.isString(null)).toBe(false)
      expect(is.isString(undefined)).toBe(false)
      expect(is.isString({})).toBe(false)
    })
  })

  describe('isNumber', () => {
    it('应该正确识别数字', () => {
      expect(is.isNumber(0)).toBe(true)
      expect(is.isNumber(42)).toBe(true)
      expect(is.isNumber(-1)).toBe(true)
      expect(is.isNumber(3.14)).toBe(true)
    })
    it('应该拒绝非数字', () => {
      expect(is.isNumber('42')).toBe(false)
      expect(is.isNumber(NaN)).toBe(false) // NaN 不被视为有效数字
      expect(is.isNumber(null)).toBe(false)
    })
  })

  describe('isBoolean', () => {
    it('应该正确识别布尔值', () => {
      expect(is.isBoolean(true)).toBe(true)
      expect(is.isBoolean(false)).toBe(true)
    })
    it('应该拒绝非布尔值', () => {
      expect(is.isBoolean(1)).toBe(false)
      expect(is.isBoolean('true')).toBe(false)
    })
  })

  describe('isFunction', () => {
    it('应该正确识别函数', () => {
      expect(is.isFunction(() => {})).toBe(true)
      expect(is.isFunction(function() {})).toBe(true)
      expect(is.isFunction(async () => {})).toBe(true)
    })
    it('应该拒绝非函数', () => {
      expect(is.isFunction(null)).toBe(false)
      expect(is.isFunction({})).toBe(false)
    })
  })

  describe('isObject', () => {
    it('应该正确识别对象（包括函数）', () => {
      expect(is.isObject({})).toBe(true)
      expect(is.isObject({ a: 1 })).toBe(true)
      expect(is.isObject(() => {})).toBe(true) // 函数也是对象
    })
    it('应该拒绝 null', () => {
      expect(is.isObject(null)).toBe(false)
    })
  })

  describe('isPlainObject', () => {
    it('应该正确识别普通对象', () => {
      expect(is.isPlainObject({})).toBe(true)
      expect(is.isPlainObject({ a: 1 })).toBe(true)
    })
    it('应该拒绝 null、数组和函数', () => {
      expect(is.isPlainObject(null)).toBe(false)
      expect(is.isPlainObject([1, 2])).toBe(false)
      expect(is.isPlainObject(() => {})).toBe(false)
    })
  })

  describe('isArray', () => {
    it('应该正确识别数组', () => {
      expect(is.isArray([])).toBe(true)
      expect(is.isArray([1, 2, 3])).toBe(true)
    })
    it('应该拒绝非数组', () => {
      expect(is.isArray({})).toBe(false)
      expect(is.isArray('abc')).toBe(false)
    })
  })

  describe('isNullish', () => {
    it('应该正确识别 null 和 undefined', () => {
      expect(is.isNullish(null)).toBe(true)
      expect(is.isNullish(undefined)).toBe(true)
    })
    it('应该拒绝其他值', () => {
      expect(is.isNullish(0)).toBe(false)
      expect(is.isNullish('')).toBe(false)
      expect(is.isNullish(false)).toBe(false)
    })
  })

  describe('isEmpty', () => {
    it('应该正确识别空值', () => {
      expect(is.isEmpty(null)).toBe(true)
      expect(is.isEmpty(undefined)).toBe(true)
      expect(is.isEmpty('')).toBe(true)
      expect(is.isEmpty([])).toBe(true)
      expect(is.isEmpty({})).toBe(true)
    })
    it('应该拒绝非空值', () => {
      expect(is.isEmpty('hello')).toBe(false)
      expect(is.isEmpty([1])).toBe(false)
      expect(is.isEmpty({ a: 1 })).toBe(false)
    })
  })

  describe('isPromise', () => {
    it('应该正确识别 Promise', () => {
      expect(is.isPromise(Promise.resolve(1))).toBe(true)
      expect(is.isPromise(new Promise(() => {}))).toBe(true)
    })
    it('应该拒绝非 Promise', () => {
      expect(is.isPromise(null)).toBe(false)
      expect(is.isPromise({ then: 'not a function' })).toBe(false)
    })
  })

  describe('isSymbol', () => {
    it('应该正确识别 Symbol', () => {
      expect(is.isSymbol(Symbol('test'))).toBe(true)
    })
    it('应该拒绝非 Symbol', () => {
      expect(is.isSymbol('test')).toBe(false)
      expect(is.isSymbol(123)).toBe(false)
    })
  })

  describe('isBigInt', () => {
    it('应该正确识别 BigInt', () => {
      expect(is.isBigInt(BigInt(42))).toBe(true)
    })
    it('应该拒绝非 BigInt', () => {
      expect(is.isBigInt(42)).toBe(false)
      expect(is.isBigInt('42')).toBe(false)
    })
  })

  describe('isStringOrNumber', () => {
    it('应该正确识别字符串和数字', () => {
      expect(is.isStringOrNumber('hello')).toBe(true)
      expect(is.isStringOrNumber(42)).toBe(true)
    })
    it('应该拒绝其他类型', () => {
      expect(is.isStringOrNumber(null)).toBe(false)
      expect(is.isStringOrNumber(true)).toBe(false)
    })
  })
})

// ================================================================
//  error-codes.ts 测试
// ================================================================

describe('error-codes', () => {
  let errorCodes: Record<string, number>
  let getErrorMessage: (code: number) => string
  let getCategory: (code: number) => string

  beforeEach(() => {
    const mod = require('../src/error-codes')
    errorCodes = mod.LytErrorCodes as unknown as Record<string, number>
    getErrorMessage = mod.getErrorMessage as (code: number) => string
    getCategory = mod.getCategory as (code: number) => string
  })

  it('应该定义编译器错误码（1000-1999）', () => {
    expect(errorCodes.LYT_COMPILER_PARSE_ERROR).toBeGreaterThanOrEqual(1000)
    expect(errorCodes.LYT_COMPILER_PARSE_ERROR).toBeLessThan(2000)
  })

  it('应该定义渲染器错误码（2000-2999）', () => {
    expect(errorCodes.LYT_RENDERER_MOUNT_FAILED).toBeGreaterThanOrEqual(2000)
    expect(errorCodes.LYT_RENDERER_MOUNT_FAILED).toBeLessThan(3000)
  })

  it('应该定义组件错误码（3000-3999）', () => {
    expect(errorCodes.LYT_COMPONENT_INVALID_PROPS).toBeGreaterThanOrEqual(3000)
    expect(errorCodes.LYT_COMPONENT_INVALID_PROPS).toBeLessThan(4000)
  })

  it('应该定义路由错误码（4000-4999）', () => {
    expect(errorCodes.LYT_ROUTER_INVALID_ROUTE).toBeGreaterThanOrEqual(4000)
    expect(errorCodes.LYT_ROUTER_INVALID_ROUTE).toBeLessThan(5000)
  })

  it('应该定义 Store 错误码（5000-5999）', () => {
    expect(errorCodes.LYT_STORE_NOT_FOUND).toBeGreaterThanOrEqual(5000)
    expect(errorCodes.LYT_STORE_NOT_FOUND).toBeLessThan(6000)
  })

  it('应该定义响应式错误码（6000-6999）', () => {
    expect(errorCodes.LYT_REACTIVITY_READONLY_SET).toBeGreaterThanOrEqual(6000)
    expect(errorCodes.LYT_REACTIVITY_READONLY_SET).toBeLessThan(7000)
  })

  it('应该定义核心错误码（7000-7999）', () => {
    expect(errorCodes.LYT_CORE_ALREADY_MOUNTED).toBeGreaterThanOrEqual(7000)
    expect(errorCodes.LYT_CORE_ALREADY_MOUNTED).toBeLessThan(8000)
  })

  it('getErrorMessage 应该返回对应错误码的消息', () => {
    const msg = getErrorMessage(errorCodes.LYT_COMPILER_PARSE_ERROR)
    expect(typeof msg).toBe('string')
    expect(msg.length).toBeGreaterThan(0)
  })

  it('getCategory 应该返回正确的分类', () => {
    expect(getCategory(errorCodes.LYT_COMPILER_PARSE_ERROR)).toBe('COMPILER')
    expect(getCategory(errorCodes.LYT_RENDERER_MOUNT_FAILED)).toBe('RENDERER')
    expect(getCategory(errorCodes.LYT_COMPONENT_INVALID_PROPS)).toBe('COMPONENT')
    expect(getCategory(errorCodes.LYT_ROUTER_INVALID_ROUTE)).toBe('ROUTER')
    expect(getCategory(errorCodes.LYT_STORE_NOT_FOUND)).toBe('STORE')
    expect(getCategory(errorCodes.LYT_REACTIVITY_READONLY_SET)).toBe('REACTIVITY')
    expect(getCategory(errorCodes.LYT_CORE_ALREADY_MOUNTED)).toBe('CORE')
  })

  it('未知错误码应该返回通用消息', () => {
    const msg = getErrorMessage(99999)
    expect(typeof msg).toBe('string')
  })

  it('未知错误码应该返回 UNKNOWN 分类', () => {
    expect(getCategory(99999)).toBe('UNKNOWN')
  })
})

// ================================================================
//  lyt-error.ts 测试
// ================================================================

describe('LytError', () => {
  let LytError: any
  let createCompilerError: any
  let LytErrorCodes: any

  beforeEach(() => {
    const mod = require('../src/lyt-error')
    LytError = mod.LytError
    createCompilerError = mod.createCompilerError
    const ecMod = require('../src/error-codes')
    LytErrorCodes = ecMod.LytErrorCodes
  })

  it('应该正确创建 LytError 实例', () => {
    const err = new LytError(LytErrorCodes.LYT_COMPILER_PARSE_ERROR, '测试错误消息')
    expect(err).toBeInstanceOf(Error)
    expect(err.code).toBe(LytErrorCodes.LYT_COMPILER_PARSE_ERROR)
    expect(err.message).toContain('测试错误消息')
    expect(err.name).toBe('LytError')
  })

  it('应该自动设置 category', () => {
    const err = new LytError(LytErrorCodes.LYT_COMPILER_PARSE_ERROR)
    expect(err.category).toBe('COMPILER')
  })

  it('应该支持 details 参数', () => {
    const err = new LytError(LytErrorCodes.LYT_COMPILER_PARSE_ERROR, '测试错误', { field: 'value' })
    expect(err.details).toEqual({ field: 'value' })
  })

  it('不传 message 时应使用默认错误消息', () => {
    const err = new LytError(LytErrorCodes.LYT_COMPILER_PARSE_ERROR)
    expect(err.message).toContain('模板解析错误')
  })

  it('createCompilerError 应该创建带源位置的错误', () => {
    const err = createCompilerError(
      LytErrorCodes.LYT_COMPILER_PARSE_ERROR,
      { line: 1, column: 0, source: '<div>' },
      '解析失败'
    )
    expect(err.code).toBe(LytErrorCodes.LYT_COMPILER_PARSE_ERROR)
    expect(err.loc).toBeDefined()
    expect(err.loc.line).toBe(1)
    expect(err.loc.column).toBe(0)
    expect(err.loc.source).toBe('<div>')
  })

  it('createRendererError 应该创建带 vnode 详情的错误', () => {
    const mod = require('../src/lyt-error')
    const createRendererError = mod.createRendererError
    const fakeVNode = { type: 'div', shapeFlag: 1 }
    const err = createRendererError(
      LytErrorCodes.LYT_RENDERER_INVALID_VNODE,
      fakeVNode,
      '无效节点'
    )
    expect(err.details).toEqual({ vnode: fakeVNode })
  })

  it('createComponentError 应该创建带组件名称的错误', () => {
    const mod = require('../src/lyt-error')
    const createComponentError = mod.createComponentError
    const err = createComponentError(
      LytErrorCodes.LYT_COMPONENT_INVALID_PROPS,
      'MyComponent',
      '属性无效'
    )
    expect(err.details).toEqual({ component: 'MyComponent' })
  })
})

// ================================================================
//  emitter.ts 测试
// ================================================================

describe('EventEmitter', () => {
  let EventEmitter: any

  beforeEach(() => {
    const mod = require('../src/emitter')
    EventEmitter = mod.EventEmitter
  })

  it('应该支持 on/emit/off', () => {
    const emitter = new EventEmitter()
    let called = false
    emitter.on('test', () => { called = true })
    emitter.emit('test')
    expect(called).toBe(true)
  })

  it('off 应该取消监听', () => {
    const emitter = new EventEmitter()
    let count = 0
    const handler = () => { count++ }
    emitter.on('test', handler)
    emitter.emit('test')
    emitter.off('test', handler)
    emitter.emit('test')
    expect(count).toBe(1)
  })

  it('emit 应该传递参数', () => {
    const emitter = new EventEmitter()
    let received: unknown = null
    emitter.on('test', (data: unknown) => { received = data })
    emitter.emit('test', { key: 'value' })
    expect(received).toEqual({ key: 'value' })
  })

  it('应该支持 once', () => {
    const emitter = new EventEmitter()
    let count = 0
    emitter.once('test', () => { count++ })
    emitter.emit('test')
    emitter.emit('test')
    expect(count).toBe(1)
  })

  it('on 应该返回取消监听函数', () => {
    const emitter = new EventEmitter()
    let count = 0
    const off = emitter.on('test', () => { count++ })
    emitter.emit('test')
    off()
    emitter.emit('test')
    expect(count).toBe(1)
  })

  it('off 不传 callback 应该移除该事件所有监听器', () => {
    const emitter = new EventEmitter()
    let count = 0
    emitter.on('test', () => { count++ })
    emitter.on('test', () => { count++ })
    emitter.emit('test')
    expect(count).toBe(2)
    emitter.off('test')
    emitter.emit('test')
    expect(count).toBe(2)
  })

  it('hasListeners 应该正确报告监听器状态', () => {
    const emitter = new EventEmitter()
    expect(emitter.hasListeners('test')).toBe(false)
    emitter.on('test', () => {})
    expect(emitter.hasListeners('test')).toBe(true)
  })

  it('getListeners 应该返回所有监听器', () => {
    const emitter = new EventEmitter()
    const handler1 = () => {}
    const handler2 = () => {}
    emitter.on('test', handler1)
    emitter.on('test', handler2)
    const listeners = emitter.getListeners('test')
    expect(listeners).toHaveLength(2)
  })

  it('getEventNames 应该返回所有事件名称', () => {
    const emitter = new EventEmitter()
    emitter.on('a', () => {})
    emitter.on('b', () => {})
    const names = emitter.getEventNames()
    expect(names).toContain('a')
    expect(names).toContain('b')
  })

  it('removeAllListeners 应该移除所有监听器', () => {
    const emitter = new EventEmitter()
    let count = 0
    emitter.on('a', () => { count++ })
    emitter.on('b', () => { count++ })
    emitter.removeAllListeners()
    emitter.emit('a')
    emitter.emit('b')
    expect(count).toBe(0)
  })

  it('removeAllListeners 传 event 应该只移除指定事件的监听器', () => {
    const emitter = new EventEmitter()
    let countA = 0
    let countB = 0
    emitter.on('a', () => { countA++ })
    emitter.on('b', () => { countB++ })
    emitter.removeAllListeners('a')
    emitter.emit('a')
    emitter.emit('b')
    expect(countA).toBe(0)
    expect(countB).toBe(1)
  })

  it('listenerCount 应该返回正确的监听器数量', () => {
    const emitter = new EventEmitter()
    expect(emitter.listenerCount('test')).toBe(0)
    emitter.on('test', () => {})
    emitter.on('test', () => {})
    expect(emitter.listenerCount('test')).toBe(2)
  })
})

// ================================================================
//  scheduler.ts 测试
// ================================================================

describe('scheduler', () => {
  let nextTick: () => Promise<void>
  let queueJob: (job: (...args: unknown[]) => void) => void
  let queuePostFlushCb: (cb: (...args: unknown[]) => void) => void
  let clearQueue: () => void

  beforeEach(() => {
    const mod = require('../src/scheduler')
    nextTick = mod.nextTick
    queueJob = mod.queueJob
    queuePostFlushCb = mod.queuePostFlushCb
    clearQueue = mod.clearQueue
    clearQueue()
  })

  it('nextTick 应该在微任务中执行回调', async () => {
    let called = false
    nextTick().then(() => { called = true })
    expect(called).toBe(false)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(called).toBe(true)
  })

  it('queueJob 应该在微任务中执行 job', async () => {
    let called = false
    queueJob(() => { called = true })
    expect(called).toBe(false)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(called).toBe(true)
  })

  it('queueJob 应该自动去重', async () => {
    let count = 0
    const job = () => { count++ }
    queueJob(job)
    queueJob(job)
    queueJob(job)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(count).toBe(1)
  })

  it('queuePostFlushCb 应该在主队列之后执行', async () => {
    const order: string[] = []
    queueJob(() => { order.push('job') })
    queuePostFlushCb(() => { order.push('post') })
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(order).toEqual(['job', 'post'])
  })
})

// ================================================================
//  cache.ts 测试
// ================================================================

describe('cache', () => {
  let LRUCache: any

  beforeEach(() => {
    const mod = require('../src/cache')
    LRUCache = mod.LRUCache
  })

  it('应该支持 get/set', () => {
    const cache = new LRUCache(10)
    cache.set('key', 'value')
    expect(cache.get('key')).toBe('value')
  })

  it('应该支持 has', () => {
    const cache = new LRUCache(10)
    cache.set('key', 'value')
    expect(cache.has('key')).toBe(true)
    expect(cache.has('missing')).toBe(false)
  })

  it('应该支持 delete', () => {
    const cache = new LRUCache(10)
    cache.set('key', 'value')
    const result = cache.delete('key')
    expect(result).toBe(true)
    expect(cache.get('key')).toBe(undefined)
  })

  it('delete 不存在的 key 应该返回 false', () => {
    const cache = new LRUCache(10)
    const result = cache.delete('nonexistent')
    expect(result).toBe(false)
  })

  it('应该在超过容量时淘汰最久未使用的项', () => {
    const cache = new LRUCache(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3) // a 应该被淘汰
    expect(cache.get('a')).toBe(undefined)
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('get 应该更新访问顺序', () => {
    const cache = new LRUCache(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a') // 访问 a，使其成为最近使用
    cache.set('c', 3) // b 应该被淘汰
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBe(undefined)
    expect(cache.get('c')).toBe(3)
  })

  it('应该支持 clear', () => {
    const cache = new LRUCache(10)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('size 应该返回正确的缓存大小', () => {
    const cache = new LRUCache(10)
    expect(cache.size).toBe(0)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.size).toBe(2)
  })

  it('keys 应该返回所有键', () => {
    const cache = new LRUCache(10)
    cache.set('a', 1)
    cache.set('b', 2)
    const keys = cache.keys()
    expect(keys).toContain('a')
    expect(keys).toContain('b')
  })

  it('values 应该返回所有值', () => {
    const cache = new LRUCache(10)
    cache.set('a', 1)
    cache.set('b', 2)
    const values = cache.values()
    expect(values).toContain(1)
    expect(values).toContain(2)
  })

  it('entries 应该返回所有条目', () => {
    const cache = new LRUCache(10)
    cache.set('a', 1)
    cache.set('b', 2)
    const entries = cache.entries()
    expect(entries.length).toBe(2)
  })
})

// ================================================================
//  memoize 测试
// ================================================================

describe('memoize', () => {
  let memoize: any

  beforeEach(() => {
    const mod = require('../src/cache')
    memoize = mod.memoize
  })

  it('应该缓存函数结果', () => {
    let callCount = 0
    const fn = (x: number) => { callCount++; return x * 2 }
    const memoized = memoize(fn)
    expect(memoized(5)).toBe(10)
    expect(memoized(5)).toBe(10)
    expect(callCount).toBe(1)
  })

  it('不同参数应该产生不同的缓存', () => {
    let callCount = 0
    const fn = (x: number) => { callCount++; return x * 2 }
    const memoized = memoize(fn)
    memoized(5)
    memoized(10)
    expect(callCount).toBe(2)
  })
})
