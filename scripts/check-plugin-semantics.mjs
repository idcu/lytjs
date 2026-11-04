#!/usr/bin/env node
/**
 * 门禁：插件系统语义（`@lytjs/plugin`）
 *
 * ## 为什么需要这一项
 *
 * 插件系统有两套安装入口：`@lytjs/core` 的 `app.use()` 和注册表自己的
 * `await registry.install(name)`。**同一个插件走两条路必须表现一致** ——
 * 一旦分叉，症状全是「插件装上了但没生效」：生命周期钩子没跑、依赖没检查、
 * 版本范围判错导致直接拒绝安装。这些都不抛异常，只在运行时某处莫名其妙地失败。
 *
 * 版本范围那一族尤其贵：`app.use()` 在依赖不满足时**直接抛错拒绝安装**，
 * 所以 `^1.0` 这种标准写法被判成「不满足」时，插件根本装不上，
 * 而错误信息看起来像「版本真的不兼容」。
 *
 * ## 2026-11-05 首次运行抓到的缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | **独立 `install()` 不跑 `beforeInstall` / `afterInstall`**（P0） | 钩子调用记录 `["dep-install"]`（应为 before→install→after）；`beforeInstall` 返回 `false` 仍装上了 |
 * | 2 | **独立 `install()` 不检查依赖**（P0） | 声明 `dependencies: [{name:'missing-dep'}]` 照样 `installed: true` |
 * | 3 | **`install()` 失败不发 `error` 事件**（P1） | 抛错后事件列表为空；`before:install` 已发、`after:install` 永不到来 |
 * | 4 | **冲突检查只查一个方向**（P1） | 先注册 `b(conflicts:['a'])` 再注册 `a` ⇒ **放行**（`conflicts` 的生效取决于注册顺序） |
 * | 5 | **版本范围把标准写法判成不满足**（P0） | `^1.0` / `~1.2` / `1.2` / `*` 对 1.2.3 全部 `satisfied: false` |
 * | 6 | **区间交集被放行**（P0 反向） | `>=1.0.0 <2.0.0` 对 **3.0.0** 判为满足（`parseVersion` 不锚定结尾） |
 * | 7 | `^0.2.3` 允许 `0.3.0`（P1） | semver 语义是 `<0.3.0` |
 * | 8 | `resolveLoadOrder()` 静默跳过缺失依赖（P1） | 返回的顺序「看起来完全正常」，无任何提示 |
 * | 9 | `unregister()` 不检查依赖方（P1） | 卸掉 `base` 后依赖它的插件仍在表里，无告警 |
 * | 10 | `PluginValidator.registerKnownPlugins()` **是空操作**（P1） | 名字进了集合，但**没有任何规则读过它**（README 却宣传了它） |
 */
import { join } from 'node:path';

const ROOT = process.cwd();
const { PluginRegistry, PluginValidator } = await import(
  join(ROOT, 'packages/ecosystem/packages/plugin/dist/index.mjs')
);

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
const mk = () => new PluginRegistry();

/** 捕获 console.warn（注册表用它报告缺依赖 / 卸载被依赖的插件） */
const captureWarn = async (fn) => {
  const lines = [];
  const original = console.warn;
  console.warn = (...args) => lines.push(args.map(String).join(' '));
  try {
    await fn();
  } finally {
    console.warn = original;
  }
  return lines;
};

/** 单次依赖检查：actual 版本 vs 声明的范围 */
const satisfies = (actual, range) => {
  const r = mk();
  r.register({ name: 'x', version: actual, install: () => {} });
  return r.checkDependencies({
    name: 'y',
    install: () => {},
    dependencies: [{ name: 'x', version: range }],
  }).satisfied;
};

