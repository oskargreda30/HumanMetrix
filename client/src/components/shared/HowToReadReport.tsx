import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export type ReportType = 'individual' | 'comparison' | 'rolefit' | 'rolefit_multi';

interface HowToReadReportProps {
  reportType: ReportType;
}

export function HowToReadReport({ reportType }: HowToReadReportProps) {
  if (reportType === 'individual') {
    return (
      <Card className="mb-8" data-testid="section-how-to-read">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">How to Read This Report</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            A guide to understanding assessment results
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <p className="font-medium text-sm">Understanding Trait-Based Scores</p>
                <p className="text-xs text-muted-foreground">FIT and AI Readiness are trait-based assessments. A high score means the trait is strongly present - whether this is beneficial depends on what the specific role requires.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <p className="font-medium text-sm">FIT Assessment (Behavioral)</p>
                <p className="text-xs text-muted-foreground">Measures 6 behavioral traits (e.g., High Agency, Resilience). Higher scores = stronger trait presence. Match against role requirements to assess fit.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <p className="font-medium text-sm">AI Readiness (Technical)</p>
                <p className="text-xs text-muted-foreground">Measures 9 AI-related capabilities. Higher scores indicate stronger aptitude in each area. Compare to role requirements for relevance.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
              <div>
                <p className="font-medium text-sm">Prompt Architecture</p>
                <p className="text-xs text-muted-foreground">Evaluates AI prompt engineering skills across 7 difficulty levels. Each level tests clarity, structure, and creativity in prompt design.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
              <div>
                <p className="font-medium text-sm">AIQ (Ethics)</p>
                <p className="text-xs text-muted-foreground">Algorithmic Integrity Quotient - measures understanding of AI ethics, bias, fairness, and responsible AI practices. Single overall score.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</div>
              <div>
                <p className="font-medium text-sm">Trait Profile Summary</p>
                <p className="text-xs text-muted-foreground">Top 3 highest and lowest scoring traits across FIT and AI Readiness. Use Role Fit analysis to determine which traits matter for specific positions.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (reportType === 'comparison') {
    return (
      <Card className="mb-8" data-testid="section-comparison-guide">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">How to Use This Comparison</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            A guide to comparing 2 candidates side-by-side
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <p className="font-medium text-sm">Candidate Overview</p>
                <p className="text-xs text-muted-foreground">Quick view of each candidate's assessment completion. All 4 assessments should be completed for a complete picture.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <p className="font-medium text-sm">Composite Score</p>
                <p className="text-xs text-muted-foreground">Weighted average across all assessments. Use the sliders to adjust weights based on role priorities (e.g., higher AI Readiness for tech roles).</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <p className="font-medium text-sm">Skill-by-Skill Breakdown</p>
                <p className="text-xs text-muted-foreground">Radar charts and tables show each candidate's strengths. Look for the highest scores in skills critical to your role.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
              <div>
                <p className="font-medium text-sm">Role Fit Analysis (Separate Tool)</p>
                <p className="text-xs text-muted-foreground">For detailed role-specific analysis including cohort benchmarking and hiring recommendations, use the Role Fit tab with individual candidates.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
              <div>
                <p className="font-medium text-sm">Read the Recommendations</p>
                <p className="text-xs text-muted-foreground">Review strengths, development areas, and AI-generated insights for each candidate to inform your final decision.</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4 pt-4 border-t">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">?</div>
            <div>
              <p className="font-medium text-sm">What Each Assessment Measures</p>
              <p className="text-xs text-muted-foreground"><strong>FIT:</strong> Behavioral traits like resilience, curiosity, ethics (predictors of cultural fit). &nbsp;<strong>AI Readiness:</strong> Technical AI skills including prompt engineering and data fluency. &nbsp;<strong>Prompt Architecture:</strong> Real-world prompt writing ability across difficulty levels. &nbsp;<strong>AIQ:</strong> AI ethics, judgment, and responsible AI awareness.</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (reportType === 'rolefit_multi') {
    return (
      <Card className="mb-8" data-testid="section-how-to-read-rolefit-multi">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">How to Read This Report</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            A step-by-step guide to understanding this multi-candidate comparison for the role
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <p className="font-medium text-sm">Role Alignment Tiers</p>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                  <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>High alignment,</span>
                  <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Moderate,</span>
                  <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Development needed</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <p className="font-medium text-sm">Skill Criticality</p>
                <p className="text-xs text-muted-foreground">Skills are prioritised based on how essential they are for success in this role. Focus on critical skills first when evaluating candidates.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <p className="font-medium text-sm">Understanding Trait Scores</p>
                <p className="text-xs text-muted-foreground">FIT and AI Readiness are <strong>trait-based</strong>. Higher scores indicate stronger trait presence - whether beneficial depends on role requirements.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
              <div>
                <p className="font-medium text-sm">Prompt Architecture Scores</p>
                <p className="text-xs text-muted-foreground">Measures <strong>AI prompt engineering</strong> ability across 7 progressive levels - from basic prompts to advanced multi-agent orchestration.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
              <div>
                <p className="font-medium text-sm">AIQ (Algorithmic Integrity Quotient)</p>
                <p className="text-xs text-muted-foreground">Assesses <strong>ethical AI decision-making</strong> - how candidates balance efficiency, fairness, and transparency in AI-driven scenarios.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">6</div>
              <div>
                <p className="font-medium text-sm">Gap Analysis</p>
                <p className="text-xs text-muted-foreground">Gaps show difference between candidate score and role requirement, helping identify where development may be needed.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // rolefit (single candidate) type
  return (
    <Card className="mb-8" data-testid="section-how-to-read-rolefit">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">How to Read This Report</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          A step-by-step guide to understanding this candidate's fit for the role
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
            <div>
              <p className="font-medium text-sm">Overall Role Fit Score</p>
              <p className="text-xs text-muted-foreground">The weighted average of all skill scores against role requirements. 80%+ = Strong fit, 60-79% = Good potential, Below 60% = Development needed.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
            <div>
              <p className="font-medium text-sm">Skill Alignments (FIT & AI Readiness)</p>
              <p className="text-xs text-muted-foreground">Compare candidate scores vs. role requirements. Look for <Badge className="bg-blue-600 text-white text-[10px] px-1 py-0 mx-0.5">C</Badge> marked skills - these are critical for success.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
            <div>
              <p className="font-medium text-sm">Critical Skills Analysis</p>
              <p className="text-xs text-muted-foreground">Summary of skills marked as critical for this role. Shows how many critical requirements are met vs. gaps needing development.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
            <div>
              <p className="font-medium text-sm">Cohort Benchmarking</p>
              <p className="text-xs text-muted-foreground">How this candidate ranks vs. all other candidates who've taken assessments. Percentile shows relative standing.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
            <div>
              <p className="font-medium text-sm">Alternative Roles</p>
              <p className="text-xs text-muted-foreground">If candidate isn't ideal for this role, see which other roles in your organization might be a better match.</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
