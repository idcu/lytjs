/**
 * SSR 完整示例 - 服务端渲染 + 流式渲染 + hydration
 *
 * 这个示例展示：
 * 1. 使用 createVNode / h 构建组件树
 * 2. 流式 SSR 渲染（renderToStream）
 * 3. 数据预取和状态序列化
 *
 * 运行方式（在仓库根目录）：
 *   npx tsx examples/ssr-complete-example.ts
 *
 * 前置条件：已构建 @lytjs/core 和 @lytjs/ssr 的 dist 产物
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console */

// ⚠️ 关键：纯 SSR 进程不调 createApp()，需要手动注入模板编译器。
//    如果组件只用 render() / createVNode 而不用 template，则不需要注入。
//    本示例的组件全部用 createVNode 构建视图，所以不需要模板编译器。
//
// ⚠️ 注意：`h` 由 @lytjs/core 导出，**不在** @lytjs/vdom 里。
//    @lytjs/vdom 只导出 `createVNode`（以及 Fragment/Text/Comment 等）。
import { createVNode } from '@lytjs/vdom';
import { renderToStream, renderToString } from '@lytjs/ssr';

// 服务端数据预取函数
async function fetchUser(userId: string) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return {
    id: userId,
    name: '张三',
    email: 'zhangsan@example.com',
    avatar: '/avatars/user.jpg',
  };
}

async function fetchPosts(userId: string) {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return [
    { id: 1, title: '第一篇博客', content: '这是我的第一篇博客内容...' },
    { id: 2, title: '技术分享', content: '今天我们来谈谈...' },
    { id: 3, title: '生活记录', content: '记录生活中的美好...' },
  ];
}

// ── 组件定义（使用 createVNode 构建视图，不需要模板编译器） ──────

function Avatar(props: { src: string; name: string }) {
  return createVNode('div', { class: 'avatar' }, [
    createVNode('img', { src: props.src, alt: props.name }),
    createVNode('span', { class: 'avatar-name' }, props.name),
  ]);
}

function PostItem(props: { post: { id: number; title: string; content: string } }) {
  return createVNode('article', { class: 'post-item' }, [
    createVNode('h3', { class: 'post-title' }, props.post.title),
    createVNode('p', { class: 'post-content' }, props.post.content),
    createVNode('div', { class: 'post-footer' }, [
      createVNode('time', { class: 'post-date' }, new Date().toLocaleDateString()),
    ]),
  ]);
}

function Sidebar() {
  return createVNode('aside', { class: 'sidebar' }, [
    createVNode('nav', { class: 'nav-menu' }, [
      createVNode('ul', {}, [
        createVNode('li', {}, createVNode('a', { href: '/home' }, '首页')),
        createVNode('li', {}, createVNode('a', { href: '/profile' }, '个人资料')),
        createVNode('li', {}, createVNode('a', { href: '/posts' }, '我的博客')),
        createVNode('li', {}, createVNode('a', { href: '/settings' }, '设置')),
      ]),
    ]),
  ]);
}

// UserProfile 接收预取好的 user 和 posts 数据（通过 props 传入）
function UserProfile(props: { user: any; posts: any[] }) {
  return createVNode('div', { class: 'profile-page' }, [
    createVNode('div', { class: 'profile-header' }, [
      createVNode('img', {
        class: 'profile-avatar',
        src: props.user.avatar,
        alt: props.user.name,
      }),
      createVNode('div', { class: 'profile-info' }, [
        createVNode('h1', {}, props.user.name),
        createVNode('p', { class: 'profile-email' }, props.user.email),
      ]),
    ]),
    createVNode('div', { class: 'posts-section' }, [
      createVNode('h2', {}, '我的博客'),
      createVNode(
        'div',
        { class: 'posts-grid' },
        props.posts.map((post: any) => createVNode(PostItem, { key: post.id, post })),
      ),
    ]),
  ]);
}

