/**
 * Lyt.js DevTools - 性能指标收集器
 *
 * 收集和存储各类性能指标，包括：
 * - FCP (First Contentful Paint)
 * - INP (Interaction to Next Paint)
 * - 组件渲染时间
 * - 更新频率
 * - 内存使用（代理对象计数）
 *
 * 使用环形缓冲区存储指标，防止内存泄漏。
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** FCP 指标 */
export interface FCPMetric {
  /** 指标名称 */
  type: 'fcp'
  /** FCP 时间戳 (ms, 相对于 performance.timeOrigin) */
  value: number
  /** 记录时间 */
  timestamp: number
}

/** INP 指标 */
export interface INPMetric {
  /** 指标名称 */
  type: 'inp'
  /** 事件处理耗时 (ms) */
  value: number
  /** 事件名称 */
  eventName: string
  /** 来源组件名称 */
  componentName?: string
  /** 记录时间 */
  timestamp: number
}

/** 组件渲染指标 */
export interface RenderMetric {
  /** 指标名称 */
  type: 'render'
  /** 渲染耗时 (ms) */
  value: number
  /** 组件名称 */
  componentName: string
  /** 组件 ID */
  componentId?: string
  /** 渲染阶段: mount | update | unmount */
  phase: 'mount' | 'update' | 'unmount'
  /** 记录时间 */
  timestamp: number
}

/** 更新频率指标 */
export interface UpdateFrequencyMetric {
  /** 指标名称 */
  type: 'update-frequency'
  /** 组件名称 */
  componentName: string
  /** 时间窗口内更新次数 */
  count: number
  /** 时间窗口大小 (ms) */
  windowMs: number
  /** 记录时间 */
  timestamp: number
}

/** 内存使用指标 */
export interface MemoryMetric {
  /** 指标名称 */
  type: 'memory'
  /** 代理对象数量 */
  proxyCount: number
  /** 响应式状态对象数量 */
  reactiveCount: number
  /** 记录时间 */
  timestamp: number
}

/** 自定义计时标记 */
export interface CustomMarkMetric {
  /** 指标名称 */
  type: 'custom'
  /** 标记名称 */
  name: string
  /** 耗时 (ms) */
  value: number
  /** 记录时间 */
  timestamp: number
}

/** FPS 指标 */
export interface FPSMetric {
  /** 指标名称 */
  type: 'fps'
  /** 当前 FPS */
  value: number
  /** 记录时间 */
  timestamp: number
}

/** 所有指标联合类型 */
export type Metric =
  | FCPMetric
  | INPMetric
  | RenderMetric
  | UpdateFrequencyMetric
  | MemoryMetric
  | CustomMarkMetric
  | FPSMetric

/** 性能报告 */
export interface PerformanceReport {
  /** 报告生成时间 */
  generatedAt: number
  /** FCP 指标（最新值） */
  fcp: FCPMetric | null
  /** INP 指标统计 */
  inp: {
    /** 平均值 */
    avg: number
    /** 最大值 */
    max: number
    /** 最小值 */
    min: number
    /** 样本数 */
    count: number
  }
  /** 组件渲染统计（按组件名分组） */
  renderStats: {
    /** 组件名称 */
    componentName: string
    /** 渲染次数 */
    renderCount: number
    /** 平均渲染时间 (ms) */
    avgRenderTime: number
    /** 最大渲染时间 (ms) */
    maxRenderTime: number
    /** 总渲染时间 (ms) */
    totalRenderTime: number
  }[]
  /** 更新频率统计 */
  updateFrequencyStats: {
    /** 组件名称 */
    componentName: string
    /** 平均更新频率 (次/秒) */
    avgFrequency: number
  }[]
  /** 内存使用（最新值） */
  memory: MemoryMetric | null
  /** FPS 统计 */
  fps: {
    /** 平均 FPS */
    avg: number
    /** 最低 FPS */
    min: number
    /** 样本数 */
    count: number
  }
  /** 自定义标记统计 */
  customMarks: {
    /** 标记名称 */
    name: string
    /** 平均耗时 (ms) */
    avg: number
    /** 最大耗时 (ms) */
    max: number
    /** 样本数 */
    count: number
  }[]
}

