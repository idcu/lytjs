// @lytjs/shared-types - 调试事件类型

/** ReactiveEffect 的脱敏引用（用于调试事件） */
export interface ReactiveEffectRef {
  id: number;
  active: boolean;
}

// FIX: P1-56 DebuggerEvent 类型统一：
// 添加 newValue/oldValue 字段，与 Vue 3 的 DebuggerEvent 接口保持一致，
// 确保 onRenderTriggered/onRenderTracked 回调能获取完整的调试信息
/** 调试事件 */
export interface DebuggerEvent {
  effect: ReactiveEffectRef;
  target: object;
  type: 'track' | 'trigger';
  key: string | symbol | undefined;
  /** 新值（仅 trigger 类型事件） */
  newValue?: unknown;
  /** 旧值（仅 trigger 类型事件） */
  oldValue?: unknown;
}
