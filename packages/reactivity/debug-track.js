// debug track
import { reactive, effect, track, trigger } from './src/index.js';

// Let's spy on track function
const oldTrack = track;
let trackCalls = [];
(window as any).trackCalls = trackCalls;
(Object as any).assign(track, {
  oldTrack,
  callCount: 0,
});
// 暂时修改 track 来调试
Object.defineProperty(track, 'toString', {
  value: () => 'trackSpy',
});
console.log('Testing track calls...');
const arr = reactive([1, 2, 3]);
console.log('arr:', arr);
console.log('arr.length:', arr.length);
console.log('arr[0]:', arr[0]);
console.log('arr.join():', arr.join(','));

console.log('Okay, now let\'s test effect');
const fn = vi.fn();
effect(() => {
  console.log('Effect called with:', arr.join(','));
  fn();
});

console.log('Initial fn calls:', fn.mock.calls.length);
arr.pop();
console.log('After pop fn calls:', fn.mock.calls.length);