// ══════════════════════════════════════════════════════════
section('[1] 独立 install()：生命周期钩子必须与 app.use() 一致');
{
  const registry = mk();
  const log = [];
  registry.register({ name: 'base', version: '1.0.0', install: () => log.push('base') });
  registry.register({
    name: 'dep',
    version: '1.0.0',
    install: () => log.push('install'),
    dependencies: [{ name: 'base', version: '^1.0.0' }],
    beforeInstall: () => {
      log.push('before');
      return true;
    },
    afterInstall: () => log.push('after'),
  });

  const ok = await registry.install('dep', {});
  check(
    '顺序：beforeInstall → install → afterInstall（此前两个钩子完全不跑）',
    JSON.stringify(log) === JSON.stringify(['before', 'install', 'after']),
    log,
  );
  check('安装成功且状态为已安装', ok === true && registry.get('dep').installed === true);
}
{
  const registry = mk();
  const log = [];
  registry.register({
    name: 'p',
    install: () => log.push('installed'),
    beforeInstall: () => {
      log.push('before');
      return false;
    },
  });
  const ok = await registry.install('p', {});
  check(
    'beforeInstall 返回 false ⇒ 取消安装（此前照样装）',
    ok === false && log.includes('installed') === false && registry.get('p').installed === false,
    { ok, log, installed: registry.get('p').installed },
  );
  check('取消安装后仍留在注册表（可稍后重试）', registry.has('p') === true);
}
{
  const registry = mk();
  const log = [];
  registry.register({
    name: 'async-hook',
    install: () => log.push('install'),
    beforeInstall: async () => {
      await new Promise((r) => setTimeout(r, 5));
      log.push('async-before');
      return true;
    },
  });
  const ok = await registry.install('async-hook', {});
  check(
    '异步 beforeInstall 可被 await（app.use 做不到，registry.install 可以）',
    ok === true && log[0] === 'async-before' && log[1] === 'install',
    log,
  );
}
{
  const registry = mk();
  const log = [];
  registry.register({
    name: 'bad-hook',
    install: () => log.push('install'),
    beforeInstall: () => {
      throw new Error('hook-boom');
    },
  });
  const ok = await registry.install('bad-hook', {});
  check(
    'beforeInstall 抛错 ⇒ 不安装、返回 false',
    ok === false && log.length === 0 && registry.get('bad-hook').installed === false,
    { ok, log },
  );
}

// ══════════════════════════════════════════════════════════
section('[2] 依赖闸门：两条安装路径必须同一套语义');
{
  const registry = mk();
  const log = [];
  registry.register({
    name: 'a',
    install: () => log.push('a'),
    dependencies: [{ name: 'missing-dep' }],
  });
  const ok = await registry.install('a', {});
  check(
    '缺必需依赖 ⇒ 拒绝安装（此前照样装）',
    ok === false && log.length === 0 && registry.get('a').installed === false,
    { ok, log },
  );
}
{
  const registry = mk();
  registry.register({ name: 'lib', version: '1.0.0', install: () => {} });
  registry.register({
    name: 'needs-v2',
    install: () => {},
    dependencies: [{ name: 'lib', version: '^2.0.0' }],
  });
  const ok = await registry.install('needs-v2', {});
  check(
    '必需依赖版本不符 ⇒ 拒绝安装',
    ok === false && registry.get('needs-v2').installed === false,
  );
}
{
  const registry = mk();
  registry.register({ name: 'opt', version: '9.0.0', install: () => {} });
  await registry.install('opt', {});
  registry.register({
    name: 'soft',
    install: () => {},
    optionalDependencies: [{ name: 'opt', version: '^1.0.0' }],
  });
  const dep = registry.checkDependencies(registry.get('soft').plugin);
  const ok = await registry.install('soft', {});
  check(
    '对照：可选依赖版本不符 **不** 阻断安装（`satisfied` 只反映必需依赖）',
    dep.satisfied === true && ok === true,
    { satisfied: dep.satisfied, ok },
  );
  check(
    '`versionMismatch` 含可选、`requiredVersionMismatch` 只含必需',
    dep.versionMismatch.length === 1 && (dep.requiredVersionMismatch ?? []).length === 0,
    { all: dep.versionMismatch, required: dep.requiredVersionMismatch },
  );
}
{
  const registry = mk();
  registry.register({ name: 'dep-ok', version: '1.4.0', install: () => {} });
  registry.register({
    name: 'main-ok',
    install: () => {},
    dependencies: [{ name: 'dep-ok', version: '^1.0' }],
  });
  const ok = await registry.install('main-ok', {});
  check('依赖满足（范围写成 `^1.0`）⇒ 正常安装', ok === true && registry.get('main-ok').installed);
}

