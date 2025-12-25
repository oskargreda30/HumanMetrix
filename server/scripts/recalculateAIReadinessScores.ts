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

  // BALANCED Scoring matrix - each question-option maps to exactly 2 skills with 4 points each
  // Matches routes.ts calculateAIReadinessScores function exactly
  const scoringMatrix: Record<string, Record<string, number>> = {
    // Q1: Integrate AI-generated data with database
    "1-A": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    "1-B": { "Technical Fundamentals": 4, "Domain Expertise": 4 },
    "1-C": { "Responsible AI & Ethical Awareness": 4, "Critical Thinking & Problem-Solving": 4 },
    "1-D": { "Collaboration & Communication": 4, "Responsible AI & Ethical Awareness": 4 },
    "1-E": { "Creativity & Innovation": 4, "AI Literacy & Prompt Engineering": 4 },
    // Q2: Learn system from poor technical manual
    "2-A": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "2-B": { "Creativity & Innovation": 4, "Responsible AI & Ethical Awareness": 4 },
    "2-C": { "Domain Expertise": 4, "Technical Fundamentals": 4 },
    "2-D": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4 },
    "2-E": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4 },
    // Q3: Declining business metric - inconclusive data
    "3-A": { "Domain Expertise": 4, "Critical Thinking & Problem-Solving": 4 },
    "3-B": { "Data Fluency": 4, "Technical Fundamentals": 4 },
    "3-C": { "Creativity & Innovation": 4, "Critical Thinking & Problem-Solving": 4 },
    "3-D": { "Collaboration & Communication": 4, "AI Literacy & Prompt Engineering": 4 },
    "3-E": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4 },
    // Q4: New encryption protocol introduced
    "4-A": { "Data Fluency": 4, "Adaptability & Continuous Learning": 4 },
    "4-B": { "Collaboration & Communication": 4, "Technical Fundamentals": 4 },
    "4-C": { "Responsible AI & Ethical Awareness": 4, "Critical Thinking & Problem-Solving": 4 },
    "4-D": { "Domain Expertise": 4, "Responsible AI & Ethical Awareness": 4 },
    "4-E": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    // Q5: Proposing unusual technical solution
    "5-A": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4 },
    "5-B": { "Technical Fundamentals": 4, "Creativity & Innovation": 4 },
    "5-C": { "Collaboration & Communication": 4, "Responsible AI & Ethical Awareness": 4 },
    "5-D": { "Creativity & Innovation": 4, "Technical Fundamentals": 4 },
    "5-E": { "Adaptability & Continuous Learning": 4, "Domain Expertise": 4 },
    // Q6: Concern about AI model licensing
    "6-A": { "Responsible AI & Ethical Awareness": 4, "Adaptability & Continuous Learning": 4 },
    "6-B": { "AI Literacy & Prompt Engineering": 4, "Responsible AI & Ethical Awareness": 4 },
    "6-C": { "Collaboration & Communication": 4, "Technical Fundamentals": 4 },
    "6-D": { "Creativity & Innovation": 4, "Adaptability & Continuous Learning": 4 },
    "6-E": { "Data Fluency": 4, "Responsible AI & Ethical Awareness": 4 },
    // Q7: Tight deadline for industry trends report
    "7-A": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    "7-B": { "Domain Expertise": 4, "Critical Thinking & Problem-Solving": 4 },
    "7-C": { "Collaboration & Communication": 4, "Adaptability & Continuous Learning": 4 },
    "7-D": { "AI Literacy & Prompt Engineering": 4, "Responsible AI & Ethical Awareness": 4 },
    "7-E": { "Creativity & Innovation": 4, "Technical Fundamentals": 4 },
    // Q8: Automation requires skill you don't possess
    "8-A": { "Critical Thinking & Problem-Solving": 4, "Technical Fundamentals": 4 },
    "8-B": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4 },
    "8-C": { "Adaptability & Continuous Learning": 4, "Technical Fundamentals": 4 },
    "8-D": { "Data Fluency": 4, "Responsible AI & Ethical Awareness": 4 },
    "8-E": { "Collaboration & Communication": 4, "Domain Expertise": 4 },
    // Q9: Dataset with missing values and inconsistencies
    "9-A": { "Data Fluency": 4, "Technical Fundamentals": 4 },
    "9-B": { "Collaboration & Communication": 4, "Domain Expertise": 4 },
    "9-C": { "Adaptability & Continuous Learning": 4, "Responsible AI & Ethical Awareness": 4 },
    "9-D": { "Creativity & Innovation": 4, "Critical Thinking & Problem-Solving": 4 },
    "9-E": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    // Q10: AI suggests decision contradicting company values
    "10-A": { "Domain Expertise": 4, "Responsible AI & Ethical Awareness": 4 },
    "10-B": { "AI Literacy & Prompt Engineering": 4, "Responsible AI & Ethical Awareness": 4 },
    "10-C": { "Collaboration & Communication": 4, "Creativity & Innovation": 4 },
    "10-D": { "Creativity & Innovation": 4, "Critical Thinking & Problem-Solving": 4 },
    "10-E": { "Adaptability & Continuous Learning": 4, "Technical Fundamentals": 4 },
    // Q11: Team member struggling with technical constraints
    "11-A": { "Collaboration & Communication": 4, "AI Literacy & Prompt Engineering": 4 },
    "11-B": { "Adaptability & Continuous Learning": 4, "Domain Expertise": 4 },
    "11-C": { "AI Literacy & Prompt Engineering": 4, "Domain Expertise": 4 },
    "11-D": { "Creativity & Innovation": 4, "Critical Thinking & Problem-Solving": 4 },
    "11-E": { "Domain Expertise": 4, "Responsible AI & Ethical Awareness": 4 },
    // Q12: Design experiment with limited resources
    "12-A": { "Creativity & Innovation": 4, "Critical Thinking & Problem-Solving": 4 },
    "12-B": { "Data Fluency": 4, "Domain Expertise": 4 },
    "12-C": { "Adaptability & Continuous Learning": 4, "Data Fluency": 4 },
    "12-D": { "Collaboration & Communication": 4, "Adaptability & Continuous Learning": 4 },
    "12-E": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    // Q13: Technical system update preparation
    "13-A": { "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4 },
    "13-B": { "Collaboration & Communication": 4, "Adaptability & Continuous Learning": 4 },
    "13-C": { "Domain Expertise": 4, "Data Fluency": 4 },
    "13-D": { "Collaboration & Communication": 4, "AI Literacy & Prompt Engineering": 4 },
    "13-E": { "Creativity & Innovation": 4, "Critical Thinking & Problem-Solving": 4 },
    // Q14: Teach colleague complex analytics tool
    "14-A": { "Technical Fundamentals": 4, "Adaptability & Continuous Learning": 4 },
    "14-B": { "Collaboration & Communication": 4 },  // DE removed for perfect balance
    "14-C": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    "14-D": { "Critical Thinking & Problem-Solving": 4, "Adaptability & Continuous Learning": 4 },
    "14-E": { "Creativity & Innovation": 4, "Critical Thinking & Problem-Solving": 4 },
    // Q15: AI model trained on non-compliant data
    "15-A": { "Responsible AI & Ethical Awareness": 4, "Critical Thinking & Problem-Solving": 4 },
    "15-B": { "Responsible AI & Ethical Awareness": 4, "Adaptability & Continuous Learning": 4 },
    "15-C": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
    "15-D": { "Domain Expertise": 4, "Collaboration & Communication": 4 },
    "15-E": { "Collaboration & Communication": 4, "Technical Fundamentals": 4 },
    // Q16: Creative solution blocked by internal policy
    "16-A": { "Critical Thinking & Problem-Solving": 4, "Responsible AI & Ethical Awareness": 4 },
    "16-B": { "Creativity & Innovation": 4, "Domain Expertise": 4 },
    "16-C": { "Collaboration & Communication": 4, "Adaptability & Continuous Learning": 4 },
    "16-D": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4 },
    "16-E": { "Creativity & Innovation": 4, "Critical Thinking & Problem-Solving": 4 },
    // Q17: Review technical specification with tight deadline
    "17-A": { "Domain Expertise": 4 },  // DF removed for perfect balance
    "17-B": { "Technical Fundamentals": 4, "Responsible AI & Ethical Awareness": 4 },
    "17-C": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4 },
    "17-D": { "Collaboration & Communication": 4, "Responsible AI & Ethical Awareness": 4 },
    "17-E": { "Adaptability & Continuous Learning": 4, "Domain Expertise": 4 },
    // Q18: Team struggling with data visualisation
    "18-A": { "Adaptability & Continuous Learning": 4, "Data Fluency": 4 },
    "18-B": { "Creativity & Innovation": 4, "Data Fluency": 4 },
    "18-C": { "Collaboration & Communication": 4, "Critical Thinking & Problem-Solving": 4 },
    "18-D": { "AI Literacy & Prompt Engineering": 4 },  // TF removed for perfect balance
    "18-E": { "Technical Fundamentals": 4, "Domain Expertise": 4 },
    // Q19: Automate task with many exceptions
    "19-A": { "Critical Thinking & Problem-Solving": 4, "Technical Fundamentals": 4 },
    "19-B": { "Data Fluency": 4, "Responsible AI & Ethical Awareness": 4 },
    "19-C": { "AI Literacy & Prompt Engineering": 4, "Creativity & Innovation": 4 },
    "19-D": { "Collaboration & Communication": 4, "Domain Expertise": 4 },
    "19-E": { "Adaptability & Continuous Learning": 4, "Technical Fundamentals": 4 },
    // Q20: Colleague proposes obsolete technology
    "20-A": { "Domain Expertise": 4, "Responsible AI & Ethical Awareness": 4 },
    "20-B": { "Data Fluency": 4, "Technical Fundamentals": 4 },
    "20-C": { "Creativity & Innovation": 4, "AI Literacy & Prompt Engineering": 4 },
    "20-D": { "Adaptability & Continuous Learning": 4, "Responsible AI & Ethical Awareness": 4 },
    "20-E": { "Collaboration & Communication": 4, "Creativity & Innovation": 4 },
    // Q21: Write proposal for senior leadership
    "21-A": { "AI Literacy & Prompt Engineering": 4, "Collaboration & Communication": 4 },
    "21-B": { "Data Fluency": 4, "Critical Thinking & Problem-Solving": 4 },
    "21-C": { "Domain Expertise": 4, "Creativity & Innovation": 4 },
    "21-D": { "Adaptability & Continuous Learning": 4, "Technical Fundamentals": 4 },
    "21-E": { "Collaboration & Communication": 4, "Domain Expertise": 4 },
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
