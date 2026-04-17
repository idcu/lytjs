# 模板语法

Lyt.js 使用基于原生 HTML 的增强模板语法，通过指令扩展 HTML 的能力。

## 文本插值

使用双大括号 `{{ }}` 进行文本插值：

```html
<span>消息: {{ message }}</span>
```

插值表达式支持 JavaScript 表达式：

```html
<span>{{ count + 1 }}</span>
<span>{{ ok ? '是' : '否' }}</span>
<span>{{ message.split('').reverse().join('') }}</span>
```

::: warning 注意
模板表达式会被沙箱化，不能访问用户定义的全局变量，仅能访问组件实例上的属性。
:::

## 条件渲染 v-if

根据条件决定是否渲染元素：

```html
<div v-if="type === 'A'">类型 A</div>
<div v-else-if="type === 'B'">类型 B</div>
<div v-else>其他类型</div>
```

## 列表渲染 v-each

遍历数组渲染列表：

```html
<ul>
  <li v-each="item in items">{{ item.name }}</li>
</ul>
```

也可以获取索引：

```html
<ul>
  <li v-each="(item, index) in items">
    {{ index }}: {{ item.name }}
  </li>
</ul>
```

遍历对象：

```html
<ul>
  <li v-each="(value, key) in obj">
    {{ key }}: {{ value }}
  </li>
</ul>
```

::: tip 提示
`v-each` 指令会自动进行高效的 DOM 复用，类似虚拟 DOM 的 diff 算法。
:::

## 属性绑定 v-bind

动态绑定 HTML 属性：

```html
<!-- 完整语法 -->
<img v-bind:src="imageSrc" v-bind:alt="imageAlt" />

<!-- 缩写 -->
<img :src="imageSrc" :alt="imageAlt" />

<!-- 绑定 class -->
<div :class="{ active: isActive, 'text-danger': hasError }"></div>
<div :class="[activeClass, errorClass]"></div>

<!-- 绑定 style -->
<div :style="{ color: textColor, fontSize: fontSize + 'px' }"></div>
```

## 事件绑定 v-on

监听 DOM 事件：

```html
<!-- 完整语法 -->
<button v-on:click="handleClick">点击</button>

<!-- 缩写 -->
<button @click="handleClick">点击</button>

<!-- 内联处理器 -->
<button @click="count++">+1</button>

<!-- 传递参数 -->
<button @click="say('hello')">打招呼</button>

<!-- 事件修饰符 -->
<form @submit.prevent="onSubmit">
  <input @keyup.enter="onEnter" />
</form>
```

## 双向绑定 v-bind:model

在表单元素上创建双向绑定：

```html
<!-- 文本输入 -->
<input v-bind:model="message" />
<p>{{ message }}</p>

<!-- 多行文本 -->
<textarea v-bind:model="content"></textarea>

<!-- 复选框 -->
<input type="checkbox" v-bind:model="checked" />

<!-- 单选按钮 -->
<input type="radio" value="one" v-bind:model="picked" />
<input type="radio" value="two" v-bind:model="picked" />

<!-- 下拉选择 -->
<select v-bind:model="selected">
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

::: info 说明
`v-bind:model` 是 Lyt.js 的双向绑定指令，底层通过 `v-bind` 和 `v-on` 组合实现。
:::

## 指令总结

| 指令 | 缩写 | 说明 |
|------|------|------|
| `v-if` / `v-else-if` / `v-else` | - | 条件渲染 |
| `v-each` | - | 列表渲染 |
| `v-bind` | `:` | 属性绑定 |
| `v-on` | `@` | 事件绑定 |
| `v-bind:model` | - | 双向绑定 |
| `v-once` | - | 只渲染一次 |
| `v-slot` | `#` | 插槽内容 |
