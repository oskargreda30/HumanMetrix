import OpenAI from 'openai';
import { pool } from './db';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  ...(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }),
  timeout: 60000,
});

function getDisplayName(id: string): string {
  if (id.includes('@')) return id.split('@')[0];
  return id.length > 20 ? id.substring(0, 17) + '...' : id;
}

async function generateIndividualInsights(candidateIds: string[], resultData: any): Promise<string | null> {
  const fitData = resultData.fitAssessments?.[0];
  const aiData = resultData.aiReadinessAssessments?.[0];
  const promptData = resultData.promptArchitectureAssessments?.[0];
  const aiqData = resultData.aiqAssessments?.[0];

  if (!fitData && !aiData && !promptData && !aiqData) return null;

  const candidateName = getDisplayName(candidateIds[0] || 'candidate');

  const skills: Array<{ name: string; score: number }> = [];
  if (fitData?.scores) {
    Object.entries(fitData.scores as Record<string, number>).forEach(([name, score]) => skills.push({ name, score }));
  }
  if (aiData?.scores) {
    Object.entries(aiData.scores as Record<string, number>).forEach(([name, score]) => skills.push({ name, score }));
  }
  skills.sort((a, b) => b.score - a.score);
  const strengths = skills.slice(0, 3);
  const weaknesses = skills.slice(-3).reverse();

  const fitAvg = fitData?.scores
    ? Math.round(Object.values(fitData.scores as Record<string, number>).reduce((a, b) => a + b, 0) / Object.keys(fitData.scores).length)
    : null;
  const aiAvg = aiData?.scores
    ? Math.round(Object.values(aiData.scores as Record<string, number>).reduce((a, b) => a + b, 0) / Object.keys(aiData.scores).length)
    : null;

  const prompt = `You are an expert HR analyst. Generate a comprehensive profile analysis for a job candidate based on their assessment results.

CANDIDATE: ${candidateName}

ASSESSMENT DATA:
${fitData ? 'FIT (Behavioral Traits) - Average: ' + fitAvg + '%\nIndividual Scores: ' + JSON.stringify(fitData.scores, null, 2) : 'FIT Assessment: Not completed'}

${aiData ? 'AI Readiness (Technical) - Average: ' + aiAvg + '%\nIndividual Scores: ' + JSON.stringify(aiData.scores, null, 2) : 'AI Readiness Assessment: Not completed'}

${promptData ? 'Prompt Architecture: ' + promptData.totalScore + '%' : 'Prompt Architecture: Not completed'}

${aiqData ? 'AIQ (AI Ethics): ' + aiqData.totalScore + '%' : 'AIQ Assessment: Not completed'}

HIGHEST SCORING TRAITS: ${strengths.map(s => s.name + ' (' + s.score + '%)').join(', ') || 'N/A'}

LOWEST SCORING TRAITS: ${weaknesses.map(s => s.name + ' (' + s.score + '%)').join(', ') || 'N/A'}

IMPORTANT: FIT and AI Readiness are TRAIT-BASED assessments. High scores mean the trait is STRONGLY PRESENT, not that it's "good" or "bad". Whether a high score is beneficial depends on role requirements.

Generate a structured analysis with EXACTLY these 5 sections. Use the headers exactly as shown:

**ROLE SUITABILITY**
Based on the trait profile, describe 2-3 types of roles or work environments where this candidate would excel. Be specific about role characteristics and job titles.

**OPTIMAL ENVIRONMENT**
Describe the ideal work environment, company culture, and team dynamics where this candidate would thrive. Consider factors like pace, structure, team size, and management style.

**KEY STRENGTHS**
List the top 3 standout traits and explain how they benefit the workplace. Reference specific assessment scores.

**DEVELOPMENT FOCUS**
Identify 2-3 priority areas for professional development based on lower-scoring traits. Be specific about what training, mentoring, or experiences would benefit this candidate most. Frame constructively with actionable suggestions.

**OVERALL ASSESSMENT AND RECOMMENDATION**
Provide a concise overall assessment and recommendation for hiring managers, including ideal role types, team fit, and any potential concerns to be aware of.

Keep each section concise (2-3 sentences). Use professional but accessible language.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert HR analyst specializing in candidate assessments. Provide insightful, balanced profile analyses." },
      { role: "user", content: prompt },
    ],
    max_tokens: 800,
    temperature: 0.7,
  });

  return completion.choices[0].message.content || null;
}

async function generateComparisonInsights(candidateIds: string[], resultData: any): Promise<string | null> {
  const candidateDisplayNames = candidateIds.map(getDisplayName);
  const fitAssessments = resultData.fitAssessments;
  const aiReadinessAssessments = resultData.aiReadinessAssessments;
  const promptArchitectureAssessments = resultData.promptArchitectureAssessments;
  const aiqAssessments = resultData.aiqAssessments;
  const averageScores = resultData.averageScores;

  const candidateSummaries = candidateDisplayNames.map((name: string, idx: number) => {
    const fitData = fitAssessments?.[idx];
    const aiData = aiReadinessAssessments?.[idx];
    const promptData = promptArchitectureAssessments?.[idx];
    const aiqData = aiqAssessments?.[idx];

    const fitAvg = fitData?.scores
      ? Math.round(Object.values(fitData.scores as Record<string, number>).reduce((a, b) => a + b, 0) / Object.keys(fitData.scores).length)
      : null;
    const aiAvg = aiData?.scores
      ? Math.round(Object.values(aiData.scores as Record<string, number>).reduce((a, b) => a + b, 0) / Object.keys(aiData.scores).length)
      : null;

    return `
${name}:
- FIT Assessment: ${fitData ? 'Completed (Avg: ' + fitAvg + '%)' : 'Not completed'}
- AI Readiness: ${aiData ? 'Completed (Avg: ' + aiAvg + '%)' : 'Not completed'}
- Prompt Architecture: ${promptData ? promptData.totalScore + '%' : 'Not completed'}
- AIQ: ${aiqData ? aiqData.totalScore + '%' : 'Not completed'}`;
  }).join('\n');

  const prompt = `You are an expert HR analyst comparing multiple job candidates. Generate a concise comparative analysis.

CANDIDATES BEING COMPARED:
${candidateSummaries}

Average Scores Summary:
${candidateDisplayNames.map((name: string, i: number) => name + ': ' + (averageScores?.[i] ?? 'N/A') + '%').join(', ')}

Provide a brief comparative analysis (under 200 words) covering:
1. **Key Differentiators**: What sets each candidate apart
2. **Complementary Strengths**: Where candidates excel differently
3. **Hiring Consideration**: Brief recommendation based on the data

Use the candidates' actual names. Be specific and actionable.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are an expert HR analyst specializing in candidate comparisons. Provide concise, professional insights." },
      { role: "user", content: prompt },
    ],
    max_tokens: 400,
    temperature: 0.7,
  });

  return completion.choices[0].message.content || null;
}

