# Lyt.js 组件展示文档

## 概述

Lyt.js 提供了 38+ 个精心设计的组件，覆盖了常用的 UI 需求。本文档将展示所有组件的使用方法和效果。

## 组件分类

### 1. 基础组件

#### Button 按钮
```javascript
// 主要按钮
<Button type="primary">主要按钮</Button>

// 成功按钮
<Button type="success">成功按钮</Button>

// 警告按钮
<Button type="warning">警告按钮</Button>

// 危险按钮
<Button type="danger">危险按钮</Button>

// 禁用状态
<Button disabled>禁用按钮</Button>
```

#### Icon 图标
```javascript
<Icon name="check" size="24" />
<Icon name="close" size="24" />
<Icon name="info" size="24" />
```

#### Link 链接
```javascript
<Link href="/home">首页</Link>
<Link href="/about" disabled>关于</Link>
```

#### Container 容器
```javascript
<Container>
  <p>这是容器内容</p>
</Container>
```

#### Divider 分割线
```javascript
<Divider />
<Divider type="dashed" />
```

### 2. 表单组件

#### Input 输入框
```javascript
<Input placeholder="请输入内容" />
<Input type="password" placeholder="请输入密码" />
<Input disabled value="禁用状态" />
```

#### Checkbox 复选框
```javascript
<Checkbox>选项一</Checkbox>
<Checkbox checked>选项二</Checkbox>
```

#### Radio 单选框
```javascript
<RadioGroup name="gender">
  <Radio value="male">男</Radio>
  <Radio value="female">女</Radio>
</RadioGroup>
```

#### Select 选择器
```javascript
<Select placeholder="请选择">
  <Option value="1">选项一</Option>
  <Option value="2">选项二</Option>
</Select>
```

#### Switch 开关
```javascript
<Switch />
<Switch checked />
<Switch disabled />
```

#### Form 表单
```javascript
<Form onSubmit={handleSubmit}>
  <FormItem label="用户名">
    <Input />
  </FormItem>
</Form>
```

#### DatePicker 日期选择器
```javascript
<DatePicker placeholder="请选择日期" />
<DatePicker value="2024-01-01" />
```

#### TimePicker 时间选择器
```javascript
<TimePicker placeholder="请选择时间" />
<TimePicker value="12:00" />
```

#### Calendar 日历
```javascript
<Calendar />
<Calendar value="2024-01-01" />
```

### 3. 反馈组件

#### Modal 弹窗
```javascript
<Modal visible={visible} title="标题" onClose={handleClose}>
  <p>弹窗内容</p>
</Modal>
```

#### Toast 轻提示
```javascript
Toast.success('操作成功！');
Toast.error('操作失败！');
Toast.warning('警告！');
Toast.info('提示信息');
```

#### Alert 警告提示
```javascript
<Alert type="success" message="成功提示" />
<Alert type="warning" message="警告提示" />
<Alert type="error" message="错误提示" />
<Alert type="info" message="信息提示" />
```

#### Tooltip 文字提示
```javascript
<Tooltip content="提示内容">
  <Button>悬停查看</Button>
</Tooltip>
```

### 4. 导航组件

#### Tabs 标签页
```javascript
<Tabs activeTab="1">
  <TabPane tab="标签一" value="1">内容一</TabPane>
  <TabPane tab="标签二" value="2">内容二</TabPane>
</Tabs>
```

#### Breadcrumb 面包屑
```javascript
<Breadcrumb>
  <BreadcrumbItem href="/">首页</BreadcrumbItem>
  <BreadcrumbItem href="/products">产品</BreadcrumbItem>
  <BreadcrumbItem>详情</BreadcrumbItem>
</Breadcrumb>
```

#### Pagination 分页
```javascript
<Pagination total={100} pageSize={10} current={1} />
```

#### Carousel 轮播图
```javascript
<Carousel autoplay>
  <div>Slide 1</div>
  <div>Slide 2</div>
  <div>Slide 3</div>
</Carousel>
```

### 5. 数据展示组件

#### Table 表格
```javascript
<Table data={data} columns={columns} />
```

