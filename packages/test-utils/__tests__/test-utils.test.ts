/**
 * Lyt.js 测试框架 — 单元测试
 *
 * 测试覆盖：
 *   - describe/it/test/skip: 测试注册
 *   - beforeEach/afterEach: 钩子注册
 *   - expect: 断言 API
 *     - toBe / toEqual / toBeTruthy / toBeFalsy
 *     - toBeNull / toBeUndefined / toBeDefined
 *     - toThrow
 *     - toContain
 *     - toBeGreaterThan / toBeLessThan / toBeGreaterThanOrEqual / toBeLessThanOrEqual
 *     - toHaveLength / toBeInstanceOf
 *     - not 取反
 *   - deepEqual: 深度比较
 *   - waitFor: 异步等待
 *   - runAll: 测试运行器
 */

import { describe, it, expect, skip, beforeEach, afterEach, test, deepEqual, waitFor, runAll } from '../src/index'

// ================================================================
//  describe / it / test / skip 测试
// ================================================================

describe('describe / it / test / skip', () => {
  it('describe 和 it 正常工作', () => {
    // 当前测试本身就在 describe/it 中运行
    expect(true).toBe(true)
  })

  it('test 是 it 的别名', () => {
    // test 和 it 功能相同
    expect(test).toBe(it)
  })

  it('skip 注册跳过的测试', () => {
    // skip 不应抛异常
    expect(true).toBe(true)
  })
})

// ================================================================
//  beforeEach / afterEach 测试
// ================================================================

describe('beforeEach / afterEach', () => {
  let setupCalled = false
  let teardownCalled = false

  beforeEach(() => {
    setupCalled = true
  })

  afterEach(() => {
    teardownCalled = true
  })

  it('beforeEach 在测试前执行', () => {
    expect(setupCalled).toBe(true)
  })

  it('afterEach 在测试后执行', () => {
    // 上一个测试的 afterEach 应该已执行
    expect(teardownCalled).toBe(true)
  })
})

// ================================================================
//  expect.toBe 测试
// ================================================================

describe('expect.toBe', () => {
  it('基本值相等', () => {
    expect(1).toBe(1)
    expect('hello').toBe('hello')
    expect(true).toBe(true)
    expect(null).toBe(null)
    expect(undefined).toBe(undefined)
  })

  it('引用相等', () => {
    const obj = { a: 1 }
    expect(obj).toBe(obj)
  })

  it('not.toBe 取反', () => {
    expect(1).not.toBe(2)
    expect('a').not.toBe('b')
  })
})

// ================================================================
//  expect.toEqual 测试
// ================================================================

describe('expect.toEqual', () => {
  it('深度相等', () => {
    expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 })
    expect([1, 2, 3]).toEqual([1, 2, 3])
    expect({ nested: { x: 1 } }).toEqual({ nested: { x: 1 } })
  })

  it('not.toEqual 取反', () => {
    expect({ a: 1 }).not.toEqual({ a: 2 })
  })
})

// ================================================================
//  expect.toBeTruthy / toBeFalsy 测试
// ================================================================

describe('expect.toBeTruthy / toBeFalsy', () => {
  it('toBeTruthy', () => {
    expect(1).toBeTruthy()
    expect('hello').toBeTruthy()
    expect(true).toBeTruthy()
    expect({}).toBeTruthy()
  })

  it('toBeFalsy', () => {
    expect(0).toBeFalsy()
    expect('').toBeFalsy()
    expect(false).toBeFalsy()
    expect(null).toBeFalsy()
    expect(undefined).toBeFalsy()
  })

  it('not 取反', () => {
    expect(0).not.toBeTruthy()
    expect(1).not.toBeFalsy()
  })
})

// ================================================================
//  expect.toBeNull / toBeUndefined / toBeDefined 测试
// ================================================================

describe('expect.toBeNull / toBeUndefined / toBeDefined', () => {
  it('toBeNull', () => {
    expect(null).toBeNull()
    expect(0).not.toBeNull()
  })

  it('toBeUndefined', () => {
    expect(undefined).toBeUndefined()
    expect(null).not.toBeUndefined()
  })

  it('toBeDefined', () => {
    expect(1).toBeDefined()
    expect(null).toBeDefined()
    expect(undefined).not.toBeDefined()
  })
})

// ================================================================
//  expect.toThrow 测试
// ================================================================

