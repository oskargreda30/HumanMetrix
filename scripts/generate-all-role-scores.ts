import { db } from "../server/db";
import { jobRoles } from "../shared/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateScoresForRole(role: any) {
  console.log(`Generating scores for: ${role.name}`);
  
  const prompt = `You are an AI assistant that generates required skill scores for job roles.

JOB ROLE: ${role.name}
${role.description ? `DESCRIPTION: ${role.description}\n` : ''}

Based on this role, determine:
1. The minimum required percentage scores (0-100) for each skill
2. The CRITICALITY of each skill for this role:
   - "critical": Must-have skills - gaps here are deal-breakers (typically 3-5 skills per role)
   - "standard": All other skills that are not critical

FIT ASSESSMENT SKILLS (Behavioral):
1. Resilience - Ability to bounce back from setbacks and maintain performance under pressure
2. High Agency - Taking initiative and ownership of outcomes
3. Growth Mindset - Embracing challenges and viewing failures as learning opportunities
4. Empathy & Ethics - Understanding others' perspectives and maintaining ethical standards
5. Interpersonal Agility - Navigating diverse relationships and adapting communication styles
6. Intellectual Curiosity - Seeking knowledge and exploring new ideas

AI READINESS SKILLS (Technical):
1. AI Literacy & Prompt Engineering - Understanding AI capabilities, limitations, terminology, and effective prompt engineering
2. Technical Fundamentals - Comfort with technical tools and systems
3. Data Fluency - Understanding and working with data
4. Critical Thinking & Problem-Solving - Evaluating AI outputs and making informed decisions
5. Adaptability & Continuous Learning - Quickly learning new AI tools and adapting to evolving technologies
6. Collaboration & Communication - Working effectively with AI systems and human teams
7. Responsible AI & Ethical Awareness - Understanding ethical implications and biases in AI applications
8. Creativity & Innovation - Using AI to generate novel solutions and approaches
9. Domain Expertise - Deep knowledge in a specific field combined with AI understanding

For each skill, provide a realistic required score (0-100). Typically, 3-5 skills should be marked as "critical" per role.

Format your response as JSON:
{
  "fitSkills": { "Resilience": number, "High Agency": number, "Growth Mindset": number, "Empathy & Ethics": number, "Interpersonal Agility": number, "Intellectual Curiosity": number },
  "aiReadinessSkills": { "AI Literacy & Prompt Engineering": number, "Technical Fundamentals": number, "Data Fluency": number, "Critical Thinking & Problem-Solving": number, "Adaptability & Continuous Learning": number, "Collaboration & Communication": number, "Responsible AI & Ethical Awareness": number, "Creativity & Innovation": number, "Domain Expertise": number },
  "skillCriticality": { 
    "Resilience": "critical" or "standard",
    "High Agency": "critical" or "standard",
    "Growth Mindset": "critical" or "standard",
    "Empathy & Ethics": "critical" or "standard",
    "Interpersonal Agility": "critical" or "standard",
    "Intellectual Curiosity": "critical" or "standard",
    "AI Literacy & Prompt Engineering": "critical" or "standard",
    "Technical Fundamentals": "critical" or "standard",
    "Data Fluency": "critical" or "standard",
    "Critical Thinking & Problem-Solving": "critical" or "standard",
    "Adaptability & Continuous Learning": "critical" or "standard",
    "Collaboration & Communication": "critical" or "standard",
    "Responsible AI & Ethical Awareness": "critical" or "standard",
    "Creativity & Innovation": "critical" or "standard",
    "Domain Expertise": "critical" or "standard"
  }
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const requiredScores = JSON.parse(completion.choices[0].message.content || "{}");
  requiredScores.generatedAt = new Date().toISOString();

  await db.update(jobRoles)
    .set({ requiredSkillScores: requiredScores })
    .where(eq(jobRoles.id, role.id));

  console.log(`  Completed: ${role.name}`);
  return requiredScores;
}

async function main() {
  console.log("Starting batch generation of role scores...\n");

  const allRoles = await db.select().from(jobRoles);
  
  const rolesNeedingGeneration = allRoles.filter(role => 
    !role.requiredSkillScores || 
    Object.keys(role.requiredSkillScores as object).length === 0 ||
    !(role.requiredSkillScores as any).skillCriticality ||
    Object.keys((role.requiredSkillScores as any).skillCriticality).length === 0
  );

  console.log(`Total roles: ${allRoles.length}`);
  console.log(`Roles needing generation: ${rolesNeedingGeneration.length}\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const role of rolesNeedingGeneration) {
    try {
      await generateScoresForRole(role);
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`  Error for ${role.name}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\nBatch generation complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  
  process.exit(0);
}

main().catch(console.error);
