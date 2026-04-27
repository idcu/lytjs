# 🎨 组件库使用指南

Lyt.js 提供了一个包含 **38+ 个精心设计的组件**，覆盖常见的 UI 需求。

---

## 📦 安装

```bash
npm install @lytjs/components
```

---

## 🚀 快速开始

### 方式 1：批量注册所有组件

```typescript
import { createApp } from '@lytjs/core'
import LytComponents from '@lytjs/components'

const app = createApp({
  template: `
    <div>
      <lyt-button type="primary">点击我</lyt-button>
      <lyt-input v-model="value" placeholder="请输入" />
    </div>
  `,
  state: { value: '' }
})

// 批量注册所有组件
app.use(LytComponents)

app.mount('#app')
```

### 方式 2：按需注册组件

```typescript
import { createApp } from '@lytjs/core'
import { Button, Input, Avatar } from '@lytjs/components'

const app = createApp({
  // ...
})

// 按需注册组件
app.component('LytButton', Button)
app.component('LytInput', Input)
app.component('LytAvatar', Avatar)

app.mount('#app')
```

---

## 🎯 组件分类

### 基础组件 (5个)

| 组件 | 描述 | 导入名 |
|------|------|--------|
| Button | 按钮组件 | `Button` |
| Icon | 图标组件 | `Icon` |
| Link | 链接组件 | `Link` |
| Container | 容器组件 | `Container` |
| Divider | 分割线组件 | `Divider` |

### 表单组件 (9个)

| 组件 | 描述 | 导入名 |
|------|------|--------|
| Input | 输入框 | `Input` |
| Checkbox | 复选框 | `Checkbox` |
| Radio | 单选框 | `Radio` |
| Select | 选择器 | `Select` |
| Switch | 开关 | `Switch` |
| Form | 表单容器 | `Form` |
| DatePicker | 日期选择器 | `DatePicker` |
| TimePicker | 时间选择器 | `TimePicker` |
| Calendar | 日历 | `Calendar` |

### 反馈组件 (4个)

| 组件 | 描述 | 导入名 |
|------|------|--------|
| Modal | 模态框 | `Modal` |
| Toast | 轻提示 | `Toast` |
| Alert | 警告提示 | `Alert` |
| Tooltip | 文字提示 | `Tooltip` |

### 导航组件 (4个)

| 组件 | 描述 | 导入名 |
|------|------|--------|
| Tabs | 标签页 | `Tabs` |
| Breadcrumb | 面包屑 | `Breadcrumb` |
| Pagination | 分页 | `Pagination` |
| Carousel | 轮播图 | `Carousel` |

### 数据展示组件 (6个)

| 组件 | 描述 | 导入名 |
|------|------|--------|
| Table | 表格 | `Table` |
| Tag | 标签 | `Tag` |
| Badge | 徽章 | `Badge` |
| Spin | 加载 | `Spin` |
| Empty | 空状态 | `Empty` |
| Avatar | 头像 | `Avatar` |

### 扩展组件 (10个)

| 组件 | 描述 | 导入名 |
|------|------|--------|
| DataTable | 数据表格 | `DataTable` |
| Dialog | 对话框 | `Dialog` |
| Notification | 通知 | `Notification` |
| Popover | 气泡卡片 | `Popover` |
| TabNav | 标签导航 | `TabNav` |
| Collapse | 折叠面板 | `Collapse` |
| Dropdown | 下拉菜单 | `Dropdown` |
| Progress | 进度条 | `Progress` |
| Slider | 滑块 | `Slider` |
| Upload | 上传 | `Upload` |
| Tree | 树形控件 | `Tree` |

---

## 📝 常用组件示例

### Button 按钮

```vue
<template>
  <div>
    <!-- 基础用法 -->
    <lyt-button>默认按钮</lyt-button>
    
    <!-- 不同类型 -->
    <lyt-button type="primary">主要按钮</lyt-button>
    <lyt-button type="success">成功按钮</lyt-button>
    <lyt-button type="warning">警告按钮</lyt-button>
    <lyt-button type="danger">危险按钮</lyt-button>
    
    <!-- 不同大小 -->
    <lyt-button size="small">小按钮</lyt-button>
    <lyt-button size="large">大按钮</lyt-button>
    
    <!-- 禁用状态 -->
    <lyt-button disabled>禁用按钮</lyt-button>
    
    <!-- 加载状态 -->
    <lyt-button loading>加载中</lyt-button>
    
    <!-- 图标按钮 -->
    <lyt-button icon="search">搜索</lyt-button>
  </div>
</template>
```

### Input 输入框

