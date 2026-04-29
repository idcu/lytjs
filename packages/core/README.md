# @lytjs/core

LytJS 核心入口 -- createApp、h、defineComponent、插件系统。

## 安装

```bash
pnpm add @lytjs/core
```

## 使用

```typescript
import { createApp, h, defineComponent } from '@lytjs/core';

const App = defineComponent({
  props: { msg: String },
  render() {
    return h('div', null, this.msg);
  },
});

createApp(App, { msg: 'Hello LytJS!' }).mount('#app');
```

## API

| API | 说明 |
|-----|------|
| `createApp()` | 创建应用实例 |
| `h()` | 创建 VNode |
| `defineComponent()` | 定义组件 |
| `defineAsyncComponent()` | 定义异步组件 |
| `nextTick()` | 下一个 tick |
| `onMounted()` | 注册挂载后钩子 |
| `onUnmounted()` | 注册卸载后钩子 |

## License

MIT
