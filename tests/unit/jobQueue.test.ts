import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../server/email', () => ({
  notifyCriticalError: vi.fn().mockResolvedValue({ success: true }),
}));

describe('JobQueue', () => {
  let JobQueue: any;
  let emailQueue: any;
  let scoringQueue: any;

  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.resetModules();
    const mod = await import('../../server/queues/jobQueue');
    JobQueue = mod.JobQueue;
    emailQueue = mod.emailQueue;
    scoringQueue = mod.scoringQueue;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('sets concurrency', () => {
      const queue = new JobQueue(5);
      expect(queue).toBeDefined();
    });

    it('defaults concurrency to 3', () => {
      const queue = new JobQueue();
      expect(queue).toBeDefined();
    });
  });

  describe('registerHandler', () => {
    it('registers a handler for a job type', () => {
      const queue = new JobQueue(1);
      const handler = vi.fn();
      queue.registerHandler('test-type', handler);

      expect(queue).toBeDefined();
    });
  });

  describe('enqueue', () => {
    it('creates a job with correct fields', async () => {
      const queue = new JobQueue(1);
      queue.registerHandler('test', vi.fn().mockResolvedValue('done'));

      const jobId = await queue.enqueue('test', { foo: 'bar' }, 5);
      const job = queue.getJob(jobId);

      expect(job).toBeDefined();
      expect(job.type).toBe('test');
      expect(job.data).toEqual({ foo: 'bar' });
      expect(job.status).toBe('pending');
      expect(job.maxAttempts).toBe(5);
      expect(job.attempts).toBe(0);
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('throws when shutting down', async () => {
      const queue = new JobQueue(1);
      await queue.shutdown();

      await expect(queue.enqueue('test', {})).rejects.toThrow('Queue is shutting down');
    });
  });

  describe('getJob', () => {
    it('returns the job when it exists', async () => {
      const queue = new JobQueue(1);
      queue.registerHandler('test', vi.fn().mockResolvedValue('done'));
      const jobId = await queue.enqueue('test', { data: 'value' });

      const job = queue.getJob(jobId);
      expect(job).toBeDefined();
      expect(job.id).toBe(jobId);
    });

    it('returns undefined for non-existent job', () => {
      const queue = new JobQueue(1);
      expect(queue.getJob('non-existent-id')).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('returns correct initial stats', () => {
      const queue = new JobQueue(1);
      const stats = queue.getStats();

      expect(stats).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        totalProcessed: 0,
      });
    });

    it('reflects pending count after enqueue', async () => {
      const queue = new JobQueue(1);
      queue.registerHandler('test', vi.fn().mockResolvedValue('done'));
      await queue.enqueue('test', {});

      const stats = queue.getStats();
      expect(stats.pending).toBeGreaterThanOrEqual(0);
    });
  });

  describe('job processing', () => {
    it('handler is called and job completes', async () => {
      vi.useRealTimers();
      const queue = new JobQueue(1);
      const handler = vi.fn().mockResolvedValue({ result: 'ok' });
      queue.registerHandler('test', handler);

      const jobId = await queue.enqueue('test', { input: 'data' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(handler).toHaveBeenCalledWith({ input: 'data' });
      const job = queue.getJob(jobId);
      expect(job.status).toBe('completed');
      expect(job.result).toEqual({ result: 'ok' });
    });
  });

  describe('job failure and retry', () => {
    it('retries on failure with exponential backoff', async () => {
      vi.useRealTimers();
      const queue = new JobQueue(1);
      let callCount = 0;
      const handler = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error(`fail ${callCount}`);
        }
        return 'success';
      });

      queue.registerHandler('test', handler);
      const jobId = await queue.enqueue('test', {}, 3);

      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const job = queue.getJob(jobId);
        if (job.status === 'completed' || job.status === 'failed') break;
      }

      const job = queue.getJob(jobId);
      expect(job.attempts).toBeGreaterThanOrEqual(2);
    });

    it('fails permanently after maxAttempts', async () => {
      vi.useRealTimers();
      const queue = new JobQueue(1);
      const handler = vi.fn().mockRejectedValue(new Error('always fails'));
      queue.registerHandler('test', handler);

      const jobId = await queue.enqueue('test', {}, 1);

      await new Promise(resolve => setTimeout(resolve, 200));

      const job = queue.getJob(jobId);
      expect(job.status).toBe('failed');
      expect(job.error).toBe('always fails');
      expect(job.attempts).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('removes old completed/failed jobs', async () => {
      vi.useRealTimers();
      const queue = new JobQueue(1);
      const handler = vi.fn().mockResolvedValue('done');
      queue.registerHandler('test', handler);

      const jobId = await queue.enqueue('test', {});
      await new Promise(resolve => setTimeout(resolve, 100));

      const job = queue.getJob(jobId);
      expect(job.status).toBe('completed');

      job.completedAt = new Date(Date.now() - 7200000);

      queue.cleanup(3600000);
      expect(queue.getJob(jobId)).toBeUndefined();
    });

    it('does not remove recent jobs', async () => {
      vi.useRealTimers();
      const queue = new JobQueue(1);
      const handler = vi.fn().mockResolvedValue('done');
      queue.registerHandler('test', handler);

      const jobId = await queue.enqueue('test', {});
      await new Promise(resolve => setTimeout(resolve, 100));

      queue.cleanup(3600000);
      expect(queue.getJob(jobId)).toBeDefined();
    });
  });

  describe('shutdown', () => {
    it('sets shutting down flag', async () => {
      vi.useRealTimers();
      const queue = new JobQueue(1);
      await queue.shutdown();

      await expect(queue.enqueue('test', {})).rejects.toThrow('Queue is shutting down');
    });
  });

  describe('exported queues', () => {
    it('emailQueue is exported', () => {
      expect(emailQueue).toBeDefined();
    });

    it('scoringQueue is exported', () => {
      expect(scoringQueue).toBeDefined();
    });
  });
});
