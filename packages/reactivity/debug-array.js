// debug array mutation
import { reactive, effect } from './src/index.js';

console.log('Testing array pop...');
const arr = reactive([1, 2, 3]);
const fn = vi.fn();
effect(() => {
  console.log('Effect triggered with arr:', arr.join(','));
  fn(arr.join(','));
});
console.log('Initial call count:', fn.mock.calls.length);
arr.pop();
console.log('After pop call count:', fn.mock.calls.length);
console.log('arr.length now:', arr.length);