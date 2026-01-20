import { Switch, Route, Redirect } from "wouter";
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
import Home from "@/pages/Home";
import About from "@/pages/About";
import Assessments from "@/pages/Assessments";
import ForEmployers from "@/pages/ForEmployers";
import EcosystemIndex from "@/pages/EcosystemIndex";
import Articles from "@/pages/Articles";
import ArticlePsychometricTests from "@/pages/ArticlePsychometricTests";
import ArticleRecruitmentTesting from "@/pages/ArticleRecruitmentTesting";
import WhitePaperFIT from "@/pages/WhitePaperFIT";
import WhitePaperAIReadiness from "@/pages/WhitePaperAIReadiness";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Assessment from "@/pages/Assessment";
import Results from "@/pages/Results";
import MyResults from "@/pages/MyResults";
import Purchase from "@/pages/Purchase";
import PurchaseSuccess from "@/pages/PurchaseSuccess";
import PaymentCallback from "@/pages/PaymentCallback";
import PaymentCancelCallback from "@/pages/PaymentCancelCallback";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import EULA from "@/pages/EULA";
import AdminInvitations from "@/pages/AdminInvitations";
import AdminDashboard from "@/pages/AdminDashboard";
import GenerateSamplePDFs from "@/pages/GenerateSamplePDFs";
import Subscribe from "@/pages/Subscribe";
import Developers from "@/pages/Developers";
import EmbedAssessment from "@/pages/EmbedAssessment";
import StartAssessment from "@/pages/StartAssessment";
import WidgetTest from "@/pages/WidgetTest";
import PartnerPackageSuccess from "@/pages/PartnerPackageSuccess";
import PartnerDashboard from "@/pages/PartnerDashboard";
import AcceptPartnerInvite from "@/pages/AcceptPartnerInvite";
import Team from "@/pages/Team";
import B2BResults from "@/pages/B2BResults";
import B2BPaymentCallback from "@/pages/B2BPaymentCallback";
import PartnerResult from "@/pages/PartnerResult";
import SampleIndividualReport from "@/pages/SampleIndividualReport";
import SampleComparisonReport from "@/pages/SampleComparisonReport";
import SampleRoleFitReport from "@/pages/SampleRoleFitReport";
import EcosystemSampleReport from "@/pages/EcosystemSampleReport";
import EcosystemStart from "@/pages/EcosystemStart";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/assessments" component={Assessments} />
      <Route path="/for-employers" component={ForEmployers} />
      <Route path="/ecosystem-index" component={EcosystemIndex} />
      <Route path="/ecosystem/sample-report" component={EcosystemSampleReport} />
      <Route path="/ecosystem/start" component={EcosystemStart} />
      <Route path="/sample-report/individual" component={SampleIndividualReport} />
      <Route path="/sample-report/comparison" component={SampleComparisonReport} />
      <Route path="/sample-report/role-fit" component={SampleRoleFitReport} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/how-to-pass-psychometric-tests-job-interviews" component={ArticlePsychometricTests} />
      <Route path="/articles/role-of-psychometric-testing-in-recruitment" component={ArticleRecruitmentTesting} />
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
      <Route path="/b2b-payment-callback" component={B2BPaymentCallback} />
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
