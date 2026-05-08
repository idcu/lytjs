// test/setup.ts
// vitest 全局 setup

import { beforeEach } from 'vitest';
import { _resetSignalGlobalState } from '../src/signal';

(globalThis as any).__DEV__ = true;

beforeEach(() => {
  _resetSignalGlobalState();
});
