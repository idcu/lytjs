#!/usr/bin/env node
/**
 * scripts/check-negative-controls.mjs
 *
 * 门禁负控框架（S05）
 *
 * ## 为什么需要它
 *
 * 「门禁是绿的」本身不构成证据 —— 绿可能只是**判据没生效**（漏检、路径写错、
 * 命令没跑起来）。负控（negative control）就是给门禁做一次**注入实验**：
 * 故意制造一个违规，门禁必须转红；随后恢复现场，门禁必须回绿。
 *
 * 已登记负控：
 *   - `check-deps`            包依赖方向（S02）：往 common 包塞 component 依赖 → 必红
 *   - `check-package-deps`    依赖声明完整性（S03）：塞一个未声明的运行时 re-export → 必红
 *   - `check-controlled-props` 受控组件：把 UI dist 的 `current` 受控读取改成常量 → 必红
 *   - `check-ui-styles`        样式覆盖：塞一个未在 CSS 里出现的静态类名 → 必红
 *   - `check-release-parity`  发布一致性：改一个包版本 → 「76 包版本一致」判据必红
 *   - `check-release-workflow` 发布 workflow 平台：删掉 `[no-ci-release]` 标记 → 必红
 *   - `check-script-refs`     零引用脚本棘轮（S20）：新增一个零引用脚本 → 必红
 *   - `check-as-unknown`      as unknown as 棘轮（S22）：多写一处 → 必红
 *   - `check-api-snapshot`    API 快照（S22）：删掉一个导出名 → 必红
 *   - `check-lockfile`        锁文件一致性：声明一个锁文件里没有的依赖 → 必红
 *   - `check-build-order`     构建顺序：从 BUILD_ORDER 删掉一条 → 必红
 *   - `check-render-parity`   三模式写入：关掉属性安全检查 → 必红
 *   - `check-list-diff`       keyed 对拍：让 signal 路径丢失 key 匹配 → 必红
 *   - `check-public-names`    公开名登记册：多写一处同名实现 → 必红
 *   - `check-keel-wiring`     keel CI：删掉 test-lint 关卡 → 必红
 *   - `check-e2e-assertions`  e2e 断言强度：新增 toBeDefined() → 必红
 *   - `check-src-hygiene`     源码卫生：新增 console.log 文件 → 必红
 *   - `check-examples`        示例可用性：引用不存在的 @lytjs 包 → 必红
 *   - `check-dist-freshness`  产物新鲜度：把 src 改成比 dist 新 → 必红
 *   - `check-dead-packages`   死包棘轮：新增一个零引用 common 包 → 必红
 *   - `check-vitest-alias-dist` 测试 alias：加一条指向不存在路径的 alias → 必红
 *   - `check-doc-imports`     文档 import：guide 里写一个不存在的导出名 → 必红
 *   - `check-ui-props-wiring` UI props：新增一个声明了却没引用的 prop → 必红
 *   - `check-ui-i18n`         UI i18n：把一条英文文案改成空串 → 必红
 *   - `check-bundle-size`     体积预算：把基线压到实测之下 → 必红
 *   - `check-package-exports` 发布产物：把 main 指向不存在的文件 → 必红
 *   - `check-coverage-baseline` 逐文件覆盖率棘轮：删一条测试 ⇒ 该文件 covered 下降必红；
 *     把源文件挤出插桩范围 ⇒ 未插桩集合新增必红（各跑一次真实 test:coverage）
 *   - `check-signal-profile-snapshot` 双 profile 快照：分别篡改 base / optimized 产物 → 各自必红
 *   - `check-component-status` 组件成熟度：把 experimental 的 Table 错标 stable → 必红
 *   - `check-cache`            缓存容量：关掉 LRU 淘汰循环 →「totalSize 不超过 maxSize」必红
 *   - `check-config-semantics` 配置语义：让 get() 直接返回内部引用 →「读的隔离性」必红
 *   - `check-event-semantics`  事件名规范化：normalizeEventName 原样返回 → 规范化判据必红
 *   - `check-security-html`    v-html 消毒：让 sanitizeHTML 直接返回输入 → 消毒判据必红
 *   - `check-core-signal-contract` setup ctx：inject 不再委托 app.inject → 注入判据必红
 *   - `check-dev-warnings`     开发期诊断：删掉 warn 里的 console.warn 输出 → 必红
 *   - `check-render-cost`      渲染成本：让 keyed diff 同位置节点退化为卸载+重建 → 必红
 *   - `check-di`               DI 生命周期：忽略 transient 工厂分支 →「transient 每次求值」必红
 *   - `check-store-semantics`  状态管理：getter 的 effect 只算一次 →「getter 跟随数组 push」必红
 *   - `check-reactivity-semantics` 响应式：computed 的 invalidate 不置 dirty →「computedSignal 重算并通知」必红
 *   - `check-router-semantics`  路由优先级：改回权重求和 →「通配符不输给参数」必红
 *   - `check-web-cssvars`      CSS 变量：normalizeVarName 不再补 `--` 前缀 →「缺前缀自动补 --」必红
 *   - `check-runtime-contract` 运行时契约：从 core 导出面删掉 withModifiers → 产物 import 缺导出必红
 *   - `check-api-routes`       文件路由：忽略规则退回子串匹配 →「distribution.ts 未被误伤」必红
 *   - `check-scaffold`         脚手架：store/full 模板不再生成 stores/counter.ts → 文件/相对导入判据必红
 *   - `check-error-paths`      错误路径：setup 抛错不再交给 errorCaptured → 可达性/不静默判据必红
 *   - `check-ssr-isolation`    SSR 隔离：store 注册表忽略 pinia →「两个 pinia 的 store 互不共享」必红
 *   - `check-lifecycle-release` 生命周期释放：卸载不停组件 effect scope →「卸载后 watch 不再触发」必红
 *   - `check-http-protocol`    HTTP 协议：数组响应头逐项 setHeader →「两条 set-cookie」判据必红
 *   - `check-edge-runtime`     边缘运行时：404 返回鸭子类型对象 →「404 是真正的 Response」必红
 *   - `check-integration`      集成链路：Input 不再 emit update:modelValue → v-model 链路必红
 *   - `check-runtime-render`   产物执行：patchAttr 丢弃普通属性 →「void 元素」DOM 断言必红
 *   - `check-compiler-parity`  编译器对拍：优化 codegen 丢静态属性 →「新增分叉」必红
 *   - `check-render-shapes`    模板形态：keyed 重排不再移动节点 →「keyed 重排：变 CAB」必红
 *   - `check-component-shapes` 组件形态：Teleport 把子节点挂回宿主 →「内容进入目标容器」必红
 *   - `check-ssr-client-parity` SSR 一致性：style 对象不转 kebab-case →「style 对象」必红
 *   - `check-transition-engine` 过渡引擎：finishLeave 不调 done →「leave 的 done 调用一次」必红
 *   - `check-dialog-a11y`      弹层无障碍：focusTrap 不执行初始聚焦 →「焦点在对话框内」必红
 *   - `check-plugin-semantics` 插件语义：忽略 installed 幂等检查 →「重复 install 只执行一次」必红
 *   - `check-hmr`              HMR：register 覆盖而非合并 handler →「先 accept 后 dispose：两者都在」必红
 *   - `check-consumer-demo`    消费者 demo：emit 只查 props 不查 attrs →「点击后计数变为 1」必红
 *   - `check-signal-authority` signal 单语义权威：基础发射器不再引用共享语义层 → 必红
 *   - `check-stale-capability-claims` 过时能力结论：把已证伪表述写回 README → 必红
 *   - `check-ui-slot-single-node` UI slot 单节点：新增只处理数组形态的 slot 分支 →「只处理数组形态」必红
 *   - `check-negative-controls` 负控审计：给 GATES 临时加一条未登记门禁 →「未登记」必红
 *   - `check-circular`        循环依赖（dist）：产物入口多 import 一个回指入口的临时模块 →「发现循环依赖」必红
 *   - `check-circular:src`    循环依赖（源码）：在 vdom src 造 入口→a→b→入口 的真实环 →「新增源码循环」必红
 *   - `check-hydration`       水合：清理时不再保留服务端 <script> 资源节点 →「根内 hydration data 被保留」必红
 *   - `lint:check`            eslint：新增一个含未使用变量的 src 文件 → eslint error 必红
 *   - `format:check`          prettier：新增一个格式不合规的文件 → 「Code style issues」必红
 *   - `check-ui-contracts`    行为契约：把登记表里一个 pass 格改成 red →「登记表与源码不一致」必红
 *   - `build`                 全量构建：在首个叶子包（shared-types）注入语法错误 → tsup 首个包即失败
 *   - `build:fallback`        兜底构建：同一注入 → 首个叶子包即失败（其余包连带缺类型）
 *   - `type-check`            全量类型检查：在 shared-types 注入类型错误 → TS2322 必红
 *   - `test`                  全量测试：新增一个必定失败的临时用例 → vitest 非零退出
 *   - `test:coverage`         覆盖率测试：同上 → 用例失败即非零退出
 *
 * 判为不可负控的门禁（如聚合运行器）登记在 `uninjectable` 并写明原因，不假装有反证。
 * 新增门禁时必须跑一次 `--sync` 让清单同步，否则本脚本报红。
 *
 * ## 用法
 *
 *   node scripts/check-negative-controls.mjs            # 跑除重控制外的全部负控 + 审计
 *   node scripts/check-negative-controls.mjs --quick    # 只跑秒级控制 + 审计（gate fast 档）
 *   node scripts/check-negative-controls.mjs --slow     # 只跑慢控制（gate slow 档）
 *   node scripts/check-negative-controls.mjs test       # 显式点名（含 build / test 等重控制）
 *   node scripts/check-negative-controls.mjs --audit    # 只审计清单，不注入
 *   node scripts/check-negative-controls.mjs --sync     # 按 gate.mjs 同步清单
 *   node scripts/gate.mjs --inject check-deps           # 经 gate 调用同一套负控
 *
 * 退出码：0 = 全部反证成立；1 = 有门禁注入后仍绿 / 清单不同步 / 注入点漂移。
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = resolve(ROOT, 'node_modules/.bin');
const ENV = { ...process.env, PATH: `${BIN}:${process.env.PATH ?? ''}` };
const GATE_PATH = join(ROOT, 'scripts/gate.mjs');
const REGISTRY_PATH = join(ROOT, 'scripts/negative-controls.json');

/** 从 gate.mjs 读取门禁名字（单一真相源，避免本文件再抄一份） */
function gateNames() {
  const text = readFileSync(GATE_PATH, 'utf-8');
  return [...text.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]);
}

