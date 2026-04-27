/**
 * Lyt.js Playground - Built-in Example Templates
 *
 * Each template is a complete runnable example that demonstrates
 * different features of the Lyt.js framework.
 */

const TEMPLATES = {
  'hello-world': {
    name: 'Hello World',
    description: 'Basic Lyt.js application with template rendering',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .app { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    h1 { color: #42b883; margin-bottom: 0.5rem; }
    p { color: #666; font-size: 1.1rem; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    const app = createApp({
      name: 'App',
      state: () => ({
        message: 'Hello, Lyt.js!',
        subtitle: 'A lightweight reactive framework'
      }),
      render() {
        return h('div', { class: 'app' }, [
          h('h1', null, this.message),
          h('p', null, this.subtitle)
        ])
      }
    })

    app.mount('#app')
  </script>
</body>
</html>`
  },

  'counter': {
    name: 'Counter',
    description: 'Reactive counter with increment and decrement',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .counter { text-align: center; padding: 2rem 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .count { font-size: 4rem; font-weight: 700; color: #42b883; margin: 1rem 0; }
    .buttons { display: flex; gap: 1rem; justify-content: center; }
    button { padding: 0.6rem 1.5rem; font-size: 1.1rem; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
    .btn-dec { background: #ff6b6b; color: white; }
    .btn-dec:hover { background: #ee5a5a; }
    .btn-inc { background: #42b883; color: white; }
    .btn-inc:hover { background: #369970; }
    .btn-reset { background: #e9ecef; color: #495057; }
    .btn-reset:hover { background: #dee2e6; }
    h2 { color: #333; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    const app = createApp({
      name: 'Counter',
      state: () => ({
        count: 0
      }),
      render() {
        return h('div', { class: 'counter' }, [
          h('h2', null, 'Reactive Counter'),
          h('div', { class: 'count' }, String(this.count)),
          h('div', { class: 'buttons' }, [
            h('button', { class: 'btn-dec', onClick: () => this.count-- }, '- Decrease'),
            h('button', { class: 'btn-reset', onClick: () => this.count = 0 }, 'Reset'),
            h('button', { class: 'btn-inc', onClick: () => this.count++ }, '+ Increase')
          ])
        ])
      }
    })

    app.mount('#app')
  </script>
</body>
</html>`
  },

  'todo-app': {
    name: 'Todo App',
    description: 'Full-featured todo list with add, toggle, and delete',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 2rem; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .todo-app { width: 100%; max-width: 480px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 2rem; }
    h1 { color: #42b883; text-align: center; margin-bottom: 1.5rem; }
    .input-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    input[type="text"] { flex: 1; padding: 0.7rem 1rem; border: 2px solid #e9ecef; border-radius: 8px; font-size: 1rem; outline: none; transition: border-color 0.2s; }
    input[type="text"]:focus { border-color: #42b883; }
    .btn-add { padding: 0.7rem 1.2rem; background: #42b883; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; white-space: nowrap; }
    .btn-add:hover { background: #369970; }
    .stats { display: flex; justify-content: space-between; color: #888; font-size: 0.9rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #eee; }
    .todo-list { list-style: none; padding: 0; }
    .todo-item { display: flex; align-items: center; gap: 0.8rem; padding: 0.8rem; border-radius: 8px; margin-bottom: 0.5rem; transition: background 0.2s; }
    .todo-item:hover { background: #f8f9fa; }
    .todo-item input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: #42b883; }
    .todo-text { flex: 1; font-size: 1rem; }
    .todo-text.done { text-decoration: line-through; color: #aaa; }
    .btn-del { background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 1.2rem; padding: 0.2rem 0.5rem; border-radius: 4px; }
    .btn-del:hover { background: #fff0f0; }
    .empty { text-align: center; color: #aaa; padding: 2rem; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h, computed } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    const app = createApp({
      name: 'TodoApp',
      state: () => ({
        todos: [],
        newTodo: '',
        nextId: 1
      }),
      computed: {
        remaining() {
          return this.todos.filter(t => !t.done).length
        },
        total() {
          return this.todos.length
        }
      },
      methods: {
        addTodo() {
          const text = this.newTodo.trim()
          if (!text) return
          this.todos.push({ id: this.nextId++, text, done: false })
          this.newTodo = ''
        },
        toggleTodo(id) {
          const todo = this.todos.find(t => t.id === id)
          if (todo) todo.done = !todo.done
        },
        removeTodo(id) {
          this.todos = this.todos.filter(t => t.id !== id)
        }
      },
      render() {
        const items = this.todos.map(todo =>
          h('li', { class: 'todo-item', key: todo.id }, [
            h('input', {
              type: 'checkbox',
              checked: todo.done,
              onChange: () => this.toggleTodo(todo.id)
            }),
            h('span', { class: 'todo-text' + (todo.done ? ' done' : '') }, todo.text),
            h('button', { class: 'btn-del', onClick: () => this.removeTodo(todo.id) }, '\u00d7')
          ])
        )

        return h('div', { class: 'todo-app' }, [
          h('h1', null, 'Todo List'),
          h('div', { class: 'input-row' }, [
            h('input', {
              type: 'text',
              placeholder: 'Add a new todo...',
              value: this.newTodo,
              onInput: (e) => { this.newTodo = e.target.value },
              onKeydown: (e) => { if (e.key === 'Enter') this.addTodo() }
            }),
            h('button', { class: 'btn-add', onClick: () => this.addTodo() }, 'Add')
          ]),
          h('div', { class: 'stats' }, [
            h('span', null, 'Total: ' + this.total),
            h('span', null, 'Remaining: ' + this.remaining)
          ]),
          this.todos.length === 0
            ? h('div', { class: 'empty' }, 'No todos yet. Add one above!')
            : h('ul', { class: 'todo-list' }, items)
        ])
      }
    })

    app.mount('#app')
  </script>
</body>
</html>`
  },

  'timer': {
    name: 'Timer',
    description: 'Stopwatch timer with start, pause, and reset',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .timer { text-align: center; padding: 2.5rem 3rem; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    h2 { color: #333; margin-bottom: 1rem; }
    .display { font-size: 3.5rem; font-weight: 700; font-variant-numeric: tabular-nums; color: #42b883; margin: 1.5rem 0; letter-spacing: 2px; }
    .buttons { display: flex; gap: 1rem; justify-content: center; }
    button { padding: 0.7rem 1.8rem; font-size: 1rem; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-weight: 500; }
    .btn-start { background: #42b883; color: white; }
    .btn-start:hover { background: #369970; }
    .btn-pause { background: #f0ad4e; color: white; }
    .btn-pause:hover { background: #ec971f; }
    .btn-reset { background: #e9ecef; color: #495057; }
    .btn-reset:hover { background: #dee2e6; }
    .laps { margin-top: 1.5rem; text-align: left; max-height: 200px; overflow-y: auto; }
    .lap { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #f0f0f0; font-size: 0.95rem; color: #555; }
    .btn-lap { background: #6c757d; color: white; }
    .btn-lap:hover { background: #5a6268; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    const app = createApp({
      name: 'Timer',
      state: () => ({
        elapsed: 0,
        running: false,
        intervalId: null,
        laps: [],
        lapCount: 0
      }),
      mounted() {
        console.log('Timer component mounted')
      },
      beforeUnmount() {
        if (this.intervalId) clearInterval(this.intervalId)
      },
      methods: {
        formatTime(ms) {
          const totalSec = Math.floor(ms / 1000)
          const min = String(Math.floor(totalSec / 60)).padStart(2, '0')
          const sec = String(totalSec % 60).padStart(2, '0')
          const centisec = String(Math.floor((ms % 1000) / 10)).padStart(2, '0')
          return min + ':' + sec + '.' + centisec
        },
        start() {
          if (this.running) return
          this.running = true
          const startTime = Date.now() - this.elapsed
          this.intervalId = setInterval(() => {
            this.elapsed = Date.now() - startTime
          }, 10)
        },
        pause() {
          this.running = false
          if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
          }
        },
        reset() {
          this.pause()
          this.elapsed = 0
          this.laps = []
          this.lapCount = 0
        },
        addLap() {
          if (!this.running) return
          this.lapCount++
          this.laps.unshift({ num: this.lapCount, time: this.formatTime(this.elapsed) })
        }
      },
      render() {
        const lapItems = this.laps.map(lap =>
          h('div', { class: 'lap', key: lap.num }, [
            h('span', null, 'Lap ' + lap.num),
            h('span', null, lap.time)
          ])
        )

        return h('div', { class: 'timer' }, [
          h('h2', null, 'Stopwatch'),
          h('div', { class: 'display' }, this.formatTime(this.elapsed)),
          h('div', { class: 'buttons' }, [
            this.running
              ? h('button', { class: 'btn-pause', onClick: () => this.pause() }, 'Pause')
              : h('button', { class: 'btn-start', onClick: () => this.start() }, 'Start'),
            h('button', { class: 'btn-lap', onClick: () => this.addLap() }, 'Lap'),
            h('button', { class: 'btn-reset', onClick: () => this.reset() }, 'Reset')
          ]),
          this.laps.length > 0
            ? h('div', { class: 'laps' }, lapItems)
            : null
        ])
      }
    })

    app.mount('#app')
  </script>
</body>
</html>`
  },

  'fetch-data': {
    name: 'Fetch Data',
    description: 'Fetch and display data from a public API',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 2rem; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .app { width: 100%; max-width: 600px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 2rem; }
    h1 { color: #42b883; text-align: center; margin-bottom: 1.5rem; }
    .controls { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    input { flex: 1; padding: 0.6rem 1rem; border: 2px solid #e9ecef; border-radius: 8px; font-size: 1rem; outline: none; }
    input:focus { border-color: #42b883; }
    .btn-fetch { padding: 0.6rem 1.2rem; background: #42b883; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; }
    .btn-fetch:hover { background: #369970; }
    .btn-fetch:disabled { background: #aaa; cursor: not-allowed; }
    .loading { text-align: center; padding: 2rem; color: #888; }
    .spinner { display: inline-block; width: 24px; height: 24px; border: 3px solid #e9ecef; border-top-color: #42b883; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 0.5rem; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .user-card { display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid #eee; border-radius: 8px; margin-bottom: 0.5rem; }
    .user-avatar { width: 48px; height: 48px; border-radius: 50%; background: #42b883; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; }
    .user-info h3 { margin: 0 0 0.2rem; color: #333; }
    .user-info p { margin: 0; color: #888; font-size: 0.9rem; }
    .error { text-align: center; padding: 1rem; color: #ff6b6b; background: #fff0f0; border-radius: 8px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    const app = createApp({
      name: 'FetchData',
      state: () => ({
        users: [],
        loading: false,
        error: null,
        searchId: 1
      }),
      methods: {
        async fetchUsers() {
          this.loading = true
          this.error = null
          try {
            const res = await fetch('https://jsonplaceholder.typicode.com/users/' + this.searchId)
            if (!res.ok) throw new Error('User not found')
            const user = await res.json()
            // Replace or add user
            const idx = this.users.findIndex(u => u.id === user.id)
            if (idx >= 0) this.users[idx] = user
            else this.users.push(user)
          } catch (e) {
            this.error = e.message
          } finally {
            this.loading = false
          }
        }
      },
      render() {
        const userCards = this.users.map(user =>
          h('div', { class: 'user-card', key: user.id }, [
            h('div', { class: 'user-avatar' }, user.name.charAt(0)),
            h('div', { class: 'user-info' }, [
              h('h3', null, user.name),
              h('p', null, user.email),
              h('p', null, user.company.name)
            ])
          ])
        )

        return h('div', { class: 'app' }, [
          h('h1', null, 'User Directory'),
          h('div', { class: 'controls' }, [
            h('input', {
              type: 'number',
              min: 1,
              max: 10,
              value: String(this.searchId),
              onInput: (e) => { this.searchId = parseInt(e.target.value) || 1 }
            }),
            h('button', {
              class: 'btn-fetch',
              disabled: this.loading,
              onClick: () => this.fetchUsers()
            }, 'Fetch User')
          ]),
          this.error
            ? h('div', { class: 'error' }, 'Error: ' + this.error)
            : null,
          this.loading
            ? h('div', { class: 'loading' }, [
                h('span', { class: 'spinner' }),
                h('span', null, 'Loading...')
              ])
            : null,
          userCards
        ])
      }
    })

    app.mount('#app')
  </script>
</body>
</html>`
  },

  'reactive-list': {
    name: 'Reactive List',
    description: 'Dynamic list with add, remove, and sort operations',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 2rem; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .app { width: 100%; max-width: 500px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 2rem; }
    h1 { color: #42b883; text-align: center; margin-bottom: 1rem; }
    .input-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    input { flex: 1; padding: 0.6rem 1rem; border: 2px solid #e9ecef; border-radius: 8px; font-size: 1rem; outline: none; }
    input:focus { border-color: #42b883; }
    button { padding: 0.6rem 1rem; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
    .btn-primary { background: #42b883; color: white; }
    .btn-primary:hover { background: #369970; }
    .btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
    .btn-danger { background: #ff6b6b; color: white; }
    .btn-danger:hover { background: #ee5a5a; }
    .btn-secondary { background: #e9ecef; color: #495057; }
    .btn-secondary:hover { background: #dee2e6; }
    .toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .list { list-style: none; padding: 0; }
    .list-item { display: flex; align-items: center; justify-content: space-between; padding: 0.7rem 1rem; border: 1px solid #eee; border-radius: 8px; margin-bottom: 0.5rem; transition: all 0.2s; }
    .list-item:hover { border-color: #42b883; }
    .item-text { font-size: 1rem; }
    .item-actions { display: flex; gap: 0.3rem; }
    .empty { text-align: center; color: #aaa; padding: 2rem; }
    .count { text-align: center; color: #888; font-size: 0.9rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    const app = createApp({
      name: 'ReactiveList',
      state: () => ({
        items: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'],
        newItem: '',
        nextId: 6
      }),
      methods: {
        addItem() {
          const text = this.newItem.trim()
          if (!text) return
          this.items.push(text)
          this.newItem = ''
        },
        removeItem(index) {
          this.items.splice(index, 1)
        },
        sortAsc() {
          this.items.sort()
        },
        sortDesc() {
          this.items.sort().reverse()
        },
        shuffle() {
          for (let i = this.items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.items[i], this.items[j]] = [this.items[j], this.items[i]]
          }
        },
        clearAll() {
          this.items.splice(0, this.items.length)
        }
      },
      render() {
        const listItems = this.items.map((item, index) =>
          h('li', { class: 'list-item', key: index }, [
            h('span', { class: 'item-text' }, item),
            h('div', { class: 'item-actions' }, [
              h('button', { class: 'btn-sm btn-danger', onClick: () => this.removeItem(index) }, 'Remove')
            ])
          ])
        )

        return h('div', { class: 'app' }, [
          h('h1', null, 'Reactive List'),
          h('div', { class: 'input-row' }, [
            h('input', {
              type: 'text',
              placeholder: 'Add new item...',
              value: this.newItem,
              onInput: (e) => { this.newItem = e.target.value },
              onKeydown: (e) => { if (e.key === 'Enter') this.addItem() }
            }),
            h('button', { class: 'btn-primary', onClick: () => this.addItem() }, 'Add')
          ]),
          h('div', { class: 'toolbar' }, [
            h('button', { class: 'btn-secondary', onClick: () => this.sortAsc() }, 'Sort A-Z'),
            h('button', { class: 'btn-secondary', onClick: () => this.sortDesc() }, 'Sort Z-A'),
            h('button', { class: 'btn-secondary', onClick: () => this.shuffle() }, 'Shuffle'),
            h('button', { class: 'btn-sm btn-danger', onClick: () => this.clearAll() }, 'Clear All')
          ]),
          h('div', { class: 'count' }, this.items.length + ' items'),
          this.items.length === 0
            ? h('div', { class: 'empty' }, 'List is empty')
            : h('ul', { class: 'list' }, listItems)
        ])
      }
    })

    app.mount('#app')
  </script>
</body>
</html>`
  },

  'signal-demo': {
    name: 'Signal Demo',
    description: 'Fine-grained reactivity with signals',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 2rem; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .app { width: 100%; max-width: 600px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 2rem; }
    h1 { color: #42b883; text-align: center; margin-bottom: 0.5rem; }
    .subtitle { text-align: center; color: #888; margin-bottom: 1.5rem; }
    .demo-section { padding: 1.5rem; border: 1px solid #eee; border-radius: 8px; margin-bottom: 1rem; }
    .demo-section h3 { color: #333; margin-top: 0; margin-bottom: 1rem; }
    .signal-value { font-size: 2rem; font-weight: 700; color: #42b883; margin: 0.5rem 0; }
    .computed-value { font-size: 1.2rem; color: #6c757d; margin: 0.5rem 0; }
    button { padding: 0.5rem 1.2rem; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; transition: all 0.2s; margin: 0.25rem; }
    .btn { background: #42b883; color: white; }
    .btn:hover { background: #369970; }
    .btn-outline { background: transparent; border: 2px solid #42b883; color: #42b883; }
    .btn-outline:hover { background: #42b883; color: white; }
    .log { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; font-family: monospace; font-size: 0.85rem; max-height: 150px; overflow-y: auto; margin-top: 0.5rem; }
    .log-entry { padding: 0.15rem 0; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h, signal, computed, effect, batch } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    const app = createApp({
      name: 'SignalDemo',
      state: () => ({
        logs: [],
        firstName: signal('Lyt'),
        lastName: signal('JS'),
        count: signal(0),
        doubleCount: computed(() => count() * 2),
        fullName: computed(() => firstName() + ' ' + lastName())
      }),
      mounted() {
        // Set up signal effects
        effect((onCleanup) => {
          this.logs.push('fullName changed: ' + this.fullName())
          if (this.logs.length > 20) this.logs.shift()
        })

        effect((onCleanup) => {
          this.logs.push('doubleCount changed: ' + this.doubleCount())
          if (this.logs.length > 20) this.logs.shift()
        })
      },
      methods: {
        setFirstName(name) {
          this.firstName.set(name)
        },
        setLastName(name) {
          this.lastName.set(name)
        },
        incrementCount() {
          this.count.update(n => n + 1)
        },
        batchUpdate() {
          batch(() => {
            this.count.update(n => n + 1)
            this.count.update(n => n + 1)
            this.count.update(n => n + 1)
            this.firstName.set('Batch')
            this.lastName.set('Update')
          })
        }
      },
      render() {
        const logEntries = this.logs.map((log, i) =>
          h('div', { class: 'log-entry', key: i }, log)
        )

        return h('div', { class: 'app' }, [
          h('h1', null, 'Signal Demo'),
          h('p', { class: 'subtitle' }, 'Fine-grained reactivity with automatic dependency tracking'),
          h('div', { class: 'demo-section' }, [
            h('h3', null, 'Computed Signals'),
            h('div', { class: 'signal-value' }, this.fullName()),
            h('div', { class: 'computed-value' }, 'First: ' + this.firstName()),
            h('div', { class: 'computed-value' }, 'Last: ' + this.lastName()),
            h('div', null, [
              h('button', { class: 'btn', onClick: () => this.setFirstName('Hello') }, 'First = Hello'),
              h('button', { class: 'btn', onClick: () => this.setFirstName('World') }, 'First = World'),
              h('button', { class: 'btn-outline', onClick: () => this.setLastName('Framework') }, 'Last = Framework')
            ])
          ]),
          h('div', { class: 'demo-section' }, [
            h('h3', null, 'Counter Signal'),
            h('div', { class: 'signal-value' }, String(this.count())),
            h('div', { class: 'computed-value' }, 'Double: ' + this.doubleCount()),
            h('div', null, [
              h('button', { class: 'btn', onClick: () => this.incrementCount() }, 'Count + 1'),
              h('button', { class: 'btn-outline', onClick: () => this.batchUpdate() }, 'Batch + 3')
            ])
          ]),
          h('div', { class: 'demo-section' }, [
            h('h3', null, 'Effect Log'),
            h('div', { class: 'log' }, logEntries.length > 0 ? logEntries : h('div', { class: 'log-entry' }, 'Waiting for changes...'))
          ])
        ])
      }
    })

    app.mount('#app')
  </script>
</body>
</html>`
  },

  'component-composition': {
    name: 'Component Composition',
    description: 'Building apps with composed components',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 2rem; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .app { width: 100%; max-width: 600px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 2rem; }
    h1 { color: #42b883; text-align: center; margin-bottom: 1.5rem; }
    .card { border: 1px solid #eee; border-radius: 8px; padding: 1.2rem; margin-bottom: 1rem; }
    .card h3 { margin: 0 0 0.5rem; color: #333; }
    .card p { margin: 0 0 0.8rem; color: #666; }
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
    .badge-green { background: #d4edda; color: #155724; }
    .badge-blue { background: #d1ecf1; color: #0c5460; }
    .badge-orange { background: #fff3cd; color: #856404; }
    .user-list { display: flex; flex-direction: column; gap: 0.8rem; }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
    .btn-primary { background: #42b883; color: white; }
    .btn-primary:hover { background: #369970; }
    .btn-sm { padding: 0.3rem 0.7rem; font-size: 0.8rem; }
    .btn-danger { background: #ff6b6b; color: white; }
    .btn-danger:hover { background: #ee5a5a; }
    .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .count { color: #888; font-size: 0.9rem; }
    .empty { text-align: center; color: #aaa; padding: 2rem; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    // Badge Component
    const Badge = {
      name: 'Badge',
      props: { text: String, color: String },
      render() {
        const colorClass = this.color === 'green' ? 'badge-green'
          : this.color === 'blue' ? 'badge-blue'
          : 'badge-orange'
        return h('span', { class: 'badge ' + colorClass }, this.text)
      }
    }

    // UserCard Component
    const UserCard = {
      name: 'UserCard',
      props: { user: Object, onRemove: Function },
      render() {
        return h('div', { class: 'card' }, [
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
            h('h3', null, this.user.name),
            h(Badge, { text: this.user.role, color: this.user.badgeColor })
          ]),
          h('p', null, this.user.bio),
          h('button', {
            class: 'btn btn-sm btn-danger',
            onClick: () => this.onRemove(this.user.id)
          }, 'Remove')
        ])
      }
    }

    // App
    const app = createApp({
      name: 'ComponentApp',
      state: () => ({
        users: [
          { id: 1, name: 'Alice Chen', role: 'Developer', badgeColor: 'green', bio: 'Full-stack developer passionate about web technologies.' },
          { id: 2, name: 'Bob Wang', role: 'Designer', badgeColor: 'blue', bio: 'UI/UX designer creating beautiful user experiences.' },
          { id: 3, name: 'Carol Li', role: 'Manager', badgeColor: 'orange', bio: 'Project manager keeping everything on track.' }
        ]
      }),
      methods: {
        removeUser(id) {
          this.users = this.users.filter(u => u.id !== id)
        }
      },
      render() {
        const cards = this.users.map(user =>
          h(UserCard, {
            key: user.id,
            user: user,
            onRemove: (id) => this.removeUser(id)
          })
        )

        return h('div', { class: 'app' }, [
          h('h1', null, 'Component Composition'),
          h('div', { class: 'header-bar' }, [
            h('span', { class: 'count' }, this.users.length + ' team members')
          ]),
          h('div', { class: 'user-list' },
            this.users.length > 0 ? cards : h('div', { class: 'empty' }, 'No team members')
          )
        ])
      }
    })

    app.component('Badge', Badge)
    app.component('UserCard', UserCard)
    app.mount('#app')
  </script>
</body>
</html>`
  },

  'form-validation': {
    name: 'Form Validation',
    description: 'Form with real-time validation and error messages',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 2rem; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .app { width: 100%; max-width: 480px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 2rem; }
    h1 { color: #42b883; text-align: center; margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1.2rem; }
    label { display: block; font-weight: 600; margin-bottom: 0.4rem; color: #333; font-size: 0.95rem; }
    input, textarea, select { width: 100%; padding: 0.7rem 1rem; border: 2px solid #e9ecef; border-radius: 8px; font-size: 1rem; outline: none; box-sizing: border-box; transition: border-color 0.2s; font-family: inherit; }
    input:focus, textarea:focus, select:focus { border-color: #42b883; }
    input.error, textarea.error, select.error { border-color: #ff6b6b; }
    .error-msg { color: #ff6b6b; font-size: 0.85rem; margin-top: 0.3rem; }
    .success-msg { color: #42b883; font-size: 0.85rem; margin-top: 0.3rem; }
    .btn { padding: 0.7rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; transition: all 0.2s; }
    .btn-primary { background: #42b883; color: white; width: 100%; }
    .btn-primary:hover { background: #369970; }
    .btn-primary:disabled { background: #aaa; cursor: not-allowed; }
    .btn-secondary { background: #e9ecef; color: #495057; width: 100%; margin-top: 0.5rem; }
    .btn-secondary:hover { background: #dee2e6; }
    .result { margin-top: 1.5rem; padding: 1.5rem; background: #f8f9fa; border-radius: 8px; display: none; }
    .result h3 { color: #42b883; margin-top: 0; }
    .result p { color: #555; margin: 0.3rem 0; }
    .password-strength { height: 4px; border-radius: 2px; background: #e9ecef; margin-top: 0.4rem; overflow: hidden; }
    .strength-bar { height: 100%; border-radius: 2px; transition: all 0.3s; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h, computed } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    const app = createApp({
      name: 'FormValidation',
      state: () => ({
        form: {
          name: '',
          email: '',
          password: '',
          role: ''
        },
        errors: {},
        touched: {},
        submitted: false,
        submittedData: null
      }),
      computed: {
        passwordStrength() {
          const p = this.form.password
          if (!p) return { score: 0, text: '', color: '#e9ecef' }
          let score = 0
          if (p.length >= 6) score++
          if (p.length >= 10) score++
          if (/[A-Z]/.test(p)) score++
          if (/[0-9]/.test(p)) score++
          if (/[^A-Za-z0-9]/.test(p)) score++
          const levels = [
            { text: 'Very Weak', color: '#ff6b6b' },
            { text: 'Weak', color: '#ffa502' },
            { text: 'Fair', color: '#f0ad4e' },
            { text: 'Good', color: '#42b883' },
            { text: 'Strong', color: '#20bf6b' }
          ]
          const level = levels[Math.min(score, levels.length) - 1] || levels[0]
          return { score, text: level.text, color: level.color, width: (score / 5 * 100) + '%' }
        },
        isValid() {
          return !this.validateForm()
        }
      },
      methods: {
        validateField(field) {
          const val = this.form[field]
          switch (field) {
            case 'name':
              if (!val.trim()) return 'Name is required'
              if (val.trim().length < 2) return 'Name must be at least 2 characters'
              return ''
            case 'email':
              if (!val.trim()) return 'Email is required'
              if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(val)) return 'Invalid email format'
              return ''
            case 'password':
              if (!val) return 'Password is required'
              if (val.length < 6) return 'Password must be at least 6 characters'
              return ''
            case 'role':
              if (!val) return 'Please select a role'
              return ''
            default:
              return ''
          }
        },
        validateForm() {
          const errors = {}
          let hasError = false
          for (const field of ['name', 'email', 'password', 'role']) {
            const error = this.validateField(field)
            if (error) {
              errors[field] = error
              hasError = true
            }
          }
          return hasError ? errors : null
        },
        handleInput(field, e) {
          this.form[field] = e.target.value
          this.touched[field] = true
          if (this.submitted) {
            const error = this.validateField(field)
            if (error) this.errors[field] = error
            else delete this.errors[field]
          }
        },
        handleBlur(field) {
          this.touched[field] = true
          const error = this.validateField(field)
          if (error) this.errors[field] = error
          else delete this.errors[field]
        },
        submit() {
          this.submitted = true
          const errors = this.validateForm()
          if (errors) {
            this.errors = errors
            return
          }
          this.submittedData = { ...this.form }
          console.log('Form submitted:', this.submittedData)
        },
        reset() {
          this.form = { name: '', email: '', password: '', role: '' }
          this.errors = {}
          this.touched = {}
          this.submitted = false
          this.submittedData = null
        }
      },
      render() {
        const makeField = (field, label, type, placeholder) => {
          const hasError = this.errors[field] && (this.touched[field] || this.submitted)
          return h('div', { class: 'form-group' }, [
            h('label', null, label),
            h('input', {
              type: type,
              placeholder: placeholder,
              value: this.form[field],
              class: hasError ? 'error' : '',
              onInput: (e) => this.handleInput(field, e),
              onBlur: () => this.handleBlur(field)
            }),
            hasError ? h('div', { class: 'error-msg' }, this.errors[field]) : null
          ])
        }

        return h('div', { class: 'app' }, [
          h('h1', null, 'Form Validation'),
          makeField('name', 'Full Name', 'text', 'Enter your name'),
          makeField('email', 'Email', 'email', 'Enter your email'),
          h('div', { class: 'form-group' }, [
            h('label', null, 'Password'),
            h('input', {
              type: 'password',
              placeholder: 'Enter your password',
              value: this.form.password,
              class: (this.errors.password && (this.touched.password || this.submitted)) ? 'error' : '',
              onInput: (e) => this.handleInput('password', e),
              onBlur: () => this.handleBlur('password')
            }),
            this.form.password ? h('div', { class: 'password-strength' }, [
              h('div', { class: 'strength-bar', style: { width: this.passwordStrength.width, background: this.passwordStrength.color } })
            ]) : null,
            this.form.password ? h('div', { class: 'success-msg' }, this.passwordStrength.text) : null,
            (this.errors.password && (this.touched.password || this.submitted)) ? h('div', { class: 'error-msg' }, this.errors.password) : null
          ]),
          h('div', { class: 'form-group' }, [
            h('label', null, 'Role'),
            h('select', {
              value: this.form.role,
              class: (this.errors.role && (this.touched.role || this.submitted)) ? 'error' : '',
              onChange: (e) => this.handleInput('role', e)
            }, [
              h('option', { value: '' }, '-- Select Role --'),
              h('option', { value: 'developer' }, 'Developer'),
              h('option', { value: 'designer' }, 'Designer'),
              h('option', { value: 'manager' }, 'Manager'),
              h('option', { value: 'other' }, 'Other')
            ]),
            (this.errors.role && (this.touched.role || this.submitted)) ? h('div', { class: 'error-msg' }, this.errors.role) : null
          ]),
          h('button', { class: 'btn btn-primary', onClick: () => this.submit() }, 'Submit'),
          h('button', { class: 'btn btn-secondary', onClick: () => this.reset() }, 'Reset'),
          this.submittedData ? h('div', { class: 'result', style: { display: 'block' } }, [
            h('h3', null, 'Submitted Successfully!'),
            h('p', null, 'Name: ' + this.submittedData.name),
            h('p', null, 'Email: ' + this.submittedData.email),
            h('p', null, 'Role: ' + this.submittedData.role)
          ]) : null
        ])
      }
    })

    app.mount('#app')
  </script>
</body>
</html>`
  },

  'theme-switch': {
    name: 'Theme Switch',
    description: 'Dynamic theme switching with CSS variables',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f0f2f5;
      --text-primary: #333333;
      --text-secondary: #666666;
      --accent: #42b883;
      --accent-hover: #369970;
      --border: #e9ecef;
      --card-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    [data-theme="dark"] {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --text-primary: #e0e0e0;
      --text-secondary: #a0a0a0;
      --accent: #42b883;
      --accent-hover: #369970;
      --border: #2a2a4a;
      --card-shadow: 0 4px 24px rgba(0,0,0,0.3);
    }
    [data-theme="sunset"] {
      --bg-primary: #fff5f0;
      --bg-secondary: #ffe8dc;
      --text-primary: #4a3728;
      --text-secondary: #8b7355;
      --accent: #e17055;
      --accent-hover: #d35400;
      --border: #f0d0b8;
      --card-shadow: 0 4px 24px rgba(224,112,85,0.15);
    }
    [data-theme="ocean"] {
      --bg-primary: #f0f8ff;
      --bg-secondary: #e0f0ff;
      --text-primary: #1a365d;
      --text-secondary: #4a7ab5;
      --accent: #0984e3;
      --accent-hover: #0770c2;
      --border: #b8d8f8;
      --card-shadow: 0 4px 24px rgba(9,132,227,0.12);
    }
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 2rem; min-height: 100vh; margin: 0; background: var(--bg-secondary); color: var(--text-primary); transition: all 0.3s; }
    .app { width: 100%; max-width: 600px; background: var(--bg-primary); border-radius: 12px; box-shadow: var(--card-shadow); padding: 2rem; transition: all 0.3s; }
    h1 { color: var(--accent); text-align: center; margin-bottom: 0.5rem; transition: color 0.3s; }
    .subtitle { text-align: center; color: var(--text-secondary); margin-bottom: 1.5rem; transition: color 0.3s; }
    .theme-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem; margin-bottom: 1.5rem; }
    .theme-btn { padding: 1rem; border: 2px solid var(--border); border-radius: 10px; cursor: pointer; text-align: center; transition: all 0.2s; background: var(--bg-primary); }
    .theme-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .theme-btn.active { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(66,184,131,0.2); }
    .theme-name { font-weight: 600; color: var(--text-primary); margin-bottom: 0.3rem; }
    .theme-preview { display: flex; gap: 4px; justify-content: center; }
    .color-dot { width: 16px; height: 16px; border-radius: 50%; }
    .demo-area { border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; transition: all 0.3s; }
    .demo-area h3 { color: var(--text-primary); margin-top: 0; }
    .demo-area p { color: var(--text-secondary); }
    .demo-btn { padding: 0.6rem 1.2rem; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; transition: background 0.2s; }
    .demo-btn:hover { background: var(--accent-hover); }
    .demo-input { padding: 0.6rem 1rem; border: 2px solid var(--border); border-radius: 8px; background: var(--bg-primary); color: var(--text-primary); font-size: 1rem; outline: none; width: 100%; box-sizing: border-box; margin-top: 0.5rem; }
    .demo-input:focus { border-color: var(--accent); }
    .current-theme { text-align: center; color: var(--text-secondary); font-size: 0.9rem; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    const themes = {
      light: { name: 'Light', colors: ['#ffffff', '#f0f2f5', '#42b883', '#333333'] },
      dark: { name: 'Dark', colors: ['#1a1a2e', '#16213e', '#42b883', '#e0e0e0'] },
      sunset: { name: 'Sunset', colors: ['#fff5f0', '#ffe8dc', '#e17055', '#4a3728'] },
      ocean: { name: 'Ocean', colors: ['#f0f8ff', '#e0f0ff', '#0984e3', '#1a365d'] }
    }

    const app = createApp({
      name: 'ThemeSwitch',
      state: () => ({
        currentTheme: 'light',
        inputValue: ''
      }),
      methods: {
        setTheme(theme) {
          this.currentTheme = theme
          if (theme === 'light') {
            document.documentElement.removeAttribute('data-theme')
          } else {
            document.documentElement.setAttribute('data-theme', theme)
          }
        }
      },
      render() {
        const themeButtons = Object.entries(themes).map(([key, theme]) =>
          h('div', {
            class: 'theme-btn' + (this.currentTheme === key ? ' active' : ''),
            key: key,
            onClick: () => this.setTheme(key)
          }, [
            h('div', { class: 'theme-name' }, theme.name),
            h('div', { class: 'theme-preview' },
              theme.colors.map(c =>
                h('div', { class: 'color-dot', key: c, style: { background: c } })
              )
            )
          ])
        )

        return h('div', { class: 'app' }, [
          h('h1', null, 'Theme Switch'),
          h('p', { class: 'subtitle' }, 'Dynamic theming with CSS custom properties'),
          h('div', { class: 'theme-grid' }, themeButtons),
          h('div', { class: 'demo-area' }, [
            h('h3', null, 'Preview Area'),
            h('p', null, 'This area uses CSS variables for all colors. Try switching themes!'),
            h('input', {
              class: 'demo-input',
              type: 'text',
              placeholder: 'Type something...',
              value: this.inputValue,
              onInput: (e) => { this.inputValue = e.target.value }
            }),
            h('div', { style: { marginTop: '0.8rem' } }, [
              h('button', { class: 'demo-btn' }, 'Theme Button')
            ])
          ]),
          h('div', { class: 'current-theme' }, 'Current theme: ' + themes[this.currentTheme].name)
        ])
      }
    })

    app.mount('#app')
  </script>
</body>
</html>`
  },

  'reactive-computed': {
    name: 'Reactive Computed',
    description: 'Computed properties and watchers in action',
    code: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 2rem; min-height: 100vh; margin: 0; background: #f0f2f5; }
    .app { width: 100%; max-width: 550px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 2rem; }
    h1 { color: #42b883; text-align: center; margin-bottom: 1.5rem; }
    .section { border: 1px solid #eee; border-radius: 8px; padding: 1.2rem; margin-bottom: 1rem; }
    .section h3 { color: #333; margin-top: 0; margin-bottom: 0.8rem; }
    .slider-group { margin-bottom: 1rem; }
    .slider-label { display: flex; justify-content: space-between; color: #555; margin-bottom: 0.3rem; font-size: 0.95rem; }
    input[type="range"] { width: 100%; accent-color: #42b883; }
    .result { text-align: center; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
    .result-value { font-size: 2.5rem; font-weight: 700; color: #42b883; }
    .result-label { color: #888; font-size: 0.9rem; }
    .color-preview { width: 100%; height: 60px; border-radius: 8px; margin-top: 0.5rem; transition: background 0.3s; }
    .watch-log { background: #1e1e1e; color: #d4d4d4; padding: 0.8rem; border-radius: 8px; font-family: monospace; font-size: 0.8rem; max-height: 120px; overflow-y: auto; }
    .watch-entry { padding: 0.15rem 0; }
    .btn-clear { padding: 0.3rem 0.8rem; background: #e9ecef; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createApp, h, computed, watch } from 'https://cdn.jsdelivr.net/npm/@lytjs/lytjs@5.0.0/dist/index.mjs'

    const app = createApp({
      name: 'ReactiveComputed',
      state: () => ({
        price: 100,
        quantity: 1,
        taxRate: 10,
        discount: 0,
        red: 66,
        green: 184,
        blue: 131,
        watchLogs: []
      }),
      computed: {
        subtotal() { return this.price * this.quantity },
        taxAmount() { return this.subtotal * this.taxRate / 100 },
        total() { return this.subtotal + this.taxAmount - this.discount },
        rgbColor() { return 'rgb(' + this.red + ',' + this.green + ',' + this.blue + ')' },
        hexColor() {
          const toHex = (n) => n.toString(16).padStart(2, '0')
          return '#' + toHex(this.red) + toHex(this.green) + toHex(this.blue)
        }
      },
      mounted() {
        watch(
          () => this.total,
          (newVal, oldVal) => {
            this.watchLogs.push('Total changed: ' + oldVal.toFixed(2) + ' -> ' + newVal.toFixed(2))
            if (this.watchLogs.length > 15) this.watchLogs.shift()
          }
        )
        watch(
          () => this.hexColor,
          (newVal) => {
            this.watchLogs.push('Color changed: ' + newVal)
            if (this.watchLogs.length > 15) this.watchLogs.shift()
          }
        )
      },
      methods: {
        clearLogs() { this.watchLogs = [] }
      },
      render() {
        const makeSlider = (label, field, min, max, step) =>
          h('div', { class: 'slider-group' }, [
            h('div', { class: 'slider-label' }, [
              h('span', null, label),
              h('span', null, String(this[field]))
            ]),
            h('input', {
              type: 'range',
              min: String(min),
              max: String(max),
              step: String(step || 1),
              value: String(this[field]),
              onInput: (e) => { this[field] = parseFloat(e.target.value) }
            })
          ])

        const logEntries = this.watchLogs.map((log, i) =>
          h('div', { class: 'watch-entry', key: i }, log)
        )

        return h('div', { class: 'app' }, [
          h('h1', null, 'Computed & Watch'),
          h('div', { class: 'section' }, [
            h('h3', null, 'Price Calculator'),
            makeSlider('Price ($)', 'price', 1, 500, 1),
            makeSlider('Quantity', 'quantity', 1, 20, 1),
            makeSlider('Tax Rate (%)', 'taxRate', 0, 30, 0.5),
            makeSlider('Discount ($)', 'discount', 0, 200, 5),
            h('div', { class: 'result' }, [
              h('div', { class: 'result-value' }, '$' + this.total.toFixed(2)),
              h('div', { class: 'result-label' },
                'Subtotal: $' + this.subtotal.toFixed(2) + ' + Tax: $' + this.taxAmount.toFixed(2) + ' - Discount: $' + this.discount.toFixed(2)
              )
            ])
          ]),
          h('div', { class: 'section' }, [
            h('h3', null, 'Color Mixer'),
            makeSlider('Red', 'red', 0, 255, 1),
            makeSlider('Green', 'green', 0, 255, 1),
            makeSlider('Blue', 'blue', 0, 255, 1),
            h('div', { class: 'color-preview', style: { background: this.rgbColor } }),
            h('div', { style: { textAlign: 'center', marginTop: '0.5rem', color: '#555', fontFamily: 'monospace' } }, this.hexColor.toUpperCase())
          ]),
          h('div', { class: 'section' }, [
            h('h3', null, 'Watch Log'),
            h('div', { class: 'watch-log' },
              logEntries.length > 0 ? logEntries : h('div', { class: 'watch-entry' }, 'Waiting for changes...')
            ),
            h('button', { class: 'btn-clear', onClick: () => this.clearLogs() }, 'Clear Log')
          ])
        ])
      }
    })

    app.mount('#app')
  </script>
</body>
</html>`
  }
}

// Get template list for dropdown
function getTemplateList() {
  return Object.entries(TEMPLATES).map(([key, tmpl]) => ({
    key,
    name: tmpl.name,
    description: tmpl.description
  }))
}

// Get template code by key
function getTemplate(key) {
  return TEMPLATES[key] ? TEMPLATES[key].code : null
}

// Get default template key
function getDefaultTemplateKey() {
  return 'hello-world'
}
