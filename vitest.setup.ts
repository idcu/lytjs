// 全局 Vitest setup 文件
// 这个文件会在所有测试运行前执行

// 定义全局变量
(globalThis as unknown as Record<string, boolean>).__DEV__ = true;
(globalThis as unknown as Record<string, boolean>).__PROD__ = false;
(globalThis as unknown as Record<string, boolean>).__TEST__ = true;

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
