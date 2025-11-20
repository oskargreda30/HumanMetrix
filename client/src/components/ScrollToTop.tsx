import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    // Check if there's a hash fragment in the URL
    const hash = window.location.hash;
    
    if (hash) {
      // If there's a hash, try to scroll to that element
      const elementId = hash.replace('#', '');
      const element = document.getElementById(elementId);
      
      if (element) {
        // Small delay to ensure the page has rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        // If element not found, scroll to top
        window.scrollTo(0, 0);
      }
    } else {
      // No hash, scroll to top
      window.scrollTo(0, 0);
    }
  }, [location]);

  return null;
}
