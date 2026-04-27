/**
 * Lyt.js 代码片段定义模块
 * 为 .lyt 文件提供常用代码片段补全
 */

import * as vscode from 'vscode';

// ============================================================
// 代码片段定义
// ============================================================

interface SnippetDefinition {
  prefix: string;
  label: string;
  description: string;
  body: string;
}

const snippetDefinitions: SnippetDefinition[] = [
  {
    prefix: 'lyt-component',
    label: 'Lyt.js Component',
    description: '完整组件模板',
    body: `<template>
  <div class="${1:component-name}">
    \${0}
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'lytjs';

// Props
const props = defineProps<{
  ${2:modelValue?: string}
}>();

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// Reactive state
const ${3:state} = ref<${4:string}>('');

// Computed
const ${5:computedValue} = computed(() => {
  return ${6:state.value};
});

// Methods
function ${7:handleClick}() {
  console.log('clicked');
}

// Lifecycle
onMounted(() => {
  console.log('${1:component-name} mounted');
});
</script>

<style scoped>
.${1:component-name} {
  /* styles */
}
</style>`,
  },
  {
    prefix: 'lyt-composition',
    label: 'Composition API Setup',
    description: 'Composition API setup 模板',
    body: `<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'lytjs';

// Reactive state
const ${1:count} = ref(0);
const ${2:state} = reactive({
  ${3:loading}: false,
  ${4:data}: [] as any[],
});

// Computed
const ${5:doubled} = computed(() => ${1:count}.value * 2);

// Watch
watch(${1:count}, (newVal, oldVal) => {
  console.log(\`\${1:count} changed from \${oldVal} to \${newVal}\`);
});

// Lifecycle
onMounted(() => {
  console.log('Component mounted');
});

onUnmounted(() => {
  console.log('Component unmounted');
});
</script>`,
  },
  {
    prefix: 'lyt-reactive',
    label: 'Reactive / Ref',
    description: 'reactive/ref 使用模板',
    body: `import { ref, reactive, toRefs, isRef, unref } from 'lytjs';

// ref - 基本类型响应式
const ${1:count} = ref<${2:number}>(0);
const ${3:name} = ref<${4:string}>('');

// reactive - 对象响应式
const ${5:state} = reactive({
  ${6:items}: [] as ${7:string}[],
  ${8:loading}: false,
  ${9:error}: null as string | null,
});

// toRefs - 解构响应式对象
const { ${6:items}, ${8:loading}, ${9:error} } = toRefs(${5:state});

// 修改值
${1:count}.value++;
${3:name}.value = 'hello';
${5:state}.${6:items}.push('new item');`,
  },
  {
    prefix: 'lyt-computed',
    label: 'Computed',
    description: 'computed 使用模板',
    body: `import { computed } from 'lytjs';

// 只读计算属性
const ${1:fullName} = computed(() => {
  return \`\${${2:firstName}.value} \${${3:lastName}.value}\`;
});

// 可写计算属性
const ${4:fullName} = computed({
  get() {
    return \`\${${2:firstName}.value} \${${3:lastName}.value}\`;
  },
  set(value: string) {
    const [first, last] = value.split(' ');
    ${2:firstName}.value = first || '';
    ${3:lastName}.value = last || '';
  },
});`,
  },
  {
    prefix: 'lyt-watch',
    label: 'Watch',
    description: 'watch 使用模板',
    body: `import { watch, watchEffect } from 'lytjs';

// 监听单个 ref
watch(${1:sourceRef}, (newVal, oldVal) => {
  console.log('changed:', oldVal, '->', newVal);
});

// 监听多个源
watch([${2:source1}, ${3:source2}], ([new1, new2], [old1, old2]) => {
  console.log('multiple sources changed');
});

// 带配置选项
watch(${4:source}, (newVal, oldVal) => {
  // handler
}, {
  immediate: true,
  deep: true,
  flush: 'pre', // 'pre' | 'post' | 'sync'
});

// watchEffect - 自动追踪依赖
watchEffect(() => {
  console.log(${5:source}.value);
});

// 停止监听
const stop = watch(${6:source}, () => {});
// stop();`,
  },
  {
    prefix: 'lyt-lifecycle',
    label: 'Lifecycle Hooks',
    description: '生命周期钩子模板',
    body: `import {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onErrorCaptured,
  onActivated,
  onDeactivated,
} from 'lytjs';

onBeforeMount(() => {
  console.log('Component is about to mount');
});

onMounted(() => {
  console.log('Component is mounted');
  // DOM 可用，发起请求等
});

onBeforeUpdate(() => {
  console.log('Component is about to update');
});

onUpdated(() => {
  console.log('Component is updated');
});

onBeforeUnmount(() => {
  console.log('Component is about to unmount');
});

onUnmounted(() => {
  console.log('Component is unmounted');
  // 清理副作用：定时器、事件监听等
});

onErrorCaptured((err, instance, info) => {
  console.error('Error captured:', err, info);
  return false; // 阻止错误继续向上传播
});

onActivated(() => {
  console.log('KeepAlive component activated');
});

onDeactivated(() => {
  console.log('KeepAlive component deactivated');
});`,
  },
  {
    prefix: 'lyt-if',
    label: 'Conditional Rendering',
    description: '条件渲染',
    body: `<!-- v-if / v-else-if / v-else -->
<div v-if="${1:condition}">
  ${2:Content when condition is true}
</div>
<div v-else-if="${3:otherCondition}">
  ${4:Content when otherCondition is true}
</div>
<div v-else>
  ${5:Content when all conditions are false}
</div>

<!-- v-show (CSS display toggle) -->
<div v-show="${6:isVisible}">
  ${7:Toggle visible content}
</div>`,
  },
  {
    prefix: 'lyt-each',
    label: 'List Rendering',
    description: '列表渲染',
    body: `<!-- 遍历数组 -->
<ul>
  <li v-each="(item, index) in ${1:items}" :key="item.${2:id}">
    {{ index }}: {{ item.${3:name} }}
  </li>
</ul>

<!-- 遍历对象 -->
<div v-each="(value, key, index) in ${4:object}" :key="key">
  {{ key }}: {{ value }}
</div>

<!-- 遍历数字范围 -->
<span v-each="n in ${5:10}" :key="n">
  {{ n }}
</span>`,
  },
  {
    prefix: 'lyt-model',
    label: 'Two-way Binding',
    description: '双向绑定',
    body: `<!-- 文本输入 -->
<input v-model="${1:message}" type="text" placeholder="edit me" />

<!-- 多行文本 -->
<textarea v-model="${2:message}"></textarea>

<!-- 复选框 -->
<input type="checkbox" v-model="${3:checked}" />

<!-- 多个复选框 -->
<input type="checkbox" value="${4:Jack}" v-model="${5:checkedNames}" />
<input type="checkbox" value="${6:John}" v-model="${5:checkedNames}" />

<!-- 单选按钮 -->
<input type="radio" value="${7:one}" v-model="${8:picked}" />
<input type="radio" value="${9:two}" v-model="${8:picked}" />

<!-- 选择框 -->
<select v-model="${10:selected}">
  <option disabled value="">Please select one</option>
  <option>${11:A}</option>
  <option>${12:B}</option>
  <option>${13:C}</option>
</select>

<!-- 修饰符 -->
<input v-model.trim="${14:msg}" />
<input v-model.number="${15:age}" type="number" />
<input v-model.lazy="${16:msg}" />`,
  },
  {
    prefix: 'lyt-event',
    label: 'Event Handling',
    description: '事件处理',
    body: `<!-- 内联事件处理器 -->
<button @click="${1:count}++">Increment</button>

<!-- 方法事件处理器 -->
<button @click="${2:handleClick}">Click me</button>

<!-- 内联方法调用 -->
<button @click="${3:handleClick}($event, ${4:arg})">Click with args</button>

<!-- 事件修饰符 -->
<form @submit.prevent="${5:onSubmit}">
  <button type="submit">Submit</button>
</form>

<!-- 按键修饰符 -->
<input @keyup.enter="${6:onEnter}" />
<input @keyup.esc="${7:onEscape}" />

<!-- 鼠标修饰符 -->
<div @click.left="${8:onClickLeft}">Left click</div>
<div @click.right.prevent="${9:onClickRight}">Right click</div>

<!-- 自定义事件 -->
<${10:child-component}
  @${11:custom-event}="${12:handleCustomEvent}"
  @${13:update:modelValue}="${14:newVal} = $event"
/>`,
  },
  {
    prefix: 'lyt-slot',
    label: 'Slot',
    description: '插槽',
    body: `<!-- 默认插槽 -->
<slot>
  ${1:Default content}
</slot>

<!-- 具名插槽 -->
<slot name="${2:header}">
  ${3:Default header content}
</slot>
<slot name="${4:footer}">
  ${5:Default footer content}
</slot>

<!-- 作用域插槽 -->
<slot :${6:item}="${7:item}" :${8:index}="${9:index}">
  {{ ${7:item}.${10:name} }}
</slot>

<!-- 使用具名插槽 -->
<${11:child-component}>
  <template #${2:header}>
    <h1>${12:Header content}</h1>
  </template>

  <template #${4:footer}>
    <p>${13:Footer content}</p>
  </template>

  <!-- 默认内容 -->
  ${14:Default slot content}
</${11:child-component}>

<!-- 使用作用域插槽 -->
<${15:list-component}>
  <template #default="{ ${6:item}, ${8:index} }">
    <div>{{ ${8:index} }}: {{ ${6:item}.${10:name} }}</div>
  </template>
</${15:list-component}>`,
  },
  {
    prefix: 'lyt-props',
    label: 'Props Definition',
    description: 'Props 定义',
    body: `// TypeScript 方式定义 Props
const props = defineProps<{
  /** 标题文本 */
  title: string;
  /** 数量 */
  count?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 列表数据 */
  items?: string[];
  /** 回调函数 */
  onChange?: (value: string) => void;
}>();

// 带默认值的 Props
const props = withDefaults(defineProps<{
  title: string;
  count?: number;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}>(), {
  count: 0,
  disabled: false,
  theme: 'light',
});

// 使用 props
console.log(props.title);
console.log(props.count);`,
  },
  {
    prefix: 'lyt-emits',
    label: 'Emits Definition',
    description: 'Emits 定义',
    body: `// TypeScript 方式定义 Emits
const emit = defineEmits<{
  (e: 'change', value: string): void;
  (e: 'update', id: number, value: string): void;
  (e: 'delete', id: number): void;
  (e: 'submit', payload: { name: string; age: number }): void;
}>();

// 触发事件
emit('change', '${1:new value}');
emit('update', ${2:1}, '${3:updated}');
emit('delete', ${4:id});
emit('submit', { name: '${5:foo}', age: ${6:20} });

// 在模板中使用
// <${7:child-component} @change="handleChange" @submit="handleSubmit" />`,
  },
  {
    prefix: 'lyt-store',
    label: 'Store',
    description: 'Store 使用模板',
    body: `import { defineStore } from 'lytjs/store';

// 定义 Store
export const use${1:Counter}Store = defineStore('${2:counter}', () => {
  // State
  const ${3:count} = ref(0);
  const ${4:name} = ref('${5:Ly t.js}');

  // Getters
  const ${6:doubledCount} = computed(() => ${3:count}.value * 2);

  // Actions
  function increment() {
    ${3:count}.value++;
  }

  function decrement() {
    ${3:count}.value--;
  }

  function reset() {
    ${3:count}.value = 0;
    ${4:name}.value = '${5:Ly t.js}';
  }

  async function fetch${7:Data}() {
    const response = await fetch('/api/${8:data}');
    return response.json();
  }

  return {
    ${3:count},
    ${4:name},
    ${6:doubledCount},
    increment,
    decrement,
    reset,
    fetch${7:Data},
  };
});

// 在组件中使用
// const store = use${1:Counter}Store();
// store.increment();
// console.log(store.${6:doubledCount});`,
  },
  {
    prefix: 'lyt-router',
    label: 'Router',
    description: 'Router 使用模板',
    body: `import { useRouter, useRoute, onBeforeRouteLeave, onBeforeRouteUpdate } from 'lytjs/router';

const router = useRouter();
const route = useRoute();

// 编程式导航
router.push('${1:/path}');
router.push({ name: '${2:routeName}', params: { id: ${3:1} } });
router.push({ path: '${1:/path}', query: { foo: '${4:bar}' } });
router.replace('${1:/path}');
router.go(-1);
router.back();
router.forward();

// 获取路由参数
const ${5:id} = route.params.id;
const ${6:query} = route.query.search;

// 路由守卫
onBeforeRouteLeave((to, from, next) => {
  const answer = window.confirm('Do you really want to leave?');
  if (answer) {
    next();
  } else {
    next(false);
  }
});

onBeforeRouteUpdate((to, from, next) => {
  // 路由参数变化时
  next();
});

// 模板中使用
// <router-link to="${1:/path}">${7:Link}</router-link>
// <router-view />`,
  },
];

// ============================================================
// 导出函数
// ============================================================

/**
 * 获取所有代码片段的 SnippetString 数组
 */
export function getSnippets(): vscode.SnippetString[] {
  return snippetDefinitions.map(
    (def) => new vscode.SnippetString(def.body)
  );
}

/**
 * 获取所有代码片段的 CompletionItem 数组
 */
export function getSnippetCompletions(): vscode.CompletionItem[] {
  return snippetDefinitions.map((def) => {
    const item = new vscode.CompletionItem(
      def.label,
      vscode.CompletionItemKind.Snippet
    );
    item.insertText = new vscode.SnippetString(def.body);
    item.detail = def.description;
    item.documentation = new vscode.MarkdownString(
      `**${def.label}**\n\n${def.description}\n\nPrefix: \`${def.prefix}\``
    );
    item.filterText = def.prefix;
    item.sortText = `0_${def.prefix}`;
    return item;
  });
}
