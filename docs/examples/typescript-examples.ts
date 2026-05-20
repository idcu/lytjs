/**
 * LytJS TypeScript 使用示例
 * 展示如何在 LytJS 项目中使用类型安全特性
 */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-function-type, no-console */

import { signal, computed, effect, defineComponent, h, createApp } from '@lytjs/core';

import type {
  ComponentPublicInstance,
  Maybe,
  MaybeArray,
  Nullable,
  Optional,
  Prettify,
  DeepPartial,
  Override,
  Dictionary,
  Primitive,
  Nullish,
  PromiseOrValue,
  AsyncFunction,
  ArrayElement,
  Constructor,
  MarkRequired,
  MarkOptional,
  MarkNonNullable,
  MarkNullable,
  ExtractKeysByType,
  PickByType,
  OmitByType,
  FunctionKeys,
  NonFunctionKeys,
  ValueOf,
  First,
  Last,
} from '@lytjs/shared-types';

// =======================================
// 示例 1: 基础类型使用
// =======================================

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
}

// 使用 Maybe 类型 - 可能为 null/undefined
function getUser(id: number): Maybe<User> {
  // ...
  return null;
}

// 使用 MaybeArray - 单个或多个
function setTags(tags: MaybeArray<string>): void {
  const tagArray = Array.isArray(tags) ? tags : [tags];
  console.log(tagArray);
}

// 使用 Nullish 检查
function isNotNullish<T>(value: T): value is Exclude<T, Nullish> {
  return value != null;
}

// =======================================
// 示例 2: 组件类型安全
// =======================================

interface ButtonProps {
  text: string;
  size?: 'small' | 'medium' | 'large';
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

interface ButtonEmits {
  click: () => void;
  hover: () => void;
}

// 使用 defineComponent 类型安全
const Button = defineComponent<ButtonProps, ButtonEmits>({
  name: 'Button',

  props: {
    text: { type: String, required: true },
    size: { type: String, default: 'medium' },
    onClick: { type: Function, required: true },
    disabled: Boolean,
    variant: { type: String, default: 'primary' },
  },

  emits: ['click', 'hover'],

  setup(props, { emit }) {
    // props 自动类型安全
    console.log(props.text);
    console.log(props.size);

    // emit 自动类型安全
    const handleClick = () => {
      emit('click');
    };

    const handleMouseEnter = () => {
      emit('hover');
    };

    return {
      handleClick,
      handleMouseEnter,
    };
  },

  render(props) {
    return h(
      'button',
      {
        class: ['button', `button-${props.variant}`, `button-${props.size}`],
        disabled: props.disabled,
        onClick: () => props.onClick(),
      },
      props.text,
    );
  },
});

// =======================================
// 示例 3: 响应式类型安全
// =======================================

interface Todo {
  id: number;
  text: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
}

function useTodoStore() {
  // Signal 自动类型推断
  const todos = signal<Todo[]>([{ id: 1, text: '学习 LytJS', done: false, priority: 'high' }]);

  // Computed 自动类型推断
  const completedCount = computed(() => todos.value.filter((todo) => todo.done).length);

  const remainingCount = computed(() => todos.value.length - completedCount.value);

  const highPriorityTodos = computed(() => todos.value.filter((todo) => todo.priority === 'high'));

  // Action 类型安全
  const addTodo = (text: string, priority: Todo['priority'] = 'medium') => {
    const newTodo: Todo = {
      id: Date.now(),
      text,
      done: false,
      priority,
    };
    todos.value = [...todos.value, newTodo];
  };

  const toggleTodo = (id: number) => {
    todos.value = todos.value.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo,
    );
  };

  const deleteTodo = (id: number) => {
    todos.value = todos.value.filter((todo) => todo.id !== id);
  };

  return {
    todos,
    completedCount,
    remainingCount,
    highPriorityTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
}

// =======================================
// 示例 4: 类型工具使用
// =======================================

// 使用 Prettify - 展开类型
type ComplexUser = {
  id: number;
  name: string;
  details: {
    address: string;
    phone: string;
  };
};

type PrettyUser = Prettify<ComplexUser>;

// 使用 MarkRequired/MakeOptional
interface PartialConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  debug?: boolean;
}

type RequiredConfig = MarkRequired<PartialConfig, 'apiKey' | 'baseUrl'>;
// { apiKey: string; baseUrl: string; timeout?: number; debug?: boolean; }

type OptionalConfig = MarkOptional<PartialConfig, 'timeout' | 'debug'>;

// 使用 DeepPartial - 深度部分类型
interface DeepConfig {
  server: {
    host: string;
    port: number;
  };
  client: {
    timeout: number;
  };
}

type PartialDeepConfig = DeepPartial<DeepConfig>;

// 使用 Override - 覆盖类型
interface Original {
  id: number;
  name: string;
}

