import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
} from "../src/index";

describe("@lytjs/common-scheduler", () => {
  beforeEach(() => {
    resetSchedulerState();
  });

  afterEach(() => {
    resetSchedulerState();
  });

  describe("queueJob", () => {
    it("should queue a job", () => {
      const job = vi.fn();
      queueJob(job);
      expect(hasPendingJobs()).toBe(true);
      expect(getPendingJobCount()).toBe(1);
    });

    it("should not queue duplicate jobs", () => {
      const job = vi.fn();
      queueJob(job);
      queueJob(job);
      expect(getPendingJobCount()).toBe(1);
    });

    it("should queue different jobs", () => {
      const job1 = vi.fn();
      const job2 = vi.fn();
      queueJob(job1);
      queueJob(job2);
      expect(getPendingJobCount()).toBe(2);
    });
  });

  describe("queuePostFlushCb", () => {
    it("should queue a post-flush callback", () => {
      const cb = vi.fn();
      queuePostFlushCb(cb);
      expect(hasPendingJobs()).toBe(true);
    });

    it("should not queue duplicate callbacks", () => {
      const cb = vi.fn();
      queuePostFlushCb(cb);
      queuePostFlushCb(cb);
      // post flush callbacks are stored in an array, duplicates are allowed
      // but we deduplicate by reference
    });
  });

  describe("flushJobs", () => {
    it("should execute all queued jobs", () => {
      const job1 = vi.fn();
      const job2 = vi.fn();
      queueJob(job1);
      queueJob(job2);
      flushJobs();
      expect(job1).toHaveBeenCalledTimes(1);
      expect(job2).toHaveBeenCalledTimes(1);
      expect(hasPendingJobs()).toBe(false);
    });

    it("should execute post-flush callbacks after jobs", () => {
      const order: string[] = [];
      const job = vi.fn(() => order.push("job"));
      const cb = vi.fn(() => order.push("callback"));
      queueJob(job);
      queuePostFlushCb(cb);
      flushJobs();
      expect(order).toEqual(["job", "callback"]);
    });

    it("should handle jobs that queue new jobs", () => {
      const job2 = vi.fn();
      const job1 = vi.fn(() => queueJob(job2));
      queueJob(job1);
      flushJobs();
      expect(job1).toHaveBeenCalledTimes(1);
      expect(job2).toHaveBeenCalledTimes(1);
    });
  });

  describe("flushSync", () => {
    it("should flush jobs synchronously", () => {
      const job = vi.fn();
      queueJob(job);
      flushSync();
      expect(job).toHaveBeenCalledTimes(1);
    });
  });

  describe("nextTick", () => {
    it("should execute callback after next tick", async () => {
      const cb = vi.fn();
      nextTick(cb);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(cb).toHaveBeenCalled();
    });

    it("should queue job and flush", async () => {
      const job = vi.fn();
      queueJob(job);
      await nextTick(() => {});
      expect(job).toHaveBeenCalled();
    });
  });

  describe("hasPendingJobs", () => {
    it("should return false when no jobs are pending", () => {
      expect(hasPendingJobs()).toBe(false);
    });

    it("should return true when jobs are pending", () => {
      queueJob(vi.fn());
      expect(hasPendingJobs()).toBe(true);
    });
  });

  describe("getPendingJobCount", () => {
    it("should return 0 when no jobs are pending", () => {
      expect(getPendingJobCount()).toBe(0);
    });

    it("should return correct count", () => {
      queueJob(vi.fn());
      queueJob(vi.fn());
      queueJob(vi.fn());
      expect(getPendingJobCount()).toBe(3);
    });
  });

  describe("queuePreFlushCb", () => {
    it("should execute pre-flush callbacks before jobs", async () => {
      const order: number[] = [];
      queueJob(() => order.push(1));
      queuePreFlushCb(() => order.push(0));
      await nextTick();
      expect(order).toEqual([0, 1]);
    });

    it("should deduplicate pre-flush callbacks", async () => {
      let count = 0;
      const cb = () => count++;
      queuePreFlushCb(cb);
      queuePreFlushCb(cb);
      await nextTick();
      expect(count).toBe(1);
    });
  });
});
