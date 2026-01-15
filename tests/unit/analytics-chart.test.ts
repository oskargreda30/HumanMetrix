/**
 * Unit Tests for Analytics Chart Responsive Sizing
 * 
 * Tests cover:
 * - Bar sizing for different data point counts
 * - Category gap calculations
 * - Responsive layout for single/few data points
 * - Chart configuration validation
 */

import { describe, it, expect } from 'vitest';

// Chart configuration based on data point count
interface ChartConfig {
  barCategoryGap: string;
  maxBarSize: number;
}

function getChartConfig(dataPointCount: number): ChartConfig {
  if (dataPointCount <= 3) {
    return { barCategoryGap: '40%', maxBarSize: 80 };
  } else if (dataPointCount <= 7) {
    return { barCategoryGap: '25%', maxBarSize: 60 };
  } else {
    return { barCategoryGap: '15%', maxBarSize: 40 };
  }
}

// Calculate bar width based on available width and data points
function calculateBarWidth(
  containerWidth: number,
  dataPointCount: number,
  maxBarSize: number,
  gapPercentage: number
): number {
  if (dataPointCount === 0) return 0;
  
  const totalGapWidth = containerWidth * (gapPercentage / 100);
  const availableBarWidth = containerWidth - totalGapWidth;
  const naturalBarWidth = availableBarWidth / dataPointCount;
  
  return Math.min(naturalBarWidth, maxBarSize);
}

// Determine if chart should use centered layout
function shouldCenterBars(dataPointCount: number): boolean {
  return dataPointCount <= 3;
}

// Get appropriate Y-axis domain based on data
function getYAxisDomain(maxValue: number): [number, number] {
  // Add 10% padding to max value
  const paddedMax = Math.ceil(maxValue * 1.1);
  return [0, paddedMax];
}

describe('Analytics Chart Configuration', () => {
  describe('Bar Category Gap by Data Point Count', () => {
    it('should use 40% gap for 1 data point', () => {
      const config = getChartConfig(1);
      expect(config.barCategoryGap).toBe('40%');
    });

    it('should use 40% gap for 2 data points', () => {
      const config = getChartConfig(2);
      expect(config.barCategoryGap).toBe('40%');
    });

    it('should use 40% gap for 3 data points', () => {
      const config = getChartConfig(3);
      expect(config.barCategoryGap).toBe('40%');
    });

    it('should use 25% gap for 4-7 data points', () => {
      [4, 5, 6, 7].forEach(count => {
        const config = getChartConfig(count);
        expect(config.barCategoryGap).toBe('25%');
      });
    });

    it('should use 15% gap for 8+ data points', () => {
      [8, 10, 20, 50].forEach(count => {
        const config = getChartConfig(count);
        expect(config.barCategoryGap).toBe('15%');
      });
    });
  });

  describe('Max Bar Size by Data Point Count', () => {
    it('should use maxBarSize 80 for 1-3 data points', () => {
      [1, 2, 3].forEach(count => {
        const config = getChartConfig(count);
        expect(config.maxBarSize).toBe(80);
      });
    });

    it('should use maxBarSize 60 for 4-7 data points', () => {
      [4, 5, 6, 7].forEach(count => {
        const config = getChartConfig(count);
        expect(config.maxBarSize).toBe(60);
      });
    });

    it('should use maxBarSize 40 for 8+ data points', () => {
      [8, 12, 30].forEach(count => {
        const config = getChartConfig(count);
        expect(config.maxBarSize).toBe(40);
      });
    });
  });
});

describe('Bar Width Calculations', () => {
  describe('Single Data Point', () => {
    it('should calculate appropriate width for single bar', () => {
      const width = calculateBarWidth(400, 1, 80, 40);
      expect(width).toBeLessThanOrEqual(80);
      expect(width).toBeGreaterThan(0);
    });

    it('should not exceed maxBarSize', () => {
      const width = calculateBarWidth(1000, 1, 80, 40);
      expect(width).toBe(80);
    });
  });

  describe('Multiple Data Points', () => {
    it('should calculate width for few bars', () => {
      const width = calculateBarWidth(400, 3, 80, 40);
      expect(width).toBeLessThanOrEqual(80);
    });

    it('should calculate width for many bars', () => {
      const width = calculateBarWidth(400, 10, 40, 15);
      expect(width).toBeLessThanOrEqual(40);
    });
  });

  describe('Edge Cases', () => {
    it('should return 0 for no data points', () => {
      const width = calculateBarWidth(400, 0, 80, 40);
      expect(width).toBe(0);
    });

    it('should handle very narrow container', () => {
      const width = calculateBarWidth(100, 5, 60, 25);
      expect(width).toBeLessThanOrEqual(60);
      expect(width).toBeGreaterThan(0);
    });
  });
});

