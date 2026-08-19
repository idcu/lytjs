// test/setup.ts
// vitest 全局 setup

import { beforeEach } from 'vitest';
import { _resetSignalGlobalState } from '../src/signal';
import { _resetTrackingState } from '../src/effect';

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).__DEV__ = true;
/* eslint-enable @typescript-eslint/no-explicit-any */

beforeEach(() => {
  _resetSignalGlobalState();
  _resetTrackingState();
});
