type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  status: JobStatus;
  result?: any;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
}

type JobHandler<T = any> = (data: T) => Promise<any>;

class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private processing: Set<string> = new Set();
  private concurrency: number;
  private stats: QueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalProcessed: 0,
  };
  private isShuttingDown = false;
  private jobCounter = 0;

  constructor(concurrency = 3) {
    this.concurrency = concurrency;
    console.log(`🔧 Job queue initialized with concurrency: ${concurrency}`);
  }

  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
    console.log(`📋 Registered job handler: ${type}`);
  }

  async enqueue<T>(type: string, data: T, maxAttempts = 3): Promise<string> {
    if (this.isShuttingDown) {
      throw new Error('Queue is shutting down');
    }

    const id = `job_${Date.now()}_${++this.jobCounter}`;
    const job: Job<T> = {
      id,
      type,
      data,
      status: 'pending',
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
    };

    this.jobs.set(id, job);
    this.stats.pending++;

    console.log(`📥 Job queued: ${type} (${id})`);

    setImmediate(() => this.processNext());

    return id;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  getStats(): QueueStats {
    return { ...this.stats };
  }

  private async processNext(): Promise<void> {
    if (this.isShuttingDown) return;
    if (this.processing.size >= this.concurrency) return;

    const pendingJob = Array.from(this.jobs.values()).find(
      (job) => job.status === 'pending' && !this.processing.has(job.id)
    );

    if (!pendingJob) return;

    const handler = this.handlers.get(pendingJob.type);
    if (!handler) {
      console.error(`❌ No handler for job type: ${pendingJob.type}`);
      pendingJob.status = 'failed';
      pendingJob.error = `No handler registered for type: ${pendingJob.type}`;
      this.stats.pending--;
      this.stats.failed++;
      
      // Notify super admins of missing handler (critical configuration error)
      this.notifyJobFailure(pendingJob, new Error(`No handler registered for type: ${pendingJob.type}`));
      return;
    }

    this.processing.add(pendingJob.id);
    pendingJob.status = 'processing';
    pendingJob.startedAt = new Date();
    pendingJob.attempts++;
    this.stats.pending--;
    this.stats.processing++;

    console.log(`⚙️ Processing job: ${pendingJob.type} (${pendingJob.id}) - Attempt ${pendingJob.attempts}`);

    try {
      const result = await handler(pendingJob.data);
      pendingJob.status = 'completed';
      pendingJob.result = result;
      pendingJob.completedAt = new Date();
      this.stats.processing--;
      this.stats.completed++;
      this.stats.totalProcessed++;
      console.log(`✅ Job completed: ${pendingJob.type} (${pendingJob.id})`);
    } catch (error: any) {
      console.error(`❌ Job failed: ${pendingJob.type} (${pendingJob.id}):`, error.message);

      if (pendingJob.attempts < pendingJob.maxAttempts) {
        pendingJob.status = 'pending';
        this.stats.processing--;
        this.stats.pending++;
        console.log(`🔄 Retrying job: ${pendingJob.type} (${pendingJob.id}) - ${pendingJob.maxAttempts - pendingJob.attempts} attempts remaining`);

        const delay = Math.pow(2, pendingJob.attempts) * 1000;
        setTimeout(() => this.processNext(), delay);
      } else {
        pendingJob.status = 'failed';
        pendingJob.error = error.message;
        pendingJob.completedAt = new Date();
        this.stats.processing--;
        this.stats.failed++;
        this.stats.totalProcessed++;
        
        // Notify super admins of permanent job failure
        this.notifyJobFailure(pendingJob, error);
      }
    } finally {
      this.processing.delete(pendingJob.id);
    }

    setImmediate(() => this.processNext());
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down job queue...');
    this.isShuttingDown = true;

    while (this.processing.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('✅ Job queue shutdown complete');
  }

  private async notifyJobFailure(job: Job, error: any): Promise<void> {
    try {
      const { notifyCriticalError } = await import('../email');
      await notifyCriticalError({
        source: `Job Queue (${job.type})`,
        error: error,
        additionalContext: {
          jobId: job.id,
          jobType: job.type,
          attempts: job.attempts,
          maxAttempts: job.maxAttempts,
          createdAt: job.createdAt.toISOString(),
          failedAt: new Date().toISOString(),
        },
      });
    } catch (notifyError: any) {
      console.error('[Job Queue] Failed to send error notification:', notifyError.message);
    }
  }

  cleanup(maxAge = 3600000): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, job] of this.jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        now - job.completedAt.getTime() > maxAge
      ) {
        this.jobs.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old jobs`);
    }
  }
}

export const emailQueue = new JobQueue(2);
export const scoringQueue = new JobQueue(2);

setInterval(() => {
  emailQueue.cleanup();
  scoringQueue.cleanup();
}, 300000);

export { JobQueue, Job, JobStatus, QueueStats };
