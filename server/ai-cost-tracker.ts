import { db } from "./db";
import { aiUsageCosts, AI_USAGE_OPERATION_TYPES, type AiUsageOperationType } from "@shared/schema";

// Model pricing in cents per 1M tokens (as of 2025)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-5": { input: 1500, output: 3000 }, // $15/1M input, $30/1M output
  "gpt-4o": { input: 250, output: 1000 }, // $2.50/1M input, $10/1M output
  "gpt-4o-mini": { input: 15, output: 60 }, // $0.15/1M input, $0.60/1M output
};

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface LogAiCostParams {
  operationType: AiUsageOperationType;
  model: string;
  usage: TokenUsage;
  userId?: string;
  assessmentResultId?: string;
  partnerId?: string;
  metadata?: {
    candidateEmail?: string;
    assessmentType?: string;
    roleTitle?: string;
    candidateCount?: number;
  };
}

function calculateCostCents(tokens: number, model: string, type: 'input' | 'output'): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4o"]; // Default to gpt-4o pricing
  const centsPerMillion = pricing[type];
  // Calculate cost: (tokens / 1,000,000) * centsPerMillion
  // We multiply by 100 to get hundredths of cents, then round to avoid floating point issues
  return Math.round((tokens * centsPerMillion) / 1000000);
}

export async function logAiCost(params: LogAiCostParams): Promise<void> {
  try {
    const { operationType, model, usage, userId, assessmentResultId, partnerId, metadata } = params;
    
    const inputCostCents = calculateCostCents(usage.prompt_tokens, model, 'input');
    const outputCostCents = calculateCostCents(usage.completion_tokens, model, 'output');
    const totalCostCents = inputCostCents + outputCostCents;

    await db.insert(aiUsageCosts).values({
      operationType,
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      inputCostCents,
      outputCostCents,
      totalCostCents,
      userId,
      assessmentResultId,
      partnerId,
      metadata,
    });

    console.log(`[AI Cost] Logged: ${operationType} using ${model} - ${usage.total_tokens} tokens, $${(totalCostCents / 100).toFixed(4)}`);
  } catch (error) {
    // Log error but don't throw - cost tracking should not break the main flow
    console.error("[AI Cost] Failed to log cost:", error);
  }
}

// Helper to extract usage from OpenAI completion response
export function extractUsage(completion: any): TokenUsage {
  return {
    prompt_tokens: completion.usage?.prompt_tokens || 0,
    completion_tokens: completion.usage?.completion_tokens || 0,
    total_tokens: completion.usage?.total_tokens || 0,
  };
}

export { AI_USAGE_OPERATION_TYPES };
