// 全局 Vitest setup 文件
// 这个文件会在所有测试运行前执行

// 定义全局变量
(globalThis as unknown as Record<string, boolean>).__DEV__ = true;
(globalThis as unknown as Record<string, boolean>).__PROD__ = false;
(globalThis as unknown as Record<string, boolean>).__TEST__ = true;
