#!/usr/bin/env node
/**
 * 门禁：路由语义（`@lytjs/router`）
 *
 * ## 为什么需要这一项
 *
 * 路由是 SPA 的**主干**，但它的缺陷几乎都是「页面能打开、只是不对」：
 * 守卫没跑、重定向没生效、默认子路由不渲染、参数没解码……
 * 这些都不会抛异常，肉眼验收时也很容易被当成「我配错了」。
 *
 * 本门禁不看源码形状，而是**驱动真实的导航**（memory history）再断言
 * `currentRoute()` / 守卫调用记录 / 返回值。
 *
 * ## 2026-11-04 首次运行抓到的 6 个缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | 路由优先级用**权重总和**排序 | `/a/b/d` 命中 `/a/:x/:y`(3+2+2=7) 而不是 `/a/b/*`(3+3+0=6) ⇒ 通配符路由**永不命中** |
 * | 2 | `RouteRecordRaw.redirect` **从未被读取** | `{ path: '/old', redirect: '/new' }` ⇒ 导航停在 `/old`，无报错无告警 |
 * | 3 | 默认子路由（`path: ''`）**永不命中** | `/parent/1` 命中父路由（matched 深度 1、name `null`）而不是 `childIndex` |
 * | 4 | query 的 `+` 不解成空格 | `?q=a+b` ⇒ `"a+b"`（浏览器发的正是 `a+b`） |
 * | 5 | 未匹配路径**完全静默** | `push('/typo')` 后停在原页面，控制台一个字都没有 |
 * | 6 | **初始导航绕过守卫链** | `createMemoryHistory('/private')` + 守卫重定向 ⇒ `app.use(router)` 之后仍在 `/private` |
 *
 * 缺陷 1 是同一缺陷族的**第三次**出现（2026-11-03 已在 `@lytjs/http-server` 与
 * `@lytjs/runtime-edge` 各修过一次，都用「逐段字典序」）—— 所以本门禁把
 * 「优先级」单独成组，且带**四组对照**（静态 / 参数 / 通配 / 混合）。
 *
 * 缺陷 6 最贵：鉴权守卫在「深链 / 刷新 / 直接打开」时被绕过，而这正是它最该生效的时刻。
 */
import { join } from 'node:path';

