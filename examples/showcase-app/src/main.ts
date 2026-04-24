import { createApp, reactive, computed, watch } from '@lytjs/core'

// 响应式数据
const state = reactive({
  count: 0,
  message: 'Hello Lyt.js!',
  todos: [
    { id: 1, text: '学习响应式系统', done: true },
    { id: 2, text: '使用组件库', done: false },
    { id: 3, text: '构建项目', done: false }
  ],
  inputValue: '',
  progress: 50,
  theme: 'light',
  activeTab: 0,
  formData: {
    username: '',
    email: '',
    gender: 'male',
    agree: false,
    bio: ''
  },
  dateValue: '',
  timeValue: '',
  sliderValue: 50,
  selectedTab: 'basic',
  notifications: []
})

// 计算属性
const doubleCount = computed(() => state.count * 2)
const remainingTodos = computed(() => state.todos.filter(t => !t.done).length)

// 方法
function increment() {
  state.count++
}

function decrement() {
  state.count--
}

function addTodo() {
  if (state.inputValue.trim()) {
    state.todos.push({
      id: Date.now(),
      text: state.inputValue,
      done: false
    })
    state.inputValue = ''
  }
}

function toggleTodo(id: number) {
  const todo = state.todos.find(t => t.id === id)
  if (todo) {
    todo.done = !todo.done
  }
}

function removeTodo(id: number) {
  const index = state.todos.findIndex(t => t.id === id)
  if (index > -1) {
    state.todos.splice(index, 1)
  }
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light'
}

function showNotification(type: string, message: string) {
  const notification = {
    id: Date.now(),
    type,
    message
  }
  state.notifications.push(notification)
  setTimeout(() => {
    const index = state.notifications.findIndex(n => n.id === notification.id)
    if (index > -1) {
      state.notifications.splice(index, 1)
    }
  }, 3000)
}

function submitForm() {
  if (!state.formData.username.trim()) {
    showNotification('error', '请输入用户名')
    return
  }
  showNotification('success', '表单提交成功！')
  console.log('表单数据:', state.formData)
}

// 监听
watch(() => state.count, (newVal) => {
  console.log('Count changed to:', newVal)
})

