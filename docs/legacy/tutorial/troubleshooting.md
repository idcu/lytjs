# 问题排查手册

本文档提供常见问题的详细排查步骤和解决方案。

## 构建问题

### pnpm install 失败

**症状**：依赖安装失败

**排查步骤**：

1. 检查 Node.js 版本
```bash
node -v  # 确保 >= 18.0.0
```

2. 检查 pnpm 版本
```bash
pnpm -v  # 确保 >= 9.0.0
```

3. 清理缓存并重试
```bash
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

4. 使用国内镜像（如有必要）
```bash
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

### 构建失败

**症状**：`pnpm build` 报错

**排查步骤**：

1. 检查类型错误
```bash
pnpm type-check
```

2. 检查 lint 错误
```bash
pnpm lint:check
```

3. 检查是否有缺失的依赖
```bash
pnpm install
pnpm build
```

4. 查看详细错误信息
```bash
pnpm build --verbose
```

### 模块找不到

**症状**：`Cannot find module`

**排查步骤**：

1. 确认依赖已安装
```bash
pnpm ls <package-name>
```

2. 确认包的构建产物存在
```bash
ls packages/<package-name>/dist/
```

3. 重新构建依赖包
```bash
cd packages/<package-name>
pnpm build
```

## 类型问题

### __DEV__ 未定义

**症状**：`Cannot find name '__DEV__'`

**解决方案**：

在包的 src 目录下创建 `env.d.ts` 文件：

```typescript
// env.d.ts
declare const __DEV__: boolean;
```

### 类型错误

**症状**：TypeScript 类型检查失败

**排查步骤**：

1. 检查 tsconfig.json 配置
```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

2. 确保导入了正确的类型
```typescript
// 使用 import type
import type { Component } from '@lytjs/core';

