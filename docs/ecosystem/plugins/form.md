# plugin-form 表单验证插件

> 基于 `@lytjs/plugin-form` 的官方表单验证解决方案

## 特性

- ✨ **声明式验证规则** - 内置常用验证规则，支持自定义
- 🔄 **响应式状态管理** - 基于 signal 的响应式表单状态
- 🎯 **异步验证支持** - 支持异步验证函数，如用户名唯一性检查
- 🌐 **国际化错误消息** - 支持自定义错误消息
- 📦 **零第三方依赖** - 遵循 LytJS 零依赖原则

## 安装

```bash
npm install @lytjs/plugin-form
# 或
pnpm add @lytjs/plugin-form
```

## 基础用法

### 创建表单管理器

```typescript
import { createFormManager } from '@lytjs/plugin-form';

// 创建表单实例
const form = createFormManager({
  fields: {
    username: {
      initialValue: '',
      rules: [{ type: 'required', message: '用户名不能为空' }],
    },
    email: {
      initialValue: '',
      rules: [{ type: 'required' }, { type: 'email' }],
    },
  },
});
```

### 字段操作

```typescript
// 获取字段值
const username = form.getValue('username');

// 设置字段值
form.setValue('username', 'john');

// 获取所有值
const values = form.getValues();

// 批量设置值
form.setValues({
  username: 'john',
  email: 'john@example.com',
});

// 获取/设置错误
const errors = form.getErrors('email');
form.setErrors('email', ['邮箱格式不正确']);
```

### 表单验证

```typescript
// 验证单个字段
const isValid = await form.validateField('email');

// 验证整个表单
const formValid = await form.validate();
if (formValid) {
  // 提交数据
  const data = form.getValues();
  await fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

### 表单提交

```typescript
const result = await form.submit(async (values) => {
  // 在这里处理表单提交
  const response = await fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(values),
  });
  return response.json();
});

if (result) {
  console.log('表单提交成功');
}
```

## 内置验证规则

### 必填验证

```typescript
const rules = [{ type: 'required', message: '此字段为必填项' }];
```

### 邮箱验证

```typescript
const rules = [
  { type: 'required', message: '邮箱不能为空' },
  { type: 'email', message: '请输入有效的邮箱地址' },
];
```

### 手机号验证

```typescript
const rules = [{ type: 'phone', message: '请输入有效的手机号码' }];
```

### 数字验证

```typescript
const rules = [{ type: 'number', message: '请输入数字' }];
```

### 范围验证

```typescript
const rules = [
  { type: 'min', value: 18, message: '年龄不能小于18岁' },
  { type: 'max', value: 100, message: '年龄不能大于100岁' },
];
```

### 长度验证

```typescript
const rules = [
  { type: 'minLength', value: 6, message: '密码至少6个字符' },
  { type: 'maxLength', value: 20, message: '密码不能超过20个字符' },
];
```

### 正则验证

```typescript
const rules = [{ type: 'pattern', value: /^[a-zA-Z]+$/, message: '只能输入英文字母' }];
```

### 自定义验证

```typescript
const rules = [
  {
    type: 'custom',
    validator: (value, allValues) => {
      // value: 当前字段的值
      // allValues: 所有字段的值
      return String(value).includes('admin');
    },
    message: '用户名不能包含 admin',
  },
];
```

### 异步验证

```typescript
const rules = [
  {
    type: 'custom',
    validator: async (value) => {
      // 检查用户名是否已被注册
      const response = await fetch(`/api/check-username?username=${value}`);
      const data = await response.json();
      return !data.exists; // 返回 true 表示验证通过
    },
    message: '用户名已被注册',
  },
];
```

### 组合验证规则

```typescript
const rules = [
  { type: 'required', message: '密码不能为空' },
  { type: 'minLength', value: 8, message: '密码至少8个字符' },
  { type: 'maxLength', value: 20, message: '密码不能超过20个字符' },
  {
    type: 'custom',
    validator: (value) => /[A-Z]/.test(value),
    message: '密码必须包含大写字母',
  },
  {
    type: 'custom',
    validator: (value) => /[a-z]/.test(value),
    message: '密码必须包含小写字母',
  },
  {
    type: 'custom',
    validator: (value) => /[0-9]/.test(value),
    message: '密码必须包含数字',
  },
];
```

## 表单状态

### 访问表单状态

```typescript
// 获取整个表单状态
const state = form.state;

console.log(state.fields); // 所有字段状态
console.log(state.isValid); // 表单是否有效
console.log(state.isDirty); // 表单是否被修改
console.log(state.isTouched); // 表单是否被触碰
console.log(state.isSubmitting); // 表单是否正在提交
```

### 字段状态

```typescript
const state = form.state;
const emailField = state.fields.email;

console.log(emailField.value); // 字段值
console.log(emailField.errors); // 错误消息数组
console.log(emailField.touched); // 是否被触碰
console.log(emailField.valid); // 字段是否有效
console.log(emailField.validating); // 是否正在验证
console.log(emailField.disabled); // 是否禁用
console.log(emailField.readOnly); // 是否只读
```

### 字段操作

```typescript
// 标记字段为已触碰
form.touchField('email');

// 触碰所有字段
form.touchAllFields();

// 设置字段禁用状态
form.setFieldDisabled('email', true);

// 设置字段只读状态
form.setFieldReadOnly('email', true);

// 重置表单（清除错误和触碰状态）
form.reset();

// 重置为初始值
form.resetToInitial();
```

## 动态字段

### 动态注册字段

```typescript
// 动态添加字段
form.registerField('phone', {
  initialValue: '',
  rules: [{ type: 'required' }],
});

