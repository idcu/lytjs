# 表单的 Proxy 便利性

本示例展示如何利用 Proxy 模式的深层响应式特性，简化表单开发。

## 基础表单

```ts
import { reactive, ref, computed, watch, watchEffect } from 'lyt'

// 使用 reactive 创建表单状态（自动深层响应式）
const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreement: false,
  role: 'user' as 'user' | 'admin' | 'editor',
  profile: {
    bio: '',
    website: '',
    social: {
      github: '',
      twitter: ''
    }
  }
})

const isSubmitting = ref(false)
const submitError = ref('')

// 计算属性：表单验证
const errors = computed(() => {
  const errs: Record<string, string> = {}

  if (form.username.length < 3) {
    errs.username = '用户名至少 3 个字符'
  }

  if (!form.email.includes('@')) {
    errs.email = '请输入有效的邮箱地址'
  }

  if (form.password.length < 6) {
    errs.password = '密码至少 6 个字符'
  }

  if (form.password !== form.confirmPassword) {
    errs.confirmPassword = '两次密码不一致'
  }

  if (!form.agreement) {
    errs.agreement = '请同意用户协议'
  }

  return errs
})

const isValid = computed(() => Object.keys(errors.value).length === 0)

// 实时验证
watchEffect(() => {
  if (form.username) {
    console.log(`用户名验证: ${errors.value.username || '通过'}`)
  }
})

// 提交
async function handleSubmit() {
  if (!isValid.value) return

  isSubmitting.value = true
  submitError.value = ''

  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('提交成功:', { ...form })
  } catch (err) {
    submitError.value = '提交失败，请重试'
  } finally {
    isSubmitting.value = false
  }
}

// 重置
function resetForm() {
  form.username = ''
  form.email = ''
  form.password = ''
  form.confirmPassword = ''
  form.agreement = false
  form.role = 'user'
  form.profile.bio = ''
  form.profile.website = ''
  form.profile.social.github = ''
  form.profile.social.twitter = ''
}
```

## 动态表单字段

Proxy 的深层响应式使得动态添加/删除字段非常自然。

```ts
import { reactive, computed, watchEffect } from 'lyt'

interface FormField {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  value: string | number
  options?: string[]
  required: boolean
}

// 动态表单
const dynamicForm = reactive<{
  fields: FormField[]
  data: Record<string, string | number>
}>({
  fields: [
    { key: 'name', label: '姓名', type: 'text', value: '', required: true },
    { key: 'age', label: '年龄', type: 'number', value: 0, required: false },
    { key: 'city', label: '城市', type: 'select', value: '', options: ['北京', '上海', '广州'], required: true }
  ],
  data: {}
})

// 初始化 data
for (const field of dynamicForm.fields) {
  dynamicForm.data[field.key] = field.value
}

// 计算属性：验证
const fieldErrors = computed(() => {
  const errs: Record<string, string> = {}
  for (const field of dynamicForm.fields) {
    if (field.required && !dynamicForm.data[field.key]) {
      errs[field.key] = `${field.label}不能为空`
    }
  }
  return errs
})

// 添加字段
function addField(field: FormField) {
  dynamicForm.fields.push(field)
  dynamicForm.data[field.key] = field.value
}

// 删除字段
function removeField(key: string) {
  const index = dynamicForm.fields.findIndex(f => f.key === key)
  if (index !== -1) {
    dynamicForm.fields.splice(index, 1)
    delete dynamicForm.data[key]
  }
}

// 使用
addField({
  key: 'phone',
  label: '手机号',
  type: 'text',
  value: '',
  required: true
})

// 修改数据（自动触发验证）
dynamicForm.data.name = '张三'
dynamicForm.data.city = '北京'

watchEffect(() => {
  console.log('字段错误:', fieldErrors.value)
})
```

## 嵌套表单（地址管理）

