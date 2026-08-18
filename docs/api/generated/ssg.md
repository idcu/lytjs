# @lytjs/ssg

静态站点生成（SSG）支持

## 目录

- [SSGGenerator](#ssggenerator)
- [SSGConfig](#ssgconfig)
- [SSGResult](#ssgresult)

## SSGGenerator

**Class**

### 成员

| 名称          | 类型 | 描述 | 可选 |
| ------------- | ---- | ---- | ---- |
| generate      | -    |      | 否   |
| generateRoute | -    |      | 否   |

## SSGConfig

**Interface**

### 成员

| 名称      | 类型       | 描述 | 可选 |
| --------- | ---------- | ---- | ---- |
| routes    | `string[]` |      | 否   |
| outputDir | `string`   |      | 否   |
| template  | `string`   |      | 是   |

## SSGResult

**Interface**

### 成员

| 名称       | 类型      | 描述 | 可选 |
| ---------- | --------- | ---- | ---- |
| route      | `string`  |      | 否   |
| outputPath | `string`  |      | 否   |
| success    | `boolean` |      | 否   |
| error      | `Error`   |      | 是   |
