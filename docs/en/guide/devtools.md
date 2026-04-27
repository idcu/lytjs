# DevTools Guide

Lyt.js provides powerful browser developer tools to help you debug and optimize your applications.

## Installation and Integration

### Quick Start

Integrating DevTools into your Lyt.js application is simple:

```typescript
import { createApp } from '@lytjs/core';
import { createDevTools } from '@lytjs/devtools';

const app = createApp({
  template: `<div>{{ message }}</div>`,
  state: { message: 'Hello Lyt.js!' }
});

// Enable DevTools
app.use(createDevTools());

app.mount('#app');
```

### Configuration Options

You can customize DevTools behavior through configuration options:

```typescript
app.use(createDevTools({
  width: 480,           // Panel width
  height: 640,          // Panel height
  x: 100,               // Initial X position
  y: 60,                // Initial Y position
  autoShow: true,       // Whether to auto-show
  title: 'My App Dev',  // Panel title
  enablePerf: true,     // Enable performance panel
  enableMemory: true,   // Enable memory tracking
  enableRouter: true    // Enable router panel
}));
```

## Feature Modules

### 1. Component Tree Panel

View the component hierarchy of your application. Supports:

- Component search
- Component selection
- Viewing component props and state
- Highlighting component DOM

**How to use:**

1. Select a component in the component tree
2. View component details on the right side
3. Click the "Highlight" button to view the corresponding DOM element

### 2. State Panel

Monitor and debug reactive state:

- View current state values
- State change history
- Directly modify state values
- State search and filtering

**How to use:**

1. Browse state in the state tree
2. Click a value to edit it
3. View state change history

### 3. Event Panel

Track and analyze event flow:

- View event trigger history
- Event details (parameters, target component)
- Event search and filtering

### 4. Time Travel Debugging

Allows you to replay state change history:

- State snapshots
- Roll back to previous states
- State comparison
- Timeline navigation

**How to use:**

1. Select a time point in the history
2. Click the "Roll Back" button
3. View state changes

### 5. Performance Panel

Monitor application performance:

- FPS (frames per second) monitoring
- Component rendering performance
- Memory usage
- Update frequency analysis

**Performance analysis features:**

```typescript
import { PerformanceCollector, ComponentProfiler } from '@lytjs/devtools';

const collector = new PerformanceCollector({ autoStart: true });
const profiler = new ComponentProfiler();

// Get performance report
const report = collector.getReport();
console.log(report.fps, report.memory);
```

### 6. Router Panel

Monitor route navigation:

- Current route information
- Route navigation history
- Route parameters and query strings
- Route guard status

**Integration with Router:**

```typescript
import { createRouter } from '@lytjs/router';
import { createDevTools } from '@lytjs/devtools';

const router = createRouter({
  routes: [...],
  // DevTools will integrate automatically
});

app.use(router);
app.use(createDevTools({ enableRouter: true }));
```

## Keyboard Shortcuts

DevTools provides convenient keyboard shortcuts:

| Shortcut | Function |
|----------|----------|
| Ctrl+Shift+D | Toggle DevTools panel visibility |
| Escape | Close DevTools panel |
| Ctrl+1-6 | Switch to the corresponding tab |

## API Reference

### createDevTools(config)

Creates a DevTools plugin instance.

**Parameters:**

```typescript
interface DevToolsConfig {
  width?: number;           // Default 420
  height?: number;          // Default 560
  x?: number;               // Default bottom-right corner
  y?: number;               // Default 60
  autoShow?: boolean;       // Default true
  title?: string;           // Default 'Lyt DevTools'
  enablePerf?: boolean;     // Default true
  enableMemory?: boolean;   // Default true
  enableRouter?: boolean;   // Default true
}
```

**Returns:** Plugin object with an install method.

### DevTools Class

The DevTools instance provides the following methods:

```typescript
interface DevTools {
  // Panel control
  show(): void;
  hide(): void;
  toggle(): void;
  isVisible(): boolean;

  // Get sub-modules
  getPanel(): DevToolsPanel;
  getComponentTree(): ComponentTreeInspector;
  getStateInspector(): StateInspector;
  getEventTracker(): EventTracker;
  getTimeTravel(): TimeTravelDebugger;
  getPerfPanel(): PerfPanel | null;
  getRouterPanel(): RouterPanel | null;

  // Other methods
  refreshTree(): void;
  clearAllRecords(): void;
  destroy(): void;
}
```

## Production Environment

In production, you should disable DevTools to reduce bundle size:

```typescript
import { createApp } from '@lytjs/core';

const app = createApp({...});

// Only enable in development
if (import.meta.env.DEV) {
  const { createDevTools } = await import('@lytjs/devtools');
  app.use(createDevTools());
}

app.mount('#app');
```

## Browser Extension (Coming Soon)

Future versions will provide a browser extension form of DevTools for a better experience.

## Best Practices

1. **Always enable DevTools in development**: It significantly improves development efficiency
2. **Use the performance panel to monitor FPS**: Ensure application smoothness
3. **Leverage time travel debugging**: Quickly locate state issues
4. **Regularly check memory usage**: Prevent memory leaks
5. **Check the event panel**: Optimize event handling logic

## Troubleshooting

### DevTools Panel Not Showing

Make sure:
- You have called `app.use(createDevTools())`
- There are no errors in the browser console
- Try using the Ctrl+Shift+D shortcut

### Inaccurate Performance Data

Make sure:
- You are using it in a development environment
- Production mode optimizations are not enabled
- The page is not cached

### Router Panel is Empty

Make sure:
- You have enabled `enableRouter: true`
- `@lytjs/router` is integrated
- Route navigation has occurred

## More Resources

- [API Reference](/en/api/devtools.md)
- [Router Guide](/en/guide/router.md)
- [Performance Optimization Guide](/en/guide/performance.md)
- [Developer Documentation](/developer/README.md)
