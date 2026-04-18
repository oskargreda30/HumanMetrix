import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";

const COOKIE_CONSENT_KEY = "hm_cookie_consent";
const COOKIE_PREFS_KEY = "hm_cookie_prefs";

type ConsentValue = "accepted" | "rejected" | "custom" | null;
interface CookiePreferences {
  analytics: boolean;
  marketing: boolean;
}

function loadAnalytics(prefs: CookiePreferences) {
  if (typeof window === "undefined") return;

  if (prefs.analytics && !document.getElementById("ga-script")) {
    const gaId = "G-XMV28MSXR2";
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

  if (prefs.marketing && !document.getElementById("li-script")) {
    (window as any)._linkedin_partner_id = "8402980";
    (window as any)._linkedin_data_partner_ids =
      (window as any)._linkedin_data_partner_ids || [];
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
  if (stored === "accepted" || stored === "rejected" || stored === "custom")
    return stored;
  return null;
}

function getStoredPrefs(): CookiePreferences {
  if (typeof window === "undefined") return { analytics: false, marketing: false };
  try {
    const raw = localStorage.getItem(COOKIE_PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { analytics: false, marketing: false };
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = getStoredCookieConsent();
    if (stored === "accepted") {
      loadAnalytics({ analytics: true, marketing: true });
    } else if (stored === "custom") {
      const savedPrefs = getStoredPrefs();
      setPrefs(savedPrefs);
      loadAnalytics(savedPrefs);
    } else if (stored === "rejected") {
      // no-op
    } else {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    localStorage.setItem(
      COOKIE_PREFS_KEY,
      JSON.stringify({ analytics: true, marketing: true })
    );
    loadAnalytics({ analytics: true, marketing: true });
    setVisible(false);
    setManageOpen(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    localStorage.setItem(
      COOKIE_PREFS_KEY,
      JSON.stringify({ analytics: false, marketing: false })
    );
    setVisible(false);
    setManageOpen(false);
  };

  const handleSaveChanges = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "custom");
    localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(prefs));
    loadAnalytics(prefs);
    setVisible(false);
    setManageOpen(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Manage panel overlay */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{ visibility: manageOpen ? "visible" : "hidden" }}
      >
        {/* Dark backdrop covering right side */}
        <div
          className="absolute inset-0 bg-black/60 transition-opacity duration-300"
          style={{ opacity: manageOpen ? 1 : 0 }}
          onClick={() => setManageOpen(false)}
        />

        {/* Left slide-in panel */}
        <div
          className="absolute top-0 left-0 h-full w-80 max-w-full bg-[#1a1f2e] flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto"
          style={{ transform: manageOpen ? "translateX(0)" : "translateX(-100%)" }}
        >
          {/* Panel header */}
          <div className="flex items-start justify-between p-6 pb-4">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-white/90">
              Cookie Overview
            </h2>
            <button
              onClick={() => setManageOpen(false)}
              className="text-white/60 hover:text-white/90 transition-colors mt-0.5"
              aria-label="Close cookie settings"
              data-testid="button-cookie-manage-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel body */}
          <div className="px-6 pb-4 flex-1">
            <p className="text-xs text-white/55 leading-relaxed mb-6">
              This website uses cookies so we can provide you with an optimal user
              experience. Cookie information is stored in your browser and performs
              functions such as recognising you when you return and helping us
              understand which sections of the platform you find most interesting.
              You can adjust your preferences below. More information in our{" "}
              <Link href="/privacy" className="underline text-white/70 hover:text-white/90">
                Cookie Policy
              </Link>
              .
            </p>

            {/* Essential cookies */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-white/90 mb-2">
                Essential Cookies
              </h3>
              <p className="text-xs text-white/55 leading-relaxed mb-3">
                Essential cookies are required at all times so that we can save
                your preferences. These cookies do not collect any personal or
                sensitive information. The information they store is not sent to any
                third parties.
              </p>
              <div className="flex items-center gap-2">
                <Switch checked={true} disabled className="opacity-80" />
                <span className="text-xs font-medium tracking-widest uppercase text-white/70">
                  Always Enabled
                </span>
              </div>
            </div>

            {/* Analytics cookies */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-white/90 mb-2">
                Analytics Cookies
              </h3>
              <p className="text-xs text-white/55 leading-relaxed mb-3">
                We use Google Analytics to collect anonymous information such as the
                number of visitors and the most popular pages. Keeping this cookie
                enabled helps us improve our platform.
              </p>
              <div className="flex items-center gap-2">
                <Switch
                  checked={prefs.analytics}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
                  data-testid="toggle-cookie-analytics"
                />
                <span className="text-xs font-medium tracking-widest uppercase text-white/70">
                  {prefs.analytics ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            {/* Marketing cookies */}
            <div className="mb-8">
              <h3 className="text-xs font-semibold tracking-widest uppercase text-white/90 mb-2">
                Marketing Cookies
              </h3>
              <p className="text-xs text-white/55 leading-relaxed mb-3">
                Marketing cookies (LinkedIn Insight Tag) help us understand the
                effectiveness of our campaigns and show relevant content. No
                personal data is stored beyond what LinkedIn's platform collects.
              </p>
              <div className="flex items-center gap-2">
                <Switch
                  checked={prefs.marketing}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
                  data-testid="toggle-cookie-marketing"
                />
                <span className="text-xs font-medium tracking-widest uppercase text-white/70">
                  {prefs.marketing ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Panel action buttons */}
          <div className="px-6 pb-6 flex flex-col gap-2.5">
            <button
              onClick={handleAccept}
              className="w-full py-3 text-xs font-semibold tracking-widest uppercase rounded border border-white/35 text-white/75 hover:bg-white/10 transition-colors"
              data-testid="button-cookie-manage-enable-all"
            >
              Enable All
            </button>
            <button
              onClick={handleReject}
              className="w-full py-3 text-xs font-semibold tracking-widest uppercase rounded border border-white/35 text-white/75 hover:bg-white/10 transition-colors"
              data-testid="button-cookie-manage-reject-all"
            >
              Reject All
            </button>
            <button
              onClick={handleSaveChanges}
              className="w-full py-3 text-xs font-semibold tracking-widest uppercase rounded border border-white/35 text-white/75 hover:bg-white/10 transition-colors"
              data-testid="button-cookie-manage-save"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9997] bg-[#1a2033]/95 backdrop-blur-sm border-t border-white/10"
        role="dialog"
        aria-label="Cookie consent"
        data-testid="cookie-banner"
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: text */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/80 mb-1">
              We Use Cookies
            </p>
            <p className="text-xs text-white/50 leading-relaxed">
              We use cookies to improve your experience and to show you personalised
              content. You can allow all, reject or manage them individually. More
              information can be found in our{" "}
              <Link href="/privacy" className="underline text-white/70 hover:text-white/90">
                Cookie Policy
              </Link>
              .
            </p>
          </div>

          {/* Right: buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAccept}
              className="px-5 py-2.5 text-xs font-semibold tracking-widest uppercase rounded border border-white/35 text-white/75 hover:bg-white/10 transition-colors whitespace-nowrap"
              data-testid="button-cookie-accept"
            >
              Accept All
            </button>
            <button
              onClick={handleReject}
              className="px-5 py-2.5 text-xs font-semibold tracking-widest uppercase rounded border border-white/35 text-white/75 hover:bg-white/10 transition-colors whitespace-nowrap"
              data-testid="button-cookie-reject"
            >
              Reject
            </button>
            <button
              onClick={() => {
                setPrefs(getStoredPrefs());
                setManageOpen(true);
              }}
              className="px-5 py-2.5 text-xs font-semibold tracking-widest uppercase rounded border border-white/35 text-white/75 hover:bg-white/10 transition-colors whitespace-nowrap"
              data-testid="button-cookie-manage"
            >
              Manage
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