async function generateMultiRoleFitInsights(resultData: any): Promise<string | null> {
  const allCandidateEntries: any[] = resultData.candidates || resultData.allCandidateEntries || [];
  if (allCandidateEntries.length === 0) return null;

  const summaryInsights = resultData.summaryInsights || {};
  const role = resultData.role || {};

  const candidateSummaries = allCandidateEntries.map((entry: any) => {
    const strengths = entry.strengths?.slice(0, 3).join(', ') || 'N/A';
    const gaps = entry.gaps?.slice(0, 3).join(', ') || 'N/A';
    const riskFlags = entry.riskFlags?.length > 0 ? entry.riskFlags.join(', ') : 'None';
    return `
- ${entry.userName} (${entry.email}):
  Overall Fit: ${entry.overallFit !== null ? entry.overallFit + '%' : 'Insufficient data'}
  Tier: ${entry.fitTier}
  Top Strengths: ${strengths}
  Key Gaps: ${gaps}
  Risk Flags: ${riskFlags}`;
  }).join('\n');

  const prompt = `You are a senior talent acquisition analyst. Provide a comprehensive hiring report for this multi-candidate role fit comparison.

ROLE: ${role.name || role.title || 'Unspecified Role'}
${role.description ? 'Description: ' + role.description : ''}

CANDIDATES ANALYZED:
${candidateSummaries}

TOP PERFORMER: ${summaryInsights.topPerformer?.userName || 'N/A'} (${summaryInsights.topPerformer?.overallFit || 0}% fit)

Generate a detailed employer recommendation report with the following sections. Use markdown headers (##) for each section. Be specific and reference candidates by name throughout.

## Overall Ranking & Summary
Rank all candidates by composite score with a brief 1-2 sentence assessment of each. Include their key differentiator.

## Top Candidate Deep Dive
Provide a detailed analysis of why the top-ranked candidate stands out. Cover their strongest assessment areas, specific skill highlights, and what makes them the strongest fit for this role.

## Comparative Strengths Analysis
Compare how each candidate performs across specific competency areas. Highlight where one candidate leads over others. Identify any areas where lower-ranked candidates outperform the top candidate.

Be thorough, professional, and reference specific data points from the assessment results.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a senior talent acquisition analyst specializing in role-fit assessments and psychometric evaluation. Provide comprehensive, strategic, and actionable hiring reports with structured sections." },
      { role: "user", content: prompt },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  return completion.choices[0].message.content || null;
}

export async function rerunMissingInsights(): Promise<void> {
  const client = await pool.connect();
  try {
    // Find all reports with null aiInsights (only types that support insights)
    const { rows } = await client.query<{
      id: string;
      report_type: string;
      title: string;
      candidate_ids: string[];
      result_data: any;
    }>(`
      SELECT id, report_type, title, candidate_ids, result_data
      FROM partner_analysis_reports
      WHERE report_type IN ('individual', 'comparison', 'role_fit_multi')
        AND (
          result_data->>'aiInsights' IS NULL
          OR result_data->>'aiInsights' = 'null'
          OR result_data->>'aiInsights' = ''
        )
      ORDER BY created_at DESC
    `);

    if (rows.length === 0) {
      console.log('[RerunInsights] No reports with missing AI insights found.');
      return;
    }

    console.log(`[RerunInsights] Found ${rows.length} report(s) with missing insights. Regenerating...`);

    for (const report of rows) {
      try {
        console.log(`[RerunInsights] Processing: ${report.title} (${report.id}) type=${report.report_type}`);

        let aiInsights: string | null = null;

        if (report.report_type === 'individual') {
          aiInsights = await generateIndividualInsights(report.candidate_ids, report.result_data);
        } else if (report.report_type === 'comparison') {
          aiInsights = await generateComparisonInsights(report.candidate_ids, report.result_data);
        } else if (report.report_type === 'role_fit_multi') {
          aiInsights = await generateMultiRoleFitInsights(report.result_data);
        }

        if (aiInsights) {
          await client.query(
            `UPDATE partner_analysis_reports
             SET result_data = jsonb_set(result_data, '{aiInsights}', $1::jsonb)
             WHERE id = $2`,
            [JSON.stringify(aiInsights), report.id]
          );
          console.log(`[RerunInsights] ✅ Updated insights for: ${report.title}`);
        } else {
          console.log(`[RerunInsights] ⚠️  No insights generated for: ${report.title} (insufficient data)`);
        }

        // Small delay between OpenAI calls to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (err: any) {
        console.error(`[RerunInsights] ❌ Failed for report ${report.id}: ${err.message}`);
        // Continue with next report even if one fails
      }
    }

    console.log('[RerunInsights] Done processing all reports with missing insights.');
  } catch (err: any) {
    console.error('[RerunInsights] Fatal error during rerun:', err.message);
  } finally {
    client.release();
  }
}