// 页面组件：接收预取好的数据，传递给子组件
function ProfilePage(props: { user: any; posts: any[] }) {
  return createVNode('div', { class: 'app-layout' }, [
    createVNode(Sidebar),
    createVNode('main', { class: 'main-content' }, [
      createVNode('header', { class: 'app-header' }, [createVNode('h1', {}, 'LytJS 博客平台')]),
      createVNode(UserProfile, { user: props.user, posts: props.posts }),
    ]),
  ]);
}

// ── 服务端渲染入口 ──────────────────────────────────────────

async function renderProfilePageSSR(userId: string) {
  // 并行预取数据
  const [user, posts] = await Promise.all([fetchUser(userId), fetchPosts(userId)]);

  // 用预取好的数据构建组件树
  const app = createVNode(ProfilePage, { user, posts });

  // 同步渲染（验证基本可用性）
  const html = renderToString(app);
  console.log('  renderToString 输出前 200 字符:', html.slice(0, 200));

  // 流式渲染
  const stream = renderToStream(app, {
    timeout: 5000,
    maxBytesPerSecond: 1024 * 1024,
    errorFallback: '<div class="error-fallback">页面加载出错</div>',
    onError: (error: Error) => {
      console.error('SSR Error:', error);
    },
  });

  // 序列化初始状态（用于客户端 hydration）
  const initialState = { user, posts };
  const stateScript = `<script>window.__INITIAL_STATE__ = ${JSON.stringify(initialState)}</script>`;

  return {
    html,
    stream,
    initialState,
    stateScript,
    htmlTemplate: `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>个人博客 - LytJS SSR</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #f5f7fa; }
    .app-layout { display: flex; min-height: 100vh; }
    .sidebar { width: 240px; background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; }
    .sidebar a { color: white; text-decoration: none; display: block; padding: 10px; margin: 5px 0; border-radius: 8px; }
    .sidebar a:hover { background: rgba(255,255,255,0.1); }
    .main-content { flex: 1; padding: 30px; }
    .app-header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0; }
    .profile-header { display: flex; gap: 20px; align-items: center; background: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .profile-avatar { width: 100px; height: 100px; border-radius: 50%; background: #ddd; }
    .profile-info h1 { font-size: 1.8rem; color: #333; }
    .profile-email { color: #666; margin-top: 5px; }
    .posts-section h2 { color: #333; margin-bottom: 20px; }
    .posts-grid { display: grid; gap: 20px; }
    .post-item { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .post-title { color: #667eea; margin-bottom: 10px; font-size: 1.2rem; }
    .post-content { color: #666; line-height: 1.6; }
    .error-fallback { padding: 40px; text-align: center; background: #fff3cd; color: #856404; border-radius: 8px; }
  </style>
</head>
<body>
  <div id="app">
`,
  };
}

// ── 模拟服务器路由处理 ──────────────────────────────────────

async function handleRequest(path: string) {
  console.log(`[${new Date().toISOString()}] SSR Request: ${path}`);

  const match = path.match(/\/profile\/(\w+)/);
  if (match) {
    const userId = match[1];
    return await renderProfilePageSSR(userId);
  }

  return {
    html: '<div class="error-fallback">页面未找到</div>',
    stream: null,
    htmlTemplate: '<div class="error-fallback">页面未找到</div>',
  };
}

// ── 运行示例 ────────────────────────────────────────────────

async function main() {
  console.log('LytJS SSR 完整示例 - 服务端渲染\n');

  const result = await handleRequest('/profile/user123');

  if (result.html) {
    console.log('renderToString 渲染成功');
    console.log('初始状态已序列化:', JSON.stringify(result.initialState).slice(0, 80) + '...');
    console.log('\n页面结构预览:');
    console.log('  - 侧边栏导航');
    console.log('  - 用户个人资料:', result.initialState.user.name);
    console.log('  - 博客列表:', result.initialState.posts.length, '篇文章');
  }
}

// 主模块检测：本文件在 `"type": "module"` 的包里被当作 ESM 处理，
// `require` 未定义，因此不能沿用 CJS 的 `require.main === module` 写法
// （否则守卫恒为 false，main() 静默不执行）。
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { renderProfilePageSSR, handleRequest, ProfilePage, UserProfile };
