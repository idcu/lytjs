#!/usr/bin/env node
/**
 * 门禁：HMR 客户端（`@lytjs/hmr`）
 *
 * ## 为什么需要这一项
 *
 * HMR 是**开发内循环**里被按得最频繁的那个键。它的缺陷有一个共同特征：
 * **看起来生效了** —— 页面确实刷新了、组件确实是新的，所以没人怀疑。
 *
 *   · 「每次热更新都退化成整页刷新」⇒ 用户以为 HMR 只是慢，其实是**从未生效**；
 *   · 「dispose 从不执行」⇒ 改 50 次之后页面卡成幻灯片，重启 dev server 就好了，
 *     于是没人把它当成 bug；
 *   · 「disconnect 断不掉」⇒ 断开后 2 秒又连回来，测试环境里永远有幽灵 socket。
 *
 * ## 2026-11-03 首次运行抓到的 5 个缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | `disconnect()` 后仍会自动重连 | `disconnect()` → 2s 后又建了一个 socket |
 * | 2 | 重复 `connect()` 产生多条重连链 | 每次 connect 都 close 旧 socket，旧 onclose 再排定时器 |
 * | 3 | `dispose` 从不执行 | 连续 3 次更新，dispose 调用次数 = **0** |
 * | 4 | `accept()` 覆盖 `dispose()` 的注册 | 先 dispose 后 accept ⇒ 清理函数丢失 |
 * | 5 | 模块路径按字符串全等匹配 | 注册 `/src/App.vue`、推送 `./src/App.vue?t=1` ⇒ **整页刷新** |
 *
 * 另：`handler.error` 是死字段（类型声明了、实现从未调用）；无 `window` / `WebSocket`
 * 的环境里 `dispatch` / `full-reload` / `connect` 直接抛。
 *
 * 判据用**假 WebSocket + 假 window + 毫秒级重连间隔**驱动，不依赖真实网络与真实计时。
 */

const ROOT = process.cwd();
const hmr = await import(`${ROOT}/packages/ecosystem/packages/ssr-kit/packages/hmr/dist/index.mjs`);
const { createHMRClient, normalizeModulePath } = hmr;

