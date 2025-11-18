import { db } from "../db";
import { assessmentResults } from "../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Migration script to normalize AI Readiness score keys from legacy format to canonical format
 * 
 * Legacy keys -> Canonical keys:
 * - "AI Literacy" -> "AI Literacy & Prompt Engineering"
 * - "Technical Fluency" -> "Technical Fundamentals"
 * - "Domain Fluency" -> "Data Fluency"
 * - "Critical Thinking" -> "Critical Thinking & Problem-Solving"
 * - "Adaptive Learning" -> "Adaptability & Continuous Learning"
 * - "Collaboration" -> "Collaboration & Communication"
 * - "Responsible AI" -> "Responsible AI & Ethical Awareness"
 * - "Creative Innovation" -> "Creativity & Innovation"
 * - "Domain Expertise" -> "Domain Expertise" (unchanged)
 */

const LEGACY_TO_CANONICAL_MAPPING: Record<string, string> = {
  'AI Literacy': 'AI Literacy & Prompt Engineering',
  'AI Literacy/Prompting': 'AI Literacy & Prompt Engineering', // Very old legacy key
  'Technical Fluency': 'Technical Fundamentals',
  'Domain Fluency': 'Data Fluency',
  'Critical Thinking': 'Critical Thinking & Problem-Solving',
  'Adaptive Learning': 'Adaptability & Continuous Learning',
  'Collaboration': 'Collaboration & Communication',
  'Cross-functional Collaboration': 'Collaboration & Communication', // Very old legacy key
  'Responsible AI': 'Responsible AI & Ethical Awareness',
  'Creative Innovation': 'Creativity & Innovation',
  'Domain Expertise': 'Domain Expertise', // Already canonical
};

async function migrateAIReadinessScoreKeys() {
  console.log('🔄 Starting AI Readiness score key migration...\n');
  
  try {
    // Fetch all AI Readiness results
    const aiReadinessResults = await db
      .select()
      .from(assessmentResults)
      .where(eq(assessmentResults.assessmentType, 'ai_readiness'));
    
    console.log(`📊 Found ${aiReadinessResults.length} AI Readiness assessment results\n`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const result of aiReadinessResults) {
      try {
        if (!result.scores || typeof result.scores !== 'object') {
          console.log(`  ⚠️  Skipping result ${result.id}: No scores found`);
          skippedCount++;
          continue;
        }
        
        const oldScores = result.scores as Record<string, number>;
        const hasLegacyKeys = Object.keys(oldScores).some(key => 
          key in LEGACY_TO_CANONICAL_MAPPING && key !== 'Domain Expertise'
        );
        
        if (!hasLegacyKeys) {
          console.log(`  ✅ Result ${result.id}: Already using canonical keys`);
          skippedCount++;
          continue;
        }
        
        // Remap scores from legacy to canonical keys
        const newScores: Record<string, number> = {};
        Object.entries(oldScores).forEach(([oldKey, score]) => {
          const canonicalKey = LEGACY_TO_CANONICAL_MAPPING[oldKey] || oldKey;
          newScores[canonicalKey] = score;
        });
        
        // Update the database
        await db
          .update(assessmentResults)
          .set({ scores: newScores })
          .where(eq(assessmentResults.id, result.id));
        
        console.log(`  ✨ Migrated result ${result.id}`);
        console.log(`     Old keys: ${Object.keys(oldScores).join(', ')}`);
        console.log(`     New keys: ${Object.keys(newScores).join(', ')}\n`);
        
        migratedCount++;
      } catch (error) {
        console.error(`  ❌ Error migrating result ${result.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   ✨ Migrated: ${migratedCount}`);
    console.log(`   ✅ Already canonical: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total processed: ${aiReadinessResults.length}\n`);
    
    if (migratedCount > 0) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('ℹ️  No records needed migration');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateAIReadinessScoreKeys();
