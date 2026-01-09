import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [, params] = useRoute("/reset-password/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = params?.token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await apiRequest("POST", "/api/reset-password", {
        token,
        newPassword,
      });
      
      setResetSuccess(true);
      toast({
        title: "Success",
        description: "Password reset successfully!",
      });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Token may be invalid or expired.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0a1628]">
        <Navigation />
        <main className="flex-grow flex items-center justify-center py-16">
          <div className="w-full max-w-md px-4">
            <Card className="p-6 bg-[#1a2744]/50 border-cyan-400/20 text-center">
              <p className="text-white mb-4">Invalid reset link</p>
              <Link href="/forgot-password">
                <a className="text-cyan-400 hover:text-cyan-300" data-testid="link-request-new">
                  Request a new reset link
                </a>
              </Link>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628]">
      <Navigation />
      <main className="flex-grow flex items-center justify-center py-16">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">Set New Password</h1>
            <p className="text-blue-100/70">
              Create a strong password for your account
            </p>
          </div>

          <Card className="p-6 bg-[#1a2744]/50 border-cyan-400/20">
            {!resetSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-white">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      data-testid="input-new-password"
                      className="bg-[#0f1f38] border-cyan-400/30 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-100/60 hover:text-white"
                      data-testid="button-toggle-new-password"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-blue-100/60">
                    Minimum 8 characters
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-white">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      data-testid="input-confirm-password"
                      className="bg-[#0f1f38] border-cyan-400/30 text-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-100/60 hover:text-white"
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-reset-password"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
                
                <div className="text-center">
                  <Link href="/login">
                    <a className="text-sm text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-2" data-testid="link-back-to-login">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Login
                    </a>
                  </Link>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Password Reset!</h3>
                  <p className="text-sm text-blue-100/70">
                    Your password has been successfully reset.
                  </p>
                  <p className="text-xs text-blue-100/60 mt-4">
                    Redirecting to login...
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
