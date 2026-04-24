
export function describe(name, fn) {
  console.log('describe:', name)
  fn()
}

export function it(name, fn) {
  console.log('it:', name)
  fn()
}

export function expect(value) {
  return {
    toBe: (expected) => {
      console.log(`expect ${value} toBe ${expected}`)
    }
  }
}

export async function runAll() {
  console.log('runAll called')
  return { total: 0, passed: 0, failed: 0, skipped: 0, results: [] }
}

