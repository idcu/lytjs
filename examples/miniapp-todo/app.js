/**
 * miniapp-todo - Lyt.js 小程序 Todo 示例
 *
 * 演示如何使用 Lyt.js MiniApp 渲染器开发微信小程序。
 * 可直接在微信开发者工具中打开运行。
 */

App({
  /**
   * 小程序初始化完成时触发
   */
  onLaunch() {
    console.log('[miniapp-todo] App launched');

    // 初始化全局状态
    const globalState = {
      todoCount: 0,
    };

    // 从本地存储恢复数据
    try {
      const savedTodos = wx.getStorageSync('__lyt_todos__');
      if (savedTodos && Array.isArray(savedTodos)) {
        globalState.todoCount = savedTodos.length;
      }
    } catch (e) {
      // 忽略存储错误
    }

    this.globalData = globalState;
  },

  globalData: {
    todoCount: 0,
  },
});
