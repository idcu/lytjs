# 表单验证实战案例

本案例将教你使用 LytJS 构建一个完整的表单验证系统，包含实时验证、错误提示、表单提交等功能。

## 📋 功能特性

- ✅ 多种验证规则（必填、邮箱、手机号、密码强度等）
- ✅ 实时验证反馈
- ✅ 错误信息展示
- ✅ 表单提交与重置
- ✅ 密码确认验证
- ✅ 自定义验证规则

## 📁 项目结构

```
src/
├── components/
│   ├── FormInput.ts        # 表单输入组件
│   ├── FormButton.ts       # 表单按钮组件
│   └── ValidationMessage.ts # 验证消息组件
├── validators/
│   └── rules.ts           # 验证规则
├── composables/
│   └── useForm.ts         # 表单逻辑组合
├── types/
│   └── form.ts            # 类型定义
└── App.ts                 # 应用入口
```

## 1. 类型定义

```typescript
// types/form.ts

export interface ValidationRule {
  validator: (value: unknown) => boolean;
  message: string;
}

export interface FieldConfig {
  name: string;
  label: string;
  rules: ValidationRule[];
  initialValue?: string;
}

export interface FormField {
  value: signal<string>;
  error: signal<string>;
  touched: signal<boolean>;
  validate: () => boolean;
}

export interface FormState {
  fields: Map<string, FormField>;
  isValid: signal<boolean>;
  isSubmitting: signal<boolean>;
}
```

## 2. 验证规则

```typescript
// validators/rules.ts

import type { ValidationRule } from '../types/form';

export const required = (message = '此字段必填'): ValidationRule => ({
  validator: (value: unknown) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  },
  message,
});

export const email = (message = '请输入有效的邮箱地址'): ValidationRule => ({
  validator: (value: unknown) => {
    if (typeof value !== 'string' || !value) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  message,
});

export const minLength = (min: number, message?: string): ValidationRule => ({
  validator: (value: unknown) => {
    if (typeof value !== 'string') return false;
    return value.length >= min;
  },
  message: message || `至少需要 ${min} 个字符`,
});

export const maxLength = (max: number, message?: string): ValidationRule => ({
  validator: (value: unknown) => {
    if (typeof value !== 'string') return true;
    return value.length <= max;
  },
  message: message || `最多 ${max} 个字符`,
});

export const pattern = (regex: RegExp, message: string): ValidationRule => ({
  validator: (value: unknown) => {
    if (typeof value !== 'string') return false;
    return regex.test(value);
  },
  message,
});

export const phone = (message = '请输入有效的手机号码'): ValidationRule => ({
  validator: (value: unknown) => {
    if (typeof value !== 'string' || !value) return true;
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(value);
  },
  message,
});

export const password = (message = '密码强度不足'): ValidationRule => ({
  validator: (value: unknown) => {
    if (typeof value !== 'string' || !value) return false;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const isLongEnough = value.length >= 8;
    return hasUpperCase && hasLowerCase && hasNumber && isLongEnough;
  },
  message,
});

export const confirmed = (
  getTargetValue: () => string,
  message = '两次输入的密码不一致'
): ValidationRule => ({
  validator: (value: unknown) => {
    return value === getTargetValue();
  },
  message,
});

export const custom = (
  validatorFn: (value: unknown) => boolean,
  message: string
): ValidationRule => ({
  validator: validatorFn,
  message,
});
```

## 3. 表单组合函数

