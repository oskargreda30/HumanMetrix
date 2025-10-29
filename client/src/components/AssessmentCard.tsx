import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, CheckCircle2, Lock } from "lucide-react";
import { type LucideIcon } from "lucide-react";

export interface AssessmentCardProps {
  id?: string;
  title: string;
  description: string;
  questionCount: number;
  duration: string;
  price?: string;
  icon: LucideIcon;
  status?: "available" | "completed" | "locked" | "coming-soon";
  onSelect?: () => void;
  free?: boolean;
  comingSoon?: boolean;
}

export default function AssessmentCard({
  title,
  description,
  questionCount,
  duration,
  price,
  icon: Icon,
  status = "available",
  onSelect,
  free = false,
  comingSoon = false,
}: AssessmentCardProps) {
  const isAvailable = status === "available" || status === "completed";
  const isComingSoon = status === "coming-soon" || comingSoon;

  return (
    <Card className="p-6 hover-elevate transition-all h-full flex flex-col bg-[#1a2744]/50 border-cyan-400/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-1 text-white" data-testid={`text-assessment-title`}>{title}</h3>
            <Badge variant="secondary" className="text-xs" data-testid="badge-question-count">
              {questionCount} questions
            </Badge>
          </div>
        </div>
        {status === "completed" && (
          <CheckCircle2 className="h-5 w-5 text-cyan-400" data-testid="icon-completed" />
        )}
        {status === "locked" && (
          <Lock className="h-5 w-5 text-blue-100/50" data-testid="icon-locked" />
        )}
      </div>

      <p className="text-blue-100/70 leading-relaxed mb-6 flex-grow" data-testid="text-description">
        {description}
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-blue-100/70">
            <Clock className="h-4 w-4" />
            <span data-testid="text-duration">{duration}</span>
          </div>
          <div className="flex items-center gap-2 text-blue-100/70">
            <FileText className="h-4 w-4" />
            <span data-testid="text-question-count">{questionCount} questions</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-cyan-400/20">
          <div>
            {free && (
              <span className="text-2xl font-bold text-cyan-400" data-testid="text-price">FREE</span>
            )}
            {!free && price && (
              <>
                <span className="text-2xl font-bold font-mono text-white" data-testid="text-price">{price}</span>
                {!isComingSoon && <span className="text-sm text-blue-100/50 ml-1">+ £15 base</span>}
              </>
            )}
          </div>
          {isComingSoon ? (
            <Badge variant="secondary" data-testid="badge-coming-soon">Coming Soon</Badge>
          ) : (
            onSelect && (
              <Button
                onClick={onSelect}
                disabled={!isAvailable}
                data-testid="button-select-assessment"
              >
                {status === "completed" ? "View Results" : "Select"}
              </Button>
            )
          )}
        </div>
      </div>
    </Card>
  );
}
