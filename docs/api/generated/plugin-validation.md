# @lytjs/plugin-validation

官方校验插件，提供类型校验

## 目录

- [getMessage](#getmessage)
- [validateRule](#validaterule)
- [validateFieldInternal](#validatefieldinternal)
- [createValidationInstance](#createvalidationinstance)
- [validateDate](#validatedate)
- [validateEmail](#validateemail)
- [defaultMessages](#defaultmessages)
- [validateNumber](#validatenumber)
- [validatePattern](#validatepattern)
- [validatePhone](#validatephone)
- [validateMin](#validatemin)
- [validateMax](#validatemax)
- [validateRequired](#validaterequired)
- [validateMinLength](#validateminlength)
- [validateMaxLength](#validatemaxlength)
- [validateLength](#validatelength)
- [validateUrl](#validateurl)
- [validateUuid](#validateuuid)
- [ValidationRuleType](#validationruletype)
- [ValidationRule](#validationrule)
- [Validator](#validator)
- [ValidationResult](#validationresult)
- [FieldValidationConfig](#fieldvalidationconfig)
- [ValidationSchema](#validationschema)
- [ValidationMessages](#validationmessages)
- [ValidationOptions](#validationoptions)
- [ValidationInstance](#validationinstance)
- [ValidationPluginOptions](#validationpluginoptions)

## getMessage

**Function**

### 签名

```typescript
getMessage: string;
```

### 参数

| 参数      | 类型                 | 描述 | 可选 | 默认值 |
| --------- | -------------------- | ---- | ---- | ------ |
| messages  | `ValidationMessages` |      | 否   | -      |
| type      | `string`             |      | 否   | -      |
| ruleValue | `unknown`            |      | 是   | -      |
| label     | `string`             |      | 是   | -      |

### 返回值

**类型:** `string`

## validateRule

**Function**

### 签名

```typescript
validateRule: Promise<string | null>;
```

### 参数

| 参数       | 类型                                    | 描述 | 可选 | 默认值 |
| ---------- | --------------------------------------- | ---- | ---- | ------ |
| rule       | `ValidationRule`                        |      | 否   | -      |
| value      | `unknown`                               |      | 否   | -      |
| allValues  | `Record<string, unknown>`               |      | 否   | -      |
| validators | `Record<ValidationRuleType, Validator>` |      | 否   | -      |
| messages   | `ValidationMessages`                    |      | 否   | -      |
| label      | `string`                                |      | 是   | -      |

### 返回值

**类型:** `Promise<string | null>`

## validateFieldInternal

**Function**

### 签名

```typescript
validateFieldInternal: Promise<ValidationResult>;
```

### 参数

| 参数             | 类型                                    | 描述 | 可选 | 默认值  |
| ---------------- | --------------------------------------- | ---- | ---- | ------- |
| value            | `unknown`                               |      | 否   | -       |
| config           | `FieldValidationConfig`                 |      | 否   | -       |
| allValues        | `Record<string, unknown>`               |      | 否   | -       |
| validators       | `Record<ValidationRuleType, Validator>` |      | 否   | -       |
| messages         | `ValidationMessages`                    |      | 否   | -       |
| stopOnFirstError | `boolean`                               |      | 是   | `false` |

### 返回值

**类型:** `Promise<ValidationResult>`

## createValidationInstance

**Function**

### 签名

```typescript
createValidationInstance: ValidationInstance;
```

### 参数

| 参数    | 类型                      | 描述 | 可选 | 默认值 |
| ------- | ------------------------- | ---- | ---- | ------ |
| options | `ValidationPluginOptions` |      | 是   | -      |

### 返回值

**类型:** `ValidationInstance`

## validateDate

**Variable**

## validateEmail

**Variable**

## defaultMessages

**Variable**

## validateNumber

**Variable**

## validatePattern

**Variable**

## validatePhone

**Variable**

## validateMin

**Variable**

## validateMax

**Variable**

## validateRequired

**Variable**

## validateMinLength

**Variable**

## validateMaxLength

**Variable**

## validateLength

**Variable**

## validateUrl

**Variable**

## validateUuid

**Variable**

## ValidationRuleType

**Type**

### 签名

```typescript
ValidationRuleType: | 'required'
  | 'email'
  | 'phone'
  | 'number'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'length'
  | 'pattern'
  | 'url'
  | 'uuid'
  | 'date'
  | 'custom'
```

## ValidationRule

**Interface**

### 成员

| 名称      | 类型                                                                                   | 描述 | 可选 |
| --------- | -------------------------------------------------------------------------------------- | ---- | ---- |
| type      | `ValidationRuleType`                                                                   |      | 否   |
| message   | `string`                                                                               |      | 是   |
| value     | `unknown`                                                                              |      | 是   |
| validator | `(value: unknown, allValues?: Record<string, unknown>) => boolean \| Promise<boolean>` |      | 是   |

## Validator

**Interface**

## ValidationResult

**Interface**

### 成员

| 名称   | 类型       | 描述 | 可选 |
| ------ | ---------- | ---- | ---- |
| valid  | `boolean`  |      | 否   |
| errors | `string[]` |      | 否   |

## FieldValidationConfig

**Interface**

### 成员

| 名称  | 类型               | 描述 | 可选 |
| ----- | ------------------ | ---- | ---- |
| rules | `ValidationRule[]` |      | 否   |
| label | `string`           |      | 是   |

## ValidationSchema

**Interface**

## ValidationMessages

**Interface**

## ValidationOptions

**Interface**

### 成员

| 名称             | 类型                 | 描述 | 可选 |
| ---------------- | -------------------- | ---- | ---- |
| messages         | `ValidationMessages` |      | 是   |
| validateOnChange | `boolean`            |      | 是   |
| validateOnBlur   | `boolean`            |      | 是   |
| stopOnFirstError | `boolean`            |      | 是   |

## ValidationInstance

**Interface**

### 成员

| 名称          | 类型                                                                                                                            | 描述 | 可选 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- |
| validate      | `( schema: ValidationSchema, values: Record<string, unknown>, ) => Promise<ValidationResult>`                                   |      | 否   |
| validateField | `( field: string, value: unknown, rules: ValidationRule[], allValues?: Record<string, unknown>, ) => Promise<ValidationResult>` |      | 否   |
| setMessages   | `(messages: ValidationMessages) => void`                                                                                        |      | 否   |
| addRule       | `(type: ValidationRuleType, validator: Validator, defaultMessage?: string) => void`                                             |      | 否   |

## ValidationPluginOptions

**Interface**

### 成员

| 名称 | 类型     | 描述 | 可选 |
| ---- | -------- | ---- | ---- |
| name | `string` |      | 是   |
