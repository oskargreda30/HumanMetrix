import { db } from "./db";
import { jobRoles } from "@shared/schema";
import { eq } from "drizzle-orm";

interface CustomRole {
  name: string;
  description: string;
  domain: string;
  competencies: object[];
  requiredSkillScores: object;
}

const CUSTOM_ROLES: CustomRole[] = [
  {
    name: "Business Development & Client Account Manager",
    domain: "sales",
    description: `A fast-growing international logistics powerhouse is looking for high-potential Graduates to join their Cape Town hub. This is a high-octane entry point into global trade. In 30 months, they mentor graduates from foundational operators into Senior Commercial Leaders.

RESPONSIBILITIES

Phase 1: Commercial Sourcing & Sales (The Hunter)
- Identify and qualify high-value leads aligned with the global product portfolio
- Conduct outbound outreach and secure face-to-face/virtual meetings with key decision-makers
- Build and maintain a healthy sales pipeline using commercial insight to quote competitively

Phase 2: Client Management & Excellence (The Relationship Builder)
- Act as the primary commercial contact for an assigned client portfolio
- Lead monthly client check-ins and regular business reviews to ensure service excellence
- Proactively identify opportunities to upsell and expand income within existing accounts

Phase 3: Operational Mastery (The Foundation)
- Coordinate with internal operations and customs teams to ensure seamless delivery
- Manage the end-to-end customer service cycle, ensuring quotes and documentation are accurate
- Monitor performance metrics (KPIs) to inform commercial strategy and client updates

THE 30-MONTH GROWTH PATHWAY
- Months 1-6: Master operational pulse of Air, Sea, or Road freight (R31k/month)
- Months 6-18: Move into permanent BDM or CAM role (R36k + bonus)
- Months 18-30: Own portfolio and drive strategy (R40k + bonus)
- Months 30+: Senior BDM/CAM status with leadership opportunities (R45k + bonus)

REQUIREMENTS
- Bachelor Degree (Commerce, Business, Logistics, or Finance)
- Resilience: hunter mindset that views rejection as a detour not a dead end
- Communication: engage, persuade, build trust from warehouse manager to CEO
- Commercial Curiosity: comfort with numbers and problem-solving
- Proactive, independent, thrives in target-driven fast-paced environment

Source: RAG Talent (ZR_2199_JOB), Cape Town CBD, South Africa. R32,000/month. Fixed Term Graduate Programme.`,
    competencies: [
      { skillName: "Resilience & Persistence", importance: 5, minimumScore: 75 },
      { skillName: "Communication & Persuasion", importance: 5, minimumScore: 75 },
      { skillName: "Commercial Acumen", importance: 5, minimumScore: 70 },
      { skillName: "Relationship Building", importance: 4, minimumScore: 65 },
      { skillName: "Problem Solving", importance: 4, minimumScore: 65 },
      { skillName: "Drive & Ambition", importance: 5, minimumScore: 70 },
      { skillName: "Adaptability", importance: 4, minimumScore: 65 },
      { skillName: "Numeracy & Analytics", importance: 3, minimumScore: 55 },
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 67,
        "High Agency": 66,
        "Growth Mindset": 58,
        "Empathy & Ethics": 49,
        "Interpersonal Agility": 62,
        "Intellectual Curiosity": 61,
      },
      aiReadinessSkills: {
        "AI Literacy & Prompt Engineering": 47,
        "Collaboration & Communication": 68,
        "Data Fluency": 59,
        "Responsible AI & Ethical Awareness": 48,
        "Domain Expertise": 63,
        "Adaptability & Continuous Learning": 57,
        "Critical Thinking & Problem-Solving": 64,
        "Technical Fundamentals": 46,
        "Creativity & Innovation": 52,
      },
      skillCriticality: {
        Resilience: "critical",
        "High Agency": "critical",
        "Growth Mindset": "standard",
        "Empathy & Ethics": "standard",
        "Interpersonal Agility": "critical",
        "Intellectual Curiosity": "standard",
        "AI Literacy & Prompt Engineering": "standard",
        "Collaboration & Communication": "critical",
        "Data Fluency": "standard",
        "Responsible AI & Ethical Awareness": "standard",
        "Domain Expertise": "critical",
        "Adaptability & Continuous Learning": "standard",
        "Critical Thinking & Problem-Solving": "critical",
        "Technical Fundamentals": "standard",
        "Creativity & Innovation": "standard",
      },
      promptArchitectureScore: 51,
      aiqScore: 56,
      generatedAt: "2026-04-24T09:41:35.860Z",
      generatedBy: "JD-analysis",
    },
  },
  {
    name: "In-House Legal Counsel",
    domain: "other",
    description: `An industry-leading telecommunications provider focused on delivering affordable high-speed fibre to underserved communities is seeking a versatile and commercially minded In-House Legal Counsel. This is a critical business enabler role providing broad legal support across Growth, Infrastructure, Finance, and People teams. Stellenbosch, hybrid. Permanent, full-time. R120,000-R150,000/month.

KEY RESPONSIBILITIES

Generalist Legal Advisory
- Deliver practical legal advice across commercial, operational, and regulatory domains
- Collaborate with the People team on labour and HR-related legal queries
- Translate complex legal requirements into actionable guidance for non-legal stakeholders to support rapid decision-making

Contract Management & Commercial Agreements
- Draft, review, and negotiate a variety of contracts including supplier, vendor, infrastructure, and partnership agreements
- Standardise internal contract templates and optimise the contract lifecycle process
- Lead legal representation during commercial negotiations with external partners

Operational & Infrastructure Support
- Provide day-to-day legal oversight for network expansion and build activities
- Advise on risks associated with contractor engagements, site access, permissions, and service delivery obligations

Governance & Company Secretarial (CoSec)
- Support company secretarial requirements including board resolutions, statutory filings, and maintenance of company records
- Assist in preparation of board packs and implementation of governance frameworks
- Ensure all corporate activities align with governance best practices

Compliance, Risk & Dispute Resolution
- Oversee compliance with POPIA, consumer protection, and telecommunications regulatory frameworks
- Identify and pragmatically manage legal risks across national operations
- Lead resolution of disputes with contractors or third parties
- Develop internal policies and toolkits to improve legal self-service

REQUIREMENTS
- LLB degree essential; Admitted Attorney preferred
- 4-8 years post-qualification experience in commercial law firm or in-house environment
- Strong expertise in contract law and drafting
- Legal generalist across commercial, HR, and regulatory domains
- Resilient, comfortable in fast-paced high-growth setting
- Preferred: telecommunications, infrastructure, or technology sector experience
- Preferred: company secretarial and corporate governance exposure

Source: RecruitMyMom (ZR_16548_JOB), Stellenbosch, Western Cape, South Africa. R120,000-R150,000/month. Permanent.`,
    competencies: [
      { skillName: "Contract Law & Drafting", importance: 5, minimumScore: 80 },
      { skillName: "Legal Generalism (Commercial, HR, Regulatory)", importance: 5, minimumScore: 75 },
      { skillName: "Governance & Compliance", importance: 4, minimumScore: 70 },
      { skillName: "Risk Management", importance: 4, minimumScore: 70 },
      { skillName: "Stakeholder Communication", importance: 4, minimumScore: 65 },
      { skillName: "Dispute Resolution", importance: 3, minimumScore: 60 },
      { skillName: "Commercial Acumen", importance: 4, minimumScore: 65 },
      { skillName: "Adaptability in High-Growth Environments", importance: 4, minimumScore: 65 },
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 72,
        "High Agency": 71,
        "Growth Mindset": 67,
        "Empathy & Ethics": 68,
        "Interpersonal Agility": 73,
        "Intellectual Curiosity": 64,
      },
      aiReadinessSkills: {
        "AI Literacy & Prompt Engineering": 57,
        "Collaboration & Communication": 76,
        "Data Fluency": 62,
        "Responsible AI & Ethical Awareness": 69,
        "Domain Expertise": 78,
        "Adaptability & Continuous Learning": 66,
        "Critical Thinking & Problem-Solving": 74,
        "Technical Fundamentals": 61,
        "Creativity & Innovation": 59,
      },
      skillCriticality: {
        Resilience: "critical",
        "High Agency": "critical",
        "Growth Mindset": "standard",
        "Empathy & Ethics": "standard",
        "Interpersonal Agility": "critical",
        "Intellectual Curiosity": "standard",
        "AI Literacy & Prompt Engineering": "standard",
        "Collaboration & Communication": "critical",
        "Data Fluency": "standard",
        "Responsible AI & Ethical Awareness": "critical",
        "Domain Expertise": "critical",
        "Adaptability & Continuous Learning": "standard",
        "Critical Thinking & Problem-Solving": "critical",
        "Technical Fundamentals": "standard",
        "Creativity & Innovation": "standard",
      },
      promptArchitectureScore: 58,
      aiqScore: 67,
      generatedAt: "2026-05-04T12:59:20.127Z",
      generatedBy: "JD-analysis",
    },
  },
  {
    name: "Junior Auditor",
    domain: "finance",
    description: `An established auditing firm is seeking a meticulous and analytical Junior Auditor to join their professional services team. This role is focused on the end-to-end execution of audit assignments for a diverse portfolio of clients across multiple industries. The successful candidate will play a key role in ensuring financial transparency and compliance, working within a structured methodology to deliver high-quality reporting.

Key Responsibilities:
- Execute and manage audit engagements from planning through to completion in accordance with professional standards.
- Perform comprehensive risk assessments and test the effectiveness of internal control systems.
- Review financial statements to verify accuracy, transparency, and adherence to regulatory frameworks.
- Document audit findings and prepare detailed working papers and reports to support audit opinions.
- Identify financial misstatements or procedural risks and draft practical recommendations for client improvement.
- Facilitate clear communication with clients to gather financial data and resolve complex queries.
- Conduct specialised statutory audits for Public Schools, PPRA, and LPC Trust Accounts, ensuring strict legal compliance.
- Provide mentorship and technical guidance to entry-level staff during field engagements.
- Contribute to high-level projects including due diligence reviews and general commercial advisory services.

Requirements:
- Bachelor's degree in Accounting, Auditing, Finance, or a closely related field.
- Minimum of 2 years of professional audit experience, ideally within an external audit firm environment.
- Strong foundational knowledge of IFRS and ISA.
- Proven ability to work independently while managing multiple deadlines in a high-pressure environment.
- Exceptional analytical skills with a high degree of accuracy and attention to detail.

Preferred Qualifications:
- Experience with statutory audits (LPC Trust Accounts, PPRA, Public Schools).
- Completion of, or progress toward, AGA(SA) or similar professional designation.
- Microsoft Excel (Advanced), CaseWare or similar audit software.`,
    competencies: [
      { skillName: "Analytical Rigour & Attention to Detail", importance: 5, minimumScore: 80 },
      { skillName: "IFRS & ISA Knowledge", importance: 5, minimumScore: 75 },
      { skillName: "Integrity & Ethics", importance: 5, minimumScore: 80 },
      { skillName: "Independent Working & Deadline Management", importance: 4, minimumScore: 70 },
      { skillName: "Client Communication", importance: 4, minimumScore: 65 },
      { skillName: "Statutory Audit Expertise", importance: 3, minimumScore: 60 },
      { skillName: "Report Writing & Documentation", importance: 4, minimumScore: 65 },
      { skillName: "Mentorship & Team Guidance", importance: 3, minimumScore: 55 },
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 68,
        "High Agency": 66,
        "Growth Mindset": 63,
        "Empathy & Ethics": 74,
        "Interpersonal Agility": 65,
        "Intellectual Curiosity": 64,
      },
      aiReadinessSkills: {
        "AI Literacy & Prompt Engineering": 59,
        "Collaboration & Communication": 65,
        "Data Fluency": 71,
        "Responsible AI & Ethical Awareness": 70,
        "Domain Expertise": 70,
        "Adaptability & Continuous Learning": 64,
        "Critical Thinking & Problem-Solving": 72,
        "Technical Fundamentals": 60,
        "Creativity & Innovation": 56,
      },
      skillCriticality: {
        Resilience: "standard",
        "High Agency": "standard",
        "Growth Mindset": "standard",
        "Empathy & Ethics": "critical",
        "Interpersonal Agility": "standard",
        "Intellectual Curiosity": "standard",
        "AI Literacy & Prompt Engineering": "standard",
        "Collaboration & Communication": "standard",
        "Data Fluency": "critical",
        "Responsible AI & Ethical Awareness": "critical",
        "Domain Expertise": "critical",
        "Adaptability & Continuous Learning": "standard",
        "Critical Thinking & Problem-Solving": "critical",
        "Technical Fundamentals": "standard",
        "Creativity & Innovation": "standard",
      },
      promptArchitectureScore: 58,
      aiqScore: 63,
      generatedAt: "2026-05-08T09:05:45.000Z",
      generatedBy: "JD-analysis",
    },
  },
];

export async function seedCustomRoles(): Promise<void> {
  try {
    for (const role of CUSTOM_ROLES) {
      const existing = await db
        .select({ id: jobRoles.id })
        .from(jobRoles)
        .where(eq(jobRoles.name, role.name))
        .limit(1);

      if (existing.length > 0) {
        continue;
      }

      await db.insert(jobRoles).values({
        name: role.name,
        description: role.description,
        domain: role.domain as any,
        competencies: role.competencies as any,
        requiredSkillScores: role.requiredSkillScores as any,
        isCustom: true,
      });

      console.log(`[CustomRoles] Seeded: ${role.name}`);
    }
  } catch (err: any) {
    console.error("[CustomRoles] Seed error:", err.message);
  }
}
