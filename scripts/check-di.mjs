#!/usr/bin/env node
/**
 * 门禁：依赖注入内核（`@lytjs/di`）
 *
 * ## 为什么需要这一项
 *
 * `@lytjs/di` 只有 498 行、原本**只有 1 个测试文件**，但它是 `@lytjs/component`
 * provide/inject 的**内核**。它有两个"危险属性"：
 *
 *   · `currentProviderNode` 是**模块级全局**（和 `setActivePinia` 一类）
 *   · `getProviderRoot()` 是**进程级单例** ⇒ SSR 下就是跨请求共享状态
 *
 * ## 2026-11-03 首次运行抓到 5 个缺陷
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | `exitProviderScope` 恢复的是 `node.parent`，而 root 是自动创建的 ⇒ **作用域外 current 停在进程级 root** | `getCurrentProviderNode()` 返回 root 而非 null |
 * | 2 | `createNoopScope` 的 `active` 来自**模块级** `noopActive` 且在创建时值拷贝 | 一个 scope `stop()` 后，**后续所有 scope 一出生就是 inactive**；且本 scope 的 `active` 不翻转 |
 * | 3 | `useExisting` 在 provide 时调 `resolveAlias`，而所有公开调用点都没传 resolver | 别名恒为 undefined ⇒ 注入报 "No provider found" |
 * | 4 | `useFactory` 在 **provide 时**就求值 | `lifecycle: 'transient'` **永远不生效**（判据是 `typeof value === 'function'`，而 value 已是结果） |
 * | 5 | `resetProviderScope` 只置空引用，**不 stop 作用域** | scope 里注册的清理逻辑永不执行（资源泄漏） |
 *
 * 缺陷 1 的后果最严重：作用域外 `getCurrentProviderNode()` 拿到 root ⇒
 * `provideValue()` 直接写进**进程级**根 ⇒ SSR 跨请求泄漏（与前几轮 store 的问题同源）。
 *
 * ## 关于被改写的既有测试
 *
 * 有 4 条既有用例断言「作用域退出后 current 是 root」——那正是缺陷 1 的行为。
 * 已改写为 `toBeNull()` 并注明原因（**测试锁定了缺陷**是这类问题的常见形态）。
 */

const ROOT = process.cwd();
const di = await import(`${ROOT}/packages/ecosystem/packages/di/dist/index.mjs`);
const {
  enterProviderScope,
  exitProviderScope,
  withProviderScope,
  getCurrentProviderNode,
  getProviderRoot,
  getActiveProviderRoot,
  resetProviderScope,
  provideValue,
  injectValue,
  provideToNode,
  createProviderRecord,
  setProviderScopeFactory,
  InjectionToken,
  InjectionError,
} = di;

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

// ══════════════════════════════════════════════════════════
section('[1] withProviderScope 必须恢复进入前的上下文');
{
  resetProviderScope();
  check(
    '初始 current 为 null',
    getCurrentProviderNode() === null,
    String(getCurrentProviderNode()),
  );

  withProviderScope(() => {
    check('作用域内 current 非 null', getCurrentProviderNode() !== null, 'null');
  });

  check(
    '作用域结束后 current 恢复为 null（而不是停在进程级 root）',
    getCurrentProviderNode() === null,
    getCurrentProviderNode() ? '停在 root（SSR 下会跨请求泄漏）' : 'null',
  );
}

// ══════════════════════════════════════════════════════════
section('[2] 抛错时也必须恢复');
{
  resetProviderScope();
  let threw = false;
  try {
    withProviderScope(() => {
      throw new Error('boom');
    });
  } catch {
    threw = true;
  }
  check('异常向外传播', threw === true, '被吞掉了');
  check(
    '异常后 current 恢复为 null',
    getCurrentProviderNode() === null,
    String(getCurrentProviderNode()),
  );
}

// ══════════════════════════════════════════════════════════
section('[3] 嵌套作用域');
{
  resetProviderScope();
  const seen = [];
  withProviderScope(() => {
    const outer = getCurrentProviderNode();
    withProviderScope(() => {
      const inner = getCurrentProviderNode();
      seen.push(inner !== null && inner.parent === outer);
    });
    seen.push(getCurrentProviderNode() === outer);
  });
  check('内层节点的 parent 是外层', seen[0] === true, seen[0]);
  check('内层退出后回到外层', seen[1] === true, seen[1]);
  check(
    '全部退出后 current 为 null',
    getCurrentProviderNode() === null,
    String(getCurrentProviderNode()),
  );
}

// ══════════════════════════════════════════════════════════
section('[4] scope 生命周期（active 标志）');
{
  resetProviderScope();
  const node = enterProviderScope();
  check('新 scope active 为 true', node.scope.active === true, String(node.scope.active));
  exitProviderScope();
  check('stop 后 active 应为 false', node.scope.active === false, `active=${node.scope.active}`);
}

