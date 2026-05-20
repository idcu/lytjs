# 内置组件

LytJS 提供了一系列内置组件，用于处理常见的 UI 模式，如缓存、异步加载、传送、过渡动画和错误处理。

## KeepAlive

`<KeepAlive>` 用于缓存组件实例，避免重复创建和销毁，提升性能。

### 基本用法

```html
<template>
  <button @click="current = current === 'A' ? 'B' : 'A'">切换</button>

  <KeepAlive>
    <component :is="current" />
  </KeepAlive>
</template>
```

### include / exclude

通过 `include` 和 `exclude` 控制哪些组件被缓存，支持字符串、正则表达式和数组。

```html
<template>
  <!-- 字符串：匹配组件的 name 选项 -->
  <KeepAlive include="ComponentA,ComponentB">
    <component :is="current" />
  </KeepAlive>

  <!-- 正则表达式 -->
  <KeepAlive :include="/^Component[AB]/">
    <component :is="current" />
  </KeepAlive>

  <!-- 数组 -->
  <KeepAlive :include="['ComponentA', 'ComponentB']">
    <component :is="current" />
  </KeepAlive>

  <!-- exclude：排除指定组件 -->
  <KeepAlive exclude="ComponentC">
    <component :is="current" />
  </KeepAlive>
</template>
```

### max

`max` 限制最多缓存多少个组件实例。超出时，最久未访问的缓存组件会被销毁（LRU 策略）。

```html
<template>
  <!-- 最多缓存 5 个组件实例 -->
  <KeepAlive :max="5">
    <component :is="current" />
  </KeepAlive>
</template>
```

### 缓存策略

LytJS 的 `<KeepAlive>` 使用 **LRU（最近最少使用）** 缓存策略：

1. 当缓存数量未达到 `max` 时，新组件直接加入缓存
2. 当缓存数量达到 `max` 时，最久未被激活的组件会被销毁
3. 组件被重新激活时，会更新其在缓存中的位置

### 生命周期

被 `<KeepAlive>` 包裹的组件会额外触发 `activated` 和 `deactivated` 钩子：

```typescript
const MyComponent = {
  name: 'MyComponent',
  data() {
    return { savedScrollPosition: 0 };
  },
  activated() {
    // 组件被激活时恢复状态
    window.scrollTo(0, this.savedScrollPosition);
  },
  deactivated() {
    // 组件被停用时保存状态
    this.savedScrollPosition = window.scrollY;
  },
};
```

## Suspense

`<Suspense>` 用于协调异步依赖，在等待异步组件或异步 `setup` 完成时显示降级内容。

### 等待异步组件

```html
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <div>加载中...</div>
    </template>
  </Suspense>
</template>
```

### 异步 setup

组件的 `setup` 函数可以是异步的，`<Suspense>` 会等待 Promise resolve：

```typescript
const UserProfile = {
  async setup() {
    const user = await fetchUser();
    return { user };
  },
  template: `
    <div>
      <h1>{{ user.name }}</h1>
      <p>{{ user.email }}</p>
    </div>
  `,
};
```

### 嵌套 Suspense

`<Suspense>` 支持嵌套，内层 Suspense 可以独立控制加载状态：

```html
<template>
  <Suspense>
    <template #default>
      <div>
        <h1>页面标题</h1>
        <!-- 内层 Suspense 独立控制加载 -->
        <Suspense>
          <template #default>
            <AsyncSidebar />
          </template>
          <template #fallback>
            <div>侧边栏加载中...</div>
          </template>
        </Suspense>

        <Suspense>
          <template #default>
            <AsyncContent />
          </template>
          <template #fallback>
            <div>内容加载中...</div>
          </template>
        </Suspense>
      </div>
    </template>
    <template #fallback>
      <div>页面加载中...</div>
    </template>
  </Suspense>
</template>
```

### 错误处理

结合 `onErrorCaptured` 处理异步加载失败：

```html
<template>
  <Suspense @error="handleError">
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <div>加载中...</div>
    </template>
  </Suspense>
</template>

<script>
  export default {
    methods: {
      handleError(error) {
        console.error('加载失败:', error);
        // 可以在此处显示错误提示或重试按钮
      },
    },
  };
</script>
```

## Teleport

`<Teleport>` 将组件的一部分模板传送到 DOM 中的其他位置。

### 基本用法

```html
<template>
  <div class="modal-container">
    <button @click="showModal = true">打开弹窗</button>

    <!-- 将弹窗传送到 body 下 -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay">
        <div class="modal">
          <h2>弹窗标题</h2>
          <p>弹窗内容</p>
          <button @click="showModal = false">关闭</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
```

### 目标选择器

`to` 属性支持 CSS 选择器或 DOM 元素：

```html
<template>
  <!-- 传送到指定 ID 的元素 -->
  <Teleport to="#modal-root">
    <div class="modal">内容</div>
  </Teleport>

  <!-- 传送到 body -->
  <Teleport to="body">
    <div class="notification">通知</div>
  </Teleport>

  <!-- 传送到 class 匹配的元素 -->
  <Teleport to=".sidebar-container">
    <Sidebar />
  </Teleport>
</template>
```

### 禁用 Teleport

`disabled` 属性可以临时禁用传送，内容将留在原位：

```html
<template>
  <Teleport to="body" :disabled="isMobile">
    <div class="popup">弹出内容</div>
  </Teleport>
</template>
```

### 多个 Teleport 共享目标

多个 `<Teleport>` 可以传送到同一个目标元素：

