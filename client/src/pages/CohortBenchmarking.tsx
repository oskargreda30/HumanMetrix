import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Users, CheckCircle, Bell, Clock, Building2, MessageSquare, Shield, Mail, ArrowRight, Calendar } from "lucide-react";
import { Link } from "wouter";
import { SEO } from "@/lib/seo";

export default function CohortBenchmarking() {
  const CALENDLY_URL = "https://calendly.com/hello-humanmetrix/30min";
  const [showContactDialog, setShowContactDialog] = useState(false);
  const contactEnquiryMessage = encodeURIComponent("Hi, I'm interested in learning more about HumanMetrix Cohort Benchmarking. Please send me details when it becomes available.");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO 
        title="Cohort Benchmarking - Coming Soon | HumanMetrix"
        description="Compare your team's performance against industry benchmarks and similar cohorts. Coming soon to HumanMetrix."
        canonical="/cohort-benchmarking"
        keywords="cohort benchmarking, team comparison, industry benchmarks, performance metrics"
      />
      <Navigation />
      
      <main className="flex-grow py-8 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-4 md:mb-6" data-testid="button-back-home">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="text-center mb-8 md:mb-12">
            <Badge variant="outline" className="mb-3 md:mb-4 px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-sm border-amber-500/40 text-amber-700 bg-amber-50">
              <Clock className="mr-1.5 md:mr-2 h-3 w-3 md:h-4 md:w-4 inline" />
              Coming Soon
            </Badge>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4" data-testid="text-page-title">
              Cohort Benchmarking
            </h1>
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Compare your team's performance against industry benchmarks and similar cohorts to identify competitive advantages.
            </p>
          </div>

          <Card className="p-5 md:p-12 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent mb-6 md:mb-8">
            <div className="text-center mb-8 md:mb-10">
              <div className="h-14 w-14 md:h-20 md:w-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Users className="h-7 w-7 md:h-10 md:w-10 text-amber-600" />
              </div>
              <h2 className="text-lg md:text-2xl font-semibold mb-3 md:mb-4">We're Building Something Great</h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
                Our Cohort Benchmarking service is currently in development. Soon you'll be able to benchmark 
                your team's capabilities against industry standards and peer organizations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
              <div className="text-center p-3 md:p-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2">Industry Benchmarks</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Compare against sector-specific performance data</p>
              </div>
              <div className="text-center p-3 md:p-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2">Percentile Rankings</h3>
                <p className="text-xs md:text-sm text-muted-foreground">See exactly where your team ranks across key metrics</p>
              </div>
              <div className="text-center p-3 md:p-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
                </div>
                <h3 className="font-semibold text-sm md:text-base mb-1 md:mb-2">Competitive Intelligence</h3>
                <p className="text-xs md:text-sm text-muted-foreground">Identify strengths and opportunities relative to market</p>
              </div>
            </div>

            <div className="text-center border-t pt-6 md:pt-8">
              <h3 className="font-semibold text-sm md:text-base mb-2 md:mb-3 flex items-center justify-center gap-2">
                <Bell className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
                Interested in Early Access?
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Book a consultation to learn more about our upcoming Cohort Benchmarking service and be notified when it launches.
              </p>
              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-amber-600 text-white" data-testid="button-book-consultation">
                  Book a Consultation
                </Button>
              </a>
            </div>
          </Card>

          {/* Get Started - Login or Contact Section */}
          <Card className="p-5 md:p-8 mb-6 md:mb-8" data-testid="get-started-card">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              {/* Existing Account Login */}
              <div className="flex-1 space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <h4 className="font-semibold text-sm md:text-base">Already have an account?</h4>
                </div>
                <div className="space-y-2 md:space-y-3">
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="login-email" className="text-sm">Email</Label>
                    <Input id="login-email" type="email" placeholder="your@company.com" data-testid="input-login-email" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="login-password" className="text-sm">Password</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" data-testid="input-login-password" />
                  </div>
                  <Button className="w-full" data-testid="button-login">
                    Sign In
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Access your partner dashboard to manage team diagnostics
                </p>
              </div>
              
              {/* Divider */}
              <div className="hidden md:block w-px bg-border" />
              <div className="md:hidden border-t" />
              
              {/* Contact the Team */}
              <div className="flex-1 space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <h4 className="font-semibold text-sm md:text-base">New to HumanMetrix?</h4>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Get in touch with our team to learn more about our services and how they can help your organization.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setShowContactDialog(true)}
                  data-testid="button-contact-team"
                >
                  Contact the Team
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="flex items-start gap-2 p-2 md:p-3 bg-muted/50 rounded-lg mt-3 md:mt-4">
                  <Shield className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Partner accounts include full access to team diagnostic tools, AI-powered gap analysis, and comprehensive reporting.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="text-center">
            <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
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

      {/* Contact Options Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How would you like to connect?</DialogTitle>
            <DialogDescription>
              Choose the option that works best for you
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Option 1: Email */}
            <a 
              href={`mailto:hello@humanmetrix.co.uk?subject=Cohort%20Benchmarking%20Enquiry&body=${contactEnquiryMessage}`}
              className="block"
              onClick={() => setShowContactDialog(false)}
            >
              <Card className="p-4 hover-elevate cursor-pointer transition-all">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Get Pricing & Info by Email</h4>
                    <p className="text-sm text-muted-foreground">
                      Send us an email and we'll reply with detailed pricing and information.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground mt-2" />
                </div>
              </Card>
            </a>
            
            {/* Option 2: Book Consultation */}
            <a 
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              onClick={() => setShowContactDialog(false)}
            >
              <Card className="p-4 hover-elevate cursor-pointer transition-all border-primary/20 bg-primary/5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Book a Consultation</h4>
                    <p className="text-sm text-muted-foreground">
                      Schedule a 30-minute call to discuss your team's needs.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground mt-2" />
                </div>
              </Card>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
