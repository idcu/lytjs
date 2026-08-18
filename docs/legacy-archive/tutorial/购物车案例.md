# 电商购物车实战案例

本案例将展示如何使用 LytJS 构建一个完整的电商购物车系统，包含产品列表、购物车管理、订单确认等功能。

## 项目概述

### 功能特性

- 📦 产品列表展示
- 🛒 购物车添加/删除
- ➕➖ 数量增减
- 📊 实时价格计算
- 🎨 响应式设计
- 💾 本地存储持久化

### 技术要点

- Signal 响应式系统
- Vapor 模式渲染
- 组件化开发
- 状态管理
- 本地存储

---

## 第一步：项目初始化

### 创建应用实例

```typescript
import { createApp, defineComponent, ref, computed, effect } from '@lytjs/core';
import { h } from '@lytjs/vdom';
import { ThemePlugin } from '@lytjs/plugin-theme';
import { StoragePlugin } from '@lytjs/plugin-storage';

// 产品类型定义
interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
}

// 购物车项类型定义
interface CartItem {
  product: Product;
  quantity: number;
}

// 模拟产品数据
const mockProducts: Product[] = [
  {
    id: '1',
    name: '无线蓝牙耳机',
    price: 299,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    description: '高品质音效，持久续航',
    category: '电子设备',
  },
  {
    id: '2',
    name: '智能手表',
    price: 599,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    description: '健康监测，运动追踪',
    category: '电子设备',
  },
  {
    id: '3',
    name: '机械键盘',
    price: 399,
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400',
    description: '青轴手感，RGB背光',
    category: '电脑配件',
  },
  {
    id: '4',
    name: '游戏鼠标',
    price: 199,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
    description: '精准定位，舒适握感',
    category: '电脑配件',
  },
  {
    id: '5',
    name: '便携充电宝',
    price: 149,
    image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
    description: '20000mAh，快速充电',
    category: '配件',
  },
  {
    id: '6',
    name: '4K 显示器',
    price: 1999,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
    description: '超高清画质，护眼模式',
    category: '电脑配件',
  },
];
```

---

## 第二步：状态管理

### 创建购物车状态

```typescript
// 购物车状态
const cartItems = ref<CartItem[]>([]);

// 从本地存储加载
const loadCart = () => {
  const saved = localStorage.getItem('lytjs-cart');
  if (saved) {
    try {
      cartItems.value = JSON.parse(saved);
    } catch {
      cartItems.value = [];
    }
  }
};

// 保存到本地存储
const saveCart = () => {
  localStorage.setItem('lytjs-cart', JSON.stringify(cartItems.value));
};

// 添加产品到购物车
const addToCart = (product: Product) => {
  const existingItem = cartItems.value.find((item) => item.product.id === product.id);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cartItems.value.push({ product, quantity: 1 });
  }
  saveCart();
};

// 从购物车移除
const removeFromCart = (productId: string) => {
  const index = cartItems.value.findIndex((item) => item.product.id === productId);
  if (index > -1) {
    cartItems.value.splice(index, 1);
    saveCart();
  }
};

// 更新数量
const updateQuantity = (productId: string, quantity: number) => {
  const item = cartItems.value.find((item) => item.product.id === productId);
  if (item) {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      item.quantity = quantity;
      saveCart();
    }
  }
};

// 清空购物车
const clearCart = () => {
  cartItems.value = [];
  saveCart();
};

// 计算总价
const totalPrice = computed(() => {
  return cartItems.value.reduce((total, item) => {
    return total + item.product.price * item.quantity;
  }, 0);
});

// 计算商品总数
const totalItems = computed(() => {
  return cartItems.value.reduce((total, item) => total + item.quantity, 0);
});

// 初始化
loadCart();
```

---

## 第三步：创建产品列表组件

