import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { Link } from "wouter";

const COOKIE_CONSENT_KEY = "hm_cookie_consent";

type ConsentValue = "accepted" | "rejected" | null;

function loadAnalytics() {
  if (typeof window === "undefined") return;

  // Google Analytics
  const gaId = "G-XMV28MSXR2";
  if (!document.getElementById("ga-script")) {
    const gtagScript = document.createElement("script");
    gtagScript.id = "ga-script";
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(gtagScript);

    const gtagInline = document.createElement("script");
    gtagInline.id = "ga-inline";
    gtagInline.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(gtagInline);
  }

  // LinkedIn Insight Tag
  if (!document.getElementById("li-script")) {
    (window as any)._linkedin_partner_id = "8402980";
    (window as any)._linkedin_data_partner_ids = (window as any)._linkedin_data_partner_ids || [];
    (window as any)._linkedin_data_partner_ids.push("8402980");

    const liScript = document.createElement("script");
    liScript.id = "li-script";
    liScript.type = "text/javascript";
    liScript.async = true;
    liScript.text = `
      (function(l) {
        if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
        window.lintrk.q=[]}
        var s = document.getElementsByTagName("script")[0];
        var b = document.createElement("script");
        b.type = "text/javascript"; b.async = true;
        b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
        s.parentNode.insertBefore(b, s);
      })(window.lintrk);
    `;
    document.head.appendChild(liScript);
  }
}

export function getStoredCookieConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (stored === "accepted" || stored === "rejected") return stored;
  return null;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredCookieConsent();
    if (stored === "accepted") {
      loadAnalytics();
      setVisible(false);
    } else if (stored === "rejected") {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    loadAnalytics();
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-background border-t border-border shadow-lg"
      role="dialog"
      aria-label="Cookie consent"
      data-testid="cookie-banner"
    >
      <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            We use cookies to improve your experience and measure how our platform is used. Analytics and marketing cookies (Google Analytics, LinkedIn Insight Tag) are only loaded with your consent.{" "}
            <Link href="/privacy" className="underline text-foreground hover:text-foreground/80">
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            data-testid="button-cookie-reject"
          >
            Reject Non-Essential
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            data-testid="button-cookie-accept"
          >
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}