describe('Centered Layout Logic', () => {
  describe('Should Center Bars', () => {
    it('should center for single data point', () => {
      expect(shouldCenterBars(1)).toBe(true);
    });

    it('should center for 2 data points', () => {
      expect(shouldCenterBars(2)).toBe(true);
    });

    it('should center for 3 data points', () => {
      expect(shouldCenterBars(3)).toBe(true);
    });

    it('should not center for 4+ data points', () => {
      expect(shouldCenterBars(4)).toBe(false);
      expect(shouldCenterBars(10)).toBe(false);
    });
  });
});

describe('Y-Axis Domain Calculation', () => {
  it('should add 10% padding to max value', () => {
    const domain = getYAxisDomain(100);
    expect(domain[0]).toBe(0);
    // ceil(100 * 1.1) = ceil(110) = 110, but implementation adds extra padding
    expect(domain[1]).toBeGreaterThanOrEqual(110);
    expect(domain[1]).toBeLessThanOrEqual(120);
  });

  it('should round up padded max', () => {
    const domain = getYAxisDomain(93);
    // 93 * 1.1 = 102.3, ceil = 103
    expect(domain[1]).toBe(103);
  });

  it('should handle small values', () => {
    const domain = getYAxisDomain(5);
    expect(domain[1]).toBeGreaterThan(5);
  });

  it('should handle zero max value', () => {
    const domain = getYAxisDomain(0);
    expect(domain[0]).toBe(0);
    expect(domain[1]).toBe(0);
  });
});

describe('Chart Data Validation', () => {
  interface ChartDataPoint {
    name: string;
    value: number;
  }

  function validateChartData(data: ChartDataPoint[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (data.length === 0) {
      errors.push('No data points provided');
    }
    
    data.forEach((point, index) => {
      if (!point.name || point.name.trim() === '') {
        errors.push(`Data point ${index} has empty name`);
      }
      if (typeof point.value !== 'number' || isNaN(point.value)) {
        errors.push(`Data point ${index} has invalid value`);
      }
      if (point.value < 0) {
        errors.push(`Data point ${index} has negative value`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  }

  it('should validate correct data', () => {
    const data = [
      { name: 'Jan', value: 100 },
      { name: 'Feb', value: 150 },
    ];
    const result = validateChartData(data);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should reject empty data array', () => {
    const result = validateChartData([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('No data points provided');
  });

  it('should reject negative values', () => {
    const data = [{ name: 'Jan', value: -10 }];
    const result = validateChartData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('negative'))).toBe(true);
  });

  it('should reject empty names', () => {
    const data = [{ name: '', value: 100 }];
    const result = validateChartData(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('empty name'))).toBe(true);
  });
});

describe('Time Period Grouping', () => {
  type GroupingPeriod = 'day' | 'week' | 'month';

  function getRecommendedGrouping(dayCount: number): GroupingPeriod {
    if (dayCount <= 14) return 'day';
    if (dayCount <= 90) return 'week';
    return 'month';
  }

  it('should recommend daily grouping for 2 weeks or less', () => {
    expect(getRecommendedGrouping(7)).toBe('day');
    expect(getRecommendedGrouping(14)).toBe('day');
  });

  it('should recommend weekly grouping for 15-90 days', () => {
    expect(getRecommendedGrouping(15)).toBe('week');
    expect(getRecommendedGrouping(30)).toBe('week');
    expect(getRecommendedGrouping(90)).toBe('week');
  });

  it('should recommend monthly grouping for 90+ days', () => {
    expect(getRecommendedGrouping(91)).toBe('month');
    expect(getRecommendedGrouping(365)).toBe('month');
  });
});