```typescript
// 产品卡片组件
const ProductCard = defineComponent({
  name: 'ProductCard',
  props: {
    product: { type: Object as () => Product, required: true },
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          class: 'product-card',
          style: {
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            margin: '8px',
            width: '280px',
            display: 'inline-block',
            verticalAlign: 'top',
            transition: 'transform 0.2s, box-shadow 0.2s',
          },
          onmouseenter: (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            target.style.transform = 'translateY(-4px)';
            target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          },
          onmouseleave: (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            target.style.transform = 'translateY(0)';
            target.style.boxShadow = 'none';
          },
        },
        [
          // 产品图片
          h(
            'div',
            {
              style: {
                width: '100%',
                height: '200px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              },
            },
            [
              h('img', {
                src: props.product.image,
                alt: props.product.name,
                style: {
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'cover',
                },
              }),
            ],
          ),

          // 分类标签
          h(
            'span',
            {
              style: {
                display: 'inline-block',
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                marginBottom: '8px',
              },
            },
            props.product.category,
          ),

          // 产品名称
          h(
            'h3',
            {
              style: {
                margin: '8px 0',
                fontSize: '18px',
                fontWeight: '600',
              },
            },
            props.product.name,
          ),

          // 产品描述
          h(
            'p',
            {
              style: {
                color: '#6b7280',
                fontSize: '14px',
                margin: '8px 0',
              },
            },
            props.product.description,
          ),

          // 价格和添加按钮
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
              },
            },
            [
              h(
                'span',
                {
                  style: {
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#dc2626',
                  },
                },
                `¥${props.product.price}`,
              ),

              h(
                'button',
                {
                  style: {
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s',
                  },
                  onmouseenter: (e: MouseEvent) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb';
                  },
                  onmouseleave: (e: MouseEvent) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#3b82f6';
                  },
                  onclick: () => addToCart(props.product),
                },
                '加入购物车',
              ),
            ],
          ),
        ],
      );
  },
});

// 产品列表组件
const ProductList = defineComponent({
  name: 'ProductList',
  setup() {
    const products = ref<Product[]>(mockProducts);
    const selectedCategory = ref<string>('all');

    // 分类筛选
    const filteredProducts = computed(() => {
      if (selectedCategory.value === 'all') {
        return products.value;
      }
      return products.value.filter((p) => p.category === selectedCategory.value);
    });

    // 获取所有分类
    const categories = computed(() => {
      const cats = new Set(products.value.map((p) => p.category));
      return ['all', ...Array.from(cats)];
    });

    return () =>
      h('div', { class: 'product-list' }, [
        // 分类筛选
        h(
          'div',
          {
            style: {
              marginBottom: '24px',
              textAlign: 'center',
            },
          },
          [
            h('span', { style: { marginRight: '12px' } }, '分类筛选：'),
            ...categories.value.map((cat) =>
              h(
                'button',
                {
                  style: {
                    margin: '0 4px',
                    padding: '6px 12px',
                    border:
                      selectedCategory.value === cat ? '2px solid #3b82f6' : '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: selectedCategory.value === cat ? '#3b82f6' : 'white',
                    color: selectedCategory.value === cat ? 'white' : '#374151',
                    cursor: 'pointer',
                  },
                  onclick: () => {
                    selectedCategory.value = cat;
                  },
                },
                cat === 'all' ? '全部' : cat,
              ),
            ),
          ],
        ),

        // 产品网格
        h(
          'div',
          {
            style: {
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
            },
          },
          filteredProducts.value.map((product) => h(ProductCard, { product, key: product.id })),
        ),
      ]);
  },
});
```

---

## 第四步：创建购物车组件

