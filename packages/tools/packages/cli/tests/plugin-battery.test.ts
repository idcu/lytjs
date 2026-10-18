/**
 * 行为级判据：`@lytjs/cli` 的**插件命令**（`src/commands/plugin.ts`，497 行）
 *
 * ## 为什么要有这条
 *
 * `createPlugin` / `buildPlugin` / `validatePlugin` / `listPluginTemplates` 四个导出
 * 此前**一条判据都没有**（`tests/index.test.ts` 只引用 `run` / `create` / `add`）。
 * 本轮先覆盖**纯逻辑**的 `validatePlugin`：它只读文件、不调外部进程，且校验规则的
 * 「退出码 / 提示」组合最容易出错。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validatePlugin, createPlugin } from '../src/commands/plugin';

let workDir: string;
let originalCwd: string;
let logs: string[];
let exits: number[];

beforeEach(() => {
  originalCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), 'lytjs-plugin-'));
  process.chdir(workDir);
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

/** 写一个「合法」的插件骨架 */
const writeValidPlugin = (pkgOver: Record<string, unknown> = {}): void => {
  writeFileSync(
    join(workDir, 'package.json'),
    JSON.stringify({
      name: '@lytjs/plugin-demo',
      version: '1.0.0',
      main: './dist/index.cjs',
      module: './dist/index.mjs',
      types: './dist/index.d.ts',
      exports: { '.': {} },
      keywords: ['lytjs'],
      peerDependencies: { '@lytjs/core': '^6.0.0' },
      ...pkgOver,
    }),
  );
  mkdirSync(join(workDir, 'src'), { recursive: true });
  writeFileSync(
    join(workDir, 'src/index.ts'),
    "import { definePlugin } from '@lytjs/core';\nexport default definePlugin({});\n",
  );
  writeFileSync(join(workDir, 'tsconfig.json'), '{}');
  writeFileSync(join(workDir, 'tsup.config.ts'), 'export default {};\n');
};

// ==================== 通过 ====================

describe('validatePlugin：通过', () => {
  it('完整合法的插件 ⇒ 成功且不退出', async () => {
    writeValidPlugin();

    await expect(validatePlugin()).resolves.toBeUndefined();

    expect(exits).toEqual([]);
    expect(out()).toContain('passed');
  });
});

// ==================== 硬性错误 ====================

describe('validatePlugin：硬性错误 ⇒ exit(1)', () => {
  it('缺 package.json', async () => {
    await expect(validatePlugin()).rejects.toThrow(/EXIT_1/);
    expect(out()).toContain('package.json not found');
  });

  it('package.json 非法 JSON', async () => {
    writeFileSync(join(workDir, 'package.json'), '{ not json');

    await expect(validatePlugin()).rejects.toThrow(/EXIT_1/);
    expect(out()).toContain('Invalid JSON');
  });

  it('缺必需字段（name/version/main/module/types）逐个报出', async () => {
    writeValidPlugin({ name: '', version: '', main: '', module: '', types: '' });

    await expect(validatePlugin()).rejects.toThrow(/EXIT_1/);
    for (const field of ['name', 'version', 'main', 'module', 'types']) {
      expect(out()).toContain(`${field} is required`);
    }
  });

  it('缺 @lytjs/core peerDependency', async () => {
    writeValidPlugin({ peerDependencies: {} });

    await expect(validatePlugin()).rejects.toThrow(/EXIT_1/);
    expect(out()).toContain('@lytjs/core peerDependency is required');
  });

  it('缺 src 目录 / src/index.ts', async () => {
    writeValidPlugin();
    rmSync(join(workDir, 'src'), { recursive: true, force: true });

    await expect(validatePlugin()).rejects.toThrow(/EXIT_1/);
    expect(out()).toContain('src directory not found');
  });
});

// ==================== 警告 ====================

