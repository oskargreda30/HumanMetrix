import { db } from '../server/db';
import { jobRoles } from '../shared/schema';
import OpenAI from 'openai';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function regenerateAllRoles() {
  console.log('Starting batch role regeneration...');
  
  const allRoles = await db.select().from(jobRoles);
  console.log(`Found ${allRoles.length} roles to regenerate`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const role of allRoles) {
    try {
      console.log(`\n[${successCount + errorCount + 1}/${allRoles.length}] Generating scores for: ${role.name}`);
      
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
1. AI Literacy & Prompt Engineering - Understanding AI capabilities, limitations, and effective prompting
2. Collaboration & Communication - Working effectively with AI systems and human teams
3. Data Fluency - Applying data knowledge within specific professional contexts
4. Responsible AI & Ethical Awareness - Understanding ethical implications and biases in AI applications
5. Domain Expertise - Deep knowledge in a specific field combined with AI understanding
6. Adaptability & Continuous Learning - Quickly learning new AI tools and adapting to evolving technologies
7. Critical Thinking & Problem-Solving - Evaluating AI outputs and making informed decisions
8. Technical Fundamentals - Comfort with technical tools and systems
9. Creativity & Innovation - Using AI to generate novel solutions and approaches

For each skill, provide a realistic required score (0-100). Consider:
- Entry-level roles: 45-58% for standard skills, 55-65% for critical skills
- Mid-level roles: 52-65% for standard skills, 62-72% for critical skills  
- Senior roles: 58-72% for standard skills, 68-78% for critical skills
- Executive roles: 65-78% for standard skills, 72-82% for critical skills
- Typically, 3-5 skills should be marked as "critical" per role

CRITICAL INSTRUCTION: You MUST use precise scores that are NOT multiples of 5. Do NOT use 50, 55, 60, 65, 70, 75, 80, 85, 90. Instead use exact values like 47, 53, 58, 63, 67, 71, 76, 78, 82. Each skill should have a unique, differentiated score.

Format your response as JSON:
{
  "fitSkills": { "Resilience": number, "High Agency": number, "Growth Mindset": number, "Empathy & Ethics": number, "Interpersonal Agility": number, "Intellectual Curiosity": number },
  "aiReadinessSkills": { "AI Literacy & Prompt Engineering": number, "Collaboration & Communication": number, "Data Fluency": number, "Responsible AI & Ethical Awareness": number, "Domain Expertise": number, "Adaptability & Continuous Learning": number, "Critical Thinking & Problem-Solving": number, "Technical Fundamentals": number, "Creativity & Innovation": number },
  "skillCriticality": { ... each skill as "critical" or "standard" ... },
  "promptArchitectureScore": number (0-100, required minimum for Prompt Architecture),
  "aiqScore": number (0-100, required minimum for AIQ)
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      let requiredScores = JSON.parse(responseText);
      
      // Nudge any multiples of 5
      const nudgeScore = (score: number): number => {
        if (typeof score !== 'number') return score;
        if (score % 5 === 0) {
          const nudge = Math.random() > 0.5 ? (Math.random() > 0.5 ? 1 : 2) : (Math.random() > 0.5 ? -1 : -2);
          return Math.max(1, Math.min(99, score + nudge));
        }
        return score;
      };
      
      if (requiredScores.fitSkills) {
        Object.keys(requiredScores.fitSkills).forEach(skill => {
          requiredScores.fitSkills[skill] = nudgeScore(requiredScores.fitSkills[skill]);
        });
      }
      if (requiredScores.aiReadinessSkills) {
        Object.keys(requiredScores.aiReadinessSkills).forEach(skill => {
          requiredScores.aiReadinessSkills[skill] = nudgeScore(requiredScores.aiReadinessSkills[skill]);
        });
      }
      
      // Ensure at least 3 critical skills
      if (requiredScores.skillCriticality) {
        const criticalCount = Object.values(requiredScores.skillCriticality).filter(v => v === 'critical').length;
        if (criticalCount < 3) {
          const allSkills: Array<{skill: string; score: number}> = [];
          if (requiredScores.fitSkills) {
            Object.entries(requiredScores.fitSkills).forEach(([skill, score]) => {
              allSkills.push({ skill, score: score as number });
            });
          }
          if (requiredScores.aiReadinessSkills) {
            Object.entries(requiredScores.aiReadinessSkills).forEach(([skill, score]) => {
              allSkills.push({ skill, score: score as number });
            });
          }
          allSkills.sort((a, b) => b.score - a.score);
          const toMarkCritical = allSkills.slice(0, Math.max(3, 5 - criticalCount));
          toMarkCritical.forEach(({ skill }) => {
            requiredScores.skillCriticality[skill] = 'critical';
          });
          console.log(`  Auto-marked ${toMarkCritical.length} skills as critical`);
        }
      }
      
      // Add generated timestamp
      requiredScores.generatedAt = new Date().toISOString();
      
      // Update the role
      await db.update(jobRoles)
        .set({ requiredSkillScores: requiredScores })
        .where(eq(jobRoles.id, role.id));
      
      successCount++;
      console.log(`  ✓ Completed: ${role.name}`);
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error: any) {
      errorCount++;
      console.error(`  ✗ Error for ${role.name}:`, error.message);
    }
  }
  
  console.log(`\n\nRegeneration complete!`);
  console.log(`Success: ${successCount}/${allRoles.length}`);
  console.log(`Errors: ${errorCount}/${allRoles.length}`);
  
  process.exit(0);
}

regenerateAllRoles().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
