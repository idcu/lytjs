# @lytjs/plugin-validation

LytJS 官方表单验证插件，提供类型安全的表单验证能力。

## 安装

```bash
npm install @lytjs/plugin-validation
# 或者
yarn add @lytjs/plugin-validation
# 或者
pnpm add @lytjs/plugin-validation
```

## 快速开始

### 作为插件使用

```typescript
import { createApp } from '@lytjs/core';
import pluginValidation from '@lytjs/plugin-validation';

const app = createApp();
app.use(pluginValidation, {
  stopOnFirstError: false,
});
```

### 独立使用

```typescript
import { createValidationInstance } from '@lytjs/plugin-validation';

const validation = createValidationInstance();

// 验证单个字段
const result = await validation.validateField('email', 'test@example.com', [
  { type: 'required' },
  { type: 'email' },
]);

if (result.valid) {
  console.log('验证通过！');
} else {
  console.log('验证失败：', result.errors);
}

// 验证整个对象
const schema = {
  username: {
    rules: [{ type: 'required' }],
    label: '用户名',
  },
  email: {
    rules: [{ type: 'required' }, { type: 'email' }],
  },
  password: {
    rules: [{ type: 'required' }, { type: 'minLength', value: 8 }],
  },
};

const formData = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
};

const validationResult = await validation.validate(schema, formData);
console.log(validationResult.valid); // true 或 false
```

## 验证规则

### 内置规则

| 规则类型    | 说明           | 参数                      |
| ----------- | -------------- | ------------------------- |
| `required`  | 必填验证       | -                         |
| `email`     | 邮箱格式验证   | -                         |
| `phone`     | 手机号验证     | -                         |
| `number`    | 数字验证       | -                         |
| `min`       | 最小值验证     | `value: number`           |
| `max`       | 最大值验证     | `value: number`           |
| `minLength` | 最小长度验证   | `value: number`           |
| `maxLength` | 最大长度验证   | `value: number`           |
| `length`    | 精确长度验证   | `value: number`           |
| `pattern`   | 正则表达式验证 | `value: RegExp \| string` |
| `url`       | URL 格式验证   | -                         |
| `uuid`      | UUID 格式验证  | -                         |
| `date`      | 日期格式验证   | -                         |
| `custom`    | 自定义验证     | `validator: Function`     |

### 规则示例

```typescript
const rules = [
  // 必填
  { type: 'required' },

  // 邮箱
  { type: 'email' },

  // 手机号
  { type: 'phone' },

  // 数字
  { type: 'number' },

  // 范围
  { type: 'min', value: 18 },
  { type: 'max', value: 100 },

  // 长度
  { type: 'minLength', value: 6 },
  { type: 'maxLength', value: 20 },
  { type: 'length', value: 4 },

  // 正则
  { type: 'pattern', value: /^\d+$/ },

  // URL
  { type: 'url' },

  // UUID
  { type: 'uuid' },

  // 日期
  { type: 'date' },

  // 自定义
  {
    type: 'custom',
    validator: (value: unknown, allValues?: Record<string, unknown>) => {
      return String(value).includes('test');
    },
  },

  // 自定义错误消息
  { type: 'required', message: '请输入用户名' },
];
```

## API

### ValidationInstance

#### `validate(schema: ValidationSchema, values: Record<string, unknown>): Promise<ValidationResult>`

验证整个对象。

#### `validateField(field: string, value: unknown, rules: ValidationRule[], allValues?: Record<string, unknown>): Promise<ValidationResult>`

验证单个字段。

#### `setMessages(messages: ValidationMessages): void`

设置自定义错误消息。

#### `addRule(type: ValidationRuleType, validator: Validator, defaultMessage?: string): void`

添加自定义验证规则。

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

## 自定义消息

```typescript
const validation = createValidationInstance({
  messages: {
    required: '此字段为必填项',
    email: '请输入有效的邮箱地址',
    min: (value?: unknown, label?: string) => `${label || '值'}不能小于 ${value}`,
  },
});

// 或者运行时设置
validation.setMessages({
  required: '请填写这个字段',
});
```

## 自定义验证规则

```typescript
validation.addRule(
  'startsWithLyt',
  (value: unknown) => String(value).startsWith('lyt'),
  '必须以 lyt 开头',
);

// 使用自定义规则
const result = await validation.validateField('name', 'lytjs', [{ type: 'startsWithLyt' as any }]);
```

## 与 @lytjs/plugin-form 配合使用

```typescript
import { createFormManager } from '@lytjs/plugin-form';
import { createValidationInstance } from '@lytjs/plugin-validation';

const validation = createValidationInstance();

const form = createFormManager({
  fields: {
    email: {
      rules: [{ type: 'required' }, { type: 'email' }],
    },
  },
});
```

## 许可证

MIT
