# Component Library Guide

Lyt.js provides a component library with **38+ carefully designed components** covering common UI needs.

---

## Installation

```bash
npm install @lytjs/components
```

---

## Quick Start

### Method 1: Register All Components

```typescript
import { createApp } from '@lytjs/core'
import LytComponents from '@lytjs/components'

const app = createApp({
  template: `
    <div>
      <lyt-button type="primary">Click me</lyt-button>
      <lyt-input v-model="value" placeholder="Enter text" />
    </div>
  `,
  state: { value: '' }
})

// Register all components
app.use(LytComponents)

app.mount('#app')
```

### Method 2: Register Components On-Demand

```typescript
import { createApp } from '@lytjs/core'
import { Button, Input, Avatar } from '@lytjs/components'

const app = createApp({
  // ...
})

// Register components on-demand
app.component('LytButton', Button)
app.component('LytInput', Input)
app.component('LytAvatar', Avatar)

app.mount('#app')
```

---

## Component Categories

### Basic Components (5)

| Component | Description | Import Name |
|-----------|-------------|-------------|
| Button | Button component | `Button` |
| Icon | Icon component | `Icon` |
| Link | Link component | `Link` |
| Container | Container component | `Container` |
| Divider | Divider component | `Divider` |

### Form Components (9)

| Component | Description | Import Name |
|-----------|-------------|-------------|
| Input | Input field | `Input` |
| Checkbox | Checkbox | `Checkbox` |
| Radio | Radio button | `Radio` |
| Select | Select dropdown | `Select` |
| Switch | Toggle switch | `Switch` |
| Form | Form container | `Form` |
| DatePicker | Date picker | `DatePicker` |
| TimePicker | Time picker | `TimePicker` |
| Calendar | Calendar | `Calendar` |

### Feedback Components (4)

| Component | Description | Import Name |
|-----------|-------------|-------------|
| Modal | Modal dialog | `Modal` |
| Toast | Toast notification | `Toast` |
| Alert | Alert message | `Alert` |
| Tooltip | Text tooltip | `Tooltip` |

### Navigation Components (4)

| Component | Description | Import Name |
|-----------|-------------|-------------|
| Tabs | Tab navigation | `Tabs` |
| Breadcrumb | Breadcrumb navigation | `Breadcrumb` |
| Pagination | Pagination | `Pagination` |
| Carousel | Carousel | `Carousel` |

### Data Display Components (6)

| Component | Description | Import Name |
|-----------|-------------|-------------|
| Table | Data table | `Table` |
| Tag | Tag / label | `Tag` |
| Badge | Badge / count | `Badge` |
| Spin | Loading spinner | `Spin` |
| Empty | Empty state | `Empty` |
| Avatar | User avatar | `Avatar` |

### Extended Components (11)

| Component | Description | Import Name |
|-----------|-------------|-------------|
| DataTable | Data table (advanced) | `DataTable` |
| Dialog | Dialog box | `Dialog` |
| Notification | Notification | `Notification` |
| Popover | Popover card | `Popover` |
| TabNav | Tab navigation bar | `TabNav` |
| Collapse | Collapse / accordion | `Collapse` |
| Dropdown | Dropdown menu | `Dropdown` |
| Progress | Progress bar | `Progress` |
| Slider | Slider | `Slider` |
| Upload | File upload | `Upload` |
| Tree | Tree control | `Tree` |

---

## Common Component Examples

### Button

```vue
<template>
  <div>
    <!-- Basic usage -->
    <lyt-button>Default Button</lyt-button>

    <!-- Different types -->
    <lyt-button type="primary">Primary</lyt-button>
    <lyt-button type="success">Success</lyt-button>
    <lyt-button type="warning">Warning</lyt-button>
    <lyt-button type="danger">Danger</lyt-button>

    <!-- Different sizes -->
    <lyt-button size="small">Small</lyt-button>
    <lyt-button size="large">Large</lyt-button>

    <!-- Disabled state -->
    <lyt-button disabled>Disabled</lyt-button>

    <!-- Loading state -->
    <lyt-button loading>Loading</lyt-button>

    <!-- Icon button -->
    <lyt-button icon="search">Search</lyt-button>
  </div>
</template>
```