// 防御：实现缺少新导出时，判据要「报红」而不是让门禁崩在 TypeError 上
// （否则负向对照只能看到 stack trace，看不到哪几条判据失败了）
const norm = (p) => (typeof normalizeModulePath === 'function' ? normalizeModulePath(p) : null);
const handlerOf = (client, path) =>
  typeof client.getHandler === 'function' ? client.getHandler(path) : null;

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ══════════════════════════════════════════════════════════
// 假宿主：WebSocket / window
// ══════════════════════════════════════════════════════════
const sockets = [];
class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.sent = [];
    this.closed = false;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    sockets.push(this);
  }
  send(data) {
    this.sent.push(data);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    // 真实 WebSocket 的 close 会异步触发 onclose；这里同步触发，用来暴露
    // 「摘回调之前就 close」导致的意外重连
    if (this.onclose) this.onclose();
  }
  // 测试驱动
  open() {
    if (this.onopen) this.onopen();
  }
  message(data) {
    if (this.onmessage)
      this.onmessage({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }
  serverClose() {
    if (this.onclose) this.onclose();
  }
}

const reloads = [];
const events = [];
globalThis.WebSocket = FakeWebSocket;
globalThis.window = {
  location: { reload: () => reloads.push(Date.now()) },
  dispatchEvent: (event) => {
    events.push(event.detail);
    return true;
  },
};

const lastSocket = () => sockets[sockets.length - 1];

// ══════════════════════════════════════════════════════════
section('[1] 连接生命周期');
{
  sockets.length = 0;
  const client = createHMRClient({ url: 'ws://x', reconnectDelay: 10, maxReconnectDelay: 40 });
  check('autoConnect 建一个 socket', sockets.length === 1, sockets.length);
  check('未 open 前 connected 为 false', client.connected === false);

  lastSocket().open();
  check('open 后 connected 为 true', client.connected === true);
  check(
    'open 时派发 connected 事件',
    events.some((e) => e.type === 'connected'),
  );

  const before = sockets.length;
  client.connect();
  check('已连接时 connect() 幂等（不新建 socket）', sockets.length === before, sockets.length);

  client.disconnect();
  check('disconnect 后 connected 为 false', client.connected === false);
  check('disconnect 真的关掉了 socket', lastSocket().closed === true);
}

// ══════════════════════════════════════════════════════════
section('[2] disconnect 之后不得再自动重连（此前 2s 后又连回来）');
{
  sockets.length = 0;
  const client = createHMRClient({ url: 'ws://x', reconnectDelay: 10, maxReconnectDelay: 20 });
  lastSocket().open();
  const countAfterOpen = sockets.length;

  client.disconnect();
  await sleep(80);

  check(
    '断开后等待 4 个重连周期，socket 数量不变',
    sockets.length === countAfterOpen,
    sockets.length,
  );
  check('断开后没有新建 socket', sockets.length === 1, sockets.length);
}

// ══════════════════════════════════════════════════════════
section('[3] 服务端断开 → 自动重连（指数退避，且不重复排链）');
{
  sockets.length = 0;
  const client = createHMRClient({ url: 'ws://x', reconnectDelay: 10, maxReconnectDelay: 40 });
  lastSocket().open();

  lastSocket().serverClose();
  await sleep(30);
  check('服务端断开后自动重连', sockets.length === 2, sockets.length);

  // 连续两次 serverClose：每次只应新增 1 个 socket（不能因为多条定时器而爆发）
  lastSocket().serverClose();
  await sleep(40);
  const afterSecond = sockets.length;
  lastSocket().serverClose();
  await sleep(60);
  check(
    '重复断开不会产生多条重连链',
    sockets.length === afterSecond + 1,
    `${afterSecond} → ${sockets.length}`,
  );

  lastSocket().open();
  const settled = sockets.length;
  await sleep(60);
  check('连上之后不再继续重连', sockets.length === settled, sockets.length);
  client.disconnect();
}

// ══════════════════════════════════════════════════════════
section('[4] dispose：更新前必须执行，且失败不阻断 accept');
{
  sockets.length = 0;
  const client = createHMRClient({ url: 'ws://x', autoConnect: false });
  const order = [];
  client.register('/src/App.vue', {
    dispose: () => order.push('dispose'),
    accept: () => order.push('accept'),
  });

  client.connect();
  lastSocket().open();
  lastSocket().message({
    type: 'update',
    data: { path: '/src/App.vue', timestamp: 1 },
  });

  check('dispose 在 accept 之前执行', JSON.stringify(order) === '["dispose","accept"]', order);

  // 连续 3 次更新 ⇒ 3 次 dispose（此前恒为 0）
  order.length = 0;
  for (let i = 0; i < 3; i++) {
    lastSocket().message({ type: 'update', data: { path: '/src/App.vue', timestamp: i } });
  }
  const disposeCount = order.filter((x) => x === 'dispose').length;
  check('每次更新都 dispose 一次（此前从不执行）', disposeCount === 3, disposeCount);
}

{
  sockets.length = 0;
  const client = createHMRClient({ url: 'ws://x', autoConnect: false });
  const seen = [];
  client.register('/src/B.vue', {
    dispose: () => {
      throw new Error('cleanup boom');
    },
    accept: () => seen.push('accept'),
    error: (err) => seen.push(`error:${err.message}`),
  });

  client.connect();
  lastSocket().open();
  lastSocket().message({ type: 'update', data: { path: '/src/B.vue', timestamp: 1 } });

  check('dispose 抛错不阻断 accept', seen.includes('accept'), seen);
  check('dispose 抛错走 handler.error（此前是死字段）', seen.includes('error:cleanup boom'), seen);
}

{
  sockets.length = 0;
  const client = createHMRClient({ url: 'ws://x', autoConnect: false });
  client.register('/src/C.vue', { accept: () => {} });
  client.connect();
  lastSocket().open();
  reloads.length = 0;
  lastSocket().message({ type: 'update', data: { path: '/src/Unknown.vue', timestamp: 1 } });
  check('没有 handler 时整页刷新（对照）', reloads.length === 1, reloads.length);
}

// ══════════════════════════════════════════════════════════
section('[5] 注册合并：accept 与 dispose 是两次独立调用，不能互相覆盖');
{
  const client = createHMRClient({ url: 'ws://x', autoConnect: false });
  const calls = [];
  // 顺序 1：先 accept 后 dispose
  client.register('/a.vue', { accept: () => calls.push('a-accept') });
  client.register('/a.vue', { dispose: () => calls.push('a-dispose') });
  const h = handlerOf(client, '/a.vue');
  check(
    '先 accept 后 dispose：两者都在',
    typeof h?.accept === 'function' && typeof h?.dispose === 'function',
    h ? Object.keys(h) : '没有 getHandler',
  );

  // 顺序 2：先 dispose 后 accept（此前 accept 会把 dispose 覆盖掉）
  client.register('/b.vue', { dispose: () => calls.push('b-dispose') });
  client.register('/b.vue', { accept: () => calls.push('b-accept') });
  const h2 = handlerOf(client, '/b.vue');
  check(
    '先 dispose 后 accept：dispose 不丢（此前会丢）',
    typeof h2?.dispose === 'function',
    h2 ? Object.keys(h2) : '没有 getHandler',
  );
}

// ══════════════════════════════════════════════════════════
section('[6] 模块路径归一化：不能因为 ./ 或 ?t= 就退化成整页刷新');
{
  check(
    'normalizeModulePath 去掉 ./ 前缀',
    norm('./src/App.vue') === 'src/App.vue',
    norm('./src/App.vue'),
  );
  check(
    'normalizeModulePath 去掉缓存戳',
    norm('/src/App.vue?t=1699') === 'src/App.vue',
    norm('/src/App.vue?t=1699'),
  );
  check(
    'normalizeModulePath 统一反斜杠',
    norm('src\\App.vue') === 'src/App.vue',
    norm('src\\App.vue'),
  );

  sockets.length = 0;
  const client = createHMRClient({ url: 'ws://x', autoConnect: false });
  const accepted = [];
  client.register('/src/App.vue', { accept: (u) => accepted.push(u.path) });
  client.connect();
  lastSocket().open();
  reloads.length = 0;

  lastSocket().message({ type: 'update', data: { path: './src/App.vue?t=1699', timestamp: 1 } });
  check('带 ./ 与 ?t= 的推送仍命中 handler', accepted.length === 1, accepted);
  check('命中 handler 时不做整页刷新', reloads.length === 0, reloads.length);

  lastSocket().message({ type: 'update', data: { path: 'src\\App.vue', timestamp: 2 } });
  check('Windows 反斜杠路径也能命中', accepted.length === 2, accepted);
}

// ══════════════════════════════════════════════════════════
section('[7] 无宿主保护：没有 window / WebSocket 时不能抛');
{
  const savedWindow = globalThis.window;
  const savedWS = globalThis.WebSocket;
  try {
    delete globalThis.window;
    delete globalThis.WebSocket;

    let threw = null;
    try {
      const client = createHMRClient({ url: 'ws://x' });
      client.connect();
      client.register('/x.vue', { accept: () => {} });
    } catch (e) {
      threw = e;
    }
    check('无 window / 无 WebSocket 时构造与 connect 不抛', threw === null, String(threw));

    // full-reload 在没有 window 时退化为事件通知，不能抛
    let reloadThrew = null;
    try {
      const c2 = createHMRClient({ url: 'ws://x', autoConnect: false });
      globalThis.WebSocket = FakeWebSocket;
      c2.connect();
      lastSocket().open();
      lastSocket().message({ type: 'full-reload' });
    } catch (e) {
      reloadThrew = e;
    }
    check('无 window 时 full-reload 不抛（退化为事件）', reloadThrew === null, String(reloadThrew));
  } finally {
    globalThis.window = savedWindow;
    globalThis.WebSocket = savedWS;
  }
}

// ══════════════════════════════════════════════════════════
section('[8] 事件与消息');
{
  sockets.length = 0;
  events.length = 0;
  const client = createHMRClient({ url: 'ws://x', autoConnect: false });
  client.connect();
  lastSocket().open();

  lastSocket().message({ type: 'custom', data: { hello: 1 } });
  check(
    'custom 消息派发到 window',
    events.some((e) => e.type === 'custom'),
  );

  lastSocket().message('{ not json');
  check('非法 JSON 不抛（只记日志）', true);

  client.send({ type: 'custom', data: 1 });
  check('已连接时 send 真的发出去', lastSocket().sent.length === 1, lastSocket().sent);
  client.disconnect();
  const sentBefore = lastSocket().sent.length;
  client.send({ type: 'custom', data: 2 });
  check('断开后 send 静默丢弃（不抛）', lastSocket().sent.length === sentBefore);
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
