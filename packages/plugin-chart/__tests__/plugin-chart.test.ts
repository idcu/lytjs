/**
 * @lytjs/plugin-chart — 完整单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试图表创建和渲染。
 *
 * 测试覆盖：
 *   1. createChart 创建图表实例
 *   2. 图表实例包含必要方法
 *   3. createChart 接受 HTMLCanvasElement
 *   4. createChart 接受 HTMLElement 容器
 *   5. update 更新图表数据
 *   6. resize 调整图表尺寸
 *   7. destroy 销毁图表
 *   8. getContext 获取 Canvas 上下文
 *   9. 柱状图配置
 *  10. 折线图配置
 *  11. 默认选项合并
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '../../test-utils/src/index'

// ================================================================
//  Mock：全局 DOM 环境（必须在 import 源码之前设置）
// ================================================================

function createMockCtx() {
  const ctx: any = {
    clearRect() {},
    fillRect() {},
    fillText() {},
    strokeText() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    arcTo() {},
    fill() {},
    stroke() {},
    rect() {},
    measureText() { return { width: 50 } },
    setTransform() {},
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 1,
    lineCap: '',
    lineJoin: '',
  }
  return ctx
}

function setupDOMMocks() {
  // Mock HTMLCanvasElement
  class MockHTMLCanvasElement {
    width = 600
    height = 400
    style: Record<string, string> = {}
    getContext() { return createMockCtx() }
    setAttribute() {}
  }

  ;(globalThis as any).HTMLCanvasElement = MockHTMLCanvasElement
  ;(globalThis as any).HTMLElement = class MockHTMLElement {
    style: Record<string, string> = {}
    children: any[] = []
    childNodes: any[] = []
    innerHTML = ''
    appendChild(child: any) { this.children.push(child); return child }
    removeChild(child: any) {
      const idx = this.children.indexOf(child)
      if (idx >= 0) this.children.splice(idx, 1)
      return child
    }
    setAttribute() {}
    classList = {
      add() {},
      remove() {},
      has() { return false },
    }
  }
  ;(globalThis as any).document = {
    createElement(tag: string) {
      if (tag === 'canvas') return new MockHTMLCanvasElement()
      return new ((globalThis as any).HTMLElement)()
    },
    head: {
      appendChild() {},
    },
    documentElement: {
      appendChild() {},
    },
  }
  ;(globalThis as any).window = globalThis
  ;(globalThis as any).requestAnimationFrame = (fn: any) => setTimeout(fn, 0)
  ;(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id)
  ;(globalThis as any).performance = { now: () => Date.now() }
}

function cleanupDOMMocks() {
  delete (globalThis as any).HTMLCanvasElement
  delete (globalThis as any).HTMLElement
  delete (globalThis as any).document
  delete (globalThis as any).window
  delete (globalThis as any).requestAnimationFrame
  delete (globalThis as any).cancelAnimationFrame
  delete (globalThis as any).performance
}

// 设置全局 mock
setupDOMMocks()

// 现在导入源码
import { createChart } from '../src/index'

// ================================================================
//  辅助函数
// ================================================================

function createMockCanvas() {
  return new ((globalThis as any).HTMLCanvasElement)()
}

function createMockContainer() {
  return new ((globalThis as any).HTMLElement)()
}

// ================================================================
//  1. createChart 创建图表实例
// ================================================================

describe('createChart 创建图表实例', () => {

  it('返回包含必要方法的图表实例', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['A', 'B'],
        datasets: [{ label: 'Test', data: [10, 20] }],
      },
    })
    expect(chart).toBeDefined()
    expect(typeof chart.update).toBe('function')
    expect(typeof chart.resize).toBe('function')
    expect(typeof chart.destroy).toBe('function')
    expect(typeof chart.getContext).toBe('function')
    chart.destroy()
  })
})

// ================================================================
//  2. 图表实例包含必要方法
// ================================================================

describe('图表实例方法', () => {

  it('getContext 返回 Canvas 上下文', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['A'],
        datasets: [{ label: 'Test', data: [10] }],
      },
    })
    const ctx = chart.getContext()
    expect(ctx).toBeDefined()
    chart.destroy()
  })
})

// ================================================================
//  3. createChart 接受 HTMLCanvasElement
// ================================================================

describe('createChart 接受 HTMLCanvasElement', () => {

  it('直接使用传入的 canvas', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['A', 'B'],
        datasets: [{ label: 'Test', data: [10, 20] }],
      },
    })
    expect(chart).toBeDefined()
    chart.destroy()
  })
})

// ================================================================
//  4. createChart 接受 HTMLElement 容器
// ================================================================

describe('createChart 接受 HTMLElement 容器', () => {

  it('在容器中创建 canvas 元素', () => {
    const container = createMockContainer()
    const chart = createChart(container, {
      type: 'bar',
      data: {
        labels: ['A'],
        datasets: [{ label: 'Test', data: [10] }],
      },
    })
    expect(container.children.length).toBeGreaterThan(0)
    chart.destroy()
  })
})

// ================================================================
//  5. update 更新图表数据
// ================================================================

describe('update 更新图表数据', () => {

  it('调用 update 不报错', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['A', 'B'],
        datasets: [{ label: 'Test', data: [10, 20] }],
      },
    })
    chart.update({
      labels: ['C', 'D', 'E'],
      datasets: [{ label: 'Updated', data: [30, 40, 50] }],
    })
    chart.destroy()
  })
})

// ================================================================
//  6. resize 调整图表尺寸
// ================================================================

describe('resize 调整图表尺寸', () => {

  it('调用 resize 不报错', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['A'],
        datasets: [{ label: 'Test', data: [10] }],
      },
    })
    chart.resize(800, 600)
    chart.destroy()
  })
})

// ================================================================
//  7. destroy 销毁图表
// ================================================================

describe('destroy 销毁图表', () => {

  it('调用 destroy 不报错', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['A'],
        datasets: [{ label: 'Test', data: [10] }],
      },
    })
    chart.destroy()
  })

  it('多次 destroy 不报错', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['A'],
        datasets: [{ label: 'Test', data: [10] }],
      },
    })
    chart.destroy()
    chart.destroy()
  })
})

// ================================================================
//  8. 柱状图配置
// ================================================================

describe('柱状图配置', () => {

  it('使用默认选项创建柱状图', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['一月', '二月', '三月'],
        datasets: [
          { label: '销售额', data: [120, 200, 150] },
        ],
      },
    })
    expect(chart).toBeDefined()
    chart.destroy()
  })

  it('多数据集柱状图', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['Q1', 'Q2', 'Q3'],
        datasets: [
          { label: '2024', data: [100, 200, 300] },
          { label: '2025', data: [150, 250, 350] },
        ],
      },
    })
    expect(chart).toBeDefined()
    chart.destroy()
  })
})

// ================================================================
//  9. 折线图配置
// ================================================================

describe('折线图配置', () => {

  it('使用默认选项创建折线图', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'line',
      data: {
        labels: ['一月', '二月', '三月'],
        datasets: [
          { label: '趋势', data: [10, 50, 30] },
        ],
      },
    })
    expect(chart).toBeDefined()
    chart.destroy()
  })

  it('多数据集折线图', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [
          { label: 'Series A', data: [1, 3, 2, 5, 4] },
          { label: 'Series B', data: [2, 4, 1, 3, 6] },
        ],
      },
    })
    expect(chart).toBeDefined()
    chart.destroy()
  })
})

// ================================================================
//  10. 自定义选项
// ================================================================

describe('自定义选项', () => {

  it('自定义宽高和标题', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['A'],
        datasets: [{ label: 'Test', data: [10] }],
      },
      options: {
        title: '自定义标题',
        width: 800,
        height: 500,
        showGrid: false,
        showLegend: false,
      },
    })
    expect(chart).toBeDefined()
    chart.destroy()
  })

  it('自定义颜色', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['A', 'B'],
        datasets: [
          { label: 'Red', data: [10, 20], color: '#ff0000' },
          { label: 'Blue', data: [30, 40], color: '#0000ff' },
        ],
      },
    })
    expect(chart).toBeDefined()
    chart.destroy()
  })

  it('显示数值标签', () => {
    const canvas = createMockCanvas()
    const chart = createChart(canvas, {
      type: 'bar',
      data: {
        labels: ['A'],
        datasets: [{ label: 'Test', data: [42] }],
      },
      options: {
        showValues: true,
      },
    })
    expect(chart).toBeDefined()
    chart.destroy()
  })
})
