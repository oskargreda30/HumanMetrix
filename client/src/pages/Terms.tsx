import { useEffect } from "react";
import { Link } from "wouter";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";

export default function Terms() {
  useEffect(() => {
    document.title = "Terms & Conditions | HumanMetrix - AI Assessment Platform";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Read the complete Terms & Conditions for HumanMetrix AI Assessment Platform. Understand your rights, usage guidelines, and our commitments to data protection and privacy."
      );
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Read the complete Terms & Conditions for HumanMetrix AI Assessment Platform. Understand your rights, usage guidelines, and our commitments to data protection and privacy.";
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow py-8 md:py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
          <div className="mb-8 md:mb-12">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">Terms & Conditions</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Last updated: November 7, 2025</p>
          </div>

          <Card className="p-4 md:p-8">
            <div className="prose prose-slate dark:prose-invert max-w-none text-xs md:text-sm">
              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  By accessing and using HumanMetrix ("the Platform"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these Terms & Conditions, please do not use the Platform.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">2. Service Description</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  HumanMetrix provides AI-powered assessments to evaluate behavioral skills, AI literacy, prompt architecture capabilities, and algorithmic integrity understanding. Our assessments include:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>FIT Assessment (15 questions measuring 6 behavioral skills)</li>
                  <li>AI Readiness Assessment (21 questions evaluating 9 AI competencies)</li>
                  <li>Prompt Architecture Assessment (7 progressive levels evaluated by an AI model)</li>
                  <li>Algorithmic Integrity Quotient (AIQ) (8 scenario-based questions)</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">3. User Accounts and Registration</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  To access certain features of the Platform, you must register for an account. You agree to:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Maintain the security of your password and account</li>
                  <li>Accept all responsibility for activities that occur under your account</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">4. Assessment Purchases and Pricing</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  Assessment purchases are subject to the following terms:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>A one-time base computation fee applies to each purchase session</li>
                  <li>Each assessment has an individual price as displayed on the Platform</li>
                  <li>Prices are stated in GBP (£) and are subject to change with notice</li>
                  <li>Payment is processed securely through Stripe</li>
                  <li>All sales are final; assessments cannot be refunded once purchased.</li>
                  <li>Once purchased, assessments must be completed within the allocated time period</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">5. Assessment Rules and Conduct</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  When taking assessments, you agree to:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Complete assessments independently without unauthorized assistance</li>
                  <li>Not share or discuss assessment content with others</li>
                  <li>Complete assessments within the specified time limits</li>
                  <li>Provide honest and accurate responses</li>
                  <li>Not use automated tools, bots, or scripts to complete assessments</li>
                  <li>Not attempt to circumvent security measures or time restrictions</li>
                </ul>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  Violation of these rules may result in invalidation of results and account termination.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">6. Assessment Results, Accuracy, and Candidate Liability</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  Regarding assessment results, please note and expressly acknowledge and agree that:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Results are generated using proprietary algorithms and AI evaluation (an AI model for Prompt Architecture) and are inherently estimates and indications, not factual guarantees.</li>
                  <li>Results are provided exclusively for informational and developmental purposes.</li>
                  <li>Results shall under no circumstances be the sole or primary basis for any employment, hiring, termination, promotion, educational, or other critical decision. The Platform advises and requires that users (including candidates and employers) conduct independent verification and utilize multiple data points and methods before making such decisions.</li>
                  <li>HumanMetrix expressly disclaims any and all liability for decisions made by any user (candidate or employer) based on these results.</li>
                  <li>We do not guarantee specific outcomes, job placement, or educational advancement from using our assessments.</li>
                  <li>Percentile rankings are calculated based on all platform users and are comparative; they do not represent absolute competence.</li>
                  <li>Results are final and binding once submitted, and cannot be disputed or appealed.</li>
                  <li>By taking the assessment, the candidate waives any right to sue or claim damages against HumanMetrix based on the content, accuracy, or perceived fairness of the assessment or its resulting score.</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">7. Intellectual Property Rights</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  All content on the Platform, including but not limited to assessment questions, evaluation criteria, algorithms, text, graphics, logos, and software, is the property of HumanMetrix and is protected by copyright, trademark, and other intellectual property laws. You may not:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Copy, reproduce, or distribute Platform content without permission</li>
                  <li>Modify, reverse engineer, or create derivative works</li>
                  <li>Use content for commercial purposes without authorization</li>
                  <li>Remove or alter copyright, trademark, or other proprietary notices</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">8. Privacy and Data Protection</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  Your privacy is important to us. We collect and process personal data in accordance with applicable data protection laws including GDPR. By using the Platform, you consent to:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Collection of personal information (name, email, assessment responses)</li>
                  <li>Storage of assessment results and performance data</li>
                  <li>Use of data to improve Platform services and algorithms</li>
                  <li>Sharing anonymized aggregate data for research purposes</li>
                  <li>Communication regarding account activity and platform updates</li>
                </ul>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  We will never sell your personal information to third parties. You have the right to request access to, correction of, or deletion of your personal data.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">9. Limitation of Liability and Indemnification</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  To the fullest extent permitted by law, the following limitations and indemnities apply to both candidates and employers (users) in all circumstances:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>HumanMetrix and its affiliates shall under no circumstances be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or opportunity, even if we have been advised of the possibility of such damages.</li>
                  <li>Our maximum and total liability to any user (candidate or employer) for any claim arising out of or relating to the Platform or the assessments shall not exceed the total fees paid by the user (or the employer on the candidate's behalf) for the specific assessment in question.</li>
                  <li>We do not warrant that the Platform will be uninterrupted, error-free, or completely secure.</li>
                  <li>We are not responsible for technical failures, server downtime, data loss, or any disruptions outside of our direct control.</li>
                </ul>
                <p className="text-muted-foreground mb-2 md:mb-3 font-semibold">Indemnification:</p>
                <p className="text-muted-foreground mb-2 md:mb-3">You agree to indemnify, defend, and hold harmless HumanMetrix, its officers, directors, employees, and agents from and against any and all claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) that arise out of or relate to:</p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Any decision made by you (or your employer) based on the assessment results.</li>
                  <li>Your violation of any part of these Terms & Conditions.</li>
                  <li>Your misuse of the Platform.</li>
                  <li>Assessment results do not constitute professional advice, certification, licensure, or qualification of any kind.</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">10. Disclaimer of Warranties</h2>
                <p className="text-muted-foreground mb-2 md:mb-4 font-semibold uppercase">
                  THE PLATFORM, THE ASSESSMENTS, AND ALL SERVICES ARE PROVIDED "AS IS," "WITH ALL FAULTS," AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, TO THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW. WE EXPRESSLY DISCLAIM AND EXCLUDE ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Implied warranties of merchantability, fitness for a particular purpose, non-infringement, or suitability for any employment or educational decision.</li>
                  <li>Any warranty regarding the accuracy, reliability, timeliness, currency, or completeness of assessment results or other data.</li>
                  <li>Uninterrupted, error-free, or secure operation.</li>
                  <li>Security of data transmission or storage.</li>
                  <li>Compatibility with all devices or browsers.</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">11. Employer Use, AI Disclaimer, and Third-Party Decisions</h2>
                
                <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-3">A. Employer Use and Responsibility:</h3>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>For employer-invited assessments, results will be shared with the inviting organization.</li>
                  <li>Employers expressly acknowledge and agree that they are solely responsible for how they use assessment results and for ensuring that such use complies with all applicable employment laws, anti-discrimination laws, and internal company policies.</li>
                  <li>HumanMetrix is not an employer, is not involved in the hiring process, and expressly disclaims all liability for any adverse employment action (e.g., non-hiring, termination) taken by an employer based, in whole or in part, on assessment results. The employer assumes full responsibility for any such decision.</li>
                </ul>
                
                <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-3">B. AI-Generated Content Disclaimer (Prompt Architecture, and any other features):</h3>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>The Prompt Architecture assessment utilizes an AI model or similar third-party AI services for evaluation.</li>
                  <li>Users acknowledge and accept the inherent risks, limitations, and potential inaccuracies associated with AI-based evaluations, including the possibility of errors, inconsistencies, or bias.</li>
                  <li>HumanMetrix makes no guarantees regarding the absolute accuracy, reliability, or predictive value of scores derived from AI evaluation.</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">12. Termination</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  We reserve the right to terminate or suspend your account and access to the Platform at our sole discretion, without notice, for conduct that we believe:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Violates these Terms & Conditions</li>
                  <li>Is harmful to other users, third parties, or our business interests</li>
                  <li>Involves fraudulent, deceptive, or illegal activity</li>
                  <li>Compromises the integrity of our assessments</li>
                </ul>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  Upon termination, your right to use the Platform will immediately cease. No refunds will be provided for terminated accounts.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">13. Changes to Terms</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  We reserve the right to modify these Terms & Conditions at any time. We will notify users of material changes by:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Posting updated terms on the Platform</li>
                  <li>Updating the "Last Updated" date</li>
                  <li>Sending email notifications for significant changes</li>
                </ul>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  Continued use of the Platform after changes constitutes acceptance of modified terms.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">14. Governing Law and Jurisdiction</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  These Terms & Conditions shall be governed by and construed in accordance with the laws of England and Wales, without regard to its conflict of law provisions. Any disputes arising from these terms or use of the Platform shall be subject to the exclusive jurisdiction of the courts of England and Wales.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">15. Severability</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  If any provision of these Terms & Conditions is found to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">16. Contact Information</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  If you have questions about these Terms & Conditions, please contact us at:
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  Email: assessments@humanmetrix.co.uk<br />
                  Website: humanmetrix.co.uk
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section>
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">17. Acknowledgment</h2>
                <p className="text-muted-foreground font-semibold">
                  BY USING THE PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS & CONDITIONS.
                </p>
              </section>
            </div>
          </Card>

          {/* CTA Section */}
          <div className="mt-8 md:mt-12 text-center">
            <Link href="/assessments">
              <Button 
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                data-testid="button-terms-go-to-assessments"
              >
                Go to Assessments
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