const ROOT = process.cwd();
const { createRouter, createMemoryHistory } = await import(
  join(ROOT, 'packages/ecosystem/packages/web-framework/packages/router/dist/index.mjs')
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
const sleep = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const mk = (routes, historyPath = '/') =>
  createRouter({ history: createMemoryHistory(historyPath), routes });

// ══════════════════════════════════════════════════════════
section('[1] 路由优先级：逐段比较（静态 > 参数 > 通配符），不是分数求和');
{
  const router = mk([
    { path: '/a/b/*', component: { name: 'Wild' }, name: 'wild' },
    { path: '/a/:x/:y', component: { name: 'Params' }, name: 'params' },
    { path: '/a/:x/*', component: { name: 'Mixed' }, name: 'mixed' },
    { path: '/a/b/c', component: { name: 'Static' }, name: 'static' },
  ]);
  const pick = async (p) => {
    await router.push(p);
    return router.currentRoute().name;
  };
  check('静态段优先：/a/b/c ⇒ static', (await pick('/a/b/c')) === 'static');
  check(
    '通配符**不输给**参数（本轮修复）：/a/b/d ⇒ wild',
    (await pick('/a/b/d')) === 'wild',
    await pick('/a/b/d'),
  );
  check('参数路由：/a/z/q ⇒ params', (await pick('/a/z/q')) === 'params');
  check('混合路由：/a/z/q/r ⇒ mixed', (await pick('/a/z/q/r')) === 'mixed');
}
{
  // 对照：逐段比较的**方向**也要对 —— 前两段打平后，第 3 段 `:b`(2) 比 `*`(0) 更具体，
  // 所以「约束了 3 段」的路由胜出（这是对的，不能靠「通配符总是赢」蒙混过去）。
  const router = mk([
    { path: '/p/:a/*', component: { name: 'A' }, name: 'a' },
    { path: '/p/:a/:b/:c', component: { name: 'B' }, name: 'b' },
  ]);
  await router.push('/p/x/y/z');
  check(
    '对照：逐段到第 3 段时，参数(2) 比通配符(0) 更具体 ⇒ 三段路由胜出',
    router.currentRoute().name === 'b',
    router.currentRoute().name,
  );
}

// ══════════════════════════════════════════════════════════
section('[2] 记录级重定向（此前完全没实现）');
{
  const router = mk([
    { path: '/', component: { name: 'Home' } },
    { path: '/old', redirect: '/new' },
    { path: '/new', component: { name: 'New' }, name: 'new' },
  ]);
  const failure = await router.push('/old');
  check(
    '静态重定向：/old ⇒ /new',
    router.currentRoute().path === '/new',
    router.currentRoute().path,
  );
  check(
    '返回值标明是重定向（不是 aborted）',
    failure && failure.type === 8,
    failure ? failure.type : null,
  );
}
{
  const router = mk([
    { path: '/u/:id', component: { name: 'U' }, name: 'u' },
    { path: '/legacy/:id', redirect: (to) => ({ name: 'u', params: { id: to.params.id } }) },
  ]);
  await router.push('/legacy/42');
  check('函数重定向 + 命名路由带参：/legacy/42 ⇒ /u/42', router.currentRoute().path === '/u/42');
  check('重定向后 params 正确', router.currentRoute().params.id === '42');
}
{
  const log = [];
  const router = mk([
    { path: '/old', redirect: '/target' },
    { path: '/target', component: { name: 'Target' } },
  ]);
  router.beforeEach((to) => {
    log.push(to.path);
  });
  await router.push('/old');
  check('重定向目标的守卫会执行（看到的路径是 /target）', log.includes('/target'), log);
}
{
  const router = mk([
    { path: '/old', redirect: '/blocked' },
    { path: '/blocked', component: { name: 'Blocked' } },
    { path: '/', component: { name: 'Home' } },
  ]);
  router.beforeEach((to) => (to.path === '/blocked' ? false : true));
  await router.push('/old');
  check(
    '重定向目标被守卫中止 ⇒ 停在原处',
    router.currentRoute().path === '/',
    router.currentRoute().path,
  );
}
{
  const router = mk([
    { path: '/loop1', redirect: '/loop2' },
    { path: '/loop2', redirect: '/loop1' },
  ]);
  const started = Date.now();
  await Promise.race([router.push('/loop1'), sleep(400)]);
  check('重定向循环不会挂死（400ms 内返回）', Date.now() - started < 400, Date.now() - started);
}

// ══════════════════════════════════════════════════════════
section('[3] 默认子路由（path: ""）必须命中子路由，而不是父路由');
{
  const router = mk([
    {
      path: '/parent/:pid',
      component: { name: 'Parent' },
      children: [
        { path: '', component: { name: 'ChildIndex' }, name: 'childIndex' },
        { path: 'detail/:cid', component: { name: 'ChildDetail' }, name: 'childDetail' },
      ],
    },
  ]);
  await router.push('/parent/1');
  check(
    '默认子路由命中（此前被父路由抢走）',
    router.currentRoute().name === 'childIndex',
    router.currentRoute().name,
  );
  check('matched 链深度为 2（父 + 子）', router.currentRoute().matched.length === 2);
  await router.push('/parent/1/detail/2');
  check('普通子路由仍然正常', router.currentRoute().name === 'childDetail');
  check(
    '父子参数都在',
    router.currentRoute().params.pid === '1' && router.currentRoute().params.cid === '2',
    router.currentRoute().params,
  );
}

// ══════════════════════════════════════════════════════════
section('[4] 初始导航（app.use(router)）必须走守卫链');
{
  const log = [];
  const router = mk(
    [
      { path: '/private', component: { name: 'Private' } },
      { path: '/login', component: { name: 'Login' } },
    ],
    '/private',
  );
  router.beforeEach((to) => {
    log.push(to.path);
    return to.path === '/private' ? '/login' : true;
  });
  router.install({ config: { globalProperties: {} }, provide() {} });
  await sleep(20);
  check('初始导航执行了 beforeEach（此前完全绕过）', log.includes('/private'), log);
  check(
    '守卫的初始重定向生效（停在 /login）',
    router.currentRoute().path === '/login',
    router.currentRoute().path,
  );
  const ready = await Promise.race([
    router.isReady().then(() => true),
    sleep(50).then(() => false),
  ]);
  check('isReady() 在初始导航之后 resolve', ready);
}
{
  // 对照：**没有**守卫时保持同步首帧（不能为了修守卫而让每个应用首帧空白）
  const router = mk([{ path: '/plain', component: { name: 'Plain' }, name: 'plain' }], '/plain');
  router.install({ config: { globalProperties: {} }, provide() {} });
  check(
    '无守卫时 install 后**同步**就有正确路由（首帧可渲染）',
    router.currentRoute().name === 'plain',
    router.currentRoute().name,
  );
}
{
  // 对照：无守卫时「install 之后立刻 push」不能产生竞态
  const leave = [];
  const home = { beforeRouteLeave: () => leave.push('leave') };
  const router = mk(
    [
      { path: '/', component: home },
      { path: '/about', component: { name: 'About' } },
    ],
    '/',
  );
  router.install({ config: { globalProperties: {} }, provide() {} });
  await router.push('/about');
  check('install 后立刻 push：离场守卫正常触发', leave.length === 1, leave);
}

// ══════════════════════════════════════════════════════════
section('[5] query 语义');
{
  const router = mk([{ path: '/q', component: { name: 'Q' } }]);
  const q = async (p) => {
    await router.push(p);
    return router.currentRoute().query;
  };
  check('`+` 解成空格（form 编码）', (await q('/q?q=a+b')).q === 'a b', (await q('/q?q=a+b')).q);
  check('`%2B` 解成加号本身', (await q('/q?q=a%2Bb')).q === 'a+b');
  const dup = await q('/q?a=1&a=2');
  check('重复 key 变数组', Array.isArray(dup.a) && dup.a.length === 2, dup);
  const novalue = await q('/q?flag');
  check('无值参数为 null', novalue.flag === null, novalue);
  const empty = await q('/q?empty=');
  check('空值参数为空串', empty.empty === '', empty);
  await router.push('/q?a=1&b=2#h');
  check(
    'hash 与 query 分离',
    router.currentRoute().hash === 'h' && router.currentRoute().fullPath === '/q?a=1&b=2#h',
    router.currentRoute().fullPath,
  );
}

// ══════════════════════════════════════════════════════════
section('[6] 未匹配路径：不能静默；catch-all 必须可用');
{
  const router = mk([{ path: '/x', component: { name: 'X' } }]);
  await router.push('/x');
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.map(String).join(' '));
  let failure;
  try {
    failure = await router.push('/nope');
  } finally {
    console.warn = original;
  }
  check(
    '未匹配路径给出告警（此前完全静默）',
    warnings.some((line) => line.includes('/nope')),
    warnings,
  );
  check('返回值是 aborted（调用方可据此处理）', failure && failure.type === 1, failure?.type);
  check('路由停在原处（不把 matched=[] 提交上去）', router.currentRoute().path === '/x');
}
{
  const router = mk([
    { path: '/', component: { name: 'Home' } },
    { path: '/*', component: { name: 'NotFound' }, name: 'notFound' },
  ]);
  await router.push('/whatever/deep');
  check('catch-all 路由命中（404 页面的前提）', router.currentRoute().name === 'notFound');
  check('catch-all 捕获剩余路径', router.currentRoute().params['*'] === 'whatever/deep');
}