// 避免使用 any
const data: any = fetchData();  // ❌ 不推荐
const data: unknown = fetchData();  // ✅ 推荐
```

3. 检查类型定义文件
```bash
ls packages/<package-name>/dist/*.d.ts
```

## 测试问题

### 测试失败

**症状**：vitest 测试不通过

**排查步骤**：

1. 查看详细错误
```bash
pnpm test --reporter=verbose
```

2. 运行单个测试文件
```bash
pnpm test --filter <package-name> -- src/tests/specific.test.ts
```

3. 检查测试环境配置
```bash
cat packages/<package-name>/vitest.config.ts
```

### 测试内存不足

**症状**：vitest 报内存溢出错误

**解决方案**：

1. 限制 worker 数量
```bash
pnpm test --maxWorkers=2
```

2. 在单个包目录运行测试
```bash
cd packages/<package-name>
pnpm test
```

3. 使用 `--pool=forks` 替代默认池
```bash
pnpm test --pool=forks
```

### DOM 测试失败

**症状**：`document is not defined`

**解决方案**：

确保 vitest 配置使用了 jsdom 环境：

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

## 响应式问题

### 组件不更新

**症状**：数据变化但视图不更新

**排查步骤**：

1. 确认使用了响应式 API
```typescript
// ✅ 正确
const count = signal(0);
count.value++;  // 使用 signal

// ❌ 错误
let count = 0;
count++;  // 普通变量不会触发更新
```

2. 检查 effect 依赖追踪
```typescript
// ✅ 正确：effect 会追踪 signal()
effect(() => {
  console.log(count.value);
});

// ❌ 错误：effect 不会追踪普通变量
const name = 'Alice';
effect(() => {
  console.log(name);  // 只执行一次
});
```

3. 检查 computed 依赖
```typescript
// ✅ 正确
const doubled = computed(() => count.value * 2);

// ❌ 错误：在 computed 中修改状态
const count = signal(0);
const doubled = computed(() => {
  count.value++;  // ❌ 不要在 computed 中修改状态
  return count.value * 2;
});
```

### 信号依赖追踪不生效

**症状**：effect 没有按预期执行

**排查步骤**：

1. 确认在 effect 中访问了信号
```typescript
// ✅ 正确
effect(() => {
  console.log(count.value);  // 追踪 count
});

// ❌ 错误：信号在 effect 外使用
const current = count.value;  // 不追踪
effect(() => {
  console.log(current);  // 不会响应 count 变化
});
```

2. 检查条件判断
```typescript
// ✅ 正确：确保信号在 effect 中被访问
effect(() => {
  if (count.value > 0) {  // 追踪 count
    console.log('count > 0');
  }
});
```

## 路由问题

### 路由不生效

**症状**：页面跳转到 404

**排查步骤**：

1. 确认路由配置正确
```typescript
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/users/:id', component: UserDetail },  // 动态路由
];
```

2. 检查 History 模式配置
```typescript
// ✅ Web History（需要服务器配置）
createWebHistory()

// ✅ Hash 模式（无需服务器配置）
createWebHashHistory()
```

3. 确认 Router 已挂载
```typescript
app.use(router);
app.mount('#app');
```

### 路由参数丢失

**症状**：路由参数无法获取

**排查步骤**：

1. 检查路由定义
```typescript
// ✅ 正确
{ path: '/user/:id', component: User }

// ❌ 错误
{ path: '/user/id', component: User }
```

2. 访问路由参数
```typescript
import { useRoute } from '@lytjs/router';

const route = useRoute();
const userId = route.params.id;  // 字符串类型
```

## 插件问题

### 插件加载失败

**症状**：`app.use(plugin)` 报错

**排查步骤**：

1. 确认插件格式正确
```typescript
// ✅ 正确
const plugin = {
  install(app, options) {
    // 插件逻辑
  },
};

app.use(plugin, { /* options */ });
```

2. 检查插件依赖
```typescript
// 在插件中检查选项
const plugin = {
  install(app, options) {
    if (!options) {
      throw new Error('Plugin requires options');
    }
  },
};
```

### 插件选项不生效

**症状**：插件配置没有生效

**排查步骤**：

1. 检查选项传递
```typescript
// ✅ 正确
app.use(myPlugin, {
  apiKey: 'xxx',
  debug: true,
});
```

2. 检查插件实现
```typescript
const plugin = {
  install(app, options) {
    const config = {
      apiKey: options?.apiKey,
      debug: options?.debug ?? false,
    };
  },
};
```

## 样式问题

### 样式不生效

**症状**：CSS 样式没有应用

**排查步骤**：

1. 确认样式文件已导入
```typescript
import '@lytjs/ui/dist/style.css';
```

2. 检查选择器优先级
```css
/* ✅ 提高优先级 */
.lyt-button.primary {
  background-color: blue;
}
```

3. 检查 CSS 模块配置
```typescript
// vite.config.ts
export default {
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
};
```

### 样式冲突

**症状**：多个组件样式相互影响

**解决方案**：

1. 使用 CSS Modules
```vue
<style module>
.button {
  /* 仅影响当前组件 */
}
</style>
```

2. 使用 BEM 命名
```css
.lyt-form__input--error {
  border-color: red;
}
```

3. 使用 scoped CSS
```vue
<style scoped>
.form-input {
  /* 仅影响当前组件 */
}
</style>
```

## 性能问题

### 首屏加载慢

**症状**：首次访问页面时间长

**排查步骤**：

1. 检查包体积
```bash
pnpm build
ls -lh dist/assets/*.js
```

2. 启用代码分割
```typescript
// ✅ 路由懒加载
const About = () => import('./views/About.vue');

// ✅ 组件懒加载
const HeavyComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
);
```

3. 启用压缩
```bash
# 确保生产构建使用压缩
pnpm build --mode production
```

### 内存泄漏

**症状**：长时间使用后页面变卡

**排查步骤**：

1. 检查未清理的 effect
```typescript
// ✅ 正确
const stop = effect(() => {
  subscribe(data);
});

onCleanup(() => {
  stop();
});
```

2. 检查未移除的事件监听
```typescript
// ✅ 正确
window.addEventListener('resize', handler);

onCleanup(() => {
  window.removeEventListener('resize', handler);
});
```

3. 检查未清理的定时器
```typescript
// ✅ 正确
const timer = setInterval(() => {
  update();
}, 1000);

onCleanup(() => {
  clearInterval(timer);
});
```

### 频繁重渲染

**症状**：组件频繁更新

**排查步骤**：

1. 检查是否创建了新对象
```typescript
// ✅ 正确：保持对象引用
const user = reactive({ name: 'Alice', age: 25 });
user.age++;

// ❌ 错误：创建新对象
const user = { name: 'Alice', age: 25 };
user = { ...user, age: 26 };  // 触发更新
```

2. 使用 computed 缓存
```typescript
// ✅ 正确
const fullName = computed(() => `${firstName()} ${lastName()}`);

// ❌ 错误：每次都重新计算
effect(() => {
  const full = `${firstName()} ${lastName()}`;
  display(full);
});
```

## DevTools 问题

### DevTools 无法连接

**症状**：浏览器 DevTools 面板看不到 LytJS

**排查步骤**：

1. 确认开发模式
```typescript
// 确保 __DEV__ 为 true
// 开发环境默认开启
```

2. 安装 DevTools 扩展
- Chrome: LytJS DevTools
- Firefox: LytJS DevTools

3. 检查扩展设置
- 确认扩展已启用
- 确认页面使用 LytJS

### 信号追踪不显示

**症状**：Signals 面板为空

**排查步骤**：

1. 确认使用响应式 API
```typescript
import { signal } from '@lytjs/reactivity';

const count = signal(0);
```

2. 确认在 effect 中使用信号
```typescript
effect(() => {
  console.log(count.value);  // 才会显示在追踪中
});
```

## 常见错误代码

| 错误代码 | 含义 | 解决方案 |
|---------|------|---------|
| `MODULE_NOT_FOUND` | 模块未找到 | 运行 `pnpm install` |
| `TYPE_ERROR` | 类型错误 | 检查类型定义 |
| `CANNOT_READ_PROPERTY` | 读取 undefined 属性 | 检查对象初始化 |
| `CIRCULAR_DEPENDENCY` | 循环依赖 | 检查 import 结构 |

## 获取帮助

如果以上排查步骤无法解决问题：

1. 查看 [GitHub Issues](https://gitee.com/lytjs/lytjs/issues)
2. 搜索类似问题的解决方案
3. 创建新的 Issue 并提供：
   - 环境信息（Node.js、pnpm 版本）
   - 复现步骤
   - 错误日志
   - 相关代码片段
