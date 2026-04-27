# FAQ

## Basic Questions

### Q: What is the difference between Lyt.js and Vue.js?

**A:**
- **Zero dependencies**: Lyt.js has no third-party dependencies at all, including its reactivity system, compiler, and renderer, all of which are self-developed
- **Ultra-small bundle**: Only 34.56KB gzipped, much smaller than Vue
- **Vapor Mode**: No virtual DOM mode, performance close to native
- **Islands Architecture**: SSR partial hydration architecture
- **Learning curve**: Closer to native HTML, simpler API

### Q: Is Lyt.js suitable for production?

**A:**
Lyt.js already has the foundation of a production-grade framework:
- Complete test suite (2436+ tests, 100% pass rate)
- Complete core functionality
- Stable API
- Comprehensive toolchain

However, please note:
- The ecosystem is still evolving
- The community is relatively small
- It lacks validation from large-scale production projects

### Q: What is Lyt.js's browser compatibility?

**A:**
- Modern browsers: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- Requires: Proxy, Reflect, Promise, Map, Set
- IE is not supported

## Development Questions

### Q: How do I migrate from Vue 3 to Lyt.js?

**A:** See the [Migration Guide](./migration-from-vue3.md). The main changes:

```typescript
// Vue 3
import { ref, reactive } from 'vue'

// Lyt.js
import { ref, reactive } from '@lytjs/reactivity'
```

### Q: How do I resolve "module not found" errors?

**A:**
1. Make sure dependencies are installed: `npm install`
2. Check import paths: Use the correct package name `@lytjs/core`
3. TypeScript projects: Check the `paths` configuration in `tsconfig.json`

### Q: What if my component doesn't update?

**A:** Check the following:
1. Make sure you are using reactive data (ref/reactive)
2. Avoid replacing the entire reactive object
3. When using `shallowRef`, pay attention to how you update it
4. Check if the Key is set correctly

```typescript
// Wrong
let data = reactive({ count: 0 })
data = { count: 1 } // Replaced the entire object, lost reactivity

// Correct
const data = reactive({ count: 0 })
data.count = 1 // Directly modify the property
```

### Q: How do I debug a Lyt.js application?

**A:**
1. Use the built-in DevTools:
```typescript
import { createDevTools } from '@lytjs/devtools'
app.use(createDevTools())
```

2. Use the browser DevTools debugging features
3. Check console error messages

## Performance Questions

### Q: What if my application runs slowly?

**A:** See the [Performance Optimization Guide](./performance.md). Check:
1. Whether Vapor Mode is enabled
2. Whether there is unnecessary deep reactivity
3. Whether lists have the correct Key set
4. Whether there are excessive DOM operations
5. Use DevTools to analyze performance bottlenecks

### Q: How do I optimize slow initial page loads?

**A:**
1. Enable code splitting and lazy loading
2. Use Vapor Mode
3. Pre-compile templates
4. Configure CDN and caching
5. Use SSR/SSG

### Q: What if memory usage is high?

**A:**
1. Use `shallowRef/shallowReactive`
2. Clean up event listeners promptly
3. Be careful with caching strategies when using `KeepAlive`
4. Avoid unnecessary reactive tracking
5. Use `markRaw` to mark static data

## Routing Questions

### Q: What if History mode causes 404 on refresh?

**A:** You need to configure the server to support SPA fallback:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Q: How do I implement route guards?

**A:**

```typescript
const router = createRouter({
  routes
})

router.beforeEach((to, from, next) => {
  // Check permissions
  if (to.meta.requiresAuth && !isLoggedIn()) {
    next('/login')
  } else {
    next()
  }
})
```

## State Management Questions

### Q: How do I persist Store data?

**A:**

```typescript
import { defineStore } from '@lytjs/store'

export const useStore = defineStore('main', {
  state: () => ({
    count: 0
  }),
  persist: {
    enabled: true,
    storage: localStorage,
    key: 'my-store'
  }
})
```

### Q: How do I share state between multiple components?

**A:**
1. Use a Store (recommended)
2. Use Props and Events
3. Use Provide/Inject

## Build Questions

### Q: What if the build fails?

**A:**
1. Check the Node.js version (16+ recommended)
2. Clear cache: `rm -rf node_modules package-lock.json && npm install`
3. Check for TypeScript errors
4. Review the build log

### Q: How do I reduce the build size?

**A:**
1. Enable Tree Shaking
2. Use code splitting
3. Remove unused imports
4. Enable minification
5. Use Vapor Mode

## SSR Questions

### Q: What if `window` is undefined during SSR?

**A:** Use client-side checks:

```typescript
const isClient = typeof window !== 'undefined'

if (isClient) {
  // Client-side code
}
```

### Q: How do I handle SSR data prefetching?

**A:**

```typescript
export default {
  async onServerPrefetch() {
    const data = await fetchData()
    return data
  },
  setup() {
    const data = ref(null)
    onMounted(async () => {
      data.value = await fetchData()
    })
    return { data }
  }
}
```

## Ecosystem Questions

### Q: Is there a UI component library?

**A:** There is a basic component library `@lytjs/components` with common components:
- Button
- Input
- Select
- Modal
- Table
- And more

### Q: How do I integrate with third-party libraries?

**A:** Most third-party libraries can be used directly:

```typescript
import axios from 'axios'
import dayjs from 'dayjs'

const response = await axios.get('/api/data')
```

## Contributing Questions

### Q: How can I contribute to Lyt.js?

**A:**
1. See the [Contributing Guide](../../CONTRIBUTING.md)
2. Submit an Issue to report problems
3. Submit a Pull Request to improve the code
4. Improve documentation
5. Share your experience

### Q: How do I report a Bug?

**A:**
1. Submit an Issue on the Gitee repository
2. Provide reproduction steps
3. Provide a minimal reproduction code
4. Describe the expected and actual behavior

## Future Plans

### Q: What is Lyt.js's development roadmap?

**A:** See the [Roadmap](../roadmap.md). Main plans:
- Improve the ecosystem
- More official plugins
- Developer tool improvements
- Performance optimization
- Documentation improvements

### Q: Will there be first-class TypeScript support?

**A:** Yes, Lyt.js is developed entirely in TypeScript and provides complete type definitions.

## More Resources

- [Quick Start](./quick-start.md)
- [API Documentation](../api/core.md)
- [Examples](../examples/todo-app.md)
- [Gitee Repository](https://gitee.com/lytjs/lytjs)

---

Have other questions? Feel free to submit an Issue on the Gitee repository!
