# 计数器示例

一个简单的计数器应用，演示 `ref` 和 `reactive` 的基本用法。

## 效果预览

点击按钮可以增加或减少计数器的值，支持自定义步长。

## 完整代码

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Lyt.js 计数器</title>
  <script src="https://unpkg.com/lyt/dist/lyt.global.js"></script>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; padding-top: 40px; }
    .counter { text-align: center; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; }
    .count { font-size: 48px; font-weight: bold; margin: 16px 0; }
    button { padding: 8px 20px; margin: 0 4px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-primary:hover { background: #6366f1; }
    .btn-danger { background: #ef4444; color: white; }
    .btn-danger:hover { background: #f87171; }
    .btn-secondary { background: #f3f4f6; color: #374151; }
    .btn-secondary:hover { background: #e5e7eb; }
    .step { margin-top: 12px; }
    .step input { width: 60px; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; text-align: center; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    const { createApp, ref, computed, watch } = Lyt

    const app = createApp({
      state() {
        return {
          count: ref(0),
          step: ref(1)
        }
      },

      computed: {
        doubleCount: {
          get() { return this.count.value * 2 }
        }
      },

      watch: {
        count: {
          handler(newVal, oldVal) {
            console.log(`计数从 ${oldVal} 变为 ${newVal}`)
          }
        }
      },

      methods: {
        increment() {
          this.count.value += this.step.value
        },
        decrement() {
          this.count.value -= this.step.value
        },
        reset() {
          this.count.value = 0
        }
      },

      template: `
        <div class="counter">
          <h2>Lyt.js 计数器</h2>
          <div class="count">{{ count }}</div>
          <p>双倍值: {{ doubleCount }}</p>
          <div>
            <button class="btn-danger" @click="decrement">- {{ step }}</button>
            <button class="btn-secondary" @click="reset">重置</button>
            <button class="btn-primary" @click="increment">+ {{ step }}</button>
          </div>
          <div class="step">
            <label>步长: </label>
            <input type="number" v-bind:model="step" min="1" max="10" />
          </div>
        </div>
      `
    })

    app.mount('#app')
  </script>
</body>
</html>
```

## 代码解析

### 1. 使用 ref 创建响应式数据

```ts
state() {
  return {
    count: ref(0),   // 计数值
    step: ref(1)     // 步长
  }
}
```

`ref()` 将基本类型值包装为响应式引用，通过 `.value` 访问和修改。

### 2. 使用 computed 创建计算属性

```ts
computed: {
  doubleCount: {
    get() { return this.count.value * 2 }
  }
}
```

计算属性自动追踪依赖，当 `count` 变化时自动更新。

### 3. 使用 watch 侦听变化

```ts
watch: {
  count: {
    handler(newVal, oldVal) {
      console.log(`计数从 ${oldVal} 变为 ${newVal}`)
    }
  }
}
```

当 `count` 变化时，自动打印新旧值。

### 4. 模板语法

- `{{ count }}` — 文本插值
- `@click="increment"` — 事件绑定
- `v-bind:model="step"` — 双向绑定

::: tip
这个示例展示了 Lyt.js 响应式系统的核心功能。更多用法请参阅 [响应式系统](/guide/reactivity)。
:::