// ============================================================
// 环形缓冲区
// ============================================================

/**
 * 环形缓冲区
 *
 * 固定容量的 FIFO 队列，当容量满时自动覆盖最旧的条目。
 */
class RingBuffer<T> {
  private buffer: (T | undefined)[]
  private head: number = 0
  private count: number = 0
  private readonly capacity: number

  constructor(capacity: number) {
    this.capacity = capacity
    this.buffer = new Array(capacity).fill(undefined)
  }

  /** 添加一个条目 */
  push(item: T): void {
    const index = (this.head + this.count) % this.capacity
    this.buffer[index] = item
    if (this.count < this.capacity) {
      this.count++
    } else {
      this.head = (this.head + 1) % this.capacity
    }
  }

  /** 获取所有条目（按时间顺序） */
  getAll(): T[] {
    const result: T[] = []
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[(this.head + i) % this.capacity]
      if (item !== undefined) {
        result.push(item)
      }
    }
    return result
  }

  /** 当前条目数 */
  get size(): number {
    return this.count
  }

  /** 是否为空 */
  get isEmpty(): boolean {
    return this.count === 0
  }

  /** 清空缓冲区 */
  clear(): void {
    this.buffer.fill(undefined)
    this.head = 0
    this.count = 0
  }
}

// ============================================================
// 性能指标收集器
// ============================================================

/** 默认环形缓冲区容量 */
const DEFAULT_BUFFER_SIZE = 100

/** 慢渲染阈值 (ms) */
const SLOW_RENDER_THRESHOLD = 16

/**
 * 性能指标收集器
 *
 * 收集、存储和报告各类性能指标。
 * 使用环形缓冲区限制内存使用。
 */
export class PerformanceCollector {
  /** FCP 指标缓冲区 */
  private fcpBuffer: RingBuffer<FCPMetric>
  /** INP 指标缓冲区 */
  private inpBuffer: RingBuffer<INPMetric>
  /** 组件渲染指标缓冲区 */
  private renderBuffer: RingBuffer<RenderMetric>
  /** 更新频率指标缓冲区 */
  private updateFrequencyBuffer: RingBuffer<UpdateFrequencyMetric>
  /** 内存使用指标缓冲区 */
  private memoryBuffer: RingBuffer<MemoryMetric>
  /** 自定义标记缓冲区 */
  private customMarkBuffer: RingBuffer<CustomMarkMetric>
  /** FPS 指标缓冲区 */
  private fpsBuffer: RingBuffer<FPSMetric>

  /** 自定义标记起始时间映射 */
  private pendingMarks: Map<string, number> = new Map()

  /** 组件更新计数（用于计算更新频率） */
  private componentUpdateCounts: Map<string, { count: number; startTime: number }> = new Map()

  /** FPS 监控状态 */
  private fpsState: {
    isMonitoring: boolean
    frameCount: number
    lastTime: number
    rafId: number | null
  }

  /** 是否正在录制 */
  private _isRecording: boolean = false

  /** 缓冲区容量 */
  private readonly bufferSize: number

  constructor(bufferSize: number = DEFAULT_BUFFER_SIZE) {
    this.bufferSize = bufferSize
    this.fcpBuffer = new RingBuffer(bufferSize)
    this.inpBuffer = new RingBuffer(bufferSize)
    this.renderBuffer = new RingBuffer(bufferSize)
    this.updateFrequencyBuffer = new RingBuffer(bufferSize)
    this.memoryBuffer = new RingBuffer(bufferSize)
    this.customMarkBuffer = new RingBuffer(bufferSize)
    this.fpsBuffer = new RingBuffer(bufferSize)

    this.fpsState = {
      isMonitoring: false,
      frameCount: 0,
      lastTime: 0,
      rafId: null,
    }
  }

  // ============================================================
  // FCP (First Contentful Paint)
  // ============================================================