/** 最近一次注入后门禁报出的第一条失败行（用于报告「红在哪条断言」） */
let lastFailure = '';

/** 运行命令，要求**必须失败**（退出码非 0） */
function expectFail(cmd, label) {
  const r = spawnSync(cmd[0], cmd.slice(1), {
    cwd: ROOT,
    stdio: 'pipe',
    env: ENV,
    encoding: 'utf-8',
  });
  if (r.status === null) {
    throw new Error(`${label}：命令未启动（${r.error?.code ?? 'unknown'}）`);
  }
  if (r.status === 0) {
    throw new Error(`${label}：注入后门禁仍为绿（退出码 0）——判据没有生效`);
  }
  // 去掉 ANSI 颜色码（用 String.fromCharCode 构造，避免 no-control-regex 误判）
  const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
  const plain = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.replace(ANSI, '');
  const lines = plain.split('\n');
  const hit = lines.findIndex((l) => l.includes('❌'));
  const head =
    hit >= 0
      ? lines[hit]
      : (lines.find((l) => /AssertionError|error TS|no-unused-vars|✖/.test(l)) ??
        lines.find((l) => /Error:/.test(l)) ??
        lines.find((l) => /Code style/i.test(l)) ??
        '');
  // 有些脚本先打印 `❌ 失败：`，具体条目在下一非空行 —— 一并带上，避免「红在哪」变成空白
  const next = hit >= 0 && /[：:]\s*$/.test(head) ? lines.slice(hit + 1).find((l) => l.trim()) : '';
  lastFailure = `${head.trim()}${next ? ` ${next.trim()}` : ''}`.slice(0, 160);
  return r.status;
}

/**
 * 临时改写一个文件，跑完（无论成败）恢复原字节与原 mtime。
 *
 * 恢复 mtime 是必须的：注入任何包的 src 文件会把它的修改时间推到最新，
 * 从而让 `check-dist-freshness`（dist 必须比 src 新）在**恢复之后**误红。
 */
function withPatchedFile(file, patch, run) {
  const original = readFileSync(file, 'utf-8');
  const st = statSync(file);
  try {
    writeFileSync(file, patch(original));
    return run();
  } finally {
    writeFileSync(file, original);
    utimesSync(file, st.atime, st.mtime);
  }
}

/**
 * 解析产物为 AST，只用来计算结构位置；改写仍走原文切片，避免整文件重排。
 */
function parseModule(file, text) {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
}

/** 按函数名定位函数体起始偏移（`{` 之后），不依赖函数内首条语句/局部变量名。 */
function functionBodyStart(sourceFile, name) {
  const positions = [];
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name && node.body) {
      positions.push(node.body.getStart(sourceFile) + 1);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (positions.length !== 1) {
    throw new Error(`结构锚点不唯一：函数 ${name} 命中 ${positions.length} 处`);
  }
  return positions[0];
}

/**
 * 按调用形态定位 Teleport 的子节点挂载：
 * `patch(null, child, target, targetEnd, ...)`。
 * 返回第 3、4 实参的连续文本区间，注入时整体替换为 `container, anchor`。
 * 不依赖前面是否有 cloneIfMounted 等插入语句。
 */
