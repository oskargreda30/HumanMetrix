// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

const { mockComponent, mockChildren, componentMock, uiMockProxy } = vi.hoisted(() => {
  const mockComponent = vi.fn(() => null);
  const mockChildren = vi.fn(({ children }: any) => children);
  const componentMock = () => ({
    default: mockComponent,
    __esModule: true,
  });
  const uiMockProxy = () => new Proxy({}, {
    get: (_target, prop) => {
      if (prop === '__esModule') return true;
      return mockChildren;
    },
  });
  return { mockComponent, mockChildren, componentMock, uiMockProxy };
});

vi.mock('wouter', () => ({
  useLocation: vi.fn(() => ['/', vi.fn()]),
  useRoute: vi.fn(() => [false, {}]),
  Link: mockChildren,
  Route: mockChildren,
  Switch: mockChildren,
  useParams: vi.fn(() => ({})),
  Redirect: mockComponent,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isError: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() })),
  QueryClient: vi.fn(),
  QueryClientProvider: mockChildren,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  getQueryFn: vi.fn(),
}));

vi.mock('@/hooks/use-user', () => ({
  useUser: vi.fn(() => ({ user: null, isLoading: false })),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isLoading: false, login: vi.fn(), logout: vi.fn() })),
  default: vi.fn(() => ({ user: null, isLoading: false, login: vi.fn(), logout: vi.fn() })),
}));

vi.mock('@/hooks/use-dark-body', () => ({
  useDarkBody: vi.fn(),
  default: vi.fn(),
}));

vi.mock('@/lib/seo', () => ({
  SEOHead: mockComponent,
  SEO: mockComponent,
  default: mockComponent,
}));

vi.mock('@/lib/validation', () => ({
  validateEmail: vi.fn(() => true),
  validatePassword: vi.fn(() => true),
  default: {},
}));

vi.mock('@/lib/assessmentSkills', () => ({
  default: {},
  getSkillInfo: vi.fn(),
  getSkillColor: vi.fn(() => '#000'),
  skillNames: {},
  assessmentSkills: [],
}));

vi.mock('@/lib/assessmentHelpers', () => ({
  default: {},
  getAssessmentType: vi.fn(),
  formatScore: vi.fn(),
  getAssessmentInfo: vi.fn(() => ({})),
}));

vi.mock('@/contexts/CurrencyContext', () => ({
  useCurrency: vi.fn(() => ({ currency: 'USD', rate: 1, symbol: '$', formatLocalPrice: vi.fn((p: number) => `$${p}`) })),
  CurrencyProvider: mockChildren,
}));

vi.mock('@/contexts/BasketContext', () => ({
  useBasket: vi.fn(() => ({ basket: [], addToBasket: vi.fn(), removeFromBasket: vi.fn(), clearBasket: vi.fn() })),
  BasketProvider: mockChildren,
}));

vi.mock('@/data/aiq-questions', () => ({
  default: [],
  aiqQuestions: [],
}));

vi.mock('../data/prompt-architecture-questions', () => ({
  default: [],
}));

vi.mock('@shared/schema', () => ({
  default: {},
  users: {},
  assessments: {},
  insertUserSchema: { parse: vi.fn() },
}));

vi.mock('@shared/questions', () => ({
  default: [],
}));

vi.mock('recharts', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true;
    return vi.fn(({ children }: any) => children || null);
  },
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => ''),
  formatDistance: vi.fn(() => ''),
  parseISO: vi.fn(() => new Date()),
  isAfter: vi.fn(() => false),
  isBefore: vi.fn(() => false),
  addDays: vi.fn(() => new Date()),
  subDays: vi.fn(() => new Date()),
  differenceInDays: vi.fn(() => 0),
  startOfMonth: vi.fn(() => new Date()),
  endOfMonth: vi.fn(() => new Date()),
  isValid: vi.fn(() => true),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: mockChildren,
  CardElement: mockComponent,
  useStripe: vi.fn(() => null),
  useElements: vi.fn(() => null),
  PaymentElement: mockComponent,
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn: any) => fn),
    formState: { errors: {}, isSubmitting: false },
    watch: vi.fn(),
    setValue: vi.fn(),
    reset: vi.fn(),
    control: {},
    getValues: vi.fn(() => ({})),
    trigger: vi.fn(),
  })),
  Controller: mockComponent,
  useFieldArray: vi.fn(() => ({ fields: [], append: vi.fn(), remove: vi.fn() })),
}));

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}));

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true;
    return vi.fn(() => null);
  },
}));