// ══════════════════════════════════════════════════════════
section('[7] 守卫语义（false / 返回路径 / next() / 抛错）');
{
  const router = mk([
    { path: '/', component: { name: 'Home' } },
    { path: '/private', component: { name: 'Private' } },
    { path: '/login', component: { name: 'Login' } },
  ]);
  router.beforeEach((to) => (to.path === '/private' ? '/login' : true));
  const f = await router.push('/private');
  check('返回路径 ⇒ 重定向到 /login', router.currentRoute().path === '/login');
  check('返回值为 redirected(8)', f && f.type === 8, f?.type);
}
{
  const router = mk([
    { path: '/', component: { name: 'Home' } },
    { path: '/private', component: { name: 'Private' } },
    { path: '/login', component: { name: 'Login' } },
  ]);
  router.beforeEach((to, from, next) => (to.path === '/private' ? next('/login') : next()));
  await router.push('/private');
  check('next("/login") 旧风格同样生效', router.currentRoute().path === '/login');
}
{
  const router = mk([
    { path: '/', component: { name: 'Home' } },
    { path: '/boom', component: { name: 'Boom' } },
  ]);
  router.beforeEach((to) => {
    if (to.path === '/boom') throw new Error('guard boom');
  });
  let message = null;
  try {
    await router.push('/boom');
  } catch (err) {
    message = err.message;
  }
  check('守卫抛错会 reject（不静默放行）', message === 'guard boom', message);
  check('抛错后路由状态未被污染', router.currentRoute().path === '/');
}
{
  const router = mk([
    { path: '/', component: { name: 'Home' } },
    { path: '/a', component: { name: 'A' } },
  ]);
  const log = [];
  router.beforeEach((to) => log.push(`g1:${to.path}`));
  router.beforeEach((to) => log.push(`g2:${to.path}`));
  router.afterEach((to) => log.push(`after:${to.path}`));
  await router.push('/a');
  check(
    '守卫顺序：beforeEach 按注册顺序，afterEach 最后',
    log.join(',') === 'g1:/a,g2:/a,after:/a',
    log,
  );
}