```typescript
// 购物车项组件
const CartItemComponent = defineComponent({
  name: 'CartItemComponent',
  props: {
    item: { type: Object as () => CartItem, required: true },
  },
  setup(props) {
    return () =>
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            gap: '16px',
          },
        },
        [
          // 产品图片
          h('img', {
            src: props.item.product.image,
            alt: props.item.product.name,
            style: {
              width: '60px',
              height: '60px',
              objectFit: 'cover',
              borderRadius: '4px',
            },
          }),

          // 产品信息
          h('div', { style: { flex: 1 } }, [
            h('h4', { style: { margin: '0 0 4px 0' } }, props.item.product.name),
            h(
              'p',
              { style: { margin: 0, color: '#6b7280', fontSize: '14px' } },
              `¥${props.item.product.price} × ${props.item.quantity}`,
            ),
          ]),

          // 数量控制
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              },
            },
            [
              h(
                'button',
                {
                  style: {
                    width: '28px',
                    height: '28px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                  },
                  onclick: () => updateQuantity(props.item.product.id, props.item.quantity - 1),
                },
                '-',
              ),
              h('span', { style: { minWidth: '30px', textAlign: 'center' } }, props.item.quantity),
              h(
                'button',
                {
                  style: {
                    width: '28px',
                    height: '28px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                  },
                  onclick: () => updateQuantity(props.item.product.id, props.item.quantity + 1),
                },
                '+',
              ),
            ],
          ),

          // 小计
          h(
            'span',
            {
              style: {
                fontWeight: 'bold',
                minWidth: '80px',
                textAlign: 'right',
              },
            },
            `¥${props.item.product.price * props.item.quantity}`,
          ),

          // 删除按钮
          h(
            'button',
            {
              style: {
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
              },
              onclick: () => removeFromCart(props.item.product.id),
            },
            '删除',
          ),
        ],
      );
  },
});

// 购物车主组件
const ShoppingCart = defineComponent({
  name: 'ShoppingCart',
  setup() {
    const isCartOpen = ref(false);

    return () =>
      h('div', { class: 'shopping-cart' }, [
        // 购物车按钮（悬浮在右上角）
        h(
          'button',
          {
            style: {
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            },
            onclick: () => {
              isCartOpen.value = !isCartOpen.value;
            },
          },
          [
            '🛒 购物车 ',
            h(
              'span',
              {
                style: {
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '2px 8px',
                  fontSize: '12px',
                  marginLeft: '8px',
                },
              },
              totalItems.value,
            ),
          ],
        ),

        // 购物车面板
        isCartOpen.value
          ? h(
              'div',
              {
                style: {
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  width: '400px',
                  height: '100%',
                  backgroundColor: 'white',
                  boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
                  zIndex: 999,
                  display: 'flex',
                  flexDirection: 'column',
                },
              },
              [
                // 头部
                h(
                  'div',
                  {
                    style: {
                      padding: '20px',
                      borderBottom: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    },
                  },
                  [
                    h('h2', { style: { margin: 0 } }, '购物车'),
                    h(
                      'button',
                      {
                        style: {
                          background: 'none',
                          border: 'none',
                          fontSize: '24px',
                          cursor: 'pointer',
                        },
                        onclick: () => {
                          isCartOpen.value = false;
                        },
                      },
                      '×',
                    ),
                  ],
                ),

                // 购物车内容
                h('div', { style: { flex: 1, overflowY: 'auto' } }, [
                  cartItems.value.length === 0
                    ? h(
                        'div',
                        {
                          style: {
                            textAlign: 'center',
                            padding: '40px',
                            color: '#6b7280',
                          },
                        },
                        '购物车是空的',
                      )
                    : cartItems.value.map((item) =>
                        h(CartItemComponent, { item, key: item.product.id }),
                      ),
                ]),

                // 底部结算栏
                cartItems.value.length > 0
                  ? h(
                      'div',
                      {
                        style: {
                          padding: '20px',
                          borderTop: '1px solid #e5e7eb',
                        },
                      },
                      [
                        h(
                          'div',
                          {
                            style: {
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '16px',
                              fontSize: '18px',
                              fontWeight: 'bold',
                            },
                          },
                          [
                            h('span', '总计：'),
                            h('span', { style: { color: '#dc2626' } }, `¥${totalPrice.value}`),
                          ],
                        ),
                        h('div', { style: { display: 'flex', gap: '8px' } }, [
                          h(
                            'button',
                            {
                              style: {
                                flex: 1,
                                padding: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer',
                              },
                              onclick: clearCart,
                            },
                            '清空购物车',
                          ),
                          h(
                            'button',
                            {
                              style: {
                                flex: 2,
                                padding: '12px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '16px',
                              },
                              onclick: () => {
                                alert(`订单已提交！总计：¥${totalPrice.value}`);
                                clearCart();
                                isCartOpen.value = false;
                              },
                            },
                            '结算',
                          ),
                        ]),
                      ],
                    )
                  : null,
              ],
            )
          : null,
      ]);
  },
});
```

