// benchmarks/compiler-bench.mjs
// Lyt.js Compiler 性能基准测试
// 运行方式: node --import ./e2e/loader.mjs benchmarks/compiler-bench.mjs

const {
  compile,
  parseSFC,
  compileSFC,
} = await import('../packages/compiler/dist/index.mjs')

function bench(name, fn, iterations = 1000) {
  // warmup
  for (let i = 0; i < 100; i++) fn()

  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  const elapsed = performance.now() - start
  const ops = (iterations / elapsed * 1000).toFixed(0)
  console.log(`  ${name}: ${ops} ops/sec (${elapsed.toFixed(2)}ms for ${iterations} iterations)`)
}

console.log('=== Compiler Benchmarks ===')

// 1. 编译简单模板（1000 次）
const simpleTemplate = `<div class="app"><span>{{ message }}</span></div>`

bench('compile 简单模板 (1000 次)', () => {
  compile(simpleTemplate)
}, 1000)

const mediumTemplate = `
<div class="container">
  <h1>{{ title }}</h1>
  <ul>
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </ul>
  <button @click="handleClick">Click</button>
  <input v-model="text" placeholder="Type here" />
  <p v-if="show">Conditional content</p>
</div>
`

bench('compile 中等模板 (1000 次)', () => {
  compile(mediumTemplate)
}, 1000)

// 2. 编译复杂模板（100 个节点，1000 次）
function generateComplexTemplate(nodeCount) {
  let template = '<div class="root">'
  for (let i = 0; i < nodeCount; i++) {
    if (i % 3 === 0) {
      template += `<div class="node-${i}" :data-id="${i}"><span>{{ data${i} }}</span></div>`
    } else if (i % 3 === 1) {
      template += `<p v-if="visible${i}" class="text-${i}">{{ text${i} }}</p>`
    } else {
      template += `<button @click="onClick${i}">Button ${i}</button>`
    }
  }
  template += '</div>'
  return template
}

const complexTemplate = generateComplexTemplate(100)

bench('compile 复杂模板 (100 节点, 1000 次)', () => {
  compile(complexTemplate)
}, 1000)

// 3. 编译 SFC（100 次）
const simpleSFC = `<template>
  <div class="counter">
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
    <button @click="increment">+1</button>
    <button @click="decrement">-1</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      title: 'Counter',
      count: 0
    }
  },
  methods: {
    increment() { this.count++ },
    decrement() { this.count-- }
  }
}
</script>

<style scoped>
.counter {
  padding: 20px;
  text-align: center;
}
.counter h1 {
  color: #333;
}
.counter p {
  font-size: 1.5em;
}
button {
  margin: 0 5px;
  padding: 5px 15px;
}
</style>
`

bench('compileSFC 简单 SFC (100 次)', () => {
  const descriptor = parseSFC(simpleSFC, 'Counter.lyt')
  compileSFC(descriptor)
}, 100)

const complexSFC = `<template>
  <div class="app">
    <header class="header">
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a v-if="isLoggedIn" href="/profile">Profile</a>
      </nav>
    </header>
    <main class="content">
      <section v-if="page === 'home'">
        <h1>Welcome</h1>
        <ul>
          <li v-for="item in items" :key="item.id">
            <span>{{ item.title }}</span>
            <span class="price">{{ item.price }}</span>
          </li>
        </ul>
      </section>
      <section v-else-if="page === 'about'">
        <h1>About Us</h1>
        <p>{{ description }}</p>
      </section>
      <section v-else>
        <h1>Profile</h1>
        <div class="user-info">
          <p>Name: {{ user.name }}</p>
          <p>Email: {{ user.email }}</p>
        </div>
      </section>
    </main>
    <footer class="footer">
      <p>&copy; 2024 Lyt.js App</p>
    </footer>
  </div>
</template>

<script>
export default {
  data() {
    return {
      isLoggedIn: true,
      page: 'home',
      description: 'This is the about page',
      user: { name: 'Test', email: 'test@example.com' },
      items: [
        { id: 1, title: 'Item 1', price: '$10' },
        { id: 2, title: 'Item 2', price: '$20' },
        { id: 3, title: 'Item 3', price: '$30' }
      ]
    }
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.header {
  background: #333;
  color: white;
  padding: 10px 20px;
}
.header nav a {
  color: white;
  margin-right: 15px;
  text-decoration: none;
}
.content {
  flex: 1;
  padding: 20px;
}
.footer {
  background: #f5f5f5;
  padding: 10px;
  text-align: center;
}
.user-info p {
  margin: 5px 0;
}
</style>
`

bench('compileSFC 复杂 SFC (100 次)', () => {
  const descriptor = parseSFC(complexSFC, 'App.lyt')
  compileSFC(descriptor)
}, 100)

console.log('\n=== Compiler Benchmarks Complete ===')