// ══════════════════════════════════════════════════════════
section('[5] 一个 scope 的 stop 不得污染后续新建的 scope');
{
  resetProviderScope();
  const a = enterProviderScope();
  a.scope.stop();
  exitProviderScope();

  const b = enterProviderScope();
  check(
    '新 scope 仍是 active（未被上一个的 stop 污染）',
    b.scope.active === true,
    `active=${b.scope.active}`,
  );
  let ran = false;
  b.scope.run(() => {
    ran = true;
  });
  check('新 scope 的 run 正常执行', ran === true, 'run 没执行');
  exitProviderScope();
}

// ══════════════════════════════════════════════════════════
section('[6] 解析：沿父链查找');
{
  resetProviderScope();
  const root = getProviderRoot();
  provideToNode(root, 'global', 'G');

  withProviderScope(() => {
    provideValue('local', 'L');
    check('能拿到本级提供的值', injectValue('local') === 'L', String(injectValue('local')));
    check('能拿到父级提供的值', injectValue('global') === 'G', String(injectValue('global')));
  });
}

// ══════════════════════════════════════════════════════════
section('[7] 未提供时的行为：throw / optional / default');
{
  resetProviderScope();
  let threw = null;
  try {
    injectValue('nope');
  } catch (e) {
    threw = e;
  }
  check(
    '未提供时抛 InjectionError',
    threw instanceof InjectionError,
    threw ? threw.constructor.name : 'null',
  );
  check(
    'optional 返回 undefined',
    injectValue('nope', { optional: true }) === undefined,
    '不是 undefined',
  );
  check(
    'default 返回值',
    injectValue('nope', { default: 'D' }) === 'D',
    String(injectValue('nope', { default: 'D' })),
  );
  check('default 支持函数', injectValue('nope', { default: () => 'F' }) === 'F', '不是 F');
}

// ══════════════════════════════════════════════════════════
section('[8] ProviderConfig：useFactory / useExisting / provide');
{
  resetProviderScope();
  const root = getProviderRoot();
  let calls = 0;
  provideToNode(root, 'factory', {
    useFactory: () => {
      calls++;
      return 'F' + calls;
    },
  });
  check('useFactory 求值', injectValue('factory') === 'F1', String(injectValue('factory')));

  provideToNode(root, 'base', 'BASE');
  provideToNode(root, 'alias', { useExisting: 'base' });
  let aliasVal;
  try {
    aliasVal = injectValue('alias');
  } catch (e) {
    aliasVal = '<throw: ' + e.message + '>';
  }
  check('useExisting 解析到目标值', aliasVal === 'BASE', String(aliasVal));

  provideToNode(root, 'direct', { provide: 'D' });
  check('provide 字段生效', injectValue('direct') === 'D', String(injectValue('direct')));
}

// ══════════════════════════════════════════════════════════
section('[9] lifecycle：singleton vs transient');
{
  resetProviderScope();
  const root = getProviderRoot();
  let n = 0;
  provideToNode(root, 'trans', { useFactory: () => ++n, lifecycle: 'transient' });
  const t1 = injectValue('trans');
  const t2 = injectValue('trans');
  check('transient 每次求值', t1 !== t2, `t1=${t1} t2=${t2}`);

  let m = 0;
  provideToNode(root, 'single', { useFactory: () => ++m, lifecycle: 'singleton' });
  const s1 = injectValue('single');
  const s2 = injectValue('single');
  check('singleton 只求值一次', s1 === s2, `s1=${s1} s2=${s2}`);
}

// ══════════════════════════════════════════════════════════
section('[10] InjectionToken');
{
  resetProviderScope();
  const root = getProviderRoot();
  const TOKEN = new InjectionToken('my-token');
  provideToNode(root, TOKEN, 'T');
  check('令牌能解析', injectValue(TOKEN) === 'T', String(injectValue(TOKEN)));

  const WITH_FACTORY = new InjectionToken('with-factory', { factory: () => 'FROM_FACTORY' });
  check(
    '令牌自带工厂作为兜底',
    injectValue(WITH_FACTORY) === 'FROM_FACTORY',
    String(injectValue(WITH_FACTORY)),
  );
}

// ══════════════════════════════════════════════════════════
section('[11] skipSelf');
{
  resetProviderScope();
  const root = getProviderRoot();
  provideToNode(root, 'k', 'ROOT');

  withProviderScope(() => {
    provideValue('k', 'SELF');
    check('默认优先本级', injectValue('k') === 'SELF', String(injectValue('k')));
    check(
      'skipSelf 跳过本级拿到父级',
      injectValue('k', { skipSelf: true }) === 'ROOT',
      String(injectValue('k', { skipSelf: true })),
    );
  });
}

