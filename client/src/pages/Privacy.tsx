import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy | HumanMetrix - AI Assessment Platform";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Read HumanMetrix Privacy Policy. Learn how we collect, use, and protect your personal data in compliance with GDPR and UK data protection laws."
      );
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = "Read HumanMetrix Privacy Policy. Learn how we collect, use, and protect your personal data in compliance with GDPR and UK data protection laws.";
      document.head.appendChild(meta);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-grow py-8 md:py-16">
        <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
          <div className="mb-8 md:mb-12">
            <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">Privacy Policy</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Last updated: December 8, 2025</p>
          </div>

          <Card className="p-4 md:p-8">
            <div className="prose prose-slate dark:prose-invert max-w-none text-xs md:text-sm">
              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">1. Introduction</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  HumanMetrix ("we", "us", "our") is committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, store, and protect your information when you use our AI-powered assessment platform.
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  We comply with the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018, and other applicable data protection laws.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">2. Data Controller</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  HumanMetrix is the data controller responsible for your personal data. If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  Email: humanmetrix.sales@gmail.com<br />
                  Website: humanmetrix.co.uk
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">3. Information We Collect</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  We collect the following types of personal data:
                </p>
                <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-3">A. Information You Provide:</h3>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Account information (name, email address, password)</li>
                  <li>Assessment responses and answers</li>
                  <li>Payment information (processed securely through Stripe)</li>
                  <li>Communication preferences</li>
                  <li>Any information you provide when contacting us</li>
                </ul>
                <h3 className="text-sm md:text-lg font-semibold mb-2 md:mb-3">B. Information Collected Automatically:</h3>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Device information (browser type, operating system)</li>
                  <li>IP address and approximate location</li>
                  <li>Usage data (pages visited, time spent, assessment completion times)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">4. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  We use your personal data for the following purposes:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>To provide and maintain our assessment services</li>
                  <li>To process your assessments and generate results</li>
                  <li>To process payments and send transaction receipts</li>
                  <li>To communicate with you about your account and services</li>
                  <li>To improve our platform, assessments, and algorithms</li>
                  <li>To detect and prevent fraud or unauthorized access</li>
                  <li>To comply with legal obligations</li>
                  <li>To send marketing communications (with your consent)</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">5. Legal Basis for Processing</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  We process your personal data based on the following legal grounds:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li><strong>Contract:</strong> Processing necessary to provide our services to you</li>
                  <li><strong>Consent:</strong> Where you have given explicit consent (e.g., marketing emails)</li>
                  <li><strong>Legitimate interests:</strong> For improving our services and preventing fraud</li>
                  <li><strong>Legal obligation:</strong> Where required by law</li>
                </ul>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">6. Data Sharing and Third Parties</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  We may share your personal data with:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li><strong>Employers:</strong> If you were invited by an employer, your assessment results will be shared with them</li>
                  <li><strong>Payment processors:</strong> Stripe processes payments securely on our behalf</li>
                  <li><strong>AI service providers:</strong> OpenAI processes certain assessment evaluations (Prompt Architecture)</li>
                  <li><strong>Hosting providers:</strong> Our platform infrastructure providers</li>
                  <li><strong>Analytics providers:</strong> To understand platform usage (anonymized data)</li>
                  <li><strong>Legal authorities:</strong> When required by law or to protect our rights</li>
                </ul>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  We will never sell your personal information to third parties for marketing purposes.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">7. International Data Transfers</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  Some of our service providers may be located outside the UK and European Economic Area (EEA). When we transfer data internationally, we ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the UK Information Commissioner's Office (ICO).
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">8. Data Retention</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  We retain your personal data for as long as necessary to:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Provide our services and maintain your account</li>
                  <li>Comply with legal, accounting, or reporting requirements</li>
                  <li>Resolve disputes and enforce our agreements</li>
                </ul>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  Assessment results are retained for a minimum of 2 years. When you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required by law.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">9. Your Rights</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  Under UK GDPR, you have the following rights:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li><strong>Right of access:</strong> Request a copy of your personal data</li>
                  <li><strong>Right to rectification:</strong> Request correction of inaccurate data</li>
                  <li><strong>Right to erasure:</strong> Request deletion of your personal data</li>
                  <li><strong>Right to restrict processing:</strong> Request limitation of data processing</li>
                  <li><strong>Right to data portability:</strong> Receive your data in a portable format</li>
                  <li><strong>Right to object:</strong> Object to processing based on legitimate interests</li>
                  <li><strong>Right to withdraw consent:</strong> Withdraw consent at any time</li>
                </ul>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  To exercise any of these rights, please contact us at humanmetrix.sales@gmail.com. We will respond within 30 days.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">10. Cookies and Tracking</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  We use cookies and similar technologies for:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li><strong>Essential cookies:</strong> Required for the platform to function (authentication, session management)</li>
                  <li><strong>Analytics cookies:</strong> To understand how users interact with our platform (Google Analytics)</li>
                  <li><strong>Marketing cookies:</strong> To measure advertising effectiveness (LinkedIn Insight Tag)</li>
                </ul>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  You can manage cookie preferences through your browser settings. Note that disabling essential cookies may affect platform functionality.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">11. Data Security</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  We implement appropriate technical and organizational measures to protect your personal data, including:
                </p>
                <ul className="list-disc pl-4 md:pl-6 text-muted-foreground space-y-1 md:space-y-2 mb-3 md:mb-4">
                  <li>Encryption of data in transit (HTTPS/TLS)</li>
                  <li>Secure password hashing</li>
                  <li>Regular security assessments</li>
                  <li>Access controls and authentication</li>
                  <li>Secure payment processing through PCI-compliant providers</li>
                </ul>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  While we take reasonable steps to protect your data, no method of transmission or storage is 100% secure. We cannot guarantee absolute security.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">12. Children's Privacy</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  Our platform is not intended for individuals under the age of 16. We do not knowingly collect personal data from children. If you believe we have collected data from a child, please contact us immediately and we will delete it.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">13. Changes to This Policy</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our platform and updating the "Last updated" date. We encourage you to review this policy periodically.
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section className="mb-6 md:mb-8">
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">14. Complaints</h2>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  If you are not satisfied with how we handle your personal data, you have the right to lodge a complaint with the UK Information Commissioner's Office (ICO):
                </p>
                <p className="text-muted-foreground mb-3 md:mb-4">
                  Website: ico.org.uk<br />
                  Phone: 0303 123 1113
                </p>
              </section>

              <Separator className="my-4 md:my-6" />

              <section>
                <h2 className="text-base md:text-2xl font-bold mb-2 md:mb-4">15. Contact Us</h2>
                <p className="text-muted-foreground mb-2 md:mb-4">
                  For any questions about this Privacy Policy or to exercise your data rights, please contact us:
                </p>
                <p className="text-muted-foreground">
                  Email: humanmetrix.sales@gmail.com<br />
                  Website: humanmetrix.co.uk
                </p>
              </section>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