  /**
   * 记录 FCP 指标
   *
   * @param value - FCP 时间 (ms)，如果未提供则尝试从 Performance API 获取
   */
  recordFCP(value?: number): void {
    if (value === undefined) {
      // 尝试从 Performance API 获取
      if (typeof performance !== 'undefined' && performance.getEntriesByType) {
        const entries = performance.getEntriesByType('paint') as PerformanceEntry[]
        const fcpEntry = entries.find(e => e.name === 'first-contentful-paint')
        value = fcpEntry ? fcpEntry.startTime : 0
      } else {
        value = 0
      }
    }

    this.fcpBuffer.push({
      type: 'fcp',
      value,
      timestamp: Date.now(),
    })
  }

  // ============================================================
  // INP (Interaction to Next Paint)
  // ============================================================

  /**
   * 记录 INP 指标
   *
   * @param duration - 事件处理耗时 (ms)
   * @param eventName - 事件名称
   * @param componentName - 来源组件名称（可选）
   */
  recordINP(duration: number, eventName: string, componentName?: string): void {
    this.inpBuffer.push({
      type: 'inp',
      value: duration,
      eventName,
      componentName,
      timestamp: Date.now(),
    })
  }

  // ============================================================
  // 组件渲染时间
  // ============================================================

  /**
   * 记录组件渲染
   *
   * @param componentName - 组件名称
   * @param duration - 渲染耗时 (ms)
   * @param phase - 渲染阶段
   * @param componentId - 组件 ID（可选）
   */
  recordRender(
    componentName: string,
    duration: number,
    phase: 'mount' | 'update' | 'unmount' = 'update',
    componentId?: string,
  ): void {
    this.renderBuffer.push({
      type: 'render',
      value: duration,
      componentName,
      componentId,
      phase,
      timestamp: Date.now(),
    })

    // 更新组件更新计数
    this.trackComponentUpdate(componentName)
  }

  // ============================================================
  // 更新频率
  // ============================================================

  /**
   * 追踪组件更新
   *
   * @param componentName - 组件名称
   */
  private trackComponentUpdate(componentName: string): void {
    const now = Date.now()
    const entry = this.componentUpdateCounts.get(componentName)

    if (!entry) {
      this.componentUpdateCounts.set(componentName, { count: 1, startTime: now })
      return
    }

    entry.count++

    // 每秒记录一次更新频率
    const elapsed = now - entry.startTime
    if (elapsed >= 1000) {
      this.updateFrequencyBuffer.push({
        type: 'update-frequency',
        componentName,
        count: entry.count,
        windowMs: elapsed,
        timestamp: now,
      })
      // 重置计数器
      entry.count = 0
      entry.startTime = now
    }
  }

  // ============================================================
  // 内存使用
  // ============================================================

  /**
   * 记录内存使用
   *
   * @param proxyCount - 代理对象数量
   * @param reactiveCount - 响应式状态对象数量
   */
  recordMemory(proxyCount: number, reactiveCount: number): void {
    this.memoryBuffer.push({
      type: 'memory',
      proxyCount,
      reactiveCount,
      timestamp: Date.now(),
    })
  }

  // ============================================================
  // 自定义计时标记
  // ============================================================

  /**
   * 开始一个自定义计时标记
   *
   * @param name - 标记名称
   */
  startMark(name: string): void {
    this.pendingMarks.set(name, performance.now())
  }

  /**
   * 结束一个自定义计时标记并记录结果
   *
   * @param name - 标记名称
   * @returns 耗时 (ms)，如果标记不存在则返回 -1
   */
  endMark(name: string): number {
    const startTime = this.pendingMarks.get(name)
    if (startTime === undefined) {
      return -1
    }

    const duration = performance.now() - startTime
    this.pendingMarks.delete(name)

    this.customMarkBuffer.push({
      type: 'custom',
      name,
      value: duration,
      timestamp: Date.now(),
    })

    return duration
  }

  // ============================================================
  // FPS 监控
  // ============================================================

