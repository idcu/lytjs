import { createApp, ref, computed } from '@lytjs/core';
import { defineStore, createPinia } from '@lytjs/store';
import { Button, Input, Card, Tag } from '@lytjs/ui';
import '@lytjs/ui/index.css';

console.log('✅ LytJS 依赖加载成功！');

// 创建 Store
const useTodoStore = defineStore('todo', {
  state: () => ({
    todos: [],
    filter: 'all'
  }),
  getters: {
    filteredTodos: (state) => {
      if (state.filter === 'active') {
        return state.todos.filter(t => !t.completed);
      } else if (state.filter === 'completed') {
        return state.todos.filter(t => t.completed);
      }
      return state.todos;
    },
    remainingCount: (state) => 
      state.todos.filter(t => !t.completed).length,
  },
  actions: {
    addTodo(text) {
      if (text.trim()) {
        this.todos.push({
          id: Date.now(),
          text: text,
          completed: false
        });
      }
    },
    toggleTodo(id) {
      const todo = this.todos.find(t => t.id === id);
      if (todo) todo.completed = !todo.completed;
    },
    deleteTodo(id) {
      this.todos = this.todos.filter(t => t.id !== id);
    },
    setFilter(filter) {
      this.filter = filter;
    }
  }
});

const pinia = createPinia();

const TodoApp = {
  components: { Button, Input, Card, Tag },
  setup() {
    const todoStore = useTodoStore(pinia);
    
    const newTodo = ref('');
    
    const handleAdd = () => {
      todoStore.addTodo(newTodo.value);
      newTodo.value = '';
    };
    
    return { todoStore, newTodo, handleAdd };
  },
  template: `
    <div class="todo-app">
      <Card title="📝 Todo List">
        
        <div style="margin-bottom: 20px;">
          <Input 
        v-model="newTodo" 
        placeholder="添加待办事项..."
        @keyup.enter="handleAdd"
        style="width: 100%;"
      >
      </Input>
      
      <Button 
        type="primary" 
        @click="handleAdd"
        style="margin-top: 10px;"
      >
        添加
      </Button>
    </div>
    
    <div style="margin-bottom: 15px;">
      <Tag>全部</Tag>
      <Tag>待办 ({{ todoStore.remainingCount }})</Tag>
    </div>
    
    <ul style="list-style: none; padding: 0;">
      <li 
        v-for="todo in todoStore.filteredTodos" 
        :key="todo.id"
        style="padding: 12px;
              border-bottom: 1px solid #f0f0f0;
              display: flex;
              justify-content: space-between;
              align-items: center;"
      >
        <span 
          :style="{ textDecoration: todo.completed ? 'line-through' : 'none' }"
          @click="todoStore.toggleTodo(todo.id)"
          style="cursor: pointer;"
        >
          {{ todo.text }}
        </span>
        
        <Button 
          size="small"
          @click="todoStore.deleteTodo(todo.id)"
        >
          删除
        </Button>
      </li>
    </ul>
  </template>
};

const app = createApp(TodoApp);
app.use(pinia);
app.mount('#app');

console.log('✅ Todo 应用已启动！');
console.log('💡 使用 @lytjs/core 版本:', app.version);
