/**
 * S06 守卫：`ErrorBoundary` 只允许一份权威实现。
 *
 * 2026-11-07（ADR 0016）：权威实现在 `@lytjs/component`，
 * `@lytjs/core`（含 runtime 入口）只转发；一旦副本重现，函数同一性立刻变红。
 */

import { describe, it, expect } from 'vitest';
import { ErrorBoundary as componentBoundary, type ErrorBoundaryProps } from '@lytjs/component';
import { ErrorBoundary as coreBoundary } from '../src/error-boundary';
import { ErrorBoundary as coreRuntimeBoundary } from '../src/runtime';

describe('ErrorBoundary 单一权威', () => {
  it('component 与 core（模块入口 / runtime 入口）是同一个函数', () => {
    expect(coreBoundary).toBe(componentBoundary);
    expect(coreRuntimeBoundary).toBe(componentBoundary);
  });

  it('权威实现保留 core 契约的全部 props', () => {
    expect(componentBoundary.props).toEqual(
      expect.objectContaining({
        fallbackRender: expect.anything(),
        maxRetries: expect.anything(),
        retryDelay: expect.anything(),
        onRetry: expect.anything(),
        onMaxRetriesReached: expect.anything(),
      }),
    );
  });

  it('onError 的第二参数类型是 ErrorInfo（含 timestamp）', () => {
    const props: ErrorBoundaryProps = {
      onError: (_error, info) => {
        expect(info.timestamp).toBeInstanceOf(Date);
      },
    };
    expect(props.onError).toBeTypeOf('function');
  });
});