vi.mock('react-icons/si', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true;
    return vi.fn(() => null);
  },
}));

const componentMock = () => ({
  default: mockComponent,
  __esModule: true,
});

vi.mock('@/components/Navigation', componentMock);
vi.mock('@/components/Footer', componentMock);
vi.mock('@/components/ContactFormDialog', () => ({ default: mockComponent, ContactFormDialog: mockComponent }));
vi.mock('@/components/SkillsLegend', () => ({ default: mockComponent, SkillsLegend: mockComponent }));
vi.mock('@/components/HeroSection', componentMock);
vi.mock('@/components/RoadmapSection', componentMock);
vi.mock('@/components/SampleReportsSection', componentMock);
vi.mock('@/components/AssessmentCard', () => ({ default: mockComponent, AssessmentCard: mockComponent }));
vi.mock('@/components/AssessmentCompletionDialog', componentMock);
vi.mock('@/components/B2BPricingCalculator', componentMock);
vi.mock('@/components/CheckoutModal', componentMock);
vi.mock('@/components/DeveloperSubTabs', componentMock);
vi.mock('@/components/HiringPipelineTab', componentMock);
vi.mock('@/components/PartnerTermsAcceptanceDialog', componentMock);
vi.mock('@/components/PartnerTour', componentMock);
vi.mock('@/components/PdfImportModal', componentMock);
vi.mock('@/components/PromptArchitectureResults', componentMock);
vi.mock('@/components/ResultsPaymentGate', componentMock);
vi.mock('@/components/ResultsRetentionConsentDialog', componentMock);

vi.mock('@/components/admin/AccountingTab', componentMock);
vi.mock('@/components/admin/AnalyticsTab', componentMock);
vi.mock('@/components/admin/AppLogsTab', componentMock);
vi.mock('@/components/admin/AssessmentFunnelTab', componentMock);
vi.mock('@/components/admin/AuditLogTab', componentMock);
vi.mock('@/components/admin/BillingTab', componentMock);
vi.mock('@/components/admin/BugReportsTab', componentMock);
vi.mock('@/components/admin/CandidatesTab', componentMock);
vi.mock('@/components/admin/CompareTab', componentMock);
vi.mock('@/components/admin/EmailLogsTab', componentMock);
vi.mock('@/components/admin/GoldenSetTab', componentMock);
vi.mock('@/components/admin/HealthTab', componentMock);
vi.mock('@/components/admin/IndividualReportTab', componentMock);
vi.mock('@/components/admin/InvitationsTab', componentMock);
vi.mock('@/components/admin/OrganizationsTab', componentMock);
vi.mock('@/components/admin/OverviewTab', componentMock);
vi.mock('@/components/admin/PartnerHealthTab', componentMock);
vi.mock('@/components/admin/PartnersTab', componentMock);
vi.mock('@/components/admin/PlatformStatsTab', componentMock);
vi.mock('@/components/admin/ProfitAnalyticsTab', componentMock);
vi.mock('@/components/admin/RevenueDashboardTab', componentMock);
vi.mock('@/components/admin/RoleFitTab', componentMock);
vi.mock('@/components/admin/SecurityTab', componentMock);
vi.mock('@/components/admin/SessionsTab', componentMock);
vi.mock('@/components/admin/SystemSettingsTab', componentMock);
vi.mock('@/components/admin/UsageTab', componentMock);
vi.mock('@/components/admin/UserActivityAnalyticsTab', componentMock);
vi.mock('@/components/admin/WidgetTestTab', componentMock);

vi.mock('@/components/partner/BulkInvitationsTab', componentMock);
vi.mock('@/components/partner/PartnerAnalysisTab', componentMock);
vi.mock('@/components/partner/PartnerMultiCandidateRoleFitTab', componentMock);
vi.mock('@/components/partner/PartnerResultsTab', componentMock);

vi.mock('@/components/ecosystem/EcosystemAutoProject', componentMock);
vi.mock('@/components/ecosystem/EcosystemProjectSelector', componentMock);
vi.mock('@/components/ecosystem/EcosystemWorkflow', componentMock);

vi.mock('@/components/shared/AdditionalServicesSection', componentMock);
vi.mock('@/components/shared/CohortBenchmarking', componentMock);
vi.mock('@/components/shared/CriticalSkillsAnalysis', componentMock);
vi.mock('@/components/shared/SharedCompareTab', componentMock);
vi.mock('@/components/shared/SharedIndividualReport', componentMock);
vi.mock('@/components/shared/SharedSingleCandidateRoleFit', componentMock);

