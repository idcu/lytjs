# @lytjs/test-utils

Lyt.js 统一测试框架 -- 轻量级测试运行器和断言库，纯原生实现，零外部依赖。

## 安装

```bash
npm install @lytjs/test-utils --save-dev

# 或使用 pnpm
pnpm add @lytjs/test-utils -D
```

## 特性

- 轻量级测试运行器（describe/it/test/skip）
- 链式断言库（expect + .not 取反）
- 生命周期钩子（beforeEach/afterEach）
- 异步测试支持
- 彩色终端输出
- 失败日志自动保存
- 零外部依赖

## 快速开始

```typescript
import { describe, it, expect, runAll } from '@lytjs/test-utils'

describe('我的模块', () => {
  it('应该正常工作', () => {
    expect(1 + 1).toBe(2)
  })

  it('应该支持深度比较', () => {
    expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 2 })
  })

  it('应该支持取反断言', () => {
    expect(null).not.toBeTruthy()
  })
})

runAll()
```

## API 参考

### describe(name, fn)

定义测试套件。

```typescript
import { describe } from '@lytjs/test-utils'

describe('数学运算', () => {
  // 在此注册测试用例
})
```

### it(name, fn) / test(name, fn)

注册测试用例。`test` 是 `it` 的别名。

```typescript
import { it, test } from '@lytjs/test-utils'

it('加法运算', () => {
  expect(1 + 1).toBe(2)
})

// test 是 it 的别名
test('减法运算', () => {
  expect(3 - 1).toBe(2)
})
```

### skip(name, fn)

跳过测试用例（不会执行）。

```typescript
import { skip } from '@lytjs/test-utils'

skip('待实现的测试', () => {
  expect(true).toBe(false)
})
```

### beforeEach(fn) / afterEach(fn)

注册前置/后置钩子，在每个测试用例执行前/后调用。

```typescript
import { describe, it, beforeEach, afterEach, expect } from '@lytjs/test-utils'

let counter = 0

describe('计数器', () => {
  beforeEach(() => {
    counter = 0
  })

  afterEach(() => {
    counter = -1
  })

  it('初始值为 0', () => {
    expect(counter).toBe(0)
  })
})
```

### expect(value)

创建断言对象，支持链式调用。

#### 断言方法

| 方法 | 说明 |
|------|------|
| `toBe(expected)` | 严格相等 (`===`) |
| `toEqual(expected)` | 深度相等 |
| `toBeTruthy()` | 断言为真值 |
| `toBeFalsy()` | 断言为假值 |
| `toBeNull()` | 断言为 null |
| `toBeUndefined()` | 断言为 undefined |
| `toBeDefined()` | 断言已定义（非 undefined） |
| `toThrow(message?)` | 断言函数抛出异常 |
| `toContain(item)` | 断言数组/字符串包含指定项 |
| `toBeGreaterThan(n)` | 断言数值大于 n |
| `toBeLessThan(n)` | 断言数值小于 n |
| `toBeGreaterThanOrEqual(n)` | 断言数值大于等于 n |
| `toBeLessThanOrEqual(n)` | 断言数值小于等于 n |
| `toHaveLength(n)` | 断言数组/字符串长度为 n |

#### 取反断言

所有断言方法均可通过 `.not` 取反：

```typescript
expect(1).not.toBe(2)
expect([1, 2]).not.toContain(3)
```

### runAll()

运行所有已注册的测试套件，输出格式化报告。

```typescript
import { runAll } from '@lytjs/test-utils'

const result = await runAll()
// result: { total, passed, failed, skipped, results }
```

### waitFor(ms)

等待指定毫秒数，用于异步测试。

```typescript
import { waitFor } from '@lytjs/test-utils'

it('异步操作', async () => {
  await waitFor(100)
  expect(true).toBe(true)
})
```

### deepEqual(a, b)

深度比较两个值是否相等。

```typescript
import { deepEqual } from '@lytjs/test-utils'

const result = deepEqual({ a: [1, 2] }, { a: [1, 2] })
// result: true
```

## 示例

### 基础测试

```typescript
import { describe, it, expect, runAll } from '@lytjs/test-utils'

describe('字符串操作', () => {
  it('应该正确拼接字符串', () => {
    const result = 'hello' + ' ' + 'world'
    expect(result).toBe('hello world')
  })

  it('应该正确获取长度', () => {
    expect('hello').toHaveLength(5)
  })

  it('应该包含子串', () => {
    expect('hello world').toContain('world')
  })
})

runAll()
```

### 异步测试

```typescript
import { describe, it, expect, waitFor, runAll } from '@lytjs/test-utils'

describe('异步操作', () => {
  it('应该支持 async/await', async () => {
    await waitFor(50)
    expect(true).toBe(true)
  })

  it('应该处理 Promise', async () => {
    const promise = Promise.resolve(42)
    const result = await promise
    expect(result).toBe(42)
  })
})

runAll()
```

### 错误处理测试

```typescript
import { describe, it, expect, runAll } from '@lytjs/test-utils'

describe('错误处理', () => {
  it('应该抛出异常', () => {
    expect(() => {
      throw new Error('test error')
    }).toThrow('test error')
  })

  it('应该断言不抛出异常', () => {
    expect(() => {
      // 不抛出异常
    }).not.toThrow()
  })
})

runAll()
```

### 数值比较

```typescript
import { describe, it, expect, runAll } from '@lytjs/test-utils'

describe('数值比较', () => {
  it('应该支持大于比较', () => {
    expect(10).toBeGreaterThan(5)
  })

  it('应该支持小于比较', () => {
    expect(3).toBeLessThan(8)
  })

  it('应该支持大于等于', () => {
    expect(5).toBeGreaterThanOrEqual(5)
  })

  it('应该支持小于等于', () => {
    expect(5).toBeLessThanOrEqual(5)
  })
})

runAll()
```

## 运行输出

运行 `runAll()` 后，终端会输出彩色格式化的测试报告：

```
=== Lyt.js 测试运行器 ===

我的模块
  [PASS] 应该正常工作
  [PASS] 应该支持深度比较

=== 测试结果 ===
  总计: 2
  通过: 2

所有测试通过!
```

## 兼容性

- Node.js >= 18.0.0
- TypeScript 5.0+

## License

MIT
