import { AlertCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface InsufficientCreditsPromptProps {
  message?: string;
  onNavigateToBilling?: () => void;
}

export function InsufficientCreditsPrompt({ message, onNavigateToBilling }: InsufficientCreditsPromptProps) {
  return (
    <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20" data-testid="section-insufficient-credits">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
              Insufficient or expired credits
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {message || "You don't have enough credits to run this analysis. Please top up your account to continue."}
            </p>
            {onNavigateToBilling && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-amber-500 text-amber-700 dark:text-amber-300"
                onClick={onNavigateToBilling}
                data-testid="button-top-up-credits"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Top Up Credits
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
