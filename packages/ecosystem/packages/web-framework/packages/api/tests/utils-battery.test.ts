// @vitest-environment node
/**
 * 行为级判据：`@lytjs/api` 的文件扫描与路径换算（`src/utils.ts`，117 行、6 个导出）
 *
 * ## 为什么要有这条
 *
 * 覆盖率实测 **20%**。这组函数决定「哪些文件被当成路由、路由路径长什么样、支持哪些方法」——
 * 一旦判错，表现是**接口静默 404**，而不是报错。
 *
 * 空档里的缺陷：`extractHttpMethods()` 用 `filename.includes(method)` 判断方法，
 * 于是**普通单词里的子串也被当成方法**：
 * - `postal.ts` ⇒ POST（应为默认 GET）
 * - `dispatch.ts` ⇒ PATCH（`dispatch` 里含 `patch`）
 * - `budget.ts` ⇒ GET（凑巧与默认一致，掩盖了问题）
 * 修法：按**词边界**匹配（`.get` / `-get` / `_get` / `[get]` / 首尾），而不是裸子串。
 *
 * ## 手法
 *
 * 纯函数直接断言；`scanApiDirectory` 用 `mkdtemp` 造真实临时目录树（它读的是真 fs）。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isDirectory,
  isFile,
  extractHttpMethods,
  filePathToApiPath,
  extractDynamicParams,
  scanApiDirectory,
} from '../src/utils';

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'lytjs-api-'));
  // pages/
  //   users.ts
  //   users/[id].ts
  //   users/[id].put.ts
  //   health.get.ts
  //   _middleware.ts      ← 被 ignorePatterns 排除
  //   notes.md            ← 扩展名不匹配，跳过
  mkdirSync(join(root, 'users'), { recursive: true });
  writeFileSync(join(root, 'users.ts'), '');
  writeFileSync(join(root, 'users', '[id].ts'), '');
  writeFileSync(join(root, 'users', '[id].put.ts'), '');
  writeFileSync(join(root, 'health.get.ts'), '');
  writeFileSync(join(root, '_middleware.ts'), '');
  writeFileSync(join(root, 'notes.md'), '');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

// ==================== 文件系统判定 ====================

describe('isDirectory / isFile', () => {
  it('目录为真、文件为假', () => {
    expect(isDirectory(join(root, 'users'))).toBe(true);
    expect(isFile(join(root, 'users'))).toBe(false);
  });

  it('文件为真、目录为假', () => {
    expect(isFile(join(root, 'users.ts'))).toBe(true);
    expect(isDirectory(join(root, 'users.ts'))).toBe(false);
  });

  it('不存在的路径两者皆假（不抛）', () => {
    const ghost = join(root, 'nope');
    expect(() => isDirectory(ghost)).not.toThrow();
    expect(isDirectory(ghost)).toBe(false);
    expect(isFile(ghost)).toBe(false);
  });
});

// ==================== HTTP 方法提取 ====================

describe('extractHttpMethods 按词边界识别，不认裸子串', () => {
  it('点分后缀：users.get.ts ⇒ GET', () => {
    expect(extractHttpMethods('users.get.ts')).toEqual(['GET']);
  });

  it('点分后缀：users.post.ts ⇒ POST', () => {
    expect(extractHttpMethods('users.post.ts')).toEqual(['POST']);
  });

  it('★ postal.ts ⇒ 默认 GET（"post" 是 postal 的子串，不是方法）', () => {
    expect(extractHttpMethods('postal.ts')).toEqual(['GET']);
  });

  it('★ dispatch.ts ⇒ 默认 GET（"dispatch" 含 "patch"）', () => {
    expect(extractHttpMethods('dispatch.ts')).toEqual(['GET']);
  });

  it('★ budget.ts ⇒ 默认 GET（"budget" 含 "get"）', () => {
    expect(extractHttpMethods('budget.ts')).toEqual(['GET']);
  });

  it('连字符与下划线分隔同样识别：get-users.ts / users_post.ts', () => {
    expect(extractHttpMethods('get-users.ts')).toEqual(['GET']);
    expect(extractHttpMethods('users_post.ts')).toEqual(['POST']);
  });

  it('方括号标记：[id].put.ts ⇒ PUT', () => {
    expect(extractHttpMethods('[id].put.ts')).toEqual(['PUT']);
  });

  it('多个方法：get-post.ts ⇒ [GET, POST]', () => {
    expect(extractHttpMethods('get-post.ts')).toEqual(['GET', 'POST']);
  });

  it('一个都没有 ⇒ 默认 GET', () => {
    expect(extractHttpMethods('users.ts')).toEqual(['GET']);
  });
});

// ==================== 路径换算 ====================

describe('filePathToApiPath', () => {
  const exts = ['.ts', '.js'];

  it('根目录文件 ⇒ /name', () => {
    expect(filePathToApiPath(join(root, 'users.ts'), root, exts)).toBe('/users');
  });

  it('嵌套文件 ⇒ /a/b', () => {
    expect(filePathToApiPath(join(root, 'users', '[id].ts'), root, exts)).toBe('/users/:id');
  });

  it('index 文件折成所在目录', () => {
    expect(filePathToApiPath(join(root, 'users', 'index.ts'), root, exts)).toBe('/users');
  });

  it('根 index ⇒ /', () => {
    expect(filePathToApiPath(join(root, 'index.ts'), root, exts)).toBe('/');
  });

  it('方法后缀被剥掉：users.get.ts ⇒ /users', () => {
    expect(filePathToApiPath(join(root, 'users.get.ts'), root, exts)).toBe('/users');
  });

  it('方法后缀 + 动态段：[id].put.ts ⇒ /:id', () => {
    expect(filePathToApiPath(join(root, 'users', '[id].put.ts'), root, exts)).toBe('/users/:id');
  });

  it('动态段支持多个参数', () => {
    expect(filePathToApiPath(join(root, '[a]', '[b].ts'), root, exts)).toBe('/:a/:b');
  });
});

describe('extractDynamicParams', () => {
  it('按出现顺序返回参数名', () => {
    expect(extractDynamicParams('/users/:id/posts/:postId')).toEqual(['id', 'postId']);
  });

  it('无动态段 ⇒ 空数组', () => {
    expect(extractDynamicParams('/users')).toEqual([]);
  });
});

// ==================== 目录扫描 ====================

describe('scanApiDirectory', () => {
  const exts = ['.ts'];

  it('递归收集 .ts 文件，忽略扩展名不匹配的', () => {
    const routes = scanApiDirectory(root, root, exts, []);

    const paths = routes.map((r) => r.path).sort();
    expect(paths).toEqual(['/_middleware', '/health', '/users', '/users/:id', '/users/:id']);
    // notes.md 不在其中
    expect(paths.some((p) => p.includes('notes'))).toBe(false);
  });

  it('ignorePatterns 同时匹配相对路径与文件名', () => {
    const routes = scanApiDirectory(root, root, exts, ['_middleware']);

    expect(routes.some((r) => r.path.includes('_middleware'))).toBe(false);
  });

  it('动态路由打上 isDynamic 与 params', () => {
    const routes = scanApiDirectory(root, root, exts, ['_middleware']);
    const dynamic = routes.find((r) => r.path === '/users/:id' && r.methods.includes('PUT'));

    expect(dynamic).toBeDefined();
    expect(dynamic!.isDynamic).toBe(true);
    expect(dynamic!.params).toEqual(['id']);
  });

  it('静态路由 isDynamic 为假', () => {
    const routes = scanApiDirectory(root, root, exts, ['_middleware']);
    const users = routes.find((r) => r.path === '/users');

    expect(users!.isDynamic).toBe(false);
    expect(users!.methods).toEqual(['GET']);
  });

  it('handlerPath 是真实存在的文件', () => {
    const routes = scanApiDirectory(root, root, exts, []);

    for (const r of routes) {
      expect(isFile(r.handlerPath)).toBe(true);
    }
  });

  it('目录不存在 ⇒ 空数组（不抛）', () => {
    expect(scanApiDirectory(join(root, 'ghost'), root, exts, [])).toEqual([]);
  });
});