```typescript
// composables/useForm.ts

import { signal, computed, watch } from '@lytjs/reactivity';
import type { FieldConfig, FormState, FormField, ValidationRule } from '../types/form';

export interface UseFormOptions {
  fields: FieldConfig[];
  onSubmit?: (values: Record<string, string>) => void | Promise<void>;
  onValidate?: (errors: Record<string, string>) => void;
}

export function useForm(options: UseFormOptions): FormState {
  const { fields, onSubmit, onValidate } = options;

  const formState: FormState = {
    fields: new Map(),
    isValid: signal(false),
    isSubmitting: signal(false),
  };

  for (const fieldConfig of fields) {
    const value = signal(fieldConfig.initialValue || '');
    const error = signal('');
    const touched = signal(false);

    const validate = (): boolean => {
      for (const rule of fieldConfig.rules) {
        if (!rule.validator(value())) {
          error.set(rule.message);
          return false;
        }
      }
      error.set('');
      return true;
    };

    watch(value, () => {
      if (touched()) {
        validate();
      }
    });

    watch(touched, (isTouched) => {
      if (isTouched) {
        validate();
      }
    });

    const field: FormField = {
      value,
      error,
      touched,
      validate,
    };

    formState.fields.set(fieldConfig.name, field);
  }

  const validateAll = (): boolean => {
    let isFormValid = true;
    const errors: Record<string, string> = {};

    formState.fields.forEach((field, name) => {
      field.touched.set(true);
      const isFieldValid = field.validate();
      if (!isFieldValid) {
        isFormValid = false;
        errors[name] = field.error();
      }
    });

    formState.isValid.set(isFormValid);

    if (onValidate) {
      onValidate(errors);
    }

    return isFormValid;
  };

  const getValues = (): Record<string, string> => {
    const values: Record<string, string> = {};
    formState.fields.forEach((field, name) => {
      values[name] = field.value();
    });
    return values;
  };

  const reset = (): void => {
    formState.fields.forEach((field) => {
      field.value.set('');
      field.error.set('');
      field.touched.set(false);
    });
    formState.isValid.set(false);
  };

  const submit = async (): Promise<void> => {
    if (!validateAll()) {
      return;
    }

    formState.isSubmitting.set(true);

    try {
      const values = getValues();
      if (onSubmit) {
        await onSubmit(values);
      }
    } finally {
      formState.isSubmitting.set(false);
    }
  };

  return {
    ...formState,
    validateAll,
    getValues,
    reset,
    submit,
  };
}
```

## 4. 表单输入组件

```typescript
// components/FormInput.ts

import { defineComponent, computed } from '@lytjs/component';
import type { FormField } from '../types/form';

export interface FormInputProps {
  field: FormField;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number';
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export const FormInput = defineComponent({
  name: 'FormInput',
  props: {
    field: { type: 'object', required: true },
    type: { type: 'string', default: 'text' },
    placeholder: { type: 'string', default: '' },
    label: { type: 'string', default: '' },
    disabled: { type: 'boolean', default: false },
  },
  setup(props: FormInputProps) {
    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      props.field.value.set(target.value);
    };

    const handleBlur = () => {
      props.field.touched.set(true);
    };

    const inputClasses = computed(() => {
      const classes = ['form-input'];
      if (props.field.touched() && props.field.error()) {
        classes.push('form-input--error');
      }
      if (props.field.touched() && !props.field.error() && props.field.value()) {
        classes.push('form-input--valid');
      }
      return classes.join(' ');
    });

    return {
      handleInput,
      handleBlur,
      inputClasses,
    };
  },
  template: `
    <div class="form-field">
      <label v-if="label" class="form-label">{{ label }}</label>
      <input
        :class="inputClasses"
        :type="type"
        :value="field.value()"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="handleInput"
        @blur="handleBlur"
      />
      <ValidationMessage :error="field.error()" :touched="field.touched()" />
    </div>
  `,
});
```

## 5. 验证消息组件

```typescript
// components/ValidationMessage.ts

import { defineComponent, computed } from '@lytjs/component';

export interface ValidationMessageProps {
  error: string;
  touched: boolean;
  successMessage?: string;
}

export const ValidationMessage = defineComponent({
  name: 'ValidationMessage',
  props: {
    error: { type: 'string', default: '' },
    touched: { type: 'boolean', default: false },
    successMessage: { type: 'string', default: '' },
  },
  setup(props: ValidationMessageProps) {
    const messageClass = computed(() => {
      if (!props.touched) return '';
      return props.error ? 'validation-message--error' : 'validation-message--success';
    });

    const message = computed(() => {
      if (!props.touched) return '';
      return props.error || (props.successMessage || '');
    });

    return {
      messageClass,
      message,
    };
  },
  template: `
    <transition name="fade">
      <span v-if="message" :class="['validation-message', messageClass]">
        {{ message }}
      </span>
    </transition>
  `,
});
```

## 6. 表单按钮组件

