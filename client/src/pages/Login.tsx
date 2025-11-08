import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await apiRequest("POST", "/api/login", {
        email: loginEmail,
        password: loginPassword,
      });
      
      // Invalidate auth query to refetch user data
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid email or password",
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
            <h1 className="text-3xl font-bold mb-2 text-white">Welcome to HumanMetrix</h1>
            <p className="text-blue-100/70">
              Sign in to access your assessments and results
            </p>
          </div>

          <Card className="p-6 bg-[#1a2744]/50 border-cyan-400/20">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-white">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  data-testid="input-login-email"
                  className="bg-[#0f1f38] border-cyan-400/30 text-white"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-white">Password</Label>
                  <a 
                    href="/forgot-password" 
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  data-testid="input-login-password"
                  className="bg-[#0f1f38] border-cyan-400/30 text-white"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login-submit"
              >
                {isLoading ? "Logging in..." : "Sign In"}
              </Button>
            </form>
            
            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
              <p className="text-sm text-cyan-100 mb-2">
                <strong>Demo Admin Account:</strong>
              </p>
              <p className="text-xs text-blue-100/70 font-mono">
                Email: admin@humanmetrix.com<br />
                Password: admin123
              </p>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
