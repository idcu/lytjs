/**
 * Lyt.js DevTools 性能面板
 *
 * 增强版性能面板，集成 PerformanceCollector 和 ComponentProfiler，
 * 提供实时 FPS、组件渲染排名、更新频率、代理对象计数等监控能力。
 *
 * 纯原生零依赖实现。
 */

import { PerformanceCollector, type PerformanceReport } from './perf-collector'
import { ComponentProfiler, type ProfileResult } from './component-profiler'

// ============================================================
// 类型定义
// ============================================================

/** 性能条目（保持向后兼容） */
export interface PerfEntry {
  /** 组件名称 */
  name: string
  /** 渲染次数 */
  renders: number
  /** 总耗时 (ms) */
  totalTime: number
  /** 平均耗时 (ms) */
  avgTime: number
  /** 最大耗时 (ms) */
  maxTime: number
  /** 最近一次耗时 (ms) */
  lastTime: number
}

/** 增强面板配置 */
export interface EnhancedPerfPanelConfig {
  /** 是否自动开始 FPS 监控 */
  autoStartFPS?: boolean
  /** FPS 更新间隔 (ms) */
  fpsUpdateInterval?: number
}

// ============================================================
// 增强版性能面板
// ============================================================

/**
 * 增强版性能面板
 *
 * 在原有 PerfPanel 基础上，集成 PerformanceCollector 和 ComponentProfiler，
 * 提供更全面的性能监控能力。
 */
export class PerfPanel {
  private container: HTMLElement
  private entries: Map<string, PerfEntry> = new Map()

  /** 性能指标收集器 */
  private collector: PerformanceCollector

  /** 组件分析器 */
  private profiler: ComponentProfiler

  /** 是否正在录制 */
  private isRecording: boolean = false

  /** FPS 更新定时器 */
  private fpsUpdateTimer: number | null = null

  /** FPS 更新间隔 */
  private fpsUpdateInterval: number

  /** 配置 */
  private config: EnhancedPerfPanelConfig

  constructor(container: HTMLElement, config?: EnhancedPerfPanelConfig) {
    this.container = container
    this.config = {
      autoStartFPS: config?.autoStartFPS ?? false,
      fpsUpdateInterval: config?.fpsUpdateInterval ?? 1000,
    }
    this.fpsUpdateInterval = this.config.fpsUpdateInterval

    // 创建收集器和分析器
    this.collector = new PerformanceCollector()
    this.profiler = new ComponentProfiler()

    // 自动开始 FPS 监控
    if (this.config.autoStartFPS) {
      this.collector.startFPSMonitor()
    }

    this.render()
  }

  // ============================================================
  // 原有 API（保持向后兼容）
  // ============================================================

  /**
   * 记录一次组件渲染
   *
   * @param componentName - 组件名称
   * @param duration - 渲染耗时（毫秒）
   */
  recordRender(componentName: string, duration: number): void {
    const entry = this.entries.get(componentName) || {
      name: componentName,
      renders: 0,
      totalTime: 0,
      avgTime: 0,
      maxTime: 0,
      lastTime: 0,
    }
    entry.renders++
    entry.totalTime += duration
    entry.avgTime = entry.totalTime / entry.renders
    entry.maxTime = Math.max(entry.maxTime, duration)
    entry.lastTime = duration
    this.entries.set(componentName, entry)

    // 同步到收集器
    this.collector.recordRender(componentName, duration, 'update')

    // 同步到分析器
    this.profiler.recordRender(componentName, duration)

    this.render()
  }

