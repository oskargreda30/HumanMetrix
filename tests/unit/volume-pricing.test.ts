/**
 * Unit Tests for Partner Volume Discount Pricing
 * 
 * Tests cover:
 * - 6-tier volume discount structure
 * - Discount calculations
 * - Price per credit calculations
 * - Package savings calculations
 */

import { describe, it, expect } from 'vitest';

// Volume discount tiers as defined in the system
interface VolumeTier {
  name: string;
  credits: number;
  discountPercent: number;
}

const VOLUME_TIERS: VolumeTier[] = [
  { name: 'Starter', credits: 10, discountPercent: 0 },
  { name: 'Growth', credits: 25, discountPercent: 5 },
  { name: 'Professional', credits: 50, discountPercent: 10 },
  { name: 'Business', credits: 100, discountPercent: 15 },
  { name: 'Enterprise', credits: 250, discountPercent: 20 },
  { name: 'Enterprise+', credits: 500, discountPercent: 25 },
];

// Base price per credit in GBP pence (before discount)
const BASE_PRICE_PER_CREDIT = 500; // £5.00

function calculateDiscountedPrice(basePricePerCredit: number, discountPercent: number): number {
  return Math.round(basePricePerCredit * (1 - discountPercent / 100));
}

function calculatePackageTotal(credits: number, pricePerCredit: number): number {
  return credits * pricePerCredit;
}

function calculateSavings(credits: number, basePricePerCredit: number, discountedPricePerCredit: number): number {
  const fullPrice = credits * basePricePerCredit;
  const discountedTotal = credits * discountedPricePerCredit;
  return fullPrice - discountedTotal;
}

function getTierByCredits(credits: number): VolumeTier | undefined {
  return VOLUME_TIERS.find(tier => tier.credits === credits);
}

function getSavingsPercentage(basePricePerCredit: number, discountedPricePerCredit: number): number {
  return ((basePricePerCredit - discountedPricePerCredit) / basePricePerCredit) * 100;
}

describe('Volume Discount Tier Structure', () => {
  describe('Tier Configuration', () => {
    it('should have exactly 6 tiers', () => {
      expect(VOLUME_TIERS.length).toBe(6);
    });

    it('should have correct Starter tier (10 credits, 0%)', () => {
      const tier = getTierByCredits(10);
      expect(tier?.name).toBe('Starter');
      expect(tier?.discountPercent).toBe(0);
    });

    it('should have correct Growth tier (25 credits, 5%)', () => {
      const tier = getTierByCredits(25);
      expect(tier?.name).toBe('Growth');
      expect(tier?.discountPercent).toBe(5);
    });

    it('should have correct Professional tier (50 credits, 10%)', () => {
      const tier = getTierByCredits(50);
      expect(tier?.name).toBe('Professional');
      expect(tier?.discountPercent).toBe(10);
    });

    it('should have correct Business tier (100 credits, 15%)', () => {
      const tier = getTierByCredits(100);
      expect(tier?.name).toBe('Business');
      expect(tier?.discountPercent).toBe(15);
    });

    it('should have correct Enterprise tier (250 credits, 20%)', () => {
      const tier = getTierByCredits(250);
      expect(tier?.name).toBe('Enterprise');
      expect(tier?.discountPercent).toBe(20);
    });

    it('should have correct Enterprise+ tier (500 credits, 25%)', () => {
      const tier = getTierByCredits(500);
      expect(tier?.name).toBe('Enterprise+');
      expect(tier?.discountPercent).toBe(25);
    });
  });

  describe('Tier Ordering', () => {
    it('should have tiers ordered by credit count ascending', () => {
      for (let i = 1; i < VOLUME_TIERS.length; i++) {
        expect(VOLUME_TIERS[i].credits).toBeGreaterThan(VOLUME_TIERS[i - 1].credits);
      }
    });

    it('should have tiers ordered by discount percentage ascending', () => {
      for (let i = 1; i < VOLUME_TIERS.length; i++) {
        expect(VOLUME_TIERS[i].discountPercent).toBeGreaterThanOrEqual(VOLUME_TIERS[i - 1].discountPercent);
      }
    });
  });
});

