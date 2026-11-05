// src/proto-keys.ts
// 会落到原型链上的键（**叶子模块**：所有合并 / 克隆入口共用同一份判据）
//
// `__proto__` / `constructor` / `prototype` 写进普通对象时不会落在对象自己的属性上，
// 而是沿原型链改写 `Object.prototype` —— 即原型污染，影响进程内所有对象。
// 本包所有「按 key 写对象」的入口都必须先过这份集合。

export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);
