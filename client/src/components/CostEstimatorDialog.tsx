import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Calculator, Globe, Building2, Users, TrendingDown, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CostEstimatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestDemo?: () => void;
}

const REGIONS = [
  { id: "tier1", name: "North America, Western Europe, ANZ", multiplier: 1.0, description: "US, UK, EU, Australia, etc." },
  { id: "tier2", name: "Eastern Europe, Latin America, Middle East", multiplier: 0.7, description: "Brazil, Poland, Turkey, etc." },
  { id: "tier3", name: "Southeast Asia, South Asia, Africa", multiplier: 0.5, description: "India, Philippines, Nigeria, etc." },
];

const COMPANY_SIZES = [
  { id: "boutique", name: "Small (1-100 hires/year)", volumeRange: "1-100", basePrice: 20, description: "Startups & small businesses" },
  { id: "growth", name: "Medium (101-500 hires/year)", volumeRange: "101-500", basePrice: 10, description: "Growing companies" },
  { id: "small_enterprise", name: "Large (501-2,500 hires/year)", volumeRange: "501-2,500", basePrice: 5, description: "Established enterprises" },
  { id: "enterprise", name: "Enterprise (2,501-9,999 hires/year)", volumeRange: "2,501-9,999", basePrice: 2.5, description: "Large corporations" },
  { id: "pro", name: "Enterprise+ (10,000+ hires/year)", volumeRange: "10,000+", basePrice: 1, description: "Global organizations" },
];

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

function getPriceRange(baseCost: number): { low: string; high: string } {
  const lowMultiplier = 0.85;
  const highMultiplier = 1.15;
  const low = Math.floor(baseCost * lowMultiplier);
  const high = Math.ceil(baseCost * highMultiplier);
  return { low: formatCurrency(low), high: formatCurrency(high) };
}

export default function CostEstimatorDialog({
  open,
  onOpenChange,
  onRequestDemo,
}: CostEstimatorDialogProps) {
  const [region, setRegion] = useState("tier1");
  const [companySize, setCompanySize] = useState("growth");
  const [assessmentCount, setAssessmentCount] = useState([50]);

  const selectedRegion = REGIONS.find((r) => r.id === region) || REGIONS[0];
  const selectedCompany = COMPANY_SIZES.find((c) => c.id === companySize) || COMPANY_SIZES[1];

  const basePerTest = selectedCompany.basePrice;
  const adjustedPerTest = basePerTest * selectedRegion.multiplier;
  const totalCost = adjustedPerTest * assessmentCount[0];

  const perTestRange = getPriceRange(adjustedPerTest);
  const totalRange = getPriceRange(totalCost);

  const annualSavingsVsRetail = (20 - adjustedPerTest) * assessmentCount[0];
  const savingsPercent = Math.round(((20 - adjustedPerTest) / 20) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Cost Estimator
          </DialogTitle>
          <DialogDescription>
            Get a personalized estimate for your organization. Final pricing is confirmed during onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Your Region</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Pricing is adjusted based on local purchasing power to ensure fair access globally.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger data-testid="select-region">
                <SelectValue placeholder="Select your region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r.id} value={r.id} data-testid={`region-option-${r.id}`}>
                    <div className="flex flex-col">
                      <span>{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Company Size</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Higher volume commitments unlock better per-assessment pricing.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={companySize} onValueChange={setCompanySize}>
              <SelectTrigger data-testid="select-company-size">
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((c) => (
                  <SelectItem key={c.id} value={c.id} data-testid={`company-option-${c.id}`}>
                    <div className="flex flex-col">
                      <span>{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Assessments per Month</Label>
              </div>
              <span className="text-sm font-semibold text-primary" data-testid="assessment-count">
                {assessmentCount[0]} assessments
              </span>
            </div>
            <Slider
              value={assessmentCount}
              onValueChange={setAssessmentCount}
              min={10}
              max={500}
              step={10}
              className="py-2"
              data-testid="slider-assessments"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10</span>
              <span>250</span>
              <span>500</span>
            </div>
          </div>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Estimated Monthly Cost
                </p>
                <p className="text-2xl font-bold text-primary" data-testid="estimated-total">
                  {totalRange.low} – {totalRange.high}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{perTestRange.low} – {perTestRange.high} per assessment
                </p>
              </div>

              {savingsPercent > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <TrendingDown className="h-4 w-4" />
                  <span data-testid="savings-info">
                    Save up to {savingsPercent}% compared to retail pricing
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-primary/10">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Full Assessment Suite</p>
                  <p className="text-sm font-medium">FIT + AI Readiness + Prompt + AIQ</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Includes</p>
                  <p className="text-sm font-medium">Analytics + PDF Reports</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Estimates are indicative ranges based on typical pricing. Final pricing depends on 
                contract terms, payment method, and specific requirements discussed during onboarding.
              </span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                onRequestDemo?.();
              }}
              data-testid="button-request-demo"
            >
              Get Exact Pricing
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-estimator"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
