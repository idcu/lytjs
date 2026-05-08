/**
 * @lytjs/devtools - Event recording
 */

import type { DevToolsEvent, EventType } from './types';

// Event store
const events: DevToolsEvent[] = [];
let eventIdCounter = 0;
let isRecording = false;

// Event listeners
const eventListeners = new Set<(event: DevToolsEvent) => void>();

/**
 * Start recording events
 */
export function startRecording(): void {
  isRecording = true;
}

/**
 * Stop recording events
 */
export function stopRecording(): void {
  isRecording = false;
}

/**
 * Check if recording is active
 */
export function isEventRecording(): boolean {
  return isRecording;
}

/**
 * Record an event
 */
export function recordEvent(
  type: EventType,
  payload: unknown,
  componentId?: string,
): DevToolsEvent | undefined {
  if (!isRecording) return undefined;
  
  const event: DevToolsEvent = {
    id: `event-${++eventIdCounter}`,
    type,
    timestamp: Date.now(),
    payload,
    componentId,
  };
  
  events.push(event);
  
  // Notify listeners
  for (const listener of eventListeners) {
    listener(event);
  }
  
  return event;
}

/**
 * Get all recorded events
 */
export function getEvents(filter?: EventType[]): DevToolsEvent[] {
  if (!filter || filter.length === 0) {
    return [...events];
  }
  
  return events.filter(e => filter.includes(e.type));
}

/**
 * Clear all events
 */
export function clearEvents(): void {
  events.length = 0;
  eventIdCounter = 0;
}

/**
 * Subscribe to events
 */
export function subscribeEvents(callback: (event: DevToolsEvent) => void): () => void {
  eventListeners.add(callback);
  return () => {
    eventListeners.delete(callback);
  };
}

/**
 * Get event count
 */
export function getEventCount(): number {
  return events.length;
}
