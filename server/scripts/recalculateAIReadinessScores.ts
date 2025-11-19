import { db } from "../db";
import { assessmentResults } from "../../shared/schema";
import { eq } from "drizzle-orm";

// Same scoring logic from routes.ts with relative scaling
function calculateAIReadinessScores(answers: Record<string, string>): Record<string, number> {
  const skills: Record<string, number> = {
    'AI Literacy & Prompt Engineering': 0,
    'Technical Fundamentals': 0,
    'Data Fluency': 0,
    'Critical Thinking & Problem-Solving': 0,
    'Adaptability & Continuous Learning': 0,
    'Collaboration & Communication': 0,
    'Responsible AI & Ethical Awareness': 0,
    'Creativity & Innovation': 0,
    'Domain Expertise': 0,
  };

  // Same scoring matrix as in routes.ts
  const scoringMatrix: Record<string, Record<string, number>> = {
    "1-A": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4, "Data Fluency": 4 },
    "1-B": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "1-C": { "Collaboration & Communication": 4, "Responsible AI & Ethical Awareness": 4 },
    "1-D": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4, "Domain Expertise": 4 },
    
    "2-A": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    "2-B": { "Technical Fundamentals": 4, "Critical Thinking & Problem-Solving": 4 },
    "2-C": { "Adaptability & Continuous Learning": 4, "Collaboration & Communication": 4, "Responsible AI & Ethical Awareness": 4 },
    "2-D": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4, "Domain Expertise": 4 },
    
    "3-A": { "Technical Fundamentals": 4, "Data Fluency": 4 },
    "3-B": { "AI Literacy & Prompt Engineering": 4, "Critical Thinking & Problem-Solving": 4, "Creativity & Innovation": 4 },
    "3-C": { "Adaptability & Continuous Learning": 4, "Responsible AI & Ethical Awareness": 4 },
    "3-D": { "Technical Fundamentals": 4, "Collaboration & Communication": 4, "Domain Expertise": 4 },
    
    "4-A": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4, "Data Fluency": 4 },
    "4-B": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "4-C": { "Technical Fundamentals": 4, "Responsible AI & Ethical Awareness": 4, "Creativity & Innovation": 4 },
    "4-D": { "AI Literacy & Prompt Engineering": 4, "Collaboration & Communication": 4, "Domain Expertise": 4 },
    
    "5-A": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4 },
    "5-B": { "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4, "Creativity & Innovation": 4 },
    "5-C": { "AI Literacy & Prompt Engineering": 4, "Collaboration & Communication": 4, "Responsible AI & Ethical Awareness": 4 },
    "5-D": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4, "Domain Expertise": 4 },
    
    "6-A": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4 },
    "6-B": { "Data Fluency": 4, "Adaptability & Continuous Learning": 4 },
    "6-C": { "Collaboration & Communication": 4, "Creativity & Innovation": 4 },
    "6-D": { "AI Literacy & Prompt Engineering": 4, "Critical Thinking & Problem-Solving": 4, "Responsible AI & Ethical Awareness": 4 },
    
    "7-A": { "Technical Fundamentals": 4, "Data Fluency": 4 },
    "7-B": { "AI Literacy & Prompt Engineering": 4, "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "7-C": { "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4, "Domain Expertise": 4 },
    "7-D": { "Collaboration & Communication": 4, "Domain Expertise": 4 },
    
    "8-A": { "AI Literacy & Prompt Engineering": 4, "Adaptability & Continuous Learning": 4, "Creativity & Innovation": 4 },
    "8-B": { "Technical Fundamentals": 4, "Collaboration & Communication": 4, "Responsible AI & Ethical Awareness": 4 },
    "8-C": { "AI Literacy & Prompt Engineering": 4, "Responsible AI & Ethical Awareness": 4 },
    "8-D": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4, "Domain Expertise": 4 },
    
    "9-A": { "Critical Thinking & Problem-Solving": 4, "Responsible AI & Ethical Awareness": 4 },
    "9-B": { "Technical Fundamentals": 4, "Collaboration & Communication": 4 },
    "9-C": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4 },
    "9-D": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4 },
    
    "10-A": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4 },
    "10-B": { "Data Fluency": 4, "Adaptability & Continuous Learning": 4 },
    "10-C": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "10-D": { "Critical Thinking & Problem-Solving": 4, "Collaboration & Communication": 4, "Domain Expertise": 4 },
    
    "11-A": { "AI Literacy & Prompt Engineering": 4, "Critical Thinking & Problem-Solving": 4, "Creativity & Innovation": 4 },
    "11-B": { "Technical Fundamentals": 4, "Collaboration & Communication": 4 },
    "11-C": { "AI Literacy & Prompt Engineering": 4, "Responsible AI & Ethical Awareness": 4 },
    "11-D": { "Data Fluency": 4, "Adaptability & Continuous Learning": 4, "Domain Expertise": 4 },
    
    "12-A": { "Critical Thinking & Problem-Solving": 4, "Collaboration & Communication": 4, "Creativity & Innovation": 4 },
    "12-B": { "AI Literacy & Prompt Engineering": 4, "Critical Thinking & Problem-Solving": 4, "Responsible AI & Ethical Awareness": 4 },
    "12-C": { "AI Literacy & Prompt Engineering": 4, "Adaptability & Continuous Learning": 4, "Creativity & Innovation": 4 },
    "12-D": { "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4, "Domain Expertise": 4 },
    
    "13-A": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4 },
    "13-B": { "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4 },
    "13-C": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "13-D": { "AI Literacy & Prompt Engineering": 4, "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    
    "14-A": { "Critical Thinking & Problem-Solving": 4, "Collaboration & Communication": 4, "Creativity & Innovation": 4 },
    "14-B": { "AI Literacy & Prompt Engineering": 4, "Responsible AI & Ethical Awareness": 4 },
    "14-C": { "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4, "Creativity & Innovation": 4 },
    "14-D": { "AI Literacy & Prompt Engineering": 4, "Collaboration & Communication": 4, "Domain Expertise": 4 },
    
    "15-A": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4 },
    "15-B": { "Technical Fundamentals": 4, "Critical Thinking & Problem-Solving": 4, "Creativity & Innovation": 4 },
    "15-C": { "Collaboration & Communication": 4, "Adaptability & Continuous Learning": 4 },
    "15-D": { "AI Literacy & Prompt Engineering": 4, "Critical Thinking & Problem-Solving": 4, "Domain Expertise": 4 },
  };

  // Calculate raw scores based on answers
  Object.entries(answers).forEach(([questionId, answer]) => {
    const key = `${questionId}-${answer}`;
    const skillPoints = scoringMatrix[key];
    
    if (skillPoints) {
      Object.entries(skillPoints).forEach(([skill, points]) => {
        skills[skill] += points;
      });
    }
  });

  // Calculate maximum possible scores for each skill
  const questionScores: Record<number, Record<string, Record<string, number>>> = {};
  
  Object.entries(scoringMatrix).forEach(([key, skillPoints]) => {
    const [questionNum] = key.split('-');
    const q = parseInt(questionNum);
    
    if (!questionScores[q]) {
      questionScores[q] = {};
    }
    questionScores[q][key] = skillPoints;
  });

  const maxScores: Record<string, number> = {
    'AI Literacy & Prompt Engineering': 0,
    'Technical Fundamentals': 0,
    'Data Fluency': 0,
    'Critical Thinking & Problem-Solving': 0,
    'Adaptability & Continuous Learning': 0,
    'Responsible AI & Ethical Awareness': 0,
    'Domain Expertise': 0,
    'Creativity & Innovation': 0,
    'Collaboration & Communication': 0,
  };

  Object.values(questionScores).forEach((options) => {
    const questionMaxScores: Record<string, number> = {
      'AI Literacy & Prompt Engineering': 0,
      'Technical Fundamentals': 0,
      'Data Fluency': 0,
      'Critical Thinking & Problem-Solving': 0,
      'Adaptability & Continuous Learning': 0,
      'Responsible AI & Ethical Awareness': 0,
      'Domain Expertise': 0,
      'Creativity & Innovation': 0,
      'Collaboration & Communication': 0,
    };

    Object.values(options).forEach((skillPoints) => {
      Object.entries(skillPoints).forEach(([skill, points]) => {
        questionMaxScores[skill] = Math.max(questionMaxScores[skill], points);
      });
    });

    Object.entries(questionMaxScores).forEach(([skill, points]) => {
      maxScores[skill] += points;
    });
  });

  // Normalize to 50-100 scale
  const normalizedScores: Record<string, number> = {};
  Object.entries(skills).forEach(([skill, score]) => {
    if (maxScores[skill] > 0) {
      const rawNormalized = (score / maxScores[skill]) * 100;
      // Scale to 50-100 range: 50 + (normalized * 0.5)
      normalizedScores[skill] = Math.round(50 + (rawNormalized * 0.5));
    } else {
      normalizedScores[skill] = 50; // Minimum score is 50
    }
  });

  return normalizedScores;
}

