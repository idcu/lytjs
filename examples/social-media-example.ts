/**
 * 社交媒体应用实战案例
 *
 * 包含功能：
 * - 用户认证和状态管理
 * - 动态Feed流
 * - 点赞、评论、分享
 * - 实时通知
 * - 用户资料页
 */

import { signal, computed } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';

// 用户状态管理
function createUserStore() {
  const currentUser = signal({
    id: 'user-1',
    name: '小明',
    avatar: '/avatars/xiaoming.jpg',
    bio: '前端开发者 | 开源贡献者',
    followers: 1234,
    following: 567,
  });

  const isLoggedIn = signal(true);
  const notifications = signal([
    { id: 1, type: 'like', content: '张三点赞了你的动态', read: false },
    { id: 2, type: 'comment', content: '李四评论: 写得真好！', read: false },
    { id: 3, type: 'follow', content: '王五关注了你', read: true },
  ]);

  const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length);

  function markAsRead(id: number) {
    notifications.value = notifications.value.map((n) => (n.id === id ? { ...n, read: true } : n));
  }

  function login(user: any) {
    currentUser.value = user;
    isLoggedIn.value = true;
  }

  function logout() {
    currentUser.value = null;
    isLoggedIn.value = false;
  }

  return {
    currentUser,
    isLoggedIn,
    notifications,
    unreadCount,
    markAsRead,
    login,
    logout,
  };
}

// 动态状态管理
function createFeedStore() {
  const posts = signal([
    {
      id: 1,
      author: { id: 'u2', name: '张三', avatar: '/avatars/zhangsan.jpg' },
      content: '今天天气真好，适合写代码 🚀',
      images: ['/images/scenery1.jpg'],
      likes: 42,
      comments: 8,
      shares: 3,
      liked: false,
      timestamp: Date.now() - 3600000,
      comments_list: [
        { id: 1, author: '李四', content: '确实不错！' },
        { id: 2, author: '王五', content: '同意楼上' },
      ],
    },
    {
      id: 2,
      author: { id: 'u3', name: '李四', avatar: '/avatars/lisi.jpg' },
      content: '分享一篇关于 React 性能优化的文章，大家可以看看。',
      images: [],
      likes: 128,
      comments: 23,
      shares: 45,
      liked: true,
      timestamp: Date.now() - 7200000,
      comments_list: [],
    },
    {
      id: 3,
      author: { id: 'u4', name: '王五', avatar: '/avatars/wangwu.jpg' },
      content: '周末去爬山拍的风景照，太美了！⛰️',
      images: ['/images/mountain1.jpg', '/images/mountain2.jpg'],
      likes: 256,
      comments: 34,
      shares: 12,
      liked: false,
      timestamp: Date.now() - 10800000,
      comments_list: [],
    },
  ]);

  const newPostContent = signal('');
  const isPosting = signal(false);

  function addPost(content: string, images: string[] = []) {
    isPosting.value = true;
    const newPost = {
      id: Date.now(),
      author: { id: 'user-1', name: '小明', avatar: '/avatars/xiaoming.jpg' },
      content,
      images,
      likes: 0,
      comments: 0,
      shares: 0,
      liked: false,
      timestamp: Date.now(),
      comments_list: [],
    };
    posts.value = [newPost, ...posts.value];
    newPostContent.value = '';
    isPosting.value = false;
  }

  function toggleLike(postId: number) {
    posts.value = posts.value.map((post) => {
      if (post.id === postId) {
        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? post.likes - 1 : post.likes + 1,
        };
      }
      return post;
    });
  }

  function addComment(postId: number, content: string) {
    posts.value = posts.value.map((post) => {
      if (post.id === postId) {
        return {
          ...post,
          comments: post.comments + 1,
          comments_list: [...post.comments_list, { id: Date.now(), author: '小明', content }],
        };
      }
      return post;
    });
  }

  return {
    posts,
    newPostContent,
    isPosting,
    addPost,
    toggleLike,
    addComment,
  };
}

// 组件

function Navbar(props: { userStore: any; onToggleNotifications: () => void }) {
  return createVNode('nav', { class: 'social-nav' }, [
    createVNode('div', { class: 'nav-logo' }, 'SocialApp'),
    createVNode('div', { class: 'nav-search' }, [
      createVNode('input', { type: 'text', placeholder: '搜索用户、动态...' }),
    ]),
    createVNode('div', { class: 'nav-actions' }, [
      createVNode('button', { class: 'nav-btn' }, '🏠'),
      createVNode('button', { class: 'nav-btn' }, '✉️'),
      createVNode(
        'button',
        {
          class: 'nav-btn notification-btn',
          onclick: props.onToggleNotifications,
        },
        [
          '🔔',
          props.userStore.unreadCount.value > 0
            ? createVNode('span', { class: 'badge' }, props.userStore.unreadCount.value)
            : null,
        ],
      ),
      createVNode('img', {
        class: 'nav-avatar',
        src: props.userStore.currentUser.value.avatar,
        alt: props.userStore.currentUser.value.name,
      }),
    ]),
  ]);
}