#### Tag 标签
```javascript
<Tag type="success">成功</Tag>
<Tag type="warning">警告</Tag>
<Tag type="error">错误</Tag>
<Tag type="info">信息</Tag>
```

#### Badge 徽章
```javascript
<Badge count={5}>消息</Badge>
<Badge count={0}>通知</Badge>
```

#### Spin 加载
```javascript
<Spin />
<Spin size="large" />
```

#### Empty 空状态
```javascript
<Empty description="暂无数据" />
```

#### Avatar 头像
```javascript
<Avatar>A</Avatar>
<Avatar src="url" size="large" />
<Avatar text="用户" />
```

### 6. 扩展组件

#### DataTable 数据表格
```javascript
<DataTable data={tableData} columns={columns} />
```

#### Dialog 对话框
```javascript
<Dialog visible={visible} title="对话框标题" onClose={handleClose}>
  <p>对话框内容</p>
</Dialog>
```

#### Notification 通知
```javascript
Notification.open({
  title: '通知',
  description: '通知内容'
});
```

#### Popover 气泡卡片
```javascript
<Popover content="内容">
  <Button>悬停查看</Button>
</Popover>
```

#### TabNav 标签导航
```javascript
<TabNav activeKey="1">
  <TabPane tab="导航一" key="1" />
  <TabPane tab="导航二" key="2" />
</TabNav>
```

#### Collapse 折叠面板
```javascript
<Collapse>
  <CollapseItem title="标题一" key="1">内容一</CollapseItem>
  <CollapseItem title="标题二" key="2">内容二</CollapseItem>
</Collapse>
```

#### Dropdown 下拉菜单
```javascript
<Dropdown>
  <Button>下拉菜单</Button>
  <DropdownMenu>
    <DropdownItem>选项一</DropdownItem>
    <DropdownItem>选项二</DropdownItem>
  </DropdownMenu>
</Dropdown>
```

#### Toggle 切换
```javascript
<Toggle />
<Toggle checked />
```

#### CountBadge 计数徽章
```javascript
<CountBadge count={10}>消息</CountBadge>
```

#### Pager 页码
```javascript
<Pager total={50} />
```

#### Progress 进度条
```javascript
<Progress percent={60} />
<Progress percent={100} status="success" />
```

#### Slider 滑块
```javascript
<Slider value={50} min={0} max={100} />
<Slider range value={[20, 80]} />
```

#### Upload 上传
```javascript
<Upload>
  <Button>点击上传</Button>
</Upload>
```

#### Tree 树形控件
```javascript
<Tree data={treeData} />
<Tree data={treeData} checkable />
```

## 主题系统

### 亮色主题
```javascript
<ThemeProvider theme="light">
  <App />
</ThemeProvider>
```

### 暗色主题
```javascript
<ThemeProvider theme="dark">
  <App />
</ThemeProvider>
```

### 自定义主题
```javascript
const customTheme = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f'
};

<ThemeProvider theme={customTheme}>
  <App />
</ThemeProvider>
```

## 使用示例项目

### 运行展示应用
```bash
cd examples/showcase-app
npm install
npm run dev
```

### 查看更多示例
Lyt.js 提供了多个示例项目供参考：
- showcase-app - 完整功能展示
- todo-app - 待办事项应用
- router-app - 路由示例应用
- stackblitz-starter - Stackblitz 启动项目

## 组件特性

- ✅ 支持 TypeScript
- ✅ 完整的类型定义
- ✅ 响应式设计
- ✅ 主题系统
- ✅ 无障碍访问
- ✅ 高性能
- ✅ 可定制

## 最佳实践

1. **按需引入** - 只引入需要的组件，减小打包体积
2. **主题定制** - 根据项目需求定制主题色
3. **响应式布局** - 充分利用组件的响应式能力
4. **性能优化** - 合理使用虚拟列表和懒加载

## 下一步

- 查看 [API 文档](../api/)
- 查看 [开发者文档](../developer/)
- 查看 [用户指南](../guide/)

---

**文档版本**: 1.0
**最后更新**: 2024-04-24
