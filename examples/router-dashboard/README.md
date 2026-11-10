# 运营看板 · 多页面路由真实应用

> 用 `@lytjs/router` 搭的一个完整多页面应用：概览（异步统计）→ 订单列表（异步表格）
> → 订单详情（动态参数）→ 404 兜底，全部靠 hash 路由驱动。

## 怎么跑

```bash
cd examples/router-dashboard
npm install     # 本仓根 node_modules 已链接 workspace 包，可跳过
npm run dev     # http://localhost:3100
npm run build   # 产物在 dist/
npm run preview
```

## 目录结构

```
router-dashboard/
├── index.html              # 只挂一个 #app 和 /main.js
├── main.js                 # 路由表 + 外壳（侧边栏 + RouterView）
├── api.js                  # 数据层：内存数据 + 40ms 延迟（模拟 HTTP）
├── pages/
│   ├── overview.js         # 概览：onMounted 拉数据 + computed 派生统计
│   ├── orders.js           # 列表：v-for 表格 + RouterLink 进详情
│   ├── order-detail.js     # 详情：computed 读 route().params.id
│   └── not-found.js        # 兜底页
├── router-dashboard.test.ts # 行为判据（jsdom 真跑）
└── vite.config.js
```

## 这个示例真正验证了什么

**行为判据**：`router-dashboard.test.ts`（jsdom 真跑，一条链路九段断言）——
首屏 loading → 数据到达 → 点导航切换 → 点行内链接进详情 → 不存在的 id
→ 未匹配路径兜底 → 浏览器后退 → 刷新语义。全部断言页面上**真实可见的文本**。

它不是「路由表写对了」的复述，而是针对三类真实踩过的坑：

| 坑                                                                                              | 判据怎么拦                               |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `RouterView` 渲染不出组件（历史上 `RouterLink` 曾返回描述对象而非带 `type` 的 vnode，渲染为空） | 断言 `.page` 的 class 与页面内文本       |
| 把 `useRoute()` 当 ref 用（写成 `route.value.params` / `route.params`）                         | 详情页断言具体客户名与金额，取不到就是空 |
| 兜底路由照 Vue 习惯写成 `/:pathMatch(.*)*`                                                      | 未知路径必须渲染「页面不存在」而不是空白 |

## 三条容易踩的契约（2026-11-10 实测）

1. **`useRoute()` 返回的是 signal，没有 `.value`**
   读值写 `route().path`、`route().params.id`。想把参数变成响应式派生值，
   用 `computed(() => String(route().params?.id ?? ''))`。

2. **兜底路由写 `'/*'`**
   `@lytjs/router` 的 matcher 支持静态段 / `:id` / `:id?` / `:id...` / `*`，
   **不支持** `/:pathMatch(.*)*`。写成后者整条路由会被当成静态字符串段，永不命中。

3. **模板块里的组件必须先注册**
   本示例走页面级 `components: { RouterLink }` 局部注册。
   在 `main.js` 里注册不会自动传给子组件（没有全局组件概念）。

## 已知行为（不是缺陷，但会影响你的写法）

- **`app.mount()` 是 async 的**。`main.js` 里 `createApp(App).use(router).mount('#app')`
  没有 `await`，所以 DOM 要等**一个宏任务**才出现（实测：同步与微任务阶段
  `#app` 仍是空的）。判据里因此统一用 `sleep(0)` 等渲染落地，而不是猜固定延时。
  若你的应用不能接受首帧空白，可以 `await app.mount('#app')` 后再做后续操作。
- **hash 写入比视图切换晚一个微任务**。点完链接后立刻读 `location.hash` 可能还是旧值；
  判据里在 `sleep(0)` 之后断言。
- **`history.back()` 经 `popstate` 异步生效**（实测 ~6ms）。判据用轮询等待，
  不用固定延时。
