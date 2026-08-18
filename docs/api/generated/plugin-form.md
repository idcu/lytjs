# @lytjs/plugin-form

官方表单插件，提供表单状态管理

## 目录

- [validateRequired](#validaterequired)
- [validateEmail](#validateemail)
- [validatePhone](#validatephone)
- [validateNumber](#validatenumber)
- [validateMin](#validatemin)
- [validateMax](#validatemax)
- [validateMinLength](#validateminlength)
- [validateMaxLength](#validatemaxlength)
- [validatePattern](#validatepattern)
- [validateFieldValue](#validatefieldvalue)
- [createFormManager](#createformmanager)
- [FieldValidationRule](#fieldvalidationrule)
- [FieldConfig](#fieldconfig)
- [FormConfig](#formconfig)
- [FieldState](#fieldstate)
- [FormState](#formstate)
- [FormInstance](#forminstance)
- [FormOptions](#formoptions)

## validateRequired

**Function**

### 签名

```typescript
validateRequired: boolean;
```

### 参数

| 参数  | 类型      | 描述 | 可选 | 默认值 |
| ----- | --------- | ---- | ---- | ------ |
| value | `unknown` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## validateEmail

**Function**

### 签名

```typescript
validateEmail: boolean;
```

### 参数

| 参数  | 类型      | 描述 | 可选 | 默认值 |
| ----- | --------- | ---- | ---- | ------ |
| value | `unknown` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## validatePhone

**Function**

### 签名

```typescript
validatePhone: boolean;
```

### 参数

| 参数  | 类型      | 描述 | 可选 | 默认值 |
| ----- | --------- | ---- | ---- | ------ |
| value | `unknown` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## validateNumber

**Function**

### 签名

```typescript
validateNumber: boolean;
```

### 参数

| 参数  | 类型      | 描述 | 可选 | 默认值 |
| ----- | --------- | ---- | ---- | ------ |
| value | `unknown` |      | 否   | -      |

### 返回值

**类型:** `boolean`

## validateMin

**Function**

### 签名

```typescript
validateMin: boolean;
```

### 参数

| 参数  | 类型      | 描述 | 可选 | 默认值 |
| ----- | --------- | ---- | ---- | ------ |
| value | `unknown` |      | 否   | -      |
| min   | `number`  |      | 否   | -      |

### 返回值

**类型:** `boolean`

## validateMax

**Function**

### 签名

```typescript
validateMax: boolean;
```

### 参数

| 参数  | 类型      | 描述 | 可选 | 默认值 |
| ----- | --------- | ---- | ---- | ------ |
| value | `unknown` |      | 否   | -      |
| max   | `number`  |      | 否   | -      |

### 返回值

**类型:** `boolean`

## validateMinLength

**Function**

### 签名

```typescript
validateMinLength: boolean;
```

### 参数

| 参数      | 类型      | 描述 | 可选 | 默认值 |
| --------- | --------- | ---- | ---- | ------ |
| value     | `unknown` |      | 否   | -      |
| minLength | `number`  |      | 否   | -      |

### 返回值

**类型:** `boolean`

## validateMaxLength

**Function**

### 签名

```typescript
validateMaxLength: boolean;
```

### 参数

| 参数      | 类型      | 描述 | 可选 | 默认值 |
| --------- | --------- | ---- | ---- | ------ |
| value     | `unknown` |      | 否   | -      |
| maxLength | `number`  |      | 否   | -      |

### 返回值

**类型:** `boolean`

## validatePattern

**Function**

### 签名

```typescript
validatePattern: boolean;
```

### 参数

| 参数    | 类型      | 描述    | 可选 | 默认值 |
| ------- | --------- | ------- | ---- | ------ | --- |
| value   | `unknown` |         | 否   | -      |
| pattern | `RegExp   | string` |      | 否     | -   |

### 返回值

**类型:** `boolean`

## validateFieldValue

**Function**

### 签名

```typescript
validateFieldValue: Promise<string[]>;
```

### 参数

| 参数      | 类型                      | 描述 | 可选 | 默认值 |
| --------- | ------------------------- | ---- | ---- | ------ |
| \_name    | `string`                  |      | 否   | -      |
| value     | `unknown`                 |      | 否   | -      |
| rules     | `FieldValidationRule[]`   |      | 否   | -      |
| allValues | `Record<string, unknown>` |      | 否   | -      |

### 返回值

**类型:** `Promise<string[]>`

## createFormManager

**Function**

### 签名

```typescript
createFormManager: FormInstance;
```

### 参数

| 参数    | 类型          | 描述 | 可选 | 默认值 |
| ------- | ------------- | ---- | ---- | ------ |
| options | `FormOptions` |      | 是   | {}     |

### 返回值

**类型:** `FormInstance`

## FieldValidationRule

**Interface**

### 成员

| 名称      | 类型                                                             | 描述                      | 可选           |
| --------- | ---------------------------------------------------------------- | ------------------------- | -------------- | ------- | -------- | ----- | ----- | ----------- | ----------- | --------- | --------- | -------- | --- |
| type      | `                                                                | 'required'                | 'email'        | 'phone' | 'number' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom'` | 校验类型 | 否  |
| message   | `string`                                                         | 错误消息                  | 是             |
| value     | `unknown`                                                        | 校验值（如 min/max 值等） | 是             |
| validator | `(value: unknown, allValues: Record<string, unknown>) => boolean | Promise<boolean>`         | 自定义校验函数 | 是      |

## FieldConfig

**Interface**

### 成员

| 名称         | 类型                    | 描述         | 可选 |
| ------------ | ----------------------- | ------------ | ---- |
| initialValue | `unknown`               | 字段初始值   | 是   |
| rules        | `FieldValidationRule[]` | 校验规则     | 是   |
| label        | `string`                | 字段标签     | 是   |
| disabled     | `boolean`               | 字段是否禁用 | 是   |
| readOnly     | `boolean`               | 字段是否只读 | 是   |

## FormConfig

**Interface**

### 成员

| 名称             | 类型                          | 描述                 | 可选 |
| ---------------- | ----------------------------- | -------------------- | ---- |
| fields           | `Record<string, FieldConfig>` | 字段配置             | 是   |
| initialValues    | `Record<string, unknown>`     | 初始值               | 是   |
| validateOnSubmit | `boolean`                     | 是否在提交时校验     | 是   |
| validateOnChange | `boolean`                     | 是否在字段变化时校验 | 是   |
| validateOnBlur   | `boolean`                     | 是否在字段失焦时校验 | 是   |

## FieldState

**Interface**

### 成员

| 名称       | 类型       | 描述               | 可选 |
| ---------- | ---------- | ------------------ | ---- |
| value      | `unknown`  | 字段值             | 否   |
| errors     | `string[]` | 字段错误           | 否   |
| touched    | `boolean`  | 字段是否被触碰过   | 否   |
| disabled   | `boolean`  | 字段是否禁用       | 否   |
| readOnly   | `boolean`  | 字段是否只读       | 否   |
| validating | `boolean`  | 字段是否正在校验中 | 否   |
| valid      | `boolean`  | 字段是否校验通过   | 否   |

## FormState

**Interface**

### 成员

| 名称         | 类型                         | 描述             | 可选 |
| ------------ | ---------------------------- | ---------------- | ---- |
| fields       | `Record<string, FieldState>` | 所有字段状态     | 否   |
| isSubmitting | `boolean`                    | 表单是否正在提交 | 否   |
| isValid      | `boolean`                    | 表单是否有效     | 否   |
| isTouched    | `boolean`                    | 表单是否被触碰过 | 否   |
| isValidating | `boolean`                    | 表单是否正在校验 | 否   |
| isDirty      | `boolean`                    | 表单是否被修改过 | 否   |

## FormInstance

**Interface**

### 成员

| 名称             | 类型                                                    | 描述                                  | 可选         |
| ---------------- | ------------------------------------------------------- | ------------------------------------- | ------------ | --- |
| state            | `FormState`                                             | 表单当前状态                          | 否           |
| getValue         | `(name: string) => unknown`                             | 获取字段值                            | 否           |
| setValue         | `(name: string, value: unknown) => void`                | 设置字段值                            | 否           |
| getValues        | `() => Record<string, unknown>`                         | 获取所有值                            | 否           |
| setValues        | `(values: Record<string, unknown>) => void`             | 设置多个字段值                        | 否           |
| getErrors        | `(name: string) => string[]`                            | 获取字段错误                          | 否           |
| setErrors        | `(name: string, errors: string[]) => void`              | 设置字段错误                          | 否           |
| touchField       | `(name: string) => void`                                | 标记字段为已触碰                      | 否           |
| touchAllFields   | `() => void`                                            | 触碰所有字段                          | 否           |
| reset            | `() => void`                                            | 重置表单                              | 否           |
| resetToInitial   | `() => void`                                            | 重置为初始值                          | 否           |
| validateField    | `(name: string) => Promise<boolean>`                    | 校验单个字段                          | 否           |
| validate         | `() => Promise<boolean>`                                | 校验整个表单                          | 否           |
| submit           | `( callback?: (values: Record<string, unknown>) => void | Promise<void>, ) => Promise<boolean>` | 提交表单     | 否  |
| setFieldDisabled | `(name: string, disabled: boolean) => void`             | 设置字段禁用状态                      | 否           |
| setFieldReadOnly | `(name: string, readOnly: boolean) => void`             | 设置字段只读状态                      | 否           |
| getFieldConfig   | `(name: string) => FieldConfig                          | undefined`                            | 获取字段配置 | 否  |
| registerField    | `(name: string, config?: FieldConfig) => void`          | 注册新字段                            | 否           |
| unregisterField  | `(name: string) => void`                                | 注销字段                              | 否           |

## FormOptions

**Interface**

### 成员

| 名称 | 类型     | 描述     | 可选 |
| ---- | -------- | -------- | ---- |
| name | `string` | 插件名称 | 是   |
