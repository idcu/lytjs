import { createApp, defineComponent, h, signal, computed } from '@lytjs/core';

// --- 类型定义 ---

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'editor';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
}

interface Order {
  id: string;
  customer: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  date: string;
}

// --- 模拟数据 ---

const initialUsers: User[] = [
  {
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: 2,
    name: '李四',
    email: 'lisi@example.com',
    role: 'editor',
    status: 'active',
    createdAt: '2024-02-20',
  },
  {
    id: 3,
    name: '王五',
    email: 'wangwu@example.com',
    role: 'user',
    status: 'pending',
    createdAt: '2024-03-10',
  },
  {
    id: 4,
    name: '赵六',
    email: 'zhaoliu@example.com',
    role: 'user',
    status: 'inactive',
    createdAt: '2024-01-25',
  },
];

const initialProducts: Product[] = [
  {
    id: 1,
    name: 'LytJS 学习包',
    category: '教程',
    price: 99,
    stock: 150,
    description: '完整的 LytJS 学习资料',
  },
  {
    id: 2,
    name: '开发者工具套装',
    category: '工具',
    price: 199,
    stock: 80,
    description: '提升开发效率的工具',
  },
  {
    id: 3,
    name: '企业版许可',
    category: '许可',
    price: 999,
    stock: 50,
    description: '企业级使用许可',
  },
  {
    id: 4,
    name: '技术咨询服务',
    category: '服务',
    price: 500,
    stock: 10,
    description: '专业技术咨询服务',
  },
];

const initialOrders: Order[] = [
  { id: 'ORD-001', customer: '张三', total: 99, status: 'delivered', date: '2024-05-10' },
  { id: 'ORD-002', customer: '李四', total: 199, status: 'shipped', date: '2024-05-12' },
  { id: 'ORD-003', customer: '王五', total: 999, status: 'processing', date: '2024-05-14' },
  { id: 'ORD-004', customer: '赵六', total: 500, status: 'pending', date: '2024-05-15' },
];

// --- 应用组件 ---

