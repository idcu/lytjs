# @lytjs/metadata

元数据系统

## 目录

- [MetadataBuilder](#metadatabuilder)
- [createMetadataBuilder](#createmetadatabuilder)
- [renderMetadata](#rendermetadata)

## MetadataBuilder

**Class**

元数据构建器类

### 成员

| 名称        | 类型       | 描述                   | 可选 |
| ----------- | ---------- | ---------------------- | ---- |
| metadata    | `Metadata` | 元数据对象             | 否   |
| title       | -          | 设置标题               | 否   |
| description | -          | 设置描述               | 否   |
| keywords    | -          | 设置关键词             | 否   |
| openGraph   | -          | 设置 Open Graph 元数据 | 否   |
| twitter     | -          | 设置 Twitter 元数据    | 否   |
| set         | -          | 设置自定义属性         | 否   |
| build       | -          | 构建元数据             | 否   |

## createMetadataBuilder

**Function**

创建元数据构建器

### 签名

```typescript
createMetadataBuilder: MetadataBuilder;
```

### 返回值

**类型:** `MetadataBuilder`

构建器实例

## renderMetadata

**Function**

渲染元数据为 HTML 标签

### 签名

```typescript
renderMetadata: string;
```

### 参数

| 参数     | 类型       | 描述 | 可选 | 默认值 |
| -------- | ---------- | ---- | ---- | ------ |
| metadata | `Metadata` |      | 否   | -      |

### 返回值

**类型:** `string`

HTML 标签字符串
