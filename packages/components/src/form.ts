/**
 * Form 表单容器
 * Props: model(表单数据对象), rules(验证规则), labelWidth, labelPosition, inline, size
 * Events: submit, reset, validate
 * Features: 表单验证, 重置, 提交处理
 */

import { defineComponent } from '@lytjs/component'
import { reactive } from '@lytjs/reactivity'

/** 验证规则定义 */
export interface FormRule {
  required?: boolean
  message?: string
  min?: number
  max?: number
  pattern?: RegExp
  validator?: (value: any, rule: FormRule, callback: (error?: string) => void) => void
  trigger?: 'change' | 'blur' | 'submit'
}

export interface FormRules {
  [field: string]: FormRule | FormRule[]
}

/** 验证结果 */
export interface ValidateResult {
  valid: boolean
  errors: Array<{ field: string; message: string }>
}

export const Form = defineComponent({
  name: 'LytForm',

  props: {
    model: {
      type: Object as () => Record<string, any>,
      default: () => ({}),
    },
    rules: {
      type: Object as () => FormRules,
      default: () => ({}),
    },
    labelWidth: {
      type: String,
      default: '100px',
    },
    labelPosition: {
      type: String,
      default: 'right',
      validator: (v: string) => ['left', 'right', 'top'].includes(v),
    },
    inline: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'medium',
      validator: (v: string) => ['small', 'medium', 'large'].includes(v),
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },

  setup(props, { emit, slots }) {
    const state = reactive({
      errors: {} as Record<string, string>,
      isValidating: false,
    })

    /** 验证单个字段 */
    const validateField = (field: string, value: any): string | null => {
      const fieldRules = props.rules[field]
      if (!fieldRules) return null

      const rules = Array.isArray(fieldRules) ? fieldRules : [fieldRules]

      for (const rule of rules) {
        // required 验证
        if (rule.required) {
          if (value === undefined || value === null || value === '' ||
            (Array.isArray(value) && value.length === 0)) {
            return rule.message || `${field} 是必填项`
          }
        }

        // min/max 验证
        if (typeof value === 'string') {
          if (rule.min !== undefined && value.length < rule.min) {
            return rule.message || `${field} 最少 ${rule.min} 个字符`
          }
          if (rule.max !== undefined && value.length > rule.max) {
            return rule.message || `${field} 最多 ${rule.max} 个字符`
          }
        }

        if (typeof value === 'number') {
          if (rule.min !== undefined && value < rule.min) {
            return rule.message || `${field} 不能小于 ${rule.min}`
          }
          if (rule.max !== undefined && value > rule.max) {
            return rule.message || `${field} 不能大于 ${rule.max}`
          }
        }

        // pattern 验证
        if (rule.pattern && !rule.pattern.test(String(value))) {
          return rule.message || `${field} 格式不正确`
        }

        // 自定义验证
        if (rule.validator) {
          let errorMsg: string | null = null
          rule.validator(value, rule, (error: any) => {
            errorMsg = error || null
          })
          if (errorMsg) return errorMsg
        }
      }

      return null
    }

    /** 验证整个表单 */
    const validate = (): ValidateResult => {
      const errors: Array<{ field: string; message: string }> = []
      const newErrors: Record<string, string> = {}

      for (const field of Object.keys(props.rules)) {
        const value = props.model[field]
        const error = validateField(field, value)
        if (error) {
          errors.push({ field, message: error })
          newErrors[field] = error
        }
      }

      state.errors = newErrors
      const result: ValidateResult = { valid: errors.length === 0, errors }
      emit('validate', result)
      return result
    }

    /** 重置表单 */
    const resetFields = () => {
      for (const key of Object.keys(props.model)) {
        props.model[key] = undefined
      }
      state.errors = {}
      emit('reset')
    }

    /** 清除验证信息 */
    const clearValidate = (fields?: string[]) => {
      if (fields) {
        for (const field of fields) {
          delete state.errors[field]
        }
      } else {
        state.errors = {}
      }
    }

    /** 提交表单 */
    const handleSubmit = (e: Event) => {
      e.preventDefault()
      const result = validate()
      if (result.valid) {
        emit('submit', { ...props.model })
      }
    }

    /** 获取字段错误信息 */
    const getFieldError = (field: string): string | undefined => {
      return state.errors[field]
    }

    /** 表单样式计算 */
    const formStyle = () => ({
      labelWidth: props.labelPosition === 'top' ? undefined : props.labelWidth,
    })

    return {
      state, validate, validateField, resetFields,
      clearValidate, handleSubmit, getFieldError, formStyle, slots,
    }
  },

  template: `
    <form
      class="lyt-form lyt-form--{labelPosition} lyt-form--{size} {inline ? 'lyt-form--inline' : ''} {disabled ? 'lyt-form--disabled' : ''}"
      :style="formStyle()"
      @submit="handleSubmit"
    >
      <slot></slot>
    </form>
  `,

  styles: `
    .lyt-form {
      box-sizing: border-box;
      font-size: 14px;
      color: #606266;
    }
    .lyt-form--inline {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: flex-start;
    }
    .lyt-form--disabled {
      opacity: 0.6;
      pointer-events: none;
    }
    .lyt-form--small { font-size: 12px; }
    .lyt-form--large { font-size: 16px; }
    .lyt-form-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    .lyt-form--inline .lyt-form-item {
      margin-bottom: 0;
    }
    .lyt-form--top .lyt-form-item {
      flex-direction: column;
    }
    .lyt-form-item__label {
      flex-shrink: 0;
      padding-right: 12px;
      line-height: 36px;
      font-size: 14px;
      color: #606266;
      text-align: right;
      box-sizing: border-box;
    }
    .lyt-form--left .lyt-form-item__label { text-align: left; }
    .lyt-form--top .lyt-form-item__label {
      text-align: left;
      padding-right: 0;
      padding-bottom: 4px;
      line-height: 1.5;
    }
    .lyt-form-item__content {
      flex: 1;
      position: relative;
    }
    .lyt-form-item__error {
      color: #f56c6c;
      font-size: 12px;
      line-height: 1;
      padding-top: 4px;
    }
  `,
})
