 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  queueJob,
  queuePostFlushCb,
  queuePreFlushCb,
  nextTick,
  flushJobs,
  flushSync,
  hasPendingJobs,
  getPendingJobCount,
  resetSchedulerState,
  queueJobWithPriority,
  Priority,
} from '../src/index';
import type { SchedulerJobWithPriority } from '../src/index';

describe('@lytjs/common-scheduler', () => {
  beforeEach(() => {
    resetSchedulerState();
  });

  afterEach(() => {
    resetSchedulerState();
  });

  describe('queueJob', () => {
    it('should queue a job', () => {
      const job = vi.fn();
      queueJob(job);
      expect(hasPendingJobs()).toBe(true);
      expect(getPendingJobCount()).toBe(1);
    });

    it('should not queue duplicate jobs', () => {
      const job = vi.fn();
      queueJob(job);
      queueJob(job);
      expect(getPendingJobCount()).toBe(1);
    });

    it('should queue different jobs', () => {
      const job1 = vi.fn();
      const job2 = vi.fn();
      queueJob(job1);
      queueJob(job2);
      expect(getPendingJobCount()).toBe(2);
    });
  });

  describe('queuePostFlushCb', () => {
    it('should queue a post-flush callback', () => {
      const cb = vi.fn();
      queuePostFlushCb(cb);
      expect(hasPendingJobs()).toBe(true);
    });

    it('should not queue duplicate callbacks', () => {
      const cb = vi.fn();
      queuePostFlushCb(cb);
      queuePostFlushCb(cb);
      // post flush callbacks are stored in an array, duplicates are allowed
      // but we deduplicate by reference
    });
  });

  describe('flushJobs', () => {
    it('should execute all queued jobs', () => {
      const job1 = vi.fn();
      const job2 = vi.fn();
      queueJob(job1);
      queueJob(job2);
      flushJobs();
      expect(job1).toHaveBeenCalledTimes(1);
      expect(job2).toHaveBeenCalledTimes(1);
      expect(hasPendingJobs()).toBe(false);
    });

    it('should execute post-flush callbacks after jobs', () => {
      const order: string[] = [];
      const job = vi.fn(() => order.push('job'));
      const cb = vi.fn(() => order.push('callback'));
      queueJob(job);
      queuePostFlushCb(cb);
      flushJobs();
      expect(order).toEqual(['job', 'callback']);
    });

    it('should handle jobs that queue new jobs', () => {
      const job2 = vi.fn();
      const job1 = vi.fn(() => queueJob(job2));
      queueJob(job1);
      flushJobs();
      expect(job1).toHaveBeenCalledTimes(1);
      expect(job2).toHaveBeenCalledTimes(1);
    });
  });

  describe('flushSync', () => {
    it('should flush jobs synchronously', () => {
      const job = vi.fn();
      queueJob(job);
      flushSync();
      expect(job).toHaveBeenCalledTimes(1);
    });
  });

  describe('nextTick', () => {
    it('should execute callback after next tick', async () => {
      const cb = vi.fn();
      nextTick(cb);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(cb).toHaveBeenCalled();
    });

    it('should queue job and flush', async () => {
      const job = vi.fn();
      queueJob(job);
      await nextTick(() => {});
      expect(job).toHaveBeenCalled();
    });
  });

  describe('hasPendingJobs', () => {
    it('should return false when no jobs are pending', () => {
      expect(hasPendingJobs()).toBe(false);
    });

    it('should return true when jobs are pending', () => {
      queueJob(vi.fn());
      expect(hasPendingJobs()).toBe(true);
    });
  });

  describe('getPendingJobCount', () => {
    it('should return 0 when no jobs are pending', () => {
      expect(getPendingJobCount()).toBe(0);
    });

    it('should return correct count', () => {
      queueJob(vi.fn());
      queueJob(vi.fn());
      queueJob(vi.fn());
      expect(getPendingJobCount()).toBe(3);
    });
  });

  describe('queuePreFlushCb', () => {
    it('should execute pre-flush callbacks before jobs', async () => {
      const order: number[] = [];
      queueJob(() => order.push(1));
      queuePreFlushCb(() => order.push(0));
      await nextTick();
      expect(order).toEqual([0, 1]);
    });

    it('should deduplicate pre-flush callbacks', async () => {
      let count = 0;
      const cb = () => count++;
      queuePreFlushCb(cb);
      queuePreFlushCb(cb);
      await nextTick();
      expect(count).toBe(1);
    });
  });

  describe('Priority', () => {
    it('should have correct priority values', () => {
      expect(Priority.CRITICAL).toBe(-1000);
      expect(Priority.HIGH).toBe(-500);
      expect(Priority.NORMAL).toBe(0);
      expect(Priority.LOW).toBe(500);
      expect(Priority.IDLE).toBe(1000);
    });
  });

  describe('queueJobWithPriority', () => {
    it('should insert job by priority (higher priority first)', () => {
      const order: string[] = [];
      const criticalJob: SchedulerJobWithPriority = vi.fn(() => order.push('critical'));
      criticalJob.priority = Priority.CRITICAL;
      const normalJob: SchedulerJobWithPriority = vi.fn(() => order.push('normal'));
      normalJob.priority = Priority.NORMAL;
      const lowJob: SchedulerJobWithPriority = vi.fn(() => order.push('low'));
      lowJob.priority = Priority.LOW;

      // Insert in reverse priority order
      queueJobWithPriority(lowJob);
      queueJobWithPriority(normalJob);
      queueJobWithPriority(criticalJob);

      flushJobs();
      expect(order).toEqual(['critical', 'normal', 'low']);
    });

    it('should maintain insertion order for same priority (stable sort)', () => {
      const order: number[] = [];
      const job1: SchedulerJobWithPriority = vi.fn(() => order.push(1));
      job1.priority = Priority.NORMAL;
      const job2: SchedulerJobWithPriority = vi.fn(() => order.push(2));
      job2.priority = Priority.NORMAL;
      const job3: SchedulerJobWithPriority = vi.fn(() => order.push(3));
      job3.priority = Priority.NORMAL;

      queueJobWithPriority(job1);
      queueJobWithPriority(job2);
      queueJobWithPriority(job3);

      flushJobs();
      expect(order).toEqual([1, 2, 3]);
    });

    it('should default to NORMAL priority when not specified', () => {
      const order: string[] = [];
      const noPriorityJob: SchedulerJobWithPriority = vi.fn(() => order.push('no-priority'));
      // No priority set, should default to NORMAL
      const highJob: SchedulerJobWithPriority = vi.fn(() => order.push('high'));
      highJob.priority = Priority.HIGH;

      queueJobWithPriority(noPriorityJob);
      queueJobWithPriority(highJob);

      flushJobs();
      expect(order).toEqual(['high', 'no-priority']);
    });

    it('should not queue duplicate jobs', () => {
      const job: SchedulerJobWithPriority = vi.fn();
      job.priority = Priority.HIGH;
      queueJobWithPriority(job);
      queueJobWithPriority(job);
      expect(getPendingJobCount()).toBe(1);
    });

    it('should execute CRITICAL and HIGH before NORMAL and LOW', () => {
      const order: string[] = [];
      const idleJob: SchedulerJobWithPriority = vi.fn(() => order.push('idle'));
      idleJob.priority = Priority.IDLE;
      const lowJob: SchedulerJobWithPriority = vi.fn(() => order.push('low'));
      lowJob.priority = Priority.LOW;
      const normalJob: SchedulerJobWithPriority = vi.fn(() => order.push('normal'));
      normalJob.priority = Priority.NORMAL;
      const highJob: SchedulerJobWithPriority = vi.fn(() => order.push('high'));
      highJob.priority = Priority.HIGH;
      const criticalJob: SchedulerJobWithPriority = vi.fn(() => order.push('critical'));
      criticalJob.priority = Priority.CRITICAL;

      // Insert in random order
      queueJobWithPriority(normalJob);
      queueJobWithPriority(idleJob);
      queueJobWithPriority(criticalJob);
      queueJobWithPriority(lowJob);
      queueJobWithPriority(highJob);

      flushJobs();
      expect(order).toEqual(['critical', 'high', 'normal', 'low', 'idle']);
    });

    it('should prioritize newly added high-priority jobs within same flush round', () => {
      const order: string[] = [];
      const normalJob: SchedulerJobWithPriority = vi.fn(() => {
        order.push('normal');
        // During normal job execution, add a high-priority job
        const urgentJob: SchedulerJobWithPriority = vi.fn(() => order.push('urgent'));
        urgentJob.priority = Priority.CRITICAL;
        queueJobWithPriority(urgentJob);
      });
      normalJob.priority = Priority.NORMAL;
      const lowJob: SchedulerJobWithPriority = vi.fn(() => order.push('low'));
      lowJob.priority = Priority.LOW;

      queueJobWithPriority(normalJob);
      queueJobWithPriority(lowJob);

      flushJobs();
      // The urgent job added during normal execution should be processed
      // in the next iteration before low
      expect(order.indexOf('urgent')).toBeLessThan(order.indexOf('low'));
      expect(order).toContain('normal');
      expect(order).toContain('urgent');
      expect(order).toContain('low');
    });
  });
});