function teleportMountArgRange(sourceFile) {
  const isIdent = (node, name) => ts.isIdentifier(node) && node.text === name;
  const ranges = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      isIdent(node.expression, 'patch') &&
      node.arguments.length >= 4 &&
      node.arguments[0].kind === ts.SyntaxKind.NullKeyword &&
      isIdent(node.arguments[1], 'child') &&
      isIdent(node.arguments[2], 'target')
    ) {
      ranges.push([node.arguments[2].getStart(sourceFile), node.arguments[3].getEnd()]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (ranges.length !== 1) {
    throw new Error(`结构锚点不唯一：Teleport 挂载调用命中 ${ranges.length} 处`);
  }
  return ranges[0];
}

/** 临时新建一个文件，跑完删除 */
function withTempFile(file, content, run) {
  try {
    writeFileSync(file, content);
    return run();
  } finally {
    if (existsSync(file)) unlinkSync(file);
  }
}

/** 临时新建一个目录树，跑完递归删除 */
function withTempDir(dir, files, run) {
  try {
    for (const [rel, content] of Object.entries(files)) {
      const full = join(dir, rel);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    return run();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** 运行命令；非零退出即抛错（用于负控结束后的现场修复） */
function runOrThrow(cmd, label) {
  const r = spawnSync(cmd[0], cmd.slice(1), {
    cwd: ROOT,
    stdio: 'pipe',
    env: ENV,
    encoding: 'utf-8',
  });
  if (r.status !== 0) {
    throw new Error(`${label}：现场恢复失败（退出码 ${r.status ?? 'null'}）`);
  }
}

const CONTROLS = {
  'check-deps': () => {
    // S02：common（L0）声明 component（L2）⇒ 方向反转，必须报红
    const file = join(ROOT, 'packages/common/packages/is/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.dependencies = { ...(pkg.dependencies ?? {}), '@lytjs/component': 'workspace:*' };
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['tsx', 'scripts/check-deps.ts'], 'check-deps'),
    );
  },

  'check-package-deps': () => {
    // S03：src 里出现未声明的运行时 re-export ⇒ 必须报红
    const file = join(ROOT, 'packages/common/packages/is/src/__negctl-reexport.ts');
    withTempFile(file, "export { createVNode } from '@lytjs/vdom';\n", () =>
      expectFail(['node', 'scripts/check-package-deps.mjs'], 'check-package-deps'),
    );
  },

  'check-controlled-props': () => {
    // 受控组件：把 dist 里 Pagination 的受控读取改成常量 ⇒ current 不再跟随 modelValue
    const file = join(ROOT, 'packages/ecosystem/packages/ui/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-controlled-props：缺少 UI dist，请先构建');
    const needle = 'useControlledState({ get: () => p.current })';
    withPatchedFile(
      file,
      (text) => {
        if (!text.includes(needle)) {
          throw new Error(`check-controlled-props：注入点漂移（找不到 ${needle}）`);
        }
        return text.replace(needle, 'useControlledState({ get: () => 1 })');
      },
      () => expectFail(['node', 'scripts/check-controlled-props.mjs'], 'check-controlled-props'),
    );
  },

  'check-ui-styles': () => {
    // 样式覆盖：新增一个组件文件，发出一个 CSS 里不存在的静态类名 ⇒ 必须报红
    const file = join(ROOT, 'packages/ecosystem/packages/ui/src/components/__negctl.ts');
    withTempFile(file, "export const NEGCTL_CLASS = 'lyt-negctl-missing';\n", () =>
      expectFail(['tsx', 'scripts/check-ui-styles.ts'], 'check-ui-styles'),
    );
  },

  'check-release-workflow': () => {
    // 远端非 GitHub 且文件头缺 [no-ci-release] ⇒「配置存在但不会触发」判据必须报红。
    // 用 --remote 固定远端，避免本机 origin 变化让控制失效。
    const file = join(ROOT, '.github/workflows/release.yml');
    withPatchedFile(
      file,
      (text) => {
        if (!text.includes('[no-ci-release]')) {
          throw new Error('check-release-workflow：注入点漂移（找不到 [no-ci-release]）');
        }
        return text.replace('[no-ci-release]', '[negctl-removed]');
      },
      () =>
        expectFail(
          [
            'node',
            'scripts/check-release-workflow.mjs',
            '--remote',
            'git@gitee.com:lytjs/lytjs.git',
          ],
          'check-release-workflow',
        ),
    );
  },

  'check-release-parity': () => {
    // S21：把一个叶子包的版本改成不一致 ⇒ 「76 个包版本一致」判据必须报红
    const file = join(ROOT, 'packages/common/packages/is/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.version = '0.0.0-negctl';
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-release-parity.mjs'], 'check-release-parity'),
    );
  },

  'check-runtime-version': () => {
    // 只改 package.json.version、不重建 dist ⇒ 产物里的注入值仍是旧版本，必须报红
    const file = join(ROOT, 'packages/ecosystem/packages/ui/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.version = '0.0.0-negctl';
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-runtime-version.mjs'], 'check-runtime-version'),
    );
  },

  'check-script-refs': () => {
    // S20：新增一个随机命名的零引用脚本 ⇒ 「每个脚本都有引用方」判据必须报红
    const file = join(ROOT, 'scripts', `__negctl-zero-ref-${Date.now().toString(36)}.mjs`);
    withTempFile(file, 'export const NEGCTL = 1;\n', () =>
      expectFail(['node', 'scripts/check-script-refs.mjs'], 'check-script-refs'),
    );
  },

  'check-as-unknown': () => {
    // S22：在已有计数的源码里多写一处 as unknown as ⇒ 「只减不增」判据必须报红。
    // （withPatchedFile 会同时还原 mtime，避免 check-dist-freshness 误红）
    const file = join(ROOT, 'packages/vdom/src/patch.ts');
    withPatchedFile(
      file,
      (text) => `${text}\nexport const __negctlAsUnknown = 0 as unknown as string;\n`,
      () => expectFail(['node', 'scripts/check-as-unknown.mjs'], 'check-as-unknown'),
    );
  },

  'check-api-snapshot': () => {
    // S22：从 core 的 dist 类型声明里删掉一个导出名 ⇒ 「与快照一致」判据必须报红。
    // 只改 dist（恢复原字节）；dist 的 mtime 变新不触发 check-dist-freshness。
    const file = join(ROOT, 'packages/core/dist/index.d.ts');
    if (!existsSync(file)) throw new Error('check-api-snapshot：缺少 core dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const patched = text.replace(/^export (?:type )?\{[^,]*,/m, (m) => m.replace(/[^,]*,/, ''));
        if (patched === text) {
          throw new Error('check-api-snapshot：注入点漂移（找不到可删的导出名）');
        }
        return patched;
      },
      () => expectFail(['node', 'scripts/check-api-snapshot.mjs'], 'check-api-snapshot'),
    );
  },

  'check-cross-entry-singletons': () => {
    // 两种修法各做一次反向注入：改回普通 Symbol()、改回模块级变量 ⇒ 探针必红。
    // 只改子入口 dist；主入口仍按 Symbol.for / globalThis 读，两份副本必须对不上。
    const subDist = join(ROOT, 'packages/compiler/dist/signal-optimized.mjs');
    if (!existsSync(subDist)) {
      throw new Error('check-cross-entry-singletons：缺少 compiler dist，请先构建');
    }
    const cmd = [
      'node',
      'scripts/check-cross-entry-singletons.mjs',
      '--only',
      'compiler.optimized-registry',
    ];

    withPatchedFile(
      subDist,
      (text) => {
        const patched = text.replace(
          /Symbol\.for\("@lytjs\/compiler\/signal-optimized-generator"\)/,
          'Symbol("@lytjs/compiler/signal-optimized-generator")',
        );
        if (patched === text) {
          throw new Error('check-cross-entry-singletons：Symbol.for 注入点漂移');
        }
        return patched;
      },
      () => expectFail(cmd, 'check-cross-entry-singletons(Symbol.for→Symbol)'),
    );

    withPatchedFile(
      subDist,
      (text) => {
        const re = /function slot\(\) \{[\s\S]*?\n\}/;
        if (!re.test(text)) {
          throw new Error('check-cross-entry-singletons：globalThis 槽注入点漂移');
        }
        return text.replace(
          re,
          'var __negctlSlot = {};\nfunction slot() {\n  return __negctlSlot;\n}',
        );
      },
      () => expectFail(cmd, 'check-cross-entry-singletons(globalThis→模块级)'),
    );
  },

  'check-lockfile': () => {
    // 声明一条锁文件 importer 里不存在的依赖 ⇒ 「package.json ↔ pnpm-lock.yaml 一致」必红
    const file = join(ROOT, 'packages/common/packages/is/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.dependencies = { ...(pkg.dependencies ?? {}), '@lytjs/negctl-lockfile': 'workspace:*' };
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-lockfile.mjs'], 'check-lockfile'),
    );
  },

  'check-build-order': () => {
    // 从 BUILD_ORDER 删掉一条 ⇒ 「workspace 包必须都登记」必红
    const file = join(ROOT, 'scripts/build-order.ts');
    withPatchedFile(
      file,
      (text) => {
        const patched = text.replace(/\s*\{ name: '[^']+', path: '[^']+' \},/, '');
        if (patched === text)
          throw new Error('check-build-order：注入点漂移（找不到 BUILD_ORDER 条目）');
        return patched;
      },
      () => expectFail(['tsx', 'scripts/check-build-order.ts'], 'check-build-order'),
    );
  },

  'check-render-parity': () => {
    // 关掉 common-dom 的属性安全检查 ⇒ javascript: URL 不再被拦截，必红
    const file = join(ROOT, 'packages/common/packages/dom/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-render-parity：缺少 common-dom dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const patched = text.replaceAll('if (!isSafeAttribute(key, strValue))', 'if (false)');
        if (patched === text)
          throw new Error('check-render-parity：注入点漂移（找不到 isSafeAttribute）');
        return patched;
      },
      () => expectFail(['node', 'scripts/check-render-parity.mjs'], 'check-render-parity'),
    );
  },

  'check-list-diff': () => {
    // 让 signal 路径的旧 key 全部失配 ⇒ 节点全部重建，「两路径都复用同一节点」必红
    const file = join(ROOT, 'packages/dom-runtime/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-list-diff：缺少 dom-runtime dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = 'getOldKey: (index) => existingKeys[index] ?? null,';
        if (!text.includes(needle))
          throw new Error('check-list-diff：注入点漂移（找不到 getOldKey）');
        return text.replace(needle, 'getOldKey: (index) => null,');
      },
      () => expectFail(['node', 'scripts/check-list-diff.mjs'], 'check-list-diff'),
    );
  },

  'check-public-names': () => {
    // 多写一处 unified 名字的实现 ⇒ 「同名只能一个实现」必红
    const file = join(ROOT, 'packages/core/src/__negctl-public-name.ts');
    withTempFile(file, 'export function setGlobalErrorReporter(): void {}\n', () =>
      expectFail(['node', 'scripts/check-public-names.mjs'], 'check-public-names'),
    );
  },

  'check-keel-wiring': () => {
    // 删掉 keel.yml 里的 test-lint 关卡 ⇒ 「三关卡必须在 CI 里」必红
    const file = join(ROOT, '.github/workflows/keel.yml');
    withPatchedFile(
      file,
      (text) => {
        const patched = text.replace(/\n\s*run: bash keel\/checks\/test-lint\.sh/, '');
        if (patched === text)
          throw new Error('check-keel-wiring：注入点漂移（找不到 test-lint 关卡）');
        return patched;
      },
      () => expectFail(['tsx', 'scripts/check-keel-wiring.ts'], 'check-keel-wiring'),
    );
  },

  'check-e2e-assertions': () => {
    // 新增一个使用 toBeDefined() 的 e2e 测试文件 ⇒ 「禁止形状断言」必红
    const file = join(ROOT, 'packages/vdom/tests/__negctl-e2e.test.ts');
    withTempFile(file, 'expect(1).toBeDefined();\n', () =>
      expectFail(['tsx', 'scripts/check-e2e-assertions.ts'], 'check-e2e-assertions'),
    );
  },

  'check-src-hygiene': () => {
    // 新增一个含 console.log 的 src 文件（不在基线） ⇒ 必红
    const file = join(ROOT, 'packages/core/src/__negctl-src-hygiene.ts');
    withTempFile(file, "console.log('negctl');\n", () =>
      expectFail(['tsx', 'scripts/check-src-hygiene.ts'], 'check-src-hygiene'),
    );
  },

  'check-examples': () => {
    // 新增一个引用不存在 @lytjs 包的示例 ⇒ 「示例导入必须可解析」必红
    const file = join(ROOT, 'examples/__negctl-example.mjs');
    withTempFile(file, "import '@lytjs/negctl-not-exists';\n", () =>
      expectFail(['node', 'scripts/check-examples.mjs'], 'check-examples'),
    );
  },

  'check-dist-freshness': () => {
    // 把 src 的 mtime 推到 dist 之后 ⇒ 「dist 必须比 src 新」必红；跑完恢复原 mtime
    const file = join(ROOT, 'packages/core/src/index.ts');
    if (!existsSync(file)) throw new Error('check-dist-freshness：缺少 packages/core/src/index.ts');
    const st = statSync(file);
    const future = new Date(Date.now() + 3_600_000);
    utimesSync(file, future, future);
    try {
      expectFail(['tsx', 'scripts/check-dist-freshness.ts'], 'check-dist-freshness');
    } finally {
      utimesSync(file, st.atime, st.mtime);
    }
  },

  'check-signal-profile-snapshot': () => {
    // B01c：分别改动 base / optimized 的产物快照 ⇒ 两个 profile 都必须各自转红。
    // 分两次跑是为了证明「两侧都在比对」，而不是只有其中一侧生效。
    const file = join(ROOT, 'scripts/signal-profile-snapshot.json');
    const cmd = ['node', 'scripts/check-signal-profile-snapshot.mjs'];
    for (const profile of ['base', 'optimized']) {
      withPatchedFile(
        file,
        (text) => {
          const snap = JSON.parse(text);
          const id = Object.keys(snap[profile] ?? {})[0];
          if (!id) throw new Error(`check-signal-profile-snapshot：快照缺少 ${profile} 段`);
          snap[profile][id] += '\n// __negctl';
          return `${JSON.stringify(snap, null, 2)}\n`;
        },
        () => expectFail(cmd, `check-signal-profile-snapshot(${profile})`),
      );
    }
  },

  'check-signal-output-evaluates': () => {
    // 摘掉 optimized/for13 的 setClass import（还原缺失 import 的原形态）
    // ⇒ 「只按产物自身 import 图求值」必红
    const file = join(ROOT, 'scripts/signal-profile-snapshot.json');
    withPatchedFile(
      file,
      (text) => {
        const snap = JSON.parse(text);
        const code = snap.optimized?.for13;
        if (!code?.includes('setClass as c')) {
          throw new Error('check-signal-output-evaluates：注入点漂移（找不到 setClass as c）');
        }
        snap.optimized.for13 = code.replace('setClass as c,', '');
        return `${JSON.stringify(snap, null, 2)}\n`;
      },
      () =>
        expectFail(
          ['node', 'scripts/check-signal-output-evaluates.mjs'],
          'check-signal-output-evaluates',
        ),
    );
  },

  'check-dead-packages': () => {
    // 新增一个零生产引用的 common 内部包 ⇒ 「死包只减不增」必红
    const dir = join(ROOT, 'packages/common/packages/__negctl-dead-pkg');
    withTempDir(
      dir,
      {
        'package.json': `${JSON.stringify(
          { name: '@lytjs/common-negctl-dead', version: '0.0.0', private: true },
          null,
          2,
        )}\n`,
        'src/index.ts': 'export const NEGCTL = 1;\n',
      },
      () => expectFail(['tsx', 'scripts/check-dead-packages.ts'], 'check-dead-packages'),
    );
  },

  'check-vitest-alias-dist': () => {
    // 加一条指向不存在目录的 alias ⇒ 「每个 alias 目标都必须存在」必红
    // S32 起别名表在 vitest.shared.ts（根配置只引用），注入点随之迁移。
    const file = join(ROOT, 'vitest.shared.ts');
    withPatchedFile(
      file,
      (text) => {
        const needle = 'export const sharedAliases: Record<string, string> = {';
        if (!text.includes(needle)) {
          throw new Error('check-vitest-alias-dist：注入点漂移（找不到 alias 块）');
        }
        return text.replace(
          needle,
          `${needle}\n  '@lytjs/__negctl-missing': resolve(root, 'packages/__negctl-missing/src'),`,
        );
      },
      () => expectFail(['tsx', 'scripts/check-vitest-alias-dist.ts'], 'check-vitest-alias-dist'),
    );
  },

  'check-doc-imports': () => {
    // guide 里写一个不存在的具名 import ⇒ 「文档接触面必须为 0 缺失」必红
    const file = join(ROOT, 'docs/guide/__negctl-doc.md');
    withTempFile(file, "import { __negctlMissing } from '@lytjs/core';\n", () =>
      expectFail(['tsx', 'scripts/check-doc-imports.ts'], 'check-doc-imports'),
    );
  },

  'check-ui-props-wiring': () => {
    // 新增一个「声明了 props 却从未引用」的组件 ⇒ props 接线棘轮必红
    const file = join(ROOT, 'packages/ecosystem/packages/ui/src/components/__negctl-props.ts');
    withTempFile(
      file,
      [
        'export default {',
        "  name: 'NegctlProps',",
        '  props: {',
        '    neverWired: { type: String },',
        '  },',
        '  setup() {',
        '    return () => null;',
        '  },',
        '};',
        '',
      ].join('\n'),
      () => expectFail(['tsx', 'scripts/check-ui-props-wiring.ts'], 'check-ui-props-wiring'),
    );
  },

  'check-ui-i18n': () => {
    // 把 en-US 的一条文案改成空串 ⇒ 「文案不得为空串」必红
    const file = join(ROOT, 'packages/ecosystem/packages/ui/src/locale/messages.ts');
    withPatchedFile(
      file,
      (text) => {
        const needle = "'tag.close': 'Close tag',";
        if (!text.includes(needle))
          throw new Error('check-ui-i18n：注入点漂移（找不到 en-US tag.close）');
        return text.replace(needle, "'tag.close': '',");
      },
      () => expectFail(['tsx', 'scripts/check-ui-i18n.ts'], 'check-ui-i18n'),
    );
  },

  'check-bundle-size': () => {
    // 把某个入口的基线压到实测之下 ⇒ 「实测 ≤ 基线 + 2%」必红
    const file = join(ROOT, 'scripts/bundle-baseline.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        if (!pkg.entries?.['vdom-only']) {
          throw new Error('check-bundle-size：注入点漂移（找不到 vdom-only 条目）');
        }
        pkg.entries['vdom-only'].baselineBytes = 1;
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['tsx', 'scripts/check-bundle-size.ts'], 'check-bundle-size'),
    );
  },

  'check-package-exports': () => {
    // 把一个包的 main 指向不存在的文件 ⇒ 「发布产物入口必须存在」必红
    const file = join(ROOT, 'packages/common/packages/is/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.main = './dist/__negctl-missing.cjs';
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-package-exports.mjs'], 'check-package-exports'),
    );
  },

  'check-package-metadata': () => {
    // 把 @lytjs/core 改回历史不一致口径：exports 子路径排到 "." 之前、
    // sideEffects 改 true、files 丢掉 src ⇒ 三条判据都必须报红
    const file = join(ROOT, 'packages/core/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        if (!pkg.exports?.['./runtime'] || !pkg.exports?.['.']) {
          throw new Error('check-package-metadata：注入点漂移（@lytjs/core 的 exports 结构变了）');
        }
        pkg.exports = {
          './runtime': pkg.exports['./runtime'],
          '.': pkg.exports['.'],
        };
        pkg.sideEffects = true;
        pkg.files = ['dist'];
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-package-metadata.mjs'], 'check-package-metadata'),
    );
  },

  'check-publish-private': () => {
    // 去掉 benchmark fixture 的 private ⇒ 「非发布包必须 private」必红
    const file = join(
      ROOT,
      'benchmarks/js-framework-benchmark/frameworks/keyed/lytjs-npm/package.json',
    );
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        delete pkg.private;
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-publish-private.mjs'], 'check-publish-private'),
    );
  },

  'check-release-artifacts': () => {
    // exports 指向不存在的文件 ⇒ tarball 文件清单 / 运行时矩阵必红
    const file = join(ROOT, 'packages/common/packages/is/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.exports['.'].import = './dist/__negctl-missing.mjs';
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-release-artifacts.mjs'], 'check-release-artifacts'),
    );
  },

  'check-coverage-baseline': () => {
    // 判据（ADR 0034）：
    //   ① 删掉一条现有测试 ⇒ 对应源文件 statements.covered 下降 ⇒ 逐文件棘轮必红；
    //   ② 把一个源文件挤出插桩范围 ⇒ 未插桩集合新增成员 ⇒ 必红。
    // 每次注入都跑真实的 test:coverage —— 本门禁只读现场产物，档内不生成被比对的对象。
    const baselineCheck = ['node', 'scripts/check-coverage-baseline.mjs'];
    if (!existsSync(join(ROOT, 'coverage/coverage-final.json'))) {
      throw new Error('check-coverage-baseline：缺少现场覆盖率产物 —— 先跑 pnpm run test:coverage');
    }
    runOrThrow(baselineCheck, 'check-coverage-baseline:注入前基线');

    // ① 删掉 createObjectTypeGuard 用例 ⇒ type-utils.ts 的该守卫与箭头函数不再被覆盖
    const testFile = join(ROOT, 'packages/shared-types/tests/type-utils.test.ts');
    withPatchedFile(
      testFile,
      (text) => {
        const needle = [
          "  it('createObjectTypeGuard：非对象直接 false，字段逐个校验', () => {",
          '    const isPoint = createObjectTypeGuard<{ x: unknown; y: unknown }>({',
          '      x: isNumber,',
          '      y: isNumber,',
          '    });',
          '    expect(isPoint({ x: 1, y: 2 })).toBe(true);',
          "    expect(isPoint({ x: 1, y: '2' })).toBe(false);",
          '    expect(isPoint(null)).toBe(false);',
          "    expect(isPoint('x')).toBe(false);",
          '  });',
          '',
        ].join('\n');
        if (!text.includes(needle)) {
          throw new Error(
            'check-coverage-baseline：注入点漂移（找不到 createObjectTypeGuard 用例）',
          );
        }
        return text.replace(needle, '');
      },
      () => {
        runOrThrow(['pnpm', 'run', 'test:coverage'], 'check-coverage-baseline:①删测试后重跑覆盖率');
        expectFail(baselineCheck, 'check-coverage-baseline:①删测试');
      },
    );

    // ② 把 type-utils.ts 临时挤进 coverage.exclude ⇒ 未插桩集合新增成员
    const configFile = join(ROOT, 'vitest.config.ts');
    withPatchedFile(
      configFile,
      (text) => {
        const needle = "        'packages/shared-types/src/web.ts',\n";
        if (!text.includes(needle)) {
          throw new Error('check-coverage-baseline：注入点漂移（找不到 exclude 锚点）');
        }
        return text.replace(
          needle,
          `${needle}        'packages/shared-types/src/type-utils.ts',\n`,
        );
      },
      () => {
        runOrThrow(
          ['pnpm', 'run', 'test:coverage'],
          'check-coverage-baseline:②挤出插桩后重跑覆盖率',
        );
        expectFail(baselineCheck, 'check-coverage-baseline:②挤出插桩');
      },
    );

    // 还原现场后再跑一次，证明门禁回绿（不是只靠 catch 兜住）
    runOrThrow(['pnpm', 'run', 'test:coverage'], 'check-coverage-baseline:还原后重跑覆盖率');
    runOrThrow(baselineCheck, 'check-coverage-baseline:还原后');
  },

  'check-component-status': () => {
    // 把 experimental 的 Table 错标 stable ⇒「mislabeled_stable > 0」与「stable 数量 ≠ 20」必红
    const file = join(ROOT, 'packages/ecosystem/packages/ui/src/component-status.ts');
    withPatchedFile(
      file,
      (text) => {
        const needle = "Table: { status: 'experimental', note: EXPERIMENTAL_NOTE },";
        if (!text.includes(needle)) {
          throw new Error(
            'check-component-status：注入点漂移（找不到 Table 的 experimental 登记）',
          );
        }
        return text.replace(needle, "Table: { status: 'stable' },");
      },
      () => expectFail(['node', 'scripts/check-component-status.mjs'], 'check-component-status'),
    );
  },

  'check-cache': () => {
    // 关掉 LRU 淘汰循环 ⇒ 容量上限不再生效，「totalSize 不超过 maxSize」必红
    const file = join(ROOT, 'packages/ecosystem/packages/ssr-kit/packages/cache/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-cache：缺少 cache dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          'while (this.stats.totalSize + size > this.maxSize && this.cache.size > 0) {';
        if (!text.includes(needle)) throw new Error('check-cache：注入点漂移（找不到淘汰循环）');
        return text.replace(needle, 'while (false) {');
      },
      () => expectFail(['node', 'scripts/check-cache.mjs'], 'check-cache'),
    );
  },

  'check-config-semantics': () => {
    // get() 不再深拷贝 ⇒ 外部改返回值即改内部状态，「两次 get 返回不同对象」必红
    const file = join(ROOT, 'packages/ecosystem/packages/config/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-config-semantics：缺少 config dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = 'return deepClone(value);';
        if (!text.includes(needle)) {
          throw new Error('check-config-semantics：注入点漂移（找不到 get 的 deepClone）');
        }
        return text.replace(needle, 'return value;');
      },
      () => expectFail(['node', 'scripts/check-config-semantics.mjs'], 'check-config-semantics'),
    );
  },

  'check-event-semantics': () => {
    // normalizeEventName 原样返回 ⇒「onClick → click」「@click.stop → click」等规范化判据必红
    const file = join(ROOT, 'packages/common/packages/events/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-event-semantics：缺少 events dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = 'return splitEventName(rawName).base.toLowerCase();';
        if (!text.includes(needle)) {
          throw new Error('check-event-semantics：注入点漂移（找不到 normalizeEventName）');
        }
        return text.replace(needle, 'return rawName;');
      },
      () => expectFail(['node', 'scripts/check-event-semantics.mjs'], 'check-event-semantics'),
    );
  },

  'check-security-html': () => {
    // sanitizeHTML 退化为直通 ⇒「删除 <script> / on* / javascript:」至少一条必红
    const file = join(ROOT, 'packages/common/packages/security/dist/index.mjs');
    if (!existsSync(file))
      throw new Error('check-security-html：缺少 common-security dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        // 结构锚点：函数体起点；局部变量改名或前面插入语句都不影响
        const bodyStart = functionBodyStart(parseModule(file, text), 'sanitizeHTML');
        return `${text.slice(0, bodyStart)}\n  return str;${text.slice(bodyStart)}`;
      },
      () => expectFail(['node', 'scripts/check-security-html.mjs'], 'check-security-html'),
    );
  },

  'check-core-signal-contract': () => {
    // setup ctx 的 inject 不再委托 app.inject ⇒「ctx.inject 读到 app.provide 的值」必红
    const file = join(ROOT, 'packages/core-signal/dist/index.mjs');
    if (!existsSync(file))
      throw new Error('check-core-signal-contract：缺少 core-signal dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = 'return app.inject(key, defaultValue);';
        if (!text.includes(needle)) {
          throw new Error('check-core-signal-contract：注入点漂移（找不到 setup ctx inject）');
        }
        return text.replace(needle, 'return defaultValue;');
      },
      () =>
        expectFail(
          ['node', 'scripts/check-core-signal-contract.mjs'],
          'check-core-signal-contract',
        ),
    );
  },

  'check-dev-warnings': () => {
    // 删掉 warn 里的 console.warn 输出 ⇒「warn 有输出」「safeExec 失败时会告警」必红
    const file = join(ROOT, 'packages/common/packages/error/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-dev-warnings：缺少 common-error dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          'function warn(message) {\n  if (!getDevMode()) return;\n  console.warn(`[LytJS]: ${message}`);\n}';
        if (!text.includes(needle)) {
          throw new Error('check-dev-warnings：注入点漂移（找不到 warn 实现）');
        }
        return text.replace(needle, 'function warn(message) {\n  if (!getDevMode()) return;\n}');
      },
      () => expectFail(['node', 'scripts/check-dev-warnings.mjs'], 'check-dev-warnings'),
    );
  },

  'check-render-cost': () => {
    // 让同位置节点的 diff 退化为「卸载旧节点 + 重挂新节点」⇒ 追加 1 项不再是 O(1)，
    // 「结构性 DOM 操作 ≤ 5」与「没有重挂既有节点（remove=0）」必红
    const file = join(ROOT, 'packages/vdom/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-render-cost：缺少 vdom dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '    ops.patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG);\n    i++;\n  }\n  while (i <= e1 && i <= e2) {\n    const n1 = c1[e1];';
        if (!text.includes(needle)) {
          throw new Error(
            'check-render-cost：注入点漂移（找不到 patchKeyedChildren 首部复用路径）',
          );
        }
        return text.replace(
          needle,
          '    ops.unmount(n1, parentComponent, parentSuspense, true);\n    ops.patch(null, n2, container, null, parentComponent, parentSuspense, isSVG);\n    i++;\n  }\n  while (i <= e1 && i <= e2) {\n    const n1 = c1[e1];',
        );
      },
      () => expectFail(['node', 'scripts/check-render-cost.mjs'], 'check-render-cost'),
    );
  },

  'check-di': () => {
    // 注入：materializeRecord 忽略 lifecycle='transient'（工厂只求值一次）⇒「transient 每次求值」必红
    const file = join(ROOT, 'packages/ecosystem/packages/di/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-di：缺少 di dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '    if (record.lifecycle === "transient") {\n      return record.factory();\n    }';
        if (!text.includes(needle)) {
          throw new Error('check-di：注入点漂移（找不到 transient 工厂分支）');
        }
        return text.replace(needle, '    if (false) {\n      return record.factory();\n    }');
      },
      () => expectFail(['node', 'scripts/check-di.mjs'], 'check-di'),
    );
  },

  'check-store-semantics': () => {
    // 注入：getter 的 effect 只在首次求值，之后不再重算 ⇒「getter 跟随数组 push」必红
    const file = join(ROOT, 'packages/ecosystem/packages/store/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-store-semantics：缺少 store dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '                const runner = effect(\n                  () => out.set(getterFn.call(thisContext, state, getters, store))\n                );';
        if (!text.includes(needle)) {
          throw new Error('check-store-semantics：注入点漂移（找不到 getter effect）');
        }
        return text.replace(
          needle,
          '                const runner = effect(\n                  () => {\n                    if (out() === void 0) out.set(getterFn.call(thisContext, state, getters, store));\n                  }\n                );',
        );
      },
      () => expectFail(['node', 'scripts/check-store-semantics.mjs'], 'check-store-semantics'),
    );
  },

  'check-reactivity-semantics': () => {
    // 注入：computed 的 invalidate 不再把 dirty 置真 ⇒ 依赖变化后仍返回缓存，「computedSignal 重算并通知」必红
    const file = join(ROOT, 'packages/reactivity/dist/index.mjs');
    if (!existsSync(file))
      throw new Error('check-reactivity-semantics：缺少 reactivity dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '    dirty = true;\n    trigger(store, TriggerOpTypes.SET, COMPUTED_SIGNAL_KEY);';
        if (!text.includes(needle)) {
          throw new Error(
            'check-reactivity-semantics：注入点漂移（找不到 invalidate 的 dirty 置位）',
          );
        }
        return text.replace(
          needle,
          '    dirty = false;\n    trigger(store, TriggerOpTypes.SET, COMPUTED_SIGNAL_KEY);',
        );
      },
      () =>
        expectFail(
          ['node', 'scripts/check-reactivity-semantics.mjs'],
          'check-reactivity-semantics',
        ),
    );
  },

  'check-router-semantics': () => {
    // 注入：路由优先级改回权重求和（静态 3 / 参数 2 / 通配 0）⇒「通配符不输给参数」必红
    const file = join(
      ROOT,
      'packages/ecosystem/packages/web-framework/packages/router/dist/index.mjs',
    );
    if (!existsSync(file)) throw new Error('check-router-semantics：缺少 router dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          'function comparePriority(a, b) {\n  const len = Math.max(a.length, b.length);\n  for (let i = 0; i < len; i++) {\n    const av = a[i] ?? END_WEIGHT;\n    const bv = b[i] ?? END_WEIGHT;\n    if (av !== bv) return av - bv;\n  }\n  return 0;\n}';
        if (!text.includes(needle)) {
          throw new Error('check-router-semantics：注入点漂移（找不到 comparePriority）');
        }
        return text.replace(
          needle,
          'function comparePriority(a, b) {\n  return a.reduce((sum, value) => sum + value, 0) - b.reduce((sum, value) => sum + value, 0);\n}',
        );
      },
      () => expectFail(['node', 'scripts/check-router-semantics.mjs'], 'check-router-semantics'),
    );
  },

  'check-web-cssvars': () => {
    // 注入：normalizeVarName 不再补 `--` 前缀 ⇒「缺前缀自动补 --」等名称规范化判据必红
    const file = join(ROOT, 'packages/web/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-web-cssvars：缺少 web dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          'function normalizeVarName(name) {\n  return name.startsWith("--") ? name : `--${name}`;\n}';
        if (!text.includes(needle)) {
          throw new Error('check-web-cssvars：注入点漂移（找不到 normalizeVarName）');
        }
        return text.replace(needle, 'function normalizeVarName(name) {\n  return name;\n}');
      },
      () => expectFail(['node', 'scripts/check-web-cssvars.mjs'], 'check-web-cssvars'),
    );
  },

  'check-runtime-contract': () => {
    // 注入：从 core 导出面删掉 withModifiers（编译器产物仍 import 它）⇒「产物 import 的导出名可解析」必红
    const file = join(ROOT, 'packages/core/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-runtime-contract：缺少 core dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          "export { normalizeClass, normalizeStyle, sanitizeHTML, withModifiers } from '@lytjs/dom-runtime';";
        if (!text.includes(needle)) {
          throw new Error('check-runtime-contract：注入点漂移（找不到 dom-runtime 导出面）');
        }
        return text.replace(
          needle,
          "export { normalizeClass, normalizeStyle, sanitizeHTML } from '@lytjs/dom-runtime';",
        );
      },
      () => expectFail(['tsx', 'scripts/check-runtime-contract.ts'], 'check-runtime-contract'),
    );
  },

  'check-api-routes': () => {
    // 注入：忽略规则退回子串匹配（dist 规则误伤 distribution.ts）⇒「distribution.ts 未被误伤」必红
    const file = join(
      ROOT,
      'packages/ecosystem/packages/web-framework/packages/api/dist/index.mjs',
    );
    if (!existsSync(file)) throw new Error('check-api-routes：缺少 api dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          'return patterns.some((pattern) => segments.includes(pattern) || stem === pattern);';
        if (!text.includes(needle)) {
          throw new Error('check-api-routes：注入点漂移（找不到 isIgnoredPath 判断）');
        }
        return text.replace(
          needle,
          'return patterns.some((pattern) => segments.includes(pattern) || fileName.includes(pattern));',
        );
      },
      () => expectFail(['node', 'scripts/check-api-routes.mjs'], 'check-api-routes'),
    );
  },

  'check-scaffold': () => {
    // 注入：store/full 模板不再生成 stores/counter.ts ⇒「相对导入全部可解析」「有 stores/counter.ts」必红
    const file = join(ROOT, 'packages/tools/packages/cli/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-scaffold：缺少 CLI dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '    writeFile(join(targetDir, "src", "stores", "counter.ts"), counterStore);';
        if (!text.includes(needle)) {
          throw new Error('check-scaffold：注入点漂移（找不到 counter.ts 模板写入）');
        }
        return text.replace(needle, '    void counterStore;');
      },
      () => expectFail(['node', 'scripts/check-scaffold.mjs'], 'check-scaffold'),
    );
  },

  'check-error-paths': () => {
    // 注入：setup 抛错后不再交给 handleError ⇒「错误到达 errorCaptured」「未静默」必红
    const file = join(ROOT, 'packages/component/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-error-paths：缺少 component dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '  } catch (err) {\n    handleError(err, instance, "setup function");\n    instance.setupError = err instanceof Error ? err : new Error(String(err));';
        if (!text.includes(needle)) {
          throw new Error('check-error-paths：注入点漂移（找不到 runSetup 的 handleError）');
        }
        return text.replace(
          needle,
          '  } catch (err) {\n    instance.setupError = err instanceof Error ? err : new Error(String(err));',
        );
      },
      () => expectFail(['node', 'scripts/check-error-paths.mjs'], 'check-error-paths'),
    );
  },

  'check-ssr-isolation': () => {
    // 注入：store 注册表忽略 pinia、全部落到进程级 fallback ⇒「A 与 B 不是同一个 store 对象」必红
    const file = join(ROOT, 'packages/ecosystem/packages/store/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-ssr-isolation：缺少 store dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = 'function registryFor(pinia) {\n  if (!pinia) return fallbackRegistry;';
        if (!text.includes(needle)) {
          throw new Error('check-ssr-isolation：注入点漂移（找不到 registryFor）');
        }
        return text.replace(
          needle,
          'function registryFor(pinia) {\n  if (true) return fallbackRegistry;',
        );
      },
      () => expectFail(['node', 'scripts/check-ssr-isolation.mjs'], 'check-ssr-isolation'),
    );
  },

  'check-lifecycle-release': () => {
    // 注入：组件卸载时不停自己的 effect scope ⇒「卸载后 watch 不再触发」必红
    const file = join(ROOT, 'packages/component/dist/index.mjs');
    if (!existsSync(file))
      throw new Error('check-lifecycle-release：缺少 component dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = '  instance.isUnmounted = true;\n  instance.scope?.stop();';
        if (!text.includes(needle)) {
          throw new Error('check-lifecycle-release：注入点漂移（找不到 scope.stop）');
        }
        return text.replace(needle, '  instance.isUnmounted = true;');
      },
      () => expectFail(['node', 'scripts/check-lifecycle-release.mjs'], 'check-lifecycle-release'),
    );
  },

  'check-http-protocol': () => {
    // 注入：数组响应头逐项 setHeader（后一条覆盖前一条）⇒「两条 set-cookie 都要到客户端」必红
    const file = join(
      ROOT,
      'packages/ecosystem/packages/web-framework/packages/http-server/dist/index.mjs',
    );
    if (!existsSync(file)) throw new Error('check-http-protocol：缺少 http-server dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '      if (Array.isArray(value)) {\n        res.setHeader(key, value.map(String));\n      } else {';
        if (!text.includes(needle)) {
          throw new Error('check-http-protocol：注入点漂移（找不到数组头写入）');
        }
        return text.replace(
          needle,
          '      if (Array.isArray(value)) {\n        for (const item of value) res.setHeader(key, String(item));\n      } else {',
        );
      },
      () => expectFail(['node', 'scripts/check-http-protocol.mjs'], 'check-http-protocol'),
    );
  },

  'check-edge-runtime': () => {
    // 注入：404 直接返回鸭子类型对象（不是 Response）⇒「404 是真正的 Response」必红
    const file = join(ROOT, 'packages/ecosystem/packages/runtime-edge/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-edge-runtime：缺少 runtime-edge dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = '      return textResponse("Not Found", 404);';
        if (!text.includes(needle)) {
          throw new Error('check-edge-runtime：注入点漂移（找不到 404 分支）');
        }
        return text.replace(
          needle,
          '      return { status: 404, statusText: "Not Found", headers: {} };',
        );
      },
      () => expectFail(['node', 'scripts/check-edge-runtime.mjs'], 'check-edge-runtime'),
    );
  },

  'check-integration': () => {
    // 注入：Input 的 input 事件不再 emit update:modelValue ⇒「Input 输入 → update:modelValue」必红
    const file = join(ROOT, 'packages/ecosystem/packages/ui/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-integration：缺少 UI dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '    const handleInput = (e) => {\n      const target = e.target;\n      const value = target.value;\n      emit("update:modelValue", value);\n      emit("input", value);\n    };';
        if (!text.includes(needle)) {
          throw new Error('check-integration：注入点漂移（找不到 Input 的 handleInput）');
        }
        return text.replace(
          needle,
          '    const handleInput = (e) => {\n      const target = e.target;\n      const value = target.value;\n      emit("input", value);\n    };',
        );
      },
      () => expectFail(['node', 'scripts/check-integration.mjs'], 'check-integration'),
    );
  },

  'check-runtime-render': () => {
    // 注入：patchAttr 丢弃普通属性 ⇒「void 元素」的 `<img src="x">` DOM 断言必红
    const file = join(ROOT, 'packages/common/packages/dom/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-runtime-render：缺少 common-dom dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '  } else {\n    const strValue = typeof value === "string" ? value : String(value);\n    if (!isSafeAttribute(key, strValue)) {\n      return;\n    }\n    el.setAttribute(key, strValue);\n  }';
        if (!text.includes(needle)) {
          throw new Error('check-runtime-render：注入点漂移（找不到 patchAttr 普通属性分支）');
        }
        return text.replace(
          needle,
          '  } else {\n    const strValue = typeof value === "string" ? value : String(value);\n    if (true) {\n      return;\n    }\n    el.setAttribute(key, strValue);\n  }',
        );
      },
      () => expectFail(['node', 'scripts/check-runtime-render.mjs'], 'check-runtime-render'),
    );
  },

  'check-compiler-parity': () => {
    // 注入：优化实现的静态模板多写一个属性 ⇒ 两套产物执行后的 DOM 新增分叉，「新增分叉」必红。
    // 注意：静态序列化逻辑 B01d-2 已迁入共享层，改共享层会让两侧同变（分叉不产生），
    // 因此注入点必须落在**仅优化实现**的适配层（buildStaticHTMLOptimized）。
    // ADR 0033：优化发射器已拆到 `dist/signal-optimized.mjs`，注入点随之迁移。
    const file = join(ROOT, 'packages/compiler/dist/signal-optimized.mjs');
    if (!existsSync(file)) throw new Error('check-compiler-parity：缺少 compiler dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = [
          'function buildStaticHTMLOptimized(children, elementVars) {',
          '  return buildStaticHtml(children, (node, tag, isComponent) => {',
          '    const varName = `_${elementVars.length}`;',
          '    elementVars.push(isComponent ? { varName, tag } : { varName, tag, node });',
          '    return varName;',
          '  });',
          '}',
        ].join('\n');
        if (!text.includes(needle)) {
          throw new Error('check-compiler-parity：注入点漂移（找不到优化器静态模板适配层）');
        }
        const patched = needle
          .replace('  return buildStaticHtml(', '  const __negctlHtml = buildStaticHtml(')
          .replace(
            / {2}\}\);\n\}$/,
            "  });\n  return __negctlHtml.replace('>', ' __negctl=\"1\">');\n}",
          );
        return text.replace(needle, patched);
      },
      () => expectFail(['node', 'scripts/check-compiler-parity.mjs'], 'check-compiler-parity'),
    );
  },

  'check-render-shapes': () => {
    // 注入：keyed diff 不再移动已匹配节点 ⇒ 重排后顺序仍是 ABC，「keyed 重排：变 CAB」必红
    const file = join(ROOT, 'packages/vdom/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-render-shapes：缺少 vdom dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '      } else if (plan.moved && plan.movedNewIndexes.has(i)) {\n        if (nextChild.el) {\n          ops.move(nextChild, container, anchor, parentComponent, parentSuspense);\n        }\n      }';
        if (!text.includes(needle)) {
          throw new Error('check-render-shapes：注入点漂移（找不到 keyed reorder 的 move）');
        }
        return text.replace(
          needle,
          '      } else if (false) {\n        if (nextChild.el) {\n          ops.move(nextChild, container, anchor, parentComponent, parentSuspense);\n        }\n      }',
        );
      },
      () => expectFail(['node', 'scripts/check-render-shapes.mjs'], 'check-render-shapes'),
    );
  },

  'check-component-shapes': () => {
    // 注入：Teleport 把子节点挂回宿主而非目标容器 ⇒「内容进入目标容器」「宿主内没有该内容」必红
    const file = join(ROOT, 'packages/vdom/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-component-shapes：缺少 vdom dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        // 结构锚点：按调用形态 patch(null, child, target, targetEnd, ...) 定位；
        // 目标容器与宿主容器的替换仍保持原注入强度，前面插入 cloneIfMounted 不影响
        const [start, end] = teleportMountArgRange(parseModule(file, text));
        return `${text.slice(0, start)}container, anchor${text.slice(end)}`;
      },
      () => expectFail(['node', 'scripts/check-component-shapes.mjs'], 'check-component-shapes'),
    );
  },

  'check-ssr-client-parity': () => {
    // 注入：SSR 序列化 style 对象时不转 kebab-case（fontSize 原样输出）⇒「style 对象」必红
    const file = join(ROOT, 'packages/ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-ssr-client-parity：缺少 SSR dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '      ([k, v]) => `${k.startsWith("--") ? k : k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${String(v)}`';
        if (!text.includes(needle)) {
          throw new Error('check-ssr-client-parity：注入点漂移（找不到 style 键名转换）');
        }
        return text.replace(needle, '      ([k, v]) => `${k}: ${String(v)}`');
      },
      () => expectFail(['node', 'scripts/check-ssr-client-parity.mjs'], 'check-ssr-client-parity'),
    );
  },

  'check-transition-engine': () => {
    // 注入：finishLeave 不调用 done ⇒ 离场元素永不被调用方移除，「leave 的 done 调用一次」必红
    const file = join(ROOT, 'packages/common/packages/transition-engine/dist/index.mjs');
    if (!existsSync(file))
      throw new Error('check-transition-engine：缺少 transition-engine dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '    try {\n      props.onAfterLeave?.(el);\n    } catch (error) {\n      this.reportHookError("onAfterLeave", error);\n    }\n    done?.();';
        if (!text.includes(needle)) {
          throw new Error('check-transition-engine：注入点漂移（找不到 finishLeave 的 done）');
        }
        return text.replace(
          needle,
          '    try {\n      props.onAfterLeave?.(el);\n    } catch (error) {\n      this.reportHookError("onAfterLeave", error);\n    }',
        );
      },
      () => expectFail(['node', 'scripts/check-transition-engine.mjs'], 'check-transition-engine'),
    );
  },

  'check-dialog-a11y': () => {
    // 注入：focusTrap 不执行初始聚焦 ⇒ 焦点留在 body/触发器，「焦点在对话框内」必红
    const file = join(ROOT, 'packages/common/packages/a11y/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-dialog-a11y：缺少 a11y dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = '  focusInitial();\n  function cleanup() {';
        if (!text.includes(needle)) {
          throw new Error('check-dialog-a11y：注入点漂移（找不到 focusTrap 的 focusInitial）');
        }
        return text.replace(needle, '  function cleanup() {');
      },
      () => expectFail(['node', 'scripts/check-dialog-a11y.mjs'], 'check-dialog-a11y'),
    );
  },

  'check-plugin-semantics': () => {
    // 注入：忽略 installed 幂等检查 ⇒ install 每次重跑，「重复 install 只执行一次」必红
    const file = join(ROOT, 'packages/ecosystem/packages/plugin/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-plugin-semantics：缺少 plugin dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = '    if (registered.installed) return true;';
        if (!text.includes(needle)) {
          throw new Error('check-plugin-semantics：注入点漂移（找不到 installed 幂等检查）');
        }
        return text.replace(needle, '    if (false) return true;');
      },
      () => expectFail(['node', 'scripts/check-plugin-semantics.mjs'], 'check-plugin-semantics'),
    );
  },

  'check-hmr': () => {
    // 注入：register 覆盖而非合并 handler ⇒ 先注册的 accept 丢失，「先 accept 后 dispose：两者都在」必红
    const file = join(ROOT, 'packages/ecosystem/packages/ssr-kit/packages/hmr/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-hmr：缺少 HMR dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '    this.handlers.set(key, existing ? { ...existing, ...handler } : handler);';
        if (!text.includes(needle)) {
          throw new Error('check-hmr：注入点漂移（找不到 register 的合并逻辑）');
        }
        return text.replace(needle, '    this.handlers.set(key, handler);');
      },
      () => expectFail(['node', 'scripts/check-hmr.mjs'], 'check-hmr'),
    );
  },

  'check-consumer-demo': () => {
    // 注入：emit 只查 props 不查 attrs ⇒ 子组件 bump 到不了父组件，「点击后计数变为 1」必红
    const file = join(ROOT, 'packages/component/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-consumer-demo：缺少 component dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          '  let handler = instance.props[handlerName] ?? instance.attrs[handlerName];';
        const kebab = '    handler = instance.props[rawKey] ?? instance.attrs[rawKey];';
        if (!text.includes(needle) || !text.includes(kebab)) {
          throw new Error('check-consumer-demo：注入点漂移（找不到 emit 的 handler 查找）');
        }
        // 两处 attrs 兜底都要去掉：只改第一处时 kebab 分支仍会从 attrs 命中原 handler。
        return text
          .replace(needle, '  let handler = instance.props[handlerName];')
          .replace(kebab, '    handler = instance.props[rawKey];');
      },
      () => expectFail(['node', 'scripts/check-consumer-demo.mjs'], 'check-consumer-demo'),
    );
  },

  'check-signal-authority': () => {
    // 注入：基础发射器不再引用共享语义层 ⇒「引用 codegen-signal-shared」必红
    const file = join(ROOT, 'packages/compiler/src/codegen-signal.ts');
    withPatchedFile(
      file,
      (text) => {
        const needle = "} from './codegen-signal-shared';";
        if (!text.includes(needle)) {
          throw new Error('check-signal-authority：注入点漂移（找不到共享语义层 import）');
        }
        return text.replace(needle, "} from './codegen-signal-shared-missing';");
      },
      () => expectFail(['node', 'scripts/check-signal-authority.mjs'], 'check-signal-authority'),
    );
  },

  'check-stale-capability-claims': () => {
    // 注入：把已证伪的结论写回 README ⇒「不含 fallback 从未出现」必红
    const file = join(ROOT, 'README.md');
    withPatchedFile(
      file,
      (text) => {
        if (!text.includes('# Lyt')) {
          throw new Error('check-stale-capability-claims：注入点漂移（README 标题缺失）');
        }
        return `${text}\nfallback 从未出现\n`;
      },
      () =>
        expectFail(
          ['node', 'scripts/check-stale-capability-claims.mjs'],
          'check-stale-capability-claims',
        ),
    );
  },

  'check-ui-slot-single-node': () => {
    // 注入：组件里新增一个只处理数组形态、没有 else 的 slot 分支 ⇒「只处理数组形态」判据必红
    const file = join(
      ROOT,
      'packages/ecosystem/packages/ui/src/components/__negctl-slot-single.ts',
    );
    withTempFile(
      file,
      [
        'export function pushSlotContent(slotContent: unknown, children: unknown[]): void {',
        '  if (Array.isArray(slotContent)) {',
        '    children.push(...slotContent);',
        '  }',
        '}',
        '',
      ].join('\n'),
      () =>
        expectFail(['tsx', 'scripts/check-ui-slot-single-node.ts'], 'check-ui-slot-single-node'),
    );
  },

  'check-negative-controls': () => {
    // 注入：给 gate.mjs 的 GATES 临时加一条未登记的门禁名 ⇒ 审计「未登记」判据必红
    withPatchedFile(
      GATE_PATH,
      (text) => {
        const needle = 'const GATES = [';
        if (!text.includes(needle)) {
          throw new Error('check-negative-controls：注入点漂移（找不到 GATES 数组）');
        }
        return text.replace(
          needle,
          `${needle}\n  {\n    name: '__negctl-ghost',\n    tier: 'fast',\n    cmd: ['node', '-e', ''],\n    approx: '~0s',\n    desc: '负控注入：仅登记名字，不接入任何判据',\n  },`,
        );
      },
      () =>
        expectFail(
          ['node', 'scripts/check-negative-controls.mjs', '--audit'],
          'check-negative-controls',
        ),
    );
  },

  'check-circular': () => {
    // 注入：产物入口多 import 一个回指入口的临时模块（真实环）⇒「发现循环依赖」判据必红
    const entry = join(ROOT, 'packages/vdom/dist/index.mjs');
    if (!existsSync(entry)) throw new Error('check-circular：缺少 vdom dist，请先构建');
    const cycle = join(ROOT, 'packages/vdom/dist/__negctl-cycle.mjs');
    withTempFile(cycle, 'import "./index.mjs";\nexport const NEGCTL_CYCLE = 1;\n', () =>
      withPatchedFile(
        entry,
        (text) => `import "./__negctl-cycle.mjs";\n${text}`,
        () => expectFail(['tsx', 'scripts/check-circular.ts'], 'check-circular'),
      ),
    );
  },

  'check-circular:src': () => {
    // 注入：在 vdom 源码造「入口 → a → b → 入口」的真实循环 ⇒「新增源码循环」判据必红
    const entry = join(ROOT, 'packages/vdom/src/index.ts');
    if (!existsSync(entry)) throw new Error('check-circular:src：缺少 packages/vdom/src/index.ts');
    const a = join(ROOT, 'packages/vdom/src/__negctl-cycle-a.ts');
    const b = join(ROOT, 'packages/vdom/src/__negctl-cycle-b.ts');
    withTempFile(a, "import './__negctl-cycle-b';\nexport const NEGCTL_CYCLE_A = 1;\n", () =>
      withTempFile(b, "import './index';\nexport const NEGCTL_CYCLE_B = 1;\n", () =>
        withPatchedFile(
          entry,
          (text) => `export * from './__negctl-cycle-a';\n${text}`,
          () => expectFail(['tsx', 'scripts/check-circular.ts', '--src'], 'check-circular:src'),
        ),
      ),
    );
  },

  'check-hydration': () => {
    // 注入：水合清理时不再保留服务端 <script> 资源节点 ⇒「根内的 <script type="application/json"> 被保留」必红
    const file = join(ROOT, 'packages/vdom/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-hydration：缺少 vdom dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle =
          'return tag === "script" || tag === "style" || tag === "link" || tag === "meta" || tag === "noscript" || tag === "base" || tag === "title";';
        if (!text.includes(needle)) {
          throw new Error('check-hydration：注入点漂移（找不到 isPreservedResourceNode）');
        }
        return text.replace(
          needle,
          'return tag === "style" || tag === "link" || tag === "meta" || tag === "noscript" || tag === "base" || tag === "title";',
        );
      },
      () => expectFail(['node', 'scripts/check-hydration.mjs'], 'check-hydration'),
    );
  },

  'lint:check': () => {
    // 注入：新增一个含未使用变量的 src 文件 ⇒ eslint error 必红
    const file = join(ROOT, 'packages/core/src/__negctl-lint.ts');
    withTempFile(
      file,
      'export function negctlLint(): number {\n  const unusedValue = 1;\n  return 0;\n}\n',
      () => expectFail(['pnpm', 'run', 'lint:check'], 'lint:check'),
    );
  },

  'format:check': () => {
    // 注入：新增一个格式不合规的文件 ⇒ prettier「Code style issues」必红
    const file = join(ROOT, 'packages/core/src/__negctl-format.ts');
    withTempFile(file, 'export const   negctlFormat =    {a:1,b:2}\n', () =>
      expectFail(['pnpm', 'run', 'format:check'], 'format:check'),
    );
  },

  'check-ui-contracts': () => {
    // 注入：把登记表里一个 pass 格改成 red（登记与代码漂移）⇒「登记表与源码不一致」判据必红
    const file = join(ROOT, 'scripts/ui-contracts.json');
    withPatchedFile(
      file,
      (text) => {
        const reg = JSON.parse(text);
        for (const name of Object.keys(reg.cells ?? {})) {
          for (const cap of Object.keys(reg.cells[name])) {
            const cell = reg.cells[name][cap];
            if (cell?.status === 'pass') {
              cell.status = 'red';
              cell.reason = '负控注入：人为制造登记与代码漂移';
              return `${JSON.stringify(reg, null, 2)}\n`;
            }
          }
        }
        throw new Error('check-ui-contracts：注入点漂移（登记表里没有 pass 格）');
      },
      () => expectFail(['node', 'scripts/check-ui-contracts.mjs'], 'check-ui-contracts'),
    );
  },

  build: () => {
    // 注入：拓扑最早的叶子包（shared-types）里加语法错误 ⇒ tsup 在第一个包就失败
    const file = join(ROOT, 'packages/shared-types/src/index.ts');
    try {
      withPatchedFile(
        file,
        (text) => `${text}\nexport const __negctlBuild: = 1;\n`,
        () => expectFail(['pnpm', 'run', 'build'], 'build'),
      );
    } finally {
      // tsup 在解析源码前会先 clean dist，失败注入会留下空 dist ⇒ 重建以恢复现场
      runOrThrow(['pnpm', '--filter', '@lytjs/shared-types', 'build'], 'build');
    }
  },

  'build:fallback': () => {
    // 注入：同一个最早叶子包（shared-types）加语法错误 ⇒ 兜底构建首个包即失败
    const file = join(ROOT, 'packages/shared-types/src/index.ts');
    try {
      withPatchedFile(
        file,
        (text) => `${text}\nexport const __negctlBuildFallback: = 1;\n`,
        () => expectFail(['node', 'scripts/build-packages.mjs'], 'build:fallback'),
      );
    } finally {
      // 兜底构建不 bail：注入失败会连带清空依赖包的 d.ts ⇒ 无注入重跑一次恢复全部 dist
      runOrThrow(['node', 'scripts/build-packages.mjs'], 'build:fallback');
    }
  },

  'type-check': () => {
    // 注入：拓扑最早的叶子包（shared-types）里加类型错误 ⇒ tsc 报 TS2322
    const file = join(ROOT, 'packages/shared-types/src/index.ts');
    withPatchedFile(
      file,
      (text) => `${text}\nexport const __negctlType: string = 1;\n`,
      () => expectFail(['pnpm', '-r', 'run', 'type-check'], 'type-check'),
    );
  },

  test: () => {
    // 注入：新增一个必定失败的临时测试 ⇒ vitest 非零退出
    const file = join(ROOT, 'packages/vdom/tests/__negctl-fail.test.ts');
    withTempFile(file, "import { expect } from 'vitest';\n\nexpect(1).toBe(2);\n", () =>
      expectFail(['pnpm', 'run', 'test'], 'test'),
    );
  },

  'test:coverage': () => {
    // 注入：同 test（覆盖率门禁首先要求用例全绿）⇒ vitest 非零退出
    const file = join(ROOT, 'packages/vdom/tests/__negctl-fail.test.ts');
    withTempFile(file, "import { expect } from 'vitest';\n\nexpect(1).toBe(2);\n", () =>
      expectFail(['pnpm', 'run', 'test:coverage'], 'test:coverage'),
    );
  },
};

