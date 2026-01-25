import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

export type ReportType = 'individual' | 'comparison' | 'rolefit';

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
            A quick guide to interpreting assessment data and insights
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <p className="font-medium text-sm">Score Colour Coding</p>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                  <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>Strong,</span>
                  <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Developing,</span>
                  <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Needs Attention</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <p className="font-medium text-sm">Skill Analysis</p>
                <p className="text-xs text-muted-foreground">Each skill is evaluated independently. Look for patterns across related skills.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <p className="font-medium text-sm">Strengths vs Improvements</p>
                <p className="text-xs text-muted-foreground">Strengths are above 75%, improvements are below 50% or show declining trends.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
              <div>
                <p className="font-medium text-sm">Holistic View</p>
                <p className="text-xs text-muted-foreground">Consider all 4 assessment types together for a complete picture of the candidate.</p>
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
            A guide to evaluating candidates side-by-side
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <p className="font-medium text-sm">Score Comparison</p>
                <p className="text-xs text-muted-foreground">Compare candidates across all 4 assessment types. Higher scores indicate stronger capabilities.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <p className="font-medium text-sm">Skill-Level Detail</p>
                <p className="text-xs text-muted-foreground">Drill into individual skills to see where each candidate excels or needs development.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <p className="font-medium text-sm">Colour Indicators</p>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                  <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>Strong,</span>
                  <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Developing,</span>
                  <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Needs Attention</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
              <div>
                <p className="font-medium text-sm">Holistic Decision</p>
                <p className="text-xs text-muted-foreground">Consider role requirements, team dynamics, and cultural fit alongside these scores.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // rolefit type
  return (
    <Card className="mb-8" data-testid="section-how-to-read-rolefit">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">How to Read This Role Fit Analysis</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          A guide to interpreting candidate-role alignment data
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
            <div>
              <p className="font-medium text-sm">Role Alignment Tiers</p>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-1">
                <Badge className="bg-green-500 text-white text-[10px] px-1 py-0">75%+</Badge> <span>Excellent match,</span>
                <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">50-74%</Badge> <span>Good match,</span>
                <Badge className="bg-red-500 text-white text-[10px] px-1 py-0">&lt;50%</Badge> <span>Development needed</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
            <div>
              <p className="font-medium text-sm">Skill Criticality</p>
              <p className="text-xs text-muted-foreground">
                Skills marked with <Badge className="bg-blue-600 text-white text-[10px] px-1 py-0 mx-1">C</Badge> are critical for success in this role
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
            <div>
              <p className="font-medium text-sm">Understanding Trait Scores</p>
              <p className="text-xs text-muted-foreground">FIT and AI Readiness are <strong>trait-based</strong>. Higher scores indicate stronger trait presence.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
            <div>
              <p className="font-medium text-sm">Gap Analysis</p>
              <p className="text-xs text-muted-foreground">Gaps show difference between candidate score and role requirement, helping identify development needs.</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
