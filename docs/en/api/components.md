# Component Library

Lyt.js provides a comprehensive component library with **38+ carefully designed components** covering common UI needs.

## Installation

```bash
npm install @lytjs/components
```

## Quick Start

### Option 1: Register All Components

```typescript
import { createApp } from '@lytjs/core'
import LytComponents from '@lytjs/components'

const app = createApp({
  template: `
    <div>
      <lyt-button type="primary">Click Me</lyt-button>
      <lyt-input v-model="value" placeholder="Enter text" />
    </div>
  `,
  state: { value: '' }
})

// Register all components at once
app.use(LytComponents)

app.mount('#app')
```

### Option 2: Register Components On-Demand

```typescript
import { createApp } from '@lytjs/core'
import { Button, Input, Avatar } from '@lytjs/components'

const app = createApp({
  // ...
})

// Register individual components
app.component('LytButton', Button)
app.component('LytInput', Input)
app.component('LytAvatar', Avatar)

app.mount('#app')
```

---

## Component Overview

### Base Components (5)

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
| Input | Text input | `Input` |
| Checkbox | Checkbox | `Checkbox` |
| Radio | Radio button | `Radio` |
| Select | Dropdown selector | `Select` |
| Switch | Toggle switch | `Switch` |
| Form | Form container | `Form` |
| DatePicker | Date picker | `DatePicker` |
| TimePicker | Time picker | `TimePicker` |
| Calendar | Calendar | `Calendar` |

### Feedback Components (4)

| Component | Description | Import Name |
|-----------|-------------|-------------|
| Modal | Modal dialog | `Modal` |
| Toast | Lightweight notification | `Toast` |
| Alert | Alert message | `Alert` |
| Tooltip | Text tooltip | `Tooltip` |

### Navigation Components (4)

| Component | Description | Import Name |
|-----------|-------------|-------------|
| Tabs | Tab navigation | `Tabs` |
| Breadcrumb | Breadcrumb navigation | `Breadcrumb` |
| Pagination | Pagination | `Pagination` |
| Carousel | Image carousel | `Carousel` |

### Data Display Components (6)

| Component | Description | Import Name |
|-----------|-------------|-------------|
| Table | Data table | `Table` |
| Tag | Tag / label | `Tag` |
| Badge | Status badge | `Badge` |
| Spin | Loading spinner | `Spin` |
| Empty | Empty state | `Empty` |
| Avatar | User avatar | `Avatar` |

### Extended Components (11)

| Component | Description | Import Name |
|-----------|-------------|-------------|
| DataTable | Advanced data table | `DataTable` |
| Dialog | Dialog box | `Dialog` |
| Notification | Notification message | `Notification` |
| Popover | Popover card | `Popover` |
| TabNav | Tab navigation bar | `TabNav` |
| Collapse | Collapsible panel | `Collapse` |
| Dropdown | Dropdown menu | `Dropdown` |
| Progress | Progress bar | `Progress` |
| Slider | Range slider | `Slider` |
| Upload | File upload | `Upload` |
| Tree | Tree control | `Tree` |

---

## Component Examples

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
    <lyt-button loading>Loading...</lyt-button>

    <!-- Icon button -->
    <lyt-button icon="search">Search</lyt-button>
  </div>
</template>
```

### Input

```vue
<template>
  <div>
    <lyt-input v-model="value" placeholder="Enter text" />
    <lyt-input v-model="value" type="password" placeholder="Password" />
    <lyt-input v-model="value" type="number" placeholder="Number" />
    <lyt-input v-model="value" disabled placeholder="Disabled" />
    <lyt-input v-model="value" prefix="https://" suffix=".com" />
    <lyt-input v-model="value" prefix-icon="search" placeholder="Search" />
  </div>
</template>
```

### Avatar

```vue
<template>
  <div>
    <lyt-avatar>U</lyt-avatar>
    <lyt-avatar size="small">U</lyt-avatar>
    <lyt-avatar size="large">User</lyt-avatar>
    <lyt-avatar src="https://example.com/avatar.jpg" />
    <lyt-avatar shape="square">U</lyt-avatar>
    <lyt-avatar shape="circle">User</lyt-avatar>
  </div>
</template>
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
      <p>This is the modal content.</p>
    </lyt-modal>
  </div>
</template>

<script>
export default {
  data() {
    return { visible: false }
  },
  methods: {
    handleConfirm() { console.log('Confirmed') },
    handleCancel() { console.log('Cancelled') }
  }
}
</script>
```

### Carousel

```vue
<template>
  <div>
    <lyt-carousel :autoplay="true" :interval="3000">
      <lyt-carousel-item>
        <div style="background: #99a9bf; text-align: center; line-height: 300px; color: #fff;">
          Slide 1
        </div>
      </lyt-carousel-item>
      <lyt-carousel-item>
        <div style="background: #d3dce6; text-align: center; line-height: 300px; color: #fff;">
          Slide 2
        </div>
      </lyt-carousel-item>
      <lyt-carousel-item>
        <div style="background: #99a9bf; text-align: center; line-height: 300px; color: #fff;">
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
  data() { return { date: '' } }
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
  data() { return { time: '' } }
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
  data() { return { selectedDate: new Date() } }
}
</script>
```

---

## Theme System

### Using ThemeProvider

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

### Switching Themes Programmatically

```typescript
import { useTheme } from '@lytjs/components'

// Get current theme
const currentTheme = useTheme()

// Switch theme
currentTheme.value = 'dark' // or 'light'
```

### Custom Theme

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

### CSS Variables

You can also customize the theme using CSS variables:

```css
:root {
  --lyt-color-primary: #4f46e5;
  --lyt-color-success: #22c55e;
  --lyt-color-warning: #f59e0b;
  --lyt-color-danger: #ef4444;
  --lyt-color-text: #1f2937;
  --lyt-color-text-secondary: #6b7280;
  --lyt-color-border: #e5e7eb;
  --lyt-color-bg: #ffffff;
  --lyt-color-bg-secondary: #f9fafb;
  --lyt-border-radius: 6px;
  --lyt-font-size: 14px;
}
```

---

## Component Status

The component library is fully production-ready with **38+ carefully designed components** covering all common UI scenarios.

For more examples, see the `examples/showcase-app` directory, which includes detailed usage and example code for every component.