async function recalculateAllAIReadinessScores() {
  console.log('Starting AI Readiness score recalculation...');
  
  try {
    // Fetch all AI Readiness assessment results
    const results = await db
      .select()
      .from(assessmentResults)
      .where(eq(assessmentResults.assessmentType, 'ai_readiness'));
    
    console.log(`Found ${results.length} AI Readiness assessment results to recalculate`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const result of results) {
      if (!result.answers || Object.keys(result.answers).length === 0) {
        console.log(`Skipping result ${result.id} - no answers found`);
        skippedCount++;
        continue;
      }
      
      // Convert answers from "q1":"a" format to "1":"A" format
      const convertedAnswers: Record<string, string> = {};
      Object.entries(result.answers as Record<string, string>).forEach(([key, value]) => {
        // Remove 'q' prefix and convert to uppercase
        const questionNum = key.replace('q', '');
        convertedAnswers[questionNum] = value.toUpperCase();
      });
      
      // Recalculate scores with converted answers
      const newScores = calculateAIReadinessScores(convertedAnswers);
      
      // Update the result with new scores
      await db
        .update(assessmentResults)
        .set({
          scores: newScores,
          updatedAt: new Date(),
        })
        .where(eq(assessmentResults.id, result.id));
      
      console.log(`Updated result ${result.id}:`);
      console.log(`  Old scores:`, result.scores);
      console.log(`  New scores:`, newScores);
      
      updatedCount++;
    }
    
    console.log('\n=== Migration Complete ===');
    console.log(`Total results found: ${results.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped (no answers): ${skippedCount}`);
    
  } catch (error) {
    console.error('Error recalculating AI Readiness scores:', error);
    throw error;
  }
}

// Run the migration
recalculateAllAIReadinessScores()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