### Input

```vue
<template>
  <div>
    <!-- Basic usage -->
    <lyt-input v-model="value" placeholder="Enter text" />

    <!-- Different types -->
    <lyt-input v-model="value" type="password" placeholder="Password" />
    <lyt-input v-model="value" type="number" placeholder="Number" />

    <!-- Disabled state -->
    <lyt-input v-model="value" disabled placeholder="Disabled" />

    <!-- With prefix/suffix -->
    <lyt-input v-model="value" prefix="https://" suffix=".com" />

    <!-- With icon -->
    <lyt-input v-model="value" prefix-icon="search" placeholder="Search" />
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

### Avatar

```vue
<template>
  <div>
    <!-- Basic usage -->
    <lyt-avatar>U</lyt-avatar>
    <lyt-avatar>User</lyt-avatar>

    <!-- Different sizes -->
    <lyt-avatar size="small">U</lyt-avatar>
    <lyt-avatar size="large">User</lyt-avatar>

    <!-- Image avatar -->
    <lyt-avatar src="https://example.com/avatar.jpg" />

    <!-- Different shapes -->
    <lyt-avatar shape="square">U</lyt-avatar>
    <lyt-avatar shape="circle">User</lyt-avatar>
  </div>
</template>
```

### Carousel

```vue
<template>
  <div>
    <lyt-carousel :autoplay="true" :interval="3000">
      <lyt-carousel-item>
        <div style="background: #99a9bf; text-align: center; line-height: 300px; color: #fff; font-size: 24px;">
          Slide 1
        </div>
      </lyt-carousel-item>
      <lyt-carousel-item>
        <div style="background: #d3dce6; text-align: center; line-height: 300px; color: #fff; font-size: 24px;">
          Slide 2
        </div>
      </lyt-carousel-item>
      <lyt-carousel-item>
        <div style="background: #99a9bf; text-align: center; line-height: 300px; color: #fff; font-size: 24px;">
          Slide 3
        </div>
      </lyt-carousel-item>
    </lyt-carousel>
  </div>
</template>
```

### DatePicker

```vue
<template>
  <div>
    <lyt-date-picker v-model="date" placeholder="Select date" />
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

### TimePicker

```vue
<template>
  <div>
    <lyt-time-picker v-model="time" placeholder="Select time" />
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

### Calendar

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

### Modal

```vue
<template>
  <div>
    <lyt-button @click="visible = true">Open Modal</lyt-button>

    <lyt-modal
      v-model="visible"
      title="Confirm"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    >
      <p>This is some content</p>
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
      console.log('Confirmed')
    },
    handleCancel() {
      console.log('Cancelled')
    }
  }
}
</script>
```

### Table

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
        { prop: 'name', label: 'Name' },
        { prop: 'age', label: 'Age' },
        { prop: 'address', label: 'Address' }
      ],
      data: [
        { name: 'John', age: 20, address: 'New York' },
        { name: 'Jane', age: 25, address: 'London' },
        { name: 'Bob', age: 30, address: 'Paris' }
      ]
    }
  }
}
</script>
```

---

## Theme System

### Using the ThemeProvider component:

```vue
<template>
  <lyt-theme-provider :theme="theme">
    <div class="app">
      <!-- Your content -->
    </div>
  </lyt-theme-provider>
</template>

<script>
export default {
  data() {
    return {
      theme: 'light' // 'light' or 'dark'
    }
  }
}
</script>
```

### Switching Themes

```typescript
import { useTheme } from '@lytjs/components'

// Get current theme
const currentTheme = useTheme()

// Switch theme
currentTheme.value = 'dark' // or 'light'
```

### Custom Themes

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

## More Examples

For the complete component showcase, see `examples/showcase-app`, which includes detailed usage and example code for all components.

---

The component library is fully available with **38+ carefully designed components!**
