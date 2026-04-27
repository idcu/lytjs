# Signal 基础用法

本示例展示 Lyt.js Signal 模式响应式系统的核心用法，包括 `signal`、`computed`、`effect`、`batch` 和 `untrack`。

## 基本信号

```ts
import { signal, effect as signalEffect } from 'lyt'

// 创建可写信号
const count = signal(0)
const name = signal('Lyt.js')

// 读取信号：直接调用
console.log(count())   // 0
console.log(name())    // 'Lyt.js'

// 设置值
count.set(1)
console.log(count())   // 1

// 基于旧值更新
count.update(n => n + 1)
console.log(count())   // 2

// 创建副作用自动追踪依赖
const dispose = signalEffect(() => {
  console.log(`count = ${count()}, name = ${name()}`)
})
// 输出: count = 2, name = Lyt.js

count.set(3)
// 输出: count = 3, name = Lyt.js

name.set('Hello')
// 输出: count = 3, name = Hello

// 停止副作用
dispose()
count.set(99)  // 不再触发
```

## 计算信号

```ts
import { signal, computed as computedSignal, effect as signalEffect } from 'lyt'

const firstName = signal('张')
const lastName = signal('三')

// 创建计算信号（只读、惰性求值、自动缓存）
const fullName = computedSignal(() => `${firstName()}${lastName()}`)

signalEffect(() => {
  console.log(`姓名: ${fullName()}`)
})
// 输出: 姓名: 张三

firstName.set('李')
// 输出: 姓名: 李三

// 计算信号是惰性的：只有在被读取时才计算
const a = signal(1)
const b = signal(2)
const sum = computedSignal(() => a() + b())

// 此时 sum 还没有计算
// 第一次读取时才计算
console.log(sum())  // 3（此时才执行计算函数）

// 后续读取直接返回缓存值
console.log(sum())  // 3（不重新计算）

// 依赖变化后标记为 dirty，下次读取时重新计算
a.set(10)
console.log(sum())  // 12（重新计算）
```

## 副作用与清理

```ts
import { signal, effect as signalEffect } from 'lyt'

const searchQuery = signal('')

// 副作用支持 onCleanup 回调
const dispose = signalEffect((onCleanup) => {
  console.log(`搜索: ${searchQuery()}`)

  // 注册清理函数
  const timer = setTimeout(() => {
    console.log('搜索超时')
  }, 5000)

  // 下次执行前或停止时调用清理函数
  onCleanup(() => {
    clearTimeout(timer)
    console.log('清理搜索资源')
  })
})
// 输出: 搜索: （空字符串）

searchQuery.set('lytjs')
// 输出: 清理搜索资源 -> 搜索: lytjs

dispose()
// 输出: 清理搜索资源
```

## 批量更新

```ts
import { signal, effect as signalEffect, batch } from 'lyt'

const x = signal(0)
const y = signal(0)
const z = signal(0)

let effectCount = 0

signalEffect(() => {
  effectCount++
  console.log(`[${effectCount}] x=${x()}, y=${y()}, z=${z()}`)
})

// 不使用 batch：每次 set 都触发 effect
x.set(1)  // effect 执行
y.set(1)  // effect 执行
z.set(1)  // effect 执行
// effectCount = 4

// 使用 batch：所有更新合并为一次触发
batch(() => {
  x.set(2)
  y.set(2)
  z.set(2)
})
// effectCount = 5（只增加 1）

// batch 支持嵌套
batch(() => {
  x.set(3)
  batch(() => {
    y.set(3)
    z.set(3)
  })
  // 内层 batch 结束后不会触发，等外层 batch 结束才触发
})
// effectCount = 6
```

## Untrack

```ts
import { signal, computed as computedSignal, effect as signalEffect, untrack } from 'lyt'

const count = signal(0)
const logLevel = signal('info')
const maxLogs = signal(100)

// 使用 untrack 避免建立依赖
signalEffect(() => {
  const level = untrack(() => logLevel())  // logLevel 变化不会触发此 effect
  const max = untrack(() => maxLogs())     // maxLogs 变化不会触发此 effect
  console.log(`[${level}] count=${count()}, max=${max}`)
})

count.set(1)
// 输出: [info] count=1, max=100

logLevel.set('debug')
// 不会触发 effect

maxLogs.set(200)
// 不会触发 effect

// untrack 也可以用于在 computed 中读取不需要追踪的值
const externalConfig = signal({ prefix: '[LOG]' })

const displayValue = computedSignal(() => {
  const config = untrack(() => externalConfig())
  return `${config.prefix} ${count()}`
})
```

## 信号销毁

```ts
import { signal, effect as signalEffect } from 'lyt'

const count = signal(0)

const dispose = signalEffect(() => {
  console.log(`count: ${count()}`)
})

// 销毁信号，释放所有订阅者
count.dispose()

// 销毁后修改不会触发任何 effect
count.set(1)  // 不会触发

// 销毁后读取仍然可以（返回最后的值）
console.log(count())  // 0
```

## 完整示例：计数器应用

```ts
import {
  signal,
  computed as computedSignal,
  effect as signalEffect,
  batch
} from 'lyt'

// 状态信号
const count = signal(0)
const step = signal(1)
const history = signal<number[]>([])

// 计算信号
const double = computedSignal(() => count() * 2)
const isPositive = computedSignal(() => count() > 0)
const summary = computedSignal(() => {
  const h = history()
  const total = h.reduce((a, b) => a + b, 0)
  return `共 ${h.length} 次操作，累计 ${total}`
})

// 操作函数
function increment() {
  batch(() => {
    count.update(n => n + step())
    history.update(h => [...h, step()])
  })
}

function decrement() {
  batch(() => {
    count.update(n => n - step())
    history.update(h => [...h, -step()])
  })
}

function reset() {
  batch(() => {
    count.set(0)
    history.set([])
  })
}

// 显示状态
signalEffect(() => {
  console.log(`---`)
  console.log(`计数: ${count()}`)
  console.log(`双倍: ${double()}`)
  console.log(`正数: ${isPositive()}`)
  console.log(summary())
})

// 使用
increment()  // count=1, double=2
increment()  // count=2, double=4
step.set(5)
increment()  // count=7, double=14
decrement()  // count=2, double=4
reset()      // count=0, double=0
```
