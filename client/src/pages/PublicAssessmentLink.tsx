import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, User, ArrowRight, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDarkBody } from "@/hooks/use-dark-body";

const ASSESSMENT_ICONS: Record<string, string> = {
  fit: "FIT",
  ai_readiness: "AIR",
  prompt_architecture: "PA",
  aiq: "AIQ",
};

const ASSESSMENT_COLORS: Record<string, string> = {
  fit: "from-cyan-500 to-blue-600",
  ai_readiness: "from-violet-500 to-purple-600",
  prompt_architecture: "from-emerald-500 to-teal-600",
  aiq: "from-orange-500 to-red-600",
};

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
    onSuccess: (data: { inviteToken: string; resumed: boolean }) => {
      setStep("redirecting");
      setTimeout(() => {
        setLocation(`/guest/invite/${data.inviteToken}`);
      }, 800);
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

  if (linkLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (linkError || !linkInfo) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-700 max-w-md w-full text-center">
          <CardContent className="p-8 space-y-4">
            <XCircle className="h-12 w-12 text-red-400 mx-auto" />
            <h2 className="text-xl font-semibold text-white">Link unavailable</h2>
            <p className="text-slate-400 text-sm">
              {(linkError as any)?.message || "This assessment link is no longer active or doesn't exist."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const colorClass = ASSESSMENT_COLORS[linkInfo.assessmentType] || "from-cyan-500 to-blue-600";
  const abbr = ASSESSMENT_ICONS[linkInfo.assessmentType] || "HM";

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className={`inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br ${colorClass} items-center justify-center mx-auto`}>
            <span className="text-white font-bold text-lg">{abbr}</span>
          </div>
          <div>
            <p className="text-slate-400 text-sm">{linkInfo.partnerName}</p>
            <h1 className="text-2xl font-bold text-white mt-1">{linkInfo.assessmentDisplayName}</h1>
          </div>
        </div>

        {step === "details" && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">Let's get started</CardTitle>
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
                      className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
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
                      className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  data-testid="button-send-otp"
                  disabled={sendOtpMutation.isPending}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium"
                >
                  {sendOtpMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code...</>
                  ) : (
                    <><ArrowRight className="mr-2 h-4 w-4" /> Continue</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "otp" && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
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
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  data-testid="button-verify-otp"
                  disabled={verifyOtpMutation.isPending || otp.length !== 6}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium"
                >
                  {verifyOtpMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" /> Verify & start</>
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

        {step === "redirecting" && (
          <Card className="bg-slate-900 border-slate-700 text-center">
            <CardContent className="p-8 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <div>
                <h2 className="text-xl font-semibold text-white">Verified!</h2>
                <p className="text-slate-400 text-sm mt-1">Starting your assessment...</p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400 mx-auto" />
            </CardContent>
          </Card>
        )}

        <p className="text-center text-slate-600 text-xs">
          Powered by <span className="text-slate-500 font-medium">HumanMetrix</span>
        </p>
      </div>
    </div>
  );
}
