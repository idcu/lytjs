#!/usr/bin/env node
/**
 * 门禁：脚手架产物自洽性（`lyt create`）
 *
 * ## 为什么需要这一项
 *
 * `lyt create` 是**用户接触本框架的前五分钟**。它生成的目录如果自相矛盾，
 * 用户看到的不是「一个 bug」，而是「这个框架不能用」，然后离开。
 *
 * 已有的 `tests/template-validity.test.ts` 是**源码级正则断言**（模板字符串里
 * 不许出现某个包名）。它能防住「写回错误包名」，但防不住：
 *
 *   · 模板 import 了 `@lytjs/reactivity`，而生成的 package.json 里没有它；
 *   · `server.ts` 取 `mod.default`，而 `entry-server.ts` 只导出 named `render`；
 *   · `index.html` 没有 `<!--app-html-->`，SSR 结果被整段丢弃；
 *   · `preview: "node server"` —— 用 node 跑 `.ts`；
 *   · `index.html` 引用 `/vite.svg`，但从不生成这个文件。
 *
 * 这些**只有把目录真的生成出来**才看得见。所以本门禁：生成 → 读产物 → 交叉校验。
 *
 * ## 2026-11-03 首次运行抓到的 7 个缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | store / full 模板 import `@lytjs/reactivity`，但依赖表里没有 | 生成项目 pnpm 装完构建即失败 |
 * | 2 | `entry-server.ts` 只有 named `render`，`server.ts` 只读 `.default` | 每个 SSR 请求 `entry.render is not a function` → 500 |
 * | 3 | SSR 的 `index.html` 没有 `<!--app-html-->` | `template.replace()` 空操作 ⇒ SSR 输出被丢弃，返回空壳 |
 * | 4 | `preview: "node server"` 指向 `.ts` | `npm run preview` 必失败 |
 * | 5 | 引用 `/vite.svg` 但从不生成 | 每个新项目开箱 404 |
 * | 6 | `tsconfig.include` 不含根目录 `server.ts` | 服务端入口**完全不做类型检查** |
 * | 7 | 开发模式创建 Vite 却从不挂载 `vite.middlewares` | `/src/entry-client.ts` 被当页面返回 HTML ⇒ 白屏、HMR 不通 |
 *
 * 另：SSR 静态文件用 `path.join(__dirname, url)` ⇒ `/assets/../../x.js` 可读项目外文件
 * （生成代码里自带目录穿越）；SSR 模板同时生成 `main.ts` 与 `entry-client.ts`，
 * 但只有后者被 index.html 引用 ⇒ 死文件。
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const ROOT_MODULES = join(ROOT, 'node_modules');
const BIN = join(ROOT_MODULES, '.bin');

/**
 * 让生成的项目能解析依赖。
 *
 * 生成目录在 /tmp 下，不在 workspace 里，pnpm 的 workspace 链接对它无效。
 * 与其在门禁里跑一次真实 `pnpm install`（分钟级、需要网络），不如把**本仓
 * 已装好的 node_modules** 链接进去 —— 这正好是「消费者能 import 到什么」的
 * 真实近似：`@lytjs/*` 指向各包（types 指向 dist），vite / tsx / typescript
 * 也都是仓库自带的版本，不会因为版本漂移产生假红/假绿。
 */
function linkNodeModules(dir) {
  const target = join(dir, 'node_modules');
  if (existsSync(target)) return;
  symlinkSync(ROOT_MODULES, target, 'dir');
}
const { generateProjectFiles } = await import(`${ROOT}/packages/tools/packages/cli/dist/index.mjs`);

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`   ✅ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`   ❌ ${name}`);
    if (detail !== undefined) {
      console.log(`         → ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }
  }
};
const section = (t) => console.log(`\n${t}`);

// ── 主仓事实 ──────────────────────────────────────────────
const repoVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')).version;

