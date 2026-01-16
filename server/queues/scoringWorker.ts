import { scoringQueue } from './jobQueue';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ScoringJobData {
  type: 'prompt_scoring';
  payload: {
    resultId: number;
    responses: Array<{
      questionId: number;
      difficulty: string;
      prompt: string;
      userResponse: string;
      model?: string;
    }>;
    callback?: (scores: any) => Promise<void>;
  };
}

export async function handleScoringJob(data: ScoringJobData): Promise<any> {
  switch (data.type) {
    case 'prompt_scoring':
      return processPromptScoring(data.payload);
    default:
      throw new Error(`Unknown scoring job type: ${data.type}`);
  }
}

async function processPromptScoring(payload: ScoringJobData['payload']): Promise<any> {
  const { resultId, responses } = payload;
  const scores: Array<{ questionId: number; score: number; feedback: string }> = [];
  const failedQuestions: number[] = [];
  
  console.log(`🤖 Starting prompt scoring for result ${resultId} with ${responses.length} responses`);
  
  for (const response of responses) {
    try {
      const score = await scorePromptResponse(
        response.prompt,
        response.userResponse,
        response.difficulty,
        response.model || 'gpt-4o'
      );
      scores.push({
        questionId: response.questionId,
        score: score.score,
        feedback: score.feedback,
      });
    } catch (error: any) {
      console.error(`❌ Failed to score question ${response.questionId}:`, error.message);
      scores.push({
        questionId: response.questionId,
        score: 0,
        feedback: 'Scoring failed - please contact support',
      });
      failedQuestions.push(response.questionId);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Send aggregated notification if any questions failed scoring
  if (failedQuestions.length > 0) {
    try {
      const { notifyCriticalError } = await import('../email');
      await notifyCriticalError({
        source: 'Scoring Worker',
        error: new Error(`Failed to score ${failedQuestions.length} of ${responses.length} questions`),
        additionalContext: {
          resultId,
          failedQuestionIds: failedQuestions.join(', '),
          totalQuestions: responses.length,
          failedCount: failedQuestions.length,
        },
      });
    } catch (notifyError: any) {
      console.error('[Scoring Worker] Failed to send error notification:', notifyError.message);
    }
  }
  
  console.log(`✅ Completed prompt scoring for result ${resultId}`);
  
  return { resultId, scores };
}

async function scorePromptResponse(
  prompt: string,
  userResponse: string,
  difficulty: string,
  model: string
): Promise<{ score: number; feedback: string }> {
  const systemPrompt = `You are an expert evaluator for AI prompt engineering skills. 
Your task is to evaluate the quality of a prompt written by a candidate.

Scoring criteria (0-100):
- Clarity and specificity (25 points): Is the prompt clear and specific?
- Effectiveness (25 points): Would this prompt likely produce good results from an AI?
- Creativity (25 points): Does the prompt show creative thinking?
- Technical understanding (25 points): Does it show understanding of AI capabilities/limitations?

Difficulty level: ${difficulty}
- For higher difficulty levels, expect more sophisticated prompts.

Respond in JSON format:
{
  "score": <number 0-100>,
  "feedback": "<brief constructive feedback>"
}`;

  const userMessage = `Original task/scenario: ${prompt}

Candidate's prompt response: ${userResponse}

Please evaluate this prompt and provide a score and feedback.`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 500,
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  
  return {
    score: Math.min(100, Math.max(0, result.score || 0)),
    feedback: result.feedback || 'No feedback provided',
  };
}

export async function submitPromptScoringAsync(
  resultId: number,
  responses: ScoringJobData['payload']['responses']
): Promise<string> {
  return scoringQueue.enqueue('scoring', {
    type: 'prompt_scoring',
    payload: { resultId, responses },
  });
}

export function getScoringJobStatus(jobId: string) {
  return scoringQueue.getJob(jobId);
}