```ts
import { reactive, computed, watchEffect } from 'lyt'

const addressForm = reactive({
  addresses: [
    {
      id: 1,
      label: '家庭地址',
      province: '',
      city: '',
      district: '',
      detail: '',
      isDefault: true
    }
  ]
})

// 计算属性
const defaultAddress = computed(() => {
  return addressForm.addresses.find(a => a.isDefault) ?? null
})

const addressCount = computed(() => addressForm.addresses.length)

// 添加地址
function addAddress() {
  addressForm.addresses.push({
    id: Date.now(),
    label: `地址 ${addressForm.addresses.length + 1}`,
    province: '',
    city: '',
    district: '',
    detail: '',
    isDefault: addressForm.addresses.length === 0
  })
}

// 设为默认
function setDefault(id: number) {
  for (const addr of addressForm.addresses) {
    addr.isDefault = addr.id === id
  }
}

// 删除地址
function removeAddress(id: number) {
  const index = addressForm.addresses.findIndex(a => a.id === id)
  if (index === -1) return

  const wasDefault = addressForm.addresses[index].isDefault
  addressForm.addresses.splice(index, 1)

  // 如果删除的是默认地址，将第一个设为默认
  if (wasDefault && addressForm.addresses.length > 0) {
    addressForm.addresses[0].isDefault = true
  }
}

// 监听默认地址变化
watchEffect(() => {
  const addr = defaultAddress.value
  if (addr) {
    console.log(`默认地址: ${addr.province} ${addr.city} ${addr.detail}`)
  }
})

// 使用
addAddress()
addressForm.addresses[0].province = '北京市'
addressForm.addresses[0].city = '朝阳区'
addressForm.addresses[0].detail = '某某街道 123 号'
```

## 表单组合函数

```ts
import { reactive, ref, computed, watch } from 'lyt'

// 可复用的表单组合函数
function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, (value: any) => string | null>>
) {
  const values = reactive<T>({ ...initialValues })
  const errors = reactive<Partial<Record<keyof T, string>>>({})
  const isDirty = ref(false)
  const isSubmitting = ref(false)

  // 验证单个字段
  function validateField(key: keyof T): string | null {
    const rule = validationRules[key]
    if (rule) {
      const error = rule(values[key])
      if (error) {
        errors[key] = error
        return error
      }
    }
    delete errors[key]
    return null
  }

  // 验证所有字段
  function validateAll(): boolean {
    let valid = true
    for (const key of Object.keys(validationRules) as Array<keyof T>) {
      if (validateField(key)) {
        valid = false
      }
    }
    return valid
  }

  // 设置字段值
  function setField<K extends keyof T>(key: K, value: T[K]) {
    values[key] = value
    isDirty.value = true
    validateField(key)
  }

  // 重置表单
  function reset() {
    for (const key in initialValues) {
      values[key] = initialValues[key]
    }
    for (const key in errors) {
      delete errors[key]
    }
    isDirty.value = false
  }

  // 提交
  async function submit(onValid: (values: T) => Promise<void>) {
    if (!validateAll()) return false

    isSubmitting.value = true
    try {
      await onValid({ ...values })
      return true
    } finally {
      isSubmitting.value = false
    }
  }

  const isValid = computed(() => Object.keys(errors).length === 0)

  return {
    values,
    errors,
    isDirty,
    isSubmitting,
    isValid,
    setField,
    validateField,
    validateAll,
    reset,
    submit
  }
}

// 使用组合函数
const loginForm = useForm(
  { username: '', password: '' },
  {
    username: (v) => v.length < 3 ? '用户名至少 3 个字符' : null,
    password: (v) => v.length < 6 ? '密码至少 6 个字符' : null
  }
)

// 修改字段
loginForm.setField('username', 'admin')
loginForm.setField('password', '123456')

console.log(loginForm.isValid.value)  // true

// 提交
await loginForm.submit(async (values) => {
  console.log('登录:', values)
})
```

## Proxy 表单的优势总结

1. **深层响应式**：嵌套对象自动响应式，无需手动管理
2. **直接赋值**：`form.field = value` 比 `fieldRef.value = value` 更简洁
3. **天然支持动态字段**：添加/删除属性自动触发更新
4. **与 computed 完美配合**：表单验证逻辑可以声明式地写在 computed 中
5. **数组操作**：`push`、`splice` 等数组方法自动触发更新