/**
 * 控制成本分层（决定门禁那一轮跑哪些）：
 * - 快档（`--quick`，gate 的 fast 档调用）：只跑秒级控制 + 审计；
 * - 慢档（`--slow`，gate 的 slow 档调用）：跑十几秒到一分半的控制；
 * - 重控制（HEAVY）：分钟级（构建 / 全量测试），只在显式点名时运行。
 *
 * 分层**不降低判据**：每条控制仍然「注入必红、恢复回绿」，只是运行频率不同。
 */
const SLOW_CONTROLS = new Set([
  // 十几秒到一分半
  'check-circular',
  'check-circular:src',
  'lint:check',
  'format:check',
  // 单项 2s 以上的行为电池（放慢档，避免拖慢日常 fast 反馈）
  'check-integration',
  'check-render-shapes',
  'check-component-shapes',
  'check-ssr-client-parity',
  'check-dialog-a11y',
  'check-scaffold',
  'check-hydration',
  'check-lifecycle-release',
  'check-signal-profile-snapshot',
  // 发布物验收要打 76 个 tarball 并隔离安装（实测 ~20s），放慢档
  'check-release-artifacts',
  // 注入需要真实的现场覆盖率产物 ⇒ 必须排在 test:coverage 之后（gate slow 顺序已同步）
  'check-coverage-baseline',
]);
const HEAVY_CONTROLS = new Set(['build', 'build:fallback', 'type-check', 'test', 'test:coverage']);

