// @lytjs/shared-types - 调试事件类型

/** ReactiveEffect 的脱敏引用（用于调试事件） */
export interface ReactiveEffectRef {
  id: number
  active: boolean
}

/** 调试事件 */
export interface DebuggerEvent {
  effect: ReactiveEffectRef
  target: object
  type: 'track' | 'trigger'
  key: string | symbol | undefined
}
