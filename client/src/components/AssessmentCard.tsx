import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, CheckCircle2, Lock, Check, ShoppingCart, X } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { useBasket } from "@/contexts/BasketContext";

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
  id,
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
  const { addToBasket, removeFromBasket, isInBasket } = useBasket();
  const [justAdded, setJustAdded] = useState(false);
  const isAvailable = status === "available" || status === "completed";
  const isComingSoon = status === "coming-soon" || comingSoon;
  const inBasket = id ? isInBasket(id) : false;

  useEffect(() => {
    if (justAdded) {
      const timer = setTimeout(() => setJustAdded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justAdded]);

  const handleAddToBasket = () => {
    if (!id || !price) return;
    
    const priceValue = parseFloat(price.replace('£', ''));
    addToBasket({
      id,
      name: title,
      price: priceValue,
    });
    setJustAdded(true);
  };

  const handleRemoveFromBasket = () => {
    if (!id) return;
    removeFromBasket(id);
  };

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
              <span className="text-2xl font-bold font-mono text-cyan-400" data-testid="text-price">{price}</span>
            )}
          </div>
          {isComingSoon ? (
            <Badge variant="secondary" data-testid="badge-coming-soon">Coming Soon</Badge>
          ) : status === "completed" ? (
            onSelect && (
              <Button
                onClick={onSelect}
                data-testid="button-purchase-assessment"
              >
                View Results
              </Button>
            )
          ) : (
            <div className="flex gap-2">
              {inBasket ? (
                <>
                  <Badge 
                    variant="default" 
                    className="flex items-center gap-1"
                    data-testid="badge-in-basket"
                  >
                    <Check className="h-3 w-3" />
                    Added
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFromBasket}
                    disabled={!isAvailable}
                    data-testid="button-remove-from-basket"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleAddToBasket}
                  disabled={!isAvailable || !id}
                  data-testid="button-add-to-basket"
                >
                  {justAdded ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Added!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Basket
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
