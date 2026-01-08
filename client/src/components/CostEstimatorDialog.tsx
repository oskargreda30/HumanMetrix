import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import {
  CURRENCIES,
  COUNTRY_PRICING_TIER,
  getPPPMultiplier,
  getCurrencyForCountry,
  convertUSDCentsToGBPPence,
  roundPriceUp,
  type CurrencyConfig,
} from "@shared/currencies";
import { B2B_VOLUME_TIERS } from "@shared/schema";

interface CostEstimatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestDemo?: () => void;
}

const POPULAR_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "SG", name: "Singapore" },
  { code: "PH", name: "Philippines" },
  { code: "IN", name: "India" },
  { code: "DE", name: "Germany" },
  { code: "AE", name: "United Arab Emirates" },
];

const ALL_COUNTRIES = [
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "BG", name: "Bulgaria" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "KE", name: "Kenya" },
  { code: "KR", name: "South Korea" },
  { code: "KW", name: "Kuwait" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MY", name: "Malaysia" },
  { code: "MT", name: "Malta" },
  { code: "MX", name: "Mexico" },
  { code: "MA", name: "Morocco" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TR", name: "Turkey" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "VN", name: "Vietnam" },
];

const COMPANY_SIZES = [
  { id: "BOUTIQUE", name: "Small (1-100 hires/year)", description: "Startups & small businesses" },
  { id: "GROWTH", name: "Medium (101-500 hires/year)", description: "Growing companies" },
  { id: "SMALL_ENTERPRISE", name: "Large (501-2,500 hires/year)", description: "Established enterprises" },
  { id: "ENTERPRISE", name: "Enterprise (2,501-9,999 hires/year)", description: "Large corporations" },
  { id: "PRO", name: "Enterprise+ (10,000+ hires/year)", description: "Global organizations" },
];

function formatLocalCurrency(amount: number, currency: CurrencyConfig): string {
  const roundedAmount = roundPriceUp(amount);
  const formattedNumber = roundedAmount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).replace(/,/g, currency.thousandsSeparator);
  
  if (currency.symbolPosition === "before") {
    return `${currency.symbol}${formattedNumber}`;
  }
  return `${formattedNumber}${currency.symbol}`;
}

function calculateLocalPrice(
  priceUSDCents: number,
  countryCode: string,
  currency: CurrencyConfig
): number {
  const priceGBPPence = convertUSDCentsToGBPPence(priceUSDCents);
  const pppMultiplier = getPPPMultiplier(countryCode);
  const adjustedPriceGBPPence = priceGBPPence * pppMultiplier;
  const priceInGBP = adjustedPriceGBPPence / 100;
  const priceInLocal = priceInGBP * currency.exchangeRate;
  return priceInLocal;
}

function getEstimateRange(baseAmount: number, currency: CurrencyConfig): { low: string; high: string } {
  const lowAmount = roundPriceUp(baseAmount * 0.85);
  const highAmount = roundPriceUp(baseAmount * 1.15);
  return {
    low: formatLocalCurrency(lowAmount, currency),
    high: formatLocalCurrency(highAmount, currency),
  };
}

export default function CostEstimatorDialog({
  open,
  onOpenChange,
  onRequestDemo,
}: CostEstimatorDialogProps) {
  const [countryCode, setCountryCode] = useState("US");
  const [companySize, setCompanySize] = useState("GROWTH");
  const [assessmentCount, setAssessmentCount] = useState([50]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return ALL_COUNTRIES;
    const query = searchQuery.toLowerCase();
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const selectedCountry = ALL_COUNTRIES.find((c) => c.code === countryCode) || ALL_COUNTRIES[0];
  const currency = getCurrencyForCountry(countryCode);
  const pppMultiplier = getPPPMultiplier(countryCode);
  const tier = B2B_VOLUME_TIERS[companySize as keyof typeof B2B_VOLUME_TIERS];

  const pricePerTestLocal = calculateLocalPrice(tier.pricePerTest, countryCode, currency);
  const totalLocal = pricePerTestLocal * assessmentCount[0];

  const perTestRange = getEstimateRange(pricePerTestLocal, currency);
  const totalRange = getEstimateRange(totalLocal, currency);

  const retailPriceLocal = calculateLocalPrice(B2B_VOLUME_TIERS.BOUTIQUE.pricePerTest, countryCode, currency);
  
  const savingsPercent = retailPriceLocal > pricePerTestLocal 
    ? Math.round(((retailPriceLocal - pricePerTestLocal) / retailPriceLocal) * 100)
    : 0;

  const pricingTierLabel = COUNTRY_PRICING_TIER[countryCode] || "tier1";
  const regionLabel = pricingTierLabel === "tier1" 
    ? "Standard pricing" 
    : pricingTierLabel === "tier2" 
      ? "30% regional discount applied" 
      : "50% emerging market discount applied";

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
              <Label className="text-sm font-medium">Your Country</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Pricing is adjusted based on local purchasing power and displayed in your local currency.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {POPULAR_COUNTRIES.map((c) => (
                <Button
                  key={c.code}
                  variant={countryCode === c.code ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCountryCode(c.code)}
                  data-testid={`country-quick-${c.code}`}
                >
                  {c.name}
                </Button>
              ))}
            </div>

            <div className="relative">
              <Input
                placeholder="Search for your country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-2"
                data-testid="input-country-search"
              />
              {searchQuery && filteredCountries.length > 0 && (
                <div className="absolute z-10 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredCountries.slice(0, 10).map((c) => (
                    <button
                      key={c.code}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      onClick={() => {
                        setCountryCode(c.code);
                        setSearchQuery("");
                      }}
                      data-testid={`country-search-${c.code}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
              <span>Selected: <strong>{selectedCountry.name}</strong></span>
              <span className="text-primary">({currency.code})</span>
              {pppMultiplier < 1 && (
                <span className="text-green-600 dark:text-green-400 ml-2">{regionLabel}</span>
              )}
            </div>
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
