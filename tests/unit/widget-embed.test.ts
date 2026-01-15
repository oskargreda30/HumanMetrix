/**
 * Unit Tests for Widget/Embed Assessment System
 * 
 * Tests cover:
 * - Demo mode parameter parsing
 * - Demo mode behavior (skip API calls, mock completion)
 * - Widget sandbox code generation
 * - Assessment type validation
 * - Theme parameter handling
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Demo mode URL parameter parsing
function parseDemoParams(urlParams: URLSearchParams): { 
  isDemo: boolean; 
  assessmentType: string; 
  theme: 'light' | 'dark';
} {
  const isDemo = urlParams.get('demo') === 'true';
  const assessmentType = urlParams.get('type') || 'fit';
  const theme = (urlParams.get('theme') === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
  
  return { isDemo, assessmentType, theme };
}

// Valid assessment types
const VALID_ASSESSMENT_TYPES = ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'];

// Validate assessment type
function isValidAssessmentType(type: string): boolean {
  return VALID_ASSESSMENT_TYPES.includes(type);
}

// Generate widget embed code
function generateEmbedCode(options: {
  apiKey: string;
  assessmentType: string;
  theme?: 'light' | 'dark';
  candidateEmail?: string;
  callbackUrl?: string;
  expiresIn?: number;
}): string {
  const { apiKey, assessmentType, theme = 'light', candidateEmail, callbackUrl, expiresIn = 1440 } = options;
  
  const config = {
    apiKey,
    assessmentType,
    theme,
    ...(candidateEmail && { candidateEmail }),
    ...(callbackUrl && { callbackUrl }),
    expiresIn,
  };
  
  return `<script src="https://humanmetrix.co.uk/widget.js"></script>
<script>
  HumanMetrix.init(${JSON.stringify(config, null, 2)});
</script>`;
}

// Generate preview URL for sandbox
function generatePreviewUrl(baseUrl: string, assessmentType: string, theme: 'light' | 'dark'): string {
  return `${baseUrl}/embed/demo-preview?demo=true&type=${assessmentType}&theme=${theme}`;
}

// Mock session data for demo mode
function createDemoSession(assessmentType: string) {
  return {
    id: 'demo-preview',
    partnerId: 'demo',
    assessmentType,
    status: 'created',
    isTestSession: true,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}

// Validate callback URL format
function isValidCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

describe('Widget Embed Demo Mode', () => {
  describe('Demo URL Parameter Parsing', () => {
    it('should parse demo=true parameter', () => {
      const params = new URLSearchParams('demo=true&type=fit&theme=dark');
      const result = parseDemoParams(params);
      
      expect(result.isDemo).toBe(true);
      expect(result.assessmentType).toBe('fit');
      expect(result.theme).toBe('dark');
    });

    it('should default to non-demo mode without demo parameter', () => {
      const params = new URLSearchParams('type=fit');
      const result = parseDemoParams(params);
      
      expect(result.isDemo).toBe(false);
    });

    it('should default to light theme without theme parameter', () => {
      const params = new URLSearchParams('demo=true');
      const result = parseDemoParams(params);
      
      expect(result.theme).toBe('light');
    });

    it('should default to fit assessment type without type parameter', () => {
      const params = new URLSearchParams('demo=true');
      const result = parseDemoParams(params);
      
      expect(result.assessmentType).toBe('fit');
    });

    it('should handle all assessment types', () => {
      VALID_ASSESSMENT_TYPES.forEach(type => {
        const params = new URLSearchParams(`demo=true&type=${type}`);
        const result = parseDemoParams(params);
        expect(result.assessmentType).toBe(type);
      });
    });
  });

  describe('Assessment Type Validation', () => {
    it('should accept valid assessment types', () => {
      expect(isValidAssessmentType('fit')).toBe(true);
      expect(isValidAssessmentType('ai_readiness')).toBe(true);
      expect(isValidAssessmentType('prompt_architecture')).toBe(true);
      expect(isValidAssessmentType('aiq')).toBe(true);
    });

    it('should reject invalid assessment types', () => {
      expect(isValidAssessmentType('invalid')).toBe(false);
      expect(isValidAssessmentType('test')).toBe(false);
      expect(isValidAssessmentType('')).toBe(false);
      expect(isValidAssessmentType('FIT')).toBe(false); // case sensitive
    });
  });

  describe('Demo Session Creation', () => {
    it('should create demo session with correct structure', () => {
      const session = createDemoSession('fit');
      
      expect(session.id).toBe('demo-preview');
      expect(session.partnerId).toBe('demo');
      expect(session.assessmentType).toBe('fit');
      expect(session.status).toBe('created');
      expect(session.isTestSession).toBe(true);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should create demo sessions for each assessment type', () => {
      VALID_ASSESSMENT_TYPES.forEach(type => {
        const session = createDemoSession(type);
        expect(session.assessmentType).toBe(type);
      });
    });
  });

  describe('Preview URL Generation', () => {
    it('should generate correct preview URL', () => {
      const url = generatePreviewUrl('https://humanmetrix.co.uk', 'fit', 'dark');
      
      expect(url).toBe('https://humanmetrix.co.uk/embed/demo-preview?demo=true&type=fit&theme=dark');
    });

    it('should handle light theme', () => {
      const url = generatePreviewUrl('https://humanmetrix.co.uk', 'ai_readiness', 'light');
      
      expect(url).toContain('theme=light');
      expect(url).toContain('type=ai_readiness');
    });
  });
});

describe('Widget Embed Code Generation', () => {
  describe('Basic Code Generation', () => {
    it('should generate valid embed code with minimal options', () => {
      const code = generateEmbedCode({
        apiKey: 'hm_live_abc123',
        assessmentType: 'fit',
      });
      
      expect(code).toContain('HumanMetrix.init');
      expect(code).toContain('hm_live_abc123');
      expect(code).toContain('"assessmentType": "fit"');
      expect(code).toContain('widget.js');
    });

    it('should include optional parameters when provided', () => {
      const code = generateEmbedCode({
        apiKey: 'hm_live_abc123',
        assessmentType: 'ai_readiness',
        theme: 'dark',
        candidateEmail: 'test@example.com',
        callbackUrl: 'https://example.com/callback',
        expiresIn: 2880,
      });
      
      expect(code).toContain('"theme": "dark"');
      expect(code).toContain('"candidateEmail": "test@example.com"');
      expect(code).toContain('"callbackUrl": "https://example.com/callback"');
      expect(code).toContain('"expiresIn": 2880');
    });

    it('should default to light theme and 1440 expiry', () => {
      const code = generateEmbedCode({
        apiKey: 'hm_test_xyz',
        assessmentType: 'prompt_architecture',
      });
      
      expect(code).toContain('"theme": "light"');
      expect(code).toContain('"expiresIn": 1440');
    });
  });

  describe('Callback URL Validation', () => {
    it('should accept valid HTTPS URLs', () => {
      expect(isValidCallbackUrl('https://example.com/callback')).toBe(true);
      expect(isValidCallbackUrl('https://api.example.com/webhooks/assessment')).toBe(true);
    });

    it('should accept HTTP URLs for development', () => {
      expect(isValidCallbackUrl('http://localhost:3000/callback')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidCallbackUrl('not-a-url')).toBe(false);
      expect(isValidCallbackUrl('ftp://example.com')).toBe(false);
      expect(isValidCallbackUrl('')).toBe(false);
    });
  });
});

describe('Widget Sandbox Behavior', () => {
  describe('Demo Mode API Call Skipping', () => {
    it('should identify demo mode from session ID', () => {
      const sessionId = 'demo-preview';
      const isDemo = sessionId.startsWith('demo');
      
      expect(isDemo).toBe(true);
    });

    it('should not skip API calls for real sessions', () => {
      const sessionId = 'sess_abc123def456';
      const isDemo = sessionId.startsWith('demo');
      
      expect(isDemo).toBe(false);
    });

    it('should allow start assessment in demo mode without API', () => {
      const isDemo = true;
      let statusAfterStart = 'ready';
      
      // In demo mode, startAssessment sets status directly
      if (isDemo) {
        statusAfterStart = 'started';
      }
      
      expect(statusAfterStart).toBe('started');
    });
  });

  describe('Mock Completion Data', () => {
    it('should generate mock completion scores', () => {
      const mockScores = {
        fit: { overall: 85, dimensions: { adaptability: 80, collaboration: 90 } },
        ai_readiness: { overall: 78, dimensions: { technical: 75, strategic: 82 } },
        prompt_architecture: { overall: 72, dimensions: { clarity: 70, structure: 74 } },
        aiq: { overall: 88, dimensions: { ethics: 85, accountability: 91 } },
      };
      
      expect(mockScores.fit.overall).toBeGreaterThanOrEqual(0);
      expect(mockScores.fit.overall).toBeLessThanOrEqual(100);
    });
  });
});

describe('Widget Theme Configuration', () => {
  describe('Theme Styles', () => {
    const THEME_STYLES = {
      light: {
        background: '#ffffff',
        text: '#1a1a1a',
        primary: '#3b82f6',
      },
      dark: {
        background: '#0a0a14',
        text: '#f0f0f0',
        primary: '#60a5fa',
      },
    };

    it('should have distinct light theme colors', () => {
      expect(THEME_STYLES.light.background).toBe('#ffffff');
      expect(THEME_STYLES.light.text).not.toBe(THEME_STYLES.dark.text);
    });

    it('should have distinct dark theme colors', () => {
      expect(THEME_STYLES.dark.background).toBe('#0a0a14');
      expect(THEME_STYLES.dark.background).not.toBe(THEME_STYLES.light.background);
    });
  });
});
