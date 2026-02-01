import { Switch, Route, Redirect } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BasketProvider } from "@/contexts/BasketContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import { OrganizationSchema } from "@/lib/seo";

// Critical path pages - load immediately for fast first paint
import Home from "@/pages/Home";
import Login from "@/pages/Login";

// Lazy load all other pages for faster initial bundle
const About = lazy(() => import("@/pages/About"));
const Assessments = lazy(() => import("@/pages/Assessments"));
const ForCandidates = lazy(() => import("@/pages/ForCandidates"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const EcosystemIndex = lazy(() => import("@/pages/EcosystemIndex"));
const CohortBenchmarking = lazy(() => import("@/pages/CohortBenchmarking"));
const Articles = lazy(() => import("@/pages/Articles"));
const ArticlePsychometricTests = lazy(() => import("@/pages/ArticlePsychometricTests"));
const ArticleRecruitmentTesting = lazy(() => import("@/pages/ArticleRecruitmentTesting"));
const ArticleHumanMetrixSuite = lazy(() => import("@/pages/ArticleHumanMetrixSuite"));
const ArticleFutureRoadmap = lazy(() => import("@/pages/ArticleFutureRoadmap"));
const ArticleAILiteracy = lazy(() => import("@/pages/ArticleAILiteracy"));
const ArticlePromptEngineering = lazy(() => import("@/pages/ArticlePromptEngineering"));
const WhitePaperFIT = lazy(() => import("@/pages/WhitePaperFIT"));
const WhitePaperAIReadiness = lazy(() => import("@/pages/WhitePaperAIReadiness"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Assessment = lazy(() => import("@/pages/Assessment"));
const Results = lazy(() => import("@/pages/Results"));
const MyResults = lazy(() => import("@/pages/MyResults"));
const Purchase = lazy(() => import("@/pages/Purchase"));
const PurchaseSuccess = lazy(() => import("@/pages/PurchaseSuccess"));
const PaymentCallback = lazy(() => import("@/pages/PaymentCallback"));
const PaymentCancelCallback = lazy(() => import("@/pages/PaymentCancelCallback"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const EULA = lazy(() => import("@/pages/EULA"));
const AdminInvitations = lazy(() => import("@/pages/AdminInvitations"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const GenerateSamplePDFs = lazy(() => import("@/pages/GenerateSamplePDFs"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const Developers = lazy(() => import("@/pages/Developers"));
const EmbedAssessment = lazy(() => import("@/pages/EmbedAssessment"));
const StartAssessment = lazy(() => import("@/pages/StartAssessment"));
const WidgetTest = lazy(() => import("@/pages/WidgetTest"));
const PartnerPackageSuccess = lazy(() => import("@/pages/PartnerPackageSuccess"));
const PartnerDashboard = lazy(() => import("@/pages/PartnerDashboard"));
const AcceptPartnerInvite = lazy(() => import("@/pages/AcceptPartnerInvite"));
const Team = lazy(() => import("@/pages/Team"));
const B2BResults = lazy(() => import("@/pages/B2BResults"));
const B2BResultsBundle = lazy(() => import("@/pages/B2BResultsBundle"));
const B2BPaymentCallback = lazy(() => import("@/pages/B2BPaymentCallback"));
const B2BPdfEmail = lazy(() => import("@/pages/B2BPdfEmail"));
const PartnerResult = lazy(() => import("@/pages/PartnerResult"));
const SampleIndividualReport = lazy(() => import("@/pages/SampleIndividualReport"));
const SampleComparisonReport = lazy(() => import("@/pages/SampleComparisonReport"));
const SampleRoleFitReport = lazy(() => import("@/pages/SampleRoleFitReport"));
const EcosystemSampleReport = lazy(() => import("@/pages/EcosystemSampleReport"));
const EcosystemStart = lazy(() => import("@/pages/EcosystemStart"));
const GuestInvite = lazy(() => import("@/pages/GuestInvite"));
const B2COnboarding = lazy(() => import("@/pages/B2COnboarding"));
const UnlockResults = lazy(() => import("@/pages/UnlockResults"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Pulsing brain logo loading fallback during page transitions
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 loader-pulse">
          <img src="/favicon.png" alt="HumanMetrix" className="w-full h-full object-contain" />
        </div>
        <p className="font-semibold text-lg">
          <span className="text-white">Human</span>
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Metrix</span>
        </p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/assessments" component={Assessments} />
        <Route path="/for-employers">
          {() => <Redirect to="/" />}
        </Route>
        <Route path="/for-candidates" component={ForCandidates} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/ecosystem-index" component={EcosystemIndex} />
        <Route path="/cohort-benchmarking" component={CohortBenchmarking} />
        <Route path="/ecosystem/sample-report" component={EcosystemSampleReport} />
        <Route path="/ecosystem/start" component={EcosystemStart} />
        <Route path="/sample-report/individual" component={SampleIndividualReport} />
        <Route path="/sample-report/comparison" component={SampleComparisonReport} />
        <Route path="/sample-report/role-fit" component={SampleRoleFitReport} />
        <Route path="/articles" component={Articles} />
        <Route path="/articles/how-to-pass-psychometric-tests-job-interviews" component={ArticlePsychometricTests} />
        <Route path="/articles/role-of-psychometric-testing-in-recruitment" component={ArticleRecruitmentTesting} />
        <Route path="/articles/humanmetrix-ai-assessment-suite" component={ArticleHumanMetrixSuite} />
        <Route path="/articles/future-of-ai-assessments-2026-roadmap" component={ArticleFutureRoadmap} />
        <Route path="/articles/why-ai-literacy-matters-recruitment" component={ArticleAILiteracy} />
        <Route path="/articles/prompt-engineering-skills-workplace" component={ArticlePromptEngineering} />
        <Route path="/articles/white-paper-fit-test" component={WhitePaperFIT} />
        <Route path="/articles/white-paper-ai-readiness-test" component={WhitePaperAIReadiness} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password/:token" component={ResetPassword} />
        <Route path="/dashboard">
          {() => (
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/assessment/:purchaseItemId">
          {() => (
            <ProtectedRoute>
              <Assessment />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/my-results">
          {() => (
            <ProtectedRoute>
              <MyResults />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/results/:id">
          {() => (
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/purchase" component={Purchase} />
        <Route path="/purchase/success" component={PurchaseSuccess} />
        <Route path="/payment-callback" component={PaymentCallback} />
        <Route path="/payment-cancel-callback" component={PaymentCancelCallback} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/eula" component={EULA} />
        <Route path="/team" component={Team} />
        <Route path="/news" component={Subscribe} />
        <Route path="/developers" component={Developers} />
        <Route path="/embed/assessment" component={EmbedAssessment} />
        <Route path="/start-assessment" component={StartAssessment} />
        <Route path="/b2b-results" component={B2BResults} />
        <Route path="/b2b-results/:sessionId" component={B2BResults} />
        <Route path="/b2b-results-bundle" component={B2BResultsBundle} />
        <Route path="/b2b-payment-callback" component={B2BPaymentCallback} />
        <Route path="/b2b-pdf-email/:sessionId" component={B2BPdfEmail} />
        <Route path="/admin">
          {() => <Redirect to="/admin/dashboard" />}
        </Route>
        <Route path="/admin/invitations">
          {() => (
            <ProtectedRoute requireAdmin>
              <AdminInvitations />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/admin/dashboard">
          {() => (
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/admin/generate-samples">
          {() => (
            <ProtectedRoute requireAdmin>
              <GenerateSamplePDFs />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/admin/widget-test" component={WidgetTest} />
        <Route path="/partner-package-success" component={PartnerPackageSuccess} />
        <Route path="/partner">
          {() => (
            <ProtectedRoute>
              <PartnerDashboard />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/partner/results/:sessionId">
          {() => (
            <ProtectedRoute>
              <PartnerResult />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/partner/accept-invite/:token" component={AcceptPartnerInvite} />
        <Route path="/invite/:token" component={GuestInvite} />
        <Route path="/unlock-results" component={UnlockResults} />
        <Route path="/onboarding" component={B2COnboarding} />
        
        {/* Redirects for old URLs (fixes Google Search Console 404s) */}
        <Route path="/candidate-portal">
          {() => <Redirect to="/login" />}
        </Route>
        <Route path="/tests">
          {() => <Redirect to="/assessments" />}
        </Route>
        <Route path="/contact">
          {() => <Redirect to="/about" />}
        </Route>
        <Route path="/terms-of-service">
          {() => <Redirect to="/terms" />}
        </Route>
        <Route path="/privacy-policy">
          {() => <Redirect to="/privacy" />}
        </Route>
        <Route path="/white-papers">
          {() => <Redirect to="/articles" />}
        </Route>
        <Route path="/subscribe">
          {() => <Redirect to="/purchase" />}
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <CurrencyProvider>
            <BasketProvider>
              <OrganizationSchema />
              <ScrollToTop />
              <Toaster />
              <Router />
            </BasketProvider>
          </CurrencyProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