/** 审计：gate.mjs 的每一项都必须有明确状态（verified / unverified / uninjectable） */
function audit() {
  const names = gateNames();
  const registry = existsSync(REGISTRY_PATH)
    ? JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'))
    : { verified: [], unverified: [], uninjectable: [] };
  const verified = new Set(registry.verified ?? []);
  const unverified = new Set(registry.unverified ?? []);
  const uninjectable = new Map((registry.uninjectable ?? []).map((e) => [e.name, e.reason]));
  const missing = names.filter(
    (n) => !verified.has(n) && !unverified.has(n) && !uninjectable.has(n),
  );
  const stale = [...verified, ...unverified, ...uninjectable.keys()].filter(
    (n) => !names.includes(n),
  );
  const bogus = [...verified].filter((n) => !CONTROLS[n]);
  const blank = [...uninjectable].filter(([, reason]) => !reason?.trim()).map(([n]) => n);
  const both = [...verified, ...unverified].filter((n) => uninjectable.has(n));

  console.log(`负控清单：${names.length} 项门禁`);
  console.log(`  已验证（注入后必红）：${verified.size}`);
  console.log(`  未验证（如实登记）：${unverified.size}`);
  console.log(`  不可负控（附原因）：${uninjectable.size}`);
  if (missing.length > 0) console.error(`  ❌ 未登记：${missing.join(', ')}`);
  if (stale.length > 0) console.error(`  ❌ 已不存在：${stale.join(', ')}`);
  if (bogus.length > 0) console.error(`  ❌ 标为已验证但没有控制脚本：${bogus.join(', ')}`);
  if (blank.length > 0) console.error(`  ❌ 不可负控但没写原因：${blank.join(', ')}`);
  if (both.length > 0) console.error(`  ❌ 同时出现在两类里：${both.join(', ')}`);
  return (
    missing.length === 0 &&
    stale.length === 0 &&
    bogus.length === 0 &&
    blank.length === 0 &&
    both.length === 0
  );
}

