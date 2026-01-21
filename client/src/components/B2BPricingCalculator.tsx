import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getPricingTier } from "@shared/currencies";
import { Calculator } from "lucide-react";

interface VolumeTier {
  name: string;
  minVolume: number;
  maxVolume: number;
  pricePerTestPence: number;
}

const VOLUME_TIERS: VolumeTier[] = [
  { name: "Boutique", minVolume: 1, maxVolume: 100, pricePerTestPence: 1575 },
  { name: "Growth", minVolume: 101, maxVolume: 500, pricePerTestPence: 787 },
  { name: "Small Enterprise", minVolume: 501, maxVolume: 2500, pricePerTestPence: 394 },
  { name: "Enterprise", minVolume: 2501, maxVolume: 9999, pricePerTestPence: 197 },
  { name: "Pro", minVolume: 10000, maxVolume: 10000, pricePerTestPence: 79 },
];

const B2B_COUNTRY_MULTIPLIERS: Record<string, number> = {
  tier1: 4,
  tier2: 2,
  tier3: 1,
  sea_launch: 1,
};

function getB2BMultiplier(countryCode: string | null): number {
  if (!countryCode) return 4;
  const tier = getPricingTier(countryCode);
  return B2B_COUNTRY_MULTIPLIERS[tier] || 4;
}

function getCurrentTier(volume: number): VolumeTier {
  for (const tier of VOLUME_TIERS) {
    if (volume >= tier.minVolume && volume <= tier.maxVolume) {
      return tier;
    }
  }
  return VOLUME_TIERS[VOLUME_TIERS.length - 1];
}

function calculateTotalPriceInPence(volume: number, multiplier: number): number {
  const tier = getCurrentTier(volume);
  return volume * tier.pricePerTestPence * multiplier;
}

export default function B2BPricingCalculator() {
  const [volume, setVolume] = useState(100);
  const { countryCode, pricingTier, formatLocalPrice } = useCurrency();

  const multiplier = useMemo(() => getB2BMultiplier(countryCode), [countryCode]);
  const currentTier = useMemo(() => getCurrentTier(volume), [volume]);
  const totalPriceInPence = useMemo(() => calculateTotalPriceInPence(volume, multiplier), [volume, multiplier]);
  const pricePerTestInPence = useMemo(() => currentTier.pricePerTestPence * multiplier, [currentTier, multiplier]);

  const formattedTotal = useMemo(
    () => formatLocalPrice(totalPriceInPence),
    [totalPriceInPence, formatLocalPrice]
  );

  const formattedPerTest = useMemo(
    () => formatLocalPrice(pricePerTestInPence),
    [pricePerTestInPence, formatLocalPrice]
  );

  const tierLabel = pricingTier === "tier3" ? "Emerging Market" : pricingTier === "tier2" ? "Growth Market" : "Premium Market";

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="b2b-pricing-calculator">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-5 w-5 text-primary" />
            Enterprise Pricing Calculator
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {tierLabel} Pricing
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Estimate your monthly assessment costs based on expected volume
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium">Monthly Test Volume</label>
            <Input
              type="number"
              value={volume}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 10000) {
                  setVolume(val);
                }
              }}
              min={1}
              max={10000}
              className="w-28 text-right text-lg font-bold"
              data-testid="volume-input"
            />
          </div>
          <Slider
            value={[volume]}
            onValueChange={(values) => setVolume(values[0])}
            min={1}
            max={10000}
            step={50}
            className="w-full"
            data-testid="volume-slider"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>2,500</span>
            <span>5,000</span>
            <span>10,000+</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Current Tier</p>
            <p className="text-lg font-semibold" data-testid="current-tier">{currentTier.name}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Price Per Test</p>
            <p className="text-lg font-semibold" data-testid="price-per-test">{formattedPerTest}</p>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">Estimated Monthly Cost</p>
          <p className="text-3xl font-bold text-primary" data-testid="total-price">
            {formattedTotal}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Based on {volume.toLocaleString()} tests at {formattedPerTest}/test
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Volume Pricing Tiers</p>
          <div className="grid gap-2">
            {VOLUME_TIERS.map((tier) => {
              const isActive = tier.name === currentTier.name;
              const tierPriceInPence = tier.pricePerTestPence * multiplier;
              const formattedTierPrice = formatLocalPrice(tierPriceInPence);
              return (
                <div
                  key={tier.name}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isActive
                      ? "bg-primary/10 border-primary/30"
                      : "bg-muted/30 border-transparent"
                  }`}
                  data-testid={`tier-${tier.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${isActive ? "text-primary" : ""}`}>
                        {tier.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tier.name === "Pro" ? "10,000+" : `${tier.minVolume.toLocaleString()} - ${tier.maxVolume.toLocaleString()}`} tests/month
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${isActive ? "text-primary" : ""}`}>
                    {formattedTierPrice}/test
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Final pricing is customized during onboarding. Contact us for a tailored quote.
        </p>
      </CardContent>
    </Card>
  );
}
