
// 测试和运行器都在这个文件里

const suites = []
let currentSuite = null

function describe(name, fn) {
  const suite = { name, tests: [] }
  suites.push(suite)
  const prevSuite = currentSuite
  currentSuite = suite
  try {
    fn()
  } finally {
    currentSuite = prevSuite
  }
}

function it(name, fn) {
  if (!currentSuite) {
    throw new Error(`it() must be in describe(): "${name}"`)
  }
  currentSuite.tests.push({ name, fn })
}

function expect(value) {
  return {
    toBe(expected) {
      if (!Object.is(value, expected)) {
        throw new Error(`Expected ${value} to be ${expected}`)
      }
    },
  }
}

// ================================================================
// 测试
// ================================================================
describe('Basic Tests', () => {
  it('1 + 1 equals 2', () => {
    expect(1 + 1).toBe(2)
  })

  it('5 - 3 equals 2', () => {
    expect(5 - 3).toBe(2)
  })
})

// ================================================================
// 运行
// ================================================================
async function runAll() {
  let total = 0, passed = 0, failed = 0
  console.log('\n=== Lyt.js Test Runner ===\n')

  for (const suite of suites) {
    console.log(suite.name)
    for (const tc of suite.tests) {
      total++
      try {
        tc.fn()
        console.log(`  [PASS] ${tc.name}`)
        passed++
      } catch (err) {
        console.log(`  [FAIL] ${tc.name}`)
        console.log(`    ${err.message}`)
        failed++
      }
    }
    console.log('')
  }

  console.log('=== Results ===')
  console.log(`  Total: ${total}`)
  console.log(`  Passed: ${passed}`)
  if (failed > 0) console.log(`  Failed: ${failed}`)
  console.log('')
  if (failed === 0) console.log('All tests passed!\n')

  process.exit(failed > 0 ? 1 : 0)
}

runAll().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})