function sync() {
  const names = gateNames();
  const prev = existsSync(REGISTRY_PATH)
    ? JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'))
    : { uninjectable: [] };
  // 保留既有「不可负控」判定（原因无法自动推导），但只保留仍存在且确实没有控制脚本的
  const uninjectable = (prev.uninjectable ?? []).filter(
    (e) => names.includes(e.name) && !CONTROLS[e.name],
  );
  const pinned = new Set(uninjectable.map((e) => e.name));
  const verified = names.filter((n) => CONTROLS[n]);
  const unverified = names.filter((n) => !CONTROLS[n] && !pinned.has(n));
  writeFileSync(
    REGISTRY_PATH,
    `${JSON.stringify(
      { updatedAt: new Date().toISOString().slice(0, 10), verified, unverified, uninjectable },
      null,
      2,
    )}\n`,
  );
  // 生成结果必须与仓库格式一致（否则 `format:check` 会因维护命令而漂移）
  const pretty = spawnSync('prettier', ['--write', REGISTRY_PATH], {
    cwd: ROOT,
    env: ENV,
    stdio: 'ignore',
  });
  if (pretty.status !== 0) {
    console.warn('⚠️ prettier 未运行，请手动格式化 scripts/negative-controls.json');
  }
  console.log(
    `已同步 ${REGISTRY_PATH}：verified ${verified.length} / unverified ${unverified.length} / uninjectable ${uninjectable.length}`,
  );
}

