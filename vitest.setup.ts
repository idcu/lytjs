// 全局 Vitest setup 文件
// 这个文件会在所有测试运行前执行

// 定义全局变量
(globalThis as any).__DEV__ = true;
(globalThis as any).__PROD__ = false;
(globalThis as any).__TEST__ = true;
