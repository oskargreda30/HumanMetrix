import OpenAI from "openai";
import { db } from "../../db";
import { jobRoles } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FIT_SKILLS = [
  "Resilience",
  "High Agency",
  "Growth Mindset",
  "Empathy & Ethics",
  "Interpersonal Agility",
  "Intellectual Curiosity",
];

const AI_READINESS_SKILLS = [
  "Data Fluency",
  "Domain Expertise",
  "Technical Fundamentals",
  "Creativity & Innovation",
  "Collaboration & Communication",
  "AI Literacy & Prompt Engineering",
  "Adaptability & Continuous Learning",
  "Responsible AI & Ethical Awareness",
  "Critical Thinking & Problem-Solving",
];

const ALL_SKILLS = [...FIT_SKILLS, ...AI_READINESS_SKILLS];

interface RoleScoreResult {
  roleName: string;
  seniority: "entry" | "mid" | "senior";
  fitSkills: Record<string, number>;
  aiReadinessSkills: Record<string, number>;
  skillCriticality: Record<string, "critical" | "standard">;
  promptArchitectureScore: number;
  aiqScore: number;
}

async function generateScoresForBatch(roleNames: string[]): Promise<RoleScoreResult[]> {
  const prompt = `You are an expert HR and talent assessment consultant. For each job role below, analyze what seniority level it belongs to, then generate required skill scores and identify the 6 most critical skills.

SENIORITY LEVELS AND SCORE RANGES:
- "entry": Junior roles, assistants, clerks, coordinators, entry-level specialists. Score range: 45-68
- "mid": Standard professional roles (analyst, engineer, manager, specialist without "senior"/"junior"). Score range: 55-78
- "senior": Senior individual contributors, directors, VPs, C-suite, architects, heads of departments. Score range: 65-92

SKILLS TO SCORE (15 total):
FIT Skills (6): ${FIT_SKILLS.join(", ")}
AI Readiness Skills (9): ${AI_READINESS_SKILLS.join(", ")}

INSTRUCTIONS:
1. Determine the seniority level for each role
2. For each of the 15 skills, assign a required score within the seniority's range
3. Scores should reflect what the role actually needs — not every skill should be the same score
4. Scores must be integers and should NOT be multiples of 5 (avoid 55, 60, 65, 70, 75, 80, 85, 90)
5. Select exactly 6 skills as "critical" (most important for the role) — the remaining 9 are "standard"
6. Also provide a promptArchitectureScore and aiqScore within the same seniority range

JOB ROLES TO ANALYZE:
${roleNames.map((name, i) => `${i + 1}. ${name}`).join("\n")}

Respond with a JSON array. Each element must have this exact structure:
{
  "roleName": "exact role name",
  "seniority": "entry" | "mid" | "senior",
  "fitSkills": { "Resilience": 67, "High Agency": 63, ... },
  "aiReadinessSkills": { "Data Fluency": 71, ... },
  "criticalSkills": ["skill1", "skill2", "skill3", "skill4", "skill5", "skill6"],
  "promptArchitectureScore": 66,
  "aiqScore": 68
}

IMPORTANT: Return ONLY a valid JSON array, no markdown code fences, no extra text.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 16000,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenAI");

  let cleanContent = content;
  if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(cleanContent) as Array<{
    roleName: string;
    seniority: "entry" | "mid" | "senior";
    fitSkills: Record<string, number>;
    aiReadinessSkills: Record<string, number>;
    criticalSkills: string[];
    promptArchitectureScore: number;
    aiqScore: number;
  }>;

  return parsed.map((item) => {
    const skillCriticality: Record<string, "critical" | "standard"> = {};
    const criticalSet = new Set(item.criticalSkills);

    for (const skill of ALL_SKILLS) {
      skillCriticality[skill] = criticalSet.has(skill) ? "critical" : "standard";
    }

    const criticalCount = Object.values(skillCriticality).filter(v => v === "critical").length;
    if (criticalCount !== 6) {
      console.warn(`  ⚠ ${item.roleName}: got ${criticalCount} critical skills instead of 6, fixing...`);
      const allScores: { skill: string; score: number }[] = [];
      for (const [skill, score] of Object.entries(item.fitSkills)) {
        allScores.push({ skill, score });
      }
      for (const [skill, score] of Object.entries(item.aiReadinessSkills)) {
        allScores.push({ skill, score });
      }
      allScores.sort((a, b) => b.score - a.score);
      for (const skill of ALL_SKILLS) {
        skillCriticality[skill] = "standard";
      }
      for (let i = 0; i < 6 && i < allScores.length; i++) {
        skillCriticality[allScores[i].skill] = "critical";
      }
    }

    return {
      roleName: item.roleName,
      seniority: item.seniority,
      fitSkills: item.fitSkills,
      aiReadinessSkills: item.aiReadinessSkills,
      skillCriticality,
      promptArchitectureScore: item.promptArchitectureScore,
      aiqScore: item.aiqScore,
    };
  });
}

function validateScores(result: RoleScoreResult): string[] {
  const errors: string[] = [];
  const ranges = { entry: [45, 68], mid: [55, 78], senior: [65, 92] };
  const [min, max] = ranges[result.seniority];

  const allScores = [
    ...Object.entries(result.fitSkills),
    ...Object.entries(result.aiReadinessSkills),
    ["promptArchitectureScore", result.promptArchitectureScore],
    ["aiqScore", result.aiqScore],
  ] as [string, number][];

  for (const [skill, score] of allScores) {
    if (typeof score !== "number" || isNaN(score)) {
      errors.push(`${skill}: not a valid number`);
    } else if (score < min - 3 || score > max + 3) {
      errors.push(`${skill}: ${score} outside range ${min}-${max} for ${result.seniority}`);
    }
  }

  const criticalCount = Object.values(result.skillCriticality).filter(v => v === "critical").length;
  if (criticalCount !== 6) {
    errors.push(`Expected 6 critical skills, got ${criticalCount}`);
  }

  if (Object.keys(result.fitSkills).length !== 6) {
    errors.push(`Expected 6 FIT skills, got ${Object.keys(result.fitSkills).length}`);
  }
  if (Object.keys(result.aiReadinessSkills).length !== 9) {
    errors.push(`Expected 9 AI Readiness skills, got ${Object.keys(result.aiReadinessSkills).length}`);
  }

  return errors;
}

async function main() {
  console.log("=== NEW Role Fit Score Generation ===");
  console.log("Using OpenAI to analyze all job roles and generate fresh skill requirements\n");

  const allRoles = await db.select({ id: jobRoles.id, name: jobRoles.name }).from(jobRoles).orderBy(jobRoles.name);
  console.log(`Found ${allRoles.length} roles in database\n`);

  const BATCH_SIZE = 15;
  const batches: typeof allRoles[] = [];
  for (let i = 0; i < allRoles.length; i += BATCH_SIZE) {
    batches.push(allRoles.slice(i, i + BATCH_SIZE));
  }

  const forceRegenerate = process.argv.includes("--force");
  const resumeMode = process.argv.includes("--resume");
  let doneNames = new Set<string>();
  if (!forceRegenerate) {
    const alreadyDone = await db.select({ id: jobRoles.id, name: jobRoles.name, rss: jobRoles.requiredSkillScores })
      .from(jobRoles).orderBy(jobRoles.name);
    doneNames = new Set(
      alreadyDone.filter(r => (r.rss as any)?.generatedBy === "NEWrolefitscores").map(r => r.name)
    );
    if (doneNames.size > 0) {
      console.log(`Skipping ${doneNames.size} roles already generated by NEWrolefitscores\n`);
    }
  } else if (resumeMode) {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const alreadyDone = await db.select({ id: jobRoles.id, name: jobRoles.name, rss: jobRoles.requiredSkillScores })
      .from(jobRoles).orderBy(jobRoles.name);
    doneNames = new Set(
      alreadyDone.filter(r => (r.rss as any)?.generatedAt > cutoff).map(r => r.name)
    );
    console.log(`Resume mode: skipping ${doneNames.size} roles regenerated in the last 30 minutes\n`);
  } else {
    console.log("Force regeneration enabled — all roles will be regenerated\n");
  }

  let successCount = 0;
  let errorCount = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const remaining = batch.filter(r => !doneNames.has(r.name));
    if (remaining.length === 0) {
      console.log(`\n--- Batch ${batchIdx + 1}/${batches.length}: all already done, skipping ---`);
      successCount += batch.length;
      continue;
    }
    console.log(`\n--- Batch ${batchIdx + 1}/${batches.length} (${remaining.length} roles) ---`);

    try {
      const roleNames = remaining.map(r => r.name);
      const results = await generateScoresForBatch(roleNames);

      for (const role of remaining) {
        const result = results.find(r => r.roleName === role.name);
        if (!result) {
          console.error(`  ✗ ${role.name}: not found in OpenAI response`);
          errorCount++;
          continue;
        }

        const validationErrors = validateScores(result);
        if (validationErrors.length > 0) {
          console.warn(`  ⚠ ${role.name}: validation warnings: ${validationErrors.join("; ")}`);
        }

        const requiredSkillScores = {
          fitSkills: result.fitSkills,
          aiReadinessSkills: result.aiReadinessSkills,
          skillCriticality: result.skillCriticality,
          promptArchitectureScore: result.promptArchitectureScore,
          aiqScore: result.aiqScore,
          generatedAt: new Date().toISOString(),
          generatedBy: "NEWrolefitscores",
        };

        await db.update(jobRoles)
          .set({ requiredSkillScores })
          .where(eq(jobRoles.id, role.id));

        console.log(`  ✓ ${role.name} (${result.seniority}) — saved`);
        successCount++;
      }
    } catch (err: any) {
      console.error(`  ✗ Batch ${batchIdx + 1} failed: ${err.message}`);
      errorCount += remaining.length;
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Errors: ${errorCount}`);
  console.log(`Total roles processed: ${allRoles.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