// ══════════════════════════════════════════════════════════
section('[12] resetProviderScope 必须停止残留作用域');
{
  resetProviderScope();
  let stopped = 0;
  setProviderScopeFactory(() => ({
    get active() {
      return true;
    },
    run: (fn) => fn(),
    stop: () => {
      stopped++;
    },
  }));

  const node = enterProviderScope();
  node.scope.stop(); // 手动 stop 记 1 次
  resetProviderScope();
  check(
    'reset 后 current 为 null',
    getCurrentProviderNode() === null,
    String(getCurrentProviderNode()),
  );
  check('reset 后全局根节点被清空', getActiveProviderRoot() === null, '仍有 root');
  check('reset 会 stop 当前作用域（资源释放）', stopped >= 2, `stopped=${stopped}`);

  // 恢复默认工厂，避免影响后续断言
  setProviderScopeFactory(() => ({
    get active() {
      return true;
    },
    run: (fn) => fn(),
    stop: () => {},
  }));
}

// ══════════════════════════════════════════════════════════
section('[13] 进程级全局根节点：SSR 语义记录');
{
  resetProviderScope();
  // 请求 A：把用户身份写进全局根（作用域外）
  provideValue('reqUser', 'ALICE');

  const seenByB = (() => {
    try {
      return injectValue('reqUser');
    } catch {
      return '<not found>';
    }
  })();

  check(
    '作用域外的 provideValue 写进进程级根 ⇒ 会跨"请求"可见（这是当前语义）',
    seenByB === 'ALICE',
    `B 看到 ${JSON.stringify(seenByB)}`,
  );

  // 正确用法：每个请求包一层作用域
  resetProviderScope();
  const reqA = withProviderScope(() => {
    provideValue('reqUser', 'ALICE');
    return injectValue('reqUser');
  });
  const reqB = withProviderScope(() => {
    try {
      return injectValue('reqUser');
    } catch {
      return '<not found>';
    }
  });
  check(
    '用 withProviderScope 隔离后，请求 B 读不到 A 的值',
    reqB === '<not found>',
    `B 看到 ${JSON.stringify(reqB)}`,
  );
  check('请求 A 自己的值正常', reqA === 'ALICE', String(reqA));
}

// ══════════════════════════════════════════════════════════
section('[14] 工厂是懒求值：provide 时不调用');
{
  resetProviderScope();
  const root = getProviderRoot();
  let called = 0;
  provideToNode(root, 'lazy', {
    useFactory: () => {
      called++;
      return 'L';
    },
  });
  check('provide 时未调用工厂', called === 0, `called=${called}`);
  const v = injectValue('lazy');
  check('注入时才调用工厂', called === 1 && v === 'L', `called=${called} v=${v}`);
  injectValue('lazy');
  check('singleton 只调用一次', called === 1, `called=${called}`);
}

// ══════════════════════════════════════════════════════════
section('[15] 别名：先声明、后提供目标');
{
  resetProviderScope();
  const root = getProviderRoot();
  provideToNode(root, 'late-alias', { useExisting: 'late-target' });
  provideToNode(root, 'late-target', 'TARGET');
  check(
    '后提供的目标也能解析到（读时解析）',
    injectValue('late-alias') === 'TARGET',
    String(injectValue('late-alias')),
  );
}

// ══════════════════════════════════════════════════════════
section('[16] 别名环路：明确报错，不死递归');
{
  resetProviderScope();
  const root = getProviderRoot();
  provideToNode(root, 'a', { useExisting: 'b' });
  provideToNode(root, 'b', { useExisting: 'a' });
  let err = null;
  try {
    injectValue('a');
  } catch (e) {
    err = e;
  }
  check('环路被检测并抛错', err !== null, '没有抛错（可能死递归）');
  check('错误信息提到 alias', err && /alias/i.test(err.message), err ? err.message : 'null');
}

// ══════════════════════════════════════════════════════════
section('[17] 别名指向不存在的目标');
{
  resetProviderScope();
  const root = getProviderRoot();
  provideToNode(root, 'dangling', { useExisting: 'missing-target' });
  let err = null;
  try {
    injectValue('dangling');
  } catch (e) {
    err = e;
  }
  check(
    '悬空别名抛 InjectionError（不返回 undefined 冒充成功）',
    err instanceof InjectionError,
    err ? err.constructor.name : 'no throw',
  );
}

// ══════════════════════════════════════════════════════════
section('[18] 手工构造的 transient 记录（向后兼容）');
{
  resetProviderScope();
  const root = getProviderRoot();
  provideToNode(root, 'manual', 'placeholder');
  root.providers.set('manual', { value: () => Math.random(), lifecycle: 'transient' });
  const a = injectValue('manual');
  const b = injectValue('manual');
  check('手工构造的 transient 记录仍按需解析', a !== b, `a=${a} b=${b}`);
}

// ══════════════════════════════════════════════════════════
section('[19] createProviderRecord 的基本形态');
{
  const rec = createProviderRecord('k', 'v');
  check('普通值 → value 直接是它', rec.value === 'v', String(rec.value));
  check('普通值 → 默认 singleton', rec.lifecycle === 'singleton', rec.lifecycle);

  const rec2 = createProviderRecord('k2', { useFactory: () => 1 });
  check(
    '工厂记录保留 factory 而不是提前求值',
    typeof rec2.factory === 'function',
    typeof rec2.factory,
  );
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
