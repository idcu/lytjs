# @lytjs/plugin-form

LytJS 官方表单插件，提供表单状态管理、字段校验与提交处理能力。

## 安装

```bash
pnpm add @lytjs/plugin-form
```

## 快速开始

### 作为插件使用

```typescript
import { createApp } from '@lytjs/core';
import pluginForm from '@lytjs/plugin-form';

const app = createApp();
app.use(pluginForm, {
  fields: {
    email: {
      initialValue: '',
      rules: [{ type: 'required' }, { type: 'email' }],
    },
  },
  validateOnChange: true,
});
```

安装后可通过 `$form`（或 provide 注入的 `lyt-form`）使用：

```typescript
// 读取与更新值
const email = $form.getValue('email');
$form.setValue('email', 'a@b.com');

// 校验
await $form.validate(); // 校验所有字段
await $form.validateField('email'); // 校验单个字段

// 提交
await $form.submit((values) => {
  console.log('提交的表单数据：', values);
});

// 其他操作
$form.touchAllFields();
$form.reset();
$form.resetToInitial();
$form.setFieldDisabled('email', true);
```

### 独立使用

```typescript
import { createFormManager } from '@lytjs/plugin-form';

const form = createFormManager({
  fields: { name: { rules: [{ type: 'required' }] } },
});
await form.submit((values) => console.log(values));
```

## 特性

- 字段状态管理（值、错误、touched、disabled、readOnly、valid、validating）
- 内置校验规则：`required`、`email`、`phone`、`number`、`min`、`max`、`minLength`、`maxLength`、`pattern`、`custom`
- 支持 `validateOnSubmit`、`validateOnChange`、`validateOnBlur`
- 表单级状态（`isValid`、`isTouched`、`isDirty`、`isSubmitting`、`isValidating`）

## API

### createFormManager(options)

创建表单管理实例。

| 方法                                                | 说明                       |
| --------------------------------------------------- | -------------------------- |
| `getValue` / `setValue` / `getValues` / `setValues` | 读写字段值                 |
| `getErrors` / `setErrors`                           | 读写字段错误               |
| `validateField(name)` / `validate()`                | 字段/表单校验              |
| `submit(callback?)`                                 | 提交（可选回调接收表单值） |
| `touchField` / `touchAllFields`                     | 标记字段为已触达           |
| `reset` / `resetToInitial`                          | 重置表单                   |
| `setFieldDisabled` / `setFieldReadOnly`             | 设置字段状态               |
| `registerField` / `unregisterField`                 | 注册/注销字段              |
| `getFieldConfig(name)`                              | 获取字段配置               |
| `state`                                             | 当前表单状态               |

### 类型

`FormOptions`、`FormInstance`、`FormState`、`FieldState`、`FieldConfig`、`FieldValidationRule`。

## 相关包

- [@lytjs/core](../../../core)：应用核心，提供 `definePlugin` 与 `createApp`。
- [@lytjs/reactivity](../../../reactivity)：响应式信号机制。

## 许可证

[MIT](../../../../LICENSE)
