/**
 * Shared Scoring Module
 * 
 * This module contains the authoritative scoring matrices and formulas for all assessments.
 * Both routes.ts and recalculation scripts import from here to ensure consistency.
 * 
 * HYBRID SCORING FORMULA (LOCKED):
 * - Floor = 50 + (minRawPct/100)^0.5 × 10
 * - Ceiling = 50 + (maxRawPct/100)^0.25 × 50
 * - Final Score = floor + (relativePosition × scoreRange)
 */

// ============================================================================
// FIT ASSESSMENT - PERFECTLY BALANCED SCORING MATRIX
// 6 skills × 15 occurrences each = 90 total mappings
// Each skill has 60 max points (15 × 4 points each)
// ============================================================================

export const FIT_SKILLS = [
  'High Agency',
  'Intellectual Curiosity', 
  'Resilience',
  'Empathy & Ethics',
  'Growth Mindset',
  'Interpersonal Agility',
] as const;

export type FITSkill = typeof FIT_SKILLS[number];

export const FIT_SCORING_MATRIX: Record<string, Record<string, number>> = {
  // Q1: Dinner party - missing ingredient
  "1-A": { "High Agency": 4, "Resilience": 4 },
  "1-B": { "Intellectual Curiosity": 4 },
  "1-C": { "Growth Mindset": 4 },
  "1-D": { "Interpersonal Agility": 4, "Empathy & Ethics": 4 },
  
  // Q2: Friend failed driving test (third time)
  "2-A": { "High Agency": 4 },
  "2-B": { "Resilience": 4, "Growth Mindset": 4 },
  "2-C": { "Empathy & Ethics": 4, "Intellectual Curiosity": 4 },
  "2-D": { "Interpersonal Agility": 4 },
  
  // Q3: Antique furniture repair (unfamiliar language)
  "3-A": { "Intellectual Curiosity": 4 },
  "3-B": { "Resilience": 4 },
  "3-C": { "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
  "3-D": { "Growth Mindset": 4, "High Agency": 4 },
  
  // Q4: Vacation deposit conflict
  "4-A": { "High Agency": 4, "Resilience": 4 },
  "4-B": { "Intellectual Curiosity": 4 },
  "4-C": { "Empathy & Ethics": 4 },
  "4-D": { "Interpersonal Agility": 4, "Growth Mindset": 4 },
  
  // Q5: Helping elderly at bus stop
  "5-A": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4 },
  "5-B": { "Resilience": 4 },
  "5-C": { "High Agency": 4, "Growth Mindset": 4 },
  "5-D": { "Interpersonal Agility": 4 },
  
  // Q6: Blog critique - hateful reader comment
  "6-A": { "High Agency": 4, "Intellectual Curiosity": 4 },
  "6-B": { "Growth Mindset": 4 },
  "6-C": { "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
  "6-D": { "Resilience": 4 },
  
  // Q7: Friend asks to co-sign risky loan
  "7-A": { "Intellectual Curiosity": 4 },
  "7-B": { "High Agency": 4, "Resilience": 4 },
  "7-C": { "Growth Mindset": 4, "Interpersonal Agility": 4 },
  "7-D": { "Empathy & Ethics": 4 },
  
  // Q8: Volunteer group election bias
  "8-A": { "High Agency": 4, "Interpersonal Agility": 4 },
  "8-B": { "Intellectual Curiosity": 4 },
  "8-C": { "Empathy & Ethics": 4 },
  "8-D": { "Growth Mindset": 4, "Resilience": 4 },
  
  // Q9: Concert heckler situation
  "9-A": { "Resilience": 4 },
  "9-B": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4 },
  "9-C": { "Interpersonal Agility": 4 },
  "9-D": { "High Agency": 4, "Growth Mindset": 4 },
  
  // Q10: Sudden roof repair emergency
  "10-A": { "High Agency": 4, "Resilience": 4 },
  "10-B": { "Intellectual Curiosity": 4 },
  "10-C": { "Growth Mindset": 4 },
  "10-D": { "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
  
  // Q11: Friend excluded by group joke
  "11-A": { "High Agency": 4 },
  "11-B": { "Intellectual Curiosity": 4 },
  "11-C": { "Empathy & Ethics": 4, "Resilience": 4 },
  "11-D": { "Interpersonal Agility": 4, "Growth Mindset": 4 },
  
  // Q12: Complex family reunion planning
  "12-A": { "Intellectual Curiosity": 4, "Resilience": 4 },
  "12-B": { "High Agency": 4 },
  "12-C": { "Growth Mindset": 4, "Empathy & Ethics": 4 },
  "12-D": { "Interpersonal Agility": 4 },
  
  // Q13: Stuck on difficult personal challenge
  "13-A": { "High Agency": 4, "Interpersonal Agility": 4 },
  "13-B": { "Intellectual Curiosity": 4 },
  "13-C": { "Resilience": 4, "Empathy & Ethics": 4 },
  "13-D": { "Growth Mindset": 4 },
  
  // Q14: Harsh online criticism from public figure
  "14-A": { "Resilience": 4, "Intellectual Curiosity": 4 },
  "14-B": { "Empathy & Ethics": 4 },
  "14-C": { "Growth Mindset": 4, "High Agency": 4 },
  "14-D": { "Interpersonal Agility": 4 },
  
  // Q15: Household budget with conflicting opinions
  "15-A": { "High Agency": 4, "Growth Mindset": 4 },
  "15-B": { "Intellectual Curiosity": 4, "Interpersonal Agility": 4 },
  "15-C": { "Empathy & Ethics": 4 },
  "15-D": { "Resilience": 4 },
};

// ============================================================================
// AI READINESS ASSESSMENT - SCORING MATRIX (INTENTIONALLY UNBALANCED)
// Skill occurrences vary by design: TF=26, DF=25, AL/PE/CT-PS/CC/CI/ACL=23, RAI/DE=22
// Total: 210 mappings. Max points vary: TF=104, DF=100, others 88-92
// ============================================================================

export const AI_READINESS_SKILLS = [
  'AI Literacy & Prompt Engineering',
  'Technical Fundamentals',
  'Data Fluency',
  'Critical Thinking & Problem-Solving',
  'Adaptability & Continuous Learning',
  'Collaboration & Communication',
  'Responsible AI & Ethical Awareness',
  'Creativity & Innovation',
  'Domain Expertise',
] as const;

export type AIReadinessSkill = typeof AI_READINESS_SKILLS[number];

export const AI_READINESS_SCORING_MATRIX: Record<string, Record<string, number>> = {
  // Q1: Integrate AI-generated data with database
  "1-A": { "AI Literacy & Prompt Engineering": 4, "Data Fluency": 4 },
  "1-B": { "Technical Fundamentals": 4, "Critical Thinking & Problem-Solving": 4 },
  "1-C": { "Responsible AI & Ethical Awareness": 4, "Data Fluency": 4 },
  "1-D": { "Collaboration & Communication": 4, "Technical Fundamentals": 4 },
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
  "11-C": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4 },
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
  "14-B": { "Collaboration & Communication": 4, "Domain Expertise": 4 },
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
  "17-A": { "Domain Expertise": 4, "Data Fluency": 4 },
  "17-B": { "Technical Fundamentals": 4, "Responsible AI & Ethical Awareness": 4 },
  "17-C": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4 },
  "17-D": { "Collaboration & Communication": 4, "Responsible AI & Ethical Awareness": 4 },
  "17-E": { "Adaptability & Continuous Learning": 4, "Domain Expertise": 4 },
  // Q18: Team struggling with data visualisation
  "18-A": { "Adaptability & Continuous Learning": 4, "Data Fluency": 4 },
  "18-B": { "Creativity & Innovation": 4, "Data Fluency": 4 },
  "18-C": { "Collaboration & Communication": 4, "Critical Thinking & Problem-Solving": 4 },
  "18-D": { "AI Literacy & Prompt Engineering": 4, "Technical Fundamentals": 4 },
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

