/**
 * Unit Tests for Partner Billing Logic
 * 
 * Tests the three billing models:
 * 1. Prepaid - deducts from prepaidBalance
 * 2. Auto-bill - tracks currentMonthUsage, charges card at billing cycle anchor
 * 3. Invoice - tracks usage for manual invoicing
 * 
 * NOTE: These tests validate the pure business logic calculations that should occur
 * in the billing system. They test the mathematical correctness of:
 * - Credit deductions for prepaid accounts
 * - Usage tracking calculations for auto-bill/invoice accounts
 * - Month-end billing amount calculations
 * - Month key generation
 * 
 * The actual storage layer functions (recordPartnerTestUsage, addPrepaidCredits, etc.)
 * require database mocking which is covered separately in integration tests.
 * These unit tests serve as regression guards for the billing formulas.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock partner data for testing billing logic
interface MockPartner {
  id: string;
  companyName: string;
  billingType: 'prepaid' | 'auto_bill' | 'invoice';
  prepaidBalance: number;
  currentMonthUsage: number;
  pricePerAssessment: number;
  isActive: boolean;
  stripeCustomerId?: string;
  billingCycleAnchor?: number;
  paymentTermsDays?: number;
}

// Pure billing logic functions for testing (extracted from storage layer patterns)
function calculatePrepaidDeduction(partner: MockPartner): { 
  success: boolean; 
  newBalance: number; 
  error?: string 
} {
  if (partner.billingType !== 'prepaid') {
    return { success: false, newBalance: partner.prepaidBalance, error: 'Not a prepaid partner' };
  }
  
  if (partner.prepaidBalance <= 0) {
    return { success: false, newBalance: 0, error: 'No prepaid credits remaining' };
  }
  
  return { 
    success: true, 
    newBalance: partner.prepaidBalance - 1 
  };
}

function calculateUsageIncrement(partner: MockPartner): {
  success: boolean;
  newUsageCount: number;
  amountToCharge: number;
  error?: string;
} {
  if (partner.billingType !== 'auto_bill' && partner.billingType !== 'invoice') {
    return { 
      success: false, 
      newUsageCount: partner.currentMonthUsage, 
      amountToCharge: 0,
      error: 'Not an auto-bill or invoice partner' 
    };
  }
  
  const pricePerTest = partner.pricePerAssessment || 500; // cents
  return {
    success: true,
    newUsageCount: partner.currentMonthUsage + 1,
    amountToCharge: pricePerTest,
  };
}

function calculateMonthEndBilling(partner: MockPartner): {
  shouldBill: boolean;
  totalAmount: number;
  testsUsed: number;
} {
  if (!partner.isActive || partner.currentMonthUsage === 0) {
    return { shouldBill: false, totalAmount: 0, testsUsed: 0 };
  }
  
  if (partner.billingType !== 'auto_bill' && partner.billingType !== 'invoice') {
    return { shouldBill: false, totalAmount: 0, testsUsed: 0 };
  }
  
  const pricePerTest = partner.pricePerAssessment || 500; // cents
  return {
    shouldBill: true,
    totalAmount: partner.currentMonthUsage * pricePerTest,
    testsUsed: partner.currentMonthUsage,
  };
}

function calculatePrepaidCreditsAfterTopUp(currentBalance: number, creditsToAdd: number): number {
  return currentBalance + creditsToAdd;
}

function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getPreviousMonthKey(date: Date = new Date()): string {
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

describe('Partner Billing Logic', () => {
  describe('Prepaid Billing Model', () => {
    const prepaidPartner: MockPartner = {
      id: 'partner-1',
      companyName: 'Test Corp',
      billingType: 'prepaid',
      prepaidBalance: 10,
      currentMonthUsage: 0,
      pricePerAssessment: 500,
      isActive: true,
    };

    it('should deduct 1 credit for each test usage', () => {
      const result = calculatePrepaidDeduction(prepaidPartner);
      
      expect(result.success).toBe(true);
      // INTENTIONALLY FAILING TEST - to verify CI/CD blocks deployment on test failure
      expect(result.newBalance).toBe(999);
    });

    it('should reject deduction when balance is 0', () => {
      const emptyPartner = { ...prepaidPartner, prepaidBalance: 0 };
      const result = calculatePrepaidDeduction(emptyPartner);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No prepaid credits remaining');
      expect(result.newBalance).toBe(0);
    });

    it('should reject deduction for negative balance', () => {
      const negativePartner = { ...prepaidPartner, prepaidBalance: -1 };
      const result = calculatePrepaidDeduction(negativePartner);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No prepaid credits remaining');
    });

    it('should correctly add prepaid credits after top-up', () => {
      const currentBalance = 5;
      const creditsToAdd = 100;
      
      const newBalance = calculatePrepaidCreditsAfterTopUp(currentBalance, creditsToAdd);
      
      expect(newBalance).toBe(105);
    });

    it('should handle adding credits to zero balance', () => {
      const currentBalance = 0;
      const creditsToAdd = 50;
      
      const newBalance = calculatePrepaidCreditsAfterTopUp(currentBalance, creditsToAdd);
      
      expect(newBalance).toBe(50);
    });
  });

  describe('Auto-Bill Model', () => {
    const autoBillPartner: MockPartner = {
      id: 'partner-2',
      companyName: 'Auto Corp',
      billingType: 'auto_bill',
      prepaidBalance: 0,
      currentMonthUsage: 5,
      pricePerAssessment: 500,
      isActive: true,
      stripeCustomerId: 'cus_test123',
      billingCycleAnchor: 1,
    };

    it('should increment usage count for each test', () => {
      const result = calculateUsageIncrement(autoBillPartner);
      
      expect(result.success).toBe(true);
      expect(result.newUsageCount).toBe(6);
      expect(result.amountToCharge).toBe(500);
    });

    it('should calculate correct month-end billing', () => {
      const result = calculateMonthEndBilling(autoBillPartner);
      
      expect(result.shouldBill).toBe(true);
      expect(result.testsUsed).toBe(5);
      expect(result.totalAmount).toBe(2500); // 5 tests × 500 cents = 2500 cents ($25)
    });

    it('should not bill inactive partners', () => {
      const inactivePartner = { ...autoBillPartner, isActive: false };
      const result = calculateMonthEndBilling(inactivePartner);
      
      expect(result.shouldBill).toBe(false);
      expect(result.totalAmount).toBe(0);
    });

    it('should not bill partners with zero usage', () => {
      const noUsagePartner = { ...autoBillPartner, currentMonthUsage: 0 };
      const result = calculateMonthEndBilling(noUsagePartner);
      
      expect(result.shouldBill).toBe(false);
      expect(result.totalAmount).toBe(0);
    });

    it('should use custom price per assessment when set', () => {
      const customPricePartner = { ...autoBillPartner, pricePerAssessment: 750 };
      const result = calculateMonthEndBilling(customPricePartner);
      
      expect(result.totalAmount).toBe(3750); // 5 tests × 750 cents = 3750 cents
    });
  });

  describe('Invoice Model', () => {
    const invoicePartner: MockPartner = {
      id: 'partner-3',
      companyName: 'Invoice Corp',
      billingType: 'invoice',
      prepaidBalance: 0,
      currentMonthUsage: 10,
      pricePerAssessment: 600,
      isActive: true,
      paymentTermsDays: 30,
    };

    it('should increment usage count for each test', () => {
      const result = calculateUsageIncrement(invoicePartner);
      
      expect(result.success).toBe(true);
      expect(result.newUsageCount).toBe(11);
    });

    it('should calculate correct month-end billing for invoice', () => {
      const result = calculateMonthEndBilling(invoicePartner);
      
      expect(result.shouldBill).toBe(true);
      expect(result.testsUsed).toBe(10);
      expect(result.totalAmount).toBe(6000); // 10 tests × 600 cents
    });

    it('should handle large usage volumes', () => {
      const highVolume = { ...invoicePartner, currentMonthUsage: 1000 };
      const result = calculateMonthEndBilling(highVolume);
      
      expect(result.shouldBill).toBe(true);
      expect(result.testsUsed).toBe(1000);
      expect(result.totalAmount).toBe(600000); // 1000 tests × 600 cents = $6000
    });
  });

  describe('Month Key Generation', () => {
    it('should generate correct month key format', () => {
      const date = new Date(2025, 11, 26); // December 26, 2025
      const key = getMonthKey(date);
      
      expect(key).toBe('2025-12');
    });

    it('should pad single-digit months', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      const key = getMonthKey(date);
      
      expect(key).toBe('2025-01');
    });

    it('should calculate previous month key correctly', () => {
      const date = new Date(2025, 11, 26); // December 26, 2025
      const key = getPreviousMonthKey(date);
      
      expect(key).toBe('2025-11');
    });

    it('should handle year rollback for January', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      const key = getPreviousMonthKey(date);
      
      expect(key).toBe('2024-12');
    });
  });

  describe('Billing Type Validation', () => {
    it('should reject prepaid deduction for auto-bill partners', () => {
      const partner: MockPartner = {
        id: 'partner-4',
        companyName: 'Mixed Corp',
        billingType: 'auto_bill',
        prepaidBalance: 10,
        currentMonthUsage: 0,
        pricePerAssessment: 500,
        isActive: true,
      };
      
      const result = calculatePrepaidDeduction(partner);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not a prepaid partner');
    });

    it('should reject usage increment for prepaid partners', () => {
      const partner: MockPartner = {
        id: 'partner-5',
        companyName: 'Prepaid Corp',
        billingType: 'prepaid',
        prepaidBalance: 10,
        currentMonthUsage: 0,
        pricePerAssessment: 500,
        isActive: true,
      };
      
      const result = calculateUsageIncrement(partner);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not an auto-bill or invoice partner');
    });

    it('should not generate month-end bill for prepaid partners', () => {
      const partner: MockPartner = {
        id: 'partner-6',
        companyName: 'Prepaid Corp',
        billingType: 'prepaid',
        prepaidBalance: 10,
        currentMonthUsage: 5, // Even with usage, should not bill
        pricePerAssessment: 500,
        isActive: true,
      };
      
      const result = calculateMonthEndBilling(partner);
      
      expect(result.shouldBill).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle default price when pricePerAssessment is 0', () => {
      const partner: MockPartner = {
        id: 'partner-7',
        companyName: 'Default Price Corp',
        billingType: 'auto_bill',
        prepaidBalance: 0,
        currentMonthUsage: 5,
        pricePerAssessment: 0,
        isActive: true,
      };
      
      // When price is 0, should use default of 500 cents
      const result = calculateUsageIncrement(partner);
      expect(result.amountToCharge).toBe(500);
    });

    it('should handle very large prepaid balances', () => {
      const partner: MockPartner = {
        id: 'partner-8',
        companyName: 'Big Balance Corp',
        billingType: 'prepaid',
        prepaidBalance: 1000000,
        currentMonthUsage: 0,
        pricePerAssessment: 500,
        isActive: true,
      };
      
      const result = calculatePrepaidDeduction(partner);
      
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(999999);
    });

    it('should calculate correct totals for fractional prices', () => {
      const partner: MockPartner = {
        id: 'partner-9',
        companyName: 'Fractional Corp',
        billingType: 'invoice',
        prepaidBalance: 0,
        currentMonthUsage: 3,
        pricePerAssessment: 333, // $3.33 per test
        isActive: true,
      };
      
      const result = calculateMonthEndBilling(partner);
      
      expect(result.totalAmount).toBe(999); // 3 × 333 = 999 cents
    });
  });
});
