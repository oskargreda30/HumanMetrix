import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../server/queues/jobQueue', () => {
  const mockEmailQueue = {
    registerHandler: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockReturnValue({
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalProcessed: 0,
    }),
  };

  const mockScoringQueue = {
    registerHandler: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockReturnValue({
      pending: 1,
      processing: 1,
      completed: 2,
      failed: 0,
      totalProcessed: 3,
    }),
  };

  return {
    emailQueue: mockEmailQueue,
    scoringQueue: mockScoringQueue,
  };
});

vi.mock('../../server/queues/emailWorker', () => ({
  handleEmailJob: vi.fn(),
  sendInvitationEmailAsync: vi.fn(),
  sendPasswordResetEmailAsync: vi.fn(),
  sendWelcomeEmailAsync: vi.fn(),
  sendPaymentReceiptEmailAsync: vi.fn(),
  sendContactFormEmailAsync: vi.fn(),
}));

vi.mock('../../server/queues/scoringWorker', () => ({
  handleScoringJob: vi.fn(),
  submitPromptScoringAsync: vi.fn(),
}));

describe('server/queues/index.ts', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('initializeJobQueues', () => {
    it('should initialize job queues and register handlers on both queues', async () => {
      const { initializeJobQueues } = await import('../../server/queues/index');
      const { emailQueue, scoringQueue } = await import('../../server/queues/jobQueue');
      const { handleEmailJob } = await import('../../server/queues/emailWorker');
      const { handleScoringJob } = await import('../../server/queues/scoringWorker');

      initializeJobQueues();

      expect(emailQueue.registerHandler).toHaveBeenCalledWith('email', handleEmailJob);
      expect(scoringQueue.registerHandler).toHaveBeenCalledWith('scoring', handleScoringJob);
    });

    it('should log initialization start and completion messages', async () => {
      const { initializeJobQueues } = await import('../../server/queues/index');

      initializeJobQueues();

      expect(consoleLogSpy).toHaveBeenCalledWith('🔧 Initializing job queues...');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Job queues initialized');
    });

    it('should register handlers in correct order', async () => {
      const { initializeJobQueues } = await import('../../server/queues/index');
      const { emailQueue, scoringQueue } = await import('../../server/queues/jobQueue');

      initializeJobQueues();

      const emailCallOrder = (emailQueue.registerHandler as any).mock.invocationCallOrder[0];
      const scoringCallOrder = (scoringQueue.registerHandler as any).mock.invocationCallOrder[0];

      expect(emailCallOrder).toBeLessThan(scoringCallOrder);
    });
  });

  describe('shutdownJobQueues', () => {
    it('should call shutdown on both queues', async () => {
      const { shutdownJobQueues } = await import('../../server/queues/index');
      const { emailQueue, scoringQueue } = await import('../../server/queues/jobQueue');

      await shutdownJobQueues();

      expect(emailQueue.shutdown).toHaveBeenCalled();
      expect(scoringQueue.shutdown).toHaveBeenCalled();
    });

    it('should log shutdown start and completion messages', async () => {
      const { shutdownJobQueues } = await import('../../server/queues/index');

      await shutdownJobQueues();

      expect(consoleLogSpy).toHaveBeenCalledWith('🛑 Shutting down job queues...');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Job queues shutdown complete');
    });

    it('should wait for both shutdowns to complete', async () => {
      const { shutdownJobQueues } = await import('../../server/queues/index');
      const { emailQueue, scoringQueue } = await import('../../server/queues/jobQueue');

      const emailShutdownPromise = Promise.resolve(undefined);
      const scoringShutdownPromise = Promise.resolve(undefined);

      (emailQueue.shutdown as any).mockReturnValue(emailShutdownPromise);
      (scoringQueue.shutdown as any).mockReturnValue(scoringShutdownPromise);

      await shutdownJobQueues();

      expect(emailQueue.shutdown).toHaveBeenCalled();
      expect(scoringQueue.shutdown).toHaveBeenCalled();
    });

    it('should be an async function', async () => {
      const { shutdownJobQueues } = await import('../../server/queues/index');
      const result = shutdownJobQueues();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });

  describe('getQueueStats', () => {
    it('should return stats from both queues', async () => {
      const { getQueueStats } = await import('../../server/queues/index');
      const { emailQueue, scoringQueue } = await import('../../server/queues/jobQueue');

      (emailQueue.getStats as any).mockReturnValue({
        pending: 0,
        processing: 0,
        completed: 5,
        failed: 0,
        totalProcessed: 5,
      });

      (scoringQueue.getStats as any).mockReturnValue({
        pending: 2,
        processing: 1,
        completed: 3,
        failed: 1,
        totalProcessed: 6,
      });

      const stats = getQueueStats();

      expect(stats).toHaveProperty('email');
      expect(stats).toHaveProperty('scoring');
    });

    it('should return email queue stats', async () => {
      const { getQueueStats } = await import('../../server/queues/index');
      const { emailQueue } = await import('../../server/queues/jobQueue');

      const mockEmailStats = {
        pending: 0,
        processing: 0,
        completed: 5,
        failed: 0,
        totalProcessed: 5,
      };

      (emailQueue.getStats as any).mockReturnValue(mockEmailStats);

      const stats = getQueueStats();

      expect(stats.email).toEqual(mockEmailStats);
    });

    it('should return scoring queue stats', async () => {
      const { getQueueStats } = await import('../../server/queues/index');
      const { scoringQueue } = await import('../../server/queues/jobQueue');

      const mockScoringStats = {
        pending: 2,
        processing: 1,
        completed: 3,
        failed: 1,
        totalProcessed: 6,
      };

      (scoringQueue.getStats as any).mockReturnValue(mockScoringStats);

      const stats = getQueueStats();

      expect(stats.scoring).toEqual(mockScoringStats);
    });

    it('should call getStats on both queues', async () => {
      const { getQueueStats } = await import('../../server/queues/index');
      const { emailQueue, scoringQueue } = await import('../../server/queues/jobQueue');

      getQueueStats();

      expect(emailQueue.getStats).toHaveBeenCalled();
      expect(scoringQueue.getStats).toHaveBeenCalled();
    });

    it('should return an object with the expected structure', async () => {
      const { getQueueStats } = await import('../../server/queues/index');

      const stats = getQueueStats();

      expect(typeof stats).toBe('object');
      expect(stats).not.toBeNull();
    });
  });

  describe('Re-exported queues', () => {
    it('should export emailQueue', async () => {
      const { emailQueue } = await import('../../server/queues/index');
      expect(emailQueue).toBeDefined();
    });

    it('should export scoringQueue', async () => {
      const { scoringQueue } = await import('../../server/queues/index');
      expect(scoringQueue).toBeDefined();
    });

    it('should export the same emailQueue instance as jobQueue', async () => {
      const { emailQueue: indexEmailQueue } = await import('../../server/queues/index');
      const { emailQueue: jobQueueEmailQueue } = await import('../../server/queues/jobQueue');

      expect(indexEmailQueue).toBe(jobQueueEmailQueue);
    });

    it('should export the same scoringQueue instance as jobQueue', async () => {
      const { scoringQueue: indexScoringQueue } = await import('../../server/queues/index');
      const { scoringQueue: jobQueueScoringQueue } = await import('../../server/queues/jobQueue');

      expect(indexScoringQueue).toBe(jobQueueScoringQueue);
    });
  });

  describe('Re-exported email worker functions', () => {
    it('should export sendInvitationEmailAsync', async () => {
      const { sendInvitationEmailAsync } = await import('../../server/queues/index');
      expect(sendInvitationEmailAsync).toBeDefined();
      expect(typeof sendInvitationEmailAsync).toBe('function');
    });

    it('should export sendPasswordResetEmailAsync', async () => {
      const { sendPasswordResetEmailAsync } = await import('../../server/queues/index');
      expect(sendPasswordResetEmailAsync).toBeDefined();
      expect(typeof sendPasswordResetEmailAsync).toBe('function');
    });

    it('should export sendWelcomeEmailAsync', async () => {
      const { sendWelcomeEmailAsync } = await import('../../server/queues/index');
      expect(sendWelcomeEmailAsync).toBeDefined();
      expect(typeof sendWelcomeEmailAsync).toBe('function');
    });

    it('should export sendPaymentReceiptEmailAsync', async () => {
      const { sendPaymentReceiptEmailAsync } = await import('../../server/queues/index');
      expect(sendPaymentReceiptEmailAsync).toBeDefined();
      expect(typeof sendPaymentReceiptEmailAsync).toBe('function');
    });

    it('should export sendContactFormEmailAsync', async () => {
      const { sendContactFormEmailAsync } = await import('../../server/queues/index');
      expect(sendContactFormEmailAsync).toBeDefined();
      expect(typeof sendContactFormEmailAsync).toBe('function');
    });

    it('should export the same sendInvitationEmailAsync as emailWorker', async () => {
      const { sendInvitationEmailAsync: indexFunc } = await import('../../server/queues/index');
      const { sendInvitationEmailAsync: workerFunc } = await import('../../server/queues/emailWorker');

      expect(indexFunc).toBe(workerFunc);
    });

    it('should export the same sendPasswordResetEmailAsync as emailWorker', async () => {
      const { sendPasswordResetEmailAsync: indexFunc } = await import('../../server/queues/index');
      const { sendPasswordResetEmailAsync: workerFunc } = await import('../../server/queues/emailWorker');

      expect(indexFunc).toBe(workerFunc);
    });

    it('should export the same sendWelcomeEmailAsync as emailWorker', async () => {
      const { sendWelcomeEmailAsync: indexFunc } = await import('../../server/queues/index');
      const { sendWelcomeEmailAsync: workerFunc } = await import('../../server/queues/emailWorker');

      expect(indexFunc).toBe(workerFunc);
    });

    it('should export the same sendPaymentReceiptEmailAsync as emailWorker', async () => {
      const { sendPaymentReceiptEmailAsync: indexFunc } = await import('../../server/queues/index');
      const { sendPaymentReceiptEmailAsync: workerFunc } = await import('../../server/queues/emailWorker');

      expect(indexFunc).toBe(workerFunc);
    });

    it('should export the same sendContactFormEmailAsync as emailWorker', async () => {
      const { sendContactFormEmailAsync: indexFunc } = await import('../../server/queues/index');
      const { sendContactFormEmailAsync: workerFunc } = await import('../../server/queues/emailWorker');

      expect(indexFunc).toBe(workerFunc);
    });
  });

  describe('Re-exported scoring worker functions', () => {
    it('should export submitPromptScoringAsync', async () => {
      const { submitPromptScoringAsync } = await import('../../server/queues/index');
      expect(submitPromptScoringAsync).toBeDefined();
      expect(typeof submitPromptScoringAsync).toBe('function');
    });

    it('should export the same submitPromptScoringAsync as scoringWorker', async () => {
      const { submitPromptScoringAsync: indexFunc } = await import('../../server/queues/index');
      const { submitPromptScoringAsync: workerFunc } = await import('../../server/queues/scoringWorker');

      expect(indexFunc).toBe(workerFunc);
    });
  });

  describe('Module exports coverage', () => {
    it('should have all required exports', async () => {
      const module = await import('../../server/queues/index');

      expect(module.initializeJobQueues).toBeDefined();
      expect(module.shutdownJobQueues).toBeDefined();
      expect(module.getQueueStats).toBeDefined();
      expect(module.emailQueue).toBeDefined();
      expect(module.scoringQueue).toBeDefined();
      expect(module.sendInvitationEmailAsync).toBeDefined();
      expect(module.sendPasswordResetEmailAsync).toBeDefined();
      expect(module.sendWelcomeEmailAsync).toBeDefined();
      expect(module.sendPaymentReceiptEmailAsync).toBeDefined();
      expect(module.sendContactFormEmailAsync).toBeDefined();
      expect(module.submitPromptScoringAsync).toBeDefined();
    });

    it('should maintain correct function types', async () => {
      const {
        initializeJobQueues,
        shutdownJobQueues,
        getQueueStats,
      } = await import('../../server/queues/index');

      expect(typeof initializeJobQueues).toBe('function');
      expect(typeof shutdownJobQueues).toBe('function');
      expect(typeof getQueueStats).toBe('function');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full lifecycle: initialize -> get stats -> shutdown', async () => {
      const {
        initializeJobQueues,
        getQueueStats,
        shutdownJobQueues,
      } = await import('../../server/queues/index');
      const { emailQueue, scoringQueue } = await import('../../server/queues/jobQueue');

      initializeJobQueues();
      expect(emailQueue.registerHandler).toHaveBeenCalled();

      const stats = getQueueStats();
      expect(stats).toHaveProperty('email');
      expect(stats).toHaveProperty('scoring');

      await shutdownJobQueues();
      expect(emailQueue.shutdown).toHaveBeenCalled();
      expect(scoringQueue.shutdown).toHaveBeenCalled();
    });

    it('should allow multiple calls to initializeJobQueues', async () => {
      const { initializeJobQueues } = await import('../../server/queues/index');
      const { emailQueue } = await import('../../server/queues/jobQueue');

      initializeJobQueues();
      initializeJobQueues();

      expect(emailQueue.registerHandler).toHaveBeenCalledTimes(2);
    });

    it('should allow multiple calls to getQueueStats', async () => {
      const { getQueueStats } = await import('../../server/queues/index');
      const { emailQueue } = await import('../../server/queues/jobQueue');

      getQueueStats();
      getQueueStats();
      getQueueStats();

      expect(emailQueue.getStats).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent queue operations', async () => {
      const { getQueueStats, shutdownJobQueues } = await import('../../server/queues/index');

      const statsPromise = Promise.resolve(getQueueStats());
      const shutdownPromise = shutdownJobQueues();

      const [stats] = await Promise.all([statsPromise, shutdownPromise]);

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('email');
      expect(stats).toHaveProperty('scoring');
    });
  });
});
