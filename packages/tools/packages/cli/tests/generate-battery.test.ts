/**
 * 行为级判据：`@lytjs/cli` 的**代码生成器**（`src/commands/generate.ts`，678 行）
 *
 * ## 为什么要有这条
 *
 * 该文件导出的 `generate()` 是 `lytjs generate` 命令的**全部实现**（~280 条语句未覆盖）。
 * 同目录的 `tests/template-validity.test.ts` 是**源码级断言**（读 `src/` 文本找错误模板内容），
 * **不执行 `generate()`** ⇒ 写盘路径、命名转换、选项矩阵全都没有判据。
 *
 * ## 手法
 *
 * `generate()` 把文件写到 `process.cwd()/basePath/...` ⇒ 每个用例 `chdir` 到一个临时目录，
 * 跑完再切回来（并清理）。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from '../src/commands/generate';

let workDir: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  workDir = mkdtempSync(join(tmpdir(), 'lytjs-gen-'));
  process.chdir(workDir);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const read = (rel: string): string => readFileSync(join(workDir, rel), 'utf8');

// ==================== 基本生成 ====================

describe('generate：组件', () => {
  it('默认生成 src/components/<kebab>.ts，且内容用 PascalCase 命名', async () => {
    await generate({ type: 'component', name: 'MyWidget' });

    const file = 'src/components/my-widget.ts';
    expect(existsSync(join(workDir, file))).toBe(true);
    const content = read(file);
    expect(content).toContain('MyWidget');
    expect(content).toContain('my-widget');
  });

  it('命名转换：user-profile ⇒ PascalCase / kebab-case 都对', async () => {
    await generate({ type: 'component', name: 'user-profile' });

    const file = 'src/components/user-profile.ts';
    expect(existsSync(join(workDir, file))).toBe(true);
    const content = read(file);
    expect(content).toContain('UserProfile');
    expect(content).toContain('user-profile');
  });

  it('命名转换：middleware 模板用 camelCase 作函数名', async () => {
    // `camelName` 只被 middleware 模板使用（组件模板用 pascal/kebab）
    await generate({ type: 'middleware', name: 'auth-guard' });

    const content = read('src/middleware/auth-guard.ts');
    expect(content).toContain('authGuardMiddleware');
  });

  it('path 选项改变输出目录', async () => {
    await generate({ type: 'component', name: 'A', path: './custom' });

    expect(existsSync(join(workDir, 'custom/components/a.ts'))).toBe(true);
  });

  it('重复生成会覆盖同名文件（不产生第二份）', async () => {
    await generate({ type: 'component', name: 'Dup', description: 'first' });
    await generate({ type: 'component', name: 'Dup', description: 'second' });

    expect(readdirSync(join(workDir, 'src/components'))).toEqual(['dup.ts']);
    expect(read('src/components/dup.ts')).toContain('second');
  });
});

// ==================== 选项矩阵 ====================

describe('generate：选项矩阵', () => {
  it('withStyles ⇒ 额外产出 .styles.css，且组件里 import 了它', async () => {
    await generate({ type: 'component', name: 'Styled', withStyles: true });

    expect(existsSync(join(workDir, 'src/components/styled.styles.css'))).toBe(true);
    expect(read('src/components/styled.ts')).toContain('./styled.styles.css');
  });

  it('withStyles + template=sfc ⇒ **不**产出 css（.lyt 自带样式块）', async () => {
    await generate({ type: 'component', name: 'SfcStyled', withStyles: true, template: 'sfc' });

    expect(existsSync(join(workDir, 'src/components/sfc-styled.styles.css'))).toBe(false);
  });

  it('language=js ⇒ 输出 .js 扩展名', async () => {
    await generate({ type: 'component', name: 'JsComp', language: 'js' });

    expect(existsSync(join(workDir, 'src/components/js-comp.js'))).toBe(true);
  });

  it('template=sfc ⇒ 输出 .lyt 且内容是 SFC 结构', async () => {
    await generate({ type: 'component', name: 'SfcComp', template: 'sfc' });

    const file = 'src/components/sfc-comp.lyt';
    expect(existsSync(join(workDir, file))).toBe(true);
    expect(read(file)).toContain('<template>');
  });

  it('page 类型文件名带 .page 后缀，目录为 pages', async () => {
    await generate({ type: 'page', name: 'Home' });

    expect(existsSync(join(workDir, 'src/pages/home.page.ts'))).toBe(true);
  });

  it('★ withStorybook 是**未实现**选项：必须显式警告，不得静默空操作', async () => {
    // `run.ts` 的帮助文本承诺「--storybook  Generate Storybook story file」，README 也写了；
    // 而 `generate()` 此前从不读取它 ⇒ 用户传了参数什么都不会发生、也没有提示。
    // 注：`logger.warning` 走的是 `console.log`（不是 console.warn），见 utils/logger.ts。
    const logSpy = vi.spyOn(console, 'log');

    await generate({ type: 'component', name: 'WithStory', withStorybook: true });

    const logged = logSpy.mock.calls.flat().join(' ');
    expect(logged).toContain('storybook');
    expect(logged).toContain('尚未实现');
    // 也不应假装产出了 story 文件
    expect(readdirSync(join(workDir, 'src/components')).some((f) => f.includes('stories'))).toBe(
      false,
    );
  });
});

// ==================== 全类型 smoke ====================

describe('generate：七种类型都能落盘', () => {
  const cases: Array<[Parameters<typeof generate>[0]['type'], string]> = [
    ['component', 'src/components/x.ts'],
    ['page', 'src/pages/x.page.ts'],
    ['service', 'src/services/x.ts'],
    ['hook', 'src/hooks/x.ts'],
    ['store', 'src/stores/x.ts'],
    ['layout', 'src/layouts/x.ts'],
    ['middleware', 'src/middleware/x.ts'],
  ];

  for (const [type, expected] of cases) {
    it(`${type} ⇒ ${expected}`, async () => {
      await generate({ type, name: 'X' });

      expect(existsSync(join(workDir, expected))).toBe(true);
      expect(read(expected).length).toBeGreaterThan(0);
    });
  }
});

// ==================== 未知类型 ====================

describe('generate：未知类型', () => {
  it('★ 未知类型应 process.exit(1) 且不写文件（不得继续往下走）', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`EXIT_${code}`);
    }) as never);

    await expect(generate({ type: 'nope' as never, name: 'X' })).rejects.toThrow(/EXIT_1/);

    expect(exitSpy).toHaveBeenCalledWith(1);
    // 不应产出任何代码文件（目录可能已被 ensureDir 建出来，但没有文件）
    const dir = join(workDir, 'src/components');
    if (existsSync(dir)) {
      expect(readdirSync(dir)).toEqual([]);
    }
  });
});
