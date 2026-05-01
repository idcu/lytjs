// @lytjs/shared-types - 泛型 RefLike 接口
// 替代原 reactivity/shared.ts 中的 any 版本

/**
 * 泛型 RefLike 接口，用于类型保护（避免从 ref.ts 导入产生循环依赖）
 */
export interface RefLike<T = unknown> {
  readonly __v_isRef: true;
  value: T;
}
