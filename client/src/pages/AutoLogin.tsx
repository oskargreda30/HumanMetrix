import { useEffect, useState } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function AutoLogin() {
  const [, params] = useRoute("/auto-login/:token");
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [error, setError] = useState<string | null>(null);

  const token = params?.token;
  const searchParams = new URLSearchParams(searchString);
  const rawRedirect = searchParams.get("redirect");
  
  const safeRedirect = (() => {
    if (!rawRedirect) return null;
    if (!rawRedirect.startsWith("/")) return null;
    if (rawRedirect.startsWith("//")) return null;
    if (rawRedirect.includes("://")) return null;
    return rawRedirect;
  })();

  useEffect(() => {
    if (!token) {
      setLocation("/login");
      return;
    }

    let cancelled = false;

    async function doAutoLogin() {
      try {
        const res = await apiRequest("POST", "/api/auth/auto-login", { token });
        const user = await res.json();

        if (cancelled) return;

        await queryClient.invalidateQueries({ queryKey: ["/api/user"] });

        if (safeRedirect) {
          setLocation(safeRedirect);
        } else if (user.role === 'partner_admin') {
          setLocation("/partner");
        } else if (user.role === 'super_admin') {
          setLocation("/admin");
        } else {
          setLocation("/dashboard");
        }
      } catch (err: any) {
        if (cancelled) return;
        
        try {
          const userRes = await fetch("/api/user", { credentials: "include" });
          if (userRes.ok) {
            const user = await userRes.json();
            if (user && user.id) {
              if (safeRedirect) {
                setLocation(safeRedirect);
              } else if (user.role === 'partner_admin') {
                setLocation("/partner");
              } else if (user.role === 'super_admin') {
                setLocation("/admin");
              } else {
                setLocation("/dashboard");
              }
              return;
            }
          }
        } catch {}
        
        const message = err?.message || "Auto-login failed. Please log in manually.";
        setError(message);
        setTimeout(() => setLocation("/login"), 3000);
      }
    }

    doAutoLogin();

    return () => { cancelled = true; };
  }, [token, setLocation, safeRedirect]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#0f2035] to-[#0a1628]">
      <div className="text-center" data-testid="auto-login-container">
        {error ? (
          <div className="space-y-4">
            <p className="text-red-400 text-lg" data-testid="text-auto-login-error">{error}</p>
            <p className="text-white/60 text-sm">Redirecting to login page...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
            <p className="text-white/80 text-lg" data-testid="text-auto-login-loading">Signing you in...</p>
          </div>
        )}
      </div>
    </div>
  );
}
