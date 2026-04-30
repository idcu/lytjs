// src/optimize.ts
// AST optimizer - hoist static subtrees, mark constants
//
// 注意：optimize 阶段已合并到 transform 阶段。
// markConstants、hoistStatic、collectDynamicChildren 现在由 transform.ts 中的 transform() 函数统一调用。
// patchFlag 由 transform-element.ts 在 transform 过程中统一设置。
//
// 此文件保留仅为向后兼容，所有实现已迁移到 transform.ts。

export { optimize } from "./transform";