function PostComposer(props: { feedStore: any }) {
  return createVNode('div', { class: 'post-composer' }, [
    createVNode('img', {
      class: 'composer-avatar',
      src: 'https://via.placeholder.com/40',
    }),
    createVNode('div', { class: 'composer-content' }, [
      createVNode('textarea', {
        placeholder: '分享你的想法...',
        value: props.feedStore.newPostContent.value,
        oninput: (e: any) => (props.feedStore.newPostContent.value = e.target.value),
      }),
      createVNode('div', { class: 'composer-actions' }, [
        createVNode('button', { class: 'action-btn' }, '📷 图片'),
        createVNode('button', { class: 'action-btn' }, '📍 位置'),
        createVNode('button', { class: 'action-btn' }, '😊 表情'),
        createVNode(
          'button',
          {
            class: 'post-btn',
            onclick: () => {
              if (props.feedStore.newPostContent.value.trim()) {
                props.feedStore.addPost(props.feedStore.newPostContent.value);
              }
            },
          },
          '发布',
        ),
      ]),
    ]),
  ]);
}

function CommentItem(props: { comment: any }) {
  return createVNode('div', { class: 'comment-item' }, [
    createVNode('span', { class: 'comment-author' }, props.comment.author),
    createVNode('span', { class: 'comment-content' }, props.comment.content),
  ]);
}

function PostCard(props: { post: any; feedStore: any }) {
  const { post } = props;

  return createVNode('div', { class: 'post-card' }, [
    createVNode('div', { class: 'post-header' }, [
      createVNode('img', { class: 'post-avatar', src: post.author.avatar }),
      createVNode('div', { class: 'post-meta' }, [
        createVNode('span', { class: 'post-author' }, post.author.name),
        createVNode('span', { class: 'post-time' }, formatTime(post.timestamp)),
      ]),
    ]),
    createVNode('div', { class: 'post-content' }, post.content),
    post.images.length > 0
      ? createVNode(
          'div',
          { class: 'post-images' },
          post.images.map((img: string) => createVNode('img', { class: 'post-image', src: img })),
        )
      : null,
    createVNode('div', { class: 'post-stats' }, [
      createVNode('span', {}, `${post.likes} 赞`),
      createVNode('span', {}, `${post.comments} 评论`),
      createVNode('span', {}, `${post.shares} 分享`),
    ]),
    createVNode('div', { class: 'post-actions' }, [
      createVNode(
        'button',
        {
          class: post.liked ? 'action-btn liked' : 'action-btn',
          onclick: () => props.feedStore.toggleLike(post.id),
        },
        post.liked ? '❤️ 点赞' : '🤍 点赞',
      ),
      createVNode('button', { class: 'action-btn' }, '💬 评论'),
      createVNode('button', { class: 'action-btn' }, '↗️ 分享'),
    ]),
    post.comments_list.length > 0
      ? createVNode(
          'div',
          { class: 'post-comments' },
          post.comments_list
            .slice(0, 2)
            .map((comment: any) => createVNode(CommentItem, { comment })),
        )
      : null,
  ]);
}

function FeedList(props: { feedStore: any }) {
  return createVNode(
    'div',
    { class: 'feed-list' },
    props.feedStore.posts.value.map((post: any) =>
      createVNode(PostCard, { key: post.id, post, feedStore: props.feedStore }),
    ),
  );
}

