import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  return { mockCreate };
});

vi.mock('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
  },
}));

import { PA_LEVEL_DESCRIPTIONS, evaluatePromptWithGPT } from '../../server/services/promptArchitecture';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('PA_LEVEL_DESCRIPTIONS', () => {
  it('should have all 7 levels', () => {
    expect(Object.keys(PA_LEVEL_DESCRIPTIONS)).toHaveLength(7);
    for (let i = 1; i <= 7; i++) {
      expect(PA_LEVEL_DESCRIPTIONS[String(i)]).toBeDefined();
      expect(typeof PA_LEVEL_DESCRIPTIONS[String(i)]).toBe('string');
    }
  });
});

describe('evaluatePromptWithGPT', () => {
  const validResponse = {
    clarity: 18,
    structure: 16,
    contextRelevance: 15,
    creativity: 17,
    iterativeImprovement: 14,
    feedback: 'Good prompt',
    totalScore: 80,
  };

  it('should return a successful evaluation with all fields', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(validResponse) } }],
    });

    const result = await evaluatePromptWithGPT('test prompt', 1, 'test task');
    expect(result).toEqual(validResponse);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should fallback missing fields to 0', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ feedback: 'partial' }) } }],
    });

    const result = await evaluatePromptWithGPT('test prompt', 2, 'test task');
    expect(result.clarity).toBe(0);
    expect(result.structure).toBe(0);
    expect(result.contextRelevance).toBe(0);
    expect(result.creativity).toBe(0);
    expect(result.iterativeImprovement).toBe(0);
    expect(result.totalScore).toBe(0);
    expect(result.feedback).toBe('partial');
  });

  it('should fallback to "Evaluation completed" when feedback is missing', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{}' } }],
    });

    const result = await evaluatePromptWithGPT('test prompt', 3, 'test task');
    expect(result.feedback).toBe('Evaluation completed');
  });

  it('should fallback to empty object when content is null', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });

    const result = await evaluatePromptWithGPT('test prompt', 1, 'test task');
    expect(result.clarity).toBe(0);
    expect(result.feedback).toBe('Evaluation completed');
  });

  it('should throw "OpenAI API quota exceeded" on insufficient_quota error', async () => {
    const error: any = new Error('quota exceeded');
    error.code = 'insufficient_quota';
    error.status = 429;
    error.type = 'error';
    mockCreate.mockRejectedValue(error);

    await expect(evaluatePromptWithGPT('test', 1, 'task')).rejects.toThrow('OpenAI API quota exceeded');
  });

  it('should throw "OpenAI API key is invalid" on invalid_api_key error', async () => {
    const error: any = new Error('invalid key');
    error.code = 'invalid_api_key';
    error.status = 401;
    mockCreate.mockRejectedValue(error);

    await expect(evaluatePromptWithGPT('test', 1, 'task')).rejects.toThrow('OpenAI API key is invalid');
  });

  it('should throw "OpenAI API request timed out" on timeout error', async () => {
    const error: any = new Error('Connection timeout');
    error.code = 'ETIMEDOUT';
    mockCreate.mockRejectedValue(error);

    await expect(evaluatePromptWithGPT('test', 1, 'task')).rejects.toThrow('OpenAI API request timed out');
  });

  it('should throw generic error with message', async () => {
    const error: any = new Error('something broke');
    error.code = 'some_code';
    mockCreate.mockRejectedValue(error);

    await expect(evaluatePromptWithGPT('test', 1, 'task')).rejects.toThrow('Failed to evaluate prompt: something broke');
  });

  it('should throw generic error with "Unknown error" when message is absent', async () => {
    const error: any = { status: 500, code: 'server_error', type: 'error' };
    mockCreate.mockRejectedValue(error);

    await expect(evaluatePromptWithGPT('test', 1, 'task')).rejects.toThrow('Failed to evaluate prompt: Unknown error');
  });

  it('should retry on transient failures then succeed', async () => {
    const transientError: any = new Error('server error');
    transientError.status = 500;
    mockCreate
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(validResponse) } }],
      });

    const result = await evaluatePromptWithGPT('test prompt', 1, 'test task');
    expect(result).toEqual(validResponse);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it('should not retry on 401 error (non-retryable)', async () => {
    const error: any = new Error('unauthorized');
    error.status = 401;
    error.code = 'auth_error';
    mockCreate.mockRejectedValue(error);

    await expect(evaluatePromptWithGPT('test', 1, 'task')).rejects.toThrow();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should not retry on 400 error (non-retryable)', async () => {
    const error: any = new Error('bad request');
    error.status = 400;
    error.code = 'bad_request';
    mockCreate.mockRejectedValue(error);

    await expect(evaluatePromptWithGPT('test', 1, 'task')).rejects.toThrow();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should not retry on invalid_api_key code (non-retryable)', async () => {
    const error: any = new Error('invalid key');
    error.code = 'invalid_api_key';
    error.status = 200;
    mockCreate.mockRejectedValue(error);

    await expect(evaluatePromptWithGPT('test', 1, 'task')).rejects.toThrow();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should throw "OpenAI API quota exceeded" on status 429 without insufficient_quota code', async () => {
    const error: any = new Error('rate limited');
    error.status = 429;
    mockCreate.mockRejectedValue(error);

    await expect(evaluatePromptWithGPT('test', 1, 'task')).rejects.toThrow('OpenAI API quota exceeded');
  });

  it('should exhaust retries and throw the last error for transient failures', async () => {
    const transientError: any = new Error('server error');
    transientError.status = 500;
    mockCreate.mockRejectedValue(transientError);

    await expect(evaluatePromptWithGPT('test', 1, 'task')).rejects.toThrow('Failed to evaluate prompt: server error');
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});
