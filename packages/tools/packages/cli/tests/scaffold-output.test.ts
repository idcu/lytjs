/**
 * 脚手架**产物**自洽性（2026-11-03）
 *
 * `template-validity.test.ts` 是源码级正则断言（模板字符串里不许出现某包名）；
 * 本文件把目录**真的生成出来**再交叉校验 —— 「模板字符串写对了」不等于「生成的项目能用」。
 *
 * 对应门禁：`scripts/check-scaffold.mjs`（6 个模板 × 101 条断言）。
 */
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { generateProjectFiles } from '../src';

const roots: string[] = [];

/** 每个模板只生成一次（生成 6 个模板约 2s，重复生成会把用例拖到超时） */
const cache = new Map<string, ReturnType<typeof generateOnce>>();

function generate(template: string) {
  let cached = cache.get(template);
  if (!cached) {
    cached = generateOnce(template);
    cache.set(template, cached);
  }
  return cached;
}

function generateOnce(template: string) {
  const dir = mkdtempSync(join(tmpdir(), `lyt-scaffold-test-${template}-`));
  roots.push(dir);
  generateProjectFiles(dir, `app-${template}`, template);

  const files: string[] = [];
  (function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(relative(dir, full));
    }
  })(dir);

  const read = (rel: string) => readFileSync(join(dir, rel), 'utf-8');
  const pkg = JSON.parse(read('package.json'));
  return { dir, files, read, pkg, deps: { ...pkg.dependencies, ...pkg.devDependencies } };
}

const resolveRelative = (fromFile: string, spec: string) => {
  const base = join(dirname(fromFile), spec);
  return [base, `${base}.ts`, join(base, 'index.ts')].some((c) => {
    try {
      return statSync(c).isFile();
    } catch {
      return false;
    }
  });
};

afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

describe('脚手架产物', () => {
  it('每个模板的相对导入都能解析到真实文件', () => {
    for (const template of ['minimal', 'default', 'ssr', 'router', 'store', 'full']) {
      const p = generate(template);
      const broken: string[] = [];
      for (const file of p.files.filter((f) => f.endsWith('.ts'))) {
        for (const m of p.read(file).matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
          if (!resolveRelative(join(p.dir, file), m[1]!)) broken.push(`${file} → ${m[1]}`);
        }
      }
      expect(broken, `${template} 模板`).toEqual([]);
    }
  }, 20_000);

  it('store / full 模板声明了 @lytjs/reactivity（counter.ts 直接 import 它）', () => {
    for (const template of ['store', 'full']) {
      const p = generate(template);
      expect(p.deps['@lytjs/reactivity'], template).toBe('^6.9.6');
    }
  });

  it('index.html 引用的静态资源真实存在', () => {
    const p = generate('default');
    expect(p.files).toContain('public/vite.svg');
  });

  it('SSR：index.html 含 app-html 占位，server.ts 会替换它', () => {
    const p = generate('ssr');
    expect(p.read('index.html')).toContain('<!--app-html-->');
    expect(p.read('server.ts')).toContain("replace('<!--app-html-->'");
  });

  it('SSR：entry-server 的 default 导出与 server.ts 的读取方式一致', () => {
    const p = generate('ssr');
    expect(p.read('src/entry-server.ts')).toContain('export default { render }');
    expect(p.read('server.ts')).toContain('mod.default ?? mod');
  });

  it('SSR：开发模式挂载 vite.middlewares（否则白屏、HMR 不通）', () => {
    const p = generate('ssr');
    expect(p.read('server.ts')).toContain('vite.middlewares(');
  });

  it('SSR：静态文件解析有目录穿越防护', () => {
    const p = generate('ssr');
    expect(p.read('server.ts')).toContain('startsWith(CLIENT_DIR');
  });

  it('SSR：不再生成多余的 main.ts（index.html 只引用 entry-client）', () => {
    const p = generate('ssr');
    expect(p.files).toContain('src/entry-client.ts');
    expect(p.files).not.toContain('src/main.ts');
    expect(p.read('index.html')).toContain('/src/entry-client.ts');
  });

  it('SSR：tsconfig 覆盖根目录 server.ts，且产物目录与脚本一致', () => {
    const p = generate('ssr');
    expect(JSON.parse(p.read('tsconfig.json')).include).toContain('server.ts');
    expect(p.read('vite.config.ts')).toContain("outDir: 'dist/client'");
    expect(p.pkg.scripts['build:server']).toContain('--outDir dist/server');
  });

  it('没有任何脚本用 node 直接跑 .ts', () => {
    const p = generate('ssr');
    const offenders = Object.entries(p.pkg.scripts).filter(([, cmd]) =>
      /^node\s+\S+\.ts\b/.test(String(cmd)),
    );
    expect(offenders).toEqual([]);
    expect(p.pkg.scripts.preview).toBe('tsx server.ts');
  });

  it('minimal 模板不带 vitest 与 test 脚本', () => {
    const p = generate('minimal');
    expect(p.deps.vitest).toBeUndefined();
    expect(p.pkg.scripts.test).toBeUndefined();
  });

  it('对已有目录重复生成是幂等的', () => {
    const p = generate('default');
    expect(() => generateProjectFiles(p.dir, 'app-default', 'default')).not.toThrow();
    expect(JSON.parse(readFileSync(join(p.dir, 'package.json'), 'utf-8')).name).toBe('app-default');
  });
});