  /**
   * 开始 FPS 监控
   */
  startFPSMonitor(): void {
    if (this.fpsState.isMonitoring) return
    if (typeof requestAnimationFrame !== 'function') return

    this.fpsState.isMonitoring = true
    this.fpsState.frameCount = 0
    this.fpsState.lastTime = performance.now()

    const tick = (now: number) => {
      if (!this.fpsState.isMonitoring) return

      this.fpsState.frameCount++
      const elapsed = now - this.fpsState.lastTime

      // 每秒记录一次 FPS
      if (elapsed >= 1000) {
        const fps = (this.fpsState.frameCount / elapsed) * 1000
        this.fpsBuffer.push({
          type: 'fps',
          value: Math.round(fps),
          timestamp: Date.now(),
        })
        this.fpsState.frameCount = 0
        this.fpsState.lastTime = now
      }

      this.fpsState.rafId = requestAnimationFrame(tick)
    }

    this.fpsState.rafId = requestAnimationFrame(tick)
  }

  /**
   * 停止 FPS 监控
   */
  stopFPSMonitor(): void {
    this.fpsState.isMonitoring = false
    if (this.fpsState.rafId !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.fpsState.rafId)
      }
      this.fpsState.rafId = null
    }
  }

  /**
   * 是否正在监控 FPS
   */
  isFPSMonitoring(): boolean {
    return this.fpsState.isMonitoring
  }

  // ============================================================
  // 录制控制
  // ============================================================

  /**
   * 开始录制
   */
  startRecording(): void {
    this._isRecording = true
    this.startFPSMonitor()
  }

  /**
   * 停止录制
   */
  stopRecording(): void {
    this._isRecording = false
    this.stopFPSMonitor()
  }

  /**
   * 是否正在录制
   */
  isRecording(): boolean {
    return this._isRecording
  }

  // ============================================================
  // 获取指标
  // ============================================================

  /**
   * 获取所有收集的指标
   *
   * @returns 所有指标数组
   */
  getMetrics(): Metric[] {
    return [
      ...this.fcpBuffer.getAll(),
      ...this.inpBuffer.getAll(),
      ...this.renderBuffer.getAll(),
      ...this.updateFrequencyBuffer.getAll(),
      ...this.memoryBuffer.getAll(),
      ...this.customMarkBuffer.getAll(),
      ...this.fpsBuffer.getAll(),
    ]
  }

  /**
   * 获取指定类型的指标
   *
   * @param type - 指标类型
   * @returns 指标数组
   */
  getMetricsByType<T extends Metric['type']>(
    type: T,
  ): Extract<Metric, { type: T }>[] {
    const all = this.getMetrics()
    return all.filter((m): m is Extract<Metric, { type: T }> => m.type === type)
  }

  /**
   * 获取最新 FPS 值
   *
   * @returns 最新 FPS 值，如果没有则返回 0
   */
  getCurrentFPS(): number {
    const fpsMetrics = this.fpsBuffer.getAll()
    if (fpsMetrics.length === 0) return 0
    return fpsMetrics[fpsMetrics.length - 1].value
  }

  /**
   * 获取组件渲染排名（按平均渲染时间降序）
   *
   * @returns 排序后的组件渲染统计
   */
  getRenderRankings(): {
    componentName: string
    renderCount: number
    avgRenderTime: number
    maxRenderTime: number
    totalRenderTime: number
  }[] {
    const stats = new Map<string, {
      renderCount: number
      totalTime: number
      maxTime: number
    }>()

    for (const metric of this.renderBuffer.getAll()) {
      const entry = stats.get(metric.componentName) || {
        renderCount: 0,
        totalTime: 0,
        maxTime: 0,
      }
      entry.renderCount++
      entry.totalTime += metric.value
      entry.maxTime = Math.max(entry.maxTime, metric.value)
      stats.set(metric.componentName, entry)
    }

    return Array.from(stats.entries())
      .map(([componentName, stat]) => ({
        componentName,
        renderCount: stat.renderCount,
        avgRenderTime: stat.renderCount > 0 ? stat.totalTime / stat.renderCount : 0,
        maxRenderTime: stat.maxTime,
        totalRenderTime: stat.totalTime,
      }))
      .sort((a, b) => b.avgRenderTime - a.avgRenderTime)
  }

  /**
   * 获取总代理对象计数（最新值）
   *
   * @returns 代理对象计数，如果没有数据则返回 0
   */
  getProxyCount(): number {
    const metrics = this.memoryBuffer.getAll()
    if (metrics.length === 0) return 0
    return metrics[metrics.length - 1].proxyCount
  }

  /**
   * 获取慢渲染列表（渲染时间 > 16ms）
   *
   * @returns 慢渲染指标数组
   */
  getSlowRenders(): RenderMetric[] {
    return this.renderBuffer.getAll().filter(m => m.value > SLOW_RENDER_THRESHOLD)
  }

  // ============================================================
  // 生成报告
  // ============================================================

  /**
   * 生成性能摘要报告
   *
   * @returns 性能报告
   */
  getReport(): PerformanceReport {
    // FCP
    const fcpMetrics = this.fcpBuffer.getAll()
    const fcp = fcpMetrics.length > 0 ? fcpMetrics[fcpMetrics.length - 1] : null

    // INP
    const inpMetrics = this.inpBuffer.getAll()
    const inpValues = inpMetrics.map(m => m.value)
    const inp = {
      avg: inpValues.length > 0 ? inpValues.reduce((a, b) => a + b, 0) / inpValues.length : 0,
      max: inpValues.length > 0 ? Math.max(...inpValues) : 0,
      min: inpValues.length > 0 ? Math.min(...inpValues) : 0,
      count: inpValues.length,
    }

    // 渲染统计
    const renderStats = this.getRenderRankings()

    // 更新频率统计
    const ufMetrics = this.updateFrequencyBuffer.getAll()
    const ufMap = new Map<string, number[]>()
    for (const m of ufMetrics) {
      const freq = (m.count / m.windowMs) * 1000 // 次/秒
      const arr = ufMap.get(m.componentName) || []
      arr.push(freq)
      ufMap.set(m.componentName, arr)
    }
    const updateFrequencyStats = Array.from(ufMap.entries()).map(([componentName, freqs]) => ({
      componentName,
      avgFrequency: freqs.reduce((a, b) => a + b, 0) / freqs.length,
    }))

    // 内存
    const memMetrics = this.memoryBuffer.getAll()
    const memory = memMetrics.length > 0 ? memMetrics[memMetrics.length - 1] : null

    // FPS
    const fpsMetrics = this.fpsBuffer.getAll()
    const fpsValues = fpsMetrics.map(m => m.value)
    const fps = {
      avg: fpsValues.length > 0 ? fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length : 0,
      min: fpsValues.length > 0 ? Math.min(...fpsValues) : 0,
      count: fpsValues.length,
    }

    // 自定义标记
    const cmMetrics = this.customMarkBuffer.getAll()
    const cmMap = new Map<string, number[]>()
    for (const m of cmMetrics) {
      const arr = cmMap.get(m.name) || []
      arr.push(m.value)
      cmMap.set(m.name, arr)
    }
    const customMarks = Array.from(cmMap.entries()).map(([name, values]) => ({
      name,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      max: Math.max(...values),
      count: values.length,
    }))

    return {
      generatedAt: Date.now(),
      fcp,
      inp,
      renderStats,
      updateFrequencyStats,
      memory,
      fps,
      customMarks,
    }
  }

  // ============================================================
  // 导出
  // ============================================================

  /**
   * 导出所有收集的指标为 JSON 字符串
   *
   * @returns JSON 字符串
   */
  exportJSON(): string {
    return JSON.stringify({
      metrics: this.getMetrics(),
      report: this.getReport(),
    }, null, 2)
  }

  // ============================================================
  // 清理
  // ============================================================

  /**
   * 清除所有收集的指标
   */
  clear(): void {
    this.fcpBuffer.clear()
    this.inpBuffer.clear()
    this.renderBuffer.clear()
    this.updateFrequencyBuffer.clear()
    this.memoryBuffer.clear()
    this.customMarkBuffer.clear()
    this.fpsBuffer.clear()
    this.pendingMarks.clear()
    this.componentUpdateCounts.clear()
  }

  /**
   * 销毁收集器，停止所有监控
   */
  destroy(): void {
    this.stopFPSMonitor()
    this.clear()
  }
}
