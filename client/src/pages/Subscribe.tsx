import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { SEO } from "@/lib/seo";

export default function Subscribe() {
  const [email, setEmail] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);

  const subscribeMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/marketing-optin", {
        email,
        source: "job_ad",
      });
      return response.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "You're subscribed!",
        description: "Thank you for signing up. Redirecting you now...",
      });
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    subscribeMutation.mutate(email);
  };

  return (
    <>
      <SEO
        title="Career Tips & Job Market Insights UK | HumanMetrix Newsletter"
        description="Subscribe to HumanMetrix (Human Metrix) for free career materials, job market insights UK, psychometric test tips & exclusive offers. Stay ahead with human metrics career advice and recruitment trends."
      />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
        
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        
        <Card className="relative w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
              {isSuccess ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <Mail className="w-8 h-8 text-white" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {isSuccess ? "You're All Set!" : "Stay Ahead in Your Career"}
            </CardTitle>
            <CardDescription className="text-slate-600 text-base mt-2">
              {isSuccess 
                ? "Thank you for subscribing. We'll be in touch soon!"
                : "Please enter your email to receive our free materials on career trends, along with insights, career tips, and any offers we're running at HumanMetrix."
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 text-base border-slate-200 focus:border-cyan-500 focus:ring-cyan-500"
                    data-testid="input-subscribe-email"
                    disabled={subscribeMutation.isPending}
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-base"
                  disabled={subscribeMutation.isPending}
                  data-testid="button-subscribe-submit"
                >
                  {subscribeMutation.isPending ? (
                    "Subscribing..."
                  ) : (
                    <>
                      Subscribe Now
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-slate-500 text-center mt-4">
                  By subscribing, you agree to receive marketing communications from HumanMetrix. 
                  You can unsubscribe at any time.
                </p>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-cyan-600 mb-4">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-medium">Redirecting to homepage...</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full animate-pulse" style={{ width: '100%' }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="absolute bottom-6 text-center text-slate-400 text-sm">
          <a href="/" className="hover:text-white transition-colors" data-testid="link-home">
            HumanMetrix
          </a>
          {" · "}AI-Powered Career Assessments
        </div>
      </div>
    </>
  );
}