// ============================================================================
// HYBRID SCORING FUNCTION
// Applies dynamic floor/ceiling normalization
// ============================================================================

export function applyHybridScoring(rawPercentages: Record<string, number>): Record<string, number> {
  const percentageValues = Object.values(rawPercentages);
  const minPct = Math.min(...percentageValues);
  const maxPct = Math.max(...percentageValues);
  const pctRange = maxPct - minPct;

  // Floor Formula: floor = 50 + (minRawPct / 100)^0.5 × 10
  // Ceiling Formula: ceiling = 50 + (maxRawPct / 100)^0.25 × 50
  const floor = 50 + Math.pow(minPct / 100, 0.5) * 10;
  const ceiling = 50 + Math.pow(maxPct / 100, 0.25) * 50;
  const scoreRange = ceiling - floor;

  const normalizedScores: Record<string, number> = {};

  Object.entries(rawPercentages).forEach(([skill, rawPct]) => {
    if (pctRange > 0) {
      const relativePosition = (rawPct - minPct) / pctRange; // 0 to 1
      normalizedScores[skill] = Math.round(floor + relativePosition * scoreRange);
    } else {
      // All skills have same raw score - use midpoint between floor and ceiling
      normalizedScores[skill] = Math.round((floor + ceiling) / 2);
    }
  });

  return normalizedScores;
}

// ============================================================================
// FIT SCORE CALCULATION
// ============================================================================