function NotificationPanel(props: { userStore: any }) {
  return createVNode('div', { class: 'notification-panel' }, [
    createVNode('h3', {}, '通知'),
    createVNode(
      'div',
      { class: 'notification-list' },
      props.userStore.notifications.value.map((n: any) =>
        createVNode(
          'div',
          {
            class: n.read ? 'notification-item read' : 'notification-item unread',
            onclick: () => props.userStore.markAsRead(n.id),
          },
          [
            createVNode(
              'span',
              { class: 'notification-icon' },
              n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : '👤',
            ),
            createVNode('span', { class: 'notification-content' }, n.content),
          ],
        ),
      ),
    ),
  ]);
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

function SocialApp() {
  const userStore = createUserStore();
  const feedStore = createFeedStore();
  const showNotifications = signal(false);

  return createVNode('div', { class: 'social-app' }, [
    createVNode(Navbar, {
      userStore,
      onToggleNotifications: () => (showNotifications.value = !showNotifications.value),
    }),
    createVNode('div', { class: 'social-content' }, [
      createVNode('div', { class: 'main-column' }, [
        createVNode(PostComposer, { feedStore }),
        createVNode(FeedList, { feedStore }),
      ]),
      createVNode('div', { class: 'side-column' }, [
        createVNode('div', { class: 'user-card' }, [
          createVNode('img', {
            class: 'user-avatar-lg',
            src: userStore.currentUser.value.avatar,
          }),
          createVNode('h3', {}, userStore.currentUser.value.name),
          createVNode('p', { class: 'user-bio' }, userStore.currentUser.value.bio),
          createVNode('div', { class: 'user-stats' }, [
            createVNode('span', {}, `${userStore.currentUser.value.followers} 粉丝`),
            createVNode('span', {}, `${userStore.currentUser.value.following} 关注`),
          ]),
        ]),
        createVNode('div', { class: 'trending' }, [
          createVNode('h4', {}, '热门话题'),
          createVNode('div', { class: 'trending-item' }, '#前端开发'),
          createVNode('div', { class: 'trending-item' }, '#开源项目'),
          createVNode('div', { class: 'trending-item' }, '#TypeScript'),
        ]),
      ]),
    ]),
    showNotifications.value ? createVNode(NotificationPanel, { userStore }) : null,
  ]);
}

const SOCIAL_APP_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f0f2f5; }
.social-app { max-width: 1200px; margin: 0 auto; }
.social-nav { background: white; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
.nav-logo { font-size: 1.5rem; font-weight: bold; color: #1da1f2; }
.nav-search input { padding: 8px 16px; border: 1px solid #ddd; border-radius: 20px; width: 300px; }
.nav-actions { display: flex; align-items: center; gap: 15px; }
.nav-btn { background: none; border: none; font-size: 1.3rem; cursor: pointer; position: relative; }
.badge { position: absolute; top: -5px; right: -5px; background: #e0245e; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; }
.nav-avatar { width: 35px; height: 35px; border-radius: 50%; }
.social-content { display: flex; gap: 20px; padding: 20px; }
.main-column { flex: 1; max-width: 600px; }
.side-column { width: 300px; }
.post-composer { background: white; padding: 15px; border-radius: 12px; margin-bottom: 15px; display: flex; gap: 12px; }
.composer-avatar { width: 45px; height: 45px; border-radius: 50%; }
.composer-content { flex: 1; }
.composer-content textarea { width: 100%; border: none; resize: none; font-size: 1rem; min-height: 60px; }
.composer-actions { display: flex; gap: 10px; margin-top: 10px; }
.action-btn { background: none; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; color: #65676b; }
.action-btn:hover { background: #f0f2f5; }
.action-btn.liked { color: #e0245e; }
.post-btn { background: #1da1f2; color: white; padding: 8px 20px; border-radius: 20px; border: none; cursor: pointer; }
.post-card { background: white; padding: 15px; border-radius: 12px; margin-bottom: 15px; }
.post-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.post-avatar { width: 40px; height: 40px; border-radius: 50%; }
.post-author { font-weight: 600; color: #050505; display: block; }
.post-time { color: #65676b; font-size: 0.85rem; }
.post-content { margin: 10px 0; line-height: 1.5; }
.post-images { display: grid; gap: 5px; margin: 10px 0; }
.post-image { width: 100%; border-radius: 8px; }
.post-stats { color: #65676b; font-size: 0.9rem; padding: 10px 0; border-bottom: 1px solid #eee; display: flex; gap: 20px; }
.post-actions { display: flex; gap: 5px; margin-top: 10px; }
.post-comments { margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; }
.comment-item { margin-bottom: 5px; }
.comment-author { font-weight: 600; margin-right: 5px; }
.user-card { background: white; padding: 20px; border-radius: 12px; text-align: center; }
.user-avatar-lg { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px; }
.user-bio { color: #65676b; font-size: 0.9rem; margin: 5px 0; }
.user-stats { display: flex; justify-content: space-around; margin-top: 15px; font-size: 0.9rem; color: #65676b; }
.trending { background: white; padding: 15px; border-radius: 12px; margin-top: 15px; }
.trending-item { padding: 8px 0; color: #1da1f2; cursor: pointer; }
.notification-panel { position: fixed; top: 60px; right: 20px; width: 320px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); padding: 15px; z-index: 200; }
.notification-item { padding: 10px; border-radius: 8px; cursor: pointer; margin-bottom: 5px; }
.notification-item.unread { background: #e7f3ff; }
.notification-item:hover { background: #f0f2f5; }
`;

export { SocialApp, createUserStore, createFeedStore, SOCIAL_APP_STYLES };

if (typeof require !== 'undefined' && require.main === module) {
  console.log('🧪 LytJS 社交媒体应用实战案例');
  console.log('📦 包含功能:');
  console.log('   - 用户认证和状态管理');
  console.log('   - 动态Feed流');
  console.log('   - 点赞、评论、分享');
  console.log('   - 实时通知');
  console.log('   - 用户资料卡');
  console.log('\n✅ 社交媒体应用案例创建成功！');
}
