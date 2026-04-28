import { describe, it, expect, vi } from 'vitest'
import {
  EventEmitter,
  SubscriptionManager,
  TopicSubscriptionManager,
} from '../src/index'

describe('@lytjs/common-events', () => {
  // EventEmitter
  describe('EventEmitter', () => {
    it('should create an instance', () => {
      const emitter = new EventEmitter()
      expect(emitter).toBeInstanceOf(EventEmitter)
    })

    it('should register and emit events', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      emitter.on('test', handler)
      emitter.emit('test', 'data')
      expect(handler).toHaveBeenCalledWith('data')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should support multiple listeners', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      emitter.on('test', handler1)
      emitter.on('test', handler2)
      emitter.emit('test')
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should remove listener with off', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      emitter.on('test', handler)
      emitter.off('test', handler)
      emitter.emit('test')
      expect(handler).not.toHaveBeenCalled()
    })

    it('should remove all listeners for an event', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      emitter.on('test', handler1)
      emitter.on('test', handler2)
      emitter.removeAllListeners('test')
      emitter.emit('test')
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should support once listener', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      emitter.once('test', handler)
      emitter.emit('test')
      emitter.emit('test')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should emit event with multiple arguments', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()
      emitter.on('test', handler)
      emitter.emit('test', 1, 'two', { three: 3 })
      expect(handler).toHaveBeenCalledWith(1, 'two', { three: 3 })
    })

    it('should return listener count', () => {
      const emitter = new EventEmitter()
      expect(emitter.listenerCount('test')).toBe(0)
      emitter.on('test', vi.fn())
      emitter.on('test', vi.fn())
      expect(emitter.listenerCount('test')).toBe(2)
    })

    it('should handle emit on non-existent event gracefully', () => {
      const emitter = new EventEmitter()
      expect(() => emitter.emit('nonexistent')).not.toThrow()
    })
  })

  // SubscriptionManager
  describe('SubscriptionManager', () => {
    it('should create an instance', () => {
      const manager = new SubscriptionManager()
      expect(manager).toBeInstanceOf(SubscriptionManager)
    })

    it('should add and track subscriptions', () => {
      const manager = new SubscriptionManager()
      const unsub = vi.fn()
      manager.add(unsub)
      expect(manager.count).toBe(1)
    })

    it('should unsubscribe all', () => {
      const manager = new SubscriptionManager()
      const unsub1 = vi.fn()
      const unsub2 = vi.fn()
      manager.add(unsub1)
      manager.add(unsub2)
      manager.unsubscribeAll()
      expect(unsub1).toHaveBeenCalled()
      expect(unsub2).toHaveBeenCalled()
      expect(manager.count).toBe(0)
    })

    it('should handle unsubscribe errors gracefully', () => {
      const manager = new SubscriptionManager()
      const unsub = vi.fn(() => {
        throw new Error('unsubscribe error')
      })
      manager.add(unsub)
      expect(() => manager.unsubscribeAll()).not.toThrow()
    })

    it('should return unsubscribe function from add', () => {
      const manager = new SubscriptionManager()
      const unsub = vi.fn()
      const remove = manager.add(unsub)
      remove()
      expect(manager.count).toBe(0)
    })
  })

  // TopicSubscriptionManager
  describe('TopicSubscriptionManager', () => {
    it('should create an instance', () => {
      const manager = new TopicSubscriptionManager()
      expect(manager).toBeInstanceOf(TopicSubscriptionManager)
    })

    it('should subscribe to topics', () => {
      const manager = new TopicSubscriptionManager()
      const handler = vi.fn()
      manager.subscribe('topic1', handler)
      manager.publish('topic1', 'data')
      expect(handler).toHaveBeenCalledWith('data')
    })

    it('should support multiple subscribers to same topic', () => {
      const manager = new TopicSubscriptionManager()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      manager.subscribe('topic1', handler1)
      manager.subscribe('topic1', handler2)
      manager.publish('topic1', 'data')
      expect(handler1).toHaveBeenCalledWith('data')
      expect(handler2).toHaveBeenCalledWith('data')
    })

    it('should unsubscribe from topics', () => {
      const manager = new TopicSubscriptionManager()
      const handler = vi.fn()
      manager.subscribe('topic1', handler)
      manager.unsubscribe('topic1', handler)
      manager.publish('topic1', 'data')
      expect(handler).not.toHaveBeenCalled()
    })

    it('should unsubscribe all from a topic', () => {
      const manager = new TopicSubscriptionManager()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      manager.subscribe('topic1', handler1)
      manager.subscribe('topic1', handler2)
      manager.unsubscribeAll('topic1')
      manager.publish('topic1', 'data')
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should unsubscribe all from all topics', () => {
      const manager = new TopicSubscriptionManager()
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      manager.subscribe('topic1', handler1)
      manager.subscribe('topic2', handler2)
      manager.unsubscribeAll()
      manager.publish('topic1', 'data')
      manager.publish('topic2', 'data')
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should return subscriber count for a topic', () => {
      const manager = new TopicSubscriptionManager()
      expect(manager.subscriberCount('topic1')).toBe(0)
      manager.subscribe('topic1', vi.fn())
      manager.subscribe('topic1', vi.fn())
      expect(manager.subscriberCount('topic1')).toBe(2)
    })
  })
})