describe('Price Calculations', () => {
  describe('Discounted Price Per Credit', () => {
    it('should calculate Starter price correctly (0% discount)', () => {
      const price = calculateDiscountedPrice(BASE_PRICE_PER_CREDIT, 0);
      expect(price).toBe(500); // £5.00
    });

    it('should calculate Growth price correctly (5% discount)', () => {
      const price = calculateDiscountedPrice(BASE_PRICE_PER_CREDIT, 5);
      expect(price).toBe(475); // £4.75
    });

    it('should calculate Professional price correctly (10% discount)', () => {
      const price = calculateDiscountedPrice(BASE_PRICE_PER_CREDIT, 10);
      expect(price).toBe(450); // £4.50
    });

    it('should calculate Business price correctly (15% discount)', () => {
      const price = calculateDiscountedPrice(BASE_PRICE_PER_CREDIT, 15);
      expect(price).toBe(425); // £4.25
    });

    it('should calculate Enterprise price correctly (20% discount)', () => {
      const price = calculateDiscountedPrice(BASE_PRICE_PER_CREDIT, 20);
      expect(price).toBe(400); // £4.00
    });

    it('should calculate Enterprise+ price correctly (25% discount)', () => {
      const price = calculateDiscountedPrice(BASE_PRICE_PER_CREDIT, 25);
      expect(price).toBe(375); // £3.75
    });
  });

  describe('Package Total Calculations', () => {
    it('should calculate Starter package total (10 credits × £5.00)', () => {
      const total = calculatePackageTotal(10, 500);
      expect(total).toBe(5000); // £50.00
    });

    it('should calculate Growth package total (25 credits × £4.75)', () => {
      const total = calculatePackageTotal(25, 475);
      expect(total).toBe(11875); // £118.75
    });

    it('should calculate Professional package total (50 credits × £4.50)', () => {
      const total = calculatePackageTotal(50, 450);
      expect(total).toBe(22500); // £225.00
    });

    it('should calculate Business package total (100 credits × £4.25)', () => {
      const total = calculatePackageTotal(100, 425);
      expect(total).toBe(42500); // £425.00
    });

    it('should calculate Enterprise package total (250 credits × £4.00)', () => {
      const total = calculatePackageTotal(250, 400);
      expect(total).toBe(100000); // £1,000.00
    });

    it('should calculate Enterprise+ package total (500 credits × £3.75)', () => {
      const total = calculatePackageTotal(500, 375);
      expect(total).toBe(187500); // £1,875.00
    });
  });

  describe('Savings Calculations', () => {
    it('should calculate Growth tier savings correctly', () => {
      const savings = calculateSavings(25, 500, 475);
      expect(savings).toBe(625); // £6.25 saved
    });

    it('should calculate Professional tier savings correctly', () => {
      const savings = calculateSavings(50, 500, 450);
      expect(savings).toBe(2500); // £25.00 saved
    });

    it('should calculate Business tier savings correctly', () => {
      const savings = calculateSavings(100, 500, 425);
      expect(savings).toBe(7500); // £75.00 saved
    });

    it('should calculate Enterprise tier savings correctly', () => {
      const savings = calculateSavings(250, 500, 400);
      expect(savings).toBe(25000); // £250.00 saved
    });

    it('should calculate Enterprise+ tier savings correctly', () => {
      const savings = calculateSavings(500, 500, 375);
      expect(savings).toBe(62500); // £625.00 saved
    });

    it('should have zero savings for Starter tier', () => {
      const savings = calculateSavings(10, 500, 500);
      expect(savings).toBe(0);
    });
  });

  describe('Savings Percentage Validation', () => {
    it('should verify 5% savings for Growth tier', () => {
      const percentage = getSavingsPercentage(500, 475);
      expect(percentage).toBe(5);
    });

    it('should verify 10% savings for Professional tier', () => {
      const percentage = getSavingsPercentage(500, 450);
      expect(percentage).toBe(10);
    });

    it('should verify 15% savings for Business tier', () => {
      const percentage = getSavingsPercentage(500, 425);
      expect(percentage).toBe(15);
    });

    it('should verify 20% savings for Enterprise tier', () => {
      const percentage = getSavingsPercentage(500, 400);
      expect(percentage).toBe(20);
    });

    it('should verify 25% savings for Enterprise+ tier', () => {
      const percentage = getSavingsPercentage(500, 375);
      expect(percentage).toBe(25);
    });
  });
});

describe('Multi-Currency Volume Pricing', () => {
  const USD_BASE_PRICE = 635; // $6.35 per credit

  it('should calculate USD package prices correctly', () => {
    // Enterprise tier in USD (20% discount)
    const usdPrice = calculateDiscountedPrice(USD_BASE_PRICE, 20);
    expect(usdPrice).toBe(508); // $5.08
  });

  it('should maintain discount percentages across currencies', () => {
    const gbpDiscount = calculateDiscountedPrice(500, 15);
    const usdDiscount = calculateDiscountedPrice(635, 15);
    
    // Both should have 15% less than their base
    expect(gbpDiscount).toBe(425);
    expect(usdDiscount).toBe(540); // Rounded
  });
});

describe('Edge Cases', () => {
  it('should handle 0% discount correctly', () => {
    const price = calculateDiscountedPrice(1000, 0);
    expect(price).toBe(1000);
  });

  it('should handle 100% discount', () => {
    const price = calculateDiscountedPrice(1000, 100);
    expect(price).toBe(0);
  });

  it('should round fractional pence correctly', () => {
    // 500 × 0.97 = 485 (3% discount)
    const price = calculateDiscountedPrice(500, 3);
    expect(price).toBe(485);
  });

  it('should handle very large credit packages', () => {
    const total = calculatePackageTotal(10000, 350);
    expect(total).toBe(3500000); // £35,000.00
  });
});
