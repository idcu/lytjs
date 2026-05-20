/**
 * LytJS - 完整待办事项应用示例
 *
 * 演示: 响应式状态管理、计算属性、事件处理、组件组合等功能
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createApp, h, ref, computed, watch } from '@lytjs/core';

// 待办项类型
interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: number;
}

// 过滤类型
type FilterType = 'all' | 'active' | 'completed';

// 创建待办应用组件
function TodoApp() {
  // 响应式状态
  const inputText = ref('');
  const todos = ref<Todo[]>([]);
  const filter = ref<FilterType>('all');
  const darkMode = ref(false);

  // 从本地存储加载数据
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('lyt-todos');
      if (saved) {
        todos.value = JSON.parse(saved);
      }
      const darkModeSaved = localStorage.getItem('lyt-dark-mode');
      if (darkModeSaved) {
        darkMode.value = darkModeSaved === 'true';
      }
    } catch (e) {
      console.error('加载数据失败', e);
    }
  };

  // 保存到本地存储
  const saveToStorage = () => {
    localStorage.setItem('lyt-todos', JSON.stringify(todos.value));
    localStorage.setItem('lyt-dark-mode', String(darkMode.value));
  };

  // 计算过滤后的待办列表
  const filteredTodos = computed(() => {
    switch (filter.value) {
      case 'active':
        return todos.value.filter((todo) => !todo.completed);
      case 'completed':
        return todos.value.filter((todo) => todo.completed);
      default:
        return todos.value;
    }
  });

  // 计算未完成数量
  const activeCount = computed(() => todos.value.filter((todo) => !todo.completed).length);

  // 计算是否有已完成项目
  const hasCompleted = computed(() => todos.value.some((todo) => todo.completed));

  // 添加新待办
  const addTodo = (e: Event) => {
    e.preventDefault();
    const text = inputText.value.trim();
    if (text) {
      todos.value.push({
        id: Date.now(),
        text,
        completed: false,
        createdAt: Date.now(),
      });
      inputText.value = '';
    }
  };

  // 切换待办完成状态
  const toggleTodo = (id: number) => {
    const todo = todos.value.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  };

  // 删除待办
  const deleteTodo = (id: number) => {
    const index = todos.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      todos.value.splice(index, 1);
    }
  };

  // 清除已完成的待办
  const clearCompleted = () => {
    todos.value = todos.value.filter((todo) => !todo.completed);
  };

  // 切换主题
  const toggleDarkMode = () => {
    darkMode.value = !darkMode.value;
  };

  // 初始化
  loadFromStorage();

  // 监听 todos 和 darkMode 变化，自动保存
  watch(todos, () => saveToStorage());
  watch(darkMode, () => saveToStorage());

  // 渲染主题切换按钮
  const renderThemeButton = () =>
    h('div', { class: 'controls' }, [
      h(
        'button',
        {
          onClick: toggleDarkMode,
          style: {
            background: darkMode.value ? '#ffc107' : '#6c757d',
            color: darkMode.value ? '#333' : 'white',
          },
        },
        darkMode.value ? '☀️ 浅色模式' : '🌙 深色模式',
      ),
    ]);

  // 渲染头部
  const renderHeader = () =>
    h('div', { class: 'header' }, [
      h('h1', {}, '📋 Lyt.js 待办应用'),
      h('p', {}, '一个功能完整的待办事项管理应用'),
      renderThemeButton(),
    ]);

  // 渲染输入区域
  const renderInputSection = () =>
    h('div', { class: 'todo-input-section' }, [
      h('form', { onSubmit: addTodo }, [
        h('input', {
          type: 'text',
          placeholder: '添加新的待办事项...',
          value: inputText.value,
          onInput: (e: any) => (inputText.value = e.target.value),
          autofocus: true,
        }),
        h('button', { type: 'submit' }, '添加'),
      ]),
    ]);

  // 渲染过滤按钮
  const renderFilterButtons = () => {
    const filters: FilterType[] = ['all', 'active', 'completed'];
    const labels = ['全部', '进行中', '已完成'];

    return h(
      'div',
      { class: 'filter-buttons' },
      filters.map((f, i) =>
        h(
          'button',
          {
            class: { active: filter.value === f },
            onClick: () => (filter.value = f),
          },
          labels[i],
        ),
      ),
    );
  };

  // 渲染单个待办项
  const renderTodoItem = (todo: Todo) =>
    h(
      'div',
      {
        class: { 'todo-item': true, completed: todo.completed },
        key: todo.id,
      },
      [
        h('input', {
          type: 'checkbox',
          class: 'todo-checkbox',
          checked: todo.completed,
          onChange: () => toggleTodo(todo.id),
        }),
        h('span', { class: 'todo-text' }, todo.text),
        h('div', { class: 'todo-actions' }, [
          h(
            'button',
            {
              class: 'btn-delete',
              onClick: () => deleteTodo(todo.id),
            },
            '删除',
          ),
        ]),
      ],
    );

  // 渲染待办列表
  const renderTodoList = () =>
    h('div', { class: 'todo-list' }, [
      ...filteredTodos.value.map(renderTodoItem),
      todos.value.length > 0
        ? h('div', { class: 'footer' }, [
            h('span', {}, `${activeCount.value} 项未完成`),
            hasCompleted.value
              ? h(
                  'button',
                  {
                    onClick: clearCompleted,
                  },
                  '清除已完成',
                )
              : null,
          ])
        : null,
    ]);

  // 渲染统计信息
  const renderStats = () => {
    const completedCount = todos.value.length - activeCount.value;
    return h('div', { class: 'stats' }, [
      h('p', {}, `总计: ${todos.value.length} 项 | `),
      h('p', {}, `进行中: ${activeCount.value} 项 | `),
      h('p', {}, `已完成: ${completedCount} 项`),
    ]);
  };

  // 主渲染函数
  return h(
    'div',
    {
      class: darkMode.value ? 'dark-mode' : '',
      style: { transition: 'all 0.3s ease' },
    },
    [renderHeader(), renderInputSection(), renderFilterButtons(), renderTodoList(), renderStats()],
  );
}

// 创建并挂载应用
const app = createApp(TodoApp);
app.mount('#app');
