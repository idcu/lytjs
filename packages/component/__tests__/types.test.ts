/**
 * Lyt.js TypeScript 类型安全测试
 *
 * 测试泛型推断、Props 类型、Emits 类型等 TypeScript 相关功能
 */

import { describe, it, expect } from '../../test-utils/src/index'
import {
  defineComponent,
  defineFunctionalComponent,
} from '../src/index'
import { defineEmits } from '../src/emit'

// ================================================================
//  类型测试用例 - 主要是 TypeScript 编译层面的测试
// ================================================================

describe('TypeScript 类型安全', () => {
  // ---- 1. defineComponent 泛型推断测试 ----
  it('defineComponent 泛型推断', () => {
    const comp = defineComponent({
      name: 'TestComponent',
      props: {
        title: { type: String, default: 'Hello' },
        count: { type: Number, required: true },
        disabled: { type: Boolean, default: false },
      },
      state() {
        return {
          innerCount: 0,
          message: 'Test',
        }
      },
      emits: {
        'update:count': (value: number) => true,
        'click': () => true,
      },
    })

    expect(comp._isComponentDefine).toBe(true)
    expect(comp.name).toBe('TestComponent')
  })

  // ---- 2. defineFunctionalComponent 测试 ----
  it('defineFunctionalComponent 类型安全', () => {
    const Button = defineFunctionalComponent<
      { label: string; size?: 'small' | 'large' },
      { click: (e: Event) => void }
    >((props, { emit }) => {
      return {
        type: 'button',
        props: {
          onClick: (e: Event) => emit('click', e),
        },
        children: [props.label],
      }
    })

    expect(Button._isComponentDefine).toBe(true)
  })

  // ---- 3. defineEmits 工具函数测试 ----
  it('defineEmits 类型工具', () => {
    const emits = defineEmits({
      'update:value': (value: string | number) => true,
      'change': (oldVal: any, newVal: any) => true,
      'submit': () => true,
    })

    expect(emits).toBeDefined()
  })

  // ---- 4. 空组件测试 ----
  it('最小化组件定义', () => {
    const Minimal = defineComponent({})
    expect(Minimal._isComponentDefine).toBe(true)
  })

  // ---- 5. 仅包含 Props 的组件 ----
  it('仅 Props 的组件', () => {
    const PropsOnly = defineComponent({
      props: {
        id: { type: String, required: true },
        name: String,
        items: Array,
      },
    })

    expect(PropsOnly._isComponentDefine).toBe(true)
    expect(PropsOnly.options.props).toBeDefined()
  })

  // ---- 6. 仅包含 State 的组件 ----
  it('仅 State 的组件', () => {
    const StateOnly = defineComponent({
      state() {
        return {
          count: 0,
          todos: ['Learn Lyt.js', 'Write Tests'],
        }
      },
    })

    expect(StateOnly._isComponentDefine).toBe(true)
    expect(StateOnly.options.state).toBeDefined()
  })

  // ---- 7. 混合模式组件 ----
  it('混合模式组件（Options + Composition）', () => {
    const Mixed = defineComponent({
      props: { title: String },
      state() {
        return { count: 0 }
      },
      setup(props, { emit }) {
        return {
          double: () => props.title?.length || 0,
        }
      },
    })

    expect(Mixed._isComponentDefine).toBe(true)
  })
})

// ================================================================
//  TypeScript 类型层面的验证（主要是编译检查）
// ================================================================

// 这些是 TypeScript 类型检查的示例，不是运行时测试
// 它们验证类型定义是否正确工作

// 示例：Props 类型推断
type ExampleProps = {
  title: string
  count: number
  disabled?: boolean
}

// 示例：Emits 类型
type ExampleEmits = {
  click: (e: Event) => void
  'update:count': (value: number) => void
}

// 示例：组件类型使用
const exampleComp = defineComponent<
  ExampleProps,
  ExampleEmits,
  { innerCount: number }
>({
  props: {
    title: { type: String, required: true },
    count: { type: Number, required: true },
    disabled: Boolean,
  },
  state() {
    return { innerCount: 0 }
  },
  emits: {
    click: () => true,
    'update:count': () => true,
  },
})
