// 全局 Vitest setup 文件
// 这个文件会在所有测试运行前执行

// 定义全局变量
(globalThis as unknown as Record<string, boolean>).__DEV__ = true;
(globalThis as unknown as Record<string, boolean>).__PROD__ = false;
(globalThis as unknown as Record<string, boolean>).__TEST__ = true;

// Node ≥26 内置 localStorage 全局（未配 --localstorage-file 时为空实现）：
// vitest 的 jsdom 环境只注入「Node 全局中不存在」的 window 键（populateGlobal 过滤）
// ⇒ 存储类 jsdom 用例拿到的是 Node 的空实现，isStorageAvailable() 恒 false、
// 写入静默 no-op（2026-10-09 定位；坑 verify/node26-localstorage-hijacks-jsdom）。
// 这里把 jsdom 自己的 storage 接回来：非 jsdom 环境零影响，Node 22（CI）下等价覆盖。
const jsdomWindow = (globalThis as unknown as { jsdom?: { window?: { localStorage: Storage } } })
  .jsdom?.window;
if (jsdomWindow?.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    get: () => jsdomWindow.localStorage,
    configurable: true,
  });
}

// 对每个测试重置响应式系统的全局追踪/批处理状态，
// 避免测试间泄漏（与 @lytjs/reactivity 包内 tests/setup.ts 保持一致）。
// 注意：必须从 src 相对路径导入，与测试(import '../src/...')命中同一模块实例，
// 若经 '@lytjs/reactivity'(dist) 导入会因模块实例不同而无法重置。
import { beforeEach } from 'vitest';
import { _resetSignalGlobalState } from './packages/reactivity/src/signal';
import { _resetTrackingState } from './packages/reactivity/src/effect';

beforeEach(() => {
  _resetSignalGlobalState();
  _resetTrackingState();
});
