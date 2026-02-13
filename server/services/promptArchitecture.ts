import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on non-retryable errors
      if (error.status === 401 || error.status === 400 || error.code === 'invalid_api_key') {
        throw error;
      }
      
      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[Prompt Eval] Retry attempt ${attempt + 1} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// Level descriptions for prompt architecture tasks
export const PA_LEVEL_DESCRIPTIONS: Record<string, string> = {
  "1": "Write a prompt to ask for the capital city of France and 3 interesting facts about it.",
  "2": "List the top 5 programming languages for web development in 2026, formatted as a numbered list with descriptions.",
  "3": "Explain quantum computing as a senior physics professor to undergraduate students.",
  "4": "Debug a Python function for finding duplicates with 4 steps: analyze, identify bug, explain, correct.",
  "5": "Generate a 100-word eco-friendly water bottle description with 3 benefits for millennials.",
  "6": "Draft, evaluate, and improve a job offer decline email.",
  "7": "Design a comprehensive content moderation system covering multiple domains.",
};

export interface PromptEvaluation {
  clarity: number;
  structure: number;
  contextRelevance: number;
  creativity: number;
  iterativeImprovement: number;
  feedback: string;
  totalScore: number;
}

export async function evaluatePromptWithGPT(
  userPrompt: string,
  level: number,
  taskDescription: string
): Promise<PromptEvaluation> {
  const evaluationPrompt = `You are an expert evaluator of AI prompts. Evaluate the following user-written prompt based on these criteria:

**Level ${level} Task**: ${taskDescription}

**User's Prompt**:
${userPrompt}

**Evaluation Criteria**:
1. **Clarity (20 points)**: Is the prompt clear, unambiguous, and easy to understand?
2. **Structure (20 points)**: Is the prompt well-organized with logical flow?
3. **Context Relevance (20 points)**: Does the prompt provide necessary context and constraints?
4. **Creativity (20 points)**: Does the prompt encourage thoughtful, creative responses?
5. **Iterative Improvement (20 points)**: Does the prompt include mechanisms for refinement or building upon concepts?

**Instructions**:
- Provide scores for each criterion (out of 20 points each)
- Be fair but rigorous in your evaluation
- Consider the difficulty level when scoring
- Provide constructive feedback

**Response Format** (MUST follow exactly):
{
  "clarity": <score out of 20>,
  "structure": <score out of 20>,
  "contextRelevance": <score out of 20>,
  "creativity": <score out of 20>,
  "iterativeImprovement": <score out of 20>,
  "feedback": "<brief constructive feedback>",
  "totalScore": <sum of all scores>
}`;

  try {
    console.log(`[Prompt Eval] Evaluating Level ${level} prompt (length: ${userPrompt.length} chars)`);
    
    // Retry OpenAI call with exponential backoff
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
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
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    console.log(`[Prompt Eval] Level ${level} evaluated successfully - Total: ${result.totalScore || 0}`);
    
    // Ensure all fields exist with fallback values
    return {
      clarity: result.clarity || 0,
      structure: result.structure || 0,
      contextRelevance: result.contextRelevance || 0,
      creativity: result.creativity || 0,
      iterativeImprovement: result.iterativeImprovement || 0,
      feedback: result.feedback || "Evaluation completed",
      totalScore: result.totalScore || 0,
    };
  } catch (error: any) {
    console.error(`[Prompt Eval ERROR] Level ${level} failed:`, {
      error: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
    });
    
    // Provide more specific error messages
    if (error.code === 'insufficient_quota' || error.status === 429) {
      throw new Error('OpenAI API quota exceeded');
    }
    if (error.code === 'invalid_api_key') {
      throw new Error('OpenAI API key is invalid');
    }
    if (error.message?.includes('timeout')) {
      throw new Error('OpenAI API request timed out');
    }
    
    throw new Error(`Failed to evaluate prompt: ${error.message || 'Unknown error'}`);
  }
}
