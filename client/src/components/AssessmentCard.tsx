import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, CheckCircle2, Lock } from "lucide-react";
import { type LucideIcon } from "lucide-react";

export interface AssessmentCardProps {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  duration: string;
  price: string;
  icon: LucideIcon;
  status?: "available" | "completed" | "locked" | "coming-soon";
  onSelect?: () => void;
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
}: AssessmentCardProps) {
  const isAvailable = status === "available" || status === "completed";
  const isComingSoon = status === "coming-soon";

  return (
    <Card className="p-6 hover-elevate transition-all h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-1" data-testid={`text-assessment-title`}>{title}</h3>
            <Badge variant="secondary" className="text-xs" data-testid="badge-question-count">
              {questionCount} questions
            </Badge>
          </div>
        </div>
        {status === "completed" && (
          <CheckCircle2 className="h-5 w-5 text-primary" data-testid="icon-completed" />
        )}
        {status === "locked" && (
          <Lock className="h-5 w-5 text-muted-foreground" data-testid="icon-locked" />
        )}
      </div>

      <p className="text-muted-foreground leading-relaxed mb-6 flex-grow" data-testid="text-description">
        {description}
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span data-testid="text-duration">{duration}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span data-testid="text-question-count">{questionCount} questions</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <span className="text-2xl font-bold font-mono" data-testid="text-price">{price}</span>
            {!isComingSoon && <span className="text-sm text-muted-foreground ml-1">+ £15 base</span>}
          </div>
          {isComingSoon ? (
            <Badge variant="secondary" data-testid="badge-coming-soon">Coming Soon</Badge>
          ) : (
            <Button
              onClick={onSelect}
              disabled={!isAvailable}
              data-testid="button-select-assessment"
            >
              {status === "completed" ? "View Results" : "Select"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
