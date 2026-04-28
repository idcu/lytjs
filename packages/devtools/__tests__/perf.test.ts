/**
 * @lytjs/devtools - 性能模块单元测试
 *
 * 测试 PerformanceCollector 和 ComponentProfiler。
 * 这些模块不依赖浏览器 DOM，可以在 Node.js 环境中运行。
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 */

import {
  describe,
  it,
  expect,
} from '../../test-utils/src/index'

import { PerformanceCollector } from '../src/perf-collector'
import { ComponentProfiler } from '../src/component-profiler'

// ================================================================
// PerformanceCollector 测试
// ================================================================

describe('@lytjs/devtools - PerformanceCollector', () => {
  it('PerformanceCollector 可以实例化', () => {
    const collector = new PerformanceCollector()
    expect(collector).toBeDefined()
    expect(typeof collector.getMetrics).toBe('function')
    expect(typeof collector.getReport).toBe('function')
    expect(typeof collector.startMark).toBe('function')
    expect(typeof collector.endMark).toBe('function')
    collector.destroy()
  })

  it('PerformanceCollector 可以使用自定义缓冲区大小', () => {
    const collector = new PerformanceCollector(50)
    expect(collector).toBeDefined()
    collector.destroy()
  })

  it('初始 getMetrics 返回空数组', () => {
    const collector = new PerformanceCollector()
    const metrics = collector.getMetrics()
    expect(Array.isArray(metrics)).toBe(true)
    expect(metrics.length).toBe(0)
    collector.destroy()
  })

  it('初始 getReport 返回空报告', () => {
    const collector = new PerformanceCollector()
    const report = collector.getReport()
    expect(report).toBeDefined()
    expect(report.fcp).toBeNull()
    expect(report.inp.avg).toBe(0)
    expect(report.inp.max).toBe(0)
    expect(report.inp.min).toBe(0)
    expect(report.inp.count).toBe(0)
    expect(report.renderStats.length).toBe(0)
    expect(report.memory).toBeNull()
    expect(report.fps.avg).toBe(0)
    expect(report.fps.min).toBe(0)
    expect(report.fps.count).toBe(0)
    expect(report.customMarks.length).toBe(0)
    collector.destroy()
  })

  it('recordFCP 正确记录 FCP 指标', () => {
    const collector = new PerformanceCollector()
    collector.recordFCP(123.45)
    const metrics = collector.getMetricsByType('fcp')
    expect(metrics.length).toBe(1)
    expect(metrics[0].type).toBe('fcp')
    expect(metrics[0].value).toBe(123.45)
    expect(metrics[0].timestamp).toBeDefined()
    collector.destroy()
  })

  it('recordINP 正确记录 INP 指标', () => {
    const collector = new PerformanceCollector()
    collector.recordINP(5.5, 'click', 'MyButton')
    const metrics = collector.getMetricsByType('inp')
    expect(metrics.length).toBe(1)
    expect(metrics[0].type).toBe('inp')
    expect(metrics[0].value).toBe(5.5)
    expect(metrics[0].eventName).toBe('click')
    expect(metrics[0].componentName).toBe('MyButton')
    collector.destroy()
  })

  it('recordRender 正确记录渲染指标', () => {
    const collector = new PerformanceCollector()
    collector.recordRender('App', 2.5, 'mount', 'comp_1')
    const metrics = collector.getMetricsByType('render')
    expect(metrics.length).toBe(1)
    expect(metrics[0].type).toBe('render')
    expect(metrics[0].value).toBe(2.5)
    expect(metrics[0].componentName).toBe('App')
    expect(metrics[0].phase).toBe('mount')
    expect(metrics[0].componentId).toBe('comp_1')
    collector.destroy()
  })

  it('recordMemory 正确记录内存指标', () => {
    const collector = new PerformanceCollector()
    collector.recordMemory(42, 10)
    const metrics = collector.getMetricsByType('memory')
    expect(metrics.length).toBe(1)
    expect(metrics[0].type).toBe('memory')
    expect(metrics[0].proxyCount).toBe(42)
    expect(metrics[0].reactiveCount).toBe(10)
    collector.destroy()
  })

  it('startMark/endMark 正确计时', () => {
    const collector = new PerformanceCollector()
    collector.startMark('test-op')
    // 模拟一些工作
    const start = performance.now()
    while (performance.now() - start < 5) { /* busy wait ~5ms */ }
    const duration = collector.endMark('test-op')
    expect(duration).toBeGreaterThan(0)
    expect(duration).toBeLessThan(1000) // 合理范围内

    const metrics = collector.getMetricsByType('custom')
    expect(metrics.length).toBe(1)
    expect(metrics[0].type).toBe('custom')
    expect(metrics[0].name).toBe('test-op')
    expect(metrics[0].value).toBeGreaterThan(0)
    collector.destroy()
  })

  it('endMark 对不存在的标记返回 -1', () => {
    const collector = new PerformanceCollector()
    const result = collector.endMark('non-existent')
    expect(result).toBe(-1)
    collector.destroy()
  })

  it('startMark/endMark 支持多个并发标记', () => {
    const collector = new PerformanceCollector()
    collector.startMark('op-a')
    // 用实际计算产生可测量的时间差
    let sum = 0
    for (let i = 0; i < 100000; i++) { sum += Math.sqrt(i) }
    collector.startMark('op-b')
    const durationA = collector.endMark('op-a')
    const durationB = collector.endMark('op-b')
    expect(durationA).toBeGreaterThanOrEqual(0)
    expect(durationB).toBeGreaterThanOrEqual(0)

    const metrics = collector.getMetricsByType('custom')
    expect(metrics.length).toBe(2)
    collector.destroy()
  })

  it('环形缓冲区在超过容量时正确覆盖旧数据', () => {
    const collector = new PerformanceCollector(10) // 小缓冲区便于测试
    // 添加 15 条 FCP 记录
    for (let i = 0; i < 15; i++) {
      collector.recordFCP(i)
    }
    const metrics = collector.getMetricsByType('fcp')
    // 缓冲区大小为 10，应该只保留最后 10 条
    expect(metrics.length).toBe(10)
    // 最旧的应该是 5（索引 5-14）
    expect(metrics[0].value).toBe(5)
    // 最新的应该是 14
    expect(metrics[metrics.length - 1].value).toBe(14)
    collector.destroy()
  })

  it('getRenderRankings 按平均渲染时间降序排列', () => {
    const collector = new PerformanceCollector()
    collector.recordRender('SlowComp', 20, 'update')
    collector.recordRender('SlowComp', 30, 'update')
    collector.recordRender('FastComp', 1, 'update')
    collector.recordRender('FastComp', 2, 'update')
    collector.recordRender('MedComp', 10, 'update')

    const rankings = collector.getRenderRankings()
    expect(rankings.length).toBe(3)
    expect(rankings[0].componentName).toBe('SlowComp')
    expect(rankings[0].avgRenderTime).toBe(25) // (20+30)/2
    expect(rankings[1].componentName).toBe('MedComp')
    expect(rankings[2].componentName).toBe('FastComp')
    collector.destroy()
  })

  it('getProxyCount 返回最新代理对象计数', () => {
    const collector = new PerformanceCollector()
    expect(collector.getProxyCount()).toBe(0)
    collector.recordMemory(10, 5)
    expect(collector.getProxyCount()).toBe(10)
    collector.recordMemory(20, 8)
    expect(collector.getProxyCount()).toBe(20)
    collector.destroy()
  })

  it('getSlowRenders 返回超过 16ms 的渲染', () => {
    const collector = new PerformanceCollector()
    collector.recordRender('Fast', 5, 'update')
    collector.recordRender('Slow', 20, 'update')
    collector.recordRender('VerySlow', 50, 'update')
    collector.recordRender('Normal', 10, 'update')

    const slowRenders = collector.getSlowRenders()
    expect(slowRenders.length).toBe(2)
    expect(slowRenders[0].componentName).toBe('Slow')
    expect(slowRenders[1].componentName).toBe('VerySlow')
    collector.destroy()
  })

  it('getReport 正确生成综合报告', () => {
    const collector = new PerformanceCollector()
    collector.recordFCP(100)
    collector.recordINP(5, 'click', 'Button')
    collector.recordINP(10, 'input', 'Input')
    collector.recordRender('App', 2, 'mount')
    collector.recordRender('App', 4, 'update')
    collector.recordMemory(15, 5)
    collector.startMark('init')
    const initDuration = collector.endMark('init')

    const report = collector.getReport()
    expect(report.generatedAt).toBeDefined()
    expect(report.fcp).toBeDefined()
    expect(report.fcp!.value).toBe(100)
    expect(report.inp.avg).toBe(7.5) // (5+10)/2
    expect(report.inp.max).toBe(10)
    expect(report.inp.min).toBe(5)
    expect(report.inp.count).toBe(2)
    expect(report.renderStats.length).toBe(1)
    expect(report.renderStats[0].componentName).toBe('App')
    expect(report.renderStats[0].renderCount).toBe(2)
    expect(report.renderStats[0].avgRenderTime).toBe(3) // (2+4)/2
    expect(report.memory).toBeDefined()
    expect(report.memory!.proxyCount).toBe(15)
    expect(report.customMarks.length).toBe(1)
    expect(report.customMarks[0].name).toBe('init')
    collector.destroy()
  })

  it('exportJSON 返回有效的 JSON 字符串', () => {
    const collector = new PerformanceCollector()
    collector.recordFCP(100)
    collector.recordRender('App', 5, 'mount')

    const json = collector.exportJSON()
    expect(typeof json).toBe('string')
    const parsed = JSON.parse(json)
    expect(parsed.metrics).toBeDefined()
    expect(parsed.report).toBeDefined()
    expect(parsed.metrics.length).toBeGreaterThan(0)
    collector.destroy()
  })

  it('clear 清除所有指标', () => {
    const collector = new PerformanceCollector()
    collector.recordFCP(100)
    collector.recordRender('App', 5, 'mount')
    collector.recordMemory(10, 5)

    expect(collector.getMetrics().length).toBeGreaterThan(0)
    collector.clear()
    expect(collector.getMetrics().length).toBe(0)
    expect(collector.getProxyCount()).toBe(0)
    collector.destroy()
  })

  it('录制控制 (startRecording/stopRecording/isRecording)', () => {
    const collector = new PerformanceCollector()
    expect(collector.isRecording()).toBe(false)
    collector.startRecording()
    expect(collector.isRecording()).toBe(true)
    collector.stopRecording()
    expect(collector.isRecording()).toBe(false)
    collector.destroy()
  })

  it('getCurrentFPS 初始返回 0', () => {
    const collector = new PerformanceCollector()
    expect(collector.getCurrentFPS()).toBe(0)
    collector.destroy()
  })

  it('getMetricsByType 正确过滤指标类型', () => {
    const collector = new PerformanceCollector()
    collector.recordFCP(100)
    collector.recordFCP(200)
    collector.recordRender('App', 5, 'mount')
    collector.recordMemory(10, 5)

    const fcpMetrics = collector.getMetricsByType('fcp')
    expect(fcpMetrics.length).toBe(2)

    const renderMetrics = collector.getMetricsByType('render')
    expect(renderMetrics.length).toBe(1)

    const memoryMetrics = collector.getMetricsByType('memory')
    expect(memoryMetrics.length).toBe(1)

    // 不存在的类型返回空数组
    const fpsMetrics = collector.getMetricsByType('fps')
    expect(fpsMetrics.length).toBe(0)
    collector.destroy()
  })
})

