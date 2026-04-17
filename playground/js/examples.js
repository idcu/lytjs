/**
 * Lyt.js Playground - 内置示例代码
 */

const EXAMPLES = [
  {
    id: 'hello-world',
    name: 'Hello World',
    description: '最简单的 Lyt.js 应用',
    code: `<div id="app"></div>
<style>
  .hello {
    text-align: center;
    padding: 40px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .hello h1 {
    font-size: 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }
  .hello p {
    color: #888;
    font-size: 14px;
  }
</style>
<script>
const { createApp, h, reactive } = Lyt

const app = createApp({
  state: () => ({
    message: 'Hello, Lyt.js!'
  }),
  render() {
    return h('div', { class: 'hello' }, [
      h('h1', null, this.message),
      h('p', null, '\u8F7B\u5199\u8F7B\u8DD1\uFF0C\u6240\u89C1\u5373\u4EE3\u7801')
    ])
  }
})

app.mount('#app')
<\/script>`
  },
  {
    id: 'counter',
    name: '\u8BA1\u6570\u5668',
    description: '\u54CD\u5E94\u5F0F\u72B6\u6001\u4E0E\u4E8B\u4EF6\u7ED1\u5B9A',
    code: `<div id="app"></div>
<style>
  .counter {
    text-align: center;
    padding: 40px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .counter h2 {
    font-size: 48px;
    font-weight: 200;
    color: #667eea;
    margin-bottom: 24px;
  }
  .btn-group {
    display: flex;
    gap: 12px;
    justify-content: center;
  }
  .btn {
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn-primary { background: #667eea; color: #fff; }
  .btn-secondary { background: #f0f0f5; color: #667eea; }
  .btn-danger { background: #fff0f0; color: #e74c3c; }
</style>
<script>
const { createApp, h, reactive } = Lyt

const app = createApp({
  state: () => ({
    count: 0
  }),
  render() {
    const self = this
    return h('div', { class: 'counter' }, [
      h('h2', null, '\u8BA1\u6570\u5668: ' + self.count),
      h('div', { class: 'btn-group' }, [
        h('button', { class: 'btn btn-primary', onclick: () => self.count++ }, '+1'),
        h('button', { class: 'btn btn-secondary', onclick: () => self.count-- }, '-1'),
        h('button', { class: 'btn btn-danger', onclick: () => self.count = 0 }, '\u91CD\u7F6E')
      ])
    ])
  }
})

app.mount('#app')
<\/script>`
  },
  {
    id: 'todo-list',
    name: 'Todo List',
    description: '\u5B8C\u6574\u7684\u5F85\u529E\u4E8B\u9879\u5E94\u7528',
    code: `<div id="app"></div>
<style>
  .todo-app {
    max-width: 480px;
    margin: 20px auto;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .todo-app h1 {
    font-size: 24px;
    color: #333;
    margin-bottom: 16px;
  }
  .input-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  .input-row input {
    flex: 1;
    padding: 10px 14px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  .input-row input:focus { border-color: #667eea; }
  .btn-add {
    padding: 10px 20px;
    background: #667eea;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-add:hover { background: #5a6fd6; }
  .todo-list { list-style: none; padding: 0; }
  .todo-item {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    gap: 12px;
  }
  .todo-item.done span { text-decoration: line-through; color: #bbb; }
  .todo-item input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
  .todo-item span { flex: 1; font-size: 14px; }
  .btn-delete {
    padding: 4px 12px;
    background: #fff0f0;
    color: #e74c3c;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  .btn-delete:hover { background: #ffe0e0; }
  .stats { margin-top: 16px; font-size: 13px; color: #888; }
</style>
<script>
const { createApp, h, reactive, computed } = Lyt

const app = createApp({
  state: () => ({
    newTodo: '',
    todos: [
      { id: 1, text: '\u5B66\u4E60 Lyt.js', done: false },
      { id: 2, text: '\u5199\u4E00\u4E2A\u793A\u4F8B', done: true },
    ],
    nextId: 3
  }),
  render() {
    const self = this
    const remaining = self.todos.filter(t => !t.done).length

    return h('div', { class: 'todo-app' }, [
      h('h1', null, '\u5F85\u529E\u4E8B\u9879'),

      h('div', { class: 'input-row' }, [
        h('input', {
          type: 'text',
          placeholder: '\u6DFB\u52A0\u65B0\u4EFB\u52A1...',
          value: self.newTodo,
          oninput: (e) => { self.newTodo = e.target.value }
        }),
        h('button', {
          class: 'btn-add',
          onclick: () => {
            if (self.newTodo.trim()) {
              self.todos.push({ id: self.nextId++, text: self.newTodo.trim(), done: false })
              self.newTodo = ''
            }
          }
        }, '\u6DFB\u52A0')
      ]),

      h('ul', { class: 'todo-list' },
        self.todos.map(todo =>
          h('li', { class: 'todo-item' + (todo.done ? ' done' : '') }, [
            h('input', {
              type: 'checkbox',
              checked: todo.done,
              onchange: () => { todo.done = !todo.done }
            }),
            h('span', null, todo.text),
            h('button', {
              class: 'btn-delete',
              onclick: () => {
                const idx = self.todos.indexOf(todo)
                if (idx > -1) self.todos.splice(idx, 1)
              }
            }, '\u5220\u9664')
          ])
        )
      ),

      h('div', { class: 'stats' },
        '\u5171 ' + self.todos.length + ' \u9879\uFF0C\u5269\u4F59 ' + remaining + ' \u9879\u672A\u5B8C\u6210'
      )
    ])
  }
})

app.mount('#app')
<\/script>`
  },
  {
    id: 'template-syntax',
    name: '\u6A21\u677F\u8BED\u6CD5',
    description: 'Lyt.js \u589E\u5F3A HTML \u6A21\u677F\u8BED\u6CD5\u6F14\u793A',
    code: `<div id="app"></div>
<style>
  .template-demo {
    max-width: 480px;
    margin: 20px auto;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .template-demo h1 { font-size: 24px; color: #333; margin-bottom: 16px; }
  .card {
    background: #f8f9ff;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 12px;
    border: 1px solid #e8e8f0;
  }
  .card h3 { color: #667eea; margin-bottom: 8px; font-size: 16px; }
  .card p { color: #555; font-size: 14px; line-height: 1.6; }
  .tag {
    display: inline-block;
    padding: 2px 8px;
    background: #667eea;
    color: #fff;
    border-radius: 4px;
    font-size: 12px;
    margin-right: 4px;
  }
  .highlight { color: #667eea; font-weight: 600; }
  .code-block {
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 16px;
    border-radius: 8px;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    margin-top: 8px;
    overflow-x: auto;
  }
  .btn {
    padding: 8px 16px;
    background: #667eea;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    margin-top: 8px;
  }
  .btn:hover { background: #5a6fd6; }
</style>
<script>
const { createApp, h, reactive } = Lyt

const app = createApp({
  state: () => ({
    title: 'Lyt.js \u6A21\u677F\u8BED\u6CD5',
    features: ['\u54CD\u5E94\u5F0F\u7ED1\u5B9A', '\u6761\u4EF6\u6E32\u67D3', '\u5217\u8868\u6E32\u67D3', '\u4E8B\u4EF6\u5904\u7406'],
    showCode: false,
    clickCount: 0
  }),
  render() {
    const self = this
    return h('div', { class: 'template-demo' }, [
      h('h1', null, self.title),

      // \u529F\u80FD\u5217\u8868\u6E21\u67D3
      h('div', { class: 'card' }, [
        h('h3', null, '\u529F\u80FD\u7279\u6027'),
        h('div', null, self.features.map(f =>
          h('span', { class: 'tag' }, f)
        ))
      ]),

      // \u6761\u4EF6\u6E32\u67D3
      h('div', { class: 'card' }, [
        h('h3', null, '\u6761\u4EF6\u6E32\u67D3'),
        h('p', null, [
          '\u70B9\u51FB\u6B21\u6570: ',
          h('span', { class: 'highlight' }, String(self.clickCount)),
          self.clickCount > 5
            ? h('span', { style: { color: '#e74c3c', marginLeft: '8px' } }, ' \u70B9\u51FB\u5F88\u591A\u4E86\uFF01')
            : h('span', { style: { color: '#27ae60', marginLeft: '8px' } }, ' \u7EE7\u7EED\u70B9\u51FB...')
        ]),
        h('button', {
          class: 'btn',
          onclick: () => { self.clickCount++ }
        }, '\u70B9\u51FB\u6211')
      ]),

      // \u52A8\u6001\u5C55\u793A
      h('div', { class: 'card' }, [
        h('h3', null, '\u52A8\u6001\u5185\u5BB9'),
        h('button', {
          class: 'btn',
          onclick: () => { self.showCode = !self.showCode }
        }, self.showCode ? '\u9690\u85CF\u4EE3\u7801' : '\u663E\u793A\u4EE3\u7801'),
        self.showCode
          ? h('div', { class: 'code-block' }, 'const app = createApp({ ... })\\napp.mount(\\'#app\\')')
          : null
      ])
    ])
  }
})

app.mount('#app')
<\/script>`
  },
  {
    id: 'reactive-system',
    name: '\u54CD\u5E94\u5F0F\u7CFB\u7EDF',
    description: 'reactive\u3001computed\u3001watch\u3001watchEffect \u6F14\u793A',
    code: `<div id="app"></div>
<style>
  .reactive-demo {
    max-width: 520px;
    margin: 20px auto;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .reactive-demo h1 { font-size: 24px; color: #333; margin-bottom: 16px; }
  .section {
    background: #f8f9ff;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    border: 1px solid #e8e8f0;
  }
  .section h3 { color: #667eea; margin-bottom: 12px; font-size: 16px; }
  .row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .row label { min-width: 80px; font-size: 14px; color: #555; }
  .row input {
    padding: 8px 12px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    width: 120px;
  }
  .row input:focus { border-color: #667eea; }
  .result {
    background: #1e1e2e;
    color: #a6e3a1;
    padding: 12px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 13px;
    margin-top: 8px;
    white-space: pre-wrap;
  }
  .btn {
    padding: 6px 14px;
    background: #667eea;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  }
  .btn:hover { background: #5a6fd6; }
  .log-area {
    background: #1e1e2e;
    color: #cdd6f4;
    padding: 12px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    max-height: 150px;
    overflow-y: auto;
    margin-top: 8px;
  }
  .log-entry { margin-bottom: 2px; }
  .log-time { color: #89b4fa; }
  .log-msg { color: #a6e3a1; }
</style>
<script>
const { createApp, h, reactive, ref, computed, watch, watchEffect } = Lyt

const app = createApp({
  state: () => ({
    firstName: '\u5F20',
    lastName: '\u4E09',
    age: 25,
    logs: [],
    logId: 0
  }),
  init() {
    const self = this

    // computed: \u5168\u540D
    const fullName = computed(() => self.firstName + self.lastName)

    // watch: \u76D1\u542C\u5E74\u9F84\u53D8\u5316
    watch(
      () => self.age,
      (newVal, oldVal) => {
        self.logs.unshift({
          id: ++self.logId,
          type: 'watch',
          msg: '\u5E74\u9F84\u53D8\u5316: ' + oldVal + ' -> ' + newVal
        })
        if (self.logs.length > 20) self.logs.pop()
      }
    )

    // watchEffect: \u81EA\u52A8\u6536\u96C6\u4F9D\u8D56
    watchEffect(() => {
      self.logs.unshift({
        id: ++self.logId,
        type: 'watchEffect',
        msg: '\u540D\u5B57\u53D8\u5316: ' + self.firstName + self.lastName + ', \u5E74\u9F84: ' + self.age
      })
      if (self.logs.length > 20) self.logs.pop()
    })

    // \u5C06 computed \u6302\u8F7D\u5230 state \u4E0A\u4EE5\u4FBF\u5728 render \u4E2D\u4F7F\u7528
    self._fullName = fullName
  },
  render() {
    const self = this
    const fullName = self._fullName ? self._fullName.value : self.firstName + self.lastName

    return h('div', { class: 'reactive-demo' }, [
      h('h1', null, '\u54CD\u5E94\u5F0F\u7CFB\u7EDF\u6F14\u793A'),

      // reactive + computed
      h('div', { class: 'section' }, [
        h('h3', null, 'reactive + computed'),
        h('div', { class: 'row' }, [
          h('label', null, '\u59D3:'),
          h('input', { value: self.firstName, oninput: (e) => { self.firstName = e.target.value } })
        ]),
        h('div', { class: 'row' }, [
          h('label', null, '\u540D:'),
          h('input', { value: self.lastName, oninput: (e) => { self.lastName = e.target.value } })
        ]),
        h('div', { class: 'result' }, 'computed \u5168\u540D: ' + fullName)
      ]),

      // watch
      h('div', { class: 'section' }, [
        h('h3', null, 'watch'),
        h('div', { class: 'row' }, [
          h('label', null, '\u5E74\u9F84:'),
          h('input', { type: 'number', value: String(self.age), oninput: (e) => { self.age = parseInt(e.target.value) || 0 } }),
          h('button', { class: 'btn', onclick: () => { self.age++ } }, '+1'),
          h('button', { class: 'btn', onclick: () => { self.age-- } }, '-1')
        ])
      ]),

      // \u65E5\u5FD7
      h('div', { class: 'section' }, [
        h('h3', null, '\u54CD\u5E94\u5F0F\u65E5\u5FD7'),
        h('div', { class: 'log-area' },
          self.logs.map(log =>
            h('div', { class: 'log-entry' }, [
              h('span', { class: 'log-time' }, '[' + log.type + '] '),
              h('span', { class: 'log-msg' }, log.msg)
            ])
          )
        )
      ])
    ])
  }
})

app.mount('#app')
<\/script>`
  }
];
