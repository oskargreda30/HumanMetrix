import { useEffect } from "react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";

export default function EULA() {
  useEffect(() => {
    document.title = "End User License Agreement (EULA) | HumanMetrix";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Read HumanMetrix End User License Agreement (EULA). Understand the terms and conditions for using our AI-powered assessment platform."
      );
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Read HumanMetrix End User License Agreement (EULA). Understand the terms and conditions for using our AI-powered assessment platform.";
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow py-8 md:py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
          <div className="mb-8 md:mb-12">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">End User License Agreement (EULA)</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Last updated: January 2026</p>
          </div>

          <Card className="p-4 md:p-8">
            <div className="prose prose-slate dark:prose-invert max-w-none text-xs md:text-sm">
              <p className="text-muted-foreground mb-4 md:mb-6">
                This End User License Agreement ("Agreement") is a legal agreement between your organization ("Client") and PT Human Metrix Assessments, a private limited company registered in Bali, Republic of Indonesia ("HumanMetrix"). By accessing or using the assessment platform, API, or reporting tools (collectively, the "Electronic System"), you agree to be bound by the terms of this Agreement.
              </p>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">1. License Grant and Scope of Use</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>1.1 Grant of License:</strong> HumanMetrix grants Client a non-exclusive, non-transferable, revocable license to access and use the platform solely for evaluating job candidates.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>1.2 User Tiers:</strong> Access level is determined by the tier assigned during the discovery phase.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>1.3 AI Ethics and Human Oversight:</strong> The Electronic System utilizes Artificial Intelligence ("AI") as an Electronic Agent. In accordance with MOCI Circular Letter No. 9 of 2023, the Client acknowledges that the Electronic System is an advisory tool. The final hiring decision rests solely with the Client's human personnel ("Human-in-the-Loop").
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">2. Prepaid Credit Model and Expiration</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>2.1 Prepaid-Only Requirement:</strong> All services are strictly prepaid. Client must maintain a positive credit balance.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>2.2 Non-Negotiable Expiration:</strong> All prepaid credits expire exactly six (6) months from the date of purchase. This expiration is a fundamental and non-negotiable term. Any unused credits after this 6-month period are automatically forfeited and are strictly non-refundable and non-transferable. Client acknowledges that this period is a fixed administrative window for service utilization.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">3. Trial Quotas</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>3.1 Termination of Trial:</strong> The trial period ends immediately upon the first prepaid purchase or the activation of professional features.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">4. Personal Data Protection (PDP Law Compliance)</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>4.1 Data Processing Roles:</strong> Client acts as the "Data Controller" and HumanMetrix acts as the "Data Processor" under Law No. 27 of 2022 (PDP Law).
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>4.2 Candidate Consent:</strong> Client is solely responsible for securing valid, explicit consent from candidates for data processing.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>4.3 Statutory Timelines:</strong> HumanMetrix shall assist the Client in fulfilling data subject rights within the 72-hour statutory window, provided the Client gives immediate notice.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">5. Restrictions and Audits</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>5.1 Prohibited Acts:</strong> Client shall not reverse engineer the Prompt Architecture or resell the assessments.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>5.2 Compliance Disclosure:</strong> HumanMetrix reserves the right to disclose data to Indonesian authorities upon a legitimate request pursuant to GR 28/2025.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">6. Limitation of Liability</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>6.1 Exclusion of Damages:</strong> To the maximum extent permitted by law, HumanMetrix shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, loss of data, or loss of business opportunity.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>6.2 Liability Cap:</strong> To the maximum extent permitted by applicable law, the total cumulative liability of HumanMetrix for all claims arising out of or related to this Agreement shall not exceed the total amount paid by the Client for credits in the six (6) months preceding the event giving rise to the claim.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>6.3 Mandatory Legal Carve-out:</strong> Nothing in this Agreement shall limit liability for gross negligence or willful misconduct as defined under the Indonesian Civil Code.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">7. Governing Law and Dispute Resolution</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>7.1 Jurisdiction and Arbitration:</strong> This Agreement is governed by the laws of the Republic of Indonesia. Disputes shall be settled by arbitration in Jakarta in accordance with the 2025 BANI Arbitration Rules.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>7.2 Language Precedence:</strong> Per Law No. 24 of 2009, the Bahasa Indonesia version shall prevail for legal validity in the event of conflict.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">8. Definitions and Interpretation</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>8.1 Definitions:</strong> For the purposes of this Agreement, the following terms shall have the meanings set forth below:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li><strong>"Assessment Results"</strong> means any scores, reports, analytics, or outputs generated by the Electronic System.</li>
                  <li><strong>"Candidate Data"</strong> means any personal data relating to a job candidate processed through the Electronic System.</li>
                  <li><strong>"Client Content"</strong> means any data, instructions, job criteria, or materials provided by the Client.</li>
                  <li><strong>"Confidential Information"</strong> means all non-public technical, commercial, operational, or business information disclosed by either party.</li>
                  <li><strong>"Force Majeure Event"</strong> means any event beyond reasonable control, including natural disasters, governmental actions, system outages, or third-party service failures.</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">9. Intellectual Property Rights</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>9.1 Ownership:</strong> All intellectual property rights in the Electronic System, including assessments and scoring logic, remain the exclusive property of HumanMetrix.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>9.2 License Limitation:</strong> The Client receives no ownership rights and may not copy or create derivative works beyond the licensed purpose.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">10. Confidentiality</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>10.1 Confidentiality Obligations:</strong> Each party shall protect the other party's Confidential Information with reasonable care.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>10.2 Survival:</strong> Confidentiality obligations survive termination for five (5) years.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">11. Data Security and Breach Management</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>11.1 Security Measures:</strong> HumanMetrix implements technical and organizational measures required under GR 28/2025.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>11.2 Breach Notification:</strong> HumanMetrix shall notify the Client of a data breach within 72 hours and cooperate in remediation.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">12. Service Availability and Disclaimer</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>12.1 Availability:</strong> The Electronic System is provided on an "as is" and "as available" basis. HumanMetrix does not guarantee uninterrupted operation.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">13. Termination and Suspension</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>13.1 Termination for Cause:</strong> HumanMetrix may immediately suspend or terminate access if the Client breaches this Agreement or violates applicable law.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>13.2 Waiver of Article 1266:</strong> The parties hereby expressly waive the provisions of Article 1266 of the Indonesian Civil Code to the extent a court decision is required for termination.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">14. Force Majeure</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>14.1 Force Majeure Event:</strong> Neither party shall be liable for any failure caused by a Force Majeure Event, excluding payment obligations.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">15. Assignment</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>15.1 HumanMetrix Rights:</strong> HumanMetrix may assign this Agreement to an affiliate or successor in connection with a merger or sale of assets.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">16. Amendments and Updates</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>16.1 Acceptance of Updates:</strong> Continued access after an amendment constitutes acceptance of the updated Agreement.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>16.2 Savings Clause:</strong> If any provision is found invalid under local law in any jurisdiction where the software is sold, such invalidity shall not affect the remaining terms.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">17. No Professional Advice and No Guarantee</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>17.1 Advisory Use Only:</strong> The Electronic System and all Assessment Results are provided solely as decision-support tools and do not constitute legal, human resources, or professional advice. HumanMetrix makes no representation or warranty regarding the predictive validity, fairness, or bias-free nature of the Results. Client acknowledges that certain assessments may require interpretation by a licensed professional under Law No. 23 of 2022 or local law, and HumanMetrix is not responsible for the Client's failure to engage such professionals.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  <strong>17.2 Client Responsibility:</strong> The Client remains solely responsible for ensuring compliance with labor and anti-discrimination laws. Assessment Results must not be used as the sole basis for any employment decision.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <div className="mt-8 pt-6 border-t">
                <p className="text-muted-foreground mb-4">
                  If you have any questions about this End User License Agreement, please contact us at:
                </p>
                <p className="text-muted-foreground">
                  Email: hello@humanmetrix.co.uk<br />
                  Website: humanmetrix.co.uk
                </p>
              </div>
            </div>
          </Card>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/privacy">
              <Button variant="outline" data-testid="link-privacy-policy">
                Privacy Policy
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/terms">
              <Button variant="outline" data-testid="link-terms">
                Terms & Conditions
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
