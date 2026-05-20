/**
 * 管理后台实战案例
 *
 * 包含：
 * - 响应式状态管理
 * - 路由导航
 * - 数据表格
 * - 表单处理
 * - 图表展示
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console */

import { signal, computed } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';

// 状态管理
function createAdminStore() {
  const sidebarOpen = signal(true);
  const currentRoute = signal('dashboard');
  const loading = signal(false);
  const users = signal([
    { id: 1, name: '张三', email: 'zhangsan@example.com', role: '管理员', status: 'active' },
    { id: 2, name: '李四', email: 'lisi@example.com', role: '编辑', status: 'active' },
    { id: 3, name: '王五', email: 'wangwu@example.com', role: '用户', status: 'inactive' },
  ]);
  const stats = signal({
    users: 1524,
    orders: 3258,
    revenue: 89450,
    pageviews: 48520,
  });

  const activeMenuItem = computed(() => currentRoute.value);
  const activeUsers = computed(() => users.value.filter((u) => u.status === 'active').length);

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function setRoute(route: string) {
    currentRoute.value = route;
  }

  function addUser(user: any) {
    users.value = [...users.value, { ...user, id: Date.now() }];
  }

  function deleteUser(id: number) {
    users.value = users.value.filter((u) => u.id !== id);
  }

  function updateUser(id: number, updates: any) {
    users.value = users.value.map((u) => (u.id === id ? { ...u, ...updates } : u));
  }

  return {
    sidebarOpen,
    currentRoute,
    activeMenuItem,
    loading,
    users,
    stats,
    activeUsers,
    toggleSidebar,
    setRoute,
    addUser,
    deleteUser,
    updateUser,
  };
}

// 组件

function Sidebar(props: { store: any }) {
  const { sidebarOpen, setRoute, activeMenuItem } = props.store;

  const menuItems = [
    { key: 'dashboard', icon: '📊', label: '仪表板' },
    { key: 'users', icon: '👥', label: '用户管理' },
    { key: 'orders', icon: '🛒', label: '订单管理' },
    { key: 'analytics', icon: '📈', label: '数据分析' },
    { key: 'settings', icon: '⚙️', label: '系统设置' },
  ];

  return createVNode(
    'aside',
    {
      class: sidebarOpen.value ? 'sidebar open' : 'sidebar',
      style: {
        width: sidebarOpen.value ? '240px' : '60px',
        transition: 'all 0.3s ease',
      },
    },
    [
      createVNode('div', { class: 'sidebar-header' }, [
        createVNode('h1', { style: { display: sidebarOpen.value ? 'block' : 'none' } }, 'Admin'),
        createVNode('button', { onclick: props.store.toggleSidebar }, '☰'),
      ]),
      createVNode(
        'nav',
        { class: 'sidebar-nav' },
        menuItems.map((item) =>
          createVNode(
            'div',
            {
              class: activeMenuItem.value === item.key ? 'menu-item active' : 'menu-item',
              onclick: () => setRoute(item.key),
            },
            [
              createVNode('span', { class: 'menu-icon' }, item.icon),
              sidebarOpen.value ? createVNode('span', { class: 'menu-label' }, item.label) : null,
            ],
          ),
        ),
      ),
    ],
  );
}

function StatsCard(props: { title: string; value: string | number; icon: string; trend?: number }) {
  return createVNode('div', { class: 'stats-card' }, [
    createVNode('div', { class: 'stats-icon' }, props.icon),
    createVNode('div', { class: 'stats-content' }, [
      createVNode('h3', {}, props.title),
      createVNode(
        'p',
        { class: 'stats-value' },
        typeof props.value === 'number' ? props.value.toLocaleString() : props.value,
      ),
      props.trend
        ? createVNode(
            'span',
            {
              class: props.trend > 0 ? 'trend-up' : 'trend-down',
            },
            `${props.trend > 0 ? '+' : ''}${props.trend}%`,
          )
        : null,
    ]),
  ]);
}

function Dashboard(props: { store: any }) {
  const { stats } = props.store;

  return createVNode('div', { class: 'dashboard' }, [
    createVNode('h2', { class: 'page-title' }, '仪表板'),
    createVNode('div', { class: 'stats-grid' }, [
      createVNode(StatsCard, {
        title: '用户总数',
        value: stats.value.users,
        icon: '👥',
        trend: 12.5,
      }),
      createVNode(StatsCard, {
        title: '订单总数',
        value: stats.value.orders,
        icon: '🛒',
        trend: 8.3,
      }),
      createVNode(StatsCard, {
        title: '收入',
        value: `¥${stats.value.revenue.toLocaleString()}`,
        icon: '💰',
        trend: 5.2,
      }),
      createVNode(StatsCard, {
        title: '页面浏览',
        value: stats.value.pageviews,
        icon: '📊',
        trend: -1.5,
      }),
    ]),
    createVNode('div', { class: 'charts-section' }, [
      createVNode('div', { class: 'chart-card' }, [
        createVNode('h3', {}, '访问趋势'),
        createVNode('div', { class: 'chart-placeholder' }, '📈 图表区域'),
      ]),
      createVNode('div', { class: 'chart-card' }, [
        createVNode('h3', {}, '热门页面'),
        createVNode('div', { class: 'chart-placeholder' }, '📊 图表区域'),
      ]),
    ]),
  ]);
}

