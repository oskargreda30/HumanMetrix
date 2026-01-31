import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, FileText, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { isValidEmail, isValidName } from "@/lib/validation";
import type { BasketItem } from "@/contexts/BasketContext";

const assessments = [
  {
    id: "fit",
    name: "FIT Assessment",
    description: "15 questions • 6 behavioral skills",
    duration: "20 min",
  },
  {
    id: "ai_readiness",
    name: "AI Readiness Assessment",
    description: "21 questions • 9 AI skills",
    duration: "20 min",
  },
  {
    id: "prompt_architecture",
    name: "Prompt Architecture Assessment",
    description: "7 progressive levels",
    duration: "14 min",
  },
  {
    id: "aiq",
    name: "Algorithmic Integrity Quotient (AIQ)",
    description: "8 questions + rationales",
    duration: "20 min",
  },
];

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedAssessmentId?: string | null;
  basketItems?: BasketItem[];
}

export default function CheckoutModal({
  open,
  onOpenChange,
  preselectedAssessmentId,
  basketItems,
}: CheckoutModalProps) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedAssessments, setSelectedAssessments] = useState<Set<string>>(new Set());
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  // Helper to get CSRF token from cookie
  const getCsrfToken = (): string | null => {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const name = trimmed.substring(0, eqIndex);
      if (name === "csrf_token") {
        return trimmed.substring(eqIndex + 1);
      }
    }
    return null;
  };

  // Check if email exists when it changes (debounced)
  useEffect(() => {
    if (!email || isAuthenticated || !email.includes("@")) {
      setIsExistingUser(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const csrfToken = getCsrfToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (csrfToken) {
          headers["x-csrf-token"] = csrfToken;
        }
        const response = await fetch("/api/check-email-exists", {
          method: "POST",
          headers,
          body: JSON.stringify({ email: email.trim() }),
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setIsExistingUser(data.exists);
        }
      } catch (err) {
        console.error("Error checking email:", err);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, isAuthenticated]);

  useEffect(() => {
    if (!open) {
      // Reset all state when modal closes
      setSelectedAssessments(new Set());
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setIsExistingUser(false);
      setIsProcessing(false);
      setShowEmailConfirmation(false);
      return;
    }
    
    // Set initial selections when modal opens
    if (basketItems && basketItems.length > 0) {
      setSelectedAssessments(new Set(basketItems.map(item => item.id)));
    } else if (preselectedAssessmentId) {
      setSelectedAssessments(new Set([preselectedAssessmentId]));
    } else {
      setSelectedAssessments(new Set());
    }
  }, [preselectedAssessmentId, basketItems, open]);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedAssessments);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAssessments(newSelected);
  };

  // Validation logic - returns true if valid, false otherwise
  const validateForm = (): boolean => {
    if (selectedAssessments.size === 0) {
      toast({
        title: "No assessments selected",
        description: "Please select at least one assessment to continue.",
        variant: "destructive",
      });
      return false;
    }

    // Only validate form fields if not authenticated
    if (!isAuthenticated) {
      if (isExistingUser) {
        // Existing user detected - redirect to login immediately
        if (!password.trim()) {
          onOpenChange(false); // Close the modal
          window.location.href = `/login?email=${encodeURIComponent(email.trim())}&existing=true`;
          return false;
        }
      } else {
        // New user needs all fields
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
          toast({
            title: "Missing information",
            description: "Please fill in all fields (name and email).",
            variant: "destructive",
          });
          return false;
        }
        
        // Validate name format
        if (!isValidName(firstName)) {
          toast({
            title: "Invalid first name",
            description: "First name contains invalid characters.",
            variant: "destructive",
          });
          return false;
        }
        
        if (!isValidName(lastName)) {
          toast({
            title: "Invalid last name",
            description: "Last name contains invalid characters.",
            variant: "destructive",
          });
          return false;
        }
      }

      // Validate email format with proper regex
      if (!isValidEmail(email)) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  // Show email confirmation before proceeding (for new users)
  const handleProceedClick = () => {
    if (!validateForm()) return;
    
    // For authenticated users, proceed directly (their email is already verified)
    // For existing users with password, proceed directly (they already have an account)
    // For new users, show email confirmation dialog
    if (isAuthenticated) {
      handleProceed();
    } else if (isExistingUser && password.trim()) {
      // Existing user has entered password, proceed to login+checkout
      handleProceed();
    } else if (!isExistingUser) {
      // New user - show email confirmation dialog
      setShowEmailConfirmation(true);
    }
    // Note: If isExistingUser but no password, validateForm already handles redirect to login
  };

  const handleProceed = async () => {
    setShowEmailConfirmation(false);
    
    // Use logged-in user's info if authenticated, otherwise use form data
    const userFirstName = isAuthenticated && user ? user.firstName : firstName.trim();
    const userLastName = isAuthenticated && user ? user.lastName : lastName.trim();
    const userEmail = isAuthenticated && user ? user.email : email.trim();

    setIsProcessing(true);

    try {
      const response = await fetch("/api/create-free-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentIds: Array.from(selectedAssessments),
          firstName: userFirstName,
          lastName: userLastName,
          email: userEmail,
          ...(isExistingUser && password ? { password } : {}),
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create account");
      }

      const data = await response.json();
      
      // Invalidate and refetch queries to refresh dashboard data
      await queryClient.invalidateQueries({ queryKey: ["/api/available-assessments"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/purchases-with-results"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Force refetch to ensure fresh data
      await queryClient.refetchQueries({ queryKey: ["/api/available-assessments"] });
      await queryClient.refetchQueries({ queryKey: ["/api/purchases-with-results"] });
      
      // Handle case where assessments are already in dashboard (user is now logged in)
      if (data.alreadyInDashboard) {
        toast({
          title: "Welcome back!",
          description: "You're now signed in. Your assessments are ready in your dashboard.",
          duration: 3000,
        });
        setIsProcessing(false);
        onOpenChange(false);
        // Use window.location to ensure full page reload with session
        window.location.href = "/dashboard";
        return;
      }
      
      toast({
        title: "Success!",
        description: isAuthenticated ? "Assessments added to your dashboard!" : data.message,
        duration: 3000,
      });

      // Reset processing state before navigation
      setIsProcessing(false);

      // Close modal and navigate
      onOpenChange(false);
      if (data.requiresLogin) {
        setTimeout(() => {
          setLocation("/login?message=check-email");
        }, 2000);
      } else {
        // For authenticated users, navigate immediately with refresh flag
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to process request. Please try again.";
      
      // If the error is about an existing account, redirect immediately to login
      if (errorMessage.includes("already exists")) {
        onOpenChange(false); // Close the modal
        const userEmail = email.trim();
        // Redirect immediately with email prefill and message flag
        window.location.href = `/login?email=${encodeURIComponent(userEmail)}&existing=true`;
        return;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            {isAuthenticated ? "Add More Assessments" : "Get Started with HumanMetrix"}
          </DialogTitle>
          <DialogDescription>
            {isAuthenticated 
              ? "Select additional assessments to add to your dashboard."
              : "Choose your assessments and enter your details. Take all assessments for free, pay only to unlock results."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assessment Selection */}
          <div>
            <h3 className="font-semibold mb-3">Choose Assessments</h3>
            <div className="space-y-2">
              {assessments.map((assessment) => (
                <Card
                  key={assessment.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedAssessments.has(assessment.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover-elevate'
                  }`}
                  onClick={() => handleToggle(assessment.id)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && e.currentTarget === e.target) {
                      e.preventDefault();
                      handleToggle(assessment.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedAssessments.has(assessment.id)}
                  data-testid={`checkout-card-${assessment.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`checkout-${assessment.id}`}
                      checked={selectedAssessments.has(assessment.id)}
                      onCheckedChange={() => handleToggle(assessment.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-labelledby={`checkout-title-${assessment.id}`}
                      data-testid={`checkout-checkbox-${assessment.id}`}
                    />
                    <div className="flex-1">
                      <div
                        id={`checkout-title-${assessment.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {assessment.name}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {assessment.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {assessment.duration}
                        </span>
                      </div>
                    </div>
                    {selectedAssessments.has(assessment.id) && (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Customer Details - Only show for non-authenticated users */}
          {!isAuthenticated && (
            <div>
              <h3 className="font-semibold mb-3">
                {isExistingUser ? "Welcome Back" : "Your Details"}
              </h3>
              <div className="space-y-4">
                {/* Email field - always shown first */}
                <div className="space-y-2">
                  <Label htmlFor="checkout-email">Email Address</Label>
                  <div className="relative">
                    <Input
                      id="checkout-email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="checkout-input-email"
                    />
                    {isCheckingEmail && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        Checking...
                      </span>
                    )}
                  </div>
                  {isExistingUser ? (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Account found! Enter your password to continue.
                    </p>
                  ) : email.includes("@") && !isCheckingEmail ? (
                    <p className="text-xs text-muted-foreground">
                      We'll send your login credentials to this email
                    </p>
                  ) : null}
                </div>

                {/* Password field - only for existing users */}
                {isExistingUser && (
                  <div className="space-y-2">
                    <Label htmlFor="checkout-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="checkout-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        data-testid="checkout-input-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-checkout-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <a
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      Forgot your password?
                    </a>
                  </div>
                )}

                {/* Name fields - only for new users */}
                {!isExistingUser && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-firstname">First Name</Label>
                      <Input
                        id="checkout-firstname"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        data-testid="checkout-input-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-lastname">Last Name</Label>
                      <Input
                        id="checkout-lastname"
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        data-testid="checkout-input-lastname"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Box - Different message based on user state */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              {isAuthenticated || isExistingUser ? "Adding to your account" : "What happens next?"}
            </p>
            <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              {isAuthenticated || isExistingUser ? (
                <>
                  <li>Assessments will be added to your dashboard</li>
                  <li>Complete and submit your results</li>
                  <li>Pay to unlock and download your results</li>
                </>
              ) : (
                <>
                  <li>We'll create an account and send you login details</li>
                  <li>Complete all selected assessments</li>
                  <li>Pay to unlock and download your results</li>
                </>
              )}
            </ol>
          </div>

          {/* Proceed Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleProceedClick}
            disabled={isProcessing || selectedAssessments.size === 0 || isCheckingEmail}
            data-testid="checkout-button-proceed"
          >
            {isProcessing ? "Processing..." : (
              isAuthenticated ? "Add to Dashboard" : (
                isExistingUser ? "Sign In & Add Tests" : "Get Started"
              )
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Email Confirmation Dialog */}
      <AlertDialog open={showEmailConfirmation} onOpenChange={setShowEmailConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Email Address</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Please confirm your email address is correct. Your login details and assessment results will be sent to:</p>
              <div className="bg-muted p-3 rounded-lg text-center">
                <p className="text-foreground font-medium text-lg">{email.trim()}</p>
              </div>
              <p className="text-sm">Make sure this is correct, as you won't be able to change it later.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-email-confirm-cancel">
              Edit Email
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleProceed} data-testid="button-email-confirm">
              Yes, This is Correct
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
