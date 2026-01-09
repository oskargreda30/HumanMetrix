import { scoringQueue } from './jobQueue';
import OpenAI from 'openai';
import { db } from '../db';
import { assessmentResults, promptArchitectureEvaluations } from '@shared/schema';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ScoringJobData {
  type: 'prompt_scoring' | 'prompt_architecture_evaluation';
  payload: {
    resultId: string | number;
    responses?: Array<{
      questionId: number;
      difficulty: string;
      prompt: string;
      userResponse: string;
      model?: string;
    }>;
    answers?: Record<string, string>;
    callback?: (scores: any) => Promise<void>;
  };
}

export async function handleScoringJob(data: ScoringJobData): Promise<any> {
  switch (data.type) {
    case 'prompt_architecture_evaluation':
      return processPromptArchitectureEvaluation(data.payload);
    case 'prompt_scoring':
      return processPromptScoring(data.payload);
    default:
      throw new Error(`Unknown scoring job type: ${data.type}`);
  }
}

async function processPromptScoring(payload: ScoringJobData['payload']): Promise<any> {
  const { resultId, responses } = payload;
  const scores: Array<{ questionId: number; score: number; feedback: string }> = [];
  
  if (!responses || responses.length === 0) {
    throw new Error('No responses provided for prompt scoring');
  }
  
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
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
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

// Background evaluation for Prompt Architecture assessment
async function processPromptArchitectureEvaluation(payload: ScoringJobData['payload']): Promise<any> {
  const { resultId, answers } = payload;
  
  if (!answers) {
    throw new Error('No answers provided for Prompt Architecture evaluation');
  }
  
  console.log(`🤖 [Background] Starting Prompt Architecture evaluation for result ${resultId}`);
  
  const levelDescriptions: Record<string, string> = {
    "1": "Write a prompt to ask for the capital city of France and 3 interesting facts about it.",
    "2": "List the top 5 programming languages for web development in 2024, formatted as a numbered list with descriptions.",
    "3": "Explain quantum computing as a senior physics professor to undergraduate students.",
    "4": "Debug a Python function for finding duplicates with 4 steps: analyze, identify bug, explain, correct.",
    "5": "Generate a 100-word eco-friendly water bottle description with 3 benefits for millennials.",
    "6": "Draft, evaluate, and improve a job offer decline email.",
    "7": "Design a comprehensive content moderation system covering multiple domains.",
  };
  
  try {
    // Evaluate all prompts in parallel (much faster)
    const evaluationPromises = Object.entries(answers).map(async ([levelKey, userPrompt]) => {
      const levelMatch = levelKey.match(/level-?(\d+)/);
      const levelNum = levelMatch ? parseInt(levelMatch[1]) : 1;
      const taskDesc = levelDescriptions[levelNum.toString()] || `Level ${levelNum} task`;
      
      const evaluation = await evaluatePromptWithGPT(userPrompt, levelNum, taskDesc);
      return { level: levelNum, userPrompt, evaluation };
    });
    
    const evaluationsWithData = await Promise.all(evaluationPromises);
    evaluationsWithData.sort((a, b) => a.level - b.level);
    
    console.log(`🤖 [Background] All ${evaluationsWithData.length} prompts evaluated for result ${resultId}`);
    
    // Calculate totals
    let clarityTotal = 0, structureTotal = 0, contextTotal = 0, creativityTotal = 0, iterativeTotal = 0;
    
    for (const { evaluation } of evaluationsWithData) {
      clarityTotal += evaluation.clarity;
      structureTotal += evaluation.structure;
      contextTotal += evaluation.contextRelevance;
      creativityTotal += evaluation.creativity;
      iterativeTotal += evaluation.iterativeImprovement;
    }
    
    const numLevels = evaluationsWithData.length;
    const scores = {
      "Clarity": Math.round(clarityTotal / numLevels),
      "Structure": Math.round(structureTotal / numLevels),
      "Context Relevance": Math.round(contextTotal / numLevels),
      "Creativity": Math.round(creativityTotal / numLevels),
      "Iterative Improvement": Math.round(iterativeTotal / numLevels),
    };
    
    const totalScore = Math.round((clarityTotal + structureTotal + contextTotal + creativityTotal + iterativeTotal) / numLevels);
    
    const evaluations = evaluationsWithData.map(({ level, evaluation }) => ({
      level,
      ...evaluation,
    }));
    
    // Store evaluations and update result in a transaction
    await db.transaction(async (tx) => {
      // Delete any existing evaluations (idempotency)
      await tx.delete(promptArchitectureEvaluations)
        .where(eq(promptArchitectureEvaluations.resultId, String(resultId)));
      
      // Insert all evaluations
      for (const { level, userPrompt, evaluation } of evaluationsWithData) {
        await tx.insert(promptArchitectureEvaluations).values({
          resultId: String(resultId),
          level: level,
          userPrompt: userPrompt,
          aiResponse: null,
          evaluationScores: {
            clarity: evaluation.clarity,
            structure: evaluation.structure,
            contextRelevance: evaluation.contextRelevance,
            creativity: evaluation.creativity,
            iterativeImprovement: evaluation.iterativeImprovement,
          },
          totalScore: evaluation.totalScore,
          feedback: evaluation.feedback,
          status: 'completed',
          evaluatedAt: new Date(),
        });
      }
      
      // Update assessment result
      await tx.update(assessmentResults)
        .set({
          scores,
          totalScore,
          evaluations,
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(assessmentResults.id, String(resultId)));
    });
    
    console.log(`✅ [Background] Prompt Architecture evaluation completed for result ${resultId}`);
    
    return { resultId, scores, totalScore, evaluations };
  } catch (error: any) {
    console.error(`❌ [Background] Prompt Architecture evaluation failed for result ${resultId}:`, error.message);
    
    // Mark as failed
    await db.update(assessmentResults)
      .set({
        status: 'failed',
      })
      .where(eq(assessmentResults.id, String(resultId)));
    
    throw error;
  }
}

// Helper function to evaluate a single prompt with GPT-5
async function evaluatePromptWithGPT(
  userPrompt: string,
  level: number,
  taskDescription: string
): Promise<{
  clarity: number;
  structure: number;
  contextRelevance: number;
  creativity: number;
  iterativeImprovement: number;
  totalScore: number;
  feedback: string;
}> {
  const evaluationPrompt = `You are evaluating a prompt written by a candidate for an AI prompt engineering assessment.

TASK (Level ${level}): ${taskDescription}

CANDIDATE'S PROMPT:
"""
${userPrompt}
"""

Evaluate this prompt on the following criteria (score each from 0-100):
1. Clarity: How clear and unambiguous is the prompt?
2. Structure: How well-organized and formatted is the prompt?
3. Context Relevance: How well does the prompt address the task requirements?
4. Creativity: How creative and innovative is the approach?
5. Iterative Improvement: Does the prompt show sophisticated prompt engineering techniques?

Respond in JSON format:
{
  "clarity": <0-100>,
  "structure": <0-100>,
  "contextRelevance": <0-100>,
  "creativity": <0-100>,
  "iterativeImprovement": <0-100>,
  "feedback": "<2-3 sentence constructive feedback>"
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content: "You are an expert prompt engineering evaluator. Respond only with valid JSON matching the requested format.",
      },
      {
        role: "user",
        content: evaluationPrompt,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(completion.choices[0].message.content || '{}');
  
  const clarity = Math.min(100, Math.max(0, result.clarity || 0));
  const structure = Math.min(100, Math.max(0, result.structure || 0));
  const contextRelevance = Math.min(100, Math.max(0, result.contextRelevance || 0));
  const creativity = Math.min(100, Math.max(0, result.creativity || 0));
  const iterativeImprovement = Math.min(100, Math.max(0, result.iterativeImprovement || 0));
  
  const totalScore = Math.round((clarity + structure + contextRelevance + creativity + iterativeImprovement) / 5);
  
  return {
    clarity,
    structure,
    contextRelevance,
    creativity,
    iterativeImprovement,
    totalScore,
    feedback: result.feedback || 'No feedback provided',
  };
}

// Submit Prompt Architecture evaluation to background queue
export async function submitPromptArchitectureEvaluationAsync(
  resultId: string,
  answers: Record<string, string>
): Promise<string> {
  return scoringQueue.enqueue('scoring', {
    type: 'prompt_architecture_evaluation',
    payload: { resultId, answers },
  });
}
