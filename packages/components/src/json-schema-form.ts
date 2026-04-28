/**
 * JSON Schema 动态表单组件
 *
 * 根据 JSON Schema 定义自动生成表单字段。
 * 支持多种字段类型：string, number, boolean, select, textarea, date, array。
 *
 * Props: schema, modelValue, readonly, labelWidth, rules
 * Events: update:modelValue, validate, submit
 */

import { defineComponent } from '@lytjs/component'
import { reactive, computed, ref, watch } from '@lytjs/reactivity'

// ================================================================
//  类型定义
// ================================================================

/** 表单字段 Schema */
export interface FormFieldSchema {
  /** 字段类型 */
  type: 'string' | 'number' | 'boolean' | 'select' | 'textarea' | 'date' | 'array'
  /** 字段标题 */
  title: string
  /** 字段描述 */
  description?: string
  /** 默认值 */
  default?: any
  /** 枚举值（select 选项） */
  enum?: Array<{ label: string; value: any } | string | number | boolean>
  /** 数字最小值 */
  min?: number
  /** 数字最大值 */
  max?: number
  /** 字符串最小长度 */
  minLength?: number
  /** 字符串最大长度 */
  maxLength?: number
  /** 正则验证 */
  pattern?: string
  /** 是否必填 */
  required?: boolean
  /** 占位符 */
  placeholder?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否只读 */
  readonly?: boolean
  /** 步长（number 类型） */
  step?: number
}

/** JSON Schema 定义 */
export interface FormSchema {
  type: 'object'
  /** 属性定义 */
  properties: Record<string, FormFieldSchema>
  /** 必填字段列表 */
  required?: string[]
}

/** 验证结果 */
export interface FieldValidateResult {
  /** 字段名 */
  field: string
  /** 是否通过 */
  valid: boolean
  /** 错误消息 */
  message?: string
}

/** JSON Schema 表单 Props */
export interface JsonSchemaFormProps {
  /** JSON Schema 定义 */
  schema: FormSchema
  /** 表单值 */
  modelValue: Record<string, any>
  /** 只读模式 */
  readonly?: boolean
  /** 标签宽度 */
  labelWidth?: string
  /** 验证规则 */
  rules?: Record<string, any>
}

// ================================================================
//  验证工具函数
// ================================================================

/** 验证单个字段 */
function validateField(
  field: string,
  value: any,
  fieldSchema: FormFieldSchema,
  customRules?: any,
): FieldValidateResult {
  // 自定义验证规则
  if (customRules && customRules[field]) {
    const rule = customRules[field]
    if (typeof rule === 'function') {
      const result = rule(value)
      if (result === false) {
        return { field, valid: false, message: `${fieldSchema.title} 验证失败` }
      }
      if (typeof result === 'string') {
        return { field, valid: false, message: result }
      }
    } else if (rule === false) {
      return { field, valid: false, message: `${fieldSchema.title} 不允许` }
    }
  }

  // 必填验证
  if (fieldSchema.required || false) {
    if (value === undefined || value === null || value === '') {
      return { field, valid: false, message: `${fieldSchema.title} 不能为空` }
    }
  }

  if (value === undefined || value === null || value === '') {
    return { field, valid: true }
  }

  // 类型验证
  switch (fieldSchema.type) {
    case 'number': {
      if (typeof value !== 'number' || isNaN(value)) {
        return { field, valid: false, message: `${fieldSchema.title} 必须是数字` }
      }
      if (fieldSchema.min !== undefined && value < fieldSchema.min) {
        return { field, valid: false, message: `${fieldSchema.title} 不能小于 ${fieldSchema.min}` }
      }
      if (fieldSchema.max !== undefined && value > fieldSchema.max) {
        return { field, valid: false, message: `${fieldSchema.title} 不能大于 ${fieldSchema.max}` }
      }
      break
    }
    case 'string': {
      if (typeof value !== 'string') {
        return { field, valid: false, message: `${fieldSchema.title} 必须是字符串` }
      }
      if (fieldSchema.minLength !== undefined && value.length < fieldSchema.minLength) {
        return { field, valid: false, message: `${fieldSchema.title} 长度不能少于 ${fieldSchema.minLength}` }
      }
      if (fieldSchema.maxLength !== undefined && value.length > fieldSchema.maxLength) {
        return { field, valid: false, message: `${fieldSchema.title} 长度不能超过 ${fieldSchema.maxLength}` }
      }
      if (fieldSchema.pattern) {
        const regex = new RegExp(fieldSchema.pattern)
        if (!regex.test(value)) {
          return { field, valid: false, message: `${fieldSchema.title} 格式不正确` }
        }
      }
      break
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        return { field, valid: false, message: `${fieldSchema.title} 必须是布尔值` }
      }
      break
    }
    case 'array': {
      if (!Array.isArray(value)) {
        return { field, valid: false, message: `${fieldSchema.title} 必须是数组` }
      }
      if (fieldSchema.min !== undefined && value.length < fieldSchema.min) {
        return { field, valid: false, message: `${fieldSchema.title} 至少需要 ${fieldSchema.min} 项` }
      }
      if (fieldSchema.max !== undefined && value.length > fieldSchema.max) {
        return { field, valid: false, message: `${fieldSchema.title} 最多 ${fieldSchema.max} 项` }
      }
      break
    }
  }

  return { field, valid: true }
}

