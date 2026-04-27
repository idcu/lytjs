# Server-Side Rendering (SSR)

Lyt.js has built-in SSR support, allowing components to be rendered as HTML strings for server-side rendering scenarios. The **LytX** meta-framework provides a complete full-stack solution for building SSR/SSG applications.

## LytX Meta-Framework

LytX is the official meta-framework for Lyt.js, similar to Nuxt.js for Vue or Next.js for React. It provides:

- File-based routing
- Server-side rendering (SSR)
- Static site generation (SSG)
- API routes
- Middleware support
- Auto-imports
- Hot module replacement (HMR)

### Creating a LytX Project

```bash
npx @lytjs/cli create my-ssr-app --template lytx
cd my-ssr-app
npm install
npm run dev
```

### Project Structure

```
my-ssr-app/
├── src/
│   ├── pages/           # File-based routing
│   │   ├── index.lyt    # Home page (/)
│   │   └── about.lyt    # About page (/about)
│   ├── api/             # API routes
│   │   └── hello.ts     # /api/hello
│   ├── middleware/      # Server middleware
│   │   └── auth.ts
│   ├── components/      # Shared components
│   ├── layouts/         # Page layouts
│   └── app.lyt          # Root component
├── server.ts            # Server entry
├── lytx.config.ts       # LytX configuration
└── package.json
```

---

## Basic SSR Configuration

### renderToString()

Renders a VNode tree synchronously to an HTML string:

```ts
import { renderToString } from 'lyt/renderer'

const html = renderToString(vnode)
console.log(html)
// '<div class="app"><h1>Hello</h1><p>Content</p></div>'
```

### Supported VNode Types

- **Element VNode** — Outputs HTML tags + attributes + children
- **Text VNode** — Outputs escaped text content
- **Comment VNode** — Outputs HTML comments `<!-- -->`
- **Fragment VNode** — Outputs only children (no wrapper tag)
- **Component VNode** — Recursively renders component render function output
- **Null/Undefined** — Outputs nothing

### Special Handling

- `class`/`style`/`event` attribute serialization
- Self-closing tags (`br`/`hr`/`img`/`input`, etc.)
- HTML escaping (XSS prevention)
- `data-*` custom attributes
- `aria-*` accessibility attributes
- `dangerouslySetInnerHTML` support

### renderToStream()

Renders a VNode tree asynchronously as a stream:

```ts
import { renderToStream } from 'lyt/renderer'

const stream = renderToStream(vnode, {
  prefix: '<!DOCTYPE html><html><body>',
  suffix: '</body></html>'
})

// In Node.js
import { Readable } from 'stream'
Readable.from(stream).pipe(res)
```

### renderToStreamGenerator()

Uses a Generator function for streaming rendering:

```ts
import { renderToStreamGenerator } from 'lyt/renderer'

async function handleRequest(req, res) {
  res.write('<!DOCTYPE html><html><body>')

  for await (const chunk of renderToStreamGenerator(vnode)) {
    res.write(chunk)
  }

  res.end('</body></html>')
}
```

---

## Hydration

Client-side hydration "activates" server-rendered static HTML into an interactive application.

### hydrate()

```ts
import { hydrate } from 'lyt/renderer'

const app = createApp(App)
hydrate(app, document.getElementById('app'))
```

### Hydration Process

1. Traverse the server-rendered DOM tree
2. Compare each DOM node with the corresponding client VNode
3. If matching (same tag name), reuse DOM node and bind events
4. If not matching, mark as hydration mismatch
5. Recursively process child nodes
6. Trigger `onHydrated` callback after hydration completes

### HydrateOptions

```ts
interface HydrateOptions {
  /** Whether to warn on hydration mismatch */
  warnOnMismatch?: boolean
}
```

### HydrateResult

```ts
interface HydrateResult {
  /** Whether successful */
  success: boolean
  /** Number of mismatched nodes */
  mismatches: number
}
```

### Utility Functions

```ts
import {
  isHydrating,
  setHydrating,
  onHydrated,
  getHydrateStats,
  resetHydrateStats
} from 'lyt/renderer'

isHydrating()              // Check if in hydration mode
setHydrating(true)         // Set hydration mode
onHydrated(() => {         // Hydration complete callback
  console.log('Hydration complete')
})
getHydrateStats()          // Get hydration statistics
resetHydrateStats()        // Reset hydration statistics
```

---

## Static Site Generation (SSG)

LytX supports generating static HTML files at build time.

### Configuration

```ts
// lytx.config.ts
export default {
  // SSG mode
  ssr: true,
  ssg: {
    // Static pages to pre-render
    staticPaths: [
      '/',
      '/about',
      '/contact'
    ],
    // Dynamic paths (async function)
    dynamicPaths: async () => {
      const posts = await fetch('https://api.example.com/posts').then(r => r.json())
      return posts.map(post => `/blog/${post.slug}`)
    }
  }
}
```

### Build Static Site

```bash
npm run build
```

This generates static HTML files in the `dist/` directory, ready for deployment to any static hosting service.

---

## API Routes

LytX provides a file-based API route system.

### Creating API Routes

```ts
// src/api/hello.ts
export default {
  get(req, res) {
    res.json({ message: 'Hello from LytX API!' })
  }
}
```

