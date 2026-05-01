// @lytjs/shared-types - 全局 __DEV__ 声明
// 集中声明，避免各包重复定义 env.d.ts

/** 开发模式标志，由构建工具在编译时注入。生产环境为 false，开发环境为 true。 */
declare const __DEV__: boolean;
