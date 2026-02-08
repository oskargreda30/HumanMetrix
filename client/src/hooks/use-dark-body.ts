import { useEffect } from "react";

const SLATE_900 = "#0f172a";

export function useDarkBody(color: string = SLATE_900) {
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = color;
    return () => {
      document.body.style.backgroundColor = originalBg;
    };
  }, [color]);
}
