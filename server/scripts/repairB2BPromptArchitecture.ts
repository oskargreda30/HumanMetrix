import { db } from "../db";
import { assessmentResults, promptArchitectureEvaluations } from "@shared/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { evaluatePromptWithGPT, PA_LEVEL_DESCRIPTIONS } from "../services/promptArchitecture";

async function repairB2BPromptArchitecture() {
  console.log("[Repair] Finding B2B PA results with no evaluations in dedicated table...");

  const results = await db
    .select({
      id: assessmentResults.id,
      answers: assessmentResults.answers,
      totalScore: assessmentResults.totalScore,
      evaluations: assessmentResults.evaluations,
      partnerInvitationId: assessmentResults.partnerInvitationId,
    })
    .from(assessmentResults)
    .where(
      and(
        eq(assessmentResults.assessmentType, "prompt_architecture"),
        eq(assessmentResults.status, "completed"),
        isNotNull(assessmentResults.partnerInvitationId),
        isNotNull(assessmentResults.answers)
      )
    );

  console.log(`[Repair] Found ${results.length} B2B PA results total`);

  for (const result of results) {
    const existingEvals = await db
      .select({ id: promptArchitectureEvaluations.id })
      .from(promptArchitectureEvaluations)
      .where(eq(promptArchitectureEvaluations.resultId, result.id));

    if (existingEvals.length > 0) {
      console.log(`[Repair] Skipping ${result.id} - already has ${existingEvals.length} evaluations`);
      continue;
    }

    const answers = result.answers as Record<string, any>;
    if (!answers || Object.keys(answers).length === 0) {
      console.log(`[Repair] Skipping ${result.id} - no answers stored`);
      continue;
    }

    console.log(`[Repair] Re-evaluating ${result.id} with ${Object.keys(answers).length} answers...`);

    let clarityTotal = 0;
    let structureTotal = 0;
    let contextTotal = 0;
    let creativityTotal = 0;
    let iterativeTotal = 0;
    let evalCount = 0;

    for (const [levelKey, userPrompt] of Object.entries(answers)) {
      if (!userPrompt || typeof userPrompt !== "string" || !userPrompt.trim()) continue;

      const levelMatch = levelKey.match(/level-?(\d+)/);
      const levelNum = levelMatch ? parseInt(levelMatch[1]) : null;
      if (!levelNum) continue;

      const taskDesc = PA_LEVEL_DESCRIPTIONS[levelNum.toString()] || `Level ${levelNum} task`;

      try {
        console.log(`  Level ${levelNum}: evaluating "${userPrompt.substring(0, 50)}..."`);
        const evaluation = await evaluatePromptWithGPT(userPrompt, levelNum, taskDesc);

        await db.insert(promptArchitectureEvaluations).values({
          resultId: result.id,
          level: levelNum,
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
          status: "completed",
          evaluatedAt: new Date(),
        });

        clarityTotal += evaluation.clarity;
        structureTotal += evaluation.structure;
        contextTotal += evaluation.contextRelevance;
        creativityTotal += evaluation.creativity;
        iterativeTotal += evaluation.iterativeImprovement;
        evalCount++;

        console.log(`  Level ${levelNum}: score=${evaluation.totalScore}/100`);
      } catch (error: any) {
        console.error(`  Level ${levelNum}: GPT evaluation failed - ${error.message}`);
      }
    }

    if (evalCount > 0) {
      const newScores = {
        Clarity: Math.round(clarityTotal / evalCount),
        Structure: Math.round(structureTotal / evalCount),
        "Context Relevance": Math.round(contextTotal / evalCount),
        Creativity: Math.round(creativityTotal / evalCount),
        "Iterative Improvement": Math.round(iterativeTotal / evalCount),
      };
      const newTotalScore = Math.round(
        (clarityTotal + structureTotal + contextTotal + creativityTotal + iterativeTotal) / evalCount
      );

      await db
        .update(assessmentResults)
        .set({
          scores: newScores,
          totalScore: newTotalScore,
        })
        .where(eq(assessmentResults.id, result.id));

      console.log(`[Repair] Updated ${result.id}: ${evalCount} levels evaluated, totalScore=${newTotalScore}`);
    } else {
      console.log(`[Repair] No levels could be evaluated for ${result.id}`);
    }
  }

  console.log("[Repair] Done!");
  process.exit(0);
}

repairB2BPromptArchitecture().catch((err) => {
  console.error("[Repair] Fatal error:", err);
  process.exit(1);
});
