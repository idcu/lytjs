// @vitest-environment node
/**
 * 行为级判据：`@lytjs/router-fs` 的路径换算与目录扫描（`src/utils.ts`，95 行）
 *
 * ## 为什么要有这条
 *
 * 覆盖率 **21.1%**（71 条语句 56 条空档）。这组函数决定「文件树怎么变成路由表」——
 * 判错的表现是**路由 404 或串页**，而不是报错。
 *
 * ## 手法
 *
 * 纯函数直接断言；`scanDirectory` 用 `mkdtemp` 造真实临时目录树（它读真 fs）。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isDirectory,
  isFile,
  filePathToRoutePath,
  extractDynamicParams,
  scanDirectory,
} from '../src/utils';

let root: string;
const exts = ['.ts', '.js'];

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'lytjs-router-fs-'));
  // pages/
  //   index.ts
  //   about.ts
  //   users/index.ts
  //   users/[id].ts
  //   _layout.ts        ← 被 ignorePatterns 排除
  //   notes.md          ← 扩展名不匹配
  mkdirSync(join(root, 'users'), { recursive: true });
  writeFileSync(join(root, 'index.ts'), '');
  writeFileSync(join(root, 'about.ts'), '');
  writeFileSync(join(root, 'users', 'index.ts'), '');
  writeFileSync(join(root, 'users', '[id].ts'), '');
  writeFileSync(join(root, '_layout.ts'), '');
  writeFileSync(join(root, 'notes.md'), '');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

// ==================== 文件系统判定 ====================

describe('isDirectory / isFile', () => {
  it('目录 / 文件互斥', () => {
    expect(isDirectory(join(root, 'users'))).toBe(true);
    expect(isFile(join(root, 'users'))).toBe(false);
    expect(isFile(join(root, 'about.ts'))).toBe(true);
    expect(isDirectory(join(root, 'about.ts'))).toBe(false);
  });

  it('不存在 ⇒ 皆假且不抛', () => {
    const ghost = join(root, 'ghost');
    expect(isDirectory(ghost)).toBe(false);
    expect(isFile(ghost)).toBe(false);
  });
});

// ==================== 路径换算 ====================

describe('filePathToRoutePath', () => {
  it('根文件 ⇒ /name', () => {
    expect(filePathToRoutePath(join(root, 'about.ts'), root, exts)).toBe('/about');
  });

  it('根 index ⇒ /', () => {
    expect(filePathToRoutePath(join(root, 'index.ts'), root, exts)).toBe('/');
  });

  it('子目录 index 折成目录本身', () => {
    expect(filePathToRoutePath(join(root, 'users', 'index.ts'), root, exts)).toBe('/users');
  });

  it('动态段 [id] ⇒ :id', () => {
    expect(filePathToRoutePath(join(root, 'users', '[id].ts'), root, exts)).toBe('/users/:id');
  });

  it('多个动态段逐段转换', () => {
    expect(filePathToRoutePath(join(root, '[a]', '[b].ts'), root, exts)).toBe('/:a/:b');
  });

  it('扩展名只剥一次（.test.ts 不会把 .test 留下）', () => {
    // 扩展名列表里只有 .ts ⇒ 剥掉 .ts 后剩 foo.test
    expect(filePathToRoutePath(join(root, 'foo.test.ts'), root, exts)).toBe('/foo.test');
  });

  it('更长的扩展名优先匹配（.vue 在 .ts 之前时不误剥）', () => {
    expect(filePathToRoutePath(join(root, 'x.vue'), root, ['.vue', '.ts'])).toBe('/x');
  });
});

describe('extractDynamicParams', () => {
  it('按出现顺序取参数名', () => {
    expect(extractDynamicParams('/users/:id/posts/:postId')).toEqual(['id', 'postId']);
  });

  it('无动态段 ⇒ 空数组', () => {
    expect(extractDynamicParams('/about')).toEqual([]);
  });
});

// ==================== 目录扫描 ====================

describe('scanDirectory', () => {
  it('递归收集匹配扩展名的文件', () => {
    const routes = scanDirectory(root, root, exts, []);
    const paths = routes.map((r) => r.path).sort();

    // 注意根目录的 `index.ts` 会折成 `/`，第一版漏了它（夹具漏项，不是产品问题）
    expect(paths).toEqual(['/', '/_layout', '/about', '/users', '/users/:id']);
    expect(paths.some((p) => p.includes('notes'))).toBe(false);
  });

  it('ignorePatterns 同时匹配相对路径与文件名', () => {
    const routes = scanDirectory(root, root, exts, ['_layout']);

    expect(routes.some((r) => r.path.includes('_layout'))).toBe(false);
  });

  it('动态路由带 isDynamic 与 params', () => {
    const routes = scanDirectory(root, root, exts, ['_layout']);
    const dynamic = routes.find((r) => r.path === '/users/:id')!;

    expect(dynamic.isDynamic).toBe(true);
    expect(dynamic.params).toEqual(['id']);
  });

  it('静态路由 isDynamic 为假', () => {
    const routes = scanDirectory(root, root, exts, ['_layout']);

    expect(routes.find((r) => r.path === '/about')!.isDynamic).toBe(false);
  });

  it('isNested 按路径段数判定（/about 假、/users/:id 真）', () => {
    const routes = scanDirectory(root, root, exts, ['_layout']);
    const byPath = new Map(routes.map((r) => [r.path, r]));

    expect(byPath.get('/about')!.isNested).toBe(false);
    expect(byPath.get('/users')!.isNested).toBe(false);
    expect(byPath.get('/users/:id')!.isNested).toBe(true);
  });

  it('componentPath 是真实存在的文件', () => {
    for (const r of scanDirectory(root, root, exts, [])) {
      expect(isFile(r.componentPath)).toBe(true);
    }
  });

  it('目录不存在 ⇒ 空数组（不抛）', () => {
    expect(scanDirectory(join(root, 'ghost'), root, exts, [])).toEqual([]);
  });
});