// ══════════════════════════════════════════════════════════
section('[8] 导航失败类型');
{
  const router = mk([{ path: '/x', component: { name: 'X' } }]);
  await router.push('/x');
  const dup = await router.push('/x');
  check('重复导航 ⇒ duplicated(4)', dup && dup.type === 4, dup?.type);
}

// ══════════════════════════════════════════════════════════
section('[9] 链接语义（RouterLink / useLink）');
{
  const { setCurrentRouter, useLink } = await import(
    join(ROOT, 'packages/ecosystem/packages/web-framework/packages/router/dist/index.mjs')
  );
  const router = mk([
    { path: '/', component: { name: 'Home' } },
    { path: '/user/:id', component: { name: 'User' }, name: 'user' },
    { path: '/username', component: { name: 'Username' } },
    {
      path: '/admin',
      component: { name: 'Admin' },
      children: [{ path: 'users', component: { name: 'Users' }, name: 'adminUsers' }],
    },
  ]);
  setCurrentRouter(router);

  await router.push('/');
  check(
    '命名路由的 href（此前拼成**当前页面**）',
    useLink({ to: { name: 'user', params: { id: 7 } } }).href() === '/user/7',
    useLink({ to: { name: 'user', params: { id: 7 } } }).href(),
  );
  check(
    '字符串 href（含 query / hash）',
    useLink({ to: '/user/1?x=1#h' }).href() === '/user/1?x=1#h',
    useLink({ to: '/user/1?x=1#h' }).href(),
  );

  await router.push('/username');
  check(
    '`/user` 链接在 `/username` 页面**不**高亮（此前按字符串前缀判成 active）',
    useLink({ to: '/user' }).isActive() === false,
  );

  await router.push('/admin/users');
  check('嵌套：在 /admin/users 时 /admin 高亮', useLink({ to: '/admin' }).isActive() === true);
  check('嵌套：子路由自身高亮', useLink({ to: '/admin/users' }).isActive() === true);
  check(
    '嵌套：isExactActive 只对完全相同的路由为真',
    useLink({ to: '/admin' }).isExactActive() === false,
  );
}

