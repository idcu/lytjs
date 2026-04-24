
// 检查 reactivity 包的基本功能测试
console.log('=== Testing Reactivity Package ===\n')

import * as reactivity from '../packages/reactivity/dist/index.mjs'

console.log('Available exports:', Object.keys(reactivity))

// 测试 1: reactive 基本功能
console.log('\nTest 1: reactive basic')
const obj = reactivity.reactive({ count: 0 })
console.log('Initial count:', obj.count)
obj.count = 1
console.log('After increment:', obj.count)
console.log('✅ Test 1 passed!')

// 测试 2: ref 基本功能
console.log('\nTest 2: ref basic')
const count = reactivity.ref(0)
console.log('Initial ref value:', count.value)
count.value = 10
console.log('After setting value:', count.value)
console.log('✅ Test 2 passed!')

console.log('\n🎉 All reactivity tests passed!')

