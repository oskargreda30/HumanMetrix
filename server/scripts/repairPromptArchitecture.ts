/**
 * Repair Prompt Architecture Evaluations
 * 
 * This script fixes broken Prompt Architecture assessments where evaluations
 * were stored in JSONB but never inserted into the prompt_architecture_evaluations table.
 * 
 * Usage: tsx server/scripts/repairPromptArchitecture.ts [--result-id <id>]
 */

import { db } from "../db";
import { assessmentResults, promptArchitectureEvaluations } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function repairPromptArchitectureEvaluations(resultId?: string) {
  try {
    console.log("🔍 Finding broken Prompt Architecture assessments...\n");

    // Find all prompt_architecture assessments
    let query = db
      .select()
      .from(assessmentResults)
      .where(eq(assessmentResults.assessmentType, "prompt_architecture"));

    if (resultId) {
      query = query.where(eq(assessmentResults.id, resultId)) as any;
    }

    const results = await query;

    console.log(`Found ${results.length} Prompt Architecture assessment(s)\n`);

    let repairedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const result of results) {
      console.log(`\n📋 Processing result ${result.id}:`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Completed: ${result.completedAt?.toISOString() || 'N/A'}`);

      // Check if evaluations already exist in the table
      const existingEvals = await db
        .select()
        .from(promptArchitectureEvaluations)
        .where(eq(promptArchitectureEvaluations.resultId, result.id));

      if (existingEvals.length >= 7) {
        console.log(`   ✅ Already has ${existingEvals.length} evaluations in table - skipping`);
        skippedCount++;
        continue;
      }

      // Check if we have evaluations in JSONB
      const evaluationsData = result.evaluations as any[];
      
      if (!evaluationsData || !Array.isArray(evaluationsData) || evaluationsData.length === 0) {
        console.log(`   ⚠️  No evaluation data found in JSONB field`);
        
        // Check if we have answers to re-evaluate
        const answers = result.answers as Record<string, string>;
        if (!answers || Object.keys(answers).length === 0) {
          console.log(`   ❌ No answers found - cannot repair`);
          errorCount++;
          continue;
        }

        console.log(`   ⚠️  Has ${Object.keys(answers).length} answers but no evaluations`);
        console.log(`   💡 This assessment needs to be re-evaluated with GPT`);
        console.log(`   👉 Answers found: ${Object.keys(answers).join(', ')}`);
        errorCount++;
        continue;
      }

      console.log(`   📊 Found ${evaluationsData.length} evaluations in JSONB`);

      // Insert evaluations into the table
      // Note: evaluations have level:null due to a bug, so we need to infer from answers order
      const answers = result.answers as Record<string, string>;
      const answerKeys = Object.keys(answers).filter(k => k.startsWith('level')).sort();
      
      try {
        for (let i = 0; i < evaluationsData.length; i++) {
          const evalData = evaluationsData[i];
          const answerKey = answerKeys[i];
          
          // Extract level number from answer key (e.g., "level-1" -> 1)
          const levelMatch = answerKey?.match(/level-?(\d+)/);
          const level = levelMatch ? parseInt(levelMatch[1]) : i + 1;
          const userPrompt = answers[answerKey] || '';

          await db.insert(promptArchitectureEvaluations).values({
            resultId: result.id,
            level: level,
            userPrompt: userPrompt,
            aiResponse: null, // Not stored in original evaluations
            evaluationScores: {
              clarity: evalData.clarity || 0,
              structure: evalData.structure || 0,
              contextRelevance: evalData.contextRelevance || 0,
              creativity: evalData.creativity || 0,
              iterativeImprovement: evalData.iterativeImprovement || 0,
            },
            totalScore: evalData.totalScore || 0,
            feedback: evalData.feedback || '',
            status: 'completed',
            evaluatedAt: result.completedAt || new Date(),
          });

          console.log(`      ✓ Inserted Level ${level} evaluation`);
        }

        console.log(`   ✅ Successfully repaired ${evaluationsData.length} evaluations`);
        repairedCount++;
      } catch (error) {
        console.error(`   ❌ Error inserting evaluations:`, error);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Repair Summary:`);
    console.log(`   ✅ Repaired: ${repairedCount}`);
    console.log(`   ⏭️  Skipped (already OK): ${skippedCount}`);
    console.log(`   ❌ Errors/Need re-evaluation: ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);

    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} assessment(s) need GPT re-evaluation`);
      console.log(`   Run: tsx server/scripts/reEvaluatePromptArchitecture.ts\n`);
    }

  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Parse command line arguments
const args = process.argv.slice(2);
let resultId: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--result-id' && args[i + 1]) {
    resultId = args[i + 1];
    i++;
  }
}

repairPromptArchitectureEvaluations(resultId);
