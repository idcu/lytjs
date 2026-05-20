# @lytjs/ui

LytJS 官方 UI 组件库，零第三方依赖，支持主题切换，30+ 组件应有尽有。

## 特性

- 🎨 **零第三方依赖** - 只依赖 LytJS 核心
- 📱 **响应式设计** - 完美适配各种屏幕尺寸
- 🎭 **主题系统** - 支持深色/浅色主题切换
- 🔧 **TypeScript 支持** - 完整的类型定义
- 📦 **Tree Shaking 友好** - 按需引入，减小体积

## 安装

```bash
pnpm add @lytjs/ui
```

## 使用

### 全局注册

```typescript
import { createApp } from '@lytjs/core';
import LytUI from '@lytjs/ui';
import '@lytjs/ui/styles';

const app = createApp(App);
app.use(LytUI);
app.mount('#app');
```

### 按需引入

```typescript
import { Button, Input, Table } from '@lytjs/ui';
import '@lytjs/ui/styles/button.css';
import '@lytjs/ui/styles/input.css';
import '@lytjs/ui/styles/table.css';
```

## 组件列表

### 基础组件

| 组件名         | 说明       |
| -------------- | ---------- |
| Button         | 按钮       |
| Input          | 输入框     |
| Tag            | 标签       |
| Badge          | 徽标数     |
| Avatar         | 头像       |
| Icon           | 图标       |
| Progress       | 进度条     |
| Alert          | 警告提示   |
| Loading        | 加载       |
| Spin           | 加载中     |
| Empty          | 空状态     |
| Result         | 结果页     |
| Descriptions   | 描述列表   |
| Statistic      | 统计数值   |
| BackTop        | 回到顶部   |
| Affix          | 固钉       |
| Anchor         | 锚点       |
| ConfigProvider | 全局化配置 |

### 表单组件

| 组件名      | 说明       |
| ----------- | ---------- |
| Form        | 表单       |
| Input       | 输入框     |
| InputNumber | 数字输入框 |
| Select      | 选择器     |
| TreeSelect  | 树选择     |
| Cascader    | 级联选择   |
| Checkbox    | 多选框     |
| Radio       | 单选框     |
| Switch      | 开关       |
| DatePicker  | 日期选择   |
| TimePicker  | 时间选择   |
| Upload      | 上传       |
| Rate        | 评分       |
| ColorPicker | 颜色选择   |
| Slider      | 滑动输入条 |
| Transfer    | 穿梭框     |

### 数据展示

| 组件名     | 说明     |
| ---------- | -------- |
| Table      | 表格     |
| Tree       | 树形控件 |
| Pagination | 分页     |
| Calendar   | 日历     |
| Timeline   | 时间轴   |
| Collapse   | 折叠面板 |
| Tabs       | 标签页   |
| Card       | 卡片     |
| Carousel   | 走马灯   |
| Image      | 图片     |

### 导航组件

| 组件名     | 说明     |
| ---------- | -------- |
| Menu       | 导航菜单 |
| Breadcrumb | 面包屑   |
| Steps      | 步骤条   |
| PageHeader | 页头     |
| Dropdown   | 下拉菜单 |

### 反馈组件

| 组件名       | 说明       |
| ------------ | ---------- |
| Modal        | 对话框     |
| Drawer       | 抽屉       |
| Popconfirm   | 气泡确认框 |
| Tooltip      | 文字提示   |
| Popover      | 气泡卡片   |
| Message      | 全局提示   |
| Notification | 通知提醒框 |
| Toast        | 轻提示     |

### 布局组件

| 组件名    | 说明   |
| --------- | ------ |
| Layout    | 布局   |
| Container | 容器   |
| Grid      | 栅格   |
| Space     | 间距   |
| Divider   | 分割线 |

## 基础用法

### Button 按钮