function UserTable(props: { store: any }) {
  const { users, deleteUser, updateUser } = props.store;

  return createVNode('div', { class: 'users-page' }, [
    createVNode('div', { class: 'page-header' }, [
      createVNode('h2', {}, '用户管理'),
      createVNode('button', { class: 'btn btn-primary' }, '+ 添加用户'),
    ]),
    createVNode('div', { class: 'table-container' }, [
      createVNode('table', { class: 'data-table' }, [
        createVNode('thead', {}, [
          createVNode('tr', {}, [
            createVNode('th', {}, 'ID'),
            createVNode('th', {}, '姓名'),
            createVNode('th', {}, '邮箱'),
            createVNode('th', {}, '角色'),
            createVNode('th', {}, '状态'),
            createVNode('th', {}, '操作'),
          ]),
        ]),
        createVNode(
          'tbody',
          {},
          users.value.map((user) =>
            createVNode('tr', { key: user.id }, [
              createVNode('td', {}, user.id),
              createVNode('td', {}, user.name),
              createVNode('td', {}, user.email),
              createVNode('td', {}, user.role),
              createVNode('td', {}, [
                createVNode(
                  'span',
                  {
                    class: `status-badge status-${user.status}`,
                  },
                  user.status === 'active' ? '活跃' : '禁用',
                ),
              ]),
              createVNode('td', {}, [
                createVNode(
                  'button',
                  {
                    class: 'btn btn-sm btn-secondary',
                    onclick: () => console.log('Edit user:', user.id),
                  },
                  '编辑',
                ),
                createVNode(
                  'button',
                  {
                    class: 'btn btn-sm btn-danger',
                    onclick: () => deleteUser(user.id),
                  },
                  '删除',
                ),
              ]),
            ]),
          ),
        ),
      ]),
    ]),
  ]);
}

function PageRouter(props: { store: any }) {
  const { currentRoute } = props.store;

  switch (currentRoute.value) {
    case 'dashboard':
      return createVNode(Dashboard, { store: props.store });
    case 'users':
      return createVNode(UserTable, { store: props.store });
    default:
      return createVNode('div', {}, '页面开发中...');
  }
}

function AdminApp() {
  const store = createAdminStore();

  return createVNode('div', { class: 'admin-app' }, [
    createVNode(Sidebar, { store }),
    createVNode('main', { class: 'admin-main' }, [
      createVNode('header', { class: 'topbar' }, [
        createVNode('div', { class: 'search-box' }, [
          createVNode('input', { type: 'text', placeholder: '搜索...' }),
        ]),
        createVNode('div', { class: 'user-menu' }, [
          createVNode('div', { class: 'avatar' }, '管'),
          createVNode('span', {}, '管理员'),
        ]),
      ]),
      createVNode('div', { class: 'content-area' }, [createVNode(PageRouter, { store })]),
    ]),
  ]);
}

const HTML_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; }
.admin-app { display: flex; min-height: 100vh; }
.sidebar { background: linear-gradient(180deg, #2c3e50 0%, #1a252f 100%); color: white; transition: width 0.3s; }
.sidebar.open { width: 240px; }
.sidebar-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; }
.sidebar-nav { padding: 20px 0; }
.menu-item { padding: 12px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s; }
.menu-item:hover { background: rgba(255,255,255,0.1); }
.menu-item.active { background: #3498db; }
.admin-main { flex: 1; display: flex; flex-direction: column; }
.topbar { background: white; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.search-box input { padding: 10px 15px; border: 1px solid #ddd; border-radius: 20px; width: 300px; }
.user-menu { display: flex; align-items: center; gap: 10px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: #3498db; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
.content-area { padding: 30px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
.stats-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 20px; }
.stats-icon { font-size: 2.5rem; opacity: 0.8; }
.stats-value { font-size: 1.8rem; font-weight: bold; color: #2c3e50; }
.trend-up { color: #27ae60; }
.trend-down { color: #e74c3c; }
.charts-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.chart-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.chart-placeholder { height: 200px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; margin-top: 15px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.table-container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 15px 20px; text-align: left; border-bottom: 1px solid #eee; }
.data-table th { background: #f8f9fa; font-weight: 600; color: #2c3e50; }
.status-badge { padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; }
.status-active { background: #d4edda; color: #155724; }
.status-inactive { background: #f8d7da; color: #721c24; }
.btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }
.btn-primary { background: #3498db; color: white; }
.btn-secondary { background: #95a5a6; color: white; }
.btn-danger { background: #e74c3c; color: white; }
.btn-sm { padding: 5px 10px; font-size: 0.8rem; margin-right: 5px; }
`;

function AdminAppHTML() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LytJS 管理后台</title>
  <style>${HTML_STYLES}</style>
</head>
<body>
  <div id="app"></div>
  <script>
    // 示例初始化代码
    console.log('LytJS 管理后台加载成功');
  </script>
</body>
</html>
  `;
}

export { AdminApp, createAdminStore, AdminAppHTML };

if (typeof require !== 'undefined' && require.main === module) {
  console.log('🧪 LytJS 管理后台实战案例');
  console.log('📦 包含功能:');
  console.log('   - 响应式状态管理');
  console.log('   - 路由导航');
  console.log('   - 数据表格');
  console.log('   - 统计卡片');
  console.log('   - 侧边栏');
  console.log('\n✅ 管理后台示例创建成功！');
}