```typescript
// components/FormButton.ts

import { defineComponent, computed } from '@lytjs/component';

export interface FormButtonProps {
  type?: 'primary' | 'secondary' | 'danger';
  nativeType?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  text?: string;
}

export const FormButton = defineComponent({
  name: 'FormButton',
  props: {
    type: { type: 'string', default: 'primary' },
    nativeType: { type: 'string', default: 'button' },
    disabled: { type: 'boolean', default: false },
    loading: { type: 'boolean', default: false },
    text: { type: 'string', default: '提交' },
  },
  setup(props: FormButtonProps) {
    const buttonClasses = computed(() => {
      const classes = ['form-button', `form-button--${props.type}`];
      if (props.disabled || props.loading) {
        classes.push('form-button--disabled');
      }
      if (props.loading) {
        classes.push('form-button--loading');
      }
      return classes.join(' ');
    });

    return {
      buttonClasses,
    };
  },
  template: `
    <button
      :class="buttonClasses"
      :type="nativeType"
      :disabled="disabled || loading"
    >
      <span v-if="loading" class="form-button__spinner"></span>
      {{ text }}
    </button>
  `,
});
```

## 7. 注册表单应用

```typescript
// App.ts

import { defineComponent } from '@lytjs/component';
import { useForm } from './composables/useForm';
import { FormInput } from './components/FormInput';
import { FormButton } from './components/FormButton';
import {
  required,
  email,
  minLength,
  password,
  confirmed,
} from './validators/rules';

export const RegistrationForm = defineComponent({
  name: 'RegistrationForm',
  setup() {
    const passwordSignal = signal('');

    const form = useForm({
      fields: [
        {
          name: 'username',
          label: '用户名',
          initialValue: '',
          rules: [
            required('请输入用户名'),
            minLength(3, '用户名至少 3 个字符'),
            minLength(20, '用户名最多 20 个字符'),
          ],
        },
        {
          name: 'email',
          label: '邮箱',
          initialValue: '',
          rules: [required('请输入邮箱'), email('请输入有效的邮箱地址')],
        },
        {
          name: 'phone',
          label: '手机号',
          initialValue: '',
          rules: [
            required('请输入手机号'),
            pattern(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
          ],
        },
        {
          name: 'password',
          label: '密码',
          initialValue: '',
          rules: [
            required('请输入密码'),
            minLength(8, '密码至少 8 个字符'),
            password('密码必须包含大小写字母、数字和特殊字符'),
          ],
        },
        {
          name: 'confirmPassword',
          label: '确认密码',
          initialValue: '',
          rules: [
            required('请确认密码'),
            confirmed(() => passwordSignal(), '两次输入的密码不一致'),
          ],
        },
        {
          name: 'agreeTerms',
          label: '我已阅读并同意',
          initialValue: '',
          rules: [
            (value: unknown) => value === true || value === 'true',
            '请勾选同意条款',
          ] as any,
        },
      ],
      onSubmit: async (values) => {
        console.log('表单提交成功:', values);
        alert('注册成功！');
        form.reset();
      },
      onValidate: (errors) => {
        console.log('验证结果:', errors);
      },
    });

    const passwordField = form.fields.get('password');
    if (passwordField) {
      watch(
        () => passwordField.value(),
        (newValue) => {
          passwordSignal.set(newValue);
        }
      );
    }

    return {
      form,
    };
  },
  template: `
    <div class="registration-form">
      <h1 class="form-title">用户注册</h1>
      
      <form @submit.prevent="form.submit">
        <FormInput
          :field="form.fields.get('username')"
          label="用户名"
          placeholder="请输入用户名"
        />
        
        <FormInput
          :field="form.fields.get('email')"
          type="email"
          label="邮箱"
          placeholder="请输入邮箱"
        />
        
        <FormInput
          :field="form.fields.get('phone')"
          type="tel"
          label="手机号"
          placeholder="请输入手机号"
        />
        
        <FormInput
          :field="form.fields.get('password')"
          type="password"
          label="密码"
          placeholder="请输入密码"
        />
        
        <FormInput
          :field="form.fields.get('confirmPassword')"
          type="password"
          label="确认密码"
          placeholder="请再次输入密码"
        />
        
        <div class="form-checkbox">
          <input
            type="checkbox"
            id="agreeTerms"
            :checked="form.fields.get('agreeTerms')?.value()"
            @change="form.fields.get('agreeTerms')?.value.set(($event.target as HTMLInputElement).checked)"
            @blur="form.fields.get('agreeTerms')?.touched.set(true)"
          />
          <label for="agreeTerms">
            我已阅读并同意 <a href="#">《用户协议》</a> 和 <a href="#">《隐私政策》</a>
          </label>
          <span
            v-if="form.fields.get('agreeTerms')?.touched() && form.fields.get('agreeTerms')?.error()"
            class="error-text"
          >
            {{ form.fields.get('agreeTerms')?.error() }}
          </span>
        </div>
        
        <div class="form-actions">
          <FormButton
            type="secondary"
            native-type="reset"
            text="重置"
            @click="form.reset"
          />
          <FormButton
            type="primary"
            native-type="submit"
            :loading="form.isSubmitting()"
            text="注册"
          />
        </div>
      </form>
    </div>
  `,
});
```

