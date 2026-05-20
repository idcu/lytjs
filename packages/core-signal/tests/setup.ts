// test/setup.ts
// vitest 全局 setup for @lytjs/core-signal
/* eslint-disable @typescript-eslint/no-explicit-any */

(globalThis as any).__DEV__ = true;

// Polyfill Element.remove() for jsdom
if (typeof Element !== 'undefined' && !Element.prototype.remove) {
  Element.prototype.remove = function (this: Element) {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  };
}