// 动态移除字段
form.unregisterField('phone');
```

### 条件验证

```typescript
const form = createFormManager({
  fields: {
    membershipType: {
      initialValue: 'free',
    },
    couponCode: {
      initialValue: '',
      rules: [
        {
          type: 'custom',
          validator: (value, allValues) => {
            // 只有付费会员需要填写优惠码
            if (allValues.membershipType === 'premium' && !value) {
              return false;
            }
            return true;
          },
          message: '付费会员必须填写优惠码',
        },
      ],
    },
  },
});
```

## 表单提交状态

### 处理提交状态

```typescript
const state = form.state;

if (state.isSubmitting) {
  // 显示加载状态
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('submit-btn').textContent = '提交中...';
}

if (state.isValidating) {
  // 显示验证状态
  console.log('正在验证表单...');
}
```

### 提交后处理

```typescript
await form.submit(async (values) => {
  try {
    await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(values),
    });
    // 成功后重置表单
    form.resetToInitial();
  } catch (error) {
    // 处理错误
    console.error('提交失败:', error);
  }
});
```

## 最佳实践

### 1. 实时验证 vs 提交验证

```typescript
// 方式一：实时验证（在字段变化时验证）
const form = createFormManager({
  validateOnChange: true,
  validateOnBlur: false,
});

// 方式二：失焦验证（在字段失焦时验证）
const form = createFormManager({
  validateOnChange: false,
  validateOnBlur: true,
});

// 方式三：仅提交验证
const form = createFormManager({
  validateOnSubmit: true,
});
```

### 2. 错误消息展示

```typescript
const state = form.state;
const emailField = state.fields.email;

if (emailField.touched && emailField.errors.length > 0) {
  // 显示错误消息
  console.log(emailField.errors[0]); // "请输入有效的邮箱地址"
}
```

### 3. 防重复提交

```typescript
const form = createFormManager();

async function handleSubmit() {
  const state = form.state;

  // 如果正在提交或表单无效，不处理
  if (state.isSubmitting || !state.isValid) {
    return;
  }

  await form.submit(async (values) => {
    // 提交逻辑
  });
}
```

### 4. 性能优化

```typescript
// 使用 computed 避免不必要的重新渲染
import { computed } from '@lytjs/reactivity';

const emailErrors = computed(() => {
  return form.state.fields.email.errors;
});

// 只在错误消息变化时更新
effect(() => {
  console.log('邮箱错误:', emailErrors.value);
});
```

## 集成示例

### 与 UI 组件集成

```typescript
import { createFormManager } from '@lytjs/plugin-form';

const form = createFormManager({
  fields: {
    username: { rules: [{ type: 'required' }] },
    email: { rules: [{ type: 'required' }, { type: 'email' }] },
    password: { rules: [{ type: 'required' }, { type: 'minLength', value: 6 }] },
  },
});

// 在组件中使用
function LoginForm() {
  const state = form.state;

  return `
    <form>
      <input
        type="text"
        value="${state.fields.username.value}"
        onInput="form.setValue('username', this.value)"
      />
      ${
        state.fields.username.touched && state.fields.username.errors[0]
          ? `<span class="error">${state.fields.username.errors[0]}</span>`
          : ''
      }

      <input
        type="email"
        value="${state.fields.email.value}"
        onInput="form.setValue('email', this.value)"
      />

      <button
        type="submit"
        disabled="${state.isSubmitting || !state.isValid}"
      >
        ${state.isSubmitting ? '提交中...' : '登录'}
      </button>
    </form>
  `;
}
```

### 与第三方 API 集成

```typescript
const form = createFormManager({
  fields: {
    email: {
      rules: [
        { type: 'required', message: '邮箱不能为空' },
        { type: 'email', message: '邮箱格式不正确' },
        {
          type: 'custom',
          validator: async (value) => {
            // 检查邮箱是否可用
            const res = await fetch(`/api/check-email?email=${value}`);
            const data = await res.json();
            return data.available;
          },
          message: '该邮箱已被注册',
        },
      ],
    },
  },
});
```

## API 参考

### createFormManager

```typescript
function createFormManager(options?: FormOptions): FormInstance;
```

### FormOptions

| 选项               | 类型                          | 默认值  | 说明       |
| ------------------ | ----------------------------- | ------- | ---------- |
| `fields`           | `Record<string, FieldConfig>` | `{}`    | 字段配置   |
| `initialValues`    | `Record<string, unknown>`     | `{}`    | 初始值     |
| `validateOnSubmit` | `boolean`                     | `true`  | 提交时验证 |
| `validateOnChange` | `boolean`                     | `false` | 变化时验证 |
| `validateOnBlur`   | `boolean`                     | `false` | 失焦时验证 |

### FormInstance

| 方法                    | 返回值                    | 说明             |
| ----------------------- | ------------------------- | ---------------- |
| `getValue(name)`        | `unknown`                 | 获取字段值       |
| `setValue(name, value)` | `void`                    | 设置字段值       |
| `getValues()`           | `Record<string, unknown>` | 获取所有值       |
| `setValues(values)`     | `void`                    | 批量设置值       |
| `validate()`            | `Promise<boolean>`        | 验证整个表单     |
| `validateField(name)`   | `Promise<boolean>`        | 验证单个字段     |
| `submit(callback)`      | `Promise<boolean>`        | 提交表单         |
| `reset()`               | `void`                    | 重置表单         |
| `resetToInitial()`      | `void`                    | 重置为初始值     |
| `touchField(name)`      | `void`                    | 标记字段为已触碰 |
| `touchAllFields()`      | `void`                    | 触碰所有字段     |

## 下一步

- 查看 [官方插件使用指南](./官方插件使用指南.md)
- 查看 [plugin-animation 动画插件](../ecosystem/plugins/animation.md)
- 查看 [实战案例：表单验证](../tutorial/表单验证实战案例.md)
