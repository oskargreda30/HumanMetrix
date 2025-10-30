import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await apiRequest("POST", "/api/request-password-reset", {
        email,
      });
      
      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: "If the email exists, a password reset link has been sent.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628]">
      <Navigation />
      <main className="flex-grow flex items-center justify-center py-16">
        <div className="w-full max-w-md px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-white">Reset Password</h1>
            <p className="text-blue-100/70">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <Card className="p-6 bg-[#1a2744]/50 border-cyan-400/20">
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-reset-email"
                    className="bg-[#0f1f38] border-cyan-400/30 text-white"
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-request-reset"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
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
                  <Mail className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Check Your Email</h3>
                  <p className="text-sm text-blue-100/70">
                    We've sent a password reset link to <strong className="text-cyan-400">{email}</strong>
                  </p>
                  <p className="text-xs text-blue-100/60 mt-4">
                    The link will expire in 1 hour. Didn't receive it? Check your spam folder.
                  </p>
                </div>
                
                <div className="pt-4">
                  <Link href="/login">
                    <a className="text-sm text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-2" data-testid="link-back-to-login-success">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Login
                    </a>
                  </Link>
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
