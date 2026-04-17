/**
 * Lyt.js DevTools - 组件性能分析器
 *
 * 对单个组件进行详细的性能分析，追踪：
 * - 渲染次数
 * - 平均渲染时间
 * - 最大渲染时间
 * - 总渲染时间
 * - 慢渲染自动检测（>16ms）
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 单次渲染记录 */
export interface RenderRecord {
  /** 渲染耗时 (ms) */
  duration: number
  /** 渲染时间戳 */
  timestamp: number
  /** 是否为慢渲染 (>16ms) */
  isSlow: boolean
}

/** 组件分析结果 */
export interface ProfileResult {
  /** 组件名称 */
  componentName: string
  /** 渲染次数 */
  renderCount: number
  /** 平均渲染时间 (ms) */
  avgRenderTime: number
  /** 最大渲染时间 (ms) */
  maxRenderTime: number
  /** 最小渲染时间 (ms) */
  minRenderTime: number
  /** 总渲染时间 (ms) */
  totalRenderTime: number
  /** 慢渲染次数 */
  slowRenderCount: number
  /** 慢渲染阈值 (ms) */
  slowThreshold: number
  /** 所有渲染记录 */
  records: RenderRecord[]
  /** 分析持续时间 (ms) */
  profileDuration: number
}

/** 活跃的分析会话 */
interface ActiveProfile {
  /** 组件名称 */
  componentName: string
  /** 开始时间 */
  startTime: number
  /** 渲染记录列表 */
  records: RenderRecord[]
  /** 慢渲染阈值 (ms) */
  slowThreshold: number
}

// ============================================================
// 组件性能分析器
// ============================================================

/** 默认慢渲染阈值 (ms) */
const DEFAULT_SLOW_THRESHOLD = 16

/**
 * 组件性能分析器
 *
 * 对指定组件进行性能分析，自动检测慢渲染。
 * 支持同时分析多个组件。
 */
export class ComponentProfiler {
  /** 活跃的分析会话映射（组件名 -> 会话） */
  private activeProfiles: Map<string, ActiveProfile> = new Map()

  /** 慢渲染阈值 (ms) */
  private slowThreshold: number

  constructor(slowThreshold: number = DEFAULT_SLOW_THRESHOLD) {
    this.slowThreshold = slowThreshold
  }

  // ============================================================
  // 分析控制
  // ============================================================

  /**
   * 开始分析指定组件
   *
   * @param componentName - 组件名称
   * @returns 是否成功开始（如果已经在分析中则返回 false）
   */
  startProfile(componentName: string): boolean {
    if (this.activeProfiles.has(componentName)) {
      return false
    }

    this.activeProfiles.set(componentName, {
      componentName,
      startTime: performance.now(),
      records: [],
      slowThreshold: this.slowThreshold,
    })

    return true
  }

  /**
   * 停止分析指定组件并返回结果
   *
   * @param componentName - 组件名称
   * @returns 分析结果，如果组件未被分析则返回 null
   */
  stopProfile(componentName: string): ProfileResult | null {
    const profile = this.activeProfiles.get(componentName)
    if (!profile) {
      return null
    }

    this.activeProfiles.delete(componentName)

    return this.buildResult(profile)
  }

  /**
   * 停止所有分析并返回所有结果
   *
   * @returns 所有分析结果数组
   */
  stopAllProfiles(): ProfileResult[] {
    const results: ProfileResult[] = []

    for (const profile of this.activeProfiles.values()) {
      results.push(this.buildResult(profile))
    }

    this.activeProfiles.clear()
    return results
  }

  // ============================================================
  // 渲染记录
  // ============================================================

  /**
   * 记录一次组件渲染
   *
   * 如果组件正在被分析中，则记录此次渲染。
   *
   * @param componentName - 组件名称
   * @param duration - 渲染耗时 (ms)
   */
  recordRender(componentName: string, duration: number): void {
    const profile = this.activeProfiles.get(componentName)
    if (!profile) return

    const record: RenderRecord = {
      duration,
      timestamp: Date.now(),
      isSlow: duration > profile.slowThreshold,
    }

    profile.records.push(record)
  }

  /**
   * 获取指定组件的当前分析快照（不停止分析）
   *
   * @param componentName - 组件名称
   * @returns 当前分析快照，如果组件未被分析则返回 null
   */
  getSnapshot(componentName: string): ProfileResult | null {
    const profile = this.activeProfiles.get(componentName)
    if (!profile) {
      return null
    }

    return this.buildResult(profile)
  }

  // ============================================================
  // 查询
  // ============================================================

  /**
   * 检查指定组件是否正在被分析
   *
   * @param componentName - 组件名称
   * @returns 是否正在分析中
   */
  isProfiling(componentName: string): boolean {
    return this.activeProfiles.has(componentName)
  }

  /**
   * 获取所有正在分析的组件名称
   *
   * @returns 组件名称数组
   */
  getActiveProfileNames(): string[] {
    return Array.from(this.activeProfiles.keys())
  }

  /**
   * 获取正在分析的组件数量
   *
   * @returns 组件数量
   */
  getActiveProfileCount(): number {
    return this.activeProfiles.size
  }

  /**
   * 获取指定组件的慢渲染列表（仅当前活跃分析中的）
   *
   * @param componentName - 组件名称
   * @returns 慢渲染记录数组
   */
  getSlowRenders(componentName: string): RenderRecord[] {
    const profile = this.activeProfiles.get(componentName)
    if (!profile) return []
    return profile.records.filter(r => r.isSlow)
  }

  // ============================================================
  // 配置
  // ============================================================

  /**
   * 设置慢渲染阈值
   *
   * @param threshold - 新的阈值 (ms)
   */
  setSlowThreshold(threshold: number): void {
    this.slowThreshold = threshold
    // 更新所有活跃分析的阈值
    for (const profile of this.activeProfiles.values()) {
      profile.slowThreshold = threshold
      // 重新计算已有记录的 isSlow 标记
      for (const record of profile.records) {
        record.isSlow = record.duration > threshold
      }
    }
  }

  /**
   * 获取当前慢渲染阈值
   *
   * @returns 阈值 (ms)
   */
  getSlowThreshold(): number {
    return this.slowThreshold
  }

  // ============================================================
  // 清理
  // ============================================================

  /**
   * 清除所有分析数据
   */
  clear(): void {
    this.activeProfiles.clear()
  }

  /**
   * 销毁分析器
   */
  destroy(): void {
    this.clear()
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /**
   * 从分析会话构建结果对象
   */
  private buildResult(profile: ActiveProfile): ProfileResult {
    const records = profile.records
    const renderCount = records.length
    const totalRenderTime = records.reduce((sum, r) => sum + r.duration, 0)
    const avgRenderTime = renderCount > 0 ? totalRenderTime / renderCount : 0
    const maxRenderTime = renderCount > 0 ? Math.max(...records.map(r => r.duration)) : 0
    const minRenderTime = renderCount > 0 ? Math.min(...records.map(r => r.duration)) : 0
    const slowRenderCount = records.filter(r => r.isSlow).length
    const profileDuration = performance.now() - profile.startTime

    return {
      componentName: profile.componentName,
      renderCount,
      avgRenderTime,
      maxRenderTime,
      minRenderTime,
      totalRenderTime,
      slowRenderCount,
      slowThreshold: profile.slowThreshold,
      records: [...records],
      profileDuration,
    }
  }
}
