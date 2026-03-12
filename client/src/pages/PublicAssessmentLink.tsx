import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, ClipboardList, Mail, User, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoSymbol from "@assets/Gemini_Generated_Image_misel3misel3mise-removebg-preview_1762775600899.png";
import { useDarkBody } from "@/hooks/use-dark-body";

interface LinkInfo {
  assessmentType: string;
  assessmentDisplayName: string;
  partnerName: string;
  linkId: string;
}

type Step = "details" | "otp" | "redirecting";

export default function PublicAssessmentLink() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  useDarkBody();

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const { data: linkInfo, isLoading: linkLoading, error: linkError } = useQuery<LinkInfo>({
    queryKey: ["/api/public/join", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/join/${token}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Link not found");
      }
      return res.json();
    },
    retry: false,
    enabled: !!token,
  });

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/join/${token}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send code");
      }
      return res.json();
    },
    onSuccess: () => {
      setStep("otp");
      toast({ title: "Code sent", description: `Check your inbox at ${email}` });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send code", description: err.message, variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/join/${token}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), otp: otp.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Verification failed");
      }
      return res.json();
    },
    onSuccess: (data: { inviteToken: string }) => {
      setStep("redirecting");
      setTimeout(() => setLocation(`/guest/invite/${data.inviteToken}`), 800);
    },
    onError: (err: any) => {
      toast({ title: "Incorrect code", description: err.message, variant: "destructive" });
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast({ title: "Please enter your name", variant: "destructive" });
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return toast({ title: "Please enter a valid email address", variant: "destructive" });
    sendOtpMutation.mutate();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) return toast({ title: "Enter the 6-digit code", variant: "destructive" });
    verifyOtpMutation.mutate();
  };

  const primaryColor = "#0891b2";
  const companyName = linkInfo?.partnerName || "HumanMetrix";

  if (linkLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900 z-50">
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

  if (linkError || !linkInfo) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 p-4">
        <Card className="max-w-md w-full bg-slate-800 border-slate-700">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Unable to Access Link</h2>
            <p className="text-slate-400">
              {(linkError as any)?.message || "This assessment link is no longer active or doesn't exist."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "redirecting") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900 z-50">
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

  return (
    <div className="min-h-[100dvh] bg-slate-900 pt-3 md:pt-8 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: primaryColor }}
          >
            {companyName}
          </h1>
          <p className="text-slate-400">{linkInfo.assessmentDisplayName}</p>
        </div>

        {step === "details" && (
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5" style={{ color: primaryColor }} />
                Let's get started
              </CardTitle>
              <CardDescription className="text-slate-400">
                Enter your details — we'll send a quick verification code to your email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-slate-300">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="name"
                      data-testid="input-candidate-name"
                      placeholder="Your full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="pl-9 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-300">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      data-testid="input-candidate-email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-9 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  data-testid="button-send-otp"
                  disabled={sendOtpMutation.isPending}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full mt-4 hover:opacity-90"
                  size="lg"
                >
                  {sendOtpMutation.isPending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending code...</>
                  ) : (
                    <><ArrowRight className="mr-2 h-5 w-5" /> Continue</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "otp" && (
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" style={{ color: primaryColor }} />
                Verify your email
              </CardTitle>
              <CardDescription className="text-slate-400">
                We sent a 6-digit code to <span className="text-slate-300 font-medium">{email}</span>. It expires in 10 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="otp" className="text-slate-300">Verification code</Label>
                  <Input
                    id="otp"
                    data-testid="input-otp-code"
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  data-testid="button-verify-otp"
                  disabled={verifyOtpMutation.isPending || otp.length !== 6}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full mt-4 hover:opacity-90"
                  size="lg"
                >
                  {verifyOtpMutation.isPending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-5 w-5" /> Verify & start</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  data-testid="button-resend-otp"
                  disabled={sendOtpMutation.isPending}
                  onClick={() => sendOtpMutation.mutate()}
                  className="w-full text-slate-400 hover:text-slate-300"
                >
                  {sendOtpMutation.isPending ? "Sending..." : "Resend code"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  data-testid="button-back-to-details"
                  onClick={() => { setStep("details"); setOtp(""); }}
                  className="w-full text-slate-500 hover:text-slate-400 text-sm"
                >
                  Change email address
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col items-center justify-center gap-1 text-sm text-slate-500" data-testid="footer-branding">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <img src={logoSymbol} alt="HumanMetrix Logo" className="h-8 w-8" />
            <span className="text-cyan-500">HumanMetrix</span>
          </div>
          <span>AI Assessment Platform</span>
        </div>
      </div>
    </div>
  );
}
