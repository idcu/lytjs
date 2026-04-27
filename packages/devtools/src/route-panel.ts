/**
 * Lyt.js DevTools 路由面板
 * 显示当前路由信息和导航历史
 */

/** 路由历史记录条目 */
export interface RouteHistoryEntry {
  /** 路由路径 */
  path: string
  /** 路由参数 */
  params?: Record<string, string>
  /** 查询参数 */
  query?: Record<string, string>
  /** 导航时间戳 */
  timestamp: number
}

/** 路由面板配置 */
export interface RoutePanelConfig {
  /** 最大历史记录条数 */
  maxHistory?: number
}

/**
 * 路由面板
 *
 * 显示当前路由信息和导航历史列表，
 * 帮助开发者调试路由相关的问题。
 */
export class RoutePanel {
  private container: HTMLElement
  private history: RouteHistoryEntry[] = []
  private maxHistory: number
  private currentPath: string = '/'
  private currentParams: Record<string, string> = {}
  private currentQuery: Record<string, string> = {}

  constructor(container: HTMLElement, config?: RoutePanelConfig) {
    this.container = container
    this.maxHistory = config?.maxHistory ?? 50
    this.render()
  }

  /**
   * 更新当前路由信息
   *
   * @param path - 路由路径
   * @param params - 路由参数
   * @param query - 查询参数
   */
  updateRoute(path: string, params?: Record<string, string>, query?: Record<string, string>): void {
    // 记录到历史
    this.history.push({
      path,
      params: params ? { ...params } : undefined,
      query: query ? { ...query } : undefined,
      timestamp: Date.now(),
    })

    // 限制历史长度
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    // 更新当前路由
    this.currentPath = path
    this.currentParams = params ? { ...params } : {}
    this.currentQuery = query ? { ...query } : {}

    this.render()
  }

  /**
   * 获取路由历史记录
   *
   * @returns 历史记录数组（最新在前）
   */
  getHistory(): RouteHistoryEntry[] {
    return [...this.history].reverse()
  }

  /**
   * 获取当前路由路径
   *
   * @returns 当前路径
   */
  getCurrentPath(): string {
    return this.currentPath
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.history = []
    this.render()
  }

  /**
   * 渲染路由面板 UI
   */
  private render(): void {
    this.container.innerHTML = ''

    // 当前路由信息
    const currentSection = document.createElement('div')
    currentSection.style.cssText = 'margin-bottom: 16px;'

    const currentTitle = document.createElement('div')
    currentTitle.style.cssText = 'font-size: 11px; color: #a6adc8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;'
    currentTitle.textContent = 'Current Route'
    currentSection.appendChild(currentTitle)

    // 路径
    const pathRow = document.createElement('div')
    pathRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 6px;'
    const pathLabel = document.createElement('span')
    pathLabel.style.cssText = 'color: #585b70; font-size: 11px; min-width: 50px;'
    pathLabel.textContent = 'Path:'
    const pathValue = document.createElement('span')
    pathValue.style.cssText = 'color: #cba6f7; font-size: 13px; font-weight: 600;'
    pathValue.textContent = this.currentPath || '/'
    pathRow.appendChild(pathLabel)
    pathRow.appendChild(pathValue)
    currentSection.appendChild(pathRow)

    // 参数
    if (Object.keys(this.currentParams).length > 0) {
      const paramsRow = document.createElement('div')
      paramsRow.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;'
      const paramsLabel = document.createElement('span')
      paramsLabel.style.cssText = 'color: #585b70; font-size: 11px; min-width: 50px;'
      paramsLabel.textContent = 'Params:'
      const paramsValue = document.createElement('span')
      paramsValue.style.cssText = 'color: #a6e3a1; font-size: 12px;'
      paramsValue.textContent = JSON.stringify(this.currentParams)
      paramsRow.appendChild(paramsLabel)
      paramsRow.appendChild(paramsValue)
      currentSection.appendChild(paramsRow)
    }

    // 查询参数
    if (Object.keys(this.currentQuery).length > 0) {
      const queryRow = document.createElement('div')
      queryRow.style.cssText = 'display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;'
      const queryLabel = document.createElement('span')
      queryLabel.style.cssText = 'color: #585b70; font-size: 11px; min-width: 50px;'
      queryLabel.textContent = 'Query:'
      const queryValue = document.createElement('span')
      queryValue.style.cssText = 'color: #89b4fa; font-size: 12px;'
      queryValue.textContent = JSON.stringify(this.currentQuery)
      queryRow.appendChild(queryLabel)
      queryRow.appendChild(queryValue)
      currentSection.appendChild(queryRow)
    }

    this.container.appendChild(currentSection)

    // 历史记录标题
    const historyTitle = document.createElement('div')
    historyTitle.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;'
    const historyLabel = document.createElement('span')
    historyLabel.style.cssText = 'font-size: 11px; color: #a6adc8; text-transform: uppercase; letter-spacing: 0.5px;'
    historyLabel.textContent = `History (${this.history.length})`
    historyTitle.appendChild(historyLabel)

    const clearBtn = document.createElement('button')
    clearBtn.style.cssText = 'background: transparent; border: 1px solid #45475a; color: #a6adc8; cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-family: inherit;'
    clearBtn.textContent = 'Clear'
    clearBtn.addEventListener('click', () => this.clearHistory())
    historyTitle.appendChild(clearBtn)

    this.container.appendChild(historyTitle)

    // 历史记录列表
    if (this.history.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText = 'color: #585b70; font-size: 12px; text-align: center; padding: 16px 0; font-style: italic;'
      empty.textContent = 'No navigation history'
      this.container.appendChild(empty)
    } else {
      const list = document.createElement('div')
      list.style.cssText = 'max-height: 300px; overflow-y: auto;'

      const reversedHistory = [...this.history].reverse()
      for (const entry of reversedHistory) {
        const item = document.createElement('div')
        item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-radius: 3px; font-size: 12px; transition: background 0.15s; cursor: default;'
        item.addEventListener('mouseenter', () => { item.style.background = '#313244' })
        item.addEventListener('mouseleave', () => { item.style.background = 'transparent' })

        const pathSpan = document.createElement('span')
        pathSpan.style.cssText = 'color: #cdd6f4; font-family: inherit;'
        pathSpan.textContent = entry.path

        const timeSpan = document.createElement('span')
        timeSpan.style.cssText = 'color: #585b70; font-size: 10px; white-space: nowrap;'
        const date = new Date(entry.timestamp)
        timeSpan.textContent = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`

        item.appendChild(pathSpan)
        item.appendChild(timeSpan)
        list.appendChild(item)
      }

      this.container.appendChild(list)
    }
  }

  /**
   * 销毁面板，清理 DOM
   */
  destroy(): void {
    this.container.innerHTML = ''
    this.history = []
  }
}
