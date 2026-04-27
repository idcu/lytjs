# @lytjs/components

Lyt.js 官方 UI 组件库 - 提供 38+ 常用组件，支持主题系统。

## 安装

```bash
npm install @lytjs/components

# 或使用 pnpm
pnpm add @lytjs/components
```

## 特性

- 🚀 38+ 常用组件
- 🎨 主题系统（亮色 / 暗色）
- 📦 TypeScript 支持
- 🎯 零运行时依赖
- 💡 直观的 API 设计

## 快速开始

```javascript
import { createApp } from '@lytjs/core';
import LytComponents from '@lytjs/components';
import App from './App.vue';
import '@lytjs/components/styles/index.css';

const app = createApp(App);
app.use(LytComponents);
app.mount('#app');
```

## 按需引入

```javascript
import { Button, Input, Select } from '@lytjs/components';
import { createApp } from '@lytjs/core';

const app = createApp(App);
app.component('LytButton', Button);
app.component('LytInput', Input);
app.component('LytSelect', Select);
app.mount('#app');
```

## 组件列表

### 基础组件

| 组件 | 说明 |
|------|------|
| `Button` | 按钮组件 |
| `Icon` | 图标组件 |
| `Typography` | 排版组件 |
| `Link` | 链接组件 |

### 表单组件

| 组件 | 说明 |
|------|------|
| `Input` | 输入框组件 |
| `Textarea` | 文本域组件 |
| `Select` | 选择器组件 |
| `Checkbox` | 复选框组件 |
| `Radio` | 单选框组件 |
| `Switch` | 开关组件 |
| `Slider` | 滑块组件 |
| `DatePicker` | 日期选择器 |
| `TimePicker` | 时间选择器 |
| `Form` | 表单组件 |
| `FormItem` | 表单项组件 |

### 数据展示

| 组件 | 说明 |
|------|------|
| `Table` | 表格组件 |
| `Card` | 卡片组件 |
| `Tag` | 标签组件 |
| `Badge` | 徽标组件 |
| `Avatar` | 头像组件 |
| `Progress` | 进度条组件 |
| `Timeline` | 时间线组件 |
| `Tree` | 树形组件 |
| `List` | 列表组件 |

### 反馈组件

| 组件 | 说明 |
|------|------|
| `Alert` | 警告提示组件 |
| `Message` | 全局提示组件 |
| `Modal` | 对话框组件 |
| `Drawer` | 抽屉组件 |
| `Popover` | 气泡卡片组件 |
| `Tooltip` | 文字提示组件 |
| `Notification` | 通知组件 |

### 导航组件

| 组件 | 说明 |
|------|------|
| `Menu` | 菜单组件 |
| `Tabs` | 标签页组件 |
| `Breadcrumb` | 面包屑组件 |
| `Pagination` | 分页组件 |
| `Dropdown` | 下拉菜单组件 |

### 布局组件

| 组件 | 说明 |
|------|------|
| `Layout` | 布局组件 |
| `Header` | 头部组件 |
| `Sider` | 侧边栏组件 |
| `Content` | 内容组件 |
| `Footer` | 底部组件 |
| `Row` | 栅格行组件 |
| `Col` | 栅格列组件 |
| `Space` | 间距组件 |
| `Divider` | 分割线组件 |

## 主题系统

```javascript
import { useTheme } from '@lytjs/components';

const theme = useTheme();

// 切换主题
theme.setTheme('dark'); // 'light' | 'dark'

// 获取当前主题
console.log(theme.currentTheme);

// 自定义主题
theme.setCustomTheme({
  '--lyt-color-primary': '#1890ff',
  '--lyt-color-success': '#52c41a',
  '--lyt-color-warning': '#faad14',
  '--lyt-color-error': '#ff4d4f'
});
```

## 示例

### Button 按钮

```vue
<template>
  <lyt-button type="primary">主要按钮</lyt-button>
  <lyt-button type="success">成功按钮</lyt-button>
  <lyt-button type="warning">警告按钮</lyt-button>
  <lyt-button type="danger">危险按钮</lyt-button>
  
  <lyt-button disabled>禁用按钮</lyt-button>
  <lyt-button loading>加载中</lyt-button>
  <lyt-button circle>⊙</lyt-button>
</template>
```

### Input 输入框

```vue
<template>
  <lyt-input v-model="value" placeholder="请输入" />
  
  <lyt-input
    v-model="value"
    placeholder="请输入"
    :maxLength="20"
    showWordLimit
  />
  
  <lyt-input
    v-model="value"
    placeholder="请输入"
    prefix="🔍"
    suffix="✓"
  />
</template>

<script setup>
import { ref } from 'vue';
const value = ref('');
</script>
```

### Form 表单

```vue
<template>
  <lyt-form
    ref="formRef"
    :model="formState"
    :rules="rules"
    label-width="80px"
  >
    <lyt-form-item label="姓名" prop="name">
      <lyt-input v-model="formState.name" placeholder="请输入姓名" />
    </lyt-form-item>
    
    <lyt-form-item label="邮箱" prop="email">
      <lyt-input v-model="formState.email" placeholder="请输入邮箱" />
    </lyt-form-item>
    
    <lyt-form-item label="年龄" prop="age">
      <lyt-input-number v-model="formState.age" />
    </lyt-form-item>
    
    <lyt-form-item>
      <lyt-button type="primary" @click="submitForm">提交</lyt-button>
      <lyt-button @click="resetForm">重置</lyt-button>
    </lyt-form-item>
  </lyt-form>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { LytForm, LytFormItem, LytInput, LytButton, LytInputNumber } from '@lytjs/components';

const formRef = ref();

const formState = reactive({
  name: '',
  email: '',
  age: null
});

const rules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }
  ]
};

const submitForm = async () => {
  try {
    await formRef.value.validate();
    console.log('表单验证通过');
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

const resetForm = () => {
  formRef.value.resetFields();
};
</script>
```

### Table 表格

```vue
<template>
  <lyt-table
    :columns="columns"
    :dataSource="data"
    :pagination="{ total: 100, pageSize: 10 }"
  />
</template>

<script setup>
import { ref } from 'vue';
import { LytTable } from '@lytjs/components';

const columns = ref([
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '年龄', dataIndex: 'age', key: 'age' },
  { title: '地址', dataIndex: 'address', key: 'address' }
]);

const data = ref([
  { key: '1', name: '张三', age: 32, address: '北京市朝阳区' },
  { key: '2', name: '李四', age: 42, address: '上海市浦东新区' },
  { key: '3', name: '王五', age: 28, address: '广州市天河区' }
]);
</script>
```

## 性能

- 零运行时依赖
- 按需引入
- 高效的组件渲染

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
