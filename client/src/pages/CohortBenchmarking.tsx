import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, CheckCircle, Bell, Clock } from "lucide-react";
import { Link } from "wouter";
import { SEO } from "@/lib/seo";

export default function CohortBenchmarking() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Cohort Benchmarking - Coming Soon | HumanMetrix"
        description="Compare your team's performance against industry benchmarks and similar cohorts. Coming soon to HumanMetrix."
        canonical="/cohort-benchmarking"
        keywords="cohort benchmarking, team comparison, industry benchmarks, performance metrics"
      />
      <Navigation />
      
      <main className="flex-grow py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-6" data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-1.5 text-sm border-amber-500/40 text-amber-700 bg-amber-50">
              <Clock className="mr-2 h-4 w-4 inline" />
              Coming Soon
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" data-testid="text-page-title">
              Cohort Benchmarking
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Compare your team's performance against industry benchmarks and similar cohorts to identify competitive advantages.
            </p>
          </div>

          <Card className="p-8 md:p-12 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent mb-8">
            <div className="text-center mb-10">
              <div className="h-20 w-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">We're Building Something Great</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Our Cohort Benchmarking service is currently in development. Soon you'll be able to benchmark 
                your team's capabilities against industry standards and peer organizations.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="text-center p-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold mb-2">Industry Benchmarks</h3>
                <p className="text-sm text-muted-foreground">Compare against sector-specific performance data</p>
              </div>
              <div className="text-center p-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold mb-2">Percentile Rankings</h3>
                <p className="text-sm text-muted-foreground">See exactly where your team ranks across key metrics</p>
              </div>
              <div className="text-center p-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold mb-2">Competitive Intelligence</h3>
                <p className="text-sm text-muted-foreground">Identify strengths and opportunities relative to market</p>
              </div>
            </div>

            <div className="text-center border-t pt-8">
              <h3 className="font-semibold mb-3 flex items-center justify-center gap-2">
                <Bell className="h-5 w-5 text-amber-600" />
                Interested in Early Access?
              </h3>
              <p className="text-muted-foreground mb-6">
                Book a consultation to learn more about our upcoming Cohort Benchmarking service and be notified when it launches.
              </p>
              <a href="https://calendly.com/hello-humanmetrix/30min" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-amber-600 text-white" data-testid="button-book-consultation">
                  Book a Consultation
                </Button>
              </a>
            </div>
          </Card>

          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              In the meantime, explore our available team analysis services:
            </p>
            <Link href="/ecosystem-index">
              <Button variant="outline" data-testid="button-ecosystem-index">
                Learn About The Ecosystem Index
              </Button>
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
