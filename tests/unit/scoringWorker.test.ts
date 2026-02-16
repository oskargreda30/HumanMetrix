import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
    __mockCreate: mockCreate,
  };
});

vi.mock('../../server/ai-cost-tracker', () => ({
  logAiCost: vi.fn(),
  extractUsage: vi.fn().mockReturnValue({ promptTokens: 100, completionTokens: 50, totalTokens: 150 }),
  AI_USAGE_OPERATION_TYPES: {
    ASSESSMENT_SCORING_PROMPT: 'assessment_scoring_prompt',
  },
}));

vi.mock('../../server/email', () => ({
  notifyCriticalError: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../server/queues/jobQueue', () => {
  const mockEnqueue = vi.fn().mockResolvedValue('job_123');
  const mockGetJob = vi.fn();
  return {
    scoringQueue: {
      enqueue: mockEnqueue,
      getJob: mockGetJob,
      registerHandler: vi.fn(),
    },
    __mockEnqueue: mockEnqueue,
    __mockGetJob: mockGetJob,
  };
});

describe('Scoring Worker', () => {
  let handleScoringJob: any;
  let submitPromptScoringAsync: any;
  let getScoringJobStatus: any;
  let mockCreate: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const openaiModule = await import('openai');
    mockCreate = (openaiModule as any).__mockCreate;

    const mod = await import('../../server/queues/scoringWorker');
    handleScoringJob = mod.handleScoringJob;
    submitPromptScoringAsync = mod.submitPromptScoringAsync;
    getScoringJobStatus = mod.getScoringJobStatus;
  });

  describe('handleScoringJob', () => {
    it('processes prompt_scoring responses and returns scores', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ score: 85, feedback: 'Great prompt!' }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const result = await handleScoringJob({
        type: 'prompt_scoring',
        payload: {
          resultId: 1,
          responses: [
            {
              questionId: 101,
              difficulty: 'medium',
              prompt: 'Write a creative prompt',
              userResponse: 'Generate a story about a cat',
              model: 'gpt-4o',
            },
          ],
        },
      });

      expect(result.resultId).toBe(1);
      expect(result.scores).toHaveLength(1);
      expect(result.scores[0].questionId).toBe(101);
      expect(result.scores[0].score).toBe(85);
      expect(result.scores[0].feedback).toBe('Great prompt!');
    });

    it('handles scoring failures gracefully with score 0', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const result = await handleScoringJob({
        type: 'prompt_scoring',
        payload: {
          resultId: 2,
          responses: [
            {
              questionId: 201,
              difficulty: 'hard',
              prompt: 'Complex task',
              userResponse: 'My response',
            },
          ],
        },
      });

      expect(result.resultId).toBe(2);
      expect(result.scores).toHaveLength(1);
      expect(result.scores[0].questionId).toBe(201);
      expect(result.scores[0].score).toBe(0);
      expect(result.scores[0].feedback).toBe('Scoring failed - please contact support');
    });

    it('throws error for unknown job type', async () => {
      await expect(handleScoringJob({
        type: 'unknown_type' as any,
        payload: { resultId: 1, responses: [] },
      })).rejects.toThrow('Unknown scoring job type: unknown_type');
    });

    it('processes multiple responses', async () => {
      mockCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ score: 90, feedback: 'Excellent' }) } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ score: 70, feedback: 'Good' }) } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        });

      const result = await handleScoringJob({
        type: 'prompt_scoring',
        payload: {
          resultId: 3,
          responses: [
            { questionId: 301, difficulty: 'easy', prompt: 'Task 1', userResponse: 'Response 1' },
            { questionId: 302, difficulty: 'medium', prompt: 'Task 2', userResponse: 'Response 2' },
          ],
        },
      });

      expect(result.scores).toHaveLength(2);
      expect(result.scores[0].score).toBe(90);
      expect(result.scores[1].score).toBe(70);
    });

    it('clamps scores between 0 and 100', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ score: 150, feedback: 'Over max' }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const result = await handleScoringJob({
        type: 'prompt_scoring',
        payload: {
          resultId: 4,
          responses: [
            { questionId: 401, difficulty: 'easy', prompt: 'Task', userResponse: 'Response' },
          ],
        },
      });

      expect(result.scores[0].score).toBe(100);
    });
  });

  describe('submitPromptScoringAsync', () => {
    it('enqueues to scoring queue and returns job ID', async () => {
      const jobId = await submitPromptScoringAsync(1, [
        { questionId: 1, difficulty: 'easy', prompt: 'test', userResponse: 'response' },
      ]);

      expect(jobId).toBe('job_123');

      const { scoringQueue } = await import('../../server/queues/jobQueue');
      expect(scoringQueue.enqueue).toHaveBeenCalledWith('scoring', {
        type: 'prompt_scoring',
        payload: {
          resultId: 1,
          responses: [{ questionId: 1, difficulty: 'easy', prompt: 'test', userResponse: 'response' }],
        },
      });
    });
  });

  describe('getScoringJobStatus', () => {
    it('returns job status from scoring queue', async () => {
      const { scoringQueue } = await import('../../server/queues/jobQueue');
      const mockJob = { id: 'job_123', status: 'completed', result: { scores: [] } };
      (scoringQueue.getJob as any).mockReturnValue(mockJob);

      const result = getScoringJobStatus('job_123');
      expect(result).toEqual(mockJob);
      expect(scoringQueue.getJob).toHaveBeenCalledWith('job_123');
    });

    it('returns undefined for non-existent job', async () => {
      const { scoringQueue } = await import('../../server/queues/jobQueue');
      (scoringQueue.getJob as any).mockReturnValue(undefined);

      const result = getScoringJobStatus('non_existent');
      expect(result).toBeUndefined();
    });
  });
});
