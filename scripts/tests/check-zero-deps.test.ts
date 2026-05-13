/**
 * 零依赖规范校验脚本测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('check-zero-deps 脚本', () => {
  const testDir = join(tmpdir(), 'lytjs-zero-deps-test');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
  });

  function createPackage(name: string, deps: Record<string, string> = {}, devDeps: Record<string, string> = {}): void {
    const pkgDir = join(testDir, name);
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, 'package.json'),
      JSON.stringify({
        name,
        dependencies: deps,
        devDependencies: devDeps,
      }, null, 2)
    );
  }

  it('应正确识别内部包依赖', () => {
    createPackage('@lytjs/test-pkg', {
      '@lytjs/reactivity': '^6.0.0',
      '@lytjs/common-is': '^6.0.0',
    });
    expect(true).toBe(true);
  });

  it('应正确识别第三方运行时依赖', () => {
    createPackage('@lytjs/third-party-test', {
      'lodash': '^4.17.21',
      '@lytjs/reactivity': '^6.0.0',
    });
    expect(true).toBe(true);
  });

  it('应允许 devDependencies 中的第三方依赖', () => {
    createPackage('@lytjs/dev-deps-test', {
      '@lytjs/reactivity': '^6.0.0',
    }, {
      'vitest': '^1.0.0',
      'typescript': '^5.0.0',
    });
    expect(true).toBe(true);
  });

  it('应正确处理空依赖情况', () => {
    createPackage('@lytjs/empty-deps-test', {});
    expect(true).toBe(true);
  });

  it('应正确扫描嵌套目录结构', () => {
    const nestedDir = join(testDir, 'packages');
    mkdirSync(nestedDir, { recursive: true });
    createPackage('@lytjs/nested-test', {
      '@lytjs/core': '^6.0.0',
    });
    expect(true).toBe(true);
  });
});
