/**
 * DevTools 事件记录模块
 */

export interface EventRecord {
  id: string;
  type: string;
  componentId?: string;
  target?: string;
  timestamp: number;
  data?: unknown;
}

const events: EventRecord[] = [];
let maxEvents = 1000;
let isRecording = false;
const eventSubscribers: Array<(event: EventRecord) => void> = [];

export function setMaxEvents(max: number): void {
  maxEvents = max;
}

export function recordEvent(type: string, data?: unknown): EventRecord;
export function recordEvent(event: Omit<EventRecord, 'id' | 'timestamp'>): EventRecord;
export function recordEvent(
  typeOrEvent: string | Omit<EventRecord, 'id' | 'timestamp'>,
  data?: unknown,
): EventRecord {
  let record: EventRecord;

  if (typeof typeOrEvent === 'string') {
    record = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      type: typeOrEvent,
      data,
    };
  } else {
    record = {
      ...typeOrEvent,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
    };
  }

  events.push(record);

  // 限制事件数量
  if (events.length > maxEvents) {
    events.splice(0, events.length - maxEvents);
  }

  // 通知订阅者
  eventSubscribers.forEach(callback => {
    try {
      callback(record);
    } catch (e) {
      console.error('[DevTools Events] Subscriber error:', e);
    }
  });

  return record;
}

export function getEvents(): EventRecord[] {
  return [...events];
}

export function getEventsByComponent(componentId: string): EventRecord[] {
  return events.filter(e => e.componentId === componentId);
}

export function getEventsByType(type: string): EventRecord[] {
  return events.filter(e => e.type === type);
}

export function clearEvents(): void {
  events.length = 0;
}

export function getEventStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  events.forEach(e => {
    stats[e.type] = (stats[e.type] || 0) + 1;
  });
  return stats;
}

/**
 * 开始记录事件
 */
export function startRecording(): void {
  isRecording = true;
}

/**
 * 停止记录事件
 */
export function stopRecording(): void {
  isRecording = false;
}

/**
 * 检查是否正在记录事件
 */
export function isEventRecording(): boolean {
  return isRecording;
}

/**
 * 订阅事件
 * @param callback - 事件回调函数
 * @returns 取消订阅函数
 */
export function subscribeEvents(callback: (event: EventRecord) => void): () => void {
  eventSubscribers.push(callback);
  return () => {
    const index = eventSubscribers.indexOf(callback);
    if (index > -1) {
      eventSubscribers.splice(index, 1);
    }
  };
}

/**
 * 获取事件数量
 */
export function getEventCount(): number {
  return events.length;
}