// ══════════════════════════════════════════════════════════
section('[3] 安装失败：必须有 error 事件（且事件成对）');
{
  const registry = mk();
  const events = [];
  for (const name of ['before:install', 'after:install', 'error']) {
    registry.on(name, (event, data) => events.push(`${event}:${data.name}`));
  }
  registry.register({
    name: 'boom',
    install: () => {
      throw new Error('kaboom');
    },
  });

  let thrown = null;
  try {
    await registry.install('boom', {});
  } catch (err) {
    thrown = err instanceof Error ? err.message : String(err);
  }
  check('同步抛错：异常仍然抛给调用方（不吞）', thrown === 'kaboom', thrown);
  check(
    '同步抛错：补一条 `error` 事件（此前一条事件都没有）',
    events.includes('error:boom'),
    events,
  );
  check('失败后 `installed` 保持 false', registry.get('boom').installed === false);
  check(
    '对照：`before:install` 发过但 `after:install` 不能发（配对不成立）',
    events.includes('before:install:boom') && !events.includes('after:install:boom'),
    events,
  );
}
{
  const registry = mk();
  const errors = [];
  registry.on('error', (event, data) => errors.push(data.error));
  registry.register({
    name: 'reject',
    install: async () => {
      throw new Error('async-kaboom');
    },
  });
  let thrown = null;
  try {
    await registry.install('reject', {});
  } catch (err) {
    thrown = err instanceof Error ? err.message : String(err);
  }
  check(
    '异步 reject：同样抛给调用方并留下 error 事件',
    thrown === 'async-kaboom' && errors.some((line) => line.includes('async-kaboom')),
    { thrown, errors },
  );
}
{
  const registry = mk();
  const errors = [];
  registry.on('error', (event, data) => errors.push(data.error));
  registry.register({
    name: 'bad-after',
    install: () => {},
    afterInstall: () => {
      throw new Error('after-boom');
    },
  });
  const ok = await registry.install('bad-after', {});
  check(
    'afterInstall 抛错：插件仍算装好（已生效），但必须留痕',
    ok === true &&
      registry.get('bad-after').installed === true &&
      errors.some((line) => line.includes('after-boom')),
    { ok, errors },
  );
}

// ══════════════════════════════════════════════════════════
section('[4] 冲突是对称关系：注册顺序不能改变结论');
{
  const first = mk();
  first.register({ name: 'a', install: () => {} });
  const res = first.register({ name: 'b', install: () => {}, conflicts: ['a'] });
  check('先 a 后 b(conflicts:[a]) ⇒ 拒绝', res.success === false, res);
}
{
  const second = mk();
  second.register({ name: 'b', install: () => {}, conflicts: ['a'] });
  const res = second.register({ name: 'a', install: () => {} });
  check('先 b(conflicts:[a]) 后 a ⇒ 也拒绝（此前放行，声明被无视）', res.success === false, res);
}
{
  const registry = mk();
  registry.register({ name: 'x', install: () => {} });
  registry.register({ name: 'y', install: () => {}, conflicts: ['z'] });
  const res = registry.register({ name: 'w', install: () => {} });
  check('对照：没有冲突声明时正常注册', res.success === true, res);
}

