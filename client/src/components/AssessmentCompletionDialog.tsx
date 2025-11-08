import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { Link } from "wouter";

interface AssessmentCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPaidUser: boolean;
  completedCount: number;
}

export function AssessmentCompletionDialog({
  open,
  onOpenChange,
  isPaidUser,
  completedCount,
}: AssessmentCompletionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-completion">
        <DialogHeader>
          <div className="mx-auto mb-4">
            <div className="relative">
              <PartyPopper className="h-16 w-16 text-primary" />
              <CheckCircle2 className="absolute -right-2 -bottom-2 h-8 w-8 text-green-500 bg-background rounded-full" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            Congratulations!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            You've completed {completedCount} assessment{completedCount > 1 ? 's' : ''}! 
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 text-center">
          {isPaidUser ? (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Your assessment results are ready to view. You can download a comprehensive PDF report 
                highlighting your strengths and areas for development.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                To unlock your detailed results and download your professional PDF report, you'll need to complete payment.
              </p>
              <p className="text-sm text-muted-foreground">
                Use discount code <span className="font-mono font-bold text-foreground">FREE</span> if your employer has covered the cost.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto" data-testid="button-view-results">
              {isPaidUser ? "View My Results" : "Unlock Results"}
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