export function calculateFITScores(answers: Record<string, string>): Record<string, number> {
  const rawScores: Record<string, number> = {
    'High Agency': 0,
    'Intellectual Curiosity': 0,
    'Resilience': 0,
    'Empathy & Ethics': 0,
    'Growth Mindset': 0,
    'Interpersonal Agility': 0,
  };

  // Calculate raw scores based on answers
  // Normalize answer format: "q1": "a" -> "1-A" for matrix lookup
  let matchedCount = 0;
  Object.entries(answers).forEach(([questionId, answer]) => {
    // Skip empty/invalid answers
    if (!answer || typeof answer !== 'string') {
      console.warn(`[FIT Scoring] Skipping invalid answer for question ${questionId}:`, answer);
      return;
    }
    
    // Strip 'q'/'question' prefix if present, extract digits, uppercase the answer
    const normalizedQ = questionId.toLowerCase().replace(/^(question|q)/, '').trim();
    const normalizedA = answer.toUpperCase().trim();
    const key = `${normalizedQ}-${normalizedA}`;
    const skillPoints = FIT_SCORING_MATRIX[key];
    
    if (skillPoints) {
      matchedCount++;
      Object.entries(skillPoints).forEach(([skill, points]) => {
        rawScores[skill] = (rawScores[skill] || 0) + points;
      });
    } else {
      console.warn(`[FIT Scoring] No matrix match for key "${key}" (original: ${questionId}=${answer})`);
    }
  });
  
  // Warn if no answers matched - likely a data format issue
  if (matchedCount === 0 && Object.keys(answers).length > 0) {
    console.error(`[FIT Scoring] WARNING: No answers matched! Check data format. Answers:`, Object.keys(answers).slice(0, 3));
  }

  // Calculate maximum possible scores for each skill using per-question max approach
  const questionScores: Record<number, Record<string, Record<string, number>>> = {};
  
  Object.entries(FIT_SCORING_MATRIX).forEach(([key, skillPoints]) => {
    const [questionNum] = key.split('-');
    const q = parseInt(questionNum);
    
    if (!questionScores[q]) {
      questionScores[q] = {};
    }
    questionScores[q][key] = skillPoints;
  });

  const maxScores: Record<string, number> = {
    'High Agency': 0,
    'Intellectual Curiosity': 0,
    'Resilience': 0,
    'Empathy & Ethics': 0,
    'Growth Mindset': 0,
    'Interpersonal Agility': 0,
  };

  Object.values(questionScores).forEach((options) => {
    const questionMaxScores: Record<string, number> = {
      'High Agency': 0,
      'Intellectual Curiosity': 0,
      'Resilience': 0,
      'Empathy & Ethics': 0,
      'Growth Mindset': 0,
      'Interpersonal Agility': 0,
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

  // Calculate raw percentages for each skill
  const rawPercentages: Record<string, number> = {};
  Object.entries(rawScores).forEach(([skill, score]) => {
    if (maxScores[skill] > 0) {
      rawPercentages[skill] = (score / maxScores[skill]) * 100;
    } else {
      rawPercentages[skill] = 0;
    }
  });

  // Apply hybrid scoring
  return applyHybridScoring(rawPercentages);
}

// ============================================================================
// AI READINESS SCORE CALCULATION
// ============================================================================

export function calculateAIReadinessScores(answers: Record<string, string>): Record<string, number> {
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

  // Calculate raw scores based on answers
  // Normalize answer format: "q1": "a" -> "1-A" for matrix lookup
  let matchedCount = 0;
  Object.entries(answers).forEach(([questionId, answer]) => {
    // Skip empty/invalid answers
    if (!answer || typeof answer !== 'string') {
      console.warn(`[AIR Scoring] Skipping invalid answer for question ${questionId}:`, answer);
      return;
    }
    
    // Strip 'q'/'question' prefix if present, extract digits, uppercase the answer
    const normalizedQ = questionId.toLowerCase().replace(/^(question|q)/, '').trim();
    const normalizedA = answer.toUpperCase().trim();
    const key = `${normalizedQ}-${normalizedA}`;
    const skillPoints = AI_READINESS_SCORING_MATRIX[key];
    
    if (skillPoints) {
      matchedCount++;
      Object.entries(skillPoints).forEach(([skill, points]) => {
        skills[skill] += points;
      });
    } else {
      console.warn(`[AIR Scoring] No matrix match for key "${key}" (original: ${questionId}=${answer})`);
    }
  });
  
  // Warn if no answers matched - likely a data format issue
  if (matchedCount === 0 && Object.keys(answers).length > 0) {
    console.error(`[AIR Scoring] WARNING: No answers matched! Check data format. Answers:`, Object.keys(answers).slice(0, 3));
  }

  // Calculate maximum possible scores for each skill using per-question max approach
  const questionScores: Record<number, Record<string, Record<string, number>>> = {};
  
  Object.entries(AI_READINESS_SCORING_MATRIX).forEach(([key, skillPoints]) => {
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

  // Calculate raw percentages for each skill
  const rawPercentages: Record<string, number> = {};
  Object.entries(skills).forEach(([skill, score]) => {
    if (maxScores[skill] > 0) {
      rawPercentages[skill] = (score / maxScores[skill]) * 100;
    } else {
      rawPercentages[skill] = 0;
    }
  });

  // Debug logging for AI Readiness scoring
  console.log('[AIR Scoring] Raw scores:', skills);
  console.log('[AIR Scoring] Max scores:', maxScores);
  console.log('[AIR Scoring] Raw percentages:', rawPercentages);
  
  // Apply hybrid scoring
  const finalScores = applyHybridScoring(rawPercentages);
  console.log('[AIR Scoring] Final scores after hybrid formula:', finalScores);
  
  return finalScores;
}
