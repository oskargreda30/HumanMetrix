// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

vi.mock('wouter', () => ({
  Link: () => null,
  useLocation: () => ['/', () => {}],
  Switch: () => null,
  Route: () => null,
  Redirect: () => null,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: null, isLoading: false }),
  useMutation: () => ({ mutate: () => {}, isPending: false }),
  QueryClientProvider: ({ children }: any) => children,
}));

vi.mock('react-helmet-async', () => ({
  HelmetProvider: ({ children }: any) => children,
  Helmet: () => null,
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { setQueryData: () => {}, refetchQueries: () => {}, invalidateQueries: () => {} },
  apiRequest: () => {},
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: () => {} }),
}));

vi.mock('@/contexts/BasketContext', () => ({
  useBasket: () => ({ clearBasket: () => {}, items: [] }),
  BasketProvider: ({ children }: any) => children,
}));

vi.mock('@/contexts/CurrencyContext', () => ({
  CurrencyProvider: ({ children }: any) => children,
  useCurrency: () => ({ currency: 'USD' }),
}));

vi.mock('@/components/BasketSheet', () => ({ default: () => null }));
vi.mock('@/components/ProtectedRoute', () => ({ ProtectedRoute: ({ children }: any) => children }));
vi.mock('@/components/ScrollToTop', () => ({ default: () => null }));
vi.mock('@/lib/seo', () => ({ OrganizationSchema: () => null }));

vi.mock('@/lib/validation', () => ({
  isValidEmail: () => true,
  isValidName: () => true,
}));

vi.mock('@/lib/assessmentSkills', () => ({
  FIT_SKILLS: [
    { key: 'adaptability', displayName: 'Adaptability', description: 'Test desc' },
  ],
  AI_READINESS_SKILLS: [
    { key: 'dataLiteracy', displayName: 'Data Literacy', description: 'Test desc' },
  ],
  SKILL_ACRONYMS: { 'Adaptability': 'AD', 'Data Literacy': 'DL' },
}));

vi.mock('@/components/ui/button', () => ({ Button: () => null }));
vi.mock('@/components/ui/card', () => ({
  Card: () => null,
  CardContent: () => null,
  CardHeader: () => null,
  CardTitle: () => null,
  CardDescription: () => null,
}));
vi.mock('@/components/ui/badge', () => ({ Badge: () => null }));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: () => null,
  DialogContent: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
  DialogDescription: () => null,
}));
vi.mock('@/components/ui/input', () => ({ Input: () => null }));
vi.mock('@/components/ui/textarea', () => ({ Textarea: () => null }));
vi.mock('@/components/ui/label', () => ({ Label: () => null }));
vi.mock('@/components/ui/toaster', () => ({ Toaster: () => null }));
vi.mock('@/components/ui/tooltip', () => ({ TooltipProvider: ({ children }: any) => children }));

vi.mock('@/pages/Home', () => ({ default: () => null }));
vi.mock('@/pages/Login', () => ({ default: () => null }));

vi.mock('lucide-react', () => ({
  Menu: () => null,
  X: () => null,
  LogOut: () => null,
  User: () => null,
  Mail: () => null,
  Calendar: () => null,
  ArrowRight: () => null,
  MessageSquare: () => null,
  Loader2: () => null,
  Send: () => null,
  Bug: () => null,
  Upload: () => null,
  Image: () => null,
  BookOpen: () => null,
  Brain: () => null,
  Target: () => null,
  Shield: () => null,
  Lightbulb: () => null,
}));

vi.mock('react-icons/si', () => ({
  SiLinkedin: () => null,
  SiFacebook: () => null,
  SiInstagram: () => null,
}));

import Navigation from '../../client/src/components/Navigation';
import Footer from '../../client/src/components/Footer';
import SkillsLegend, {
  PROMPT_ARCHITECTURE_DIMENSIONS,
  AIQ_BANDS,
  ALL_SKILLS_FOR_PDF,
} from '../../client/src/components/SkillsLegend';
import App from '../../client/src/App';

describe('Component Exports', () => {
  describe('Navigation', () => {
    it('should export a default function component', () => {
      expect(Navigation).toBeDefined();
      expect(typeof Navigation).toBe('function');
    });
  });

  describe('Footer', () => {
    it('should export a default function component', () => {
      expect(Footer).toBeDefined();
      expect(typeof Footer).toBe('function');
    });
  });

  describe('SkillsLegend', () => {
    it('should export a default function component', () => {
      expect(SkillsLegend).toBeDefined();
      expect(typeof SkillsLegend).toBe('function');
    });

    it('should export PROMPT_ARCHITECTURE_DIMENSIONS as an array with correct shape', () => {
      expect(Array.isArray(PROMPT_ARCHITECTURE_DIMENSIONS)).toBe(true);
      expect(PROMPT_ARCHITECTURE_DIMENSIONS.length).toBe(5);
      PROMPT_ARCHITECTURE_DIMENSIONS.forEach((dim) => {
        expect(dim).toHaveProperty('key');
        expect(dim).toHaveProperty('displayName');
        expect(dim).toHaveProperty('description');
        expect(typeof dim.key).toBe('string');
        expect(typeof dim.displayName).toBe('string');
        expect(typeof dim.description).toBe('string');
      });
    });

    it('should export AIQ_BANDS as an array with scoring band data', () => {
      expect(Array.isArray(AIQ_BANDS)).toBe(true);
      expect(AIQ_BANDS.length).toBe(4);
      AIQ_BANDS.forEach((band) => {
        expect(band).toHaveProperty('range');
        expect(band).toHaveProperty('title');
        expect(band).toHaveProperty('description');
        expect(typeof band.range).toBe('string');
        expect(typeof band.title).toBe('string');
        expect(typeof band.description).toBe('string');
      });
    });

    it('should export ALL_SKILLS_FOR_PDF with expected structure', () => {
      expect(ALL_SKILLS_FOR_PDF).toBeDefined();
      expect(ALL_SKILLS_FOR_PDF).toHaveProperty('fit');
      expect(ALL_SKILLS_FOR_PDF).toHaveProperty('aiReadiness');
      expect(ALL_SKILLS_FOR_PDF).toHaveProperty('promptArchitecture');
      expect(ALL_SKILLS_FOR_PDF).toHaveProperty('aiqBands');
      expect(Array.isArray(ALL_SKILLS_FOR_PDF.fit)).toBe(true);
      expect(Array.isArray(ALL_SKILLS_FOR_PDF.aiReadiness)).toBe(true);
      expect(Array.isArray(ALL_SKILLS_FOR_PDF.promptArchitecture)).toBe(true);
      expect(Array.isArray(ALL_SKILLS_FOR_PDF.aiqBands)).toBe(true);
    });

    it('should include acronym field in ALL_SKILLS_FOR_PDF.fit entries', () => {
      ALL_SKILLS_FOR_PDF.fit.forEach((skill) => {
        expect(skill).toHaveProperty('acronym');
        expect(typeof skill.acronym).toBe('string');
      });
    });
  });

  describe('App', () => {
    it('should export a default function component', () => {
      expect(App).toBeDefined();
      expect(typeof App).toBe('function');
    });
  });
});
