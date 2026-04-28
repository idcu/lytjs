// benchmarks/vdom-bench.mjs
// Lyt.js VDOM 性能基准测试
// 运行方式: node --import ./e2e/loader.mjs benchmarks/vdom-bench.mjs

const {
  createVNode,
  createTextVNode,
  isSameVNodeType,
  ShapeFlags,
  PatchFlags,
  Fragment,
  getSequence,
} = await import('../packages/vdom/dist/index.mjs')

// ============================================================
// 内联 patchKeyedChildren / patchUnkeyedChildren（纯逻辑，不依赖 DOM）
// ============================================================

function patchKeyedChildrenBench(oldChildren, newChildren) {
  let ops = 0
  let i = 0
  const oldLength = oldChildren.length
  const newLength = newChildren.length
  let oldEndIndex = oldLength - 1
  let newEndIndex = newLength - 1

  // Step 1: 从头同步
  while (i <= oldEndIndex && i <= newEndIndex) {
    if (isSameVNodeType(oldChildren[i], newChildren[i])) {
      ops++
    } else {
      break
    }
    i++
  }

  // Step 2: 从尾同步
  while (i <= oldEndIndex && i <= newEndIndex) {
    if (isSameVNodeType(oldChildren[oldEndIndex], newChildren[newEndIndex])) {
      ops++
    } else {
      break
    }
    oldEndIndex--
    newEndIndex--
  }

  // Step 3: 挂载新节点
  if (i > oldEndIndex) {
    if (i <= newEndIndex) {
      ops += (newEndIndex - i + 1)
    }
  }
  // Step 4: 卸载旧节点
  else if (i > newEndIndex) {
    ops += (oldEndIndex - i + 1)
  }
  // Step 5: 未知子序列
  else {
    const newKeyToIndexMap = new Map()
    for (let j = i; j <= newEndIndex; j++) {
      const key = newChildren[j].key
      if (key != null) {
        newKeyToIndexMap.set(key, j)
      }
    }

    let j
    let patched = 0
    let pos = 0
    const toBePatched = newEndIndex - i + 1
    let moved = false

    const newIndexToOldIndexMap = new Array(toBePatched).fill(0)

    for (j = i; j <= oldEndIndex; j++) {
      const oldVNode = oldChildren[j]
      const oldKey = oldVNode.key

      if (patched >= toBePatched) {
        ops++
        continue
      }

      const newIndex = oldKey != null ? newKeyToIndexMap.get(oldKey) : undefined

      if (newIndex === undefined) {
        ops++
      } else {
        newIndexToOldIndexMap[newIndex - i] = j + 1
        if (newIndex >= pos) {
          pos = newIndex + 1
        } else {
          moved = true
        }
        ops++
        patched++
      }
    }

    if (moved) {
      getSequence(newIndexToOldIndexMap)
    }

    for (let k = toBePatched - 1; k >= 0; k--) {
      const newIndex = i + k
      if (newIndexToOldIndexMap[k] === 0) {
        ops++
      }
    }
  }

  return ops
}

function patchUnkeyedChildrenBench(oldChildren, newChildren) {
  let ops = 0
  const oldLength = oldChildren.length
  const newLength = newChildren.length
  const commonLength = Math.min(oldLength, newLength)

  for (let i = 0; i < commonLength; i++) {
    ops++
  }

  if (newLength > oldLength) {
    ops += (newLength - commonLength)
  }
  if (oldLength > newLength) {
    ops += (oldLength - commonLength)
  }

  return ops
}

// ============================================================
// 辅助函数
// ============================================================

function makeKeyedChildren(count) {
  const children = []
  for (let i = 0; i < count; i++) {
    children.push(createVNode('div', { key: i }, `Item ${i}`))
  }
  return children
}

function makeUnkeyedChildren(count) {
  const children = []
  for (let i = 0; i < count; i++) {
    children.push(createVNode('div', null, `Item ${i}`))
  }
  return children
}

// ============================================================
// 基准测试
// ============================================================

function bench(name, fn, iterations = 1000) {
  // warmup
  for (let i = 0; i < 100; i++) fn()

  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  const elapsed = performance.now() - start
  const ops = (iterations / elapsed * 1000).toFixed(0)
  console.log(`  ${name}: ${ops} ops/sec (${elapsed.toFixed(2)}ms for ${iterations} iterations)`)
}

console.log('=== VDOM Benchmarks ===')

// 1. 创建 1000 个 VNode
bench('createVNode 1000 个节点', () => {
  for (let i = 0; i < 1000; i++) {
    createVNode('div', { class: 'item', key: i }, [
      createVNode('span', null, `Item ${i}`),
    ])
  }
})

// 2. patchKeyedChildren（1000 个子节点，各种场景）

// 2a. 无变化
bench('patchKeyedChildren 1000 节点 (无变化)', () => {
  const old = makeKeyedChildren(1000)
  const newCh = makeKeyedChildren(1000)
  patchKeyedChildrenBench(old, newCh)
})

// 2b. 头部插入
bench('patchKeyedChildren 1000 节点 (头部插入 1 项)', () => {
  const old = makeKeyedChildren(1000)
  const newCh = [
    createVNode('div', { key: -1 }, 'New'),
    ...old,
  ]
  patchKeyedChildrenBench(old, newCh)
})

// 2c. 尾部插入
bench('patchKeyedChildren 1000 节点 (尾部插入 1 项)', () => {
  const old = makeKeyedChildren(1000)
  const newCh = [
    ...old,
    createVNode('div', { key: 1000 }, 'New'),
  ]
  patchKeyedChildrenBench(old, newCh)
})

// 2d. 中间删除
bench('patchKeyedChildren 1000 节点 (中间删除 1 项)', () => {
  const old = makeKeyedChildren(1000)
  const newCh = old.filter((_, idx) => idx !== 500)
  patchKeyedChildrenBench(old, newCh)
})

// 2e. 反转
bench('patchKeyedChildren 1000 节点 (反转)', () => {
  const old = makeKeyedChildren(1000)
  const newCh = [...old].reverse()
  patchKeyedChildrenBench(old, newCh)
})

// 2f. 乱序
bench('patchKeyedChildren 1000 节点 (乱序)', () => {
  const old = makeKeyedChildren(1000)
  const newCh = [...old]
  for (let i = newCh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newCh[i], newCh[j]] = [newCh[j], newCh[i]]
  }
  patchKeyedChildrenBench(old, newCh)
})

// 3. patchUnkeyedChildren（1000 个子节点）
bench('patchUnkeyedChildren 1000 节点 (无变化)', () => {
  const old = makeUnkeyedChildren(1000)
  const newCh = makeUnkeyedChildren(1000)
  patchUnkeyedChildrenBench(old, newCh)
})

bench('patchUnkeyedChildren 1000 节点 (尾部追加 10)', () => {
  const old = makeUnkeyedChildren(1000)
  const newCh = [...old, ...makeUnkeyedChildren(10)]
  patchUnkeyedChildrenBench(old, newCh)
})

bench('patchUnkeyedChildren 1000 节点 (全部替换)', () => {
  const old = makeUnkeyedChildren(1000)
  const newCh = makeUnkeyedChildren(1000)
  patchUnkeyedChildrenBench(old, newCh)
})

// 4. 快速路径（相同 key 列表）
bench('patchKeyedChildren 1000 节点 (相同 key 快速路径)', () => {
  const old = makeKeyedChildren(1000)
  // 完全相同的列表 — 从头到尾全部匹配
  patchKeyedChildrenBench(old, old)
})

console.log('\n=== VDOM Benchmarks Complete ===')