---

## 第五步：创建主应用

```typescript
// 主应用组件
const App = defineComponent({
  name: 'App',
  setup() {
    return () =>
      h(
        'div',
        {
          style: {
            minHeight: '100vh',
            backgroundColor: '#f9fafb',
          },
        },
        [
          // 头部
          h(
            'header',
            {
              style: {
                backgroundColor: '#1f2937',
                color: 'white',
                padding: '20px',
                textAlign: 'center',
              },
            },
            [
              h('h1', { style: { margin: 0 } }, '🛍️ LytJS 电商商城'),
              h(
                'p',
                { style: { margin: '8px 0 0 0', opacity: 0.8 } },
                '使用 LytJS 构建的现代化购物系统',
              ),
            ],
          ),

          // 购物车组件
          h(ShoppingCart),

          // 主内容区
          h(
            'main',
            {
              style: {
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '40px 20px',
              },
            },
            [
              h('h2', { style: { textAlign: 'center', marginBottom: '32px' } }, '精选商品'),
              h(ProductList),
            ],
          ),
        ],
      );
  },
});

// 创建并挂载应用
const app = createApp(App);
app.use(ThemePlugin, { defaultTheme: 'light' });
app.use(StoragePlugin);
app.mount('#app');
```

---

## 第六步：创建 HTML 入口文件

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LytJS 电商购物车</title>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      #app {
        min-height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./shopping-cart.ts"></script>
  </body>
</html>
```

---

## 完整功能说明

### 1. 产品展示

- ✅ 产品网格布局
- ✅ 分类筛选
- ✅ 产品卡片悬停效果
- ✅ 图片、名称、价格、描述展示

### 2. 购物车管理

- ✅ 添加商品到购物车
- ✅ 移除商品
- ✅ 数量增减
- ✅ 实时总价计算
- ✅ 商品数量统计

### 3. 用户体验

- ✅ 侧边滑出购物车面板
- ✅ 本地存储持久化
- ✅ 响应式设计
- ✅ 交互动画

### 4. 订单流程

- ✅ 购物车预览
- ✅ 订单提交
- ✅ 购物车清空

---

## 进阶扩展建议

### 1. 添加更多功能

- 🔄 用户登录/注册
- 🔄 优惠券系统
- 🔄 收货地址管理
- 🔄 订单历史记录
- 🔄 产品搜索功能
- 🔄 价格排序

### 2. 性能优化

- 🔄 产品列表虚拟滚动
- 🔄 图片懒加载
- 🔄 购物车数据压缩存储
- 🔄 防抖/节流优化

### 3. 测试覆盖

- 🔄 单元测试（状态逻辑）
- 🔄 组件测试（渲染逻辑）
- 🔄 E2E 测试（完整流程）

---

## 运行本案例

```bash
# 1. 创建项目目录
mkdir lytjs-shopping-cart
cd lytjs-shopping-cart

# 2. 初始化项目
npm init -y

# 3. 安装依赖
npm install @lytjs/core @lytjs/vdom @lytjs/plugin-theme @lytjs/plugin-storage

# 4. 安装开发依赖
npm install -D vite typescript

# 5. 创建上述文件
# - shopping-cart.ts
# - index.html

# 6. 启动开发服务器
npx vite
```

---

## 总结

通过这个案例，你学会了：

1. ✅ 使用 Signal 管理应用状态
2. ✅ 组件化开发购物车系统
3. ✅ 本地存储持久化数据
4. ✅ 实时计算（使用 computed）
5. ✅ 响应式 UI 设计
6. ✅ 插件系统使用

继续探索 LytJS 的更多功能！