```typescript
import { Button } from '@lytjs/ui';

// 基础按钮
<Button type="primary">主要按钮</Button>

// 按钮类型
<Button type="default">默认</Button>
<Button type="primary">主要</Button>
<Button type="success">成功</Button>
<Button type="warning">警告</Button>
<Button type="danger">危险</Button>

// 按钮尺寸
<Button size="small">小</Button>
<Button size="medium">中</Button>
<Button size="large">大</Button>

// 禁用状态
<Button disabled>禁用</Button>

// 加载状态
<Button loading>加载中</Button>
```

### Input 输入框

```typescript
import { Input } from '@lytjs/ui';

// 基础输入框
<Input placeholder="请输入内容" />

// 密码输入框
<Input type="password" placeholder="请输入密码" />

// 可清空
<Input clearable />

// 禁用状态
<Input disabled />

// 前缀/后缀
<Input prefix="https://" suffix=".com" />
```

### Table 表格

```typescript
import { Table } from '@lytjs/ui';

const columns = [
  { prop: 'name', label: '姓名', sortable: true },
  { prop: 'age', label: '年龄' },
  { prop: 'address', label: '地址' },
];

const data = [
  { id: 1, name: '张三', age: 25, address: '北京市朝阳区' },
  { id: 2, name: '李四', age: 30, address: '上海市浦东新区' },
];

<Table
  data={data}
  columns={columns}
  stripe
  border
  showSelection
  highlightCurrentRow
/>
```

### Tree 树形控件

```typescript
import { Tree } from '@lytjs/ui';

const treeData = [
  {
    id: 1,
    label: '一级 1',
    children: [
      { id: 11, label: '二级 1-1' },
    ],
  },
];

<Tree
  data={treeData}
  showLine
  showCheckbox
/>
```

## API 文档

### Button Props

| 属性     | 说明         | 类型    | 默认值    |
| -------- | ------------ | ------- | --------- |
| type     | 按钮类型     | string  | 'default' |
| size     | 按钮尺寸     | string  | 'medium'  |
| disabled | 是否禁用     | boolean | false     |
| loading  | 是否加载中   | boolean | false     |
| block    | 是否块级元素 | boolean | false     |

### Input Props

| 属性        | 说明       | 类型    | 默认值 |
| ----------- | ---------- | ------- | ------ |
| type        | 输入框类型 | string  | 'text' |
| placeholder | 占位文本   | string  | ''     |
| clearable   | 是否可清空 | boolean | false  |
| disabled    | 是否禁用   | boolean | false  |
| prefix      | 前缀       | string  | ''     |
| suffix      | 后缀       | string  | ''     |

### Table Props

| 属性                | 说明           | 类型    | 默认值 |
| ------------------- | -------------- | ------- | ------ |
| data                | 表格数据       | Array   | []     |
| columns             | 列配置         | Array   | []     |
| stripe              | 是否斑马纹     | boolean | false  |
| border              | 是否有边框     | boolean | false  |
| showSelection       | 是否显示选择列 | boolean | false  |
| highlightCurrentRow | 是否高亮当前行 | boolean | false  |

### Tree Props

| 属性         | 说明           | 类型    | 默认值 |
| ------------ | -------------- | ------- | ------ |
| data         | 树形数据       | Array   | []     |
| showLine     | 是否显示连接线 | boolean | false  |
| showCheckbox | 是否显示复选框 | boolean | false  |
| checkable    | 是否可选中     | boolean | false  |
| draggable    | 是否可拖拽     | boolean | false  |

### Form Props

| 属性          | 说明         | 类型   | 默认值  |
| ------------- | ------------ | ------ | ------- |
| model         | 表单数据对象 | Object | {}      |
| rules         | 验证规则     | Object | {}      |
| labelWidth    | 标签宽度     | string | '100px' |
| labelPosition | 标签位置     | string | 'right' |

## 主题

### 主题配置

```typescript
import { theme } from '@lytjs/ui';

// 切换主题
theme.set('dark'); // 深色主题
theme.set('light'); // 浅色主题

// 或使用全局配置
app.use(LytUI, {
  theme: 'dark',
});
```

## 注意事项

- 本库零第三方依赖
- 建议使用 TypeScript 以获得更好的类型提示
- 样式采用 CSS-in-JS 方案，支持按需加载

## 许可证

MIT