// ================================================================
// ComponentProfiler 测试
// ================================================================

describe('@lytjs/devtools - ComponentProfiler', () => {
  it('ComponentProfiler 可以实例化', () => {
    const profiler = new ComponentProfiler()
    expect(profiler).toBeDefined()
    expect(typeof profiler.startProfile).toBe('function')
    expect(typeof profiler.stopProfile).toBe('function')
    expect(typeof profiler.recordRender).toBe('function')
    profiler.destroy()
  })

  it('ComponentProfiler 可以使用自定义慢渲染阈值', () => {
    const profiler = new ComponentProfiler(32)
    expect(profiler.getSlowThreshold()).toBe(32)
    profiler.destroy()
  })

  it('startProfile 开始分析并返回 true', () => {
    const profiler = new ComponentProfiler()
    const result = profiler.startProfile('App')
    expect(result).toBe(true)
    expect(profiler.isProfiling('App')).toBe(true)
    profiler.destroy()
  })

  it('startProfile 对已分析的组件返回 false', () => {
    const profiler = new ComponentProfiler()
    profiler.startProfile('App')
    const result = profiler.startProfile('App')
    expect(result).toBe(false)
    profiler.destroy()
  })

  it('stopProfile 停止分析并返回结果', () => {
    const profiler = new ComponentProfiler()
    profiler.startProfile('App')
    const s = performance.now()
    while (performance.now() - s < 1) {} // minimal delay
    profiler.recordRender('App', 5)
    profiler.recordRender('App', 10)

    const result = profiler.stopProfile('App')
    expect(result).toBeDefined()
    expect(result!.componentName).toBe('App')
    expect(result!.renderCount).toBe(2)
    expect(result!.avgRenderTime).toBe(7.5)
    expect(result!.maxRenderTime).toBe(10)
    expect(result!.minRenderTime).toBe(5)
    expect(result!.totalRenderTime).toBe(15)
    expect(result!.slowRenderCount).toBe(0)
    expect(result!.records.length).toBe(2)
    expect(result!.profileDuration).toBeGreaterThanOrEqual(0)
    profiler.destroy()
  })

  it('stopProfile 对未分析的组件返回 null', () => {
    const profiler = new ComponentProfiler()
    const result = profiler.stopProfile('NonExistent')
    expect(result).toBeNull()
    profiler.destroy()
  })

  it('stopAllProfiles 停止所有分析', () => {
    const profiler = new ComponentProfiler()
    profiler.startProfile('App')
    profiler.startProfile('Button')
    profiler.recordRender('App', 5)
    profiler.recordRender('Button', 10)

    const results = profiler.stopAllProfiles()
    expect(results.length).toBe(2)
    expect(profiler.getActiveProfileCount()).toBe(0)
    profiler.destroy()
  })

  it('recordRender 只记录正在分析的组件', () => {
    const profiler = new ComponentProfiler()
    profiler.startProfile('App')
    profiler.recordRender('App', 5)      // 会被记录
    profiler.recordRender('Other', 10)   // 不会被记录

    const result = profiler.stopProfile('App')
    expect(result!.renderCount).toBe(1)
    profiler.destroy()
  })

  it('慢渲染自动检测（>16ms）', () => {
    const profiler = new ComponentProfiler()
    profiler.startProfile('SlowComp')
    profiler.recordRender('SlowComp', 5)    // 快速
    profiler.recordRender('SlowComp', 20)   // 慢
    profiler.recordRender('SlowComp', 30)   // 慢

    const result = profiler.stopProfile('SlowComp')
    expect(result!.slowRenderCount).toBe(2)
    expect(result!.records[0].isSlow).toBe(false)
    expect(result!.records[1].isSlow).toBe(true)
    expect(result!.records[2].isSlow).toBe(true)
    profiler.destroy()
  })

  it('getSlowRenders 返回活跃分析中的慢渲染', () => {
    const profiler = new ComponentProfiler()
    profiler.startProfile('Comp')
    profiler.recordRender('Comp', 5)
    profiler.recordRender('Comp', 20)
    profiler.recordRender('Comp', 30)

    const slowRenders = profiler.getSlowRenders('Comp')
    expect(slowRenders.length).toBe(2)
    expect(slowRenders[0].duration).toBe(20)
    expect(slowRenders[1].duration).toBe(30)
    profiler.destroy()
  })

  it('getSnapshot 返回当前分析快照但不停止分析', () => {
    const profiler = new ComponentProfiler()
    profiler.startProfile('App')
    profiler.recordRender('App', 5)

    const snapshot = profiler.getSnapshot('App')
    expect(snapshot).toBeDefined()
    expect(snapshot!.renderCount).toBe(1)
    expect(profiler.isProfiling('App')).toBe(true) // 仍在分析中

    profiler.recordRender('App', 10)
    const snapshot2 = profiler.getSnapshot('App')
    expect(snapshot2!.renderCount).toBe(2)
    profiler.destroy()
  })

  it('getSnapshot 对未分析的组件返回 null', () => {
    const profiler = new ComponentProfiler()
    const snapshot = profiler.getSnapshot('NonExistent')
    expect(snapshot).toBeNull()
    profiler.destroy()
  })

  it('getActiveProfileNames 返回正在分析的组件名', () => {
    const profiler = new ComponentProfiler()
    profiler.startProfile('App')
    profiler.startProfile('Button')
    profiler.startProfile('Input')

    const names = profiler.getActiveProfileNames()
    expect(names.length).toBe(3)
    expect(names).toContain('App')
    expect(names).toContain('Button')
    expect(names).toContain('Input')
    profiler.destroy()
  })

  it('setSlowThreshold 动态更新阈值并重新计算', () => {
    const profiler = new ComponentProfiler(16)
    profiler.startProfile('Comp')
    profiler.recordRender('Comp', 10)  // 10 < 16, 不慢
    profiler.recordRender('Comp', 20)  // 20 > 16, 慢

    let snapshot = profiler.getSnapshot('Comp')
    expect(snapshot!.slowRenderCount).toBe(1)

    // 降低阈值到 8
    profiler.setSlowThreshold(8)
    expect(profiler.getSlowThreshold()).toBe(8)

    snapshot = profiler.getSnapshot('Comp')
    // 现在 10 和 20 都超过 8
    expect(snapshot!.slowRenderCount).toBe(2)
    profiler.destroy()
  })

  it('clear 清除所有分析数据', () => {
    const profiler = new ComponentProfiler()
    profiler.startProfile('App')
    profiler.recordRender('App', 5)

    profiler.clear()
    expect(profiler.getActiveProfileCount()).toBe(0)
    expect(profiler.isProfiling('App')).toBe(false)
    profiler.destroy()
  })

  it('支持同时分析多个组件', () => {
    const profiler = new ComponentProfiler()
    profiler.startProfile('App')
    profiler.startProfile('Button')

    profiler.recordRender('App', 5)
    profiler.recordRender('App', 10)
    profiler.recordRender('Button', 3)
    profiler.recordRender('Button', 7)
    profiler.recordRender('Button', 2)

    const appResult = profiler.stopProfile('App')
    expect(appResult!.renderCount).toBe(2)
    expect(appResult!.avgRenderTime).toBe(7.5)

    const buttonResult = profiler.stopProfile('Button')
    expect(buttonResult!.renderCount).toBe(3)
    expect(buttonResult!.avgRenderTime).toBe(4)
    profiler.destroy()
  })
})
