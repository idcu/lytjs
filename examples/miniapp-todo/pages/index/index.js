/**
 * miniapp-todo 首页逻辑
 *
 * 演示 Lyt.js 小程序渲染器的使用方式。
 * 包含 Todo 的增删改查功能，展示：
 *   - 数据绑定（setData）
 *   - 事件处理（bindtap / bindinput / bindconfirm）
 *   - 条件渲染（wx:if）
 *   - 列表渲染（wx:for）
 *   - 本地存储
 *   - 生命周期钩子
 */

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 输入框内容
    inputValue: '',
    // Todo 列表
    todos: [],
    // 筛选类型：all / active / completed
    filter: 'all',
    // 统计信息
    activeCount: 0,
    completedCount: 0,
    // 是否显示编辑模式
    editingId: null,
    // 编辑中的文本
    editText: '',
    // 空状态提示
    isEmpty: true,
  },

  /**
   * 页面加载
   * 对应 Lyt.js 的 onBeforeMount
   */
  onLoad() {
    // 从本地存储恢复 Todo 列表
    this._loadTodos();
  },

  /**
   * 页面初次渲染完成
   * 对应 Lyt.js 的 onMounted
   */
  onReady() {
    console.log('[miniapp-todo] Page ready');
  },

  /**
   * 页面显示
   * 对应 Lyt.js 的 onShow
   */
  onShow() {
    // 每次显示时更新统计
    this._updateStats();
  },

  /* --------------------------------------------------
   *  Todo 操作方法
   * -------------------------------------------------- */

  /**
   * 输入框内容变化
   */
  handleInput(e) {
    this.setData({
      inputValue: e.detail.value,
    });
  },

  /**
   * 添加 Todo
   */
  handleAdd() {
    const text = this.data.inputValue.trim();
    if (!text) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none',
        duration: 1500,
      });
      return;
    }

    const newTodo = {
      id: Date.now(),
      text: text,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    const todos = [...this.data.todos, newTodo];

    this.setData({
      todos: todos,
      inputValue: '',
      isEmpty: false,
    });

    this._updateStats();
    this._saveTodos();
  },

  /**
   * 回车添加 Todo
   */
  handleConfirm() {
    this.handleAdd();
  },

  /**
   * 切换 Todo 完成状态
   */
  handleToggle(e) {
    const id = e.currentTarget.dataset.id;
    const todos = this.data.todos.map(todo => {
      if (todo.id === id) {
        return { ...todo, completed: !todo.completed };
      }
      return todo;
    });

    this.setData({ todos: todos });
    this._updateStats();
    this._saveTodos();
  },

  /**
   * 删除 Todo
   */
  handleDelete(e) {
    const id = e.currentTarget.dataset.id;
    const todos = this.data.todos.filter(todo => todo.id !== id);

    this.setData({
      todos: todos,
      isEmpty: todos.length === 0,
    });

    this._updateStats();
    this._saveTodos();
  },

  /**
   * 开始编辑 Todo
   */
  handleEdit(e) {
    const id = e.currentTarget.dataset.id;
    const todo = this.data.todos.find(t => t.id === id);
    if (todo) {
      this.setData({
        editingId: id,
        editText: todo.text,
      });
    }
  },

  /**
   * 编辑输入变化
   */
  handleEditInput(e) {
    this.setData({
      editText: e.detail.value,
    });
  },

  /**
   * 确认编辑
   */
  handleEditConfirm() {
    const text = this.data.editText.trim();
    if (!text) return;

    const todos = this.data.todos.map(todo => {
      if (todo.id === this.data.editingId) {
        return { ...todo, text: text };
      }
      return todo;
    });

    this.setData({
      todos: todos,
      editingId: null,
      editText: '',
    });

    this._saveTodos();
  },

  /**
   * 取消编辑
   */
  handleEditCancel() {
    this.setData({
      editingId: null,
      editText: '',
    });
  },

  /**
   * 清除所有已完成的 Todo
   */
  handleClearCompleted() {
    const todos = this.data.todos.filter(todo => !todo.completed);

    this.setData({
      todos: todos,
      isEmpty: todos.length === 0,
    });

    this._updateStats();
    this._saveTodos();

    wx.showToast({
      title: '已清除',
      icon: 'success',
      duration: 1000,
    });
  },

  /**
   * 设置筛选类型
   */
  handleFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter: filter });
  },

  /**
   * 全选/取消全选
   */
  handleToggleAll() {
    const allCompleted = this.data.todos.length > 0 &&
      this.data.todos.every(todo => todo.completed);

    const todos = this.data.todos.map(todo => ({
      ...todo,
      completed: !allCompleted,
    }));

    this.setData({ todos: todos });
    this._updateStats();
    this._saveTodos();
  },

  /* --------------------------------------------------
   *  计算属性（手动实现）
   * -------------------------------------------------- */

  /**
   * 获取过滤后的 Todo 列表
   */
  _getFilteredTodos() {
    const { todos, filter } = this.data;
    switch (filter) {
      case 'active':
        return todos.filter(t => !t.completed);
      case 'completed':
        return todos.filter(t => t.completed);
      default:
        return todos;
    }
  },

  /* --------------------------------------------------
   *  内部方法
   * -------------------------------------------------- */

  /**
   * 更新统计信息
   */
  _updateStats() {
    const todos = this.data.todos;
    const activeCount = todos.filter(t => !t.completed).length;
    const completedCount = todos.filter(t => t.completed).length;

    this.setData({
      activeCount: activeCount,
      completedCount: completedCount,
    });

    // 更新全局状态
    const app = getApp();
    if (app) {
      app.globalData.todoCount = todos.length;
    }
  },

  /**
   * 保存 Todo 到本地存储
   */
  _saveTodos() {
    try {
      wx.setStorageSync('__lyt_todos__', this.data.todos);
    } catch (e) {
      console.warn('[miniapp-todo] Save failed:', e);
    }
  },

  /**
   * 从本地存储加载 Todo
   */
  _loadTodos() {
    try {
      const todos = wx.getStorageSync('__lyt_todos__');
      if (todos && Array.isArray(todos)) {
        this.setData({
          todos: todos,
          isEmpty: todos.length === 0,
        });
        this._updateStats();
      }
    } catch (e) {
      console.warn('[miniapp-todo] Load failed:', e);
    }
  },
});