// ══════════════════════════════════════════════════════════
section('[10] 公开 API：resolve / getRoutes / hasRoute / addRoute / removeRoute / alias');
{
  const router = mk([
    { path: '/u/:id', component: { name: 'U' }, name: 'u', meta: { auth: true } },
    { path: '/main', component: { name: 'Main' }, name: 'main', alias: '/alias' },
  ]);

  // ⚠️ 门禁自身要防御：API 缺失时**报红**，而不是崩在 `router.resolve is not a function`
  //   上（否则负向对照只看到一条 TypeError，看不到「缺了哪几个」）。
  const has = (name) => typeof router[name] === 'function';
  const apis = ['resolve', 'getRoutes', 'hasRoute', 'addRoute', 'removeRoute', 'clearRoutes'];
  const missing = apis.filter((name) => !has(name));
  check(`公开 API 齐全（缺：${missing.join(', ') || '无'}）`, missing.length === 0, missing);

  const resolved = has('resolve')
    ? router.resolve({ name: 'u', params: { id: '3' }, query: { q: 'x' } })
    : null;
  check(
    'resolve 命名路由：path / fullPath / params / meta',
    resolved?.path === '/u/3' &&
      resolved?.fullPath === '/u/3?q=x' &&
      resolved?.params?.id === '3' &&
      resolved?.meta?.auth === true,
    resolved
      ? { path: resolved.path, fullPath: resolved.fullPath, params: resolved.params }
      : '无 resolve()',
  );

  const miss = has('resolve') ? router.resolve('/nope') : null;
  check(
    'resolve 未匹配路径也返回位置（matched 为空，便于渲染 404）',
    miss?.matched?.length === 0 && miss?.path === '/nope',
    miss ? [miss.path, miss.matched.length] : '无 resolve()',
  );
  const unknown = has('resolve') ? router.resolve({ name: 'nope' }) : null;
  check(
    'resolve 未知名字：matched 为空、name 保留',
    unknown?.name === 'nope' && unknown?.matched?.length === 0,
    unknown ? [unknown.name, unknown.matched.length] : '无 resolve()',
  );

  check(
    'getRoutes() 返回注册记录',
    has('getRoutes') && router.getRoutes().length === 2,
    has('getRoutes') ? router.getRoutes().length : '无 getRoutes()',
  );
  check(
    'hasRoute(name) 命中',
    has('hasRoute') && router.hasRoute('u') === true && router.hasRoute('nope') === false,
  );

  // alias：类型里有、此前从未被读取
  await router.push('/alias');
  check(
    'alias 可访问（name / matched 指向同一条记录）',
    router.currentRoute().name === 'main' && router.currentRoute().matched.length === 1,
    [router.currentRoute().name, router.currentRoute().matched.length],
  );

  // 动态路由
  const removeAdmin = has('addRoute')
    ? router.addRoute({ path: '/admin', component: { name: 'Admin' }, name: 'admin' })
    : null;
  let addedNavigable = false;
  if (removeAdmin) {
    await router.push('/admin');
    addedNavigable = router.currentRoute().name === 'admin';
  }
  check('addRoute 后可导航', addedNavigable, router.currentRoute().path);
  check('addRoute 后 hasRoute', has('hasRoute') && router.hasRoute('admin') === true);
  if (removeAdmin) removeAdmin();
  check('addRoute 返回的移除函数生效', has('hasRoute') && router.hasRoute('admin') === false);
  check('removeRoute 返回是否移除成功', has('removeRoute') && router.removeRoute('main') === true);
  if (has('clearRoutes')) router.clearRoutes();
  check('clearRoutes 清空', has('getRoutes') && router.getRoutes().length === 0);
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
