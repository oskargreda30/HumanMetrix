import { useEffect } from "react";

const SLATE_900 = "#0f172a";
const DEFAULT_THEME_COLOR = "#0ea5e9";

const DARK_PATH_PATTERNS = [
  '/start-assessment',
  '/embed/assessment',
  '/assessment/',
  '/invite/',
  '/b2b-payment-callback',
  '/guest-invite/',
];

function isCurrentPathDark(): boolean {
  const p = window.location.pathname;
  return DARK_PATH_PATTERNS.some(pattern => p.includes(pattern));
}

function setThemeColor(color: string) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color);
}

export function useDarkBody(color: string = SLATE_900) {
  useEffect(() => {
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
    setThemeColor(color);
    return () => {
      if (!isCurrentPathDark()) {
        document.documentElement.style.backgroundColor = "";
        document.body.style.backgroundColor = "";
        setThemeColor(DEFAULT_THEME_COLOR);
      }
    };
  }, [color]);
}
