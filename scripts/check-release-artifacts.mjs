#!/usr/bin/env node
/**
 * scripts/check-release-artifacts.mjs
 * 发布物验收：验证「npm 上装下来的东西」，而不是仓内源码/dist 的自身一致性。
 *
 * 流程（全部在 os.tmpdir 的隔离目录完成，不触碰工作树）：
 *   1. 对发布集 76 包执行 `pnpm -r pack`（workspace:* 在此被替换为真实版本）；
 *   2. 在干净目录 `npm install --offline` 全部 tarball（file:，不连 registry）；
 *   3. 静态：tarball 内 exports/main/module/types 指向的文件必须真实存在；
 *   4. 运行时：逐 subpath `import.meta.resolve` + `import()`（package.json 用 import 属性），
 *      声明了 require 条件的再跑 `require()`；
 *   5. 资产类（target 以 `.css` 结尾，按扩展名判定、不看包名）：只验 resolve +
 *      esbuild 副作用导入，**不**给 CSS 补 .d.ts（类型谎言换绿灯）；
 *   6. 类型：生成消费文件 `import * as` 全部非资产/JSON subpath，`tsc --noEmit`。
 *
 * 任何 resolve 失败、types 缺失、require 不通、tarball 缺文件 ⇒ exit 1。
 * 负控：把任一 package.json 的 exports 指向不存在的文件 ⇒ 本门禁必须红。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getReleasePackages, ROOT } from './release-set.mjs';

const KEEP = process.argv.includes('--keep');
const fail = [];
const note = (kind, detail) => fail.push({ kind, detail });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lytjs-release-artifacts-'));
const tarballDir = path.join(tmp, 'tarballs');
const consumer = path.join(tmp, 'consumer');
fs.mkdirSync(tarballDir, { recursive: true });
fs.mkdirSync(consumer, { recursive: true });

const t = () => Date.now();
const fmt = (ms) => `${(ms / 1000).toFixed(1)}s`;
const timings = {};

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    encoding: 'utf8',
    timeout: opts.timeout ?? 300000,
    maxBuffer: 32 * 1024 * 1024,
    env: {
      ...process.env,
      PATH: `${path.join(ROOT, 'node_modules', '.bin')}:${process.env.PATH ?? ''}`,
    },
  });
}

function leafPaths(exp) {
  if (typeof exp === 'string') return [{ condition: 'string', target: exp }];
  if (Array.isArray(exp))
    return exp.flatMap((e, i) =>
      leafPaths(e).map((l) => ({ ...l, condition: `${l.condition}[${i}]` })),
    );
  if (exp && typeof exp === 'object') {
    const out = [];
    for (const [k, v] of Object.entries(exp)) {
      for (const l of leafPaths(v))
        out.push({
          condition: k + (l.condition === 'string' ? '' : `/${l.condition}`),
          target: l.target,
        });
    }
    return out;
  }
  return [];
}

const packages = getReleasePackages();
console.log(`发布集 ${packages.length} 包；隔离目录 ${tmp}`);

try {
  // ---------- 1. pack ----------
  let started = t();
  const filters = packages.flatMap((p) => ['--filter', p.name]);
  const packed = run(
    'corepack',
    ['pnpm', '-r', ...filters, 'pack', '--pack-destination', tarballDir],
    { timeout: 300000 },
  );
  timings.pack = t() - started;
  if (packed.status !== 0) {
    note(
      'pack',
      `pnpm pack 退出码 ${packed.status}\n${(packed.stderr || packed.stdout || '').slice(-2000)}`,
    );
  }

  const tarballs = [];
  for (const p of packages) {
    const file = path.join(
      tarballDir,
      `${p.name.replace('@', '').replace('/', '-')}-${p.version}.tgz`,
    );
    if (!fs.existsSync(file))
      note('pack-missing', `${p.name}@${p.version} 未产出 ${path.basename(file)}`);
    else tarballs.push({ ...p, tarball: file });
  }
  console.log(`[pack] ${tarballs.length}/${packages.length} tarball，${fmt(timings.pack)}`);
  if (tarballs.length !== packages.length) throw new Error('pack 不完整，终止后续矩阵');

  // ---------- 2. install ----------
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ name: 'lytjs-release-artifacts-smoke', private: true, type: 'module' }),
  );
  started = t();
  const installed = run(
    'npm',
    [
      'install',
      '--offline',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
      ...tarballs.map((p) => p.tarball),
    ],
    { cwd: consumer, timeout: 300000 },
  );
  timings.install = t() - started;
  if (installed.status !== 0) {
    note(
      'install',
      `npm install 退出码 ${installed.status}\n${(installed.stderr || installed.stdout || '').slice(-2000)}`,
    );
    throw new Error('隔离安装失败，终止后续矩阵');
  }
  const installedCount = packages.filter((p) =>
    fs.existsSync(path.join(consumer, 'node_modules', ...p.name.split('/'), 'package.json')),
  ).length;
  if (installedCount !== packages.length)
    note('install-missing', `node_modules 中只有 ${installedCount}/${packages.length} 个包`);
  console.log(`[install] ${installedCount}/${packages.length} 包，${fmt(timings.install)}`);

  // ---------- 3. 静态：tarball 文件清单 ----------
  started = t();
  const entries = [];
  for (const p of tarballs) {
    const list = run('tar', ['-tzf', p.tarball]);
    if (list.status !== 0) {
      note('tarball', `${p.name} 无法读取文件清单：${(list.stderr || '').trim()}`);
      continue;
    }
    const files = new Set(
      list.stdout
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.replace(/^package\//, '')),
    );
    const raw = run('tar', ['-xzOf', p.tarball, 'package/package.json']);
    if (raw.status !== 0) {
      note('tarball', `${p.name} 的 package.json 无法读取`);
      continue;
    }
    const pj = JSON.parse(raw.stdout);
    if (pj.version !== p.version)
      note('version', `${p.name} tarball 版本 ${pj.version} ≠ 工作区 ${p.version}`);
    if (!Array.isArray(pj.files) || !pj.files.some((f) => f === 'dist' || f.startsWith('dist/'))) {
      note('files', `${p.name} 的 files 未包含 dist：${JSON.stringify(pj.files)}`);
    }
    for (const field of ['main', 'module', 'types']) {
      if (pj[field] && !files.has(pj[field].replace(/^\.\//, ''))) {
        note('missing-target', `${p.name} 的 ${field} → ${pj[field]} 不在 tarball 内`);
      }
    }
    const uses = new Set();
    for (const [sub, exp] of Object.entries(pj.exports || {})) {
      const leaves = leafPaths(exp);
      for (const l of leaves) {
        if (!l.target.startsWith('./')) continue;
        const rel = l.target.slice(2);
        if (!files.has(rel))
          note(
            'missing-target',
            `${p.name} exports['${sub}'] (${l.condition}) → ${l.target} 不在 tarball 内`,
          );
      }
      const spec = p.name + (sub === '.' ? '' : sub.slice(1));
      const targets = leaves.map((l) => l.target);
      const isAsset = targets.length > 0 && targets.every((x) => x.endsWith('.css'));
      const ext = isAsset ? '.css' : '.js';
      if (isAsset) console.log(`  [asset] ${spec} -> ${targets[0]} (${ext})`);
      entries.push({
        name: p.name,
        spec,
        sub,
        targets,
        ext,
        isAsset,
        hasRequire: leaves.some(
          (l) => l.condition === 'require' || l.condition.includes('/require'),
        ),
      });
      if (sub !== '.') uses.add(sub);
    }
    if (Object.keys(pj.exports || {}).length === 0 && pj.main) {
      entries.push({
        name: p.name,
        spec: p.name,
        sub: '.',
        targets: [pj.main],
        ext: '.js',
        isAsset: false,
        hasRequire: !!pj.main.endsWith('.cjs'),
      });
    }
  }
  timings.static = t() - started;
  console.log(`[static] ${entries.length} 条 subpath，${fmt(timings.static)}`);

  // ---------- 4. 运行时矩阵 ----------
  started = t();
  fs.writeFileSync(path.join(consumer, 'entries.json'), JSON.stringify(entries));
  fs.writeFileSync(
    path.join(consumer, '_probe.mjs'),
    `import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const entries = JSON.parse(fs.readFileSync(new URL('./entries.json', import.meta.url), 'utf8'));
const resolveCodes = new Set(['ERR_MODULE_NOT_FOUND','ERR_PACKAGE_PATH_NOT_EXPORTED','ERR_UNSUPPORTED_DIR_IMPORT','ERR_INVALID_PACKAGE_TARGET','ERR_INVALID_MODULE_SPECIFIER','MODULE_NOT_FOUND','ERR_REQUIRE_ESM']);
const out = [];
for (const e of entries) {
  let resolved = null, resolveErr = null;
  try { resolved = import.meta.resolve(e.spec); } catch (err) { resolveErr = { code: err.code || '', message: err.message }; }
  const fileExt = resolved ? (new URL(resolved).pathname.match(/\\.[^./]+$/) || [''])[0] : '';
  let importOk = null, importErr = null;
  if (!resolveErr && !e.isAsset) {
    try {
      if (fileExt === '.json') await import(e.spec, { with: { type: 'json' } });
      else await import(e.spec);
      importOk = true;
    } catch (err) {
      importErr = { code: err.code || '', message: String(err.message).slice(0, 600), kind: resolveCodes.has(err.code) ? 'resolve' : 'eval' };
    }
  }
  let requireOk = null, requireErr = null;
  if (e.hasRequire) {
    try { require(e.spec); requireOk = true; }
    catch (err) { requireErr = { code: err.code || '', message: String(err.message).slice(0, 600), kind: resolveCodes.has(err.code) ? 'resolve' : 'eval' }; }
  }
  out.push({ spec: e.spec, fileExt, isAsset: e.isAsset, resolveErr, importOk, importErr, requireOk, requireErr });
}
process.stdout.write(JSON.stringify(out));
process.exit(0);
`,
  );
  const probe = run('node', [path.join(consumer, '_probe.mjs')], {
    cwd: consumer,
    timeout: 180000,
  });
  timings.runtime = t() - started;
  let runtime = [];
  if (probe.status !== 0) {
    note('runtime', `子进程退出码 ${probe.status}\n${(probe.stderr || '').slice(-2000)}`);
  } else {
    try {
      runtime = JSON.parse(probe.stdout);
    } catch {
      note('runtime', '探针输出不是 JSON');
    }
  }
  for (const r of runtime) {
    if (r.resolveErr) note('resolve', `${r.spec}：${r.resolveErr.code} ${r.resolveErr.message}`);
    if (r.importErr)
      note(
        r.importErr.kind === 'resolve' ? 'resolve' : 'eval',
        `${r.spec}：${r.importErr.code} ${r.importErr.message}`,
      );
    if (r.requireErr)
      note(
        r.requireErr.kind === 'resolve' ? 'require' : 'require-eval',
        `${r.spec}：${r.requireErr.code} ${r.requireErr.message}`,
      );
  }
  const resolvedCount = runtime.filter((r) => !r.resolveErr).length;
  const imported = runtime.filter((r) => r.importOk === true).length;
  const required = runtime.filter((r) => r.requireOk === true).length;
  console.log(
    `[runtime] resolve ${resolvedCount}/${entries.length}，import ${imported}，require ${required}，${fmt(timings.runtime)}`,
  );

  // ---------- 4b. 资产类：esbuild 副作用导入 ----------
  started = t();
  const assets = runtime.filter((r) => r.isAsset);
  const esbuild = path.join(ROOT, 'node_modules', '.bin', 'esbuild');
  for (const a of assets) {
    if (!fs.existsSync(esbuild)) {
      console.log(`  [asset] ${a.spec}：esbuild 不可用，仅验 resolve`);
      continue;
    }
    const entry = path.join(consumer, '_asset-entry.mjs');
    const outfile = path.join(consumer, '_asset-out.mjs');
    fs.writeFileSync(entry, `import '${a.spec}';\n`);
    const built = run(
      esbuild,
      [
        entry,
        '--bundle',
        '--format=esm',
        `--outfile=${outfile}`,
        '--loader:.css=css',
        '--log-level=error',
      ],
      { cwd: consumer, timeout: 60000 },
    );
    if (built.status !== 0)
      note('asset-import', `${a.spec} 的副作用导入打包失败：${(built.stderr || '').slice(-800)}`);
  }
  timings.asset = t() - started;
  console.log(`[asset] ${assets.length} 条 CSS subpath 副作用导入，${fmt(timings.asset)}`);

  // ---------- 5. 类型 ----------
  started = t();
  const lines = [];
  let i = 0;
  for (const e of entries) {
    if (e.sub === './package.json' || e.targets.every((x) => x.endsWith('.json'))) continue;
    if (e.isAsset) lines.push(`import '${e.spec}';`);
    else lines.push(`import * as m${i++} from '${e.spec}';`);
  }
  lines.push('export {};');
  fs.writeFileSync(path.join(consumer, 'typecheck.ts'), lines.join('\n') + '\n');
  fs.writeFileSync(
    path.join(consumer, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: false,
          noEmit: true,
          skipLibCheck: true,
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          types: [],
        },
        include: ['typecheck.ts'],
      },
      null,
      2,
    ),
  );
  const tsc = path.join(ROOT, 'node_modules', '.bin', 'tsc');
  const typed = run(tsc, ['-p', 'tsconfig.json'], { cwd: consumer, timeout: 300000 });
  timings.types = t() - started;
  if (typed.status !== 0)
    note(
      'types',
      `tsc --noEmit 退出码 ${typed.status}\n${(typed.stdout || typed.stderr || '').slice(0, 4000)}`,
    );
  console.log(
    `[types] ${i} 个命名空间导入 + ${lines.length - i - 1} 个副作用导入，${fmt(timings.types)}`,
  );
} catch (err) {
  note('fatal', err.message);
} finally {
  timings.total =
    timings.pack +
    timings.install +
    timings.static +
    timings.runtime +
    timings.asset +
    timings.types;
  console.log(
    `\n耗时：pack ${fmt(timings.pack ?? 0)} / install ${fmt(timings.install ?? 0)} / static ${fmt(timings.static ?? 0)} / runtime ${fmt(timings.runtime ?? 0)} / asset ${fmt(timings.asset ?? 0)} / types ${fmt(timings.types ?? 0)} / total ${fmt(timings.total ?? 0)}`,
  );
  if (KEEP) console.log(`保留隔离目录：${tmp}`);
  else fs.rmSync(tmp, { recursive: true, force: true });
}

if (fail.length > 0) {
  console.error(`\n❌ 发布阻断：${fail.length} 条`);
  for (const f of fail) console.error(`  - [${f.kind}] ${f.detail}`);
  process.exit(1);
}
console.log(
  '\n✅ 发布物验收通过：tarball 文件清单、exports/types/require、隔离安装、运行时解析全部成立',
);
