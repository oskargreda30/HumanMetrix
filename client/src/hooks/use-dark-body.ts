import { useEffect } from "react";

const SLATE_900 = "#0f172a";

const DARK_PATH_PATTERNS = [
  '/start-assessment',
  '/embed/assessment',
  '/invite/',
  '/b2b-payment-callback',
  '/guest-invite/',
];

function isCurrentPathDark(): boolean {
  const p = window.location.pathname;
  return DARK_PATH_PATTERNS.some(pattern => p.includes(pattern));
}

export function useDarkBody(color: string = SLATE_900) {
  useEffect(() => {
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;
    return () => {
      if (!isCurrentPathDark()) {
        document.documentElement.style.backgroundColor = "";
        document.body.style.backgroundColor = "";
      }
    };
  }, [color]);
}
