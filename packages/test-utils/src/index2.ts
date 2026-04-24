
export function describe(name: string, fn: () =&gt; void) {
  console.log('describe:', name)
  fn()
}

export function it(name: string, fn: () =&gt; void) {
  console.log('it:', name)
  fn()
}

export function expect(value: any) {
  return {
    toBe: (expected: any) =&gt; {
      console.log(`expect ${value} toBe ${expected}`)
    }
  }
}

export async function runAll() {
  console.log('runAll called')
  return { total: 0, passed: 0, failed: 0, skipped: 0, results: [] }
}