// ══════════════════════════════════════════════════════════
section('[5] 版本范围：标准写法不能被判成「不满足」');
{
  const cases = [
    ['1.2.3', '^1.0', true, '`^1.0` 缺省段'],
    ['1.2.3', '~1.2', true, '`~1.2` 缺省段'],
    ['1.2.3', '1.2', true, '`1.2` 视为 1.2.x'],
    ['1.2.3', '*', true, '`*` 任意版本'],
    ['1.2.3', '^1.2.3', true, '精确 caret'],
    ['1.2.3', '^2.0.0', false, '主版本不同'],
    ['1.2.3', '1.2.3', true, '三段精确匹配'],
    ['1.2.4', '1.2.3', false, '三段精确不匹配'],
    ['1.9.9', '~1.9', true, 'tilde 同次版本'],
    ['1.10.0', '~1.9', false, 'tilde 跨次版本'],
    ['0.2.5', '^0.2.3', true, '^0.2.3 允许 0.2.x'],
    ['0.3.0', '^0.2.3', false, '^0.2.3 不允许 0.3.0'],
    ['0.0.3', '^0.0.3', true, '^0.0.3 精确'],
    ['0.0.4', '^0.0.3', false, '^0.0.4 越界'],
    ['1.5.0', '>=1.0.0 <2.0.0', true, '交集命中'],
    ['3.0.0', '>=1.0.0 <2.0.0', false, '交集上界（此前放行 3.0.0）'],
    ['2.5.0', '^1.0.0 || ^2.0.0', true, '并集命中'],
    ['3.0.0', '^1.0.0 || ^2.0.0', false, '并集不命中'],
    ['1.4.0', '1', true, '`1` 视为 1.x'],
    ['2.0.0', '1', false, '`1` 不匹配 2.x'],
    ['1.2.3', '>=1.0.0', true, '下界'],
    ['0.9.0', '>=1.0.0', false, '低于下界'],
  ];
  for (const [actual, range, expected, label] of cases) {
    const got = satisfies(actual, range);
    check(`${label}：${actual} vs "${range}" ⇒ ${expected}`, got === expected, got);
  }
  check('对照：无法解析的版本号不满足任何范围', satisfies('not-a-version', '^1.0') === false);
}

