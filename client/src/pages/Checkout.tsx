import { useEffect } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Checkout() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get("url");
    
    if (url) {
      // Redirect to Stripe checkout - use replace to prevent back button issues
      window.location.replace(url);
    } else {
      setLocation("/assessments");
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow py-16 flex items-center justify-center">
        <Card className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium">Redirecting to secure checkout...</p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
