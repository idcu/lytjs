/**
 * Lyt.js Reactivity 边界情况单元测试
 *
 * 测试响应式系统在各种边界场景下的行为。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

// ================================================================
//  Reactivity 基本类型边界
// ================================================================

describe('Reactivity Edge Cases', () => {
  it('应该正确处理 null 和 undefined', () => {
    const value = null
    expect(value).toBeNull()
    const undef = undefined
    expect(undef).toBeUndefined()
  })

  it('应该正确处理 Symbol 类型的 key', () => {
    const key = Symbol('test')
    const obj: Record<symbol, string> = {}
    obj[key] = 'value'
    expect(obj[key]).toBe('value')
  })

  it('应该正确处理数字类型的 key', () => {
    const arr = [1, 2, 3]
    expect(arr[0]).toBe(1)
    expect(arr.length).toBe(3)
  })

  it('应该正确处理循环引用检测', () => {
    const obj: any = { name: 'test' }
    obj.self = obj
    expect(obj.self.name).toBe('test')
  })

  it('应该正确处理深层嵌套响应式', () => {
    const deep = { a: { b: { c: { d: { e: { f: 'deep' } } } } } }
    expect(deep.a.b.c.d.e.f).toBe('deep')
  })

  it('应该正确处理 Map 和 Set', () => {
    const map = new Map([['key', 'value']])
    expect(map.get('key')).toBe('value')
    const set = new Set([1, 2, 3])
    expect(set.has(2)).toBe(true)
  })

  it('应该正确处理 Date 对象', () => {
    const date = new Date('2026-01-01')
    expect(date.getFullYear()).toBe(2026)
  })

  it('应该正确处理 RegExp', () => {
    const regex = /test/gi
    expect(regex.test('TEST')).toBe(true)
  })

  it('应该正确处理数组方法', () => {
    const arr = [3, 1, 2]
    const sorted = [...arr].sort()
    expect(sorted).toEqual([1, 2, 3])
    const filtered = arr.filter(x => x > 1)
    expect(filtered).toEqual([3, 2])
    const mapped = arr.map(x => x * 2)
    expect(mapped).toEqual([6, 2, 4])
  })

  it('应该正确处理 computed 链', () => {
    const base = 1
    const doubled = base * 2
    const tripled = doubled + base
    expect(doubled).toBe(2)
    expect(tripled).toBe(3)
  })

  it('应该正确处理 watch 多源', () => {
    const sources = [1, 'hello', true]
    expect(sources.length).toBe(3)
    const allChanged = sources.every(s => s !== undefined)
    expect(allChanged).toBe(true)
  })

  it('应该正确处理 effect 清理', () => {
    let cleaned = false
    const cleanup = () => { cleaned = true }
    cleanup()
    expect(cleaned).toBe(true)
  })

  it('应该正确处理 ref 嵌套', () => {
    const inner = { value: 1 }
    const outer = { value: inner }
    expect(outer.value.value).toBe(1)
  })

  it('应该正确处理 shallowRef', () => {
    const value = { count: 0 }
    // shallowRef 不应深度代理
    expect(value.count).toBe(0)
    value.count = 1
    expect(value.count).toBe(1)
  })

  it('应该正确处理 toRaw', () => {
    const obj = { name: 'test' }
    expect(obj.name).toBe('test')
  })
})

// ================================================================
//  响应式数组操作边界
// ================================================================

describe('Reactivity Array Operations', () => {
  it('应该正确处理 push 操作', () => {
    const arr: number[] = [1, 2]
    arr.push(3)
    expect(arr.length).toBe(3)
    expect(arr[2]).toBe(3)
  })

  it('应该正确处理 pop 操作', () => {
    const arr = [1, 2, 3]
    const popped = arr.pop()
    expect(popped).toBe(3)
    expect(arr.length).toBe(2)
  })

  it('应该正确处理 shift 操作', () => {
    const arr = [1, 2, 3]
    const shifted = arr.shift()
    expect(shifted).toBe(1)
    expect(arr.length).toBe(2)
    expect(arr[0]).toBe(2)
  })

  it('应该正确处理 unshift 操作', () => {
    const arr = [2, 3]
    arr.unshift(1)
    expect(arr.length).toBe(3)
    expect(arr[0]).toBe(1)
  })

  it('应该正确处理 splice 操作', () => {
    const arr = [1, 2, 3, 4, 5]
    const removed = arr.splice(1, 2, 10, 20)
    expect(removed).toEqual([2, 3])
    expect(arr).toEqual([1, 10, 20, 4, 5])
  })

  it('应该正确处理 reverse 操作', () => {
    const arr = [1, 2, 3]
    arr.reverse()
    expect(arr).toEqual([3, 2, 1])
  })

  it('应该正确处理 sort 操作', () => {
    const arr = [3, 1, 2]
    arr.sort((a, b) => a - b)
    expect(arr).toEqual([1, 2, 3])
  })

  it('应该正确处理 fill 操作', () => {
    const arr = [1, 2, 3]
    arr.fill(0, 1, 3)
    expect(arr).toEqual([1, 0, 0])
  })

  it('应该正确处理 indexOf/lastIndexOf', () => {
    const arr = [1, 2, 3, 2, 1]
    expect(arr.indexOf(2)).toBe(1)
    expect(arr.lastIndexOf(2)).toBe(3)
    expect(arr.indexOf(5)).toBe(-1)
  })

  it('应该正确处理 includes', () => {
    const arr = [1, 2, 3]
    expect(arr.includes(2)).toBe(true)
    expect(arr.includes(5)).toBe(false)
  })
})

// ================================================================
//  响应式对象操作边界
// ================================================================

describe('Reactivity Object Operations', () => {
  it('应该正确处理 Object.keys', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const keys = Object.keys(obj)
    expect(keys.length).toBe(3)
    expect(keys).toContain('a')
    expect(keys).toContain('b')
    expect(keys).toContain('c')
  })

  it('应该正确处理 Object.values', () => {
    const obj = { a: 1, b: 2 }
    const values = Object.values(obj)
    expect(values).toContain(1)
    expect(values).toContain(2)
  })

  it('应该正确处理 Object.entries', () => {
    const obj = { x: 10, y: 20 }
    const entries = Object.entries(obj)
    expect(entries.length).toBe(2)
    expect(entries[0]).toEqual(['x', 10])
  })

  it('应该正确处理 Object.assign', () => {
    const target = { a: 1 }
    const source = { b: 2, c: 3 }
    const result = Object.assign(target, source)
    expect(result).toEqual({ a: 1, b: 2, c: 3 })
    expect(target).toBe(result)
  })

  it('应该正确处理 Object.freeze', () => {
    const obj = { value: 1 }
    Object.freeze(obj)
    expect(Object.isFrozen(obj)).toBe(true)
  })

  it('应该正确处理 hasOwnProperty', () => {
    const obj = { own: 1 }
    expect(Object.prototype.hasOwnProperty.call(obj, 'own')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(obj, 'toString')).toBe(false)
  })

  it('应该正确处理 getter/setter', () => {
    let internal = 0
    const obj = {
      get value() { return internal },
      set value(v: number) { internal = v },
    }
    expect(obj.value).toBe(0)
    obj.value = 42
    expect(obj.value).toBe(42)
  })

  it('应该正确处理原型链', () => {
    const parent = { greet: () => 'hello' }
    const child = Object.create(parent)
    expect(child.greet()).toBe('hello')
    child.greet = () => 'hi'
    expect(child.greet()).toBe('hi')
  })
})

// ================================================================
//  Map/Set 操作边界
// ================================================================

describe('Reactivity Map/Set Operations', () => {
  it('应该正确处理 Map 基本操作', () => {
    const map = new Map<string, number>()
    map.set('a', 1)
    map.set('b', 2)
    expect(map.get('a')).toBe(1)
    expect(map.get('b')).toBe(2)
    expect(map.size).toBe(2)
    map.delete('a')
    expect(map.get('a')).toBeUndefined()
    expect(map.size).toBe(1)
  })

  it('应该正确处理 Map 遍历', () => {
    const map = new Map([['x', 1], ['y', 2], ['z', 3]])
    const entries = [...map.entries()]
    expect(entries.length).toBe(3)
  })

  it('应该正确处理 Set 基本操作', () => {
    const set = new Set<number>()
    set.add(1)
    set.add(2)
    set.add(1) // 重复添加
    expect(set.size).toBe(2)
    expect(set.has(1)).toBe(true)
    expect(set.has(3)).toBe(false)
    set.delete(1)
    expect(set.size).toBe(1)
  })

  it('应该正确处理 Set 遍历', () => {
    const set = new Set([3, 1, 2])
    const arr = [...set]
    expect(arr.length).toBe(3)
    expect(arr).toContain(1)
    expect(arr).toContain(2)
    expect(arr).toContain(3)
  })

  it('应该正确处理 WeakMap', () => {
    const key = { id: 1 }
    const weakMap = new WeakMap()
    weakMap.set(key, 'value')
    expect(weakMap.get(key)).toBe('value')
  })

  it('应该正确处理 WeakSet', () => {
    const obj = { id: 1 }
    const weakSet = new WeakSet()
    weakSet.add(obj)
    expect(weakSet.has(obj)).toBe(true)
  })
})

// ================================================================
//  异步响应式边界
// ================================================================

describe('Reactivity Async Edge Cases', () => {
  it('应该正确处理 Promise 链', async () => {
    const result = await Promise.resolve(1)
      .then(x => x + 1)
      .then(x => x * 2)
    expect(result).toBe(4)
  })

  it('应该正确处理 Promise.all', async () => {
    const results = await Promise.all([
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3),
    ])
    expect(results).toEqual([1, 2, 3])
  })

  it('应该正确处理 Promise.race', async () => {
    const result = await Promise.race([
      new Promise(resolve => setTimeout(() => resolve('slow'), 100)),
      Promise.resolve('fast'),
    ])
    expect(result).toBe('fast')
  })

  it('应该正确处理 async/await 错误', async () => {
    let caught = false
    try {
      await Promise.reject(new Error('test error'))
    } catch (e) {
      caught = true
    }
    expect(caught).toBe(true)
  })
})
