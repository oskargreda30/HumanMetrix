import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, CheckCircle2, Lock, Check, ShoppingCart, X } from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { useBasket } from "@/contexts/BasketContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ASSESSMENT_PRICES, normalizeAssessmentId } from "@shared/schema";

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
  showPricing?: boolean;
  tag?: string;
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
  showPricing = true,
  tag,
}: AssessmentCardProps) {
  const { addToBasket, removeFromBasket, isInBasket } = useBasket();
  const { formatLocalPrice, currency } = useCurrency();
  const [justAdded, setJustAdded] = useState(false);
  const isAvailable = status === "available" || status === "completed";
  const isComingSoon = status === "coming-soon" || comingSoon;
  const inBasket = id ? isInBasket(normalizeAssessmentId(id)) : false;

  useEffect(() => {
    if (justAdded) {
      const timer = setTimeout(() => setJustAdded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justAdded]);

  const handleAddToBasket = () => {
    if (!id) return;
    
    const normalizedId = normalizeAssessmentId(id);
    const pricePence = ASSESSMENT_PRICES[normalizedId] || 0;
    
    addToBasket({
      id: normalizedId,
      name: title,
      price: pricePence,
    });
    setJustAdded(true);
  };

  const handleRemoveFromBasket = () => {
    if (!id) return;
    const normalizedId = normalizeAssessmentId(id);
    removeFromBasket(normalizedId);
  };

  // Get the price to display - use localized format
  const getDisplayPrice = () => {
    if (free) return "FREE";
    if (!id) return price || "";
    
    const normalizedId = normalizeAssessmentId(id);
    const pricePence = ASSESSMENT_PRICES[normalizedId];
    if (pricePence) {
      return formatLocalPrice(pricePence);
    }
    return price || "";
  };

  return (
    <Card className="p-4 md:p-6 hover-elevate transition-all h-full flex flex-col bg-[#1a2744]/50 border-cyan-400/20">
      <div className="flex items-start justify-between mb-2 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="h-8 w-8 md:h-12 md:w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-4 w-4 md:h-6 md:w-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm md:text-lg lg:text-xl font-semibold mb-1 text-white" data-testid={`text-assessment-title`}>{title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] md:text-xs" data-testid="badge-question-count">
                {questionCount} questions
              </Badge>
              {tag && (
                <Badge variant="outline" className="text-[10px] md:text-xs border-cyan-400/50 text-cyan-300" data-testid="badge-tag">
                  {tag}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {status === "completed" && (
          <CheckCircle2 className="h-3 w-3 md:h-5 md:w-5 text-cyan-400" data-testid="icon-completed" />
        )}
        {status === "locked" && (
          <Lock className="h-3 w-3 md:h-5 md:w-5 text-blue-100/50" data-testid="icon-locked" />
        )}
      </div>

      <p className="text-xs md:text-sm text-blue-100/70 leading-relaxed mb-3 md:mb-6 flex-grow" data-testid="text-description">
        {description}
      </p>

      <div className="space-y-2 md:space-y-4">
        <div className="flex items-center justify-between text-[11px] md:text-sm">
          <div className="flex items-center gap-1 md:gap-2 text-blue-100/70">
            <Clock className="h-3 w-3 md:h-4 md:w-4" />
            <span data-testid="text-duration">{duration}</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2 text-blue-100/70">
            <FileText className="h-3 w-3 md:h-4 md:w-4" />
            <span data-testid="text-question-count">{questionCount} questions</span>
          </div>
        </div>

        {showPricing ? (
          <div className="flex items-center justify-between pt-2 md:pt-4 border-t border-cyan-400/20">
            <div>
              <span className="text-sm md:text-lg lg:text-xl font-bold font-mono text-cyan-400" data-testid="text-price">
                {getDisplayPrice()}
              </span>
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
                      className="flex items-center gap-1 text-xs"
                      data-testid="badge-in-basket"
                    >
                      <Check className="h-3 w-3" />
                      Added
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRemoveFromBasket}
                      disabled={!isAvailable}
                      data-testid="button-remove-from-basket"
                      className="border-cyan-400/30 hover:border-cyan-400/50 hover:bg-cyan-400/10 text-cyan-400"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleAddToBasket}
                    disabled={!isAvailable || !id}
                    data-testid="button-add-to-basket"
                    size="sm"
                    className="text-xs bg-cyan-400 hover:bg-cyan-500 text-white"
                  >
                    {justAdded ? (
                      <>
                        <Check className="mr-1 h-3 w-3" />
                        Added!
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-1 h-3 w-3" />
                        Add to Testing Suite
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2 md:pt-4 border-t border-cyan-400/20">
            {isComingSoon ? (
              <Badge variant="secondary" data-testid="badge-coming-soon">Coming Soon</Badge>
            ) : (
              <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30" data-testid="badge-available">
                Available
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