interface Overrides {
  id: string;
  extra: boolean;
}

type Overridden = Override<Original, Overrides>;
// { id: string; name: string; extra: boolean; }

// 使用 PickByType/OmitByType - 按类型选取
interface Mixed {
  id: number;
  name: string;
  active: boolean;
  createdAt: Date;
  update: () => void;
}

type OnlyPrimitives = PickByType<Mixed, Primitive>;
// { id: number; name: string; active: boolean; }

type NoFunctions = OmitByType<Mixed, Function>;
// { id: number; name: string; active: boolean; createdAt: Date; }

// 使用 FunctionKeys/NonFunctionKeys
type FunKeys = FunctionKeys<Mixed>;
// 'update'

type NonFunKeys = NonFunctionKeys<Mixed>;
// 'id' | 'name' | 'active' | 'createdAt'

// =======================================
// 示例 5: 数组类型工具
// =======================================

const numbers = [1, 2, 3, 4, 5] as const;
type NumberType = ArrayElement<typeof numbers>; // 1 | 2 | 3 | 4 | 5

const tuple = ['hello', 42, true] as const;
type FirstType = First<typeof tuple>; // 'hello'
type LastType = Last<typeof tuple>; // true

// =======================================
// 示例 6: 异步类型
// =======================================

// PromiseOrValue - 接受同步或异步
type Result = PromiseOrValue<string>;

async function processResult(result: Result): Promise<string> {
  return await result;
}

// AsyncFunction
const fetchData: AsyncFunction<User, [number]> = async (id) => {
  // ...
  return { id, name: 'Test', email: 'test@test.com', createdAt: new Date() };
};

// =======================================
// 示例 7: 完整应用
// =======================================

// 定义类型接口
interface AppState {
  count: number;
  theme: 'light' | 'dark';
}

interface AppActions {
  increment: () => void;
  decrement: () => void;
  toggleTheme: () => void;
}

// 创建组件
const App = defineComponent({
  name: 'App',

  setup() {
    const count = signal(0);
    const theme = signal<'light' | 'dark'>('light');

    const doubled = computed(() => count.value * 2);

    const increment = () => count.value++;
    const decrement = () => count.value--;
    const toggleTheme = () => {
      theme.value = theme.value === 'light' ? 'dark' : 'light';
    };

    effect(() => {
      console.log(`Count changed to: ${count.value}`);
    });

    return {
      count,
      theme,
      doubled,
      increment,
      decrement,
      toggleTheme,
    };
  },

  render(_ctx) {
    return h('div', { class: 'app' }, [
      h('h1', _ctx.theme === 'dark' ? 'Dark Mode' : 'Light Mode'),
      h('p', `Count: ${_ctx.count}`),
      h('p', `Doubled: ${_ctx.doubled}`),
      h('button', { onClick: () => _ctx.increment() }, '+'),
      h('button', { onClick: () => _ctx.decrement() }, '-'),
      h('button', { onClick: () => _ctx.toggleTheme() }, 'Toggle Theme'),
    ]);
  },
});

// 创建应用
const app = createApp(App);
app.mount('#app');

// =======================================
// 示例 8: 字典和工具类型
// =======================================

// Dictionary
const config: Dictionary<Primitive> = {
  appName: 'LytJS App',
  version: 1,
  enabled: true,
};

// ValueOf
type ConfigValues = ValueOf<typeof config>;
// string | number | boolean

// =======================================
// 示例 9: 插件类型安全
// =======================================

import { definePlugin } from '@lytjs/core';

interface ThemePluginOptions {
  defaultTheme: 'light' | 'dark';
  storageKey: string;
  availableThemes?: string[];
}

const themePlugin = definePlugin<ThemePluginOptions>({
  name: 'theme',

  schema: {
    type: 'object',
    properties: {
      defaultTheme: { type: 'string', required: true },
      storageKey: { type: 'string', required: true },
      availableThemes: { type: 'array', default: ['light', 'dark'] },
    },
  },

  install(app, options) {
    // options 类型安全
    console.log('Plugin installed with:', options);

    app.config.globalProperties.$theme = {
      current: signal(options.defaultTheme),
      set: (theme: string) => {
        /* ... */
      },
    };
  },
});

app.use(themePlugin, {
  defaultTheme: 'light',
  storageKey: 'lytjs-theme',
});

// =======================================
// 类型检查示例 (不会实际执行)
// =======================================

// 静态类型验证
type Check1 = Equal<string, string>; // true
type Check2 = Equal<string, number>; // false

type Check3 = Extends<string, Primitive>; // true
type Check4 = Extends<number, Primitive>; // true

type Check5 = IsAny<any>; // true
type Check6 = IsAny<unknown>; // false

type Check7 = IsNever<never>; // true
type Check8 = IsNever<number>; // false

console.log('TypeScript examples loaded!');