const uiMockProxy = () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true;
    return mockChildren;
  },
});

vi.mock('@/components/ui/card', uiMockProxy);
vi.mock('@/components/ui/button', () => ({
  Button: mockChildren,
  buttonVariants: vi.fn(() => ''),
}));
vi.mock('@/components/ui/badge', uiMockProxy);
vi.mock('@/components/ui/input', uiMockProxy);
vi.mock('@/components/ui/label', uiMockProxy);
vi.mock('@/components/ui/progress', uiMockProxy);
vi.mock('@/components/ui/checkbox', uiMockProxy);
vi.mock('@/components/ui/textarea', uiMockProxy);
vi.mock('@/components/ui/tabs', uiMockProxy);
vi.mock('@/components/ui/separator', uiMockProxy);
vi.mock('@/components/ui/dialog', uiMockProxy);
vi.mock('@/components/ui/select', uiMockProxy);
vi.mock('@/components/ui/radio-group', uiMockProxy);
vi.mock('@/components/ui/form', uiMockProxy);
vi.mock('@/components/ui/tooltip', uiMockProxy);
vi.mock('@/components/ui/toaster', uiMockProxy);
vi.mock('@/components/ui/accordion', uiMockProxy);
vi.mock('@/components/ui/alert', uiMockProxy);
vi.mock('@/components/ui/table', uiMockProxy);
vi.mock('@/components/ui/switch', uiMockProxy);
vi.mock('@/components/ui/avatar', uiMockProxy);
vi.mock('@/components/ui/scroll-area', uiMockProxy);
vi.mock('@/components/ui/dropdown-menu', uiMockProxy);
vi.mock('@/components/ui/skeleton', uiMockProxy);
vi.mock('@/components/ui/sidebar', uiMockProxy);
vi.mock('@/components/ui/collapsible', uiMockProxy);
vi.mock('@/components/ui/popover', uiMockProxy);
vi.mock('@/components/ui/calendar', uiMockProxy);
vi.mock('@/components/ui/sheet', uiMockProxy);
vi.mock('@/components/ui/slider', uiMockProxy);
vi.mock('@/components/ui/toggle', uiMockProxy);
vi.mock('@/components/ui/toggle-group', uiMockProxy);
vi.mock('@/components/ui/hover-card', uiMockProxy);
vi.mock('@/components/ui/aspect-ratio', uiMockProxy);

const pageFiles = [
  'About',
  'AcceptPartnerInvite',
  'AdminDashboard',
  'AdminInvitations',
  'ArticleAILiteracy',
  'ArticleFutureRoadmap',
  'ArticleHumanMetrixSuite',
  'ArticlePromptEngineering',
  'ArticlePsychometricTests',
  'ArticleRecruitmentTesting',
  'Articles',
  'Assessment',
  'Assessments',
  'AutoLogin',
  'B2BPaymentCallback',
  'B2BPdfEmail',
  'B2BResults',
  'B2BResultsBundle',
  'B2COnboarding',
  'Checkout',
  'CheckoutSuccess',
  'CohortBenchmarking',
  'Dashboard',
  'Developers',
  'EcosystemIndex',
  'EcosystemSampleReport',
  'EcosystemStart',
  'EmbedAssessment',
  'EULA',
  'ForCandidates',
  'ForEmployers',
  'ForgotPassword',
  'GenerateSamplePDFs',
  'GuestInvite',
  'Home',
  'Login',
  'MyResults',
  'not-found',
  'PartnerDashboard',
  'PartnerPackageSuccess',
  'PartnerReportView',
  'PartnerResult',
  'PaymentCallback',
  'PaymentCancelCallback',
  'Pricing',
  'Privacy',
  'Purchase',
  'PurchaseSuccess',
  'ResetPassword',
  'Results',
  'SampleComparisonReport',
  'SampleIndividualReport',
  'SampleMultiCandidateRoleFitReport',
  'SampleRoleFitReport',
  'StartAssessment',
  'Subscribe',
  'Team',
  'Terms',
  'UnlockResults',
  'WhitePaperAIReadiness',
  'WhitePaperFIT',
  'WidgetTest',
];

describe('Page component exports', () => {
  it(`should have ${pageFiles.length} page files to test`, () => {
    expect(pageFiles.length).toBe(62);
  });

  for (const pageName of pageFiles) {
    it(`should export ${pageName} as default`, async () => {
      const mod = await import(`../../client/src/pages/${pageName}`);
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });
  }
});