// ══════════════════════════════════════════════════════════
section('[6] 加载顺序：拓扑排序 + 缺依赖要说出来');
{
  const registry = mk();
  registry.register({ name: 'app', install: () => {}, dependencies: [{ name: 'db' }] });
  registry.register({ name: 'db', install: () => {}, dependencies: [{ name: 'core' }] });
  registry.register({ name: 'core', install: () => {} });
  check(
    '依赖先装（逆序注册也能排对）',
    JSON.stringify(registry.resolveLoadOrder().map((p) => p.name)) ===
      JSON.stringify(['core', 'db', 'app']),
    registry.resolveLoadOrder().map((p) => p.name),
  );
}
{
  const registry = mk();
  registry.register({ name: 'a', install: () => {}, dependencies: [{ name: 'b' }] });
  registry.register({ name: 'b', install: () => {}, dependencies: [{ name: 'a' }] });
  let message = null;
  try {
    registry.resolveLoadOrder();
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  check(
    '循环依赖抛错（含插件名）',
    typeof message === 'string' && message.includes('Circular'),
    message,
  );
}
{
  const registry = mk();
  registry.register({ name: 'needy', install: () => {}, dependencies: [{ name: 'ghost' }] });
  let order = null;
  const warnings = await captureWarn(() => {
    order = registry.resolveLoadOrder().map((p) => p.name);
  });
  check(
    '缺依赖时给出告警（此前完全静默）',
    warnings.some((line) => line.includes('ghost')),
    { order, warnings: warnings.length },
  );
}
{
  const registry = mk();
  registry.register({ name: 'app', install: () => {}, optionalDependencies: [{ name: 'opt' }] });
  registry.register({ name: 'opt', install: () => {} });
  check(
    '可选依赖在场时也参与排序（此前只看 dependencies）',
    JSON.stringify(registry.resolveLoadOrder().map((p) => p.name)) ===
      JSON.stringify(['opt', 'app']),
    registry.resolveLoadOrder().map((p) => p.name),
  );
}
{
  const registry = mk();
  const log = [];
  registry.register({ name: 'a', install: () => log.push('a') });
  registry.register({ name: 'b', install: () => log.push('b'), dependencies: [{ name: 'a' }] });
  for (const plugin of registry.resolveLoadOrder()) {
    await registry.install(plugin.name, {});
  }
  check(
    '端到端：按顺序安装后全部 installed',
    JSON.stringify(log) === JSON.stringify(['a', 'b']) && registry.getInstalled().length === 2,
    log,
  );
}

// ══════════════════════════════════════════════════════════
section('[7] 卸载：被依赖时必须告警');
{
  const registry = mk();
  registry.register({ name: 'base', install: () => {} });
  registry.register({ name: 'user', install: () => {}, dependencies: [{ name: 'base' }] });
  let removed = null;
  const warnings = await captureWarn(() => {
    removed = registry.unregister('base');
  });
  check('卸载成功', removed === true && registry.has('base') === false);
  check(
    '被依赖时告警并点名依赖方（此前完全静默）',
    warnings.some((line) => line.includes('user')),
    warnings,
  );
}
{
  const registry = mk();
  registry.register({ name: 'lonely', install: () => {} });
  const warnings = await captureWarn(() => registry.unregister('lonely'));
  check('对照：无人依赖时不产生告警', warnings.length === 0, warnings);
}
{
  const registry = mk();
  let cleaned = false;
  registry.register({ name: 'with-cleanup', install: () => {}, cleanup: () => (cleaned = true) });
  await registry.install('with-cleanup', {});
  registry.unregister('with-cleanup');
  check('已安装插件的 cleanup 在卸载时被调用', cleaned === true);
}
{
  const registry = mk();
  let cleaned = false;
  registry.register({
    name: 'never-installed',
    install: () => {},
    cleanup: () => (cleaned = true),
  });
  registry.unregister('never-installed');
  check('对照：未安装过的插件不调用 cleanup', cleaned === false);
}

// ══════════════════════════════════════════════════════════
section('[8] 校验器：registerKnownPlugins 必须真的影响校验结果');
{
  const plugin = {
    name: 'p',
    install: () => {},
    dependencies: [{ name: 'ghost' }],
  };
  const validator = new PluginValidator();
  const before = validator.validate(plugin);
  check('未登记已知插件时不产生依赖告警（保持既有行为）', before.warningCount === 0, before.issues);

  validator.registerKnownPlugins(['real-plugin']);
  const after = validator.validate(plugin);
  check(
    '登记后：依赖不在已知列表 ⇒ warning 点名 ghost（此前该方法完全无效）',
    after.warningCount === 1 && after.issues.some((i) => i.message.includes('ghost')),
    after.issues,
  );
  check('仍是 warning 级别（不阻断校验）', after.valid === true);

  validator.registerKnownPlugins(['ghost']);
  check('把依赖登记进已知列表后不再告警', validator.validate(plugin).warningCount === 0);
}
{
  const validator = new PluginValidator();
  validator.registerKnownPlugins(['a']);
  const report = validator.validate({
    name: 'self-dep',
    install: () => {},
    dependencies: [{ name: 'self-dep' }],
  });
  check(
    '对照：自依赖仍报 error（不被「已知列表」逻辑覆盖）',
    report.valid === false && report.issues.some((i) => i.message.includes('depend on itself')),
    report.issues,
  );
}

// ══════════════════════════════════════════════════════════
section('[9] 对照：正常路径不回归');
{
  const registry = mk();
  let count = 0;
  registry.register({ name: 'once', install: () => count++ });
  await registry.install('once', {});
  await registry.install('once', {});
  check('重复 install 只执行一次', count === 1 && registry.get('once').installed === true, count);
}
{
  const registry = mk();
  registry.register({ name: 'registered-only', install: () => {} });
  check(
    '对照：register() 不自动安装（installed=false，与 JSDoc 一致）',
    registry.get('registered-only').installed === false && registry.getInstalled().length === 0,
  );
}
{
  const registry = mk();
  const res = registry.register({ name: 'plain', install: () => {} });
  check('对照：基础注册成功', res.success === true && res.name === 'plain', res);
  check(
    '对照：size / getNames / has 正常',
    registry.size === 1 && registry.getNames()[0] === 'plain',
  );
}
{
  const registry = mk();
  const res = registry.register({ name: 'plain', install: () => {} });
  const dup = registry.register({ name: 'plain', install: () => {} });
  check('对照：重复注册被拒', res.success === true && dup.success === false, dup);
}
{
  const registry = mk();
  const ok = await registry.install('nope', {});
  check('对照：安装未注册的插件返回 false', ok === false);
}
{
  const registry = mk();
  const off = registry.on('after:install', () => {});
  const hits = [];
  registry.on('after:install', (event, data) => hits.push(data.name));
  off();
  registry.register({ name: 'evt', install: () => {} });
  await registry.install('evt', {});
  check('对照：after:install 事件正常触发', JSON.stringify(hits) === JSON.stringify(['evt']), hits);
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