```html
<template>
  <Teleport to="#notifications">
    <Notification v-for="n in notifications" :key="n.id" :notification="n" />
  </Teleport>
</template>
```

## Transition / TransitionGroup

`<Transition>` 和 `<TransitionGroup>` 用于在元素或组件进入/离开 DOM 时应用过渡动画。

### Transition 基本用法

```html
<template>
  <button @click="show = !show">切换</button>

  <Transition name="fade">
    <p v-if="show">Hello LytJS</p>
  </Transition>
</template>

<style>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.3s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
```

### CSS 过渡类名

`<Transition>` 会在不同阶段应用以下 CSS 类：

| 类名             | 说明               |
| ---------------- | ------------------ |
| `v-enter-from`   | 进入动画的起始状态 |
| `v-enter-active` | 进入动画的激活状态 |
| `v-enter-to`     | 进入动画的结束状态 |
| `v-leave-from`   | 离开动画的起始状态 |
| `v-leave-active` | 离开动画的激活状态 |
| `v-leave-to`     | 离开动画的结束状态 |

使用 `name` 属性替换 `v-` 前缀：

```css
/* name="slide" */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from {
  transform: translateX(-100%);
}
.slide-leave-to {
  transform: translateX(100%);
}
```

### JavaScript 钩子

使用 JavaScript 控制过渡动画：

```html
<template>
  <Transition
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @before-leave="onBeforeLeave"
    @leave="onLeave"
    @after-leave="onAfterLeave"
  >
    <div v-if="show">动画元素</div>
  </Transition>
</template>

<script>
  export default {
    methods: {
      onBeforeEnter(el) {
        el.style.opacity = 0;
      },
      onEnter(el, done) {
        // 使用 Web Animations API
        const animation = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 300,
        });
        animation.onfinish = done;
      },
      onAfterEnter(el) {
        console.log('进入完成');
      },
      onBeforeLeave(el) {
        el.style.opacity = 1;
      },
      onLeave(el, done) {
        const animation = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 300,
        });
        animation.onfinish = done;
      },
      onAfterLeave(el) {
        console.log('离开完成');
      },
    },
  };
</script>
```

### TransitionGroup 列表动画

`<TransitionGroup>` 用于列表中元素的过渡动画：

```html
<template>
  <TransitionGroup name="list" tag="ul">
    <li v-for="item in items" :key="item.id">
      {{ item.text }}
      <button @click="remove(item.id)">删除</button>
    </li>
  </TransitionGroup>
</template>

<style>
  .list-enter-active,
  .list-leave-active {
    transition: all 0.3s ease;
  }
  .list-enter-from {
    opacity: 0;
    transform: translateX(-30px);
  }
  .list-leave-to {
    opacity: 0;
    transform: translateX(30px);
  }
  .list-move {
    transition: transform 0.3s ease;
  }
</style>
```

### 初始渲染过渡

使用 `appear` 属性在组件首次渲染时也应用过渡：

```html
<template>
  <Transition name="fade" appear>
    <div>初始渲染也有过渡效果</div>
  </Transition>
</template>
```

### 过渡模式

当两个元素切换时，使用 `mode` 控制过渡行为：

```html
<template>
  <!-- out-in：当前元素先离开，新元素再进入（默认推荐） -->
  <Transition name="fade" mode="out-in">
    <component :is="current" />
  </Transition>

  <!-- in-out：新元素先进入，当前元素再离开 -->
  <Transition name="fade" mode="in-out">
    <component :is="current" />
  </Transition>
</template>
```

## ErrorBoundary

`<ErrorBoundary>` 捕获子组件树中的 JavaScript 错误，显示降级 UI 而非让整个应用崩溃。

### 基本用法

```html
<template>
  <ErrorBoundary @error="handleError">
    <template #default>
      <ProblematicComponent />
    </template>
    <template #fallback="{ error, reset }">
      <div class="error-fallback">
        <h3>出错了</h3>
        <p>{{ error.message }}</p>
        <button @click="reset">重试</button>
      </div>
    </template>
  </ErrorBoundary>
</template>

<script>
  export default {
    methods: {
      handleError(error) {
        console.error('捕获到错误:', error);
        // 可以将错误上报到监控服务
      },
    },
  };
</script>
```

### 错误传播

`<ErrorBoundary>` 可以嵌套使用，内层的 ErrorBoundary 会优先捕获错误：

```html
<template>
  <!-- 外层 ErrorBoundary -->
  <ErrorBoundary>
    <template #fallback="{ error }">
      <div>页面级错误: {{ error.message }}</div>
    </template>

    <div>
      <h1>应用内容</h1>

      <!-- 内层 ErrorBoundary -->
      <ErrorBoundary>
        <template #fallback="{ error, reset }">
          <div>组件级错误: {{ error.message }}</div>
          <button @click="reset">重试</button>
        </template>

        <WidgetComponent />
      </ErrorBoundary>
    </div>
  </ErrorBoundary>
</template>
```

### Props

| Prop        | 类型     | 默认值 | 说明                             |
| ----------- | -------- | ------ | -------------------------------- |
| `maxErrors` | `number` | `5`    | 最大错误捕获次数，超过后不再捕获 |
| `scope`     | `string` | -      | 错误范围标识，用于错误分类       |

```html
<template>
  <ErrorBoundary :max-errors="3" scope="payment-widget">
    <PaymentWidget />
    <template #fallback="{ error, reset }">
      <div>支付组件出错，请重试</div>
      <button @click="reset">重试</button>
    </template>
  </ErrorBoundary>
</template>
```
