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
  {
    name: "AI Assistant",
    domain: "technology",
    description: `A technology team is seeking an AI Assistant to help design and build software tools using AI. This is a hands-on technical builder role: the person works alongside engineers and product teams to turn ideas into working tools, using AI coding assistants, large language models, and automation to accelerate development. They write and debug code, integrate APIs, craft and refine prompts, and continuously adopt new AI capabilities as they emerge.

KEY RESPONSIBILITIES

Building & Engineering
- Design, write, and debug code to build internal and customer-facing tools
- Integrate third-party APIs, SDKs, and AI models into working applications
- Use AI coding assistants and LLMs to accelerate prototyping and delivery
- Translate loosely defined requirements into functional, reliable software

AI & Prompt Engineering
- Craft, test, and iterate on prompts to get reliable, high-quality model outputs
- Evaluate AI outputs critically, catching errors, hallucinations, and edge cases
- Apply LLMs and automation to remove repetitive engineering and ops work

Collaboration & Continuous Learning
- Work closely with engineers, designers, and product owners to ship tools
- Document how tools work so others can use and extend them
- Rapidly learn and adopt new AI tools, frameworks, and techniques

REQUIREMENTS
- Strong technical and coding ability across one or more modern languages
- Comfort with technical tools, systems, APIs, and developer workflows
- Hands-on experience using AI/LLM tools to build or automate things
- Excellent problem-solving and critical-thinking skills
- High curiosity and a fast, self-directed learning style
- Creative, pragmatic, and able to work independently in a fast-moving environment

This is a mid-to-senior technical role combining software engineering ability with strong AI literacy and prompt-engineering skill.`,
    competencies: [
      { skillName: "Coding & Software Engineering", importance: 5, minimumScore: 78 },
      { skillName: "AI Literacy & Prompt Engineering", importance: 5, minimumScore: 82 },
      { skillName: "Technical Fundamentals", importance: 5, minimumScore: 78 },
      { skillName: "Critical Thinking & Problem-Solving", importance: 5, minimumScore: 76 },
      { skillName: "Adaptability & Continuous Learning", importance: 5, minimumScore: 74 },
      { skillName: "Creativity & Innovation", importance: 4, minimumScore: 68 },
      { skillName: "Data Fluency", importance: 4, minimumScore: 66 },
      { skillName: "Collaboration & Communication", importance: 3, minimumScore: 62 },
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 64,
        "High Agency": 73,
        "Growth Mindset": 76,
        "Empathy & Ethics": 56,
        "Interpersonal Agility": 58,
        "Intellectual Curiosity": 79,
      },
      aiReadinessSkills: {
        "AI Literacy & Prompt Engineering": 84,
        "Collaboration & Communication": 63,
        "Data Fluency": 71,
        "Responsible AI & Ethical Awareness": 62,
        "Domain Expertise": 72,
        "Adaptability & Continuous Learning": 78,
        "Critical Thinking & Problem-Solving": 81,
        "Technical Fundamentals": 83,
        "Creativity & Innovation": 74,
      },
      skillCriticality: {
        Resilience: "standard",
        "High Agency": "critical",
        "Growth Mindset": "critical",
        "Empathy & Ethics": "standard",
        "Interpersonal Agility": "standard",
        "Intellectual Curiosity": "critical",
        "AI Literacy & Prompt Engineering": "critical",
        "Collaboration & Communication": "standard",
        "Data Fluency": "standard",
        "Responsible AI & Ethical Awareness": "standard",
        "Domain Expertise": "critical",
        "Adaptability & Continuous Learning": "critical",
        "Critical Thinking & Problem-Solving": "critical",
        "Technical Fundamentals": "critical",
        "Creativity & Innovation": "standard",
      },
      promptArchitectureScore: 82,
      aiqScore: 79,
      generatedAt: "2026-06-03T11:00:00.000Z",
      generatedBy: "JD-analysis",
    },
  },
  {
    name: "Senior Talent Consultant",
    domain: "sales",
    description: `RecruitMyMom is seeking an experienced, high-performing Senior Talent Consultant to join their growing team. This remote role suits a confident, results-driven recruiter with a strong agency background and a proven commission-earning track record. The successful candidate will own a busy 360-degree desk, leveraging modern AI and recruitment technology to connect premier talent with market-leading local and international organisations.

KEY RESPONSIBILITIES

End-to-End Talent Acquisition
- Manage the full 360-degree recruitment lifecycle across permanent, contract, and independent contractor placements in diverse industries
- Identify, engage, and place high-calibre candidates up to C-suite level using advanced sourcing methodology and AI-driven tools

Client Relationship Management
- Partner with senior leadership, offshore clients, and owner-founder SMEs as a trusted talent advisor, ensuring deep alignment on hiring requirements
- Deliver a consultative, premium service experience to local and international organisations

Business Development
- Actively identify and secure new business opportunities locally and internationally to grow desk revenue and market share
- Maintain a healthy pipeline and consistently hit performance targets in a commission-driven environment

Technology Optimisation
- Utilise advanced ATS, CRM, and cutting-edge generative AI tools to streamline workflows, enhance candidate matching, and minimise time-to-hire
- Work alongside dedicated administrative and marketing support teams to deliver a seamless candidate and client experience

REQUIREMENTS
- Minimum 5 years' recent, active experience as a 360 Recruitment Consultant within an agency environment
- Proven history managing a high-volume desk, hitting targets, and consistently earning commissions
- Demonstrated experience placing executive and C-suite talent and partnering with owner-founder SMEs
- Highly tech-savvy with hands-on experience incorporating AI tools into sourcing, plus deep ATS and CRM familiarity
- South African citizenship or a valid, unrestricted work permit

PREFERRED QUALIFICATIONS
- Prior experience navigating international recruitment markets and managing offshore client relationships
- A relevant tertiary qualification

REQUIRED SOFTWARE SKILLS
- Applicant Tracking Systems (e.g. Zoho Recruit, Bullhorn, or equivalent)
- Generative AI sourcing and productivity tools
- LinkedIn and related professional networking platforms
- Collaboration tools (Google Workspace, Slack, or MS Teams)

Source: RecruitMyMom (ZR_16980_JOB), Remote, South Africa. Market-related + commission. Permanent.`,
    competencies: [
      { skillName: "360 Recruitment & Talent Acquisition", importance: 5, minimumScore: 80 },
      { skillName: "Business Development & New Business Sales", importance: 5, minimumScore: 78 },
      { skillName: "Client Relationship Management", importance: 5, minimumScore: 75 },
      { skillName: "Executive & C-Suite Sourcing", importance: 4, minimumScore: 72 },
      { skillName: "Resilience & Target-Driven Performance", importance: 5, minimumScore: 75 },
      { skillName: "AI & Recruitment Tech Literacy (ATS/CRM)", importance: 4, minimumScore: 65 },
      { skillName: "Communication & Stakeholder Influence", importance: 4, minimumScore: 72 },
      { skillName: "Commercial Acumen", importance: 3, minimumScore: 60 },
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 76,
        "High Agency": 78,
        "Growth Mindset": 66,
        "Empathy & Ethics": 68,
        "Interpersonal Agility": 80,
        "Intellectual Curiosity": 63,
      },
      aiReadinessSkills: {
        "AI Literacy & Prompt Engineering": 68,
        "Collaboration & Communication": 78,
        "Data Fluency": 62,
        "Responsible AI & Ethical Awareness": 60,
        "Domain Expertise": 80,
        "Adaptability & Continuous Learning": 70,
        "Critical Thinking & Problem-Solving": 70,
        "Technical Fundamentals": 58,
        "Creativity & Innovation": 62,
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
      promptArchitectureScore: 60,
      aiqScore: 64,
      generatedAt: "2026-06-12T00:00:00.000Z",
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