// ================================================================
//  组件定义
// ================================================================

export const JsonSchemaForm = defineComponent({
  name: 'LytJsonSchemaForm',

  props: {
    schema: {
      type: Object as () => FormSchema,
      required: true,
    },
    modelValue: {
      type: Object as () => Record<string, any>,
      default: () => ({}),
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    labelWidth: {
      type: String,
      default: '120px',
    },
    rules: {
      type: Object as () => Record<string, any>,
      default: () => ({}),
    },
  },

  setup(props, { emit, slots }) {
    /** 表单数据（内部状态） */
    const formData = reactive<Record<string, any>>({ ...props.modelValue })

    /** 字段验证错误 */
    const fieldErrors = reactive<Record<string, string>>({})

    /** 是否正在验证 */
    const isValidating = ref(false)

    /** 同步 props.modelValue 到 formData */
    watch(() => props.modelValue, (newVal) => {
      for (const key in newVal) {
        formData[key] = newVal[key]
      }
    }, { deep: true })

    /** 获取字段列表 */
    const fieldList = computed(() => {
      const fields: Array<{ key: string; schema: FormFieldSchema; required: boolean }> = []
      if (!props.schema || !props.schema.properties) return fields

      for (const [key, fieldSchema] of Object.entries(props.schema.properties)) {
        fields.push({
          key,
          schema: fieldSchema,
          required: props.schema.required?.includes(key) || false,
        })
      }
      return fields
    })

    /** 更新字段值 */
    const updateField = (key: string, value: any) => {
      formData[key] = value
      // 清除该字段的错误
      delete fieldErrors[key]
      emit('update:modelValue', { ...formData })
    }

    /** 验证所有字段 */
    const validate = (): boolean => {
      isValidating.value = true
      let allValid = true

      for (const field of fieldList.value) {
        const result = validateField(
          field.key,
          formData[field.key],
          { ...field.schema, required: field.required },
          props.rules,
        )
        if (!result.valid) {
          fieldErrors[field.key] = result.message || '验证失败'
          allValid = false
        } else {
          delete fieldErrors[field.key]
        }
      }

      isValidating.value = false
      emit('validate', { valid: allValid, errors: { ...fieldErrors } })
      return allValid
    }

    /** 验证单个字段 */
    const validateFieldFn = (key: string): boolean => {
      const field = fieldList.value.find((f) => f.key === key)
      if (!field) return true

      const result = validateField(
        key,
        formData[key],
        { ...field.schema, required: field.required },
        props.rules,
      )

      if (!result.valid) {
        fieldErrors[key] = result.message || '验证失败'
        return false
      } else {
        delete fieldErrors[key]
        return true
      }
    }

    /** 重置表单 */
    const resetFields = () => {
      for (const key of Object.keys(formData)) {
        delete formData[key]
      }
      for (const key of Object.keys(fieldErrors)) {
        delete fieldErrors[key]
      }
      // 设置默认值
      if (props.schema && props.schema.properties) {
        for (const [key, fieldSchema] of Object.entries(props.schema.properties)) {
          if (fieldSchema.default !== undefined) {
            formData[key] = fieldSchema.default
          }
        }
      }
      emit('update:modelValue', { ...formData })
    }

    /** 提交表单 */
    const handleSubmit = () => {
      if (validate()) {
        emit('submit', { ...formData })
      }
    }

    /** 获取字段的输入类型 */
    const getInputType = (fieldSchema: FormFieldSchema): string => {
      switch (fieldSchema.type) {
        case 'number': return 'number'
        case 'date': return 'date'
        case 'boolean': return 'checkbox'
        case 'textarea': return 'textarea'
        case 'select': return 'select'
        case 'array': return 'array'
        default: return 'text'
      }
    }

    /** 获取 select 选项 */
    const getSelectOptions = (fieldSchema: FormFieldSchema): Array<{ label: string; value: any }> => {
      if (!fieldSchema.enum) return []
      return fieldSchema.enum.map((item) => {
        if (typeof item === 'object' && item !== null && 'label' in item && 'value' in item) {
          return item as { label: string; value: any }
        }
        return { label: String(item), value: item }
      })
    }

    /** 获取字段标签样式 */
    const getLabelStyle = (): Record<string, string> => {
      return {
        width: props.labelWidth,
        minWidth: props.labelWidth,
      }
    }

    /** 初始化默认值 */
    const initDefaults = () => {
      if (props.schema && props.schema.properties) {
        for (const [key, fieldSchema] of Object.entries(props.schema.properties)) {
          if (formData[key] === undefined && fieldSchema.default !== undefined) {
            formData[key] = fieldSchema.default
          }
        }
      }
    }

    initDefaults()

    return {
      formData, fieldErrors, isValidating, fieldList,
      updateField, validate, validateFieldFn, resetFields,
      handleSubmit, getInputType, getSelectOptions, getLabelStyle,
      slots,
    }
  },

  template: `
    <form class="lyt-json-schema-form" @submit.prevent="handleSubmit">
      <div
        v-for="field in fieldList"
        :key="field.key"
        class="lyt-json-schema-form__item {fieldErrors[field.key] ? 'lyt-json-schema-form__item--error' : ''}"
      >
        <label
          class="lyt-json-schema-form__label"
          :style="getLabelStyle()"
        >
          {{ field.schema.title }}
          <span v-if="field.required" class="lyt-json-schema-form__required">*</span>
        </label>
        <div class="lyt-json-schema-form__control">
          <!-- text / number / date -->
          <input
            v-if="getInputType(field.schema) === 'text' || getInputType(field.schema) === 'number' || getInputType(field.schema) === 'date'"
            type="{getInputType(field.schema)}"
            class="lyt-json-schema-form__input"
            :value="formData[field.key] || ''"
            :placeholder="field.schema.placeholder || ''"
            :disabled="readonly || field.schema.disabled"
            :readonly="readonly || field.schema.readonly"
            :min="field.schema.min"
            :max="field.schema.max"
            :step="field.schema.step"
            :maxlength="field.schema.maxLength"
            @input="updateField(field.key, $event.target.value)"
            @blur="validateFieldFn(field.key)"
          />

          <!-- textarea -->
          <textarea
            v-if="getInputType(field.schema) === 'textarea'"
            class="lyt-json-schema-form__textarea"
            :value="formData[field.key] || ''"
            :placeholder="field.schema.placeholder || ''"
            :disabled="readonly || field.schema.disabled"
            :readonly="readonly || field.schema.readonly"
            :maxlength="field.schema.maxLength"
            rows="3"
            @input="updateField(field.key, $event.target.value)"
            @blur="validateFieldFn(field.key)"
          ></textarea>

          <!-- checkbox (boolean) -->
          <label v-if="getInputType(field.schema) === 'checkbox'" class="lyt-json-schema-form__checkbox">
            <input
              type="checkbox"
              :checked="!!formData[field.key]"
              :disabled="readonly || field.schema.disabled"
              @change="updateField(field.key, $event.target.checked)"
            />
            <span>{{ field.schema.description || '' }}</span>
          </label>

          <!-- select -->
          <select
            v-if="getInputType(field.schema) === 'select'"
            class="lyt-json-schema-form__select"
            :value="formData[field.key] || ''"
            :disabled="readonly || field.schema.disabled"
            @change="updateField(field.key, $event.target.value)"
          >
            <option value="" disabled>{{ field.schema.placeholder || '请选择' }}</option>
            <option
              v-for="opt in getSelectOptions(field.schema)"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>

          <!-- array (简单 tag 输入) -->
          <div v-if="getInputType(field.schema) === 'array'" class="lyt-json-schema-form__array">
            <span
              v-for="(item, idx) in (formData[field.key] || [])"
              :key="idx"
              class="lyt-json-schema-form__tag"
            >
              {{ item }}
              <button
                type="button"
                class="lyt-json-schema-form__tag-remove"
                :disabled="readonly"
                @click="updateField(field.key, (formData[field.key] || []).filter((_: any, i: number) => i !== idx))"
              >&times;</button>
            </span>
          </div>

          <!-- 描述 -->
          <div v-if="field.schema.description && getInputType(field.schema) !== 'checkbox'" class="lyt-json-schema-form__description">
            {{ field.schema.description }}
          </div>

          <!-- 错误信息 -->
          <div v-if="fieldErrors[field.key]" class="lyt-json-schema-form__error">
            {{ fieldErrors[field.key] }}
          </div>
        </div>
      </div>

      <!-- 默认插槽（自定义按钮等） -->
      <div class="lyt-json-schema-form__actions">
        <slot name="actions" :validate="validate" :reset="resetFields" :submit="handleSubmit" :data="formData">
          <button type="submit" class="lyt-json-schema-form__btn lyt-json-schema-form__btn--primary" :disabled="readonly">
            提交
          </button>
          <button type="button" class="lyt-json-schema-form__btn" @click="resetFields" :disabled="readonly">
            重置
          </button>
        </slot>
      </div>
    </form>
  `,

  styles: `
    .lyt-json-schema-form {
      font-size: 14px;
      color: #606266;
    }
    .lyt-json-schema-form__item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .lyt-json-schema-form__item--error .lyt-json-schema-form__input,
    .lyt-json-schema-form__item--error .lyt-json-schema-form__textarea,
    .lyt-json-schema-form__item--error .lyt-json-schema-form__select {
      border-color: #f56c6c;
    }
    .lyt-json-schema-form__label {
      display: inline-flex;
      align-items: center;
      padding-top: 8px;
      font-weight: 500;
      color: #303133;
      flex-shrink: 0;
    }
    .lyt-json-schema-form__required {
      color: #f56c6c;
      margin-left: 4px;
    }
    .lyt-json-schema-form__control {
      flex: 1;
      min-width: 0;
    }
    .lyt-json-schema-form__input,
    .lyt-json-schema-form__textarea,
    .lyt-json-schema-form__select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
      color: #606266;
      background-color: #fff;
      box-sizing: border-box;
      transition: border-color 0.2s;
      outline: none;
    }
    .lyt-json-schema-form__input:focus,
    .lyt-json-schema-form__textarea:focus,
    .lyt-json-schema-form__select:focus {
      border-color: #409eff;
    }
    .lyt-json-schema-form__input:disabled,
    .lyt-json-schema-form__textarea:disabled,
    .lyt-json-schema-form__select:disabled {
      background-color: #f5f7fa;
      cursor: not-allowed;
    }
    .lyt-json-schema-form__textarea {
      resize: vertical;
    }
    .lyt-json-schema-form__checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 8px;
      cursor: pointer;
    }
    .lyt-json-schema-form__checkbox input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .lyt-json-schema-form__array {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 0;
    }
    .lyt-json-schema-form__tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background-color: #ecf5ff;
      color: #409eff;
      border-radius: 4px;
      font-size: 12px;
    }
    .lyt-json-schema-form__tag-remove {
      border: none;
      background: none;
      color: #409eff;
      cursor: pointer;
      font-size: 14px;
      padding: 0 2px;
    }
    .lyt-json-schema-form__tag-remove:hover {
      color: #f56c6c;
    }
    .lyt-json-schema-form__description {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
    .lyt-json-schema-form__error {
      font-size: 12px;
      color: #f56c6c;
      margin-top: 4px;
    }
    .lyt-json-schema-form__actions {
      display: flex;
      gap: 12px;
      padding-top: 8px;
    }
    .lyt-json-schema-form__btn {
      padding: 8px 20px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      background-color: #fff;
      color: #606266;
      transition: all 0.2s;
    }
    .lyt-json-schema-form__btn:hover {
      color: #409eff;
      border-color: #c6e2ff;
      background-color: #ecf5ff;
    }
    .lyt-json-schema-form__btn--primary {
      background-color: #409eff;
      border-color: #409eff;
      color: #fff;
    }
    .lyt-json-schema-form__btn--primary:hover {
      background-color: #66b1ff;
      border-color: #66b1ff;
      color: #fff;
    }
    .lyt-json-schema-form__btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
})
