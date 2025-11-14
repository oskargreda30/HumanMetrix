import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BasketProvider } from "@/contexts/BasketContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Assessments from "@/pages/Assessments";
import ForEmployers from "@/pages/ForEmployers";
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
import Terms from "@/pages/Terms";
import AdminInvitations from "@/pages/AdminInvitations";
import AdminDashboard from "@/pages/AdminDashboard";
import GenerateSamplePDFs from "@/pages/GenerateSamplePDFs";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/assessments" component={Assessments} />
      <Route path="/for-employers" component={ForEmployers} />
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
      <Route path="/terms" component={Terms} />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BasketProvider>
          <Toaster />
          <Router />
        </BasketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