## 8. 样式

```css
/* styles/form.css */

.registration-form {
  max-width: 480px;
  margin: 40px auto;
  padding: 32px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.form-title {
  text-align: center;
  margin-bottom: 32px;
  font-size: 24px;
  color: #333;
}

.form-field {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-input--error {
  border-color: #ff4d4f;
}

.form-input--error:focus {
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
}

.form-input--valid {
  border-color: #52c41a;
}

.form-checkbox {
  margin-bottom: 24px;
}

.form-checkbox input {
  margin-right: 8px;
}

.form-checkbox label {
  font-size: 14px;
  color: #666;
}

.form-checkbox a {
  color: #1890ff;
  text-decoration: none;
}

.form-checkbox a:hover {
  text-decoration: underline;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.form-button {
  flex: 1;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.form-button--primary {
  background: #1890ff;
  color: #fff;
}

.form-button--primary:hover {
  background: #40a9ff;
}

.form-button--secondary {
  background: #fff;
  color: #666;
  border: 1px solid #ddd;
}

.form-button--secondary:hover {
  color: #333;
  border-color: #999;
}

.form-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.validation-message {
  display: block;
  margin-top: 4px;
  font-size: 12px;
}

.validation-message--error {
  color: #ff4d4f;
}

.validation-message--success {
  color: #52c41a;
}

.error-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #ff4d4f;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

## 🎯 核心要点

### 1. 组合式函数设计

使用组合式函数将表单逻辑与视图分离，便于复用和测试：

```typescript
const form = useForm({
  fields: [...],
  onSubmit: handleSubmit,
});

// 获取表单状态
form.isValid()      // 表单是否有效
form.isSubmitting() // 是否正在提交
form.getValues()    // 获取所有字段值
form.reset()        // 重置表单
form.submit()       // 提交表单
```

### 2. 响应式验证

使用 `watch` 实现实时验证：

```typescript
watch(value, () => {
  if (touched()) {
    validate();
  }
});
```

### 3. 规则组合

通过组合不同规则实现复杂验证：

```typescript
{
  name: 'password',
  rules: [
    required(),
    minLength(8),
    password(),  // 自定义密码强度规则
  ],
}
```

### 4. 错误状态管理

- `touched` - 字段是否被访问过
- `error` - 当前错误信息
- `isValid` - 整个表单是否有效

## 📊 验证规则一览

| 规则 | 说明 | 示例 |
|------|------|------|
| `required` | 必填验证 | `required('不能为空')` |
| `email` | 邮箱格式 | `email()` |
| `phone` | 手机号格式 | `phone()` |
| `minLength` | 最小长度 | `minLength(8)` |
| `maxLength` | 最大长度 | `maxLength(20)` |
| `pattern` | 正则匹配 | `pattern(/^\d+$/, '仅数字')` |
| `password` | 密码强度 | `password()` |
| `confirmed` | 确认匹配 | `confirmed(() => passwordValue, '不一致')` |
| `custom` | 自定义规则 | `custom(v => v > 0, '必须正数')` |

## 🚀 运行项目

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test
```

## 📚 相关文档

- [表单处理教程](./forms.md)
- [最佳实践](./best-practices.md)
- [API 参考](../api/)

---

**下一步**：查看 [博客系统案例](./博客系统案例.md) 学习完整应用开发
