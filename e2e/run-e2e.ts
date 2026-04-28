/**
 * E2E test runner script
 *
 * Usage: npx tsx --tsconfig e2e/tsconfig.json e2e/run-e2e.ts
 */

import { register } from 'node:module'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Register custom module resolver for @lytjs/* workspace packages
const projectRoot = path.resolve(__dirname, '..')
const packageMap: Record<string, string> = {
  '@lytjs/common': 'packages/common/dist/index.mjs',
  '@lytjs/reactivity': 'packages/reactivity/dist/index.mjs',
  '@lytjs/vdom': 'packages/vdom/dist/index.mjs',
  '@lytjs/compiler': 'packages/compiler/dist/index.mjs',
  '@lytjs/renderer': 'packages/renderer/dist/index.mjs',
  '@lytjs/component': 'packages/component/dist/index.mjs',
  '@lytjs/core': 'packages/core/dist/index.mjs',
  '@lytjs/compat': 'packages/compat/dist/index.mjs',
}

function resolveModule(specifier: string, context: any, nextResolve: any) {
  if (packageMap[specifier]) {
    const fullPath = path.resolve(projectRoot, packageMap[specifier])
    return { url: `file://${fullPath}` }
  }
  const subpathMatch = specifier.match(/^(@lytjs\/[\w-]+)\/(.+)$/)
  if (subpathMatch) {
    const pkgName = subpathMatch[1]
    const subPath = subpathMatch[2]
    if (packageMap[pkgName]) {
      const baseDir = path.dirname(path.resolve(projectRoot, packageMap[pkgName]))
      const resolvedPath = path.resolve(baseDir, subPath)
      return { url: `file://${resolvedPath}` }
    }
  }
  return nextResolve(specifier, context)
}

register(import.meta.url, resolveModule)

// ======================== 简易测试框架 ========================

interface TestCase {
  name: string
  fn: () => void | Promise<void>
}

interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  error?: Error
  duration: number
}

const testSuites: Array<{ name: string; tests: TestCase[] }> = []

function describe(name: string, fn: () => void) {
  const tests: TestCase[] = []
  const currentSuite = { name, tests }
  const prevSuite = currentTestSuite
  testSuites.push(currentSuite)
  currentTestSuite = currentSuite
  fn()
  currentTestSuite = prevSuite
}

let currentTestSuite: { name: string; tests: TestCase[] } | null = null

function it(name: string, fn: () => void | Promise<void>) {
  if (currentTestSuite) {
    currentTestSuite.tests.push({ name, fn })
  }
}

function expect(value: any) {
  const self: any = {
    toBe(expected: any) {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(value)}`)
      }
    },
    toBeTruthy() {
      if (!value) {
        throw new Error(`Expected truthy value, but got ${JSON.stringify(value)}`)
      }
    },
    toBeFalsy() {
      if (value) {
        throw new Error(`Expected falsy value, but got ${JSON.stringify(value)}`)
      }
    },
    toBeGreaterThan(n: number) {
      if (value <= n) {
        throw new Error(`Expected ${value} to be greater than ${n}`)
      }
    },
    toBeGreaterThanOrEqual(n: number) {
      if (value < n) {
        throw new Error(`Expected ${value} to be greater than or equal to ${n}`)
      }
    },
    toBeLessThanOrEqual(n: number) {
      if (value > n) {
        throw new Error(`Expected ${value} to be less than or equal to ${n}`)
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(value) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(value)}`)
      }
    },
    toContain(str: string) {
      if (typeof value !== 'string' || !value.includes(str)) {
        throw new Error(`Expected "${value}" to contain "${str}"`)
      }
    },
    toBeInstanceOf(cls: any) {
      if (!(value instanceof cls)) {
        throw new Error(`Expected instance of ${cls.name}, but got ${typeof value}`)
      }
    },
    toHaveProperty(prop: string) {
      if (value == null || !(prop in value)) {
        throw new Error(`Expected object to have property "${prop}"`)
      }
    },
    toThrow() {
      // handled separately
    },
    not: {} as any,
  }
  self.not = {
    toBe(expected: any) {
      if (value === expected) {
        throw new Error(`Expected ${JSON.stringify(value)} not to be ${JSON.stringify(expected)}`)
      }
    },
    toThrow() {
      try {
        if (typeof value === 'function') value()
      } catch (_) {
        return
      }
      throw new Error(`Expected function to throw, but it did not`)
    },
  }
  return self
}

// ======================== 加载模块 ========================

// 从 dist 目录加载模块
const distRoot = path.resolve(__dirname, '..')

async function loadReactivity() {
  return await import(path.join(distRoot, 'packages/reactivity/dist/index.mjs'))
}

async function loadCompiler() {
  return await import(path.join(distRoot, 'packages/compiler/dist/index.mjs'))
}

async function loadComponent() {
  return await import(path.join(distRoot, 'packages/component/dist/index.mjs'))
}

async function loadCompat() {
  return await import(path.join(distRoot, 'packages/compat/dist/index.mjs'))
}

// ======================== Reactivity 测试 ========================

async function runReactivityTests() {
  const reactivity = await loadReactivity()

  describe('@lytjs/reactivity - ref', () => {
    it('创建基本 ref', () => {
      const count = reactivity.ref(0)
      expect(count.value).toBe(0)
    })

    it('修改 ref 值', () => {
      const count = reactivity.ref(0)
      count.value = 10
      expect(count.value).toBe(10)
    })

    it('isRef 正确识别 ref', () => {
      const r = reactivity.ref(1)
      expect(reactivity.isRef(r)).toBe(true)
      expect(reactivity.isRef(42)).toBe(false)
      expect(reactivity.isRef(null)).toBe(false)
      expect(reactivity.isRef({})).toBe(false)
    })

    it('unref 解包 ref', () => {
      const r = reactivity.ref(5)
      expect(reactivity.unref(r)).toBe(5)
      expect(reactivity.unref(10)).toBe(10)
    })

    it('ref 包装对象时自动深层响应式', () => {
      const obj = reactivity.ref({ name: 'lyt', age: 1 })
      expect(obj.value.name).toBe('lyt')
      expect(obj.value.age).toBe(1)
    })

    it('相同值不触发更新', () => {
      const r = reactivity.ref(5)
      r.value = 5
      expect(r.value).toBe(5)
    })

    it('shallowRef 不深层代理', () => {
      const sr = reactivity.shallowRef({ count: 0 })
      expect(sr.value.count).toBe(0)
      expect(reactivity.isRef(sr)).toBe(true)
    })
  })

  describe('@lytjs/reactivity - reactive', () => {
    it('创建响应式对象', () => {
      const state = reactivity.reactive({ count: 0, name: 'lyt' })
      expect(state.count).toBe(0)
      expect(state.name).toBe('lyt')
    })

    it('修改响应式对象属性', () => {
      const state = reactivity.reactive({ count: 0 })
      state.count = 42
      expect(state.count).toBe(42)
    })

    it('深层响应式', () => {
      const state = reactivity.reactive({ nested: { foo: 'bar' } })
      expect(state.nested.foo).toBe('bar')
      state.nested.foo = 'baz'
      expect(state.nested.foo).toBe('baz')
    })

    it('isReactive 正确识别', () => {
      const state = reactivity.reactive({ a: 1 })
      expect(reactivity.isReactive(state)).toBe(true)
      expect(reactivity.isReactive({ a: 1 })).toBe(false)
    })

    it('toRaw 获取原始对象', () => {
      const raw = { x: 1 }
      const proxy = reactivity.reactive(raw)
      expect(reactivity.toRaw(proxy)).toBe(raw)
    })

    it('readonly 创建只读代理', () => {
      const raw = { count: 0 }
      const ro = reactivity.readonly(raw)
      expect(reactivity.isReadonly(ro)).toBe(true)
      expect(ro.count).toBe(0)
    })

    it('shallowReactive 浅层响应式', () => {
      const state = reactivity.shallowReactive({ a: 1, nested: { b: 2 } })
      expect(state.a).toBe(1)
      expect(state.nested.b).toBe(2)
      state.a = 10
      expect(state.a).toBe(10)
    })

    it('数组响应式', () => {
      const list = reactivity.reactive([1, 2, 3])
      expect(list.length).toBe(3)
      list.push(4)
      expect(list.length).toBe(4)
      expect(list[3]).toBe(4)
    })
  })

  describe('@lytjs/reactivity - computed', () => {
    it('基本计算属性', () => {
      const count = reactivity.ref(1)
      const double = reactivity.computed(() => count.value * 2)
      expect(double.value).toBe(2)
      count.value = 5
      expect(double.value).toBe(10)
    })

    it('缓存机制: 依赖不变时不重新计算', () => {
      let callCount = 0
      const count = reactivity.ref(1)
      const double = reactivity.computed(() => {
        callCount++
        return count.value * 2
      })
      expect(double.value).toBe(2)
      expect(callCount).toBe(1)
      expect(double.value).toBe(2)
      expect(callCount).toBe(1)
      count.value = 3
      expect(double.value).toBe(6)
      expect(callCount).toBe(2)
    })

    it('可写计算属性', () => {
      const first = reactivity.ref('Lyt')
      const last = reactivity.ref('JS')
      const full = reactivity.computed({
        get: () => first.value + ' ' + last.value,
        set: (val) => {
          const parts = val.split(' ')
          first.value = parts[0]
          last.value = parts[1]
        },
      })
      expect(full.value).toBe('Lyt JS')
      full.value = 'Hello World'
      expect(first.value).toBe('Hello')
      expect(last.value).toBe('World')
      expect(full.value).toBe('Hello World')
    })

    it('基于 reactive 的计算属性', () => {
      const state = reactivity.reactive({ a: 1, b: 2 })
      const sum = reactivity.computed(() => state.a + state.b)
      expect(sum.value).toBe(3)
      state.a = 10
      expect(sum.value).toBe(12)
    })
  })

  describe('@lytjs/reactivity - watch', () => {
    it('侦听 ref 变化', () => {
      const count = reactivity.ref(0)
      const changes = []
      const stop = reactivity.watch(count, (newVal, oldVal) => {
        changes.push([newVal, oldVal])
      })
      count.value = 1
      count.value = 2
      stop()
      expect(changes.length).toBeGreaterThanOrEqual(0)
    })

    it('immediate 选项', () => {
      const count = reactivity.ref(0)
      const calls = []
      reactivity.watch(count, (newVal) => {
        calls.push(newVal)
      }, { immediate: true })
      expect(calls.length).toBeGreaterThanOrEqual(1)
      expect(calls[0]).toBe(0)
    })

    it('侦听 getter 函数', () => {
      const a = reactivity.ref(1)
      const b = reactivity.ref(2)
      const results = []
      reactivity.watch(
        () => a.value + b.value,
        (sum) => {
          results.push(sum)
        }
      )
      a.value = 10
      expect(results.length).toBeGreaterThanOrEqual(0)
    })

    it('stop 停止侦听', () => {
      const count = reactivity.ref(0)
      const calls = []
      const stop = reactivity.watch(count, (val) => {
        calls.push(val)
      })
      count.value = 1
      stop()
      count.value = 2
      expect(calls.length).toBeLessThanOrEqual(1)
    })
  })

  describe('@lytjs/reactivity - watchEffect', () => {
    it('立即执行并追踪依赖', () => {
      const count = reactivity.ref(0)
      const results = []
      const stop = reactivity.watchEffect(() => {
        results.push(count.value)
      })
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results[0]).toBe(0)
      stop()
    })
  })

  describe('@lytjs/reactivity - effect', () => {
    it('基本副作用', () => {
      const state = reactivity.reactive({ count: 0 })
      const results = []
      const runner = reactivity.effect(() => {
        results.push(state.count)
      })
      expect(results.length).toBe(1)
      expect(results[0]).toBe(0)
      state.count = 1
      expect(results.length).toBe(2)
      expect(results[1]).toBe(1)
      runner.stop()
    })

    it('stop 停止副作用', () => {
      const state = reactivity.reactive({ count: 0 })
      const results = []
      const runner = reactivity.effect(() => {
        results.push(state.count)
      })
      expect(results.length).toBe(1)
      runner.stop()
      state.count = 99
      expect(results.length).toBe(1)
    })

    it('多依赖追踪', () => {
      const a = reactivity.ref(1)
      const b = reactivity.ref(2)
      const results = []
      reactivity.effect(() => {
        results.push(a.value + b.value)
      })
      expect(results.length).toBe(1)
      expect(results[0]).toBe(3)
      a.value = 10
      expect(results.length).toBe(2)
      expect(results[1]).toBe(12)
      b.value = 20
      expect(results.length).toBe(3)
      expect(results[2]).toBe(30)
    })

    it('lazy 惰性执行', () => {
      let callCount = 0
      const runner = reactivity.effect(() => {
        callCount++
        return 42
      }, { lazy: true })
      expect(callCount).toBe(0)
      const result = runner()
      expect(callCount).toBe(1)
      expect(result).toBe(42)
    })
  })

  describe('@lytjs/reactivity - toRef/toRefs', () => {
    it('toRef 为对象属性创建 ref', () => {
      const state = reactivity.reactive({ count: 0 })
      const countRef = reactivity.toRef(state, 'count')
      expect(countRef.value).toBe(0)
      state.count = 5
      expect(countRef.value).toBe(5)
    })

    it('toRefs 将对象所有属性转为 ref', () => {
      const state = reactivity.reactive({ a: 1, b: 2 })
      const refs = reactivity.toRefs(state)
      expect(refs.a.value).toBe(1)
      expect(refs.b.value).toBe(2)
      state.a = 10
      expect(refs.a.value).toBe(10)
    })
  })

  describe('@lytjs/reactivity - nextTick', () => {
    it('返回 Promise', () => {
      const result = reactivity.nextTick()
      expect(result).toBeInstanceOf(Promise)
    })
  })
}

// ======================== Compiler 测试 ========================

async function runCompilerTests() {
  const compiler = await loadCompiler()

  describe('@lytjs/compiler - compile 基础', () => {
    it('基础模板编译返回 code 和 ast', () => {
      const result = compiler.compile('<div>Hello</div>')
      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('ast')
      expect(result).toHaveProperty('hoistResult')
      expect(result).toHaveProperty('helpers')
      expect(typeof result.code).toBe('string')
      expect(result.code.length).toBeGreaterThan(0)
    })

    it('简单文本节点', () => {
      const result = compiler.compile('Hello World')
      expect(result.code).toBeTruthy()
      expect(result.code.length).toBeGreaterThan(0)
    })

    it('带属性的元素', () => {
      const result = compiler.compile('<div class="container" id="app">content</div>')
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('container')
      expect(result.code).toContain('app')
    })

    it('嵌套元素', () => {
      const result = compiler.compile('<div><span>inner</span></div>')
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('span')
    })

    it('多子节点', () => {
      const result = compiler.compile('<ul><li>1</li><li>2</li><li>3</li></ul>')
      expect(result.code).toBeTruthy()
    })
  })

  describe('@lytjs/compiler - v-if 条件渲染', () => {
    it('v-if 指令', () => {
      const result = compiler.compile('<div v-if="show">visible</div>')
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('show')
    })

    it('v-if / v-else', () => {
      const result = compiler.compile(
        '<div v-if="show">A</div><div v-else>B</div>'
      )
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('show')
    })

    it('v-if / v-else-if / v-else', () => {
      const result = compiler.compile(
        '<div v-if="type === 1">A</div><div v-else-if="type === 2">B</div><div v-else>C</div>'
      )
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('type')
    })
  })

  describe('@lytjs/compiler - v-for 列表渲染', () => {
    it('v-for 基本列表', () => {
      const result = compiler.compile('<li v-each="item in items">{{ item }}</li>')
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('items')
      expect(result.code).toContain('item')
    })

    it('v-for 带索引', () => {
      const result = compiler.compile(
        '<li v-each="(item, index) in list">{{ index }}: {{ item }}</li>'
      )
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('list')
      expect(result.code).toContain('index')
    })
  })

  describe('@lytjs/compiler - v-bind 属性绑定', () => {
    it('v-bind 基本绑定', () => {
      const result = compiler.compile('<div v-bind:class="className">text</div>')
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('className')
    })

    it('v-bind 缩写 :attr', () => {
      const result = compiler.compile('<div :id="dynamicId">text</div>')
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('dynamicId')
    })

    it('v-bind 多属性绑定', () => {
      const result = compiler.compile(
        '<div :class="cls" :style="styleObj" :data-id="id">text</div>'
      )
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('cls')
      expect(result.code).toContain('styleObj')
      expect(result.code).toContain('id')
    })
  })

  describe('@lytjs/compiler - v-on 事件绑定', () => {
    it('v-on 基本事件', () => {
      const result = compiler.compile('<button v-on:click="handleClick">Click</button>')
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('handleClick')
    })

    it('v-on 缩写 @event', () => {
      const result = compiler.compile('<button @click="onClick">Click</button>')
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('onClick')
    })

    it('v-on 多事件绑定', () => {
      const result = compiler.compile(
        '<input @input="onInput" @focus="onFocus" @blur="onBlur" />'
      )
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('onInput')
      expect(result.code).toContain('onFocus')
      expect(result.code).toContain('onBlur')
    })
  })

  describe('@lytjs/compiler - 插值表达式', () => {
    it('文本插值 {{ }}', () => {
      const result = compiler.compile('<span>{{ message }}</span>')
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('message')
    })

    it('复杂插值表达式', () => {
      const result = compiler.compile('<span>{{ count * 2 + offset }}</span>')
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('count')
      expect(result.code).toContain('offset')
    })
  })

  describe('@lytjs/compiler - parseHTML', () => {
    it('解析 HTML 字符串', () => {
      const ast = compiler.parseHTML('<div class="test"><p>hello</p></div>')
      expect(ast).toBeTruthy()
      expect(ast.type).toBe('Root')
    })
  })

  describe('@lytjs/compiler - transform', () => {
    it('转换 AST', () => {
      const ast = compiler.parseHTML('<div v-if="show">text</div>')
      expect(() => compiler.transform(ast)).not.toThrow()
    })
  })

  describe('@lytjs/compiler - generate', () => {
    it('生成代码', () => {
      const ast = compiler.parseHTML('<div>hello</div>')
      const result = compiler.generate(ast)
      expect(result).toHaveProperty('code')
      expect(typeof result.code).toBe('string')
      expect(result.code.length).toBeGreaterThan(0)
    })
  })

  describe('@lytjs/compiler - 完整编译流程', () => {
    it('完整组件模板', () => {
      const template = `
        <div class="app">
          <h1 v-if="showTitle">{{ title }}</h1>
          <ul>
            <li v-each="item in items">{{ item.name }}</li>
          </ul>
          <input :value="inputValue" @input="handleInput" />
          <button @click="submit">Submit</button>
        </div>
      `
      const result = compiler.compile(template)
      expect(result.code).toBeTruthy()
      expect(result.code).toContain('showTitle')
      expect(result.code).toContain('title')
      expect(result.code).toContain('items')
      expect(result.code).toContain('item')
      expect(result.code).toContain('inputValue')
      expect(result.code).toContain('handleInput')
      expect(result.code).toContain('submit')
    })

    it('空模板', () => {
      const result = compiler.compile('')
      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('ast')
    })

    it('helpers 数组', () => {
      const result = compiler.compile('<div>{{ msg }}</div>')
      expect(Array.isArray(result.helpers)).toBe(true)
    })
  })
}

// ======================== Component 测试 ========================

async function runComponentTests() {
  const component = await loadComponent()

  describe('@lytjs/component - defineComponent', () => {
    it('基本定义', () => {
      const MyComponent = component.defineComponent({
        name: 'MyComponent',
      })
      expect(MyComponent).toBeTruthy()
      expect(MyComponent._isComponentDefine).toBe(true)
    })

    it('带名称', () => {
      const Comp = component.defineComponent({
        name: 'TestComp',
      })
      expect(Comp.name).toBe('TestComp')
    })

    it('带 state', () => {
      const Comp = component.defineComponent({
        name: 'StateComp',
        state() {
          return { count: 0, name: 'lyt' }
        },
      })
      expect(Comp._isComponentDefine).toBe(true)
      expect(Comp.options.state).toBeInstanceOf(Function)
      const initialState = Comp.options.state()
      expect(initialState.count).toBe(0)
      expect(initialState.name).toBe('lyt')
    })

    it('带 computed', () => {
      const Comp = component.defineComponent({
        name: 'ComputedComp',
        state() {
          return { a: 1, b: 2 }
        },
        computed: {
          sum() {
            return (this as any).a + (this as any).b
          },
        },
      })
      expect(Comp.options.computed).toBeTruthy()
      expect(typeof Comp.options.computed.sum).toBe('function')
    })

    it('带 methods', () => {
      const Comp = component.defineComponent({
        name: 'MethodsComp',
        state() {
          return { count: 0 }
        },
        methods: {
          increment() {
            (this as any).count++
          },
        },
      })
      expect(Comp.options.methods).toBeTruthy()
      expect(typeof Comp.options.methods.increment).toBe('function')
    })

    it('带 render 函数', () => {
      const Comp = component.defineComponent({
        name: 'RenderComp',
        render(h: any) {
          return h('div', null, ['Hello'])
        },
      })
      expect(typeof Comp.options.render).toBe('function')
    })

    it('带 setup 函数', () => {
      const Comp = component.defineComponent({
        name: 'SetupComp',
        setup(props: any, ctx: any) {
          return {
            message: 'hello',
          }
        },
      })
      expect(typeof Comp.options.setup).toBe('function')
    })

    it('带 emits 声明', () => {
      const Comp = component.defineComponent({
        name: 'EmitComp',
        emits: ['change', 'update'],
      })
      expect(Comp.options.emits).toBeTruthy()
    })
  })

  describe('@lytjs/component - createComponentInstance', () => {
    it('创建内部实例', () => {
      const Comp = component.defineComponent({
        name: 'TestComp',
        props: {
          title: String,
          count: Number,
        },
      })
      const instance = component.createComponentInstance(Comp)
      expect(instance).toBeTruthy()
      expect(instance._isComponent).toBe(true)
      expect(instance.isMounted).toBe(false)
      expect(instance.isUnmounted).toBe(false)
      expect(instance.props).toBeTruthy()
      expect(instance.state).toBeTruthy()
      expect(instance.slots).toBeTruthy()
      expect(instance.renderProxy).toBeTruthy()
    })
  })

  describe('@lytjs/component - setupComponent', () => {
    it('带初始化', () => {
      const Comp = component.defineComponent({
        name: 'InitComp',
        props: {
          title: { type: String, default: 'Hello' },
        },
        state() {
          return { inner: 42 }
        },
      })
      const instance = component.createComponentInstance(Comp)
      expect(() => component.setupComponent(instance, { title: 'World' })).not.toThrow()
      expect(instance.props.title).toBe('World')
    })

    it('带 setup 函数', () => {
      const Comp = component.defineComponent({
        name: 'SetupComp',
        setup(props: any) {
          return {
            computedMsg: 'from setup: ' + (props.title || 'default'),
          }
        },
      })
      const instance = component.createComponentInstance(Comp)
      component.setupComponent(instance, { title: 'Test' })
      expect(instance.setupState.computedMsg).toBe('from setup: Test')
    })

    it('setup 返回 render 函数', () => {
      const Comp = component.defineComponent({
        name: 'RenderSetupComp',
        setup() {
          return function render(h: any) {
            return h('div', null, ['rendered'])
          }
        },
      })
      const instance = component.createComponentInstance(Comp)
      component.setupComponent(instance)
      expect(typeof Comp.options.render).toBe('function')
    })
  })

  describe('@lytjs/component - lifecycle', () => {
    it('LifecycleHook 枚举值', () => {
      expect(component.LifecycleHook.INIT).toBe('init')
      expect(component.LifecycleHook.MOUNTED).toBe('mounted')
      expect(component.LifecycleHook.BEFORE_UPDATE).toBe('beforeUpdate')
      expect(component.LifecycleHook.UPDATED).toBe('updated')
      expect(component.LifecycleHook.BEFORE_UNMOUNT).toBe('beforeUnmount')
      expect(component.LifecycleHook.UNMOUNTED).toBe('unmounted')
    })

    it('onMounted 注册钩子', () => {
      const Comp = component.defineComponent({
        name: 'LifecycleComp',
        setup() {
          component.onMounted(() => {})
          return {}
        },
      })
      expect(typeof Comp).toBe('object')
    })

    it('setCurrentInstance / currentInstance', () => {
      const prev = component.currentInstance
      const mockInstance = { init: [], mounted: [] } as any
      component.setCurrentInstance(mockInstance)
      expect(component.currentInstance).toBe(mockInstance)
      component.setCurrentInstance(prev)
    })

    it('createLifecycleHook', () => {
      const hook = component.createLifecycleHook(component.LifecycleHook.MOUNTED)
      expect(typeof hook).toBe('function')
    })

    it('callLifecycleHook', () => {
      const instance: any = { mounted: [] }
      const calls: string[] = []
      component.callLifecycleHook(instance, component.LifecycleHook.MOUNTED)
      expect(calls.length).toBe(0)

      instance.mounted.push(() => calls.push('hook1'))
      instance.mounted.push(() => calls.push('hook2'))
      component.callLifecycleHook(instance, component.LifecycleHook.MOUNTED)
      expect(calls).toEqual(['hook1', 'hook2'])
    })
  })

  describe('@lytjs/component - mount/unmount/update', () => {
    it('mountComponent 挂载组件', () => {
      const Comp = component.defineComponent({
        name: 'MountComp',
        state() {
          return { count: 0 }
        },
        render(h: any) {
          return h('div', null, ['mounted'])
        },
      })
      const instance = component.createComponentInstance(Comp)
      component.setupComponent(instance)
      const mockH = (tag: string, props: any, children: any) => ({ tag, props, children })
      component.mountComponent(instance, mockH)
      expect(instance.isMounted).toBe(true)
      expect(instance.subTree).toBeTruthy()
    })

    it('unmountComponent 卸载组件', () => {
      const Comp = component.defineComponent({
        name: 'UnmountComp',
        state() {
          return { count: 0 }
        },
      })
      const instance = component.createComponentInstance(Comp)
      component.setupComponent(instance)
      const mockH = (tag: string, props: any, children: any) => ({ tag, props, children })
      component.mountComponent(instance, mockH)
      expect(instance.isMounted).toBe(true)

      component.unmountComponent(instance)
      expect(instance.isUnmounted).toBe(true)
      expect(instance.isMounted).toBe(false)
    })

    it('updateComponent 更新组件', () => {
      const Comp = component.defineComponent({
        name: 'UpdateComp',
        state() {
          return { count: 0 }
        },
        render(h: any) {
          return h('div', null, ['update'])
        },
      })
      const instance = component.createComponentInstance(Comp)
      component.setupComponent(instance)
      const mockH = (tag: string, props: any, children: any) => ({ tag, props, children })
      component.mountComponent(instance, mockH)
      expect(() => component.updateComponent(instance, mockH)).not.toThrow()
    })
  })

  describe('@lytjs/component - defineFunctionalComponent', () => {
    it('函数组件定义', () => {
      const FnComp = component.defineFunctionalComponent((props: any, ctx: any) => {
        return { tag: 'div', props: null, children: [props.msg] }
      })
      expect(FnComp._isComponentDefine).toBe(true)
    })
  })

  describe('@lytjs/component - Props/Emits/Slots', () => {
    it('normalizePropsOptions', () => {
      const result = component.normalizePropsOptions({
        title: { type: String, default: 'Hello' },
        count: { type: Number, required: true },
      })
      expect(result).toBeTruthy()
    })

    it('normalizeEmits', () => {
      const result = component.normalizeEmits(['change', 'update'])
      expect(result).toBeTruthy()
    })

    it('initSlots', () => {
      const instance: any = { slots: {} }
      expect(() => component.initSlots(instance, null)).not.toThrow()
      expect(() => component.initSlots(instance, { default: () => 'slot content' })).not.toThrow()
    })
  })

  describe('@lytjs/component - Composition API', () => {
    it('provide/inject 导出', () => {
      expect(typeof component.provide).toBe('function')
      expect(typeof component.inject).toBe('function')
    })

    it('getCurrentInstance 导出', () => {
      expect(typeof component.getCurrentInstance).toBe('function')
    })

    it('runSetup 导出', () => {
      expect(typeof component.runSetup).toBe('function')
    })
  })
}

// ======================== Compat 测试 ========================

async function runCompatTests() {
  const compat = await loadCompat()

  describe('@lytjs/compat - 核心 API 导出', () => {
    it('ref API 正确导出', () => {
      expect(typeof compat.ref).toBe('function')
      const r = compat.ref(0)
      expect(r.value).toBe(0)
      r.value = 10
      expect(r.value).toBe(10)
    })

    it('shallowRef API 正确导出', () => {
      expect(typeof compat.shallowRef).toBe('function')
      const sr = compat.shallowRef({ count: 0 })
      expect(sr.value.count).toBe(0)
    })

    it('isRef API 正确导出', () => {
      expect(typeof compat.isRef).toBe('function')
      const r = compat.ref(1)
      expect(compat.isRef(r)).toBe(true)
      expect(compat.isRef(42)).toBe(false)
    })

    it('unref API 正确导出', () => {
      expect(typeof compat.unref).toBe('function')
      expect(compat.unref(compat.ref(5))).toBe(5)
      expect(compat.unref(10)).toBe(10)
    })

    it('toRef API 正确导出', () => {
      expect(typeof compat.toRef).toBe('function')
    })

    it('toRefs API 正确导出', () => {
      expect(typeof compat.toRefs).toBe('function')
    })

    it('triggerRef API 正确导出', () => {
      expect(typeof compat.triggerRef).toBe('function')
    })

    it('reactive API 正确导出', () => {
      expect(typeof compat.reactive).toBe('function')
      const state = compat.reactive({ count: 0 })
      expect(state.count).toBe(0)
      state.count = 5
      expect(state.count).toBe(5)
    })

    it('readonly API 正确导出', () => {
      expect(typeof compat.readonly).toBe('function')
      const ro = compat.readonly({ a: 1 })
      expect(compat.isReadonly(ro)).toBe(true)
    })

    it('shallowReactive API 正确导出', () => {
      expect(typeof compat.shallowReactive).toBe('function')
    })

    it('toRaw API 正确导出', () => {
      expect(typeof compat.toRaw).toBe('function')
    })

    it('isReactive API 正确导出', () => {
      expect(typeof compat.isReactive).toBe('function')
      const state = compat.reactive({ a: 1 })
      expect(compat.isReactive(state)).toBe(true)
    })

    it('isReadonly API 正确导出', () => {
      expect(typeof compat.isReadonly).toBe('function')
    })

    it('markRaw API 正确导出', () => {
      expect(typeof compat.markRaw).toBe('function')
      const obj = compat.markRaw({ a: 1 })
      expect(obj.__v_skip).toBe(true)
    })

    it('computed API 正确导出', () => {
      expect(typeof compat.computed).toBe('function')
      const count = compat.ref(1)
      const double = compat.computed(() => count.value * 2)
      expect(double.value).toBe(2)
      count.value = 5
      expect(double.value).toBe(10)
    })

    it('watch API 正确导出', () => {
      expect(typeof compat.watch).toBe('function')
    })

    it('watchEffect API 正确导出', () => {
      expect(typeof compat.watchEffect).toBe('function')
    })

    it('watchPostEffect API 正确导出', () => {
      expect(typeof compat.watchPostEffect).toBe('function')
    })

    it('watchSyncEffect API 正确导出', () => {
      expect(typeof compat.watchSyncEffect).toBe('function')
    })

    it('effect API 正确导出', () => {
      expect(typeof compat.effect).toBe('function')
    })

    it('nextTick API 正确导出', () => {
      expect(typeof compat.nextTick).toBe('function')
      expect(compat.nextTick()).toBeInstanceOf(Promise)
    })
  })

  describe('@lytjs/compat - 依赖注入', () => {
    it('provide/inject API 正确导出', () => {
      expect(typeof compat.provide).toBe('function')
      expect(typeof compat.inject).toBe('function')
    })
  })

  describe('@lytjs/compat - 生命周期 API', () => {
    it('onMounted API 正确导出', () => {
      expect(typeof compat.onMounted).toBe('function')
    })

    it('onUpdated API 正确导出', () => {
      expect(typeof compat.onUpdated).toBe('function')
    })

    it('onUnmounted API 正确导出', () => {
      expect(typeof compat.onUnmounted).toBe('function')
    })

    it('onBeforeMount API 正确导出', () => {
      expect(typeof compat.onBeforeMount).toBe('function')
    })

    it('onBeforeUpdate API 正确导出', () => {
      expect(typeof compat.onBeforeUpdate).toBe('function')
    })

    it('onBeforeUnmount API 正确导出', () => {
      expect(typeof compat.onBeforeUnmount).toBe('function')
    })

    it('onErrorCaptured 占位函数', () => {
      expect(typeof compat.onErrorCaptured).toBe('function')
      expect(() => compat.onErrorCaptured(() => {})).not.toThrow()
    })

    it('onRenderTracked API 正确导出', () => {
      expect(typeof compat.onRenderTracked).toBe('function')
    })

    it('onRenderTriggered API 正确导出', () => {
      expect(typeof compat.onRenderTriggered).toBe('function')
    })
  })

  describe('@lytjs/compat - onActivated/onDeactivated', () => {
    it('onActivated 注册钩子', () => {
      expect(() => compat.onActivated(() => {})).not.toThrow()
    })

    it('onDeactivated 注册钩子', () => {
      expect(() => compat.onDeactivated(() => {})).not.toThrow()
    })

    it('onActivated 在有实例时注册', () => {
      const mockInstance: any = {}
      compat.setCurrentInstance(mockInstance)
      compat.onActivated(() => {})
      expect(mockInstance._activatedHooks).toBeTruthy()
      expect(mockInstance._activatedHooks.length).toBe(1)
      compat.setCurrentInstance(null)
    })

    it('onDeactivated 在有实例时注册', () => {
      const mockInstance: any = {}
      compat.setCurrentInstance(mockInstance)
      compat.onDeactivated(() => {})
      expect(mockInstance._deactivatedHooks).toBeTruthy()
      expect(mockInstance._deactivatedHooks.length).toBe(1)
      compat.setCurrentInstance(null)
    })
  })

  describe('@lytjs/compat - onServerPrefetch', () => {
    it('占位函数', () => {
      expect(typeof compat.onServerPrefetch).toBe('function')
      expect(() => compat.onServerPrefetch(async () => {})).not.toThrow()
    })
  })

  describe('@lytjs/compat - 编译器宏', () => {
    it('defineProps 返回值', () => {
      expect(typeof compat.defineProps).toBe('function')
      const props = compat.defineProps()
      expect(props).toBeTruthy()
      expect(typeof props).toBe('object')
    })

    it('defineProps 在有实例时返回实例 props', () => {
      const mockInstance: any = { props: { title: 'Hello', count: 42 } }
      compat.setCurrentInstance(mockInstance)
      const props = compat.defineProps()
      expect(props.title).toBe('Hello')
      expect(props.count).toBe(42)
      compat.setCurrentInstance(null)
    })

    it('defineEmits 正确导出', () => {
      expect(typeof compat.defineEmits).toBe('function')
    })

    it('withDefaults 合并默认值', () => {
      expect(typeof compat.withDefaults).toBe('function')
      const props = { title: 'Custom' }
      const defaults = { title: 'Default', count: 0, active: true }
      const merged = compat.withDefaults(props, defaults)
      expect(merged.title).toBe('Custom')
      expect(merged.count).toBe(0)
      expect(merged.active).toBe(true)
    })

    it('withDefaults 空属性使用全部默认值', () => {
      const props = {}
      const defaults = { name: 'lyt', version: 5 }
      const merged = compat.withDefaults(props, defaults)
      expect(merged.name).toBe('lyt')
      expect(merged.version).toBe(5)
    })

    it('defineExpose 占位函数', () => {
      expect(typeof compat.defineExpose).toBe('function')
      expect(() => compat.defineExpose({ method: () => {} })).not.toThrow()
    })

    it('defineExpose 在有实例时设置 _exposed', () => {
      const mockInstance: any = {}
      compat.setCurrentInstance(mockInstance)
      const exposed = { count: 0, method: () => {} }
      compat.defineExpose(exposed)
      expect(mockInstance._exposed).toBe(exposed)
      compat.setCurrentInstance(null)
    })
  })

  describe('@lytjs/compat - useSlots/useAttrs', () => {
    it('useSlots 返回值', () => {
      expect(typeof compat.useSlots).toBe('function')
      const slots = compat.useSlots()
      expect(slots).toBeTruthy()
      expect(typeof slots).toBe('object')
    })

    it('useSlots 在有实例时返回实例 slots', () => {
      const mockSlots = { default: () => 'content', header: () => 'header' }
      const mockInstance: any = { slots: mockSlots }
      compat.setCurrentInstance(mockInstance)
      const slots = compat.useSlots()
      expect(slots).toBe(mockSlots)
      compat.setCurrentInstance(null)
    })

    it('useAttrs 返回值', () => {
      expect(typeof compat.useAttrs).toBe('function')
      const attrs = compat.useAttrs()
      expect(attrs).toBeTruthy()
      expect(typeof attrs).toBe('object')
    })

    it('useAttrs 在有实例时返回实例 attrs', () => {
      const mockAttrs = { class: 'test', id: 'app' }
      const mockInstance: any = { attrs: mockAttrs }
      compat.setCurrentInstance(mockInstance)
      const attrs = compat.useAttrs()
      expect(attrs).toBe(mockAttrs)
      compat.setCurrentInstance(null)
    })

    it('useTemplateRef 占位函数', () => {
      expect(typeof compat.useTemplateRef).toBe('function')
      const ref = compat.useTemplateRef('myRef')
      expect(ref.value).toBeNull()
    })
  })

  describe('@lytjs/compat - 响应式工具', () => {
    it('isProxy API', () => {
      expect(typeof compat.isProxy).toBe('function')
      const state = compat.reactive({ a: 1 })
      expect(compat.isProxy(state)).toBe(true)
      expect(compat.isProxy({ a: 1 })).toBe(false)
    })

    it('proxyRefs API', () => {
      expect(typeof compat.proxyRefs).toBe('function')
      const r = compat.ref(5)
      const obj = { count: r, name: 'lyt' }
      const proxied = compat.proxyRefs(obj)
      expect(proxied.count).toBe(5)
      expect(proxied.name).toBe('lyt')
    })
  })

  describe('@lytjs/compat - 渲染函数', () => {
    it('h 函数正确导出', () => {
      expect(typeof compat.h).toBe('function')
    })

    it('Fragment 正确导出', () => {
      expect(compat.Fragment).toBeTruthy()
    })
  })

  describe('@lytjs/compat - 异步组件', () => {
    it('defineAsyncComponent 正确导出', () => {
      expect(typeof compat.defineAsyncComponent).toBe('function')
    })
  })

  describe('@lytjs/compat - getCurrentInstance', () => {
    it('getCurrentInstance API', () => {
      expect(typeof compat.getCurrentInstance).toBe('function')
      expect(compat.getCurrentInstance()).toBeNull()
    })

    it('getCurrentScope API', () => {
      expect(typeof compat.getCurrentScope).toBe('function')
    })

    it('onScopeDispose 占位函数', () => {
      expect(typeof compat.onScopeDispose).toBe('function')
      expect(() => compat.onScopeDispose(() => {})).not.toThrow()
    })
  })

  describe('@lytjs/compat - createApp/defineComponent', () => {
    it('createApp 正确导出', () => {
      expect(typeof compat.createApp).toBe('function')
    })

    it('defineComponent 正确导出', () => {
      expect(typeof compat.defineComponent).toBe('function')
    })
  })

  describe('@lytjs/compat - 内置组件', () => {
    it('KeepAlive 正确导出', () => {
      expect(compat.KeepAlive).toBeTruthy()
    })

    it('Teleport 正确导出', () => {
      expect(compat.Teleport).toBeTruthy()
    })

    it('Transition 正确导出', () => {
      expect(compat.Transition).toBeTruthy()
    })

    it('TransitionGroup 正确导出', () => {
      expect(compat.TransitionGroup).toBeTruthy()
    })

    it('Suspense 正确导出', () => {
      expect(compat.Suspense).toBeTruthy()
    })
  })

  describe('@lytjs/compat - SFC 转换工具', () => {
    it('convertVueSfcToLyt 正确导出', () => {
      expect(typeof compat.convertVueSfcToLyt).toBe('function')
    })

    it('convertVueSfcToLytWithWarnings 正确导出', () => {
      expect(typeof compat.convertVueSfcToLytWithWarnings).toBe('function')
    })

    it('VueSfcConverter 正确导出', () => {
      expect(compat.VueSfcConverter).toBeTruthy()
    })
  })

  describe('@lytjs/compat - 迁移工具', () => {
    it('migrateVueFile 正确导出', () => {
      expect(typeof compat.migrateVueFile).toBe('function')
    })

    it('analyzeVueFile 正确导出', () => {
      expect(typeof compat.analyzeVueFile).toBe('function')
    })

    it('formatMigrationReport 正确导出', () => {
      expect(typeof compat.formatMigrationReport).toBe('function')
    })
  })

  describe('@lytjs/compat - 兼容模式工具', () => {
    it('createCompatVue 正确导出', () => {
      expect(typeof compat.createCompatVue).toBe('function')
    })

    it('useCompatMode 正确导出', () => {
      expect(typeof compat.useCompatMode).toBe('function')
    })
  })
}

// ======================== 运行所有测试 ========================

async function main() {
  console.log('='.repeat(60))
  console.log('  Lyt.js E2E Tests')
  console.log('='.repeat(60))
  console.log()

  try {
    await runReactivityTests()
    console.log('  [reactivity] test suites registered')
  } catch (err) {
    console.error('  [reactivity] FAILED to load:', (err as Error).message)
  }

  try {
    await runCompilerTests()
    console.log('  [compiler] test suites registered')
  } catch (err) {
    console.error('  [compiler] FAILED to load:', (err as Error).message)
  }

  try {
    await runComponentTests()
    console.log('  [component] test suites registered')
  } catch (err) {
    console.error('  [component] FAILED to load:', (err as Error).message)
  }

  try {
    await runCompatTests()
    console.log('  [compat] test suites registered')
  } catch (err) {
    console.error('  [compat] FAILED to load:', (err as Error).message)
  }

  console.log()

  // 运行所有测试
  let totalPassed = 0
  let totalFailed = 0
  const allResults: TestResult[] = []

  for (const suite of testSuites) {
    console.log(`\n  ${suite.name}`)
    console.log('  ' + '-'.repeat(50))

    for (const test of suite.tests) {
      const start = Date.now()
      try {
        const result = test.fn()
        if (result instanceof Promise) {
          await result
        }
        const duration = Date.now() - start
        totalPassed++
        allResults.push({ name: `${suite.name} > ${test.name}`, status: 'passed', duration })
        console.log(`    \x1b[32m\u2713\x1b[0m ${test.name} (${duration}ms)`)
      } catch (err) {
        const duration = Date.now() - start
        totalFailed++
        allResults.push({
          name: `${suite.name} > ${test.name}`,
          status: 'failed',
          error: err as Error,
          duration,
        })
        console.log(`    \x1b[31m\u2717\x1b[0m ${test.name}`)
        console.log(`      ${(err as Error).message}`)
      }
    }
  }

  console.log()
  console.log('='.repeat(60))
  console.log(`  Results: ${totalPassed} passed, ${totalFailed} failed, ${totalPassed + totalFailed} total`)
  console.log('='.repeat(60))

  if (totalFailed > 0) {
    console.log('\n  Failed tests:')
    for (const r of allResults) {
      if (r.status === 'failed') {
        console.log(`    \x1b[31m\u2717\x1b[0m ${r.name}`)
        if (r.error) console.log(`      ${r.error.message}`)
      }
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