const App = defineComponent({
  name: 'AdminDashboard',

  setup() {
    // 状态
    const currentTab = signal<'dashboard' | 'users' | 'products' | 'orders'>('dashboard');
    const sidebarOpen = signal(true);
    const theme = signal<'light' | 'dark'>('light');

    // 用户管理状态
    const users = signal<User[]>([...initialUsers]);
    const selectedUser = signal<User | null>(null);
    const searchUser = signal('');

    // 产品管理状态
    const products = signal<Product[]>([...initialProducts]);
    const productFormOpen = signal(false);
    const editingProduct = signal<Product | null>(null);

    // 订单管理状态
    const orders = signal<Order[]>([...initialOrders]);

    // 计算属性
    const filteredUsers = computed(() => {
      const search = searchUser.value.toLowerCase();
      return users.value.filter(
        (user) =>
          user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search),
      );
    });

    const stats = computed(() => ({
      totalUsers: users.value.length,
      activeUsers: users.value.filter((u) => u.status === 'active').length,
      totalProducts: products.value.length,
      lowStock: products.value.filter((p) => p.stock < 50).length,
      totalRevenue: orders.value.reduce((sum, o) => sum + o.total, 0),
      pendingOrders: orders.value.filter((o) => o.status === 'pending').length,
    }));

    // 方法
    const toggleSidebar = () => {
      sidebarOpen.value = !sidebarOpen.value;
    };

    const toggleTheme = () => {
      theme.value = theme.value === 'light' ? 'dark' : 'light';
    };

    const selectUser = (user: User) => {
      selectedUser.value = user;
    };

    const toggleUserStatus = (userId: number) => {
      users.value = users.value.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            status: user.status === 'active' ? 'inactive' : 'active',
          };
        }
        return user;
      });
    };

    const openProductForm = (product?: Product) => {
      if (product) {
        editingProduct.value = { ...product };
      } else {
        editingProduct.value = {
          id: Date.now(),
          name: '',
          category: '',
          price: 0,
          stock: 0,
          description: '',
        };
      }
      productFormOpen.value = true;
    };

    const saveProduct = () => {
      if (!editingProduct.value) return;

      const product = editingProduct.value;
      const existingIndex = products.value.findIndex((p) => p.id === product.id);

      if (existingIndex !== -1) {
        const newProducts = [...products.value];
        newProducts[existingIndex] = product;
        products.value = newProducts;
      } else {
        products.value = [...products.value, product];
      }

      productFormOpen.value = false;
      editingProduct.value = null;
    };

    const deleteProduct = (productId: number) => {
      products.value = products.value.filter((p) => p.id !== productId);
    };

    const updateOrderStatus = (orderId: string, newStatus: Order['status']) => {
      orders.value = orders.value.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order,
      );
    };

    // 渲染函数
    return () =>
      h('div', { class: `dashboard ${theme.value}` }, [
        // 侧边栏
        h(
          'aside',
          {
            class: ['sidebar', { closed: !sidebarOpen.value }],
          },
          [
            h('div', { class: 'sidebar-header' }, [
              h('h1', 'LytJS 管理'),
              h(
                'button',
                {
                  class: 'close-btn',
                  onClick: toggleSidebar,
                },
                '✕',
              ),
            ]),
            h('nav', [
              h(
                'a',
                {
                  class: ['nav-item', { active: currentTab.value === 'dashboard' }],
                  onClick: () => (currentTab.value = 'dashboard'),
                },
                '📊 仪表盘',
              ),
              h(
                'a',
                {
                  class: ['nav-item', { active: currentTab.value === 'users' }],
                  onClick: () => (currentTab.value = 'users'),
                },
                '👥 用户管理',
              ),
              h(
                'a',
                {
                  class: ['nav-item', { active: currentTab.value === 'products' }],
                  onClick: () => (currentTab.value = 'products'),
                },
                '📦 产品管理',
              ),
              h(
                'a',
                {
                  class: ['nav-item', { active: currentTab.value === 'orders' }],
                  onClick: () => (currentTab.value = 'orders'),
                },
                '🛒 订单管理',
              ),
            ]),
            h('div', { class: 'sidebar-footer' }, [
              h(
                'button',
                {
                  class: 'theme-toggle',
                  onClick: toggleTheme,
                },
                `${theme.value === 'light' ? '🌙' : '☀️'} 主题`,
              ),
            ]),
          ],
        ),

        // 主内容区
        h('main', { class: 'main-content' }, [
          // 顶部导航
          h('header', { class: 'header' }, [
            !sidebarOpen.value
              ? h(
                  'button',
                  {
                    class: 'menu-btn',
                    onClick: toggleSidebar,
                  },
                  '☰',
                )
              : null,
            h('div', { class: 'header-actions' }, [
              h('span', { class: 'user-info' }, '👋 欢迎，管理员'),
              h('button', { class: 'logout-btn' }, '退出登录'),
            ]),
          ]),

          // 内容区域
          h('div', { class: 'content' }, [
            // 仪表盘
            currentTab.value === 'dashboard'
              ? h('div', { class: 'dashboard-view' }, [
                  h('h2', '📊 仪表盘'),
                  h('div', { class: 'stats-grid' }, [
                    h('div', { class: 'stat-card' }, [
                      h('div', { class: 'stat-value' }, String(stats.value.totalUsers)),
                      h('div', { class: 'stat-label' }, '总用户数'),
                    ]),
                    h('div', { class: 'stat-card' }, [
                      h('div', { class: 'stat-value' }, String(stats.value.activeUsers)),
                      h('div', { class: 'stat-label' }, '活跃用户'),
                    ]),
                    h('div', { class: 'stat-card' }, [
                      h('div', { class: 'stat-value' }, String(stats.value.totalProducts)),
                      h('div', { class: 'stat-label' }, '产品数量'),
                    ]),
                    h('div', { class: 'stat-card' }, [
                      h(
                        'div',
                        { class: 'stat-value' },
                        `¥${stats.value.totalRevenue.toLocaleString()}`,
                      ),
                      h('div', { class: 'stat-label' }, '总营收'),
                    ]),
                  ]),

                  h('div', { class: 'dashboard-section' }, [
                    h('h3', '📦 库存预警'),
                    stats.value.lowStock > 0
                      ? h(
                          'div',
                          { class: 'warning-box' },
                          `⚠️ 有 ${stats.value.lowStock} 个产品库存不足 50`,
                        )
                      : h('div', { class: 'success-box' }, '✅ 所有产品库存充足'),
                  ]),

                  h('div', { class: 'dashboard-section' }, [
                    h('h3', '📋 待处理订单'),
                    h(
                      'ul',
                      { class: 'orders-preview' },
                      orders.value
                        .filter((o) => o.status === 'pending')
                        .map((order) =>
                          h('li', { class: 'order-preview' }, [
                            h('span', order.id),
                            h('span', order.customer),
                            h('span', `¥${order.total}`),
                          ]),
                        ),
                    ),
                  ]),
                ])
              : null,

            // 用户管理
            currentTab.value === 'users'
              ? h('div', { class: 'users-view' }, [
                  h('div', { class: 'view-header' }, [
                    h('h2', '👥 用户管理'),
                    h('div', { class: 'search-box' }, [
                      h('input', {
                        type: 'text',
                        placeholder: '搜索用户...',
                        value: searchUser.value,
                        onInput: (e: any) => (searchUser.value = e.target.value),
                      }),
                    ]),
                  ]),

                  h('div', { class: 'table-container' }, [
                    h('table', [
                      h('thead', [
                        h('tr', [
                          h('th', 'ID'),
                          h('th', '姓名'),
                          h('th', '邮箱'),
                          h('th', '角色'),
                          h('th', '状态'),
                          h('th', '操作'),
                        ]),
                      ]),
                      h(
                        'tbody',
                        filteredUsers.value.map((user) =>
                          h(
                            'tr',
                            {
                              key: user.id,
                              class: { selected: selectedUser.value?.id === user.id },
                            },
                            [
                              h('td', String(user.id)),
                              h('td', user.name),
                              h('td', user.email),
                              h('td', { class: `role-badge ${user.role}` }, user.role),
                              h('td', { class: `status-badge ${user.status}` }, user.status),
                              h('td', { class: 'actions' }, [
                                h(
                                  'button',
                                  {
                                    class: 'btn-small',
                                    onClick: () => selectUser(user),
                                  },
                                  '查看',
                                ),
                                h(
                                  'button',
                                  {
                                    class: 'btn-small btn-warning',
                                    onClick: () => toggleUserStatus(user.id),
                                  },
                                  user.status === 'active' ? '禁用' : '启用',
                                ),
                              ]),
                            ],
                          ),
                        ),
                      ),
                    ]),
                  ]),

                  selectedUser.value
                    ? h('div', { class: 'user-details' }, [
                        h('div', { class: 'modal-overlay' }, [
                          h('div', { class: 'modal' }, [
                            h('h3', `用户详情 - ${selectedUser.value.name}`),
                            h('div', { class: 'detail-item' }, [
                              h('span', { class: 'detail-label' }, 'ID:'),
                              h('span', String(selectedUser.value.id)),
                            ]),
                            h('div', { class: 'detail-item' }, [
                              h('span', { class: 'detail-label' }, '邮箱:'),
                              h('span', selectedUser.value.email),
                            ]),
                            h('div', { class: 'detail-item' }, [
                              h('span', { class: 'detail-label' }, '角色:'),
                              h(
                                'span',
                                { class: `role-badge ${selectedUser.value.role}` },
                                selectedUser.value.role,
                              ),
                            ]),
                            h('div', { class: 'detail-item' }, [
                              h('span', { class: 'detail-label' }, '状态:'),
                              h(
                                'span',
                                { class: `status-badge ${selectedUser.value.status}` },
                                selectedUser.value.status,
                              ),
                            ]),
                            h('div', { class: 'detail-item' }, [
                              h('span', { class: 'detail-label' }, '创建时间:'),
                              h('span', selectedUser.value.createdAt),
                            ]),
                            h('div', { class: 'modal-actions' }, [
                              h(
                                'button',
                                {
                                  class: 'btn',
                                  onClick: () => (selectedUser.value = null),
                                },
                                '关闭',
                              ),
                            ]),
                          ]),
                        ]),
                      ])
                    : null,
                ])
              : null,

            // 产品管理
            currentTab.value === 'products'
              ? h('div', { class: 'products-view' }, [
                  h('div', { class: 'view-header' }, [
                    h('h2', '📦 产品管理'),
                    h(
                      'button',
                      {
                        class: 'btn btn-primary',
                        onClick: () => openProductForm(),
                      },
                      '+ 添加产品',
                    ),
                  ]),

                  h(
                    'div',
                    { class: 'products-grid' },
                    products.value.map((product) =>
                      h('div', { class: 'product-card', key: product.id }, [
                        h('div', { class: 'product-header' }, [
                          h('h4', product.name),
                          h('span', { class: 'product-category' }, product.category),
                        ]),
                        h('p', { class: 'product-description' }, product.description),
                        h('div', { class: 'product-price' }, `¥${product.price}`),
                        h('div', { class: 'product-stock' }, [
                          h(
                            'span',
                            { class: product.stock < 50 ? 'stock-low' : 'stock-normal' },
                            `库存: ${product.stock}`,
                          ),
                        ]),
                        h('div', { class: 'product-actions' }, [
                          h(
                            'button',
                            {
                              class: 'btn-small',
                              onClick: () => openProductForm(product),
                            },
                            '编辑',
                          ),
                          h(
                            'button',
                            {
                              class: 'btn-small btn-danger',
                              onClick: () => deleteProduct(product.id),
                            },
                            '删除',
                          ),
                        ]),
                      ]),
                    ),
                  ),

                  productFormOpen.value && editingProduct.value
                    ? h('div', { class: 'product-form-modal' }, [
                        h('div', { class: 'modal-overlay' }, [
                          h('div', { class: 'modal' }, [
                            h('h3', editingProduct.value.id ? '编辑产品' : '添加产品'),
                            h('div', { class: 'form-group' }, [
                              h('label', '产品名称'),
                              h('input', {
                                type: 'text',
                                value: editingProduct.value.name,
                                onInput: (e: any) => {
                                  if (editingProduct.value) {
                                    editingProduct.value = {
                                      ...editingProduct.value,
                                      name: e.target.value,
                                    };
                                  }
                                },
                              }),
                            ]),
                            h('div', { class: 'form-group' }, [
                              h('label', '分类'),
                              h('input', {
                                type: 'text',
                                value: editingProduct.value.category,
                                onInput: (e: any) => {
                                  if (editingProduct.value) {
                                    editingProduct.value = {
                                      ...editingProduct.value,
                                      category: e.target.value,
                                    };
                                  }
                                },
                              }),
                            ]),
                            h('div', { class: 'form-group' }, [
                              h('label', '价格'),
                              h('input', {
                                type: 'number',
                                value: editingProduct.value.price,
                                onInput: (e: any) => {
                                  if (editingProduct.value) {
                                    editingProduct.value = {
                                      ...editingProduct.value,
                                      price: Number(e.target.value),
                                    };
                                  }
                                },
                              }),
                            ]),
                            h('div', { class: 'form-group' }, [
                              h('label', '库存'),
                              h('input', {
                                type: 'number',
                                value: editingProduct.value.stock,
                                onInput: (e: any) => {
                                  if (editingProduct.value) {
                                    editingProduct.value = {
                                      ...editingProduct.value,
                                      stock: Number(e.target.value),
                                    };
                                  }
                                },
                              }),
                            ]),
                            h('div', { class: 'form-group' }, [
                              h('label', '描述'),
                              h('textarea', {
                                value: editingProduct.value.description,
                                onInput: (e: any) => {
                                  if (editingProduct.value) {
                                    editingProduct.value = {
                                      ...editingProduct.value,
                                      description: e.target.value,
                                    };
                                  }
                                },
                              }),
                            ]),
                            h('div', { class: 'modal-actions' }, [
                              h(
                                'button',
                                {
                                  class: 'btn',
                                  onClick: () => {
                                    productFormOpen.value = false;
                                    editingProduct.value = null;
                                  },
                                },
                                '取消',
                              ),
                              h(
                                'button',
                                {
                                  class: 'btn btn-primary',
                                  onClick: saveProduct,
                                },
                                '保存',
                              ),
                            ]),
                          ]),
                        ]),
                      ])
                    : null,
                ])
              : null,

            // 订单管理
            currentTab.value === 'orders'
              ? h('div', { class: 'orders-view' }, [
                  h('h2', '🛒 订单管理'),
                  h('div', { class: 'table-container' }, [
                    h('table', [
                      h('thead', [
                        h('tr', [
                          h('th', '订单号'),
                          h('th', '客户'),
                          h('th', '金额'),
                          h('th', '状态'),
                          h('th', '日期'),
                          h('th', '操作'),
                        ]),
                      ]),
                      h(
                        'tbody',
                        orders.value.map((order) =>
                          h('tr', { key: order.id }, [
                            h('td', order.id),
                            h('td', order.customer),
                            h('td', `¥${order.total}`),
                            h('td', { class: `status-badge ${order.status}` }, order.status),
                            h('td', order.date),
                            h(
                              'td',
                              { class: 'actions' },
                              order.status === 'pending'
                                ? h(
                                    'button',
                                    {
                                      class: 'btn-small btn-primary',
                                      onClick: () => updateOrderStatus(order.id, 'processing'),
                                    },
                                    '处理',
                                  )
                                : order.status === 'processing'
                                  ? h(
                                      'button',
                                      {
                                        class: 'btn-small',
                                        onClick: () => updateOrderStatus(order.id, 'shipped'),
                                      },
                                      '发货',
                                    )
                                  : order.status === 'shipped'
                                    ? h(
                                        'button',
                                        {
                                          class: 'btn-small btn-success',
                                          onClick: () => updateOrderStatus(order.id, 'delivered'),
                                        },
                                        '完成',
                                      )
                                    : null,
                            ),
                          ]),
                        ),
                      ),
                    ]),
                  ]),
                ])
              : null,
          ]),
        ]),
      ]);
  },
});

// --- 创建应用 ---

const app = createApp(App);
app.mount('#app');