  /**
   * 获取所有性能统计（按总耗时降序排列）
   *
   * @returns 排序后的性能条目数组
   */
  getStats(): PerfEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => b.totalTime - a.totalTime)
  }

  /**
   * 获取指定组件的性能数据
   *
   * @param componentName - 组件名称
   * @returns 性能条目，如果不存在则返回 null
   */
  getEntry(componentName: string): PerfEntry | null {
    return this.entries.get(componentName) || null
  }

  /**
   * 获取总渲染次数
   *
   * @returns 所有组件的总渲染次数
   */
  getTotalRenders(): number {
    let total = 0
    for (const entry of this.entries.values()) {
      total += entry.renders
    }
    return total
  }

  /**
   * 获取总耗时
   *
   * @returns 所有组件的总耗时（毫秒）
   */
  getTotalTime(): number {
    let total = 0
    for (const entry of this.entries.values()) {
      total += entry.totalTime
    }
    return total
  }

  /**
   * 清除所有性能数据
   */
  clear(): void {
    this.entries.clear()
    this.collector.clear()
    this.profiler.clear()
    this.render()
  }

  // ============================================================
  // 增强功能 - FPS 监控
  // ============================================================

  /**
   * 获取当前 FPS
   *
   * @returns 当前 FPS 值
   */
  getCurrentFPS(): number {
    return this.collector.getCurrentFPS()
  }

  /**
   * 开始 FPS 监控
   */
  startFPSMonitor(): void {
    this.collector.startFPSMonitor()
    this.startFPSUpdateLoop()
  }

  /**
   * 停止 FPS 监控
   */
  stopFPSMonitor(): void {
    this.collector.stopFPSMonitor()
    this.stopFPSUpdateLoop()
  }

  /**
   * 是否正在监控 FPS
   */
  isFPSMonitoring(): boolean {
    return this.collector.isFPSMonitoring()
  }

  // ============================================================
  // 增强功能 - 渲染排名
  // ============================================================

  /**
   * 获取组件渲染时间排名（最慢优先）
   *
   * @returns 排序后的渲染统计数组
   */
  getRenderRankings(): {
    componentName: string
    renderCount: number
    avgRenderTime: number
    maxRenderTime: number
    totalRenderTime: number
  }[] {
    return this.collector.getRenderRankings()
  }

  // ============================================================
  // 增强功能 - 更新频率
  // ============================================================

  /**
   * 获取组件更新频率统计
   *
   * @returns 更新频率统计数组
   */
  getUpdateFrequencyStats(): {
    componentName: string
    avgFrequency: number
  }[] {
    const report = this.collector.getReport()
    return report.updateFrequencyStats
  }

  // ============================================================
  // 增强功能 - 代理对象计数
  // ============================================================

  /**
   * 记录代理对象计数
   *
   * @param proxyCount - 代理对象数量
   * @param reactiveCount - 响应式状态对象数量
   */
  recordProxyCount(proxyCount: number, reactiveCount: number): void {
    this.collector.recordMemory(proxyCount, reactiveCount)
  }

  /**
   * 获取当前代理对象计数
   *
   * @returns 代理对象数量
   */
  getProxyCount(): number {
    return this.collector.getProxyCount()
  }

  // ============================================================
  // 增强功能 - 录制控制
  // ============================================================

  /**
   * 开始录制
   */
  startRecording(): void {
    this.isRecording = true
    this.collector.startRecording()
    this.startFPSUpdateLoop()
    this.render()
  }

  /**
   * 停止录制
   */
  stopRecording(): void {
    this.isRecording = false
    this.collector.stopRecording()
    this.stopFPSUpdateLoop()
    this.render()
  }

  /**
   * 是否正在录制
   */
  isRecordingActive(): boolean {
    return this.isRecording
  }

  // ============================================================
  // 增强功能 - 导出
  // ============================================================

  /**
   * 导出收集的数据为 JSON 字符串
   *
   * @returns JSON 字符串
   */
  exportJSON(): string {
    return this.collector.exportJSON()
  }

  // ============================================================
  // 增强功能 - 性能报告
  // ============================================================

  /**
   * 获取性能报告
   *
   * @returns 性能报告
   */
  getReport(): PerformanceReport {
    return this.collector.getReport()
  }

  // ============================================================
  // 增强功能 - 组件分析
  // ============================================================

  /**
   * 开始分析指定组件
   *
   * @param componentName - 组件名称
   * @returns 是否成功开始
   */
  startProfile(componentName: string): boolean {
    return this.profiler.startProfile(componentName)
  }

  /**
   * 停止分析指定组件
   *
   * @param componentName - 组件名称
   * @returns 分析结果
   */
  stopProfile(componentName: string): ProfileResult | null {
    return this.profiler.stopProfile(componentName)
  }

  /**
   * 获取组件分析快照
   *
   * @param componentName - 组件名称
   * @returns 分析快照
   */
  getProfileSnapshot(componentName: string): ProfileResult | null {
    return this.profiler.getSnapshot(componentName)
  }

  // ============================================================
  // 增强功能 - 慢渲染
  // ============================================================

  /**
   * 获取慢渲染列表
   *
   * @returns 慢渲染的 PerfEntry 数组
   */
  getSlowRenders(): PerfEntry[] {
    return this.getStats().filter(entry => entry.maxTime > 16)
  }

  // ============================================================
  // 获取器
  // ============================================================

  /**
   * 获取性能收集器实例
   */
  getCollector(): PerformanceCollector {
    return this.collector
  }

  /**
   * 获取组件分析器实例
   */
  getProfiler(): ComponentProfiler {
    return this.profiler
  }

  // ============================================================
  // 渲染
  // ============================================================

  /**
   * 渲染增强版性能面板 UI
   */
  private render(): void {
    this.container.innerHTML = ''

    // 汇总信息行
    const summary = document.createElement('div')
    summary.style.cssText = 'display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;'

    const fps = this.getCurrentFPS()
    const fpsColor = fps >= 55 ? '#a6e3a1' : fps >= 30 ? '#f9e2af' : '#f38ba8'
    const fpsCard = this.createStatCard('FPS', String(fps), fpsColor)
    const proxyCard = this.createStatCard('Proxies', String(this.getProxyCount()), '#cba6f7')
    const renderCard = this.createStatCard('Total Renders', String(this.getTotalRenders()), '#89b4fa')
    const timeCard = this.createStatCard('Total Time', `${this.getTotalTime().toFixed(2)}ms`, '#a6e3a1')
    const componentCard = this.createStatCard('Components', String(this.entries.size), '#f9e2af')

    summary.appendChild(fpsCard)
    summary.appendChild(proxyCard)
    summary.appendChild(renderCard)
    summary.appendChild(timeCard)
    summary.appendChild(componentCard)
    this.container.appendChild(summary)

    // 工具栏
    const toolbar = document.createElement('div')
    toolbar.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;'

    const titleLabel = document.createElement('span')
    titleLabel.style.cssText = 'font-size: 11px; color: #a6adc8; text-transform: uppercase; letter-spacing: 0.5px;'
    titleLabel.textContent = 'Render Performance'
    toolbar.appendChild(titleLabel)

    const btnGroup = document.createElement('div')
    btnGroup.style.cssText = 'display: flex; gap: 4px;'

    // 录制按钮
    const recordBtn = document.createElement('button')
    recordBtn.style.cssText = this.getRecordButtonStyle()
    recordBtn.textContent = this.isRecording ? 'Stop' : 'Record'
    recordBtn.addEventListener('click', () => {
      if (this.isRecording) {
        this.stopRecording()
      } else {
        this.startRecording()
      }
    })
    btnGroup.appendChild(recordBtn)

    // 导出按钮
    const exportBtn = document.createElement('button')
    exportBtn.style.cssText = 'background: transparent; border: 1px solid #45475a; color: #a6adc8; cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-family: inherit;'
    exportBtn.textContent = 'Export'
    exportBtn.addEventListener('click', () => {
      const json = this.exportJSON()
      // 触发下载
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lyt-perf-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    })
    btnGroup.appendChild(exportBtn)

    // 清除按钮
    const clearBtn = document.createElement('button')
    clearBtn.style.cssText = 'background: transparent; border: 1px solid #45475a; color: #a6adc8; cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-family: inherit;'
    clearBtn.textContent = 'Clear'
    clearBtn.addEventListener('click', () => this.clear())
    btnGroup.appendChild(clearBtn)

    toolbar.appendChild(btnGroup)
    this.container.appendChild(toolbar)

    // 性能列表（按平均渲染时间降序排列）
    const stats = this.getStats().sort((a, b) => b.avgTime - a.avgTime)

    if (stats.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText = 'color: #585b70; font-size: 12px; text-align: center; padding: 16px 0; font-style: italic;'
      empty.textContent = 'No performance data recorded'
      this.container.appendChild(empty)
    } else {
      // 表头
      const header = document.createElement('div')
      header.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 4px; padding: 4px 8px; font-size: 10px; color: #585b70; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #313244; margin-bottom: 4px;'
      header.innerHTML = '<span>Component</span><span>Renders</span><span>Avg</span><span>Max</span><span>Last</span>'
      this.container.appendChild(header)

      // 数据行
      const list = document.createElement('div')
      list.style.cssText = 'max-height: 300px; overflow-y: auto;'

      for (const entry of stats) {
        const row = document.createElement('div')
        row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 4px; padding: 6px 8px; font-size: 12px; border-radius: 3px; transition: background 0.15s; cursor: default;'
        row.addEventListener('mouseenter', () => { row.style.background = '#313244' })
        row.addEventListener('mouseleave', () => { row.style.background = 'transparent' })

        const nameCell = document.createElement('span')
        nameCell.style.cssText = 'color: #cdd6f4; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'
        nameCell.textContent = entry.name

        const rendersCell = document.createElement('span')
        rendersCell.style.cssText = 'color: #89b4fa;'
        rendersCell.textContent = String(entry.renders)

        const avgCell = document.createElement('span')
        avgCell.style.cssText = this.getPerfColor(entry.avgTime)
        avgCell.textContent = `${entry.avgTime.toFixed(2)}ms`

        const maxCell = document.createElement('span')
        maxCell.style.cssText = this.getPerfColor(entry.maxTime)
        maxCell.textContent = `${entry.maxTime.toFixed(2)}ms`

        const lastCell = document.createElement('span')
        lastCell.style.cssText = this.getPerfColor(entry.lastTime)
        lastCell.textContent = `${entry.lastTime.toFixed(2)}ms`

        row.appendChild(nameCell)
        row.appendChild(rendersCell)
        row.appendChild(avgCell)
        row.appendChild(maxCell)
        row.appendChild(lastCell)
        list.appendChild(row)
      }

      this.container.appendChild(list)
    }
  }

  /**
   * 创建统计卡片
   */
  private createStatCard(label: string, value: string, color: string): HTMLDivElement {
    const card = document.createElement('div')
    card.style.cssText = 'flex: 1; padding: 8px 12px; background: #181825; border: 1px solid #313244; border-radius: 4px; min-width: 70px;'

    const valueEl = document.createElement('div')
    valueEl.style.cssText = `font-size: 16px; font-weight: 600; color: ${color}; margin-bottom: 2px;`
    valueEl.textContent = value

    const labelEl = document.createElement('div')
    labelEl.style.cssText = 'font-size: 10px; color: #585b70; text-transform: uppercase; letter-spacing: 0.5px;'
    labelEl.textContent = label

    card.appendChild(valueEl)
    card.appendChild(labelEl)
    return card
  }

  /**
   * 获取录制按钮样式
   */
  private getRecordButtonStyle(): string {
    if (this.isRecording) {
      return 'background: #f38ba8; border: 1px solid #f38ba8; color: #1e1e2e; cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-family: inherit; font-weight: 600;'
    }
    return 'background: transparent; border: 1px solid #45475a; color: #a6adc8; cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-family: inherit;'
  }

  /**
   * 根据耗时返回颜色样式
   */
  private getPerfColor(time: number): string {
    if (time < 1) return 'color: #a6e3a1;'       // green - fast
    if (time < 5) return 'color: #f9e2af;'       // yellow - moderate
    if (time < 16) return 'color: #fab387;'       // orange - slow
    return 'color: #f38ba8;'                      // red - very slow
  }

  // ============================================================
  // FPS 更新循环
  // ============================================================

  /**
   * 启动 FPS 更新循环
   */
  private startFPSUpdateLoop(): void {
    this.stopFPSUpdateLoop()
    this.fpsUpdateTimer = window.setInterval(() => {
      this.render()
    }, this.fpsUpdateInterval) as unknown as number
  }

  /**
   * 停止 FPS 更新循环
   */
  private stopFPSUpdateLoop(): void {
    if (this.fpsUpdateTimer !== null) {
      clearInterval(this.fpsUpdateTimer)
      this.fpsUpdateTimer = null
    }
  }

  // ============================================================
  // 销毁
  // ============================================================

  /**
   * 销毁面板，清理 DOM 和资源
   */
  destroy(): void {
    this.stopFPSUpdateLoop()
    this.collector.destroy()
    this.profiler.destroy()
    this.container.innerHTML = ''
    this.entries.clear()
  }
}
