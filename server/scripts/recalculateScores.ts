#!/usr/bin/env tsx
/**
 * Recalculate Assessment Scores for Specific Users
 * 
 * This script recalculates FIT and AI Readiness scores for users who have
 * incorrect scores due to outdated scoring logic in production.
 * 
 * Usage:
 *   tsx server/scripts/recalculateScores.ts
 * 
 * Or for specific users:
 *   tsx server/scripts/recalculateScores.ts --user email@example.com
 */

import { storage } from "../storage";

// Copy of scoring functions from server/routes.ts
// These represent the CURRENT/CORRECT scoring logic
function calculateFITScores(answers: Record<string, string>): Record<string, number> {
  const rawScores: Record<string, number> = {
    'High Agency': 0, 
    'Intellectual Curiosity': 0, 
    'Resilience': 0, 
    'Empathy & Ethics': 0, 
    'Growth Mindset': 0, 
    'Interpersonal Agility': 0,
  };

  const scoringMatrix: Record<string, Record<string, number>> = {
    "1-A": { "High Agency": 4, "Resilience": 4, "Growth Mindset": 4 },
    "1-B": { "Intellectual Curiosity": 4, "Interpersonal Agility": 4 },
    "1-C": { "Empathy & Ethics": 4, "Growth Mindset": 4 },
    "1-D": { "High Agency": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "2-A": { "High Agency": 4, "Growth Mindset": 4 },
    "2-B": { "Resilience": 4, "Empathy & Ethics": 4 },
    "2-C": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "2-D": { "High Agency": 4, "Resilience": 4, "Interpersonal Agility": 4 },
    "3-A": { "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "3-B": { "High Agency": 4, "Resilience": 4, "Interpersonal Agility": 4 },
    "3-C": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4 },
    "3-D": { "Resilience": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "4-A": { "High Agency": 4, "Resilience": 4, "Growth Mindset": 4 },
    "4-B": { "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "4-C": { "Resilience": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "4-D": { "High Agency": 4, "Empathy & Ethics": 4, "Growth Mindset": 4 },
    "5-A": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4 },
    "5-B": { "Resilience": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "5-C": { "High Agency": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "5-D": { "Intellectual Curiosity": 4, "Resilience": 4, "Interpersonal Agility": 4 },
    "6-A": { "High Agency": 4, "Intellectual Curiosity": 4 },
    "6-B": { "Resilience": 4, "Growth Mindset": 4 },
    "6-C": { "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "6-D": { "High Agency": 4, "Resilience": 4, "Empathy & Ethics": 4 },
    "7-A": { "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "7-B": { "High Agency": 4, "Resilience": 4, "Growth Mindset": 4 },
    "7-C": { "Intellectual Curiosity": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "7-D": { "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "8-A": { "High Agency": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "8-B": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "8-C": { "High Agency": 4, "Empathy & Ethics": 4 },
    "8-D": { "Intellectual Curiosity": 4, "Resilience": 4, "Growth Mindset": 4 },
    "9-A": { "Resilience": 4, "Empathy & Ethics": 4 },
    "9-B": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4 },
    "9-C": { "High Agency": 4, "Interpersonal Agility": 4 },
    "9-D": { "High Agency": 4, "Intellectual Curiosity": 4, "Resilience": 4 },
    "10-A": { "High Agency": 4, "Resilience": 4, "Growth Mindset": 4 },
    "10-B": { "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "10-C": { "Intellectual Curiosity": 4, "Resilience": 4, "Growth Mindset": 4 },
    "10-D": { "Resilience": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "11-A": { "High Agency": 4, "Resilience": 4, "Interpersonal Agility": 4 },
    "11-B": { "Intellectual Curiosity": 4, "Empathy & Ethics": 4 },
    "11-C": { "High Agency": 4, "Empathy & Ethics": 4 },
    "11-D": { "Intellectual Curiosity": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "12-A": { "Resilience": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "12-B": { "High Agency": 4, "Resilience": 4, "Empathy & Ethics": 4 },
    "12-C": { "High Agency": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "12-D": { "Intellectual Curiosity": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "13-A": { "High Agency": 4, "Intellectual Curiosity": 4 },
    "13-B": { "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "13-C": { "Resilience": 4, "Growth Mindset": 4 },
    "13-D": { "High Agency": 4, "Resilience": 4, "Growth Mindset": 4 },
    "14-A": { "Resilience": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "14-B": { "High Agency": 4, "Empathy & Ethics": 4 },
    "14-C": { "Intellectual Curiosity": 4, "Growth Mindset": 4, "Interpersonal Agility": 4 },
    "14-D": { "High Agency": 4, "Empathy & Ethics": 4, "Interpersonal Agility": 4 },
    "15-A": { "High Agency": 4, "Intellectual Curiosity": 4, "Growth Mindset": 4 },
    "15-B": { "Intellectual Curiosity": 4, "Resilience": 4, "Interpersonal Agility": 4 },
    "15-C": { "Empathy & Ethics": 4, "Growth Mindset": 4 },
    "15-D": { "High Agency": 4, "Resilience": 4, "Interpersonal Agility": 4 },
  };

  // Calculate raw scores
  Object.entries(answers).forEach(([questionId, answer]) => {
    const key = `${questionId}-${answer}`;
    const skillPoints = scoringMatrix[key];
    
    if (skillPoints) {
      Object.entries(skillPoints).forEach(([skill, points]) => {
        rawScores[skill] = (rawScores[skill] || 0) + points;
      });
    }
  });

  // Calculate maximum possible scores for each skill
  const maxScores: Record<string, number> = {};
  Object.keys(rawScores).forEach(skill => {
    maxScores[skill] = 0;
  });

  Object.values(scoringMatrix).forEach(skillPoints => {
    Object.entries(skillPoints).forEach(([skill, points]) => {
      maxScores[skill] = (maxScores[skill] || 0) + points;
    });
  });

  // Normalize to 0-100 scale
  const normalizedScores: Record<string, number> = {};
  Object.entries(rawScores).forEach(([skill, score]) => {
    if (maxScores[skill] > 0) {
      normalizedScores[skill] = Math.round((score / maxScores[skill]) * 100);
    } else {
      normalizedScores[skill] = 0;
    }
  });

  // Apply relative scaling: make highest score = 100, scale others proportionally
  const scoreValues = Object.values(normalizedScores);
  const highestScore = Math.max(...scoreValues);
  
  if (highestScore > 0) {
    const relativeScores: Record<string, number> = {};
    Object.entries(normalizedScores).forEach(([skill, score]) => {
      relativeScores[skill] = Math.round((score / highestScore) * 100);
    });
    return relativeScores;
  }

  return normalizedScores;
}

function calculateAIReadinessScores(answers: Record<string, string>): Record<string, number> {
  const skills: Record<string, number> = {
    'AI Literacy/Prompting': 0,
    'Technical Fluency': 0,
    'Domain Fluency': 0,
    'Critical Thinking': 0,
    'Adaptive Learning': 0,
    'Responsible AI': 0,
    'Domain Expertise': 0,
    'Creative Innovation': 0,
    'Cross-functional Collaboration': 0,
  };

  const scoringMatrix: Record<string, Record<string, number>> = {
    "1-A": { "AI Literacy/Prompting": 4, "Domain Fluency": 4 },
    "1-B": { "Technical Fluency": 4, "Domain Expertise": 4 },
    "1-C": { "Technical Fluency": 4, "Responsible AI": 4, "Critical Thinking": 4 },
    "1-D": { "Adaptive Learning": 4, "Cross-functional Collaboration": 4 },
    "1-E": { "AI Literacy/Prompting": 4, "Creative Innovation": 4 },
    "2-A": { "Technical Fluency": 4, "Creative Innovation": 4 },
    "2-B": { "Technical Fluency": 4, "Cross-functional Collaboration": 4 },
    "2-C": { "Responsible AI": 4, "Domain Expertise": 4 },
    "2-D": { "Domain Fluency": 4, "Critical Thinking": 4 },
    "2-E": { "AI Literacy/Prompting": 4, "Adaptive Learning": 4 },
    "3-A": { "Critical Thinking": 4, "Adaptive Learning": 4 },
    "3-B": { "Domain Fluency": 4, "Creative Innovation": 4 },
    "3-C": { "Domain Fluency": 4, "Responsible AI": 4, "AI Literacy/Prompting": 4 },
    "3-D": { "Adaptive Learning": 4, "Cross-functional Collaboration": 4, "Creative Innovation": 4 },
    "3-E": { "Technical Fluency": 4, "Critical Thinking": 4 },
    "4-A": { "Technical Fluency": 4, "Domain Expertise": 4 },
    "4-B": { "Adaptive Learning": 4, "Cross-functional Collaboration": 4 },
    "4-C": { "Responsible AI": 4, "Critical Thinking": 4 },
    "4-D": { "Adaptive Learning": 4, "Domain Expertise": 4 },
    "4-E": { "AI Literacy/Prompting": 4, "Cross-functional Collaboration": 4 },
    "5-A": { "AI Literacy/Prompting": 4, "Domain Fluency": 4 },
    "5-B": { "Technical Fluency": 4, "Domain Fluency": 4 },
    "5-C": { "Responsible AI": 4, "Domain Expertise": 4 },
    "5-D": { "Critical Thinking": 4, "Creative Innovation": 4 },
    "5-E": { "Adaptive Learning": 4, "Cross-functional Collaboration": 4 },
    "6-A": { "Responsible AI": 4, "Critical Thinking": 4, "Adaptive Learning": 4 },
    "6-B": { "AI Literacy/Prompting": 4, "Creative Innovation": 4 },
    "6-C": { "Technical Fluency": 4, "Cross-functional Collaboration": 4 },
    "6-D": { "Domain Fluency": 4, "Adaptive Learning": 4 },
    "6-E": { "Domain Expertise": 4, "Domain Fluency": 4 },
    "7-A": { "AI Literacy/Prompting": 4, "Domain Fluency": 4 },
    "7-B": { "Technical Fluency": 4, "Domain Expertise": 4 },
    "7-C": { "Responsible AI": 4, "Adaptive Learning": 4, "Cross-functional Collaboration": 4 },
    "7-D": { "Critical Thinking": 4, "Adaptive Learning": 4 },
    "7-E": { "Creative Innovation": 4, "Cross-functional Collaboration": 4 },
    "8-A": { "Critical Thinking": 4, "Adaptive Learning": 4 },
    "8-B": { "AI Literacy/Prompting": 4, "Creative Innovation": 4, "Cross-functional Collaboration": 4 },
    "8-C": { "Technical Fluency": 4, "Domain Expertise": 4 },
    "8-D": { "Domain Fluency": 4, "Creative Innovation": 4 },
    "8-E": { "Technical Fluency": 4, "Adaptive Learning": 4 },
    "9-A": { "Domain Fluency": 4, "Domain Expertise": 4 },
    "9-B": { "Responsible AI": 4, "Adaptive Learning": 4 },
    "9-C": { "AI Literacy/Prompting": 4, "Critical Thinking": 4 },
    "9-D": { "Technical Fluency": 4, "Creative Innovation": 4, "Domain Expertise": 4 },
    "9-E": { "Critical Thinking": 4, "Adaptive Learning": 4, "Cross-functional Collaboration": 4 },
    "10-A": { "Domain Expertise": 4, "Critical Thinking": 4 },
    "10-B": { "AI Literacy/Prompting": 4, "Domain Fluency": 4 },
    "10-C": { "Adaptive Learning": 4, "Cross-functional Collaboration": 4 },
    "10-D": { "Creative Innovation": 4, "Responsible AI": 4 },
    "10-E": { "Technical Fluency": 4, "Creative Innovation": 4, "Cross-functional Collaboration": 4 },
    "11-A": { "Responsible AI": 4, "Domain Expertise": 4 },
    "11-B": { "Critical Thinking": 4, "Adaptive Learning": 4 },
    "11-C": { "AI Literacy/Prompting": 4, "Technical Fluency": 4, "Domain Fluency": 4 },
    "11-D": { "Cross-functional Collaboration": 4, "Adaptive Learning": 4 },
    "11-E": { "AI Literacy/Prompting": 4, "Creative Innovation": 4 },
    "12-A": { "Critical Thinking": 4, "Domain Fluency": 4, "AI Literacy/Prompting": 4 },
    "12-B": { "Technical Fluency": 4, "Domain Expertise": 4 },
    "12-C": { "Domain Fluency": 4, "Adaptive Learning": 4 },
    "12-D": { "Cross-functional Collaboration": 4, "AI Literacy/Prompting": 4 },
    "12-E": { "Responsible AI": 4, "Critical Thinking": 4, "Creative Innovation": 4 },
    "13-A": { "Technical Fluency": 4, "Creative Innovation": 4 },
    "13-B": { "Adaptive Learning": 4, "Domain Fluency": 4 },
    "13-C": { "Cross-functional Collaboration": 4, "Responsible AI": 4 },
    "13-D": { "Domain Expertise": 4, "AI Literacy/Prompting": 4 },
    "13-E": { "Critical Thinking": 4, "Adaptive Learning": 4, "Creative Innovation": 4 },
    "14-A": { "Technical Fluency": 4, "Adaptive Learning": 4 },
    "14-B": { "Cross-functional Collaboration": 4, "Creative Innovation": 4 },
    "14-C": { "AI Literacy/Prompting": 4, "Domain Fluency": 4 },
    "14-D": { "Critical Thinking": 4, "Responsible AI": 4 },
    "14-E": { "Technical Fluency": 4, "Adaptive Learning": 4, "Domain Expertise": 4 },
    "15-A": { "Responsible AI": 4, "Creative Innovation": 4 },
    "15-B": { "Domain Fluency": 4, "Critical Thinking": 4 },
    "15-C": { "AI Literacy/Prompting": 4, "Adaptive Learning": 4 },
    "15-D": { "Domain Expertise": 4, "Cross-functional Collaboration": 4 },
    "15-E": { "Technical Fluency": 4, "Domain Fluency": 4, "Critical Thinking": 4 },
    "16-A": { "Technical Fluency": 4, "Critical Thinking": 4 },
    "16-B": { "Creative Innovation": 4, "Cross-functional Collaboration": 4 },
    "16-C": { "Adaptive Learning": 4, "Domain Expertise": 4, "Cross-functional Collaboration": 4 },
    "16-D": { "Responsible AI": 4, "Domain Fluency": 4 },
    "16-E": { "AI Literacy/Prompting": 4, "Technical Fluency": 4 },
    "17-A": { "Domain Expertise": 4, "Critical Thinking": 4 },
    "17-B": { "Technical Fluency": 4, "Domain Fluency": 4 },
    "17-C": { "AI Literacy/Prompting": 4, "Adaptive Learning": 4 },
    "17-D": { "Responsible AI": 4, "Cross-functional Collaboration": 4 },
    "17-E": { "Domain Fluency": 4, "Creative Innovation": 4, "Critical Thinking": 4 },
    "18-A": { "Adaptive Learning": 4, "Domain Expertise": 4 },
    "18-B": { "Critical Thinking": 4, "Cross-functional Collaboration": 4 },
    "18-C": { "Technical Fluency": 4, "Responsible AI": 4 },
    "18-D": { "AI Literacy/Prompting": 4, "Creative Innovation": 4 },
    "18-E": { "Domain Fluency": 4, "Adaptive Learning": 4 },
    "19-A": { "Critical Thinking": 4, "Adaptive Learning": 4 },
    "19-B": { "Technical Fluency": 4, "Domain Fluency": 4 },
    "19-C": { "AI Literacy/Prompting": 4, "Creative Innovation": 4 },
    "19-D": { "Responsible AI": 4, "Domain Expertise": 4 },
    "19-E": { "Cross-functional Collaboration": 4, "Adaptive Learning": 4 },
    "20-A": { "AI Literacy/Prompting": 4, "Technical Fluency": 4 },
    "20-B": { "Critical Thinking": 4, "Domain Expertise": 4 },
    "20-C": { "Responsible AI": 4, "Creative Innovation": 4 },
    "20-D": { "Domain Fluency": 4, "Cross-functional Collaboration": 4 },
    "20-E": { "Adaptive Learning": 4, "Domain Expertise": 4 },
    "21-A": { "Creative Innovation": 4, "Domain Fluency": 4 },
    "21-B": { "Technical Fluency": 4, "Critical Thinking": 4 },
    "21-C": { "Responsible AI": 4, "Cross-functional Collaboration": 4 },
    "21-D": { "AI Literacy/Prompting": 4, "Adaptive Learning": 4 },
    "21-E": { "Domain Expertise": 4, "Domain Fluency": 4 },
  };

  // Calculate raw scores
  Object.entries(answers).forEach(([questionId, answer]) => {
    const key = `${questionId}-${answer}`;
    const skillPoints = scoringMatrix[key];
    
    if (skillPoints) {
      Object.entries(skillPoints).forEach(([skill, points]) => {
        skills[skill] = (skills[skill] || 0) + points;
      });
    }
  });

  // Calculate maximum scores
  const maxScores: Record<string, number> = {};
  Object.keys(skills).forEach(skill => {
    maxScores[skill] = 0;
  });

  Object.values(scoringMatrix).forEach(skillPoints => {
    Object.entries(skillPoints).forEach(([skill, points]) => {
      maxScores[skill] = (maxScores[skill] || 0) + points;
    });
  });

  // Normalize to 0-100 scale
  const normalizedScores: Record<string, number> = {};
  Object.entries(skills).forEach(([skill, score]) => {
    if (maxScores[skill] > 0) {
      normalizedScores[skill] = Math.round((score / maxScores[skill]) * 100);
    } else {
      normalizedScores[skill] = 0;
    }
  });

  // Apply relative scaling: make highest score = 100, scale others proportionally
  const scoreValues = Object.values(normalizedScores);
  const highestScore = Math.max(...scoreValues);
  
  if (highestScore > 0) {
    const relativeScores: Record<string, number> = {};
    Object.entries(normalizedScores).forEach(([skill, score]) => {
      relativeScores[skill] = Math.round((score / highestScore) * 100);
    });
    return relativeScores;
  }

  return normalizedScores;
}

async function recalculateUserScores(userEmail: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Recalculating scores for: ${userEmail}`);
  console.log(`${'='.repeat(60)}`);
  
  const user = await storage.getUserByEmail(userEmail);
  if (!user) {
    console.error(`❌ User not found: ${userEmail}`);
    return;
  }
  
  const results = await storage.getResultsByUser(user.id);
  console.log(`\nFound ${results.length} assessment result(s)`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const result of results) {
    if (result.status !== 'completed') {
      console.log(`  ⏭️  Skipping ${result.assessmentType} (status: ${result.status})`);
      skipped++;
      continue;
    }
    
    console.log(`\n  📊 Processing: ${result.assessmentType.toUpperCase()}`);
    console.log(`     Current total score: ${result.totalScore || 0}`);
    
    let newScores: Record<string, number> = {};
    
    if (result.assessmentType === 'fit') {
      newScores = calculateFITScores(result.answers);
    } else if (result.assessmentType === 'ai_readiness') {
      newScores = calculateAIReadinessScores(result.answers);
    } else {
      console.log(`     ⏭️  Skipping (not FIT/AI Readiness)`);
      skipped++;
      continue;
    }
    
    const newTotal = Math.round(
      Object.values(newScores).reduce((sum, score) => sum + score, 0) / 
      Object.values(newScores).length
    );
    
    console.log(`     New skill scores:`, newScores);
    console.log(`     New total score: ${newTotal}`);
    
    await storage.updateAssessmentScores(result.id, newScores, newTotal);
    
    console.log(`     ✅ Updated successfully`);
    updated++;
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Summary: ${updated} updated, ${skipped} skipped`);
  console.log(`${'='.repeat(60)}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  
  let usersToFix: string[] = [];
  
  // Check for --user arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--user' && args[i + 1]) {
      usersToFix.push(args[i + 1]);
      i++; // Skip the next argument
    }
  }
  
  // Default users if none specified
  if (usersToFix.length === 0) {
    usersToFix = [
      "oskar.greda@hotmail.co.uk",
      "oskar@mlabs.city"
    ];
    console.log("No users specified, using default users:");
    console.log(usersToFix);
  } else {
    console.log("Recalculating scores for specified users:");
    console.log(usersToFix);
  }
  
  console.log("\n");
  
  for (const email of usersToFix) {
    await recalculateUserScores(email);
  }
  
  console.log("\n✅ All recalculations complete!\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