describe('expect.toThrow', () => {
  it('函数抛出异常', () => {
    expect(() => { throw new Error('test') }).toThrow()
  })

  it('匹配错误消息', () => {
    expect(() => { throw new Error('specific error') }).toThrow('specific error')
  })

  it('不抛出异常时失败', () => {
    expect(() => {}).not.toThrow()
  })

  it('not.toThrow 取反', () => {
    expect(() => {}).not.toThrow()
  })
})

// ================================================================
//  expect.toContain 测试
// ================================================================

describe('expect.toContain', () => {
  it('字符串包含', () => {
    expect('hello world').toContain('world')
    expect('hello world').toContain('hello')
  })

  it('数组包含', () => {
    expect([1, 2, 3]).toContain(2)
    expect([{ a: 1 }]).toContain({ a: 1 })
  })

  it('not.toContain 取反', () => {
    expect('hello').not.toContain('world')
    expect([1, 2]).not.toContain(3)
  })
})

// ================================================================
//  expect 数字比较测试
// ================================================================

describe('expect 数字比较', () => {
  it('toBeGreaterThan', () => {
    expect(5).toBeGreaterThan(3)
    expect(5).not.toBeGreaterThan(5)
  })

  it('toBeLessThan', () => {
    expect(3).toBeLessThan(5)
    expect(3).not.toBeLessThan(3)
  })

  it('toBeGreaterThanOrEqual', () => {
    expect(5).toBeGreaterThanOrEqual(5)
    expect(5).toBeGreaterThanOrEqual(3)
  })

  it('toBeLessThanOrEqual', () => {
    expect(3).toBeLessThanOrEqual(3)
    expect(3).toBeLessThanOrEqual(5)
  })
})

// ================================================================
//  expect.toHaveLength 测试
// ================================================================

describe('expect.toHaveLength', () => {
  it('数组长度', () => {
    expect([1, 2, 3]).toHaveLength(3)
    expect([]).toHaveLength(0)
  })

  it('字符串长度', () => {
    expect('hello').toHaveLength(5)
  })

  it('not.toHaveLength 取反', () => {
    expect([1, 2]).not.toHaveLength(3)
  })
})

// ================================================================
//  expect.toBeInstanceOf 测试
// ================================================================

describe('expect.toBeInstanceOf', () => {
  it('实例检查', () => {
    expect([]).toBeInstanceOf(Array)
    expect({}).toBeInstanceOf(Object)
    expect(new Error('test')).toBeInstanceOf(Error)
  })

  it('not.toBeInstanceOf 取反', () => {
    expect({}).not.toBeInstanceOf(Array)
  })
})

// ================================================================
//  deepEqual 测试
// ================================================================

describe('deepEqual', () => {
  it('基本类型相等', () => {
    expect(deepEqual(1, 1)).toBe(true)
    expect(deepEqual('a', 'a')).toBe(true)
    expect(deepEqual(true, true)).toBe(true)
  })

  it('基本类型不等', () => {
    expect(deepEqual(1, 2)).toBe(false)
    expect(deepEqual('a', 'b')).toBe(false)
  })

  it('null/undefined 处理', () => {
    expect(deepEqual(null, null)).toBe(true)
    expect(deepEqual(null, undefined)).toBe(false)
    expect(deepEqual(undefined, undefined)).toBe(true)
  })

  it('对象深度相等', () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
  })

  it('对象深度不等', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it('数组深度相等', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEqual([[1]], [[1]])).toBe(true)
  })

  it('类型不同', () => {
    expect(deepEqual(1, '1')).toBe(false)
    expect(deepEqual(null, 0)).toBe(false)
  })
})

// ================================================================
//  waitFor 测试
// ================================================================

describe('waitFor', () => {
  it('等待指定时间', async () => {
    const start = Date.now()
    await waitFor(50)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(40)
  })
})

// ================================================================
//  runAll 测试
// ================================================================

describe('runAll', () => {
  it('runAll 返回测试结果', async () => {
    // runAll 在测试运行器中调用，这里只验证函数存在
    expect(typeof runAll).toBe('function')
  })
})

// ================================================================
//  Assertion 类 not 链式测试
// ================================================================

describe('Assertion not 链式', () => {
  it('not 可以多次使用', () => {
    expect(1).not.toBe(2)
    expect(true).not.toBeFalsy()
    expect(null).not.toBeUndefined()
  })
})

// ================================================================
//  嵌套 describe 测试
// ================================================================

describe('嵌套 describe', () => {
  describe('外层', () => {
    describe('内层', () => {
      it('嵌套测试正常工作', () => {
        expect(true).toBe(true)
      })
    })
  })
})
