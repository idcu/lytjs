# Template Syntax

Lyt.js uses an enhanced template syntax based on native HTML, extending HTML's capabilities through directives.

Lyt.js supports two syntax styles:
1. **Vue-compatible syntax with `v-` prefix** (e.g., `v-if`, `v-each`)
2. **Shorthand syntax without `v-` prefix** (e.g., `if`, `each`)

Both syntaxes are functionally equivalent. You can choose whichever you prefer.

## Text Interpolation

Use double curly braces `{{ }}` for text interpolation:

```html
<span>Message: {{ message }}</span>
```

Interpolation expressions support JavaScript expressions:

```html
<span>{{ count + 1 }}</span>
<span>{{ ok ? 'Yes' : 'No' }}</span>
<span>{{ message.split('').reverse().join('') }}</span>
```

::: warning Note
Template expressions are sandboxed and cannot access user-defined global variables. They can only access properties on the component instance.
:::

## Conditional Rendering

Render elements based on conditions:

**Shorthand syntax (recommended):**
```html
<div if="type === 'A'">Type A</div>
<div if="type === 'B'" else-if>Type B</div>
<div if>Other Type</div>
```

**Vue-compatible syntax:**
```html
<div v-if="type === 'A'">Type A</div>
<div v-else-if="type === 'B'">Type B</div>
<div v-else>Other Type</div>
```

## List Rendering

Iterate over arrays to render lists:

**Shorthand syntax (recommended):**
```html
<ul>
  <li each="item in items">{{ item.name }}</li>
</ul>
```

**Vue-compatible syntax:**
```html
<ul>
  <li v-each="item in items">{{ item.name }}</li>
</ul>
```

You can also get the index:

**Shorthand syntax (recommended):**
```html
<ul>
  <li each="(item, index) in items">
    {{ index }}: {{ item.name }}
  </li>
</ul>
```

**Vue-compatible syntax:**
```html
<ul>
  <li v-each="(item, index) in items">
    {{ index }}: {{ item.name }}
  </li>
</ul>
```

Iterating over objects:

**Shorthand syntax (recommended):**
```html
<ul>
  <li each="(value, key) in obj">
    {{ key }}: {{ value }}
  </li>
</ul>
```

**Vue-compatible syntax:**
```html
<ul>
  <li v-each="(value, key) in obj">
    {{ key }}: {{ value }}
  </li>
</ul>
```

::: tip
The `each` / `v-each` directive automatically performs efficient DOM reuse, similar to a virtual DOM diff algorithm.
:::

## Attribute Binding

Dynamically bind HTML attributes:

**Shorthand syntax (recommended):**
```html
<!-- Shorthand form -->
<img :src="imageSrc" :alt="imageAlt" />

<!-- Full form -->
<img bind="src" :imageSrc bind="alt" :imageAlt />
```

**Vue-compatible syntax:**
```html
<!-- Full syntax -->
<img v-bind:src="imageSrc" v-bind:alt="imageAlt" />

<!-- Shorthand form -->
<img :src="imageSrc" :alt="imageAlt" />
```

**Binding class:**
```html
<div :class="{ active: isActive, 'text-danger': hasError }"></div>
<div :class="[activeClass, errorClass]"></div>
```

**Binding style:**
```html
<div :style="{ color: textColor, fontSize: fontSize + 'px' }"></div>
```

## Event Binding

Listen to DOM events:

**Shorthand syntax (recommended):**
```html
<!-- Shorthand form -->
<button @click="handleClick">Click</button>

<!-- Full form -->
<button on="click"="handleClick">Click</button>
```

**Vue-compatible syntax:**
```html
<!-- Full syntax -->
<button v-on:click="handleClick">Click</button>

<!-- Shorthand form -->
<button @click="handleClick">Click</button>
```

**Inline handlers:**
```html
<button @click="count++">+1</button>
```

**Passing arguments:**
```html
<button @click="say('hello')">Greet</button>
```

**Event modifiers:**
```html
<form @submit.prevent="onSubmit">
  <input @keyup.enter="onEnter" />
</form>
```

## Two-way Binding

Create two-way bindings on form elements:

**Shorthand syntax (recommended):**
```html
<!-- Text input -->
<input :model="message" />
<p>{{ message }}</p>

<!-- Multi-line text -->
<textarea :model="content"></textarea>

<!-- Checkbox -->
<input type="checkbox" :model="checked" />

<!-- Radio buttons -->
<input type="radio" value="one" :model="picked" />
<input type="radio" value="two" :model="picked" />

<!-- Dropdown select -->
<select :model="selected">
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

**Vue-compatible syntax:**
```html
<!-- Text input -->
<input v-bind:model="message" />
<p>{{ message }}</p>

<!-- Multi-line text -->
<textarea v-bind:model="content"></textarea>

<!-- Checkbox -->
<input type="checkbox" v-bind:model="checked" />

<!-- Radio buttons -->
<input type="radio" value="one" v-bind:model="picked" />
<input type="radio" value="two" v-bind:model="picked" />

<!-- Dropdown select -->
<select v-bind:model="selected">
  <option value="a">A</option>
  <option value="b">B</option>
</select>
```

::: info
`:model` / `v-bind:model` is Lyt.js's two-way binding directive, implemented internally through a combination of `:bind` and `:on`.
:::

## Slots

Using slot content:

**Shorthand syntax (recommended):**
```html
<!-- Named slot -->
<template slot="header">
  Header content
</template>

<!-- Shorthand form -->
<template #header>
  Header content
</template>
```

**Vue-compatible syntax:**
```html
<!-- Named slot -->
<template v-slot:header>
  Header content
</template>

<!-- Shorthand form -->
<template #header>
  Header content
</template>
```

## Directive Summary

| Shorthand Syntax | Vue-Compatible Syntax | Abbreviation | Description |
|-----------------|----------------------|--------------|-------------|
| `if` / `if else-if` / `if else` | `v-if` / `v-else-if` / `v-else` | - | Conditional rendering |
| `each` | `v-each` | - | List rendering |
| `bind` | `v-bind` | `:` | Attribute binding |
| `on` | `v-on` | `@` | Event binding |
| `:model` | `v-bind:model` | - | Two-way binding |
| `ref` | `v-ref` | - | Reference |
| `slot` | `v-slot` | `#` | Slot content |
