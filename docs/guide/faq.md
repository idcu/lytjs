# 常见问题 FAQ

## 基础问题

### Q: Lyt.js 和 Vue.js 有什么区别？

**A:** 
- **零依赖**: Lyt.js 完全不依赖第三方库，包括响应式系统、编译器、渲染器等全部自研
- **超小体积**: gzip 后仅 34.56KB，远小于 Vue
- **Vapor Mode**: 无虚拟 DOM 模式，性能接近原生
- **Islands Architecture**: SSR 局部注水架构
- **学习曲线**: 更贴近原生 HTML，API 更简洁

### Q: Lyt.js 适合生产环境吗？

**A:** 
Lyt.js 已经具备生产级框架的基础：
- ✅ 完整的测试套件（2436+ 测试，100% 通过）
- ✅ 完整的核心功能
- ✅ 稳定的 API
- ✅ 完善的工具链

但需要注意：
- ⚠️ 生态系统还在发展中
- ⚠️ 社区相对较小
- ⚠️ 缺少大型生产项目验证

### Q: Lyt.js 的浏览器兼容性如何？

**A:** 
- 现代浏览器：Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- 需要支持：Proxy, Reflect, Promise, Map, Set
- IE 不支持

## 开发问题

### Q: 如何从 Vue 3 迁移到 Lyt.js？

**A:** 参考 [迁移指南](./migration-from-vue3.md)，主要变化：

```typescript
// Vue 3
import { ref, reactive } from 'vue'

// Lyt.js
import { ref, reactive } from '@lytjs/reactivity'
```

### Q: 如何解决"找不到模块"错误？

**A:** 
1. 确保安装了依赖：`npm install`
2. 检查导入路径：使用正确的包名 `@lytjs/core`
3. TypeScript 项目：检查 `tsconfig.json` 中的 `paths` 配置

### Q: 组件不更新怎么办？

**A:** 检查以下几点：
1. 确保使用了响应式数据（ref/reactive）
2. 避免直接替换整个响应式对象
3. 使用 `shallowRef` 时注意更新方式
4. 检查 Key 是否正确设置

```typescript
// ❌ 错误
let data = reactive({ count: 0 })
data = { count: 1 } // 替换了整个对象，丢失响应式

// ✅ 正确
const data = reactive({ count: 0 })
data.count = 1 // 直接修改属性
```

### Q: 如何调试 Lyt.js 应用？

**A:** 
1. 使用内置 DevTools：
```typescript
import { createDevTools } from '@lytjs/devtools'
app.use(createDevTools())
```

2. 使用浏览器 DevTools 的调试功能
3. 查看控制台错误信息

## 性能问题

### Q: 应用运行缓慢怎么办？

**A:** 参考 [性能优化指南](./performance.md)，检查：
1. 是否启用了 Vapor Mode
2. 是否有不必要的深层响应式
3. 列表是否设置了正确的 Key
4. 是否有大量 DOM 操作
5. 使用 DevTools 分析性能瓶颈

### Q: 首屏加载慢怎么优化？

**A:** 
1. 启用代码分割和懒加载
2. 使用 Vapor Mode
3. 预编译模板
4. 配置 CDN 和缓存
5. 使用 SSR/SSG

### Q: 内存占用高怎么办？

**A:** 
1. 使用 `shallowRef/shallowReactive`
2. 及时清理事件监听器
3. 使用 `KeepAlive` 时注意缓存策略
4. 避免不必要的响应式追踪
5. 使用 `markRaw` 标记静态数据

## 路由问题

### Q: History 模式刷新 404 怎么办？

**A:** 需要配置服务器支持 SPA 回退：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Q: 如何实现路由守卫？

**A:** 

```typescript
const router = createRouter({
  routes
})

router.beforeEach((to, from, next) => {
  // 检查权限
  if (to.meta.requiresAuth && !isLoggedIn()) {
    next('/login')
  } else {
    next()
  }
})
```

## 状态管理问题

### Q: Store 数据持久化怎么做？

**A:** 

```typescript
import { defineStore } from '@lytjs/store'

export const useStore = defineStore('main', {
  state: () => ({
    count: 0
  }),
  persist: {
    enabled: true,
    storage: localStorage,
    key: 'my-store'
  }
})
```

### Q: 多个组件间如何共享状态？

**A:** 
1. 使用 Store（推荐）
2. 使用 Props 和 Events
3. 使用 Provide/Inject

## 构建问题

### Q: 构建失败怎么办？

**A:** 
1. 检查 Node.js 版本（建议 16+）
2. 清除缓存：`rm -rf node_modules package-lock.json && npm install`
3. 检查 TypeScript 错误
4. 查看构建日志

### Q: 如何减小构建体积？

**A:** 
1. 启用 Tree Shaking
2. 使用代码分割
3. 移除未使用的导入
4. 启用压缩
5. 使用 Vapor Mode

## SSR 问题

### Q: SSR 时 window 未定义怎么办？

**A:** 使用客户端检查：

```typescript
const isClient = typeof window !== 'undefined'

if (isClient) {
  // 客户端代码
}
```

### Q: 如何处理 SSR 数据预取？

**A:** 

```typescript
export default {
  async onServerPrefetch() {
    const data = await fetchData()
    return data
  },
  setup() {
    const data = ref(null)
    onMounted(async () => {
      data.value = await fetchData()
    })
    return { data }
  }
}
```

## 生态问题

### Q: 有 UI 组件库吗？

**A:** 有基础组件库 `@lytjs/components`，包含常用组件：
- Button
- Input
- Select
- Modal
- Table
- 等等

### Q: 如何与第三方库集成？

**A:** 大多数第三方库都可以直接使用：

```typescript
import axios from 'axios'
import dayjs from 'dayjs'

const response = await axios.get('/api/data')
```

## 贡献问题

### Q: 如何为 Lyt.js 做贡献？

**A:** 
1. 查看 [贡献指南](../../CONTRIBUTING.md)
2. 提交 Issue 报告问题
3. 提交 Pull Request 改进代码
4. 改进文档
5. 分享使用经验

### Q: 如何报告 Bug？

**A:** 
1. 在 Gitee 仓库提交 Issue
2. 提供复现步骤
3. 提供最小复现代码
4. 说明预期行为和实际行为

## 未来计划

### Q: Lyt.js 的发展路线是什么？

**A:** 参考 [路线图](../roadmap.md)，主要计划：
- 完善生态系统
- 更多官方插件
- 开发工具改进
- 性能优化
- 文档完善

### Q: 会有 TypeScript 优先支持吗？

**A:** 是的，Lyt.js 完全使用 TypeScript 开发，提供完整的类型定义。

## 更多资源

- [快速开始](./quick-start.md)
- [API 文档](../api/core.md)
- [示例](../examples/todo-app.md)
- [GitHub 仓库](https://gitee.com/lytjs/lytjs)

---

还有其他问题？欢迎在 Gitee 仓库提交 Issue！