// 创建应用
const app = createApp({
  data() {
    return state
  },
  computed: {
    doubleCount,
    remainingTodos
  },
  methods: {
    increment,
    decrement,
    addTodo,
    toggleTodo,
    removeTodo,
    toggleTheme,
    showNotification,
    submitForm
  },
  render() {
    return `
      <div class="app ${this.theme === 'dark' ? 'dark-theme' : ''}">
        <!-- 通知区域 -->
        <div class="notifications">
          ${this.notifications.map(n => `
            <div class="notification notification-${n.type}">
              ${n.message}
            </div>
          `).join('')}
        </div>

        <header class="header">
          <h1>🚀 Lyt.js 完整展示</h1>
          <button class="theme-btn" onclick="app.toggleTheme()">
            ${this.theme === 'light' ? '🌙 暗色' : '☀️ 亮色'}
          </button>
        </header>

        <main class="main">
          <!-- 基础组件演示 -->
          <section class="section">
            <h2>🎯 响应式系统</h2>
            <div class="counter">
              <div class="counter-display">${this.count}</div>
              <div class="counter-buttons">
                <button class="btn btn-danger" onclick="app.decrement()">-</button>
                <button class="btn btn-secondary" onclick="app.count = 0">重置</button>
                <button class="btn btn-primary" onclick="app.increment()">+</button>
              </div>
              <p class="counter-info">双倍: ${this.doubleCount}</p>
            </div>
          </section>

          <!-- 按钮组件演示 -->
          <section class="section">
            <h2>🔘 按钮组件</h2>
            <div class="buttons-demo">
              <button class="btn btn-primary">主要按钮</button>
              <button class="btn btn-secondary">次要按钮</button>
              <button class="btn btn-success">成功按钮</button>
              <button class="btn btn-warning">警告按钮</button>
              <button class="btn btn-danger">危险按钮</button>
              <button class="btn btn-primary" disabled>禁用按钮</button>
            </div>
          </section>

          <!-- 待办事项 -->
          <section class="section">
            <h2>📝 待办事项 (${this.remainingTodos} 未完成)</h2>
            <div class="todo-input">
              <input
                type="text"
                placeholder="添加待办事项..."
                value="${this.inputValue}"
                oninput="app.inputValue = this.value"
                onkeypress="if(event.key==='Enter') app.addTodo()"
              />
              <button class="btn btn-primary" onclick="app.addTodo()">添加</button>
            </div>
            <ul class="todo-list">
              ${this.todos.map(todo => `
                <li class="todo-item ${todo.done ? 'done' : ''}">
                  <input
                    type="checkbox"
                    ${todo.done ? 'checked' : ''}
                    onchange="app.toggleTodo(${todo.id})"
                  />
                  <span>${todo.text}</span>
                  <button class="btn btn-sm btn-danger" onclick="app.removeTodo(${todo.id})">×</button>
                </li>
              `).join('')}
            </ul>
          </section>

          <!-- 进度条 -->
          <section class="section">
            <h2>📊 进度条</h2>
            <div class="progress">
              <div class="progress-bar" style="width: ${this.progress}%"></div>
            </div>
            <div class="progress-controls">
              <button class="btn btn-sm" onclick="app.progress = Math.max(0, app.progress - 10)">-10%</button>
              <span class="progress-value">${this.progress}%</span>
              <button class="btn btn-sm" onclick="app.progress = Math.min(100, app.progress + 10)">+10%</button>
            </div>
          </section>

          <!-- 滑块组件 -->
          <section class="section">
            <h2>🎚️ 滑块组件</h2>
            <div class="slider-container">
              <input
                type="range"
                min="0"
                max="100"
                value="${this.sliderValue}"
                oninput="app.sliderValue = parseInt(this.value)"
                class="slider"
              />
              <div class="slider-value">值: ${this.sliderValue}</div>
            </div>
          </section>

          <!-- 表单组件 -->
          <section class="section">
            <h2>📋 表单组件</h2>
            <div class="form-demo">
              <div class="form-group">
                <label>用户名</label>
                <input
                  type="text"
                  value="${this.formData.username}"
                  oninput="app.formData.username = this.value"
                  placeholder="请输入用户名"
                />
              </div>
              <div class="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  value="${this.formData.email}"
                  oninput="app.formData.email = this.value"
                  placeholder="请输入邮箱"
                />
              </div>
              <div class="form-group">
                <label>性别</label>
                <div class="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="gender"
                      ${this.formData.gender === 'male' ? 'checked' : ''}
                      onchange="app.formData.gender = 'male'"
                    />
                    男
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="gender"
                      ${this.formData.gender === 'female' ? 'checked' : ''}
                      onchange="app.formData.gender = 'female'"
                    />
                    女
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label>个人简介</label>
                <textarea
                  value="${this.formData.bio}"
                  oninput="app.formData.bio = this.value"
                  placeholder="请输入个人简介"
                  rows="3"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    ${this.formData.agree ? 'checked' : ''}
                    onchange="app.formData.agree = this.checked"
                  />
                  我同意用户协议
                </label>
              </div>
              <button class="btn btn-primary" onclick="app.submitForm()">提交表单</button>
            </div>
          </section>

          <!-- 数据展示 -->
          <section class="section">
            <h2>🏷️ 数据展示</h2>
            <div class="tags">
              <span class="tag tag-success">成功</span>
              <span class="tag tag-warning">警告</span>
              <span class="tag tag-error">错误</span>
              <span class="tag tag-info">信息</span>
            </div>
            <div class="avatars">
              <div class="avatar avatar-sm">A</div>
              <div class="avatar avatar-md">B</div>
              <div class="avatar avatar-lg">C</div>
            </div>
          </section>

          <!-- 徽章组件 -->
          <section class="section">
            <h2>🎖️ 徽章组件</h2>
            <div class="badges-demo">
              <span class="badge badge-primary">Primary</span>
              <span class="badge badge-success">Success</span>
              <span class="badge badge-warning">Warning</span>
              <span class="badge badge-error">Error</span>
              <span class="badge badge-info">Info</span>
            </div>
          </section>

          <!-- 标签页演示 -->
          <section class="section">
            <h2>📑 标签页组件</h2>
            <div class="tabs">
              <div class="tabs-header">
                <button
                  class="tab-btn ${this.selectedTab === 'basic' ? 'active' : ''}"
                  onclick="app.selectedTab = 'basic'"
                >
                  基础
                </button>
                <button
                  class="tab-btn ${this.selectedTab === 'advanced' ? 'active' : ''}"
                  onclick="app.selectedTab = 'advanced'"
                >
                  高级
                </button>
                <button
                  class="tab-btn ${this.selectedTab === 'custom' ? 'active' : ''}"
                  onclick="app.selectedTab = 'custom'"
                >
                  自定义
                </button>
              </div>
              <div class="tabs-content">
                ${this.selectedTab === 'basic' ? `
                  <p>这是基础标签页的内容，展示了简单的文本信息。</p>
                ` : ''}
                ${this.selectedTab === 'advanced' ? `
                  <p>这是高级标签页的内容，包含了更多复杂的功能展示。</p>
                ` : ''}
                ${this.selectedTab === 'custom' ? `
                  <p>这是自定义标签页的内容，您可以完全自定义展示内容。</p>
                ` : ''}
              </div>
            </div>
          </section>

          <!-- 提示框演示 -->
          <section class="section">
            <h2>💡 提示框</h2>
            <div class="alerts-demo">
              <div class="alert alert-success">
                <strong>成功！</strong> 这是一条成功提示消息。
              </div>
              <div class="alert alert-warning">
                <strong>警告！</strong> 这是一条警告提示消息。
              </div>
              <div class="alert alert-error">
                <strong>错误！</strong> 这是一条错误提示消息。
              </div>
              <div class="alert alert-info">
                <strong>提示！</strong> 这是一条信息提示消息。
              </div>
            </div>
          </section>

        </main>

        <footer class="footer">
          <p>轻写轻跑，所见即代码</p>
          <p>Lyt.js - 让开发更简单</p>
        </footer>
      </div>
    `
  }
})

// 挂载应用
app.mount('#app')

console.log('✅ Lyt.js 应用已启动')
