# UI 组件库

@lytjs/ui 是 LytJS 官方 UI 组件库，提供常用组件。

## 安装

```bash
pnpm add @lytjs/ui
```

## 组件列表

### Button 按钮

```typescript
import { Button } from '@lytjs/ui';

// 使用
createVNode(Button, {
  type: 'primary',
  size: 'medium',
  onClick: () => console.log('clicked')
}, '点击我');
```

**Props**:
- `type`: default | primary | success | warning | danger | info
- `size`: small | medium | large
- `disabled`: boolean
- `loading`: boolean
- `plain`: boolean
- `round`: boolean
- `circle`: boolean

### Input 输入框

```typescript
import { Input } from '@lytjs/ui';

createVNode(Input, {
  modelValue: text,
  placeholder: '请输入',
  clearable: true,
  onInput: (value) => console.log(value)
});
```

**Props**:
- `modelValue`: string | number
- `placeholder`: string
- `disabled`: boolean
- `clearable`: boolean
- `showPassword`: boolean

### Select 选择器

```typescript
import { Select } from '@lytjs/ui';

createVNode(Select, {
  modelValue: selected,
  options: [
    { label: '选项1', value: '1' },
    { label: '选项2', value: '2' },
  ],
  onChange: (value) => console.log(value)
});
```

### Table 表格

```typescript
import { Table } from '@lytjs/ui';

createVNode(Table, {
  data: [
    { id: 1, name: '张三', age: 25 },
    { id: 2, name: '李四', age: 30 },
  ],
  columns: [
    { prop: 'id', label: 'ID' },
    { prop: 'name', label: '姓名' },
    { prop: 'age', label: '年龄', sortable: true },
  ],
  stripe: true,
  border: true
});
```

### Dialog 对话框

```typescript
import { Dialog } from '@lytjs/ui';

createVNode(Dialog, {
  modelValue: visible,
  title: '提示',
  onClose: () => visible.set(false)
}, [
  createVNode('p', {}, '这是对话框内容')
]);
```

### Tabs 标签页

```typescript
import { Tabs, TabPane } from '@lytjs/ui';

createVNode(Tabs, { modelValue: activeTab }, [
  createVNode(TabPane, { label: '标签1', name: 'tab1' }, '内容1'),
  createVNode(TabPane, { label: '标签2', name: 'tab2' }, '内容2'),
]);
```

## 样式

引入基础样式：

```typescript
import '@lytjs/ui/style.css';
```
