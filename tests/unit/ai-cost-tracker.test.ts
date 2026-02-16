import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) });

vi.mock('../../server/db', () => ({
  db: {
    insert: (...args: any[]) => mockInsert(...args),
  },
}));

vi.mock('@shared/schema', () => ({
  aiUsageCosts: 'aiUsageCosts_table',
  AI_USAGE_OPERATION_TYPES: {
    REPORT_GENERATION: 'report_generation',
    CANDIDATE_EVALUATION: 'candidate_evaluation',
  },
}));

import { logAiCost, extractUsage } from '../../server/ai-cost-tracker';

describe('ai-cost-tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue({}) });
  });

  describe('extractUsage', () => {
    it('extracts token counts from OpenAI response', () => {
      const completion = {
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
        },
      };

      const result = extractUsage(completion);
      expect(result.prompt_tokens).toBe(100);
      expect(result.completion_tokens).toBe(200);
      expect(result.total_tokens).toBe(300);
    });

    it('handles missing usage data (returns zeros)', () => {
      const result = extractUsage({});
      expect(result.prompt_tokens).toBe(0);
      expect(result.completion_tokens).toBe(0);
      expect(result.total_tokens).toBe(0);
    });

    it('handles completion with no usage property', () => {
      const result = extractUsage({ id: 'test', choices: [] });
      expect(result.prompt_tokens).toBe(0);
      expect(result.completion_tokens).toBe(0);
      expect(result.total_tokens).toBe(0);
    });
  });

  describe('logAiCost', () => {
    it('inserts record into database', async () => {
      await logAiCost({
        operationType: 'report_generation' as any,
        model: 'gpt-4o',
        usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
      });

      expect(mockInsert).toHaveBeenCalledWith('aiUsageCosts_table');
      const valuesCall = mockInsert.mock.results[0].value.values;
      expect(valuesCall).toHaveBeenCalledTimes(1);
    });

    it('calculates costs correctly for gpt-4o', async () => {
      await logAiCost({
        operationType: 'report_generation' as any,
        model: 'gpt-4o',
        usage: { prompt_tokens: 1000000, completion_tokens: 1000000, total_tokens: 2000000 },
      });

      const valuesCall = mockInsert.mock.results[0].value.values;
      const record = valuesCall.mock.calls[0][0];
      expect(record.inputCostCents).toBe(250);
      expect(record.outputCostCents).toBe(1000);
      expect(record.totalCostCents).toBe(1250);
    });

    it('calculates costs correctly for gpt-5', async () => {
      await logAiCost({
        operationType: 'report_generation' as any,
        model: 'gpt-5',
        usage: { prompt_tokens: 1000000, completion_tokens: 1000000, total_tokens: 2000000 },
      });

      const valuesCall = mockInsert.mock.results[0].value.values;
      const record = valuesCall.mock.calls[0][0];
      expect(record.inputCostCents).toBe(1500);
      expect(record.outputCostCents).toBe(3000);
      expect(record.totalCostCents).toBe(4500);
    });

    it('defaults to gpt-4o pricing for unknown model', async () => {
      await logAiCost({
        operationType: 'report_generation' as any,
        model: 'unknown-model',
        usage: { prompt_tokens: 1000000, completion_tokens: 1000000, total_tokens: 2000000 },
      });

      const valuesCall = mockInsert.mock.results[0].value.values;
      const record = valuesCall.mock.calls[0][0];
      expect(record.inputCostCents).toBe(250);
      expect(record.outputCostCents).toBe(1000);
    });

    it('handles database errors gracefully (does not throw)', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      });

      await expect(
        logAiCost({
          operationType: 'report_generation' as any,
          model: 'gpt-4o',
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        })
      ).resolves.toBeUndefined();
    });

    it('calculates small token amounts correctly', async () => {
      await logAiCost({
        operationType: 'report_generation' as any,
        model: 'gpt-4o',
        usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
      });

      const valuesCall = mockInsert.mock.results[0].value.values;
      const record = valuesCall.mock.calls[0][0];
      expect(record.inputCostCents).toBe(0);
      expect(record.outputCostCents).toBe(1);
      expect(record.totalCostCents).toBe(1);
    });

    it('includes metadata in the record', async () => {
      await logAiCost({
        operationType: 'report_generation' as any,
        model: 'gpt-4o',
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        userId: 'user-1',
        partnerId: 'partner-1',
        metadata: { candidateEmail: 'test@example.com' },
      });

      const valuesCall = mockInsert.mock.results[0].value.values;
      const record = valuesCall.mock.calls[0][0];
      expect(record.userId).toBe('user-1');
      expect(record.partnerId).toBe('partner-1');
      expect(record.metadata).toEqual({ candidateEmail: 'test@example.com' });
    });
  });
});
