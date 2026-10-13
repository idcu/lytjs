/**
 * @lytjs/ssg 测试
 *
 * ## P1-6 回归（2026-10-10）
 *
 * 此前本包的测试只断言「返回数组」「是 SSGGenerator 实例」—— 而实现是壳
 * （`outputPath: ''` + `success: true`，不渲染不写盘）⇒ **测试全绿但功能为零**。
 * 现在断言**真实产物**：文件路径 + HTML 内容 + 落盘。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SSGGenerator, generateStaticPages, validatePages } from '../src';
import type { SSGPage } from '../src';

/** 创建测试用 VNode */
function vnode(type: string, children: unknown): SSGPage['component'] {
  return { type, props: {}, children } as unknown as SSGPage['component'];
}

const tempDirs: string[] = [];
function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'lytjs-ssg-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('@lytjs/ssg', () => {
  it('generate() 应真正渲染出 HTML（而不是空 outputPath）', () => {
    const generator = new SSGGenerator({
      pages: [
        { path: '/', component: vnode('div', 'Home') },
        { path: '/about', component: vnode('div', 'About') },
      ],
    });

    const results = generator.generate();

    expect(results.length).toBe(2);
    for (const r of results) {
      expect(r.filePath).not.toBe('');
      expect(r.html.length).toBeGreaterThan(0);
    }
    const home = results.find((r) => r.filePath.includes('index.html'));
    expect(home?.html).toContain('Home');
  });

  it('write() 应真正把文件写到磁盘', async () => {
    const outDir = makeTempDir();
    const generator = new SSGGenerator({
      pages: [{ path: '/', component: vnode('div', 'Written') }],
      options: { outDir },
    });

    await generator.write();

    const file = join(outDir, 'index.html');
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf-8')).toContain('Written');
  });

  it('应再导出 @lytjs/ssr 的真实 SSG API（不再是本包自造的假实现）', () => {
    expect(typeof generateStaticPages).toBe('function');
    expect(typeof validatePages).toBe('function');
  });
});