const argv = process.argv.slice(2);
if (argv.includes('--sync')) {
  sync();
  process.exit(0);
}

const auditOk = audit();
if (argv.includes('--audit')) process.exit(auditOk ? 0 : 1);

const explicit = argv.filter((a) => !a.startsWith('--'));
let targets;
if (explicit.length > 0) {
  targets = explicit;
} else if (argv.includes('--quick')) {
  targets = Object.keys(CONTROLS).filter((n) => !SLOW_CONTROLS.has(n) && !HEAVY_CONTROLS.has(n));
} else if (argv.includes('--slow')) {
  targets = [...SLOW_CONTROLS].filter((n) => CONTROLS[n]);
} else {
  targets = Object.keys(CONTROLS).filter((n) => !HEAVY_CONTROLS.has(n));
}

let failed = 0;
for (const name of targets) {
  const control = CONTROLS[name];
  if (!control) {
    console.error(`❌ ${name}：未登记负控（如实状态见 scripts/negative-controls.json）`);
    failed += 1;
    continue;
  }
  const t0 = Date.now();
  try {
    lastFailure = '';
    control();
    console.log(`✅ ${name}：注入后转红，恢复后回绿（${((Date.now() - t0) / 1000).toFixed(1)}s）`);
    if (lastFailure) console.log(`   ↳ 红在：${lastFailure}`);
  } catch (err) {
    console.error(`❌ ${name}：${err.message}`);
    failed += 1;
  }
}

if (!auditOk) failed += 1;
console.log(`\n负控结果：${targets.length - failed} 通过 / ${failed} 失败`);
process.exit(failed === 0 ? 0 : 1);
