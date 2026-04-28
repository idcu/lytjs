/**
 * Calendar 共享工具函数
 *
 * 提供日历网格生成、日期计算、格式化/解析等通用功能。
 * Calendar 和 DatePicker 组件共用这些函数，避免逻辑重复。
 */

/** 日历日期单元格 */
export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  dateStr: string
}

/**
 * 获取指定月份的天数
 * @param year 年份
 * @param month 月份（0-11）
 * @returns 该月的天数
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * 获取指定月份第一天是星期几
 * @param year 年份
 * @param month 月份（0-11）
 * @returns 星期几（0=周日, 1=周一, ..., 6=周六）
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

/**
 * 格式化日期为 YYYY-MM-DD 字符串
 * @param date 日期对象
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 使用自定义格式字符串格式化日期
 * @param date 日期对象
 * @param format 格式字符串（支持 YYYY, MM, DD）
 * @returns 格式化后的日期字符串
 */
export function formatDateWithPattern(date: Date, format: string): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return format
    .replace('YYYY', String(y))
    .replace('MM', m)
    .replace('DD', d)
}

/**
 * 解析日期字符串（YYYY-MM-DD 格式）
 * @param str 日期字符串
 * @returns 日期对象，解析失败返回 null
 */
export function parseDate(str: string): Date | null {
  if (!str) return null
  const parts = str.split('-')
  if (parts.length !== 3) return null
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(y, m, d)
}

/**
 * 生成日历网格数据（6 行 x 7 列 = 42 天）
 *
 * 包含上月末尾、当月全部、下月开头的日期。
 *
 * @param year 年份
 * @param month 月份（0-11）
 * @returns 日历日期单元格数组（42 个元素）
 */
export function generateCalendarDays(year: number, month: number): CalendarDay[] {
  const days: CalendarDay[] = []
  const today = new Date()
  const todayStr = formatDate(today)

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // 上月补位
  const prevMonthDays = getDaysInMonth(year, month - 1)
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    const date = new Date(year, month - 1, day)
    days.push({
      date,
      isCurrentMonth: false,
      isToday: formatDate(date) === todayStr,
      dateStr: formatDate(date),
    })
  }

  // 当月
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i)
    days.push({
      date,
      isCurrentMonth: true,
      isToday: formatDate(date) === todayStr,
      dateStr: formatDate(date),
    })
  }

  // 下月补位（补满 42 天）
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, month + 1, i)
    days.push({
      date,
      isCurrentMonth: false,
      isToday: formatDate(date) === todayStr,
      dateStr: formatDate(date),
    })
  }

  return days
}

/**
 * 判断两个日期是否是同一天
 * @param a 日期 A
 * @param b 日期 B
 * @returns 是否同一天
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
