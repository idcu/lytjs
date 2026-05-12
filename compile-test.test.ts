// test-compile.test.ts
import { compile } from './packages/compiler/src/index.js';
import { describe, it, expect } from 'vitest';

describe('Compile function', () => {
  it('should generate valid code', () => {
    const result = compile('<div>hello</div>', { rendererMode: 'signal' });
    console.log('=== Compile output ===');
    console.log(result.code);
    expect(result.code).toBeDefined();
    expect(typeof result.code).toBe('string');
  });

  it('should handle interpolation', () => {
    const result = compile('<div>{{ msg }}</div>', { rendererMode: 'signal' });
    console.log('=== Interpolation output ===');
    console.log(result.code);
    expect(result.code).toBeDefined();
  });
});