/** 本仓真实存在的包名 */
const repoNames = new Set();
(function collectPackages(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    const pkgPath = join(full, 'package.json');
    try {
      if (statSync(pkgPath).isFile())
        repoNames.add(JSON.parse(readFileSync(pkgPath, 'utf-8')).name);
    } catch {
      /* 没有 package.json 的目录 */
    }
    collectPackages(full);
  }
})(join(ROOT, 'packages'));

const NODE_BUILTINS = new Set([
  'fs',
  'path',
  'url',
  'http',
  'https',
  'crypto',
  'os',
  'stream',
  'util',
  'events',
  'child_process',
]);

const isBuiltin = (spec) => spec.startsWith('node:') || NODE_BUILTINS.has(spec);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

/** 解析相对导入到真实文件（`./App` → `src/App.ts`） */
function resolveRelative(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')];
  return candidates.some((c) => {
    try {
      return statSync(c).isFile();
    } catch {
      return false;
    }
  });
}

/** 收集一个生成项目的事实 */
function inspect(dir, template) {
  const files = walk(dir).map((f) => relative(dir, f).split(sep).join('/'));
  const read = (rel) => readFileSync(join(dir, rel), 'utf-8');
  const pkg = JSON.parse(read('package.json'));
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  const tsFiles = files.filter((f) => f.endsWith('.ts'));
  const bareImports = new Map(); // spec -> 第一个引用它的文件
  const unresolvedRelative = [];
  for (const file of tsFiles) {
    const code = read(file);
    for (const m of code.matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      if (spec.startsWith('.')) {
        if (!resolveRelative(join(dir, file), spec)) unresolvedRelative.push(`${file} → ${spec}`);
      } else if (!isBuiltin(spec)) {
        if (!bareImports.has(spec)) bareImports.set(spec, file);
      }
    }
  }

  const html = read('index.html');
  const scripts = html.match(/<script[^>]*src="([^"]+)"/g) ?? [];
  const scriptSrcs = scripts.map((s) => s.match(/src="([^"]+)"/)[1]);
  const assetRefs = [...html.matchAll(/(?:href|src)="(\/[^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => !p.startsWith('/src/'));

  return {
    dir,
    template,
    files,
    read,
    pkg,
    deps,
    tsFiles,
    bareImports,
    unresolvedRelative,
    html,
    scriptSrcs,
    assetRefs,
  };
}

// ── 生成所有模板 ──────────────────────────────────────────
const TEMPLATES = ['minimal', 'default', 'ssr', 'router', 'store', 'full'];
const projects = {};
const tempRoot = mkdtempSync(join(tmpdir(), 'lyt-scaffold-'));

try {
  for (const template of TEMPLATES) {
    const dir = join(tempRoot, template);
    generateProjectFiles(dir, `app-${template}`, template);
    // 生成目录在 /tmp，workspace 链接失效 ⇒ 链接本仓已安装的 node_modules
    linkNodeModules(dir);
    projects[template] = inspect(dir, template);
  }

  // ══════════════════════════════════════════════════════════
  section('[1] 产物文件集与引用完整性（每个模板）');
  for (const template of TEMPLATES) {
    const p = projects[template];
    check(
      `[${template}] package.json 可解析且 name 正确`,
      p.pkg.name === `app-${template}`,
      p.pkg.name,
    );
    check(`[${template}] type=module`, p.pkg.type === 'module', p.pkg.type);
    check(
      `[${template}] 有 index.html 与 vite.config.ts`,
      p.files.includes('index.html') && p.files.includes('vite.config.ts'),
    );

    // index.html 引用的入口必须存在
    const missingScripts = p.scriptSrcs.filter((src) => !p.files.includes(src.replace(/^\//, '')));
    check(`[${template}] index.html 的入口脚本存在`, missingScripts.length === 0, missingScripts);

    // index.html 引用的静态资源必须存在（/vite.svg → public/vite.svg）
    const missingAssets = p.assetRefs.filter((ref) => !p.files.includes(`public${ref}`));
    check(`[${template}] index.html 的静态资源存在`, missingAssets.length === 0, missingAssets);

    // 相对导入必须能解析
    check(
      `[${template}] 相对导入全部可解析`,
      p.unresolvedRelative.length === 0,
      p.unresolvedRelative,
    );

    // 生成的文本里不能有**未替换的插值**残留。
    // ⚠️ 不能直接禁 `\${`：生成的代码本身就有合法的模板字符串（`console.log(\`...\${PORT}\`)`）。
    // 这里只钉「插值没被替换」的确定形态。
    const leftover = p.tsFiles.filter((f) =>
      /\$\{\s*\}|\$\{undefined\}|\$\{null\}|\[object Object\]/.test(p.read(f)),
    );
    check(`[${template}] 无未替换的插值残留`, leftover.length === 0, leftover);

    const badPkgValue = Object.values(p.pkg.scripts ?? {}).filter(
      (v) => typeof v !== 'string' || v.includes('undefined'),
    );
    check(
      `[${template}] package.json 的 scripts 无 undefined`,
      badPkgValue.length === 0,
      badPkgValue,
    );
  }

  // ══════════════════════════════════════════════════════════
  section('[2] 依赖声明：import 了什么就必须声明什么');
  for (const template of TEMPLATES) {
    const p = projects[template];
    const undeclared = [...p.bareImports.keys()].filter((spec) => !p.deps[spec] && spec !== 'vite');
    check(`[${template}] 所有裸导入都已声明`, undeclared.length === 0, undeclared);

    const unknown = Object.keys(p.deps).filter(
      (name) => name.startsWith('@lytjs/') && !repoNames.has(name),
    );
    check(`[${template}] 声明的 @lytjs/* 包在本仓真实存在`, unknown.length === 0, unknown);

    const wrongVersion = Object.entries(p.deps).filter(
      ([name, ver]) => name.startsWith('@lytjs/') && ver !== `^${repoVersion}`,
    );
    check(
      `[${template}] @lytjs/* 版本与主仓一致（^${repoVersion}）`,
      wrongVersion.length === 0,
      wrongVersion,
    );
  }

  // ══════════════════════════════════════════════════════════
  section('[3] SSR 契约：server.ts 与 entry-server.ts 必须对得上');
  {
    const p = projects.ssr;
    const entryServer = p.read('src/entry-server.ts');
    const server = p.read('server.ts');

    check(
      'entry-server 有 default 导出（server.ts 读 .default）',
      /export\s+default\s*\{/.test(entryServer),
    );
    check(
      'entry-server 的 default 里有 render',
      /export\s+default\s*\{\s*render\s*\}/.test(entryServer),
    );
    check('server.ts 取 mod.default 并回落到命名空间', /mod\.default\s*\?\?\s*mod/.test(server));
    check('server.ts 调用 entry.render', /entry\.render\(/.test(server));

    check(
      'index.html 含 <!--app-html--> 占位（否则 SSR 输出被丢弃）',
      p.html.includes('<!--app-html-->'),
    );
    check('server.ts 会替换该占位符', /replace\(\s*'<!--app-html-->'/.test(server));

    check(
      'server.ts 挂载 vite.middlewares（否则开发模式白屏、HMR 不通）',
      /vite\.middlewares\(/.test(server),
    );
    check('server.ts 静态文件有目录穿越防护', /startsWith\(CLIENT_DIR/.test(server));
    check(
      'server.ts 不再用 path.join(__dirname, url) 直接拼请求路径',
      !/path\.join\(__dirname,\s*url\)/.test(server),
    );

    check(
      'SSR 模板只有 entry-client（没有多余的 main.ts 死文件）',
      p.files.includes('src/entry-client.ts') && !p.files.includes('src/main.ts'),
      p.files.filter((f) => f.startsWith('src/')),
    );
    check(
      'index.html 指向 entry-client',
      p.scriptSrcs.some((s) => s.includes('entry-client')),
    );

    check('tsconfig 的 include 覆盖根目录 server.ts', /"server\.ts"/.test(p.read('tsconfig.json')));

    // 脚本与产物目录必须一致
    check(
      'build:client 输出到 dist/client',
      /outDir:\s*'dist\/client'/.test(p.read('vite.config.ts')),
    );
    check(
      'build:server 输出到 dist/server',
      /--outDir\s+dist\/server/.test(p.pkg.scripts['build:server'] ?? ''),
    );
    check(
      'server.ts 读 dist/server/entry-server.js',
      /dist\/server\/entry-server\.js/.test(server),
    );

    const nodeOnTs = Object.entries(p.pkg.scripts).filter(([, cmd]) =>
      /^node\s+\S+\.ts\b/.test(cmd),
    );
    check('没有用 node 直接跑 .ts 的脚本（此前 preview 必失败）', nodeOnTs.length === 0, nodeOnTs);
    check(
      'preview 用 tsx 跑 server.ts',
      p.pkg.scripts.preview === 'tsx server.ts',
      p.pkg.scripts.preview,
    );
    check('tsx 已声明为 devDependency', typeof p.deps.tsx === 'string', p.deps.tsx);
  }

  // ══════════════════════════════════════════════════════════
  section('[4] 模板差异：每个模板只带自己需要的东西');
  {
    const minimal = projects.minimal;
    check('minimal 不含 vitest', minimal.deps.vitest === undefined);
    check('minimal 没有 test 脚本', minimal.pkg.scripts.test === undefined);

    check('ssr 声明 @lytjs/ssr', projects.ssr.deps['@lytjs/ssr'] === `^${repoVersion}`);

    for (const t of ['router', 'full']) {
      check(
        `[${t}] 有 pages/Home.ts 与 pages/About.ts`,
        projects[t].files.includes('src/pages/Home.ts') &&
          projects[t].files.includes('src/pages/About.ts'),
      );
      check(`[${t}] 声明 @lytjs/router`, projects[t].deps['@lytjs/router'] === `^${repoVersion}`);
    }

    for (const t of ['store', 'full']) {
      check(`[${t}] 有 stores/counter.ts`, projects[t].files.includes('src/stores/counter.ts'));
      check(`[${t}] 声明 @lytjs/store`, projects[t].deps['@lytjs/store'] === `^${repoVersion}`);
      check(
        `[${t}] 声明 @lytjs/reactivity（counter.ts 直接 import 它）`,
        projects[t].deps['@lytjs/reactivity'] === `^${repoVersion}`,
      );
    }

    check('full 声明 @lytjs/ui', projects.full.deps['@lytjs/ui'] === `^${repoVersion}`);
    check(
      'default 不带 router / store / ui',
      !projects.default.deps['@lytjs/router'] &&
        !projects.default.deps['@lytjs/store'] &&
        !projects.default.deps['@lytjs/ui'],
    );
  }

  // ══════════════════════════════════════════════════════════
  section('[5] 重复生成是幂等的（--force 语义）');
  {
    const dir = join(tempRoot, 'default');
    let threw = null;
    try {
      generateProjectFiles(dir, 'app-default', 'default');
    } catch (e) {
      threw = e;
    }
    check('对已有目录再次生成不抛错', threw === null, String(threw));
    const again = inspect(dir, 'default');
    check('二次生成后 package.json 仍可解析', again.pkg.name === 'app-default');
  }

  // ══════════════════════════════════════════════════════════
  section('[6] 生成的代码真的能通过 tsc --noEmit');
  //
  // 前 5 节都是**文本级**交叉校验：引用存在、依赖声明对得上。但它们看不见
  // 「类型层不成立」—— 例如 `components: { RouterLink }` 在运行时支持、
  // ComponentOptions 里却没这个字段 ⇒ 用户第一次 `tsc` 就撞 TS2353。
  // 所以这里对 6 个模板**真的跑一次编译器**。
  for (const template of TEMPLATES) {
    const p = projects[template];
    const result = spawnSync(join(BIN, 'tsc'), ['--noEmit', '-p', join(p.dir, 'tsconfig.json')], {
      cwd: p.dir,
      encoding: 'utf-8',
      timeout: 120_000,
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    check(
      `[${template}] tsc --noEmit 通过`,
      result.status === 0 && output === '',
      output.split('\n').slice(0, 10).join('\n') || `exit=${result.status}`,
    );
  }

  // ══════════════════════════════════════════════════════════
  section('[7] SSR 模板：真的启动服务，首页必须 200 且含预期内容');
  //
  // ⚠️ 2026-11-05 实测：模板只导出 `render` 而不注入模板编译器时，
  //   每个请求都 500；而 `entry-server` 只导出 named export 时，
  //   `mod.default` 是 undefined ⇒ `entry.render is not a function`。
  //   这两类缺陷文本校验看不出，必须**起进程 + 发请求**。
  {
    const p = projects.ssr;
    const port = 43_000 + Math.floor(Math.random() * 2_000);
    const child = spawn(join(BIN, 'tsx'), ['server.ts'], {
      cwd: p.dir,
      env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let spawnError = '';
    let earlyExit = null;
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    // ★ 2026-11-10（N15）：此前未监听 spawn error / 提前退出，进程起不来时
    //   while 会空转到 30s deadline，且 stdout/stderr 都空 ⇒ 偶发 3 条红却无从诊断。
    child.on('error', (e) => (spawnError = String(e)));
    const exited = new Promise((resolveExit) =>
      child.once('exit', (code) => {
        earlyExit = code;
        resolveExit(code);
      }),
    );

    let status = null;
    let body = '';
    let lastError = '';
    const deadline = Date.now() + 30_000;
    try {
      while (Date.now() < deadline) {
        // 进程已经挂了就别再空转，把诊断信息留给下面的断言
        if (spawnError || earlyExit !== null) break;
        try {
          // 单次 fetch 必须有超时：否则半开连接会把整个重试循环卡死
          const res = await fetch(`http://127.0.0.1:${port}/`, {
            signal: AbortSignal.timeout(2_000),
          });
          status = res.status;
          body = await res.text();
          // 拿到任何响应就停：渲染错误是确定性的，重试只会拖慢失败反馈
          break;
        } catch (e) {
          lastError = String(e);
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    } finally {
      child.kill('SIGTERM');
      await Promise.race([exited, new Promise((r) => setTimeout(r, 3_000))]);
      if (child.exitCode === null) child.kill('SIGKILL');
    }

    const diagnostics = [
      spawnError,
      earlyExit === null ? '' : `server exited early (code=${earlyExit})`,
      stderr.trim(),
      stdout.trim(),
    ]
      .filter(Boolean)
      .join(' | ');

    check(
      '服务器启动并打印监听日志',
      /running at http:\/\/localhost:/.test(stdout),
      diagnostics || '(无输出)',
    );
    check(`首页返回 200（实际 ${status ?? '无响应'}）`, status === 200, lastError || diagnostics);
    check(
      '首页包含 App 的期望文本 "Hello LytJS!"',
      body.includes('Hello LytJS!'),
      body.slice(0, 200),
    );
    check(
      '服务端渲染没有报错',
      !/SSR Error/.test(`${stdout}${stderr}`),
      `${stdout}${stderr}`.trim(),
    );
  }

  // ══════════════════════════════════════════════════════════
  section('[8] 未知模板必须报错，不许静默回退 default');
  //
  // ⚠️ 2026-11-05：此前未知模板直接落进 default 分支 —— 用户以为自己
  //   选了模板，其实拿到的是另一个骨架，且没有任何提示。
  {
    const dir = join(tempRoot, 'unknown');
    let thrown = null;
    try {
      generateProjectFiles(dir, 'app-unknown', 'nope');
    } catch (e) {
      thrown = e;
    }
    check('未知模板抛错', thrown instanceof Error, String(thrown));
    check('未知模板不产生半成品目录', !existsSync(dir), dir);
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
