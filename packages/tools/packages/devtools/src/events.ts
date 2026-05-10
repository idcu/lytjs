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

export function setMaxEvents(max: number): void {
  maxEvents = max;
}

export function recordEvent(event: Omit<EventRecord, 'id' | 'timestamp'>): EventRecord {
  const record: EventRecord = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  
  events.push(record);
  
  // 限制事件数量
  if (events.length > maxEvents) {
    events.splice(0, events.length - maxEvents);
  }
  
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
