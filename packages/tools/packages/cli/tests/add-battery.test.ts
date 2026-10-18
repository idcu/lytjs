/**
 * 行为级判据：`@lytjs/cli` 的 **add 命令**（`src/commands/add.ts`，359 行）
 *
 * `tests/index.test.ts` 里只有少量引用，**落盘路径 / 覆盖策略 / 未知类型**都没有判据。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { add } from '../src/commands/add';

let workDir: string;
let originalCwd: string;
let logs: string[];
let exits: number[];

beforeEach(() => {
  originalCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), 'lytjs-add-'));
  process.chdir(workDir);
  // `add` 要求当前目录是「LytJS 项目」
  writeFileSync(join(workDir, 'package.json'), JSON.stringify({ name: 'demo' }));
  logs = [];
  exits = [];
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
    logs.push(a.join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    logs.push(a.join(' '));
  });
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exits.push(code ?? 0);
    throw new Error(`EXIT_${code}`);
  }) as never);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const out = (): string => logs.join('\n');

describe('add：落盘与内容', () => {
  it('component ⇒ src/components/<name>.ts，且用 defineComponent + template 字符串', async () => {
    await add('component', 'MyComp');

    const file = join(workDir, 'src/components/MyComp.ts');
    expect(existsSync(file)).toBe(true);
    const content = readFileSync(file, 'utf8');
    expect(content).toContain('defineComponent');
    expect(content).toContain('MyComp');
    // 不用 .lyt（SFC 需要构建期插件，本仓无法编译）
    expect(content).not.toContain('<script setup>');
  });

  it('page ⇒ src/pages/<name>.ts，名称转 PascalCase', async () => {
    await add('page', 'user-list');

    const file = join(workDir, 'src/pages/user-list.ts');
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain('UserList');
  });

  it('八种类型各自落到约定目录（composable / hook 用 use<Pascal> 命名）', async () => {
    const cases: Array<[Parameters<typeof add>[0], string]> = [
      ['component', 'src/components/x-component.ts'],
      ['page', 'src/pages/x-page.ts'],
      ['store', 'src/stores/x-store.ts'],
      ['directive', 'src/directives/x-directive.ts'],
      ['composable', 'src/composables/useXComposable.ts'],
      ['util', 'src/utils/x-util.ts'],
      ['middleware', 'src/middleware/x-middleware.ts'],
      ['hook', 'src/hooks/useXHook.ts'],
    ];

    for (const [type, expected] of cases) {
      await add(type, `x-${type}`);
      expect(existsSync(join(workDir, expected)), `${type} ⇒ ${expected}`).toBe(true);
    }
  });
});

describe('add：守卫', () => {
  it('无 package.json ⇒ 友好报错并 exit(1)', async () => {
    rmSync(join(workDir, 'package.json'));

    await expect(add('component', 'A')).rejects.toThrow(/EXIT_1/);

    expect(out()).toContain('No package.json found');
  });

  it('★ 未知类型 ⇒ 必须走友好报错 + exit(1)，而不是抛 TypeError', async () => {
    // `resolveTargetDir(type)` 的 switch 无 default，且它在 `if (!template)` 守卫**之前**被调用
    // ⇒ 未知类型会先 `resolve(undefined)` 抛 TypeError，那条 'Unknown type' 报错永远走不到。
    await expect(add('nope' as never, 'X')).rejects.toThrow(/EXIT_1/);

    expect(out()).toContain('Unknown type');
  });

  it('同名文件已存在且无 force ⇒ **跳过**（warning），不覆盖', async () => {
    await add('component', 'Dup');
    const file = join(workDir, 'src/components/Dup.ts');
    const original = readFileSync(file, 'utf8');
    writeFileSync(file, '// hand-edited');

    await add('component', 'Dup');

    expect(readFileSync(file, 'utf8')).toBe('// hand-edited');
    expect(out()).toContain('File already exists');
    expect(original).not.toBe('// hand-edited');
  });

  it('force: true ⇒ 覆盖已有文件', async () => {
    const file = join(workDir, 'src/components/Force.ts');
    await add('component', 'Force');
    writeFileSync(file, '// hand-edited');

    await add('component', 'Force', { force: true });

    expect(readFileSync(file, 'utf8')).toContain('defineComponent');
  });
});
