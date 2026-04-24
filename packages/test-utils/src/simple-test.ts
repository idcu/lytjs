
function describe(name, fn) {
  console.log('describe called:', name);
  if (fn) fn();
}

function it(name, fn) {
  console.log('it called:', name);
  if (fn) fn();
}

function expect(value) {
  console.log('expect called with:', value);
  return {
    toBe: function(expected) {
      console.log('toBe called with:', expected);
    }
  };
}

async function runAll() {
  console.log('runAll called');
}

export { describe, it, expect, runAll };