describe('validatePlugin：仅警告', () => {
  const writeWarnOnly = (): void => {
    writeValidPlugin();
    // 制造警告：去掉 exports / keywords，删掉 tsconfig 与 tsup，index.ts 不含 definePlugin
    writeFileSync(
      join(workDir, 'package.json'),
      JSON.stringify({
        name: '@lytjs/plugin-demo',
        version: '1.0.0',
        main: './dist/index.cjs',
        module: './dist/index.mjs',
        types: './dist/index.d.ts',
        peerDependencies: { '@lytjs/core': '^6.0.0' },
      }),
    );
    writeFileSync(join(workDir, 'src/index.ts'), 'const x = 1;\n');
    rmSync(join(workDir, 'tsconfig.json'));
    rmSync(join(workDir, 'tsup.config.ts'));
  };

  it('默认：仅警告时**通过**（exit 0），且警告被打印', async () => {
    writeWarnOnly();

    await expect(validatePlugin()).resolves.toBeUndefined();

    expect(exits).toEqual([]);
    expect(out()).toContain('Warnings');
    expect(out()).toContain('exports field is recommended');
  });

  it('★ strict：仅警告时 exit(1)，且**必须把警告打出来**（失败要可解释）', async () => {
    writeWarnOnly();

    await expect(validatePlugin({ strict: true })).rejects.toThrow(/EXIT_1/);

    expect(exits).toEqual([1]);
    // 修复前：strict 下 warnings 被 `!options.strict` 挡掉 ⇒ 用户看不到任何原因
    expect(out()).toContain('exports field is recommended');
  });

  it('★ warningsAsErrors：仅警告时也必须 exit(1)（修复前该选项完全无效）', async () => {
    writeWarnOnly();

    await expect(validatePlugin({ warningsAsErrors: true })).rejects.toThrow(/EXIT_1/);

    expect(exits).toEqual([1]);
    expect(out()).toContain('exports field is recommended');
  });
});

// ==================== createPlugin ====================
// ⚠️ 一律传 `skipInstall: true` —— 否则它会 `execSync('pnpm install')`（真实网络/耗时）。

describe('createPlugin', () => {
  it('默认模板：生成插件骨架，package.json 名为 @lytjs/plugin-<name>', async () => {
    await createPlugin('demo', { skipInstall: true });

    const pkgPath = join(workDir, 'demo', 'package.json');
    expect(existsSync(pkgPath)).toBe(true);
    expect(existsSync(join(workDir, 'demo', 'src/index.ts'))).toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name: string };
    expect(pkg.name).toBe('@lytjs/plugin-demo');
  });

  it('三种模板都能生成', async () => {
    for (const template of ['default', 'minimal', 'withConfig']) {
      await createPlugin(`p-${template}`, { template, skipInstall: true });
      expect(existsSync(join(workDir, `p-${template}`, 'package.json'))).toBe(true);
    }
  });

  it('★ 目标目录非空且无 force ⇒ exit(1)，且不覆盖既有文件', async () => {
    mkdirSync(join(workDir, 'occupied'), { recursive: true });
    writeFileSync(join(workDir, 'occupied/keep.txt'), 'original');

    await expect(createPlugin('occupied', { skipInstall: true })).rejects.toThrow(/EXIT_1/);

    expect(exits).toEqual([1]);
    expect(readFileSync(join(workDir, 'occupied/keep.txt'), 'utf8')).toBe('original');
  });

  it('force: true ⇒ 允许写入非空目录', async () => {
    mkdirSync(join(workDir, 'occupied2'), { recursive: true });
    writeFileSync(join(workDir, 'occupied2/keep.txt'), 'original');

    await createPlugin('occupied2', { skipInstall: true, force: true });

    expect(existsSync(join(workDir, 'occupied2/package.json'))).toBe(true);
    expect(existsSync(join(workDir, 'occupied2/keep.txt'))).toBe(true);
  });

  it('未知模板 ⇒ exit(1) 且不建目录', async () => {
    await expect(createPlugin('bad', { template: 'nope', skipInstall: true })).rejects.toThrow(
      /EXIT_1/,
    );

    expect(existsSync(join(workDir, 'bad'))).toBe(false);
  });
});
