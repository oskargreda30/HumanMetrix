import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, BarChart3, MessageSquare, Building2, Mail, Sparkles } from "lucide-react";
import { EnquiryModal } from "@/components/EnquiryModal";

interface AdditionalServicesSectionProps {
  contactEmail?: string;
  enquiryContext?: string;
}

export function AdditionalServicesSection({ contactEmail = "hello@humanmetrix.co.uk", enquiryContext = "Analysis Report - Premium Services" }: AdditionalServicesSectionProps) {
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);

  return (
    <>
      <Card className="mb-8" data-testid="section-additional-services">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Additional Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Enhance your hiring process with our premium assessment services
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-deep-dive">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h4 className="font-semibold" data-testid="heading-service-deep-dive">Deep Dive Analysis</h4>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-service-deep-dive">
                Comprehensive skill breakdown with development recommendations and role-specific insights
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-multi-role">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <h4 className="font-semibold" data-testid="heading-service-multi-role">Multi-Candidate Comparison</h4>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-service-multi-role">
                Compare multiple candidates against a specific role with ranked recommendations
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-consulting">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h4 className="font-semibold" data-testid="heading-service-consulting">Strategic Consulting</h4>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-service-consulting">
                Expert-led sessions to interpret results and develop actionable hiring strategies
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg" data-testid="card-service-integration">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h4 className="font-semibold" data-testid="heading-service-integration">ATS Integration</h4>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-service-integration">
                Seamless integration with your existing applicant tracking and HR systems
              </p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-primary/5 rounded-lg flex flex-wrap items-center justify-between gap-3" data-testid="container-contact-email">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-medium text-sm">Interested in premium services?</p>
                <a 
                  href={`mailto:${contactEmail}`} 
                  className="text-primary text-sm underline"
                  data-testid="link-contact-email"
                >
                  {contactEmail}
                </a>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowEnquiryModal(true)}
              data-testid="button-enquiry-services"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Speak to the Team
            </Button>
          </div>
        </CardContent>
      </Card>

      <EnquiryModal
        open={showEnquiryModal}
        onOpenChange={setShowEnquiryModal}
        context={enquiryContext}
      />
    </>
  );
}
