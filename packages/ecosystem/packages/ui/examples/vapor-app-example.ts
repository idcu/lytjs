/**
 * Vapor 模式示例应用
 * 
 * 演示如何在 Vapor 模式下使用 LytJS UI 组件
 */

import { defineVaporComponent, createVaporApp } from '@lytjs/renderer';
import { signal, computed } from '@lytjs/reactivity';
import { Button, Input, Card, Alert } from '@lytjs/ui';

// 示例组件 1: 简单计数器
const Counter = defineVaporComponent({
  name: 'Counter',
  setup() {
    const count = signal(0);
    
    const increment = () => {
      count.set(count() + 1);
    };
    
    const decrement = () => {
      count.set(count() - 1);
    };
    
    const reset = () => {
      count.set(0);
    };
    
    return {
      count,
      increment,
      decrement,
      reset
    };
  },
  template: `
    <div class="counter">
      <h2>计数器示例</h2>
      <div class="counter__display">
        当前计数: {{ count() }}
      </div>
      <div class="counter__buttons">
        <Button @click="decrement">-</Button>
        <Button @click="increment">+</Button>
        <Button @click="reset" type="danger">重置</Button>
      </div>
    </div>
  `,
});

// 示例组件 2: 待办事项列表
const TodoList = defineVaporComponent({
  name: 'TodoList',
  setup() {
    const newTodo = signal('');
    const todos = signal([
      { id: 1, text: '学习 LytJS', done: true },
      { id: 2, text: '创建第一个项目', done: false },
      { id: 3, text: '探索 Vapor 模式', done: false },
    ]);
    
    const addTodo = () => {
      if (newTodo().trim()) {
        todos.set([
          ...todos(),
          {
            id: Date.now(),
            text: newTodo().trim(),
            done: false,
          },
        ]);
        newTodo.set('');
      }
    };
    
    const toggleTodo = (id: number) => {
      todos.set(todos().map(todo => 
        todo.id === id ? { ...todo, done: !todo.done } : todo
      ));
    };
    
    const completedCount = computed(() => 
      todos().filter(todo => todo.done).length
    );
    
    return {
      newTodo,
      todos,
      addTodo,
      toggleTodo,
      completedCount,
    };
  },
  template: `
    <div class="todo-list">
      <h2>待办事项</h2>
      <div class="todo-list__input">
        <Input 
          v-model="newTodo"
          placeholder="添加待办..."
          @keyup.enter="addTodo"
        />
        <Button @click="addTodo" type="primary">添加</Button>
      </div>
      <ul class="todo-list__items">
        <li v-for="todo in todos" 
            v-key="todo.id" 
            class="todo-list__item"
            @click="() => toggleTodo(todo.id)">
          <span v-class="{ 'done': todo.done }">{{ todo.text }}</span>
        </li>
      </ul>
      <Alert type="success">
        已完成: {{ completedCount() }} / {{ todos.length }}
      </Alert>
    </div>
  `,
});

// 主应用
const App = defineVaporComponent({
  name: 'VaporAppExample',
  setup() {
    const activeTab = signal('counter');
    
    return {
      activeTab,
    };
  },
  template: `
    <div class="vapor-example">
      <header class="vapor-example__header">
        <h1>🚀 Vapor 模式示例应用</h1>
        <nav class="vapor-example__nav">
          <Button 
            @click="() => activeTab.set('counter')"
            :type="activeTab() === 'counter' ? 'primary' : 'default'"
          >
            计数器
          </Button>
          <Button 
            @click="() => activeTab.set('todos')"
            :type="activeTab() === 'todos' ? 'primary' : 'default'"
          >
            待办事项
          </Button>
        </nav>
      </header>
      
      <main class="vapor-example__main">
        <Card>
          <template v-if="activeTab() === 'counter'">
            <Counter />
          </template>
          <template v-if="activeTab() === 'todos'">
            <TodoList />
          </template>
        </Card>
      </main>
    </div>
  `,
});

// 渲染应用
const app = createVaporApp(App);

app.mount('#app');

console.log('%c✅ Vapor 模式示例应用已启动！', 'color: #42b883; font-size: 14px; font-weight: bold;');