```ts
// src/api/users/[id].ts
export default {
  get(req, res) {
    const { id } = req.params
    res.json({ userId: id, name: 'John' })
  },
  put(req, res) {
    const { id } = req.params
    const body = req.body
    res.json({ userId: id, ...body })
  }
}
```

### API Route Methods

```ts
// src/api/data.ts
export default {
  get(req, res) { /* Handle GET */ },
  post(req, res) { /* Handle POST */ },
  put(req, res) { /* Handle PUT */ },
  delete(req, res) { /* Handle DELETE */ },
  patch(req, res) { /* Handle PATCH */ }
}
```

---

## Middleware

LytX supports server middleware for request processing.

### Creating Middleware

```ts
// src/middleware/auth.ts
export default function authMiddleware(req, res, next) {
  const token = req.headers.authorization

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Verify token
  try {
    const user = verifyToken(token)
    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}
```

### Applying Middleware

```ts
// lytx.config.ts
export default {
  middleware: [
    'auth',    // src/middleware/auth.ts
    'logger'   // src/middleware/logger.ts
  ]
}
```

### Route-Level Middleware

```ts
// src/api/admin/users.ts
import authMiddleware from '../../middleware/auth'

export default {
  get: [authMiddleware, (req, res) => {
    res.json({ users: [] })
  }]
}
```

---

## Islands Architecture (v3.1.0+)

Lyt.js supports Islands Architecture, allowing most of the page to remain static HTML while only hydrating interactive "island" components.

### What is Islands Architecture?

Traditional SSR hydrates the entire page, even when most content is static. Islands Architecture breaks the page into "islands" — only marked interactive components are hydrated, while the rest remains static HTML.

### defineIsland()

Mark a component as an Island component:

```ts
import { defineIsland } from 'lyt/ssr'

const SearchBar = defineIsland({
  name: 'SearchBar',

  setup() {
    const query = ref('')
    const results = ref([])

    async function search() {
      results.value = await fetchResults(query.value)
    }

    return { query, results, search }
  },

  template: `
    <div class="search-bar">
      <input model="query" @keyup.enter="search" placeholder="Search..." />
      <ul>
        <li each="item in results">{{ item.title }}</li>
      </ul>
    </div>
  `
})
```

### Client-Side Island Hydration

```ts
// client.js
import { hydrateIslands } from 'lyt/ssr'

// Only hydrate Island components, skip static content
hydrateIslands()
```

### Hydration Strategies

| Strategy | Description |
|----------|-------------|
| `load` | Hydrate immediately after page load (default) |
| `idle` | Hydrate during browser idle time (`requestIdleCallback`) |
| `visible` | Hydrate when component enters viewport (`IntersectionObserver`) |
| `media` | Hydrate when media query matches |

---

## Partial Hydration (v3.1.0+)

Partial Hydration allows different parts of the application to use different hydration strategies.

### hydratePartial()

```ts
import { hydratePartial } from 'lyt/ssr'

const result = await hydratePartial(app, document.getElementById('app'), {
  defaultStrategy: 'idle',
  regions: [
    {
      selector: '[data-region="nav"]',
      strategy: 'immediate',
      priority: 1
    },
    {
      selector: '[data-region="content"]',
      strategy: 'visible',
      priority: 2
    },
    {
      selector: '[data-region="comments"]',
      strategy: 'interaction',
      priority: 3
    }
  ]
})
```

### Hydration Strategies

| Strategy | Description |
|----------|-------------|
| `immediate` | Hydrate immediately |
| `idle` | Hydrate during idle time |
| `visible` | Hydrate when visible |
| `interaction` | Hydrate on first interaction |
| `media` | Hydrate when media query matches |
| `manual` | Manually trigger hydration |

### Manual Trigger

```ts
import { triggerHydration } from 'lyt/ssr'

triggerHydration('[data-region="comments"]')
```

---

## Complete SSR Example

```ts
// server.js
import { createApp } from 'lyt'
import { renderToString } from 'lyt/renderer'
import App from './App'

function render(url) {
  const app = createApp(App)
  const html = renderToString(app._component)

  return `
    <!DOCTYPE html>
    <html>
      <head><title>Lyt.js SSR</title></head>
      <body>
        <div id="app">${html}</div>
        <script src="/client.js"></script>
      </body>
    </html>
  `
}

// client.js
import { createApp, hydrate } from 'lyt/renderer'
import App from './App'

hydrate(createApp(App), document.getElementById('app'))
```

---

## Deployment

### Node.js Server

```ts
// server.ts
import { createServer } from 'http'
import { renderToString } from 'lyt/renderer'
import App from './src/App'

const server = createServer(async (req, res) => {
  const html = renderToString(App)
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>My App</title></head>
      <body>
        <div id="app">${html}</div>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  `)
})

server.listen(3000)
```

### Static Hosting (SSG)

```bash
# Build static site
npm run build

# Deploy to any static hosting
# - Vercel
# - Netlify
# - GitHub Pages
# - Cloudflare Pages
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Vercel

```js
// vercel.json
{
  "builds": [{ "src": "server.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.ts" }]
}
```
