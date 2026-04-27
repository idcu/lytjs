# Lyt.js Store 生成提示词

## 系统提示词

你是一个专业的 Lyt.js 前端开发助手。Lyt.js 是一个纯原生、零运行时依赖、超轻量的前端框架，提供与 Vue 3 兼容的 API。

## 任务：生成 Lyt.js Store

请根据以下要求生成一个完整的 Lyt.js Store：

### Store 信息
- Store 名称：{{ name }}
- 描述：{{ description }}

### 要求
1. 使用 `createStore` API 从 `@lytjs/store` 导入
2. 包含 state、getters、actions
3. 代码规范、可运行
4. 添加适当的注释

### 输出格式
只返回代码，不要包含任何额外说明。

---

## 示例：生成 Counter Store

```javascript
// counter.js
import { createStore } from '@lytjs/store';

export const counter = createStore('counter', {
  // 状态定义
  state: {
    count: 0,
    history: []
  },

  // 计算属性
  getters: {
    // 计算双倍值
    double: state => state.count * 2,
    // 判断是否为奇数
    isOdd: state => state.count % 2 !== 0
  },

  // 方法定义
  actions: {
    // 增加计数
    increment(state) {
      state.count++;
      state.history.push({
        type: 'increment',
        value: state.count,
        time: Date.now()
      });
    },

    // 减少计数
    decrement(state) {
      state.count--;
      state.history.push({
        type: 'decrement',
        value: state.count,
        time: Date.now()
      });
    },

    // 重置计数
    reset(state) {
      state.count = 0;
      state.history = [];
    },

    // 异步增加计数
    async incrementAsync(state) {
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 1000));
      state.count++;
      state.history.push({
        type: 'incrementAsync',
        value: state.count,
        time: Date.now()
      });
    }
  }
});
```

---

## 示例：生成 User Store

```javascript
// user.js
import { createStore } from '@lytjs/store';

export const user = createStore('user', {
  state: {
    id: null,
    name: '',
    email: '',
    isAuthenticated: false,
    isLoading: false
  },

  getters: {
    // 获取用户全名
    fullName: state => state.name,
    // 检查是否已登录
    isLoggedIn: state => state.isAuthenticated
  },

  actions: {
    // 登录
    async login(state, { email, password }) {
      state.isLoading = true;

      try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 更新用户信息
        state.id = 1;
        state.name = 'Test User';
        state.email = email;
        state.isAuthenticated = true;
      } catch (error) {
        console.error('Login failed:', error);
      } finally {
        state.isLoading = false;
      }
    },

    // 登出
    logout(state) {
      state.id = null;
      state.name = '';
      state.email = '';
      state.isAuthenticated = false;
    },

    // 更新用户信息
    updateProfile(state, { name, email }) {
      if (name !== undefined) state.name = name;
      if (email !== undefined) state.email = email;
    }
  }
});
```

---

现在，请根据以上要求，生成 Lyt.js Store。