```vue
<template>
  <div>
    <!-- 基础用法 -->
    <lyt-input v-model="value" placeholder="请输入" />
    
    <!-- 不同类型 -->
    <lyt-input v-model="value" type="password" placeholder="密码" />
    <lyt-input v-model="value" type="number" placeholder="数字" />
    
    <!-- 禁用状态 -->
    <lyt-input v-model="value" disabled placeholder="禁用" />
    
    <!-- 带前缀/后缀 -->
    <lyt-input v-model="value" prefix="https://" suffix=".com" />
    
    <!-- 带图标 -->
    <lyt-input v-model="value" prefix-icon="search" placeholder="搜索" />
  </div>
</template>

<script>
export default {
  data() {
    return { value: '' }
  }
}
</script>
```

### Avatar 头像

```vue
<template>
  <div>
    <!-- 基础用法 -->
    <lyt-avatar>U</lyt-avatar>
    <lyt-avatar>用户</lyt-avatar>
    
    <!-- 不同大小 -->
    <lyt-avatar size="small">U</lyt-avatar>
    <lyt-avatar size="large">用户</lyt-avatar>
    
    <!-- 图片头像 -->
    <lyt-avatar src="https://example.com/avatar.jpg" />
    
    <!-- 不同形状 -->
    <lyt-avatar shape="square">U</lyt-avatar>
    <lyt-avatar shape="circle">用户</lyt-avatar>
  </div>
</template>
```

### Carousel 轮播图

```vue
<template>
  <div>
    <lyt-carousel :autoplay="true" :interval="3000">
      <lyt-carousel-item>
        <div style="background: #99a9bf; text-align: center; line-height: 300px; color: #fff; font-size: 24px;">
          幻灯片 1
        </div>
      </lyt-carousel-item>
      <lyt-carousel-item>
        <div style="background: #d3dce6; text-align: center; line-height: 300px; color: #fff; font-size: 24px;">
          幻灯片 2
        </div>
      </lyt-carousel-item>
      <lyt-carousel-item>
        <div style="background: #99a9bf; text-align: center; line-height: 300px; color: #fff; font-size: 24px;">
          幻灯片 3
        </div>
      </lyt-carousel-item>
    </lyt-carousel>
  </div>
</template>
```

### DatePicker 日期选择器

```vue
<template>
  <div>
    <lyt-date-picker v-model="date" placeholder="选择日期" />
  </div>
</template>

<script>
export default {
  data() {
    return { date: '' }
  }
}
</script>
```

### TimePicker 时间选择器

```vue
<template>
  <div>
    <lyt-time-picker v-model="time" placeholder="选择时间" />
  </div>
</template>

<script>
export default {
  data() {
    return { time: '' }
  }
}
</script>
```

### Calendar 日历

```vue
<template>
  <div>
    <lyt-calendar v-model="selectedDate" />
  </div>
</template>

<script>
export default {
  data() {
    return { selectedDate: new Date() }
  }
}
</script>
```

### Modal 模态框

```vue
<template>
  <div>
    <lyt-button @click="visible = true">打开模态框</lyt-button>
    
    <lyt-modal 
      v-model="visible" 
      title="提示"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    >
      <p>这是一段内容</p>
    </lyt-modal>
  </div>
</template>

<script>
export default {
  data() {
    return { visible: false }
  },
  methods: {
    handleConfirm() {
      console.log('确认')
    },
    handleCancel() {
      console.log('取消')
    }
  }
}
</script>
```

### Table 表格

```vue
<template>
  <div>
    <lyt-table :columns="columns" :data="data" />
  </div>
</template>

<script>
export default {
  data() {
    return {
      columns: [
        { prop: 'name', label: '姓名' },
        { prop: 'age', label: '年龄' },
        { prop: 'address', label: '地址' }
      ],
      data: [
        { name: '张三', age: 20, address: '北京市朝阳区' },
        { name: '李四', age: 25, address: '上海市浦东新区' },
        { name: '王五', age: 30, address: '广州市天河区' }
      ]
    }
  }
}
</script>
```

---

## 🎨 主题系统

### 使用 ThemeProvider 组件提供主题支持：

```vue
<template>
  <lyt-theme-provider :theme="theme">
    <div class="app">
      <!-- 你的内容 -->
    </div>
  </lyt-theme-provider>
</template>

<script>
export default {
  data() {
    return {
      theme: 'light' // 'light' 或 'dark'
    }
  }
}
</script>
```

### 切换主题

```typescript
import { useTheme } from '@lytjs/components'

// 获取当前主题
const currentTheme = useTheme()

// 切换主题
currentTheme.value = 'dark' // 或 'light'
```

### 自定义主题

```typescript
import { ThemeProvider } from '@lytjs/components'

const customTheme = {
  colors: {
    primary: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    danger: '#f5222d'
  }
}
```

---

## 📚 更多示例

查看完整的组件展示示例，请到 `examples/showcase-app`，包含所有组件的详细用法和示例代码。

---

## 🎉 **组件库状态完整可用，包含 38+ 个精心设计的组件！

