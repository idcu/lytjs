# @lytjs/common-validate

轻量级验证工具。

## 安装

```bash
pnpm add @lytjs/common-validate
```

## 使用示例

```typescript
import { validate, createValidator, required, email, minLength } from '@lytjs/common-validate';

// 即时验证
const result = validate('user@example.com', [required, email, minLength(3)]);
result.valid; // true
result.errors; // []

// 创建可复用的验证器
const isEmail = createValidator([required, email]);
isEmail('bad'); // { valid: false, errors: ['This field is required', ...] }
```

## API

### 类型

| 类型               | 说明                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `ValidationResult` | 验证结果：`valid`（是否通过）、`errors`（错误消息数组）                                                |
| `ValidationRule`   | 验证规则：`name`、`validate(value)`、`message`。`validate` 返回 `false` 或字符串（错误消息）表示未通过 |

### 核心函数

| 函数                     | 说明                                                           |
| ------------------------ | -------------------------------------------------------------- |
| `validate(value, rules)` | 验证值是否符合所有规则，返回 `ValidationResult`                |
| `createValidator(rules)` | 创建一个可复用的验证器函数，返回 `(value) => ValidationResult` |

### 内置规则

| 规则                       | 说明                                            |
| -------------------------- | ----------------------------------------------- |
| `required`                 | 必填（`null`、`undefined`、空字符串视为未通过） |
| `minLength(n)`             | 最小长度（仅对字符串生效）                      |
| `maxLength(n)`             | 最大长度（仅对字符串生效）                      |
| `pattern(regex, message?)` | 正则匹配（仅对字符串生效）                      |
| `email`                    | 邮箱格式                                        |
| `url`                      | URL 格式                                        |
| `number`                   | 数字（`number` 类型或可转换为数字的字符串）     |
| `min(n)`                   | 最小值（仅对数字生效）                          |
| `max(n)`                   | 最大值（仅对数字生效）                          |
| `oneOf(values)`            | 枚举值                                          |
| `custom(fn, message)`      | 自定义验证规则                                  |

所有内置规则的集合可通过 `builtInRules` 统一访问。

## 相关包

- [@lytjs/common](../../README.md) - LytJS 通用工具聚合包

## 许可证

[MIT](../../../../LICENSE)
