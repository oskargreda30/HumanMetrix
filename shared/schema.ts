import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User role enum
export const USER_ROLES = {
  CANDIDATE: "candidate",
  PARTNER_TEAM_MEMBER: "partner_team_member",
  ORGANIZATION_ADMIN: "organization_admin",
  PARTNER_ADMIN: "partner_admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Hiring pipeline stages
export const PIPELINE_STAGES = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  REVIEWING: "reviewing",
  SHORTLISTED: "shortlisted",
  HIRED: "hired",
  REJECTED: "rejected",
} as const;

export type PipelineStage = typeof PIPELINE_STAGES[keyof typeof PIPELINE_STAGES];

export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  "new",
  "in_progress",
  "completed",
  "reviewing",
  "shortlisted",
  "hired",
  "rejected",
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: "New",
  in_progress: "In Progress",
  completed: "Completed",
  reviewing: "Under Review",
  shortlisted: "Shortlisted",
  hired: "Hired",
  rejected: "Rejected",
};

// Organizations table - for multi-tenant employer support
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }),
  maxSeats: integer("max_seats").default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("candidate"),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  resetToken: varchar("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  autoLoginToken: varchar("auto_login_token"),
  autoLoginTokenExpiry: timestamp("auto_login_token_expiry"),
  resultsRetentionConsent: boolean("results_retention_consent"),
  resultsRetentionConsentDate: timestamp("results_retention_consent_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_role").on(table.role),
  index("idx_users_organization").on(table.organizationId),
]);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Purchases - one row per purchase transaction
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  invitationId: varchar("invitation_id").references(() => invitations.id, { onDelete: "set null" }),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  totalAmount: integer("total_amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  baseFee: integer("base_fee").notNull().default(30),
  status: text("status").notNull().default("pending"),
  resultsAccessPaid: boolean("results_access_paid").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_purchases_user").on(table.userId),
  index("idx_purchases_status").on(table.status),
  index("idx_purchases_user_status").on(table.userId, table.status),
]);

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
});

export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

// Purchase Items - tracks individual assessments in a purchase
export const purchaseItems = pgTable("purchase_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseId: varchar("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
  assessmentType: text("assessment_type").notNull(),
  price: integer("price").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_purchase_items_purchase").on(table.purchaseId),
  index("idx_purchase_items_type").on(table.assessmentType),
]);

export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({
  id: true,
  createdAt: true,
});

export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type PurchaseItem = typeof purchaseItems.$inferSelect;

// Assessment Results
export const assessmentResults = pgTable("assessment_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purchaseItemId: varchar("purchase_item_id").references(() => purchaseItems.id, { onDelete: "set null" }),
  invitationId: varchar("invitation_id").references(() => invitations.id, { onDelete: "set null" }),
  partnerInvitationId: varchar("partner_invitation_id"), // References partnerCandidateInvitations (defined later in file)
  assessmentType: text("assessment_type").notNull(),
  questionLocale: text("question_locale").notNull().default("default"), // 'default' or 'sea' for localized questions
  answers: jsonb("answers").notNull().$type<Record<string, any>>(),
  scores: jsonb("scores").notNull().$type<Record<string, number>>(),
  totalScore: integer("total_score"),
  percentile: integer("percentile"),
  evaluations: jsonb("evaluations").$type<any[]>(),
  status: text("status").notNull().default("in_progress"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  // Timer pause/resume fields
  pausedAt: timestamp("paused_at"), // When the assessment was paused
  pausedTimeRemainingMs: integer("paused_time_remaining_ms"), // Remaining time in milliseconds when paused
  pauseGraceExpiresAt: timestamp("pause_grace_expires_at"), // When the 30-min grace period expires
  resumeCount: integer("resume_count").default(0), // Number of times assessment has been resumed
}, (table) => [
  index("idx_results_user").on(table.userId),
  index("idx_results_type").on(table.assessmentType),
  index("idx_results_status").on(table.status),
  index("idx_results_user_type").on(table.userId, table.assessmentType),
  index("idx_results_purchase_item").on(table.purchaseItemId),
  index("idx_results_partner_invitation").on(table.partnerInvitationId),
]);

export const insertAssessmentResultSchema = createInsertSchema(assessmentResults).omit({
  id: true,
  startedAt: true,
  pausedAt: true,
  pausedTimeRemainingMs: true,
  pauseGraceExpiresAt: true,
  resumeCount: true,
});

export type InsertAssessmentResult = z.infer<typeof insertAssessmentResultSchema>;
export type AssessmentResult = typeof assessmentResults.$inferSelect;

// Invitations with secure tokens
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique().default(sql`encode(gen_random_bytes(32), 'hex')`),
  candidateEmail: text("candidate_email").notNull(),
  candidateName: text("candidate_name").notNull(),
  assessmentTypes: jsonb("assessment_types").notNull().$type<string[]>(),
  message: text("message"),
  sentBy: varchar("sent_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  status: text("status").notNull().default("sent"),
  expiresAt: timestamp("expires_at").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  emailBounced: boolean("email_bounced").default(false),
  bounceReason: text("bounce_reason"),
  bouncedAt: timestamp("bounced_at"),
}, (table) => [
  index("idx_invitations_token").on(table.token),
  index("idx_invitations_email").on(table.candidateEmail),
  index("idx_invitations_status").on(table.status),
]);

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  token: true,
  sentAt: true,
  status: true,
  completedAt: true,
});

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

// User References - for earning FREE discount code
export const userReferences = pgTable("user_references", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referenceText: text("reference_text").notNull(),
  wordCount: integer("word_count").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertUserReferenceSchema = createInsertSchema(userReferences).omit({
  id: true,
  submittedAt: true,
});

export type InsertUserReference = z.infer<typeof insertUserReferenceSchema>;
export type UserReference = typeof userReferences.$inferSelect;

// Prompt Architecture Evaluations
export const promptArchitectureEvaluations = pgTable("prompt_architecture_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resultId: varchar("result_id").notNull().references(() => assessmentResults.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  userPrompt: text("user_prompt").notNull(),
  aiResponse: text("ai_response"),
  evaluationScores: jsonb("evaluation_scores").$type<{
    clarity: number;
    structure: number;
    contextRelevance: number;
    creativity: number;
    iterativeImprovement: number;
  }>(),
  totalScore: integer("total_score"),
  feedback: text("feedback"),
  status: text("status").notNull().default("pending"),
  evaluatedAt: timestamp("evaluated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPromptArchitectureEvaluationSchema = createInsertSchema(promptArchitectureEvaluations).omit({
  id: true,
  createdAt: true,
});

export type InsertPromptArchitectureEvaluation = z.infer<typeof insertPromptArchitectureEvaluationSchema>;
export type PromptArchitectureEvaluation = typeof promptArchitectureEvaluations.$inferSelect;

// AIQ Rationales
export const aiqRationales = pgTable("aiq_rationales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resultId: varchar("result_id").notNull().references(() => assessmentResults.id, { onDelete: "cascade" }),
  questionNumber: integer("question_number").notNull(),
  selectedAnswer: text("selected_answer").notNull(),
  rationale: text("rationale").notNull(),
  rationaleScore: integer("rationale_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiqRationaleSchema = createInsertSchema(aiqRationales).omit({
  id: true,
  createdAt: true,
});

export type InsertAiqRationale = z.infer<typeof insertAiqRationaleSchema>;
export type AiqRationale = typeof aiqRationales.$inferSelect;

// Job Roles - predefined and custom roles for candidate matching
// Job role domains for semantic filtering in Role Flexibility Analysis
export type JobRoleDomain = 'technology' | 'creative' | 'business' | 'healthcare' | 'education' | 'finance' | 'operations' | 'sales' | 'other';

export const jobRoles = pgTable("job_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  domain: text("domain").$type<JobRoleDomain>(), // Semantic domain for role flexibility matching
  competencies: jsonb("competencies").notNull().$type<{
    skillName: string;
    importance: number; // 1-5 scale
    minimumScore: number; // 0-100
  }[]>(),
  requiredSkillScores: jsonb("required_skill_scores").$type<{
    fitSkills: Record<string, number>;
    aiReadinessSkills: Record<string, number>;
    promptArchitectureSkills?: Record<string, number>;
    aiqSkills?: Record<string, number>;
    skillCriticality?: Record<string, 'critical' | 'important' | 'nice-to-have'>;
    generatedAt?: string;
  }>(),
  isCustom: boolean("is_custom").notNull().default(false),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertJobRoleSchema = createInsertSchema(jobRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJobRole = z.infer<typeof insertJobRoleSchema>;
export type JobRole = typeof jobRoles.$inferSelect;

// Candidate Tags - for organizing and categorizing candidates
export const candidateTags = pgTable("candidate_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  color: varchar("color", { length: 7 }), // hex color
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCandidateTagSchema = createInsertSchema(candidateTags).omit({
  id: true,
  createdAt: true,
});

export type InsertCandidateTag = z.infer<typeof insertCandidateTagSchema>;
export type CandidateTag = typeof candidateTags.$inferSelect;

// Candidate Notes - admin notes about candidates
export const candidateNotes = pgTable("candidate_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCandidateNoteSchema = createInsertSchema(candidateNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCandidateNote = z.infer<typeof insertCandidateNoteSchema>;
export type CandidateNote = typeof candidateNotes.$inferSelect;

// Cached Role Alignments - store OpenAI analysis results
export const cachedRoleAlignments = pgTable("cached_role_alignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobRoleId: varchar("job_role_id").notNull().references(() => jobRoles.id, { onDelete: "cascade" }),
  overallFit: integer("overall_fit").notNull(), // 0-100 percentage
  skillAlignments: jsonb("skill_alignments").notNull().$type<{
    skillName: string;
    candidateScore: number;
    requiredScore: number;
    gap: number;
    alignment: string; // "excellent", "good", "fair", "poor"
    criticality?: 'critical' | 'important' | 'nice-to-have';
  }[]>(),
  fitSkillAlignments: jsonb("fit_skill_alignments").$type<{
    skillName: string;
    candidateScore: number;
    requiredScore: number;
    gap: number;
    alignment: string;
    criticality?: 'critical' | 'important' | 'nice-to-have';
  }[]>(),
  aiReadinessSkillAlignments: jsonb("ai_readiness_skill_alignments").$type<{
    skillName: string;
    candidateScore: number;
    requiredScore: number;
    gap: number;
    alignment: string;
    criticality?: 'critical' | 'important' | 'nice-to-have';
  }[]>(),
  strengths: jsonb("strengths").notNull().$type<string[]>(),
  gaps: jsonb("gaps").notNull().$type<string[]>(),
  recommendations: text("recommendations").notNull(),
  riskFlags: jsonb("risk_flags").$type<string[]>(),
  // Enhanced role fit features
  interviewQuestions: jsonb("interview_questions").$type<{
    question: string;
    purpose: string;
    targetSkill: string;
  }[]>(),
  dataRiskIndicators: jsonb("data_risk_indicators").$type<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }[]>(),
  roleFlexibility: jsonb("role_flexibility").$type<{
    roleId: string;
    roleName: string;
    fitScore: number;
    description?: string;
  }[]>(),
  finalRecommendation: text("final_recommendation"), // AI-generated recommendation text
  nextSteps: jsonb("next_steps").$type<string[]>(), // Recommended next steps array
  promptHash: text("prompt_hash").notNull(), // to invalidate cache when prompt changes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // cache TTL
});

export const insertCachedRoleAlignmentSchema = createInsertSchema(cachedRoleAlignments).omit({
  id: true,
  createdAt: true,
});

export type InsertCachedRoleAlignment = z.infer<typeof insertCachedRoleAlignmentSchema>;
export type CachedRoleAlignment = typeof cachedRoleAlignments.$inferSelect;

// Multi-Candidate Comparisons - store multi-candidate role fit comparisons
export const multiCandidateComparisons = pgTable("multi_candidate_comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobRoleId: varchar("job_role_id").notNull().references(() => jobRoles.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  candidateEntries: jsonb("candidate_entries").notNull().$type<{
    userId: string;
    userName: string;
    email: string;
    overallFit: number;
    rank: number;
    fitTier: 'strong' | 'moderate' | 'development-needed';
    skillScores: {
      skillName: string;
      score: number;
      requiredScore: number;
      gap: number;
      alignment: string;
      criticality?: 'critical' | 'important' | 'nice-to-have';
      category: 'fit' | 'ai_readiness';
    }[];
    strengths: (string | { skill: string; summary: string; description: string })[];
    gaps: (string | { skill: string; summary: string; description: string })[];
    riskFlags?: string[];
  }[]>(),
  roleSnapshot: jsonb("role_snapshot").notNull().$type<{
    roleId: string;
    roleName: string;
    requiredSkillScores: Record<string, { score: number; criticality: 'critical' | 'important' | 'nice-to-have' }>;
  }>(),
  summaryInsights: jsonb("summary_insights").$type<{
    topPerformer: { userId: string; userName: string; overallFit: number };
    averageFit: number;
    fitDistribution: { strong: number; moderate: number; developmentNeeded: number };
    commonStrengths: string[];
    commonGaps: string[];
    keyDifferentiators: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertMultiCandidateComparisonSchema = createInsertSchema(multiCandidateComparisons).omit({
  id: true,
  createdAt: true,
});

export type InsertMultiCandidateComparison = z.infer<typeof insertMultiCandidateComparisonSchema>;
export type MultiCandidateComparison = typeof multiCandidateComparisons.$inferSelect;

// Report Exports - track generated PDF reports and share links
export const reportExports = pgTable("report_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportType: text("report_type").notNull(), // "individual", "comparison", "role-alignment"
  userIds: jsonb("user_ids").notNull().$type<string[]>(), // candidates in report
  jobRoleId: varchar("job_role_id").references(() => jobRoles.id, { onDelete: "set null" }),
  shareToken: varchar("share_token").unique().default(sql`encode(gen_random_bytes(32), 'hex')`),
  expiresAt: timestamp("expires_at"),
  accessCount: integer("access_count").notNull().default(0),
  pdfUrl: text("pdf_url"), // if stored externally
  pdfData: text("pdf_data"), // base64 encoded if stored in DB
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
});

export const insertReportExportSchema = createInsertSchema(reportExports).omit({
  id: true,
  shareToken: true,
  createdAt: true,
  accessCount: true,
  lastAccessedAt: true,
});

export type InsertReportExport = z.infer<typeof insertReportExportSchema>;
export type ReportExport = typeof reportExports.$inferSelect;

// Marketing Opt-ins for email capture
export const marketingOptins = pgTable("marketing_optins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  source: varchar("source").default("job_ad"), // where they came from (job_ad, website, etc.)
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  consentGiven: boolean("consent_given").notNull().default(true),
  optedInAt: timestamp("opted_in_at").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
});

export const insertMarketingOptinSchema = createInsertSchema(marketingOptins).omit({
  id: true,
  optedInAt: true,
});

export type InsertMarketingOptin = z.infer<typeof insertMarketingOptinSchema>;
export type MarketingOptin = typeof marketingOptins.$inferSelect;

// Golden Set Prompts - benchmark prompts for scoring consistency verification
export const goldenSetPrompts = pgTable("golden_set_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  level: integer("level").notNull(),
  taskDescription: text("task_description").notNull(),
  promptText: text("prompt_text").notNull(),
  expectedScores: jsonb("expected_scores").notNull().$type<{
    clarity: number;
    structure: number;
    contextRelevance: number;
    creativity: number;
    iterativeImprovement: number;
    totalScore: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGoldenSetPromptSchema = createInsertSchema(goldenSetPrompts).omit({
  id: true,
  createdAt: true,
});

export type InsertGoldenSetPrompt = z.infer<typeof insertGoldenSetPromptSchema>;
export type GoldenSetPrompt = typeof goldenSetPrompts.$inferSelect;

// Golden Set Results - daily test results for scoring stability
export const goldenSetResults = pgTable("golden_set_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptId: varchar("prompt_id").notNull().references(() => goldenSetPrompts.id, { onDelete: "cascade" }),
  actualScores: jsonb("actual_scores").notNull().$type<{
    clarity: number;
    structure: number;
    contextRelevance: number;
    creativity: number;
    iterativeImprovement: number;
    totalScore: number;
    feedback: string;
  }>(),
  driftPercentage: integer("drift_percentage").notNull(),
  passed: boolean("passed").notNull(),
  testedAt: timestamp("tested_at").defaultNow().notNull(),
});

export const insertGoldenSetResultSchema = createInsertSchema(goldenSetResults).omit({
  id: true,
  testedAt: true,
});

export type InsertGoldenSetResult = z.infer<typeof insertGoldenSetResultSchema>;
export type GoldenSetResult = typeof goldenSetResults.$inferSelect;

// Assessment type constants
export const ASSESSMENT_TYPES = {
  FIT: "fit",
  AI_READINESS: "ai_readiness",
  PROMPT_ARCHITECTURE: "prompt_architecture",
  AIQ: "aiq",
} as const;

export const ASSESSMENT_PRICES = {
  [ASSESSMENT_TYPES.FIT]: 400, // £4.00 in pence
  [ASSESSMENT_TYPES.AI_READINESS]: 500, // £5.00 in pence
  [ASSESSMENT_TYPES.PROMPT_ARCHITECTURE]: 500, // £5.00 in pence
  [ASSESSMENT_TYPES.AIQ]: 400, // £4.00 in pence
} as const;

export const BASE_FEE = 1500; // £15.00 in pence

// B2C Retail Price - the public price test-takers pay to access their results
// Used for B2B test-taker emails (individual 25% discount, bundle 40% discount)
export const B2C_RETAIL_PRICE_PER_ASSESSMENT = 2000; // £20.00 in pence

// Helper for formatting prices in pence to GBP display
export function formatPriceGBP(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

// ============================================
// B2B Volume-Based Pricing ($1.00 = 1 Credit, 6-month expiration)
// ============================================

// Volume tiers based on monthly volume commitment (prices in USD cents for Tier 1 countries)
// PPP multipliers apply: Tier 1 = 1.0x (base), Tier 2 = 0.5x, Tier 3 = 0.25x
export const B2B_VOLUME_TIERS = {
  BOUTIQUE: { name: 'Boutique', volumeRange: '1-100', pricePerTest: 8000, trialQuota: 5 },      // $80/test (Tier 1), $40 (Tier 2), $20 (Tier 3)
  GROWTH: { name: 'Growth', volumeRange: '101-500', pricePerTest: 4000, trialQuota: 10 },       // $40/test (Tier 1), $20 (Tier 2), $10 (Tier 3)
  SMALL_ENTERPRISE: { name: 'Small Enterprise', volumeRange: '501-2,500', pricePerTest: 2000, trialQuota: 20 }, // $20/test (Tier 1), $10 (Tier 2), $5 (Tier 3)
  ENTERPRISE: { name: 'Enterprise', volumeRange: '2,501-9,999', pricePerTest: 1000, trialQuota: 50 }, // $10/test (Tier 1), $5 (Tier 2), $2.50 (Tier 3)
  PRO: { name: 'Pro', volumeRange: '10,000+', pricePerTest: 400, trialQuota: 50 },              // $4/test (Tier 1), $2 (Tier 2), $1 (Tier 3)
} as const;

// Unbundled report pricing discounts
export const REPORT_DISCOUNTS = {
  COMPARISON: 0.30, // 30% discount from base rate for Comparison Reports
  ROLE_FIT: 0.20,   // 20% discount from base rate for Role Fit Reports
} as const;

// Credit expiration policy
export const CREDIT_EXPIRATION_MONTHS = 6;

// Helper to get trial quota based on tier name
export function getTrialQuotaForTier(tierName: string): number {
  const tier = Object.values(B2B_VOLUME_TIERS).find(t => t.name.toLowerCase() === tierName.toLowerCase());
  return tier?.trialQuota || B2B_VOLUME_TIERS.BOUTIQUE.trialQuota;
}

// Helper to get price per test based on tier name
export function getPriceForTier(tierName: string): number {
  const tier = Object.values(B2B_VOLUME_TIERS).find(t => t.name.toLowerCase() === tierName.toLowerCase());
  return tier?.pricePerTest || B2B_VOLUME_TIERS.BOUTIQUE.pricePerTest;
}

export function normalizeAssessmentId(id: string): keyof typeof ASSESSMENT_PRICES {
  const mapping: Record<string, keyof typeof ASSESSMENT_PRICES> = {
    "fit": "fit",
    "ai-readiness": "ai_readiness",
    "ai_readiness": "ai_readiness",
    "prompt-architecture": "prompt_architecture",
    "prompt_architecture": "prompt_architecture",
    "aiq": "aiq",
  };
  
  const normalized = mapping[id];
  if (!normalized) {
    console.warn(`Unknown assessment ID "${id}", returning as-is`);
    return id as keyof typeof ASSESSMENT_PRICES;
  }
  
  return normalized;
}

// ============================================
// B2B Partner Integration Tables
// ============================================

// Partner accounts - B2B clients who embed assessments
export const partnerAccounts = pgTable("partner_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  companyName: varchar("company_name").notNull(),
  website: varchar("website"),
  country: varchar("country"), // Partner's country
  phone: varchar("phone"), // Partner's phone number
  currency: varchar("currency").notNull().default("GBP"), // Partner's preferred currency (GBP, USD, EUR)
  logoUrl: varchar("logo_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  airwallexCustomerId: varchar("airwallex_customer_id"), // Airwallex customer ID for partners using Airwallex
  billingEmail: varchar("billing_email"),
  organizationId: varchar("organization_id").references(() => organizations.id), // Link to organisation for admin dashboard access
  monthlyQuota: integer("monthly_quota").default(1000),
  pricePerAssessment: integer("price_per_assessment").default(500), // £5.00 in pence
  isActive: boolean("is_active").notNull().default(true),
  // Billing configuration - 3 payment tiers:
  // 'payg': Pay As You Go - No card on file. Bulk discounts via upfront purchase. API/dashboard suspended at zero credits.
  // 'subscription': Subscription + Auto-Bill (Ideal) - Card on file. No bulk discount. Min monthly charge + auto-bill for usage at base rates.
  // 'enterprise': Enterprise Prepayment - For high-volume BPOs. Immediate pro-forma invoicing for bulk credit blocks. No credit extended.
  billingType: varchar("billing_type").notNull().default("payg"), // 'payg', 'subscription', or 'enterprise'
  freeTestsAllocated: integer("free_tests_allocated").notNull().default(0), // Complimentary tests given on signup
  freeTestsExpiresAt: timestamp("free_tests_expires_at"), // Expiry date for free tests (7 days from allocation)
  // Prepaid billing fields
  prepaidBalance: integer("prepaid_balance").notNull().default(0), // Current test credit balance
  prepaidCreditsExpiresAt: timestamp("prepaid_credits_expires_at"), // Expiry date for prepaid credits (6 months from purchase per pricing policy)
  // Auto-bill fields
  stripePaymentMethodId: varchar("stripe_payment_method_id"), // Card on file for auto-billing
  cardOnFile: boolean("card_on_file").notNull().default(false), // Whether prepaid partner has saved card for overage billing
  cardLast4: varchar("card_last4", { length: 4 }), // Last 4 digits of saved card for display
  cardBrand: varchar("card_brand"), // Card brand (visa, mastercard, amex, etc.)
  overageRatePerTest: integer("overage_rate_per_test").default(500), // Rate per test over quota in pence (default £5.00)
  billingCycleAnchor: integer("billing_cycle_anchor").default(1), // Day of month for billing (1-28)
  lastBilledAt: timestamp("last_billed_at"), // Last successful auto-bill date
  lastOverageBilledAt: timestamp("last_overage_billed_at"), // Last overage billing date
  currentMonthUsage: integer("current_month_usage").notNull().default(0), // Tests used this billing cycle
  pendingOverageAmount: integer("pending_overage_amount").notNull().default(0), // Accumulated overage charges pending billing (in pence)
  // Billing failure tracking
  failedBillingAttempts: integer("failed_billing_attempts").notNull().default(0), // Count of consecutive failed billing attempts
  lastBillingFailureAt: timestamp("last_billing_failure_at"), // When the last billing failure occurred
  billingFailureReason: varchar("billing_failure_reason"), // Last error reason (e.g., 'card_declined', 'no_payment_method', 'insufficient_funds')
  nextBillingRetryAt: timestamp("next_billing_retry_at"), // When to retry failed billing (3, 5, 7 day schedule)
  cardExpiryMonth: integer("card_expiry_month"), // Card expiration month (1-12)
  cardExpiryYear: integer("card_expiry_year"), // Card expiration year (e.g., 2026)
  cardExpiryWarningsSent: integer("card_expiry_warnings_sent").notNull().default(0), // Count of expiry warnings sent (0, 1=14d, 2=7d, 3=1d)
  billingStatusOverride: varchar("billing_status_override"), // 'suspended_billing_failure', 'suspended_invoice_overdue' - API suspended due to billing issues
  // Invoice enforcement fields
  invoiceOverdueSuspendedAt: timestamp("invoice_overdue_suspended_at"), // When API was suspended due to overdue invoice
  invoiceOverdueNotificationsSent: integer("invoice_overdue_notifications_sent").notNull().default(0), // Count of overdue notices (0, 1=7d, 2=14d before suspension, 3=suspended)
  // Invoice fields
  paymentTermsDays: integer("payment_terms_days").default(30), // For invoice clients: Net 15/30/45/60/90
  invoiceNotes: varchar("invoice_notes"), // Special terms or notes for invoiced clients
  invoiceContact: varchar("invoice_contact"), // Contact name for invoices
  // Billing address for enterprise clients (required for VAT invoices)
  billingAddressLine1: varchar("billing_address_line1"), // Street address
  billingAddressLine2: varchar("billing_address_line2"), // Suite/unit (optional)
  billingCity: varchar("billing_city"),
  billingPostcode: varchar("billing_postcode"),
  billingCountry: varchar("billing_country"),
  // Tax/company registration
  vatNumber: varchar("vat_number"), // VAT registration number (if applicable)
  companyRegistrationNumber: varchar("company_registration_number"), // Companies House number
  purchaseOrderRequired: boolean("purchase_order_required").notNull().default(false), // Whether PO number is required on invoices
  defaultPurchaseOrderNumber: varchar("default_purchase_order_number"), // Default PO number if set
  // Onboarding tracking
  billingSetupComplete: boolean("billing_setup_complete").notNull().default(false), // Whether billing info has been submitted
  // Quota tracking fields
  testsPurchased: integer("tests_purchased").notNull().default(0),
  testsConsumed: integer("tests_consumed").notNull().default(0),
  last70NoticeAt: timestamp("last_70_notice_at"),
  last90NoticeAt: timestamp("last_90_notice_at"),
  apiAccessSuspendedAt: timestamp("api_access_suspended_at"),
  // Quota alert settings (self-service)
  quotaAlertEnabled: boolean("quota_alert_enabled").notNull().default(true),
  quotaAlertThreshold: integer("quota_alert_threshold").notNull().default(80), // Percentage (e.g., 80 = alert at 80% usage)
  quotaAlertEmail: varchar("quota_alert_email"), // Override email for quota alerts (null = use billingEmail)
  // Auto top-up settings for prepaid partners
  autoTopUpEnabled: boolean("auto_top_up_enabled").notNull().default(false),
  autoTopUpThreshold: integer("auto_top_up_threshold").default(10), // Top up when balance falls below this
  autoTopUpPackage: varchar("auto_top_up_package"), // Package tier to purchase (e.g., "starter", "growth")
  lastLowBalanceNotificationLevel: integer("last_low_balance_notification_level").default(100), // Track low balance notification thresholds (10, 5, 2)
  // White-label branding settings
  brandingEnabled: boolean("branding_enabled").notNull().default(false),
  brandingPrimaryColor: varchar("branding_primary_color"), // Hex color e.g. "#0891b2"
  brandingAccentColor: varchar("branding_accent_color"), // Hex color for accents
  brandingWelcomeTitle: varchar("branding_welcome_title"), // Custom welcome title for candidates
  brandingWelcomeMessage: text("branding_welcome_message"), // Custom welcome message
  brandingCompanyDisplayName: varchar("branding_company_display_name"), // Display name shown to candidates (can differ from companyName)
  // Terms acceptance tracking
  termsAccepted: boolean("terms_accepted").notNull().default(false), // EULA and Privacy Policy accepted
  termsAcceptedAt: timestamp("terms_accepted_at"), // When terms were accepted
  // Tour completion tracking
  tourCompleted: boolean("tour_completed").notNull().default(false), // Dashboard tour has been completed
  // Payment provider configuration
  paymentProvider: varchar("payment_provider").notNull().default("airwallex"), // 'stripe' or 'airwallex'
  // Notification preferences (JSON object with notification type keys and boolean values)
  // Partners can toggle these on/off in Settings > Notifications
  notificationPreferences: jsonb("notification_preferences").$type<{
    // Assessment notifications
    assessment_completed?: boolean;        // Individual assessment completion notifications
    assessment_all_completed?: boolean;    // All assessments completed notifications
    assessment_link_expired?: boolean;     // Link expiration notifications
    high_incomplete_rate?: boolean;        // High incomplete rate alerts
    // Team notifications
    team_member_role_changed?: boolean;    // Team member role changes
    team_member_joined?: boolean;          // New team member joined
    team_member_removed?: boolean;         // Team member removed
    // Usage & reports
    monthly_summary?: boolean;             // Monthly usage summary reports
    new_ip_access?: boolean;               // New IP address detected accessing API
    // Billing notifications
    billing_success?: boolean;             // Successful billing notifications
    credits_purchased?: boolean;           // Credits purchased notifications
    invoice_generated?: boolean;           // Invoice generated notifications
    // Note: Security alerts (API key regeneration, auth failures) and quota warnings 
    // are always sent regardless of preferences as they are critical notifications
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_accounts_email").on(table.email),
  index("idx_partner_accounts_stripe").on(table.stripeCustomerId),
  index("idx_partner_accounts_org").on(table.organizationId),
]);

export const insertPartnerAccountSchema = createInsertSchema(partnerAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPartnerAccount = z.infer<typeof insertPartnerAccountSchema>;
export type PartnerAccount = typeof partnerAccounts.$inferSelect;

// Partner organisations - sub-accounts managed by B2B partners (e.g., client companies they work with)
export const partnerOrganisations = pgTable("partner_organisations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull(), // URL-friendly identifier
  contactEmail: varchar("contact_email"),
  contactName: varchar("contact_name"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_organisations_partner").on(table.partnerId),
  index("idx_partner_organisations_slug").on(table.partnerId, table.slug),
]);

export const insertPartnerOrganisationSchema = createInsertSchema(partnerOrganisations).omit({
  id: true,
  createdAt: true,
});

export type InsertPartnerOrganisation = z.infer<typeof insertPartnerOrganisationSchema>;
export type PartnerOrganisation = typeof partnerOrganisations.$inferSelect;

// Partner overage ledger - tracks monthly overage charges for prepaid partners with card on file
export const partnerOverageLedger = pgTable("partner_overage_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  billingMonth: varchar("billing_month", { length: 7 }).notNull(), // Format: YYYY-MM
  testsOverLimit: integer("tests_over_limit").notNull().default(0), // Number of tests over prepaid balance
  unitPrice: integer("unit_price").notNull(), // Price per test in pence at time of billing
  totalAmount: integer("total_amount").notNull(), // Total charge in pence
  chargeStatus: varchar("charge_status").notNull().default("pending"), // pending, charged, failed, waived
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // Stripe payment intent for this charge
  stripeInvoiceId: varchar("stripe_invoice_id"), // Stripe invoice ID if using invoices
  failureReason: varchar("failure_reason"), // Reason if charge failed
  chargedAt: timestamp("charged_at"), // When payment was collected
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_overage_ledger_partner").on(table.partnerId),
  index("idx_partner_overage_ledger_month").on(table.partnerId, table.billingMonth),
  index("idx_partner_overage_ledger_status").on(table.chargeStatus),
]);

export const insertPartnerOverageLedgerSchema = createInsertSchema(partnerOverageLedger).omit({
  id: true,
  createdAt: true,
  chargedAt: true,
});

export type InsertPartnerOverageLedger = z.infer<typeof insertPartnerOverageLedgerSchema>;
export type PartnerOverageLedger = typeof partnerOverageLedger.$inferSelect;

// Partner API keys - for authentication
// Keys can be either partner-level (parent key for billing) or organisation-level (for usage tracking)
export const partnerApiKeys = pgTable("partner_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  partnerOrganisationId: varchar("partner_organisation_id").references(() => partnerOrganisations.id, { onDelete: "cascade" }), // NULL = parent key, non-NULL = organisation-specific key
  keyPrefix: varchar("key_prefix", { length: 8 }).notNull(), // First 8 chars for lookup (e.g., "pk_live_")
  keyHash: varchar("key_hash").notNull(), // Hashed full key
  keyHint: varchar("key_hint", { length: 8 }).notNull(), // Last 4 chars for display
  name: varchar("name").notNull().default("Default"),
  environment: varchar("environment").notNull().default("test"), // "test" or "live"
  permissions: jsonb("permissions").notNull().$type<string[]>().default(["assessments:read", "assessments:write", "results:read"]),
  rateLimit: integer("rate_limit").default(100), // requests per minute
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_api_keys_partner").on(table.partnerId),
  index("idx_partner_api_keys_prefix").on(table.keyPrefix),
]);

export const insertPartnerApiKeySchema = createInsertSchema(partnerApiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export type InsertPartnerApiKey = z.infer<typeof insertPartnerApiKeySchema>;
export type PartnerApiKey = typeof partnerApiKeys.$inferSelect;

// Assessment sessions - tracks each embedded assessment instance
export const assessmentSessions = pgTable("assessment_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  partnerOrganisationId: varchar("partner_organisation_id").references(() => partnerOrganisations.id, { onDelete: "set null" }), // Which client organisation this session belongs to
  apiKeyId: varchar("api_key_id").references(() => partnerApiKeys.id, { onDelete: "set null" }), // Nullable for invite-based sessions
  externalUserId: varchar("external_user_id"), // Partner's user ID
  externalEmail: varchar("external_email"),
  assessmentType: varchar("assessment_type").notNull(),
  questionLocale: varchar("question_locale").notNull().default("default"), // 'default' or 'sea' for localized questions
  status: varchar("status").notNull().default("created"), // created, started, completed, expired
  answers: jsonb("answers").$type<Record<string, any>>(),
  lastAnsweredIndex: integer("last_answered_index"), // Track progress for resume functionality
  lastActivityAt: timestamp("last_activity_at"), // Track when user last interacted
  scores: jsonb("scores").$type<Record<string, number>>(),
  totalScore: integer("total_score"),
  percentile: integer("percentile"),
  evaluations: jsonb("evaluations").$type<any[]>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Custom data from partner
  webhookUrl: varchar("webhook_url"), // Optional callback URL
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Test session flag (prevents emails being sent for test API key sessions)
  isTestSession: boolean("is_test_session").default(false),
  // Delayed results delivery fields for B2B widget (30-day free release)
  resultsReleaseScheduledAt: timestamp("results_release_scheduled_at"), // When free results should be auto-emailed (completedAt + 30 days)
  resultsReleasedAt: timestamp("results_released_at"), // When results were actually released (paid or auto)
  resultsReleaseStatus: varchar("results_release_status").default("pending"), // pending, paid, released, cancelled
  // Legacy fields for scheduler compatibility
  resultsUnlockAt: timestamp("results_unlock_at"), // When free results become available (30 days after completion)
  resultsEmailSentAt: timestamp("results_email_sent_at"), // When results email was successfully sent
  resultsPaymentStatus: varchar("results_payment_status").default("unpaid"), // unpaid, paid
  resultsDeliveryStatus: varchar("results_delivery_status").default("pending"), // pending, sent, failed
  resultsDeliveryAttemptCount: integer("results_delivery_attempt_count").default(0), // Number of email delivery attempts
  lastResultsDeliveryAttemptAt: timestamp("last_results_delivery_attempt_at"), // Last email delivery attempt timestamp
  // Payment details
  resultsPaidAt: timestamp("results_paid_at"), // When payment was received
  resultsPaymentAmount: integer("results_payment_amount"), // Amount paid in pence
  resultsPaymentCurrency: varchar("results_payment_currency"), // Currency of payment (e.g., 'gbp', 'usd')
  // Hiring pipeline fields
  pipelineStage: varchar("pipeline_stage").default("new"), // new, in_progress, completed, reviewing, shortlisted, hired, rejected
  pipelineStageUpdatedAt: timestamp("pipeline_stage_updated_at"),
  pipelineStageUpdatedBy: varchar("pipeline_stage_updated_by"), // User ID who updated the stage
  pipelineNotes: text("pipeline_notes"), // Notes about the candidate
  // Timer pause/resume fields
  pausedAt: timestamp("paused_at"), // When the assessment was paused
  pausedTimeRemainingMs: integer("paused_time_remaining_ms"), // Remaining time in milliseconds when paused
  pauseGraceExpiresAt: timestamp("pause_grace_expires_at"), // When the 30-min grace period expires
  resumeCount: integer("resume_count").default(0), // Number of times assessment has been resumed
}, (table) => [
  index("idx_assessment_sessions_partner").on(table.partnerId),
  index("idx_assessment_sessions_status").on(table.status),
  index("idx_assessment_sessions_external").on(table.partnerId, table.externalUserId),
  index("idx_assessment_sessions_release").on(table.resultsReleaseStatus, table.resultsReleaseScheduledAt),
  index("idx_assessment_sessions_unlock").on(table.resultsPaymentStatus, table.resultsUnlockAt),
  index("idx_assessment_sessions_pipeline").on(table.partnerId, table.pipelineStage),
]);

export const insertAssessmentSessionSchema = createInsertSchema(assessmentSessions).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
  pausedAt: true,
  pausedTimeRemainingMs: true,
  pauseGraceExpiresAt: true,
  resumeCount: true,
});

export type InsertAssessmentSession = z.infer<typeof insertAssessmentSessionSchema>;
export type AssessmentSession = typeof assessmentSessions.$inferSelect;

// Usage events - for billing and analytics
export const usageEvents = pgTable("usage_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  partnerOrganisationId: varchar("partner_organisation_id").references(() => partnerOrganisations.id, { onDelete: "set null" }), // Which client organisation this usage belongs to
  apiKeyId: varchar("api_key_id").references(() => partnerApiKeys.id, { onDelete: "set null" }),
  sessionId: varchar("session_id").references(() => assessmentSessions.id, { onDelete: "set null" }),
  eventType: varchar("event_type").notNull(), // session_created, session_started, session_completed, results_fetched
  assessmentType: varchar("assessment_type"),
  billable: boolean("billable").notNull().default(false),
  billedAmount: integer("billed_amount"), // Amount in pence
  stripeUsageRecordId: varchar("stripe_usage_record_id"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_usage_events_partner").on(table.partnerId),
  index("idx_usage_events_type").on(table.eventType),
  index("idx_usage_events_created").on(table.createdAt),
  index("idx_usage_events_billable").on(table.partnerId, table.billable, table.createdAt),
]);

export const insertUsageEventSchema = createInsertSchema(usageEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertUsageEvent = z.infer<typeof insertUsageEventSchema>;
export type UsageEvent = typeof usageEvents.$inferSelect;

// Partner test packages - prepaid test credits
export const partnerTestPackages = pgTable("partner_test_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  packageSize: integer("package_size").notNull(), // Number of tests in package
  pricePerTest: integer("price_per_test").notNull(), // Price per test in pence
  totalPrice: integer("total_price").notNull(), // Total price in pence
  currency: varchar("currency").notNull().default("gbp"),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  airwallexPaymentIntentId: varchar("airwallex_payment_intent_id"), // Airwallex payment intent ID
  paymentProvider: varchar("payment_provider").default("airwallex"), // 'stripe' or 'airwallex'
  status: varchar("status").notNull().default("pending"), // pending, completed, failed, refunded
  purchasedAt: timestamp("purchased_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_packages_partner").on(table.partnerId),
  index("idx_partner_packages_status").on(table.status),
  index("idx_partner_packages_stripe").on(table.stripeCheckoutSessionId),
]);

export const insertPartnerTestPackageSchema = createInsertSchema(partnerTestPackages).omit({
  id: true,
  createdAt: true,
  purchasedAt: true,
});

export type InsertPartnerTestPackage = z.infer<typeof insertPartnerTestPackageSchema>;
export type PartnerTestPackage = typeof partnerTestPackages.$inferSelect;

// Partner quota ledger - tracks all credit/debit transactions
export const partnerQuotaLedger = pgTable("partner_quota_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  packageId: varchar("package_id").references(() => partnerTestPackages.id, { onDelete: "set null" }),
  sessionId: varchar("session_id").references(() => assessmentSessions.id, { onDelete: "set null" }),
  entryType: varchar("entry_type").notNull(), // credit (package purchase) or debit (test consumed)
  amount: integer("amount").notNull(), // Positive for credits, negative for debits
  balanceAfter: integer("balance_after").notNull(), // Running balance after this entry
  description: varchar("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_quota_ledger_partner").on(table.partnerId),
  index("idx_quota_ledger_type").on(table.entryType),
  index("idx_quota_ledger_created").on(table.createdAt),
]);

export const insertPartnerQuotaLedgerSchema = createInsertSchema(partnerQuotaLedger).omit({
  id: true,
  createdAt: true,
});

export type InsertPartnerQuotaLedger = z.infer<typeof insertPartnerQuotaLedgerSchema>;
export type PartnerQuotaLedger = typeof partnerQuotaLedger.$inferSelect;

// Partner invoices - tracks invoices sent to enterprise clients
export const partnerInvoices = pgTable("partner_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number").notNull().unique(), // e.g., INV-2024-0001
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  testsUsed: integer("tests_used").notNull().default(0),
  pricePerTest: integer("price_per_test").notNull(), // In pence
  subtotal: integer("subtotal").notNull(), // In pence
  vatRate: integer("vat_rate").notNull().default(20), // VAT percentage (20% default)
  vatAmount: integer("vat_amount").notNull().default(0), // In pence
  totalAmount: integer("total_amount").notNull(), // In pence (subtotal + VAT)
  currency: varchar("currency").notNull().default("gbp"),
  status: varchar("status").notNull().default("sent"), // sent, paid, overdue, cancelled
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  sentToEmail: varchar("sent_to_email").notNull(),
  sentByUserId: varchar("sent_by_user_id").references(() => users.id),
  lastOverdueNotificationDays: integer("last_overdue_notification_days").default(0), // Track overdue notification milestones (7, 14, 30)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_invoices_partner").on(table.partnerId),
  index("idx_partner_invoices_status").on(table.status),
  index("idx_partner_invoices_number").on(table.invoiceNumber),
  index("idx_partner_invoices_created").on(table.createdAt),
]);

export const insertPartnerInvoiceSchema = createInsertSchema(partnerInvoices).omit({
  id: true,
  createdAt: true,
});

export type InsertPartnerInvoice = z.infer<typeof insertPartnerInvoiceSchema>;
export type PartnerInvoice = typeof partnerInvoices.$inferSelect;

// Partner monthly usage - aggregated monthly usage for auto-billing and invoicing
export const partnerMonthlyUsage = pgTable("partner_monthly_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  monthKey: varchar("month_key").notNull(), // Format: YYYY-MM (e.g., "2024-12")
  testsUsed: integer("tests_used").notNull().default(0),
  totalAmountPence: integer("total_amount_pence").notNull().default(0), // Calculated at pricePerAssessment
  billingStatus: varchar("billing_status").notNull().default("pending"), // pending, billed, failed, waived
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // For auto-bill
  invoiceId: varchar("invoice_id").references(() => partnerInvoices.id, { onDelete: "set null" }), // For invoice billing
  billedAt: timestamp("billed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_monthly_usage_partner").on(table.partnerId),
  index("idx_partner_monthly_usage_month").on(table.monthKey),
  index("idx_partner_monthly_usage_status").on(table.billingStatus),
]);

export const insertPartnerMonthlyUsageSchema = createInsertSchema(partnerMonthlyUsage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPartnerMonthlyUsage = z.infer<typeof insertPartnerMonthlyUsageSchema>;
export type PartnerMonthlyUsage = typeof partnerMonthlyUsage.$inferSelect;

// Billing type enum for TypeScript
export const PARTNER_BILLING_TYPES = {
  PREPAID: 'prepaid',
  AUTO_BILL: 'auto_bill',
  INVOICE: 'invoice',
} as const;

export type PartnerBillingType = typeof PARTNER_BILLING_TYPES[keyof typeof PARTNER_BILLING_TYPES];

// Error severity levels
export const ERROR_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;

export type ErrorSeverity = typeof ERROR_SEVERITY[keyof typeof ERROR_SEVERITY];

// Error status for tracking resolution
export const ERROR_STATUS = {
  NEW: 'new',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  IGNORED: 'ignored',
} as const;

export type ErrorStatus = typeof ERROR_STATUS[keyof typeof ERROR_STATUS];

// Error logs table - tracks application errors for debugging
export const errorLogs = pgTable("error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Error details
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"),
  errorType: varchar("error_type").notNull().default("Error"), // e.g., TypeError, ValidationError
  severity: varchar("severity").notNull().default("error"), // info, warning, error, critical
  status: varchar("status").notNull().default("new"), // new, investigating, resolved, ignored
  // Context
  endpoint: varchar("endpoint"), // API endpoint if applicable
  httpMethod: varchar("http_method"), // GET, POST, etc.
  httpStatus: integer("http_status"), // Response status code
  requestBody: jsonb("request_body"), // Sanitised request data
  responseBody: jsonb("response_body"), // Sanitised response data
  // User/Client identification
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  userEmail: varchar("user_email"), // Stored separately in case user is deleted
  userName: varchar("user_name"), // For quick reference
  partnerId: varchar("partner_id").references(() => partnerAccounts.id, { onDelete: "set null" }),
  partnerName: varchar("partner_name"), // For quick reference
  sessionId: varchar("session_id"), // Assessment session ID if applicable
  // Environment context
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  environment: varchar("environment").default("production"), // development, production
  // Metadata
  fingerprint: varchar("fingerprint"), // Hash for grouping similar errors
  occurrenceCount: integer("occurrence_count").notNull().default(1), // How many times this error occurred
  firstOccurredAt: timestamp("first_occurred_at").defaultNow().notNull(),
  lastOccurredAt: timestamp("last_occurred_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"), // Admin notes for debugging
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_error_logs_severity").on(table.severity),
  index("idx_error_logs_status").on(table.status),
  index("idx_error_logs_user").on(table.userId),
  index("idx_error_logs_partner").on(table.partnerId),
  index("idx_error_logs_fingerprint").on(table.fingerprint),
  index("idx_error_logs_created").on(table.createdAt),
  index("idx_error_logs_last_occurred").on(table.lastOccurredAt),
]);

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;
export type ErrorLog = typeof errorLogs.$inferSelect;

// Partner webhook events enum
export const WEBHOOK_EVENTS = {
  ASSESSMENT_COMPLETED: 'assessment.completed',
  ASSESSMENT_STARTED: 'assessment.started',
  SESSION_CREATED: 'session.created',
  SESSION_EXPIRED: 'session.expired',
  RESULTS_READY: 'results.ready',
} as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];

// Partner webhooks - configurable webhook endpoints for event notifications
export const partnerWebhooks = pgTable("partner_webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // Friendly name for the webhook
  url: varchar("url").notNull(), // Webhook endpoint URL
  secret: varchar("secret").notNull(), // HMAC secret for signature verification
  events: jsonb("events").notNull().$type<string[]>().default([]), // Events to subscribe to
  isActive: boolean("is_active").notNull().default(true),
  // Retry settings
  maxRetries: integer("max_retries").notNull().default(3),
  retryDelaySeconds: integer("retry_delay_seconds").notNull().default(60),
  // Stats
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastSuccessAt: timestamp("last_success_at"),
  lastFailureAt: timestamp("last_failure_at"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  successfulDeliveries: integer("successful_deliveries").notNull().default(0),
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_webhooks_partner").on(table.partnerId),
  index("idx_partner_webhooks_active").on(table.isActive),
]);

export const insertPartnerWebhookSchema = createInsertSchema(partnerWebhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTriggeredAt: true,
  lastSuccessAt: true,
  lastFailureAt: true,
  consecutiveFailures: true,
  totalDeliveries: true,
  successfulDeliveries: true,
});

export type InsertPartnerWebhook = z.infer<typeof insertPartnerWebhookSchema>;
export type PartnerWebhook = typeof partnerWebhooks.$inferSelect;

// Webhook delivery log - tracks each webhook delivery attempt
export const webhookDeliveryLogs = pgTable("webhook_delivery_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: varchar("webhook_id").notNull().references(() => partnerWebhooks.id, { onDelete: "cascade" }),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").references(() => assessmentSessions.id, { onDelete: "set null" }),
  eventType: varchar("event_type").notNull(),
  payload: jsonb("payload").notNull().$type<Record<string, any>>(),
  // Delivery status
  status: varchar("status").notNull().default("pending"), // pending, delivered, failed, retrying
  httpStatus: integer("http_status"),
  responseBody: text("response_body"),
  errorMessage: text("error_message"),
  // Retry tracking
  attemptNumber: integer("attempt_number").notNull().default(1),
  nextRetryAt: timestamp("next_retry_at"),
  // Timestamps
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_webhook_delivery_webhook").on(table.webhookId),
  index("idx_webhook_delivery_partner").on(table.partnerId),
  index("idx_webhook_delivery_status").on(table.status),
  index("idx_webhook_delivery_retry").on(table.nextRetryAt),
]);

export const insertWebhookDeliveryLogSchema = createInsertSchema(webhookDeliveryLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertWebhookDeliveryLog = z.infer<typeof insertWebhookDeliveryLogSchema>;
export type WebhookDeliveryLog = typeof webhookDeliveryLogs.$inferSelect;

// ATS integration types
export const ATS_PROVIDERS = {
  GREENHOUSE: 'greenhouse',
  LEVER: 'lever',
  WORKDAY: 'workday',
  SAP_SUCCESSFACTORS: 'sap_successfactors',
  ORACLE_HCM: 'oracle_hcm',
  CUSTOM: 'custom',
} as const;

export type AtsProvider = typeof ATS_PROVIDERS[keyof typeof ATS_PROVIDERS];

// Partner ATS integrations - connects to recruitment software
export const partnerAtsIntegrations = pgTable("partner_ats_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // Friendly name
  provider: varchar("provider").notNull(), // greenhouse, lever, workday, etc.
  isActive: boolean("is_active").notNull().default(true),
  // Connection settings
  apiBaseUrl: varchar("api_base_url"), // For custom integrations
  apiKeyEncrypted: varchar("api_key_encrypted"), // Encrypted API key
  oauthAccessToken: varchar("oauth_access_token"), // For OAuth-based integrations
  oauthRefreshToken: varchar("oauth_refresh_token"),
  oauthExpiresAt: timestamp("oauth_expires_at"),
  // Sync settings
  syncMode: varchar("sync_mode").notNull().default("push"), // push (send to ATS), pull (fetch from ATS), bidirectional
  syncEvents: jsonb("sync_events").notNull().$type<string[]>().default([]), // Which events trigger syncs
  fieldMapping: jsonb("field_mapping").$type<Record<string, string>>(), // Map HumanMetrix fields to ATS fields
  // Stats
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: varchar("last_sync_status"), // success, partial, failed
  totalSyncs: integer("total_syncs").notNull().default(0),
  successfulSyncs: integer("successful_syncs").notNull().default(0),
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_ats_partner").on(table.partnerId),
  index("idx_partner_ats_provider").on(table.provider),
  index("idx_partner_ats_active").on(table.isActive),
]);

export const insertPartnerAtsIntegrationSchema = createInsertSchema(partnerAtsIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
  lastSyncStatus: true,
  totalSyncs: true,
  successfulSyncs: true,
});

export type InsertPartnerAtsIntegration = z.infer<typeof insertPartnerAtsIntegrationSchema>;
export type PartnerAtsIntegration = typeof partnerAtsIntegrations.$inferSelect;

// Export schedule frequency
export const EXPORT_FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

export type ExportFrequency = typeof EXPORT_FREQUENCIES[keyof typeof EXPORT_FREQUENCIES];

// Partner scheduled exports - automated CSV exports to external systems
export const partnerScheduledExports = pgTable("partner_scheduled_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // Friendly name
  isActive: boolean("is_active").notNull().default(true),
  // Schedule settings
  frequency: varchar("frequency").notNull().default("weekly"), // daily, weekly, monthly
  dayOfWeek: integer("day_of_week"), // 0=Sunday, 6=Saturday (for weekly)
  dayOfMonth: integer("day_of_month"), // 1-28 (for monthly)
  timeOfDay: varchar("time_of_day").notNull().default("06:00"), // HH:mm in UTC
  timezone: varchar("timezone").notNull().default("UTC"),
  // Export content
  exportType: varchar("export_type").notNull(), // assessments, billing, candidates, usage
  includedFields: jsonb("included_fields").$type<string[]>(), // Which fields to include
  dateRange: varchar("date_range").notNull().default("last_period"), // last_period, all_time, custom
  customStartDate: timestamp("custom_start_date"),
  customEndDate: timestamp("custom_end_date"),
  // Delivery settings
  deliveryMethod: varchar("delivery_method").notNull().default("email"), // email, sftp, s3, webhook
  deliveryEmail: varchar("delivery_email"), // For email delivery
  deliverySftpHost: varchar("delivery_sftp_host"), // For SFTP delivery
  deliverySftpPath: varchar("delivery_sftp_path"),
  deliverySftpUser: varchar("delivery_sftp_user"),
  deliverySftpKeyEncrypted: varchar("delivery_sftp_key_encrypted"),
  deliveryS3Bucket: varchar("delivery_s3_bucket"), // For S3 delivery
  deliveryS3Path: varchar("delivery_s3_path"),
  deliveryS3AccessKey: varchar("delivery_s3_access_key"),
  deliveryS3SecretKeyEncrypted: varchar("delivery_s3_secret_key_encrypted"),
  deliveryWebhookUrl: varchar("delivery_webhook_url"), // For webhook delivery
  // Stats
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: varchar("last_run_status"), // success, partial, failed
  lastRunRecords: integer("last_run_records"),
  nextRunAt: timestamp("next_run_at"),
  totalRuns: integer("total_runs").notNull().default(0),
  successfulRuns: integer("successful_runs").notNull().default(0),
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_exports_partner").on(table.partnerId),
  index("idx_partner_exports_active").on(table.isActive),
  index("idx_partner_exports_next_run").on(table.nextRunAt),
]);

export const insertPartnerScheduledExportSchema = createInsertSchema(partnerScheduledExports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
  lastRunStatus: true,
  lastRunRecords: true,
  nextRunAt: true,
  totalRuns: true,
  successfulRuns: true,
});

export type InsertPartnerScheduledExport = z.infer<typeof insertPartnerScheduledExportSchema>;
export type PartnerScheduledExport = typeof partnerScheduledExports.$inferSelect;

// Partner notifications - event log for partner notifications
export const partnerNotifications = pgTable("partner_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // quota_warning, quota_critical, purchase_success, api_key_created, api_key_rotated, api_key_revoked, team_member_joined, etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  // Actor tracking - who triggered this notification (excluded from recipients)
  actorTeamMemberId: varchar("actor_team_member_id").references(() => partnerTeamMembers.id, { onDelete: "set null" }),
  actorUserId: varchar("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  // Subject tracking - who the notification is about (also excluded, e.g., new member)
  subjectTeamMemberId: varchar("subject_team_member_id").references(() => partnerTeamMembers.id, { onDelete: "set null" }),
  // Legacy fields kept for backward compatibility during migration
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_notifications_partner").on(table.partnerId),
  index("idx_partner_notifications_read").on(table.partnerId, table.isRead),
  index("idx_partner_notifications_created").on(table.createdAt),
]);

export const insertPartnerNotificationSchema = createInsertSchema(partnerNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type InsertPartnerNotification = z.infer<typeof insertPartnerNotificationSchema>;
export type PartnerNotification = typeof partnerNotifications.$inferSelect;

// Partner notification recipients - per-user delivery tracking
export const partnerNotificationRecipients = pgTable("partner_notification_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationId: varchar("notification_id").notNull().references(() => partnerNotifications.id, { onDelete: "cascade" }),
  teamMemberId: varchar("team_member_id").notNull().references(() => partnerTeamMembers.id, { onDelete: "cascade" }),
  roleAtDelivery: varchar("role_at_delivery").notNull(), // Role when notification was delivered
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  deliveredAt: timestamp("delivered_at").defaultNow().notNull(),
}, (table) => [
  index("idx_notification_recipients_notification").on(table.notificationId),
  index("idx_notification_recipients_team_member").on(table.teamMemberId),
  index("idx_notification_recipients_unread").on(table.teamMemberId, table.isRead),
]);

export const insertPartnerNotificationRecipientSchema = createInsertSchema(partnerNotificationRecipients).omit({
  id: true,
  deliveredAt: true,
  readAt: true,
});

export type InsertPartnerNotificationRecipient = z.infer<typeof insertPartnerNotificationRecipientSchema>;
export type PartnerNotificationRecipient = typeof partnerNotificationRecipients.$inferSelect;

// Partner team members - additional admins for a partner account
export const partnerTeamMembers = pgTable("partner_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email").notNull(),
  name: varchar("name"),
  role: varchar("role").notNull().default("member"), // owner, admin, member, viewer
  inviteStatus: varchar("invite_status").notNull().default("pending"), // pending, accepted, expired
  inviteToken: varchar("invite_token"),
  inviteExpiresAt: timestamp("invite_expires_at"),
  invitedByUserId: varchar("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
}, (table) => [
  index("idx_partner_team_partner").on(table.partnerId),
  index("idx_partner_team_user").on(table.userId),
  index("idx_partner_team_email").on(table.email),
  index("idx_partner_team_token").on(table.inviteToken),
]);

export const insertPartnerTeamMemberSchema = createInsertSchema(partnerTeamMembers).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export type InsertPartnerTeamMember = z.infer<typeof insertPartnerTeamMemberSchema>;
export type PartnerTeamMember = typeof partnerTeamMembers.$inferSelect;

// Partner billing change requests - requests to change billing type
export const billingChangeRequests = pgTable("billing_change_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  requestedByUserId: varchar("requested_by_user_id").notNull().references(() => users.id),
  currentBillingType: varchar("current_billing_type").notNull(), // 'payg', 'subscription', 'enterprise'
  requestedBillingType: varchar("requested_billing_type").notNull(), // 'payg', 'subscription', 'enterprise'
  reason: text("reason"), // Optional reason for the change request
  status: varchar("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewNotes: text("review_notes"), // Optional notes from super admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => [
  index("idx_billing_change_partner").on(table.partnerId),
  index("idx_billing_change_status").on(table.status),
  index("idx_billing_change_created").on(table.createdAt),
]);

export const insertBillingChangeRequestSchema = createInsertSchema(billingChangeRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedByUserId: true,
  reviewNotes: true,
  status: true,
});

export type InsertBillingChangeRequest = z.infer<typeof insertBillingChangeRequestSchema>;
export type BillingChangeRequest = typeof billingChangeRequests.$inferSelect;

// Partner enquiries - subscription plan requests and other enquiries from partners
export const partnerEnquiries = pgTable("partner_enquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  requestedByUserId: varchar("requested_by_user_id").notNull().references(() => users.id),
  type: varchar("type").notNull().default("subscription"),
  name: varchar("name"),
  email: varchar("email"),
  companyName: varchar("company_name"),
  message: text("message").notNull(),
  status: varchar("status").notNull().default("pending"),
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => [
  index("idx_partner_enquiry_partner").on(table.partnerId),
  index("idx_partner_enquiry_status").on(table.status),
  index("idx_partner_enquiry_created").on(table.createdAt),
]);

export const insertPartnerEnquirySchema = createInsertSchema(partnerEnquiries).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
  reviewedByUserId: true,
  reviewNotes: true,
  status: true,
});

export type InsertPartnerEnquiry = z.infer<typeof insertPartnerEnquirySchema>;
export type PartnerEnquiry = typeof partnerEnquiries.$inferSelect;

// Partner candidate import batches - tracks bulk invitation imports
export const partnerCandidateImports = pgTable("partner_candidate_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  createdByUserId: varchar("created_by_user_id").references(() => users.id), // Nullable for API-created imports
  sourceType: varchar("source_type").notNull(), // 'csv', 'manual', 'api'
  filename: varchar("filename"), // Original filename for CSV imports
  assessmentTypes: text("assessment_types").array().notNull(), // ['fit', 'ai_readiness', 'prompt_architecture', 'aiq']
  candidateCount: integer("candidate_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  tokensUsed: integer("tokens_used").notNull().default(0),
  status: varchar("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed', 'partial'
  errorReport: jsonb("error_report").$type<{ errors: Array<{ row: number; email?: string; externalUserId?: string; error: string }> }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_candidate_imports_partner").on(table.partnerId),
  index("idx_candidate_imports_status").on(table.status),
  index("idx_candidate_imports_created").on(table.createdAt),
]);

export const insertPartnerCandidateImportSchema = createInsertSchema(partnerCandidateImports).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  successCount: true,
  failedCount: true,
  tokensUsed: true,
});

export type InsertPartnerCandidateImport = z.infer<typeof insertPartnerCandidateImportSchema>;
export type PartnerCandidateImport = typeof partnerCandidateImports.$inferSelect;

// Partner candidate invitations - individual invitations within a batch
export const partnerCandidateInvitations = pgTable("partner_candidate_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  importId: varchar("import_id").references(() => partnerCandidateImports.id, { onDelete: "set null" }),
  externalUserId: varchar("external_user_id").notNull(), // Required - partner's internal candidate ID
  email: varchar("email"), // Optional - some candidates may not have email initially
  name: varchar("name"),
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Custom metadata for ATS integrations
  assessmentTypes: text("assessment_types").array().notNull(), // Tests assigned to this candidate
  inviteToken: varchar("invite_token").notNull().unique(), // Unique token for accessing assessments
  inviteUrl: varchar("invite_url"), // Full URL sent to candidate
  status: varchar("status").notNull().default("pending"), // 'pending', 'sent', 'opened', 'started', 'completed', 'expired'
  emailSentAt: timestamp("email_sent_at"),
  openedAt: timestamp("opened_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  tokensUsed: integer("tokens_used").notNull().default(0),
  emailBounced: boolean("email_bounced").default(false),
  bounceReason: text("bounce_reason"),
  bouncedAt: timestamp("bounced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_candidate_invitations_partner").on(table.partnerId),
  index("idx_candidate_invitations_import").on(table.importId),
  index("idx_candidate_invitations_external").on(table.partnerId, table.externalUserId),
  index("idx_candidate_invitations_token").on(table.inviteToken),
  index("idx_candidate_invitations_status").on(table.status),
  index("idx_candidate_invitations_email").on(table.email),
]);

export const insertPartnerCandidateInvitationSchema = createInsertSchema(partnerCandidateInvitations).omit({
  id: true,
  createdAt: true,
  emailSentAt: true,
  openedAt: true,
  startedAt: true,
  completedAt: true,
});

export type InsertPartnerCandidateInvitation = z.infer<typeof insertPartnerCandidateInvitationSchema>;
export type PartnerCandidateInvitation = typeof partnerCandidateInvitations.$inferSelect;

// Partner Result Purchases - tracks when B2C candidates purchase access to their partner assessment results
export const partnerResultPurchases = pgTable("partner_result_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  partnerInvitationId: varchar("partner_invitation_id").notNull().references(() => partnerCandidateInvitations.id, { onDelete: "cascade" }),
  stripeSessionId: varchar("stripe_session_id"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // Amount in cents
  currency: varchar("currency").notNull().default("USD"),
  assessmentCount: integer("assessment_count").notNull(), // Number of assessments in the series
  purchasedAssessmentTypes: text("purchased_assessment_types").array(), // List of purchased assessment types (null = all via bulk purchase)
  status: varchar("status").notNull().default("pending"), // 'pending', 'completed', 'failed', 'refunded'
  purchasedAt: timestamp("purchased_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_partner_result_purchases_user").on(table.userId),
  index("idx_partner_result_purchases_invitation").on(table.partnerInvitationId),
  index("idx_partner_result_purchases_status").on(table.status),
]);

export const insertPartnerResultPurchaseSchema = createInsertSchema(partnerResultPurchases).omit({
  id: true,
  createdAt: true,
  purchasedAt: true,
});

export type InsertPartnerResultPurchase = z.infer<typeof insertPartnerResultPurchaseSchema>;
export type PartnerResultPurchase = typeof partnerResultPurchases.$inferSelect;

// System Settings - global configuration for the platform
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").unique().notNull(),
  value: jsonb("value").$type<any>().notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_system_settings_key").on(table.key),
]);

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// Predefined system setting keys
export const SYSTEM_SETTING_KEYS = {
  RUN_TESTS_BEFORE_DEPLOY: "run_tests_before_deploy",
  MAINTENANCE_MODE: "maintenance_mode",
  ANNOUNCEMENT_BANNER: "announcement_banner",
  BLOCKED_IPS: "blocked_ips",
} as const;

// Broadcast messages - for mass notifications/emails to users
export const broadcastMessages = pgTable("broadcast_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type").notNull(), // 'email', 'notification', 'both'
  targetAudience: varchar("target_audience").notNull(), // 'all_users', 'all_partners', 'all_admins', 'b2c_users'
  status: varchar("status").notNull().default("draft"), // 'draft', 'scheduled', 'sending', 'sent', 'failed'
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_broadcast_messages_status").on(table.status),
  index("idx_broadcast_messages_created").on(table.createdAt),
]);

export const insertBroadcastMessageSchema = createInsertSchema(broadcastMessages).omit({
  id: true,
  recipientCount: true,
  successCount: true,
  failureCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBroadcastMessage = z.infer<typeof insertBroadcastMessageSchema>;
export type BroadcastMessage = typeof broadcastMessages.$inferSelect;

// Email verification codes - for B2B widget email verification
export const emailVerificationCodes = pgTable("email_verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  sessionId: varchar("session_id").references(() => assessmentSessions.id, { onDelete: "cascade" }),
  partnerId: varchar("partner_id").references(() => partnerAccounts.id, { onDelete: "cascade" }),
  attempts: integer("attempts").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_verification_email").on(table.email),
  index("idx_email_verification_session").on(table.sessionId),
  index("idx_email_verification_expires").on(table.expiresAt),
]);

export const insertEmailVerificationCodeSchema = createInsertSchema(emailVerificationCodes).omit({
  id: true,
  createdAt: true,
  attempts: true,
  verified: true,
});

export type InsertEmailVerificationCode = z.infer<typeof insertEmailVerificationCodeSchema>;
export type EmailVerificationCode = typeof emailVerificationCodes.$inferSelect;


// ============================================
// ACCOUNTING & XERO INTEGRATION TABLES
// ============================================

// Xero Integration - stores OAuth tokens for Xero connection
export const xeroIntegration = pgTable("xero_integration", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  tenantId: varchar("tenant_id"),
  tenantName: varchar("tenant_name"),
  connectedAt: timestamp("connected_at"),
  connectedBy: varchar("connected_by").references(() => users.id, { onDelete: "set null" }),
  lastSyncAt: timestamp("last_sync_at"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertXeroIntegrationSchema = createInsertSchema(xeroIntegration).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertXeroIntegration = z.infer<typeof insertXeroIntegrationSchema>;
export type XeroIntegration = typeof xeroIntegration.$inferSelect;

// Expense categories
export const EXPENSE_CATEGORIES = {
  SOFTWARE: "software",
  MARKETING: "marketing",
  INFRASTRUCTURE: "infrastructure",
  PROFESSIONAL_SERVICES: "professional_services",
  OFFICE: "office",
  TRAVEL: "travel",
  OTHER: "other",
} as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[keyof typeof EXPENSE_CATEGORIES];

// Expenses - for uploaded receipts/invoices
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  description: varchar("description").notNull(),
  amount: integer("amount").notNull(), // In minor units (cents/pence)
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  category: varchar("category").notNull().default("other"),
  vendor: varchar("vendor"),
  invoiceNumber: varchar("invoice_number"),
  invoiceDate: timestamp("invoice_date"),
  dueDate: timestamp("due_date"),
  paidDate: timestamp("paid_date"),
  status: varchar("status").notNull().default("pending"), // 'pending', 'paid', 'cancelled'
  receiptUrl: text("receipt_url"), // Object storage URL for uploaded receipt
  receiptFilename: varchar("receipt_filename"),
  notes: text("notes"),
  xeroInvoiceId: varchar("xero_invoice_id"), // Xero invoice/bill ID once synced
  xeroSyncStatus: varchar("xero_sync_status").default("not_synced"), // 'not_synced', 'synced', 'error'
  xeroSyncError: text("xero_sync_error"),
  xeroSyncedAt: timestamp("xero_synced_at"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_expenses_category").on(table.category),
  index("idx_expenses_status").on(table.status),
  index("idx_expenses_sync_status").on(table.xeroSyncStatus),
  index("idx_expenses_created_at").on(table.createdAt),
]);

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  xeroInvoiceId: true,
  xeroSyncStatus: true,
  xeroSyncError: true,
  xeroSyncedAt: true,
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// Revenue sync logs - tracks sales synced to Xero
export const revenueSyncLogs = pgTable("revenue_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseId: varchar("purchase_id").references(() => purchases.id, { onDelete: "cascade" }),
  partnerInvoiceId: varchar("partner_invoice_id").references(() => partnerInvoices.id, { onDelete: "cascade" }),
  sourceType: varchar("source_type").notNull(), // 'b2c_purchase', 'b2b_partner', 'b2b_testtaker'
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("GBP"),
  description: varchar("description"),
  customerName: varchar("customer_name"),
  customerEmail: varchar("customer_email"),
  xeroInvoiceId: varchar("xero_invoice_id"),
  xeroContactId: varchar("xero_contact_id"),
  syncStatus: varchar("sync_status").notNull().default("pending"), // 'pending', 'synced', 'error', 'skipped'
  syncError: text("sync_error"),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_revenue_sync_purchase").on(table.purchaseId),
  index("idx_revenue_sync_partner_invoice").on(table.partnerInvoiceId),
  index("idx_revenue_sync_status").on(table.syncStatus),
  index("idx_revenue_sync_created_at").on(table.createdAt),
]);

export const insertRevenueSyncLogSchema = createInsertSchema(revenueSyncLogs).omit({
  id: true,
  createdAt: true,
  xeroInvoiceId: true,
  xeroContactId: true,
  syncStatus: true,
  syncError: true,
  syncedAt: true,
});

export type InsertRevenueSyncLog = z.infer<typeof insertRevenueSyncLogSchema>;
export type RevenueSyncLog = typeof revenueSyncLogs.$inferSelect;

// Admin notifications - for super admin alerts about system events
export const adminNotifications = pgTable("admin_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // NULL = broadcast to all super admins
  type: varchar("type").notNull(), // payment_failure, system_error, security_alert, billing_issue, etc.
  severity: varchar("severity").notNull().default("info"), // info, warning, critical
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_admin_notifications_user").on(table.userId),
  index("idx_admin_notifications_type").on(table.type),
  index("idx_admin_notifications_severity").on(table.severity),
  index("idx_admin_notifications_read").on(table.userId, table.isRead),
  index("idx_admin_notifications_created").on(table.createdAt),
]);

export const insertAdminNotificationSchema = createInsertSchema(adminNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export type InsertAdminNotification = z.infer<typeof insertAdminNotificationSchema>;
export type AdminNotification = typeof adminNotifications.$inferSelect;

// Audit logs - tracks all admin actions for compliance and debugging
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  userEmail: varchar("user_email"), // Stored separately in case user is deleted
  userRole: varchar("user_role"),
  action: varchar("action").notNull(), // e.g., 'user.create', 'partner.update', 'invoice.cancel'
  resourceType: varchar("resource_type").notNull(), // e.g., 'user', 'partner', 'invoice', 'api_key'
  resourceId: varchar("resource_id"), // ID of the affected resource
  details: jsonb("details").$type<Record<string, any>>(), // Additional context (before/after values, etc.)
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  severity: varchar("severity").notNull().default("info"), // 'info', 'warning', 'critical'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_logs_user").on(table.userId),
  index("idx_audit_logs_action").on(table.action),
  index("idx_audit_logs_resource").on(table.resourceType, table.resourceId),
  index("idx_audit_logs_severity").on(table.severity),
  index("idx_audit_logs_created").on(table.createdAt),
]);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============================================
// Ecosystem Index - Team Diagnostic Tool
// ============================================

// Ecosystem Index capability priorities (returned by AI analysis)
export type EcosystemCapabilityPriority = {
  code: string; // HA, IC, RA, EE, GM, IA
  name: string;
  priority: "critical" | "high" | "medium" | "low";
  reasoning: string;
};

// Ecosystem Index AI analysis result
export type EcosystemMissionAnalysis = {
  summary: string;
  capabilityPriorities: EcosystemCapabilityPriority[];
  keyThemes: string[];
  analyzedAt: string;
};

// Team capability gap analysis
export type EcosystemGapAnalysis = {
  capability: string;
  code: string;
  currentAverage: number;
  teamCoverage: number; // percentage of team with score >= 7
  requiredPriority: "critical" | "high" | "medium" | "low";
  gapSeverity: "critical" | "warning" | "healthy";
  reasoning: string;
};

// Next hire recommendation
export type EcosystemHireRecommendation = {
  priorityRank: number;
  capability: string;
  code: string;
  targetScore: number;
  reasoning: string;
  alignsWithMission: boolean;
};

// Risk alert
export type EcosystemRiskAlert = {
  type: "concentration" | "imbalance" | "gap" | "single_point_of_failure";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedCapabilities: string[];
  recommendation: string;
};

// Strategic advisor insight
export type EcosystemStrategicInsight = {
  category: "strength" | "gap" | "risk" | "opportunity";
  title: string;
  analysis: string; // Deep explanation from AI
  impact: "critical" | "high" | "medium" | "low";
  actionRequired: boolean;
};

// Ideal hire profile
export type EcosystemIdealHireProfile = {
  roleTitle: string;
  priority: number;
  rationale: string; // AI-generated strategic reasoning
  fitTargets: {
    HA: { min: number; ideal: number };
    IC: { min: number; ideal: number };
    RA: { min: number; ideal: number };
    EE: { min: number; ideal: number };
    GM: { min: number; ideal: number };
    IA: { min: number; ideal: number };
  };
  keyBehaviors: string[]; // What to look for in interviews
  redFlags: string[]; // What to avoid
};

// Full team analysis result (enhanced with strategic advisor content)
export type EcosystemTeamAnalysis = {
  generatedAt: string;
  teamSize: number;
  capabilityDistribution: Record<string, { average: number; min: number; max: number; coverage: number }>;
  missionAlignmentScore: number; // 0-100
  gapAnalysis: EcosystemGapAnalysis[];
  hireRecommendations: EcosystemHireRecommendation[];
  riskAlerts: EcosystemRiskAlert[];
  overallHealthScore: number; // 0-100
  
  // Enhanced strategic advisor content
  executiveSummary?: string; // AI-generated strategic summary
  strategicInsights?: EcosystemStrategicInsight[];
  idealHireProfiles?: EcosystemIdealHireProfile[];
  capabilityGapMatrix?: {
    capability: string;
    code: string;
    missionPriority: "critical" | "high" | "medium" | "low";
    teamStrength: "strong" | "adequate" | "weak" | "critical";
    gapAnalysis: string; // AI-generated insight
  }[];
  growthRoadmap?: {
    phase: string;
    timeline: string;
    focus: string;
    hiringPriorities: string[];
  }[];
  
  // AI-powered contextual gap analysis
  contextualInsights?: string[]; // Deep insights connecting multiple data points
  idealCandidateProfile?: {
    summary: string; // Detailed description of ideal next hire
    fitTargets: Record<string, { min: number; ideal: number; reasoning: string }>;
    keyTraits: string[];
    interviewFocusAreas: string[];
  };
};

// Ecosystem project status
export const ECOSYSTEM_PROJECT_STATUS = {
  DRAFT: "draft",
  IN_PROGRESS: "in_progress",
  ANALYSIS_READY: "analysis_ready",
  COMPLETED: "completed",
} as const;

export type EcosystemProjectStatus = typeof ECOSYSTEM_PROJECT_STATUS[keyof typeof ECOSYSTEM_PROJECT_STATUS];

// Ecosystem Projects - main table for team diagnostic projects
export const ecosystemProjects = pgTable("ecosystem_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  partnerId: varchar("partner_id").references(() => partnerAccounts.id, { onDelete: "set null" }),
  
  // Project name/title
  name: varchar("name").notNull().default("My Team Analysis"),
  
  // Status tracking
  status: varchar("status").notNull().default("draft"),
  currentStep: integer("current_step").notNull().default(1),
  
  // Step 2: Mission/Ethos
  missionStatement: text("mission_statement"),
  companyEthos: text("company_ethos"),
  missionAnalysis: jsonb("mission_analysis").$type<EcosystemMissionAnalysis | null>(),
  
  // Step 2: Organization context
  companyName: varchar("company_name"),
  companySize: varchar("company_size"), // 1-10, 11-50, 51-200, 201-500, 500+
  industry: varchar("industry"),
  teamFunction: varchar("team_function"), // Engineering, Sales, HR, etc.
  teamSize: integer("team_size"),
  workMode: varchar("work_mode"), // remote, hybrid, onsite
  
  // Enhanced team context
  teamStage: varchar("team_stage"), // new, growing, mature, restructuring
  hiringPlans: varchar("hiring_plans"), // 0, 1-3, 4-10, 10+
  currentChallenges: text("current_challenges"), // free text describing team challenges
  
  // Deep dive questions - Team Dynamics & Pain Points
  delayedTasks: text("delayed_tasks"), // What tasks frequently get delayed or deprioritized?
  conflictTopics: text("conflict_topics"), // When conflicts arise, what are they usually about?
  avoidedWork: text("avoided_work"), // What type of work does your team avoid or struggle with?
  
  // Deep dive questions - Workload & Capacity
  overloadedMember: text("overloaded_member"), // Who is overloaded and what are they handling?
  wishedSkills: text("wished_skills"), // What skills do you constantly wish you had in-house?
  
  // Deep dive questions - Culture & Collaboration
  idealInteractionStyle: text("ideal_interaction_style"), // Describe your ideal team interaction style
  personalityGap: text("personality_gap"), // What's the biggest personality gap on your team?
  
  // Deep dive questions - Strategic Context
  upcomingInitiative: text("upcoming_initiative"), // What's your biggest upcoming initiative?
  cloneableSkills: text("cloneable_skills"), // If you could clone one team member's skills, whose would it be?
  transformativeFix: text("transformative_fix"), // What's the one thing that would transform your team's performance?
  
  // Step 6: Team analysis results
  teamAnalysis: jsonb("team_analysis").$type<EcosystemTeamAnalysis | null>(),
  
  // Payment
  isPaid: boolean("is_paid").notNull().default(false), // Default false - paid service at £15 base
  paidAmount: integer("paid_amount").default(0), // In pence
  paidAt: timestamp("paid_at"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ecosystem_projects_user").on(table.userId),
  index("idx_ecosystem_projects_partner").on(table.partnerId),
  index("idx_ecosystem_projects_status").on(table.status),
]);

export const insertEcosystemProjectSchema = createInsertSchema(ecosystemProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEcosystemProject = z.infer<typeof insertEcosystemProjectSchema>;
export type EcosystemProject = typeof ecosystemProjects.$inferSelect;

// Ecosystem Team Members - team members added to a project (either via PDF upload or linked assessments)
export const ecosystemTeamMembers = pgTable("ecosystem_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => ecosystemProjects.id, { onDelete: "cascade" }),
  
  // Member identification
  name: varchar("name"),
  email: varchar("email"),
  role: varchar("role"), // Job title/role in team
  
  // Source of data
  sourceType: varchar("source_type").notNull(), // "pdf_upload", "linked_result", "invitation"
  sourceId: varchar("source_id"), // assessmentResults.id if linked, or null for PDF
  
  // FIT Scores (extracted from PDF or linked result)
  fitScores: jsonb("fit_scores").$type<{
    HA?: number; // High Agency
    IC?: number; // Intellectual Curiosity
    RA?: number; // Resilience
    EE?: number; // Empathy & Ethics
    GM?: number; // Growth Mindset
    IA?: number; // Interpersonal Agility
  } | null>(),
  
  // Assessment status
  assessmentCompleted: boolean("assessment_completed").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ecosystem_team_project").on(table.projectId),
  index("idx_ecosystem_team_email").on(table.email),
  index("idx_ecosystem_team_source").on(table.sourceType, table.sourceId),
]);

export const insertEcosystemTeamMemberSchema = createInsertSchema(ecosystemTeamMembers).omit({
  id: true,
  createdAt: true,
});

export type InsertEcosystemTeamMember = z.infer<typeof insertEcosystemTeamMemberSchema>;
export type EcosystemTeamMember = typeof ecosystemTeamMembers.$inferSelect;

// AI Usage Costs - tracks OpenAI token usage and costs for profit analysis
export const AI_USAGE_OPERATION_TYPES = {
  ASSESSMENT_SCORING_FIT: "assessment_scoring_fit",
  ASSESSMENT_SCORING_AI_READINESS: "assessment_scoring_ai_readiness",
  ASSESSMENT_SCORING_PROMPT: "assessment_scoring_prompt",
  ASSESSMENT_SCORING_AIQ: "assessment_scoring_aiq",
  ROLE_FIT_SINGLE: "role_fit_single",
  ROLE_FIT_MULTI: "role_fit_multi",
  INDIVIDUAL_NARRATIVE: "individual_narrative",
  PDF_PARSING: "pdf_parsing",
  ECOSYSTEM_ANALYSIS: "ecosystem_analysis",
  GOLDEN_SET_EVALUATION: "golden_set_evaluation",
  PROFILE_INSIGHTS_ADMIN: "profile_insights_admin",
  PROFILE_INSIGHTS_PARTNER: "profile_insights_partner",
  PROMPT_ROLE_FIT: "prompt_role_fit",
  AIQ_ROLE_FIT: "aiq_role_fit",
  MULTI_PROMPT_ANALYSIS: "multi_prompt_analysis",
  MULTI_AIQ_ANALYSIS: "multi_aiq_analysis",
  BATCH_ROLE_SKILLS: "batch_role_skills",
} as const;

export type AiUsageOperationType = typeof AI_USAGE_OPERATION_TYPES[keyof typeof AI_USAGE_OPERATION_TYPES];

export const aiUsageCosts = pgTable("ai_usage_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Operation details
  operationType: varchar("operation_type").notNull(), // From AI_USAGE_OPERATION_TYPES
  model: varchar("model").notNull(), // e.g., "gpt-5", "gpt-4o"
  
  // Token usage
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  
  // Cost calculation (in USD cents for precision)
  inputCostCents: integer("input_cost_cents").notNull(),
  outputCostCents: integer("output_cost_cents").notNull(),
  totalCostCents: integer("total_cost_cents").notNull(),
  
  // Context references
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  assessmentResultId: varchar("assessment_result_id"),
  partnerId: varchar("partner_id").references(() => partnerAccounts.id, { onDelete: "set null" }),
  
  // Metadata
  metadata: jsonb("metadata").$type<{
    candidateEmail?: string;
    assessmentType?: string;
    roleTitle?: string;
    candidateCount?: number;
  } | null>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ai_usage_operation").on(table.operationType),
  index("idx_ai_usage_model").on(table.model),
  index("idx_ai_usage_created").on(table.createdAt),
  index("idx_ai_usage_user").on(table.userId),
  index("idx_ai_usage_partner").on(table.partnerId),
]);

export const insertAiUsageCostSchema = createInsertSchema(aiUsageCosts).omit({
  id: true,
  createdAt: true,
});

export type InsertAiUsageCost = z.infer<typeof insertAiUsageCostSchema>;
export type AiUsageCost = typeof aiUsageCosts.$inferSelect;

// Partner analysis reports - cached AI analysis results (permanent storage)
export const partnerAnalysisReports = pgTable("partner_analysis_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  
  // Report type: role_fit_single, role_fit_multi, comparison, profile_insights
  reportType: varchar("report_type").notNull(),
  
  // Version for forward compatibility when report format changes
  version: integer("version").notNull().default(1),
  
  // Report scope identifiers
  candidateIds: text("candidate_ids").array().notNull(), // Array of candidate emails/IDs
  roleId: varchar("role_id").references(() => jobRoles.id, { onDelete: "set null" }), // For role fit reports
  
  // Report title for display
  title: varchar("title").notNull(),
  
  // The actual analysis data (structured JSON)
  resultData: jsonb("result_data").notNull().$type<{
    // Common fields
    generatedAt: string;
    modelVersion?: string;
    
    // Role fit specific
    overallFit?: number;
    skillGaps?: Array<{ skill: string; gap: number; recommendation: string }>;
    recommendations?: string[];
    candidateScores?: Array<{ candidateId: string; fit: number; strengths: string[]; gaps: string[] }>;
    
    // Comparison specific
    radarData?: any[];
    skillComparison?: any[];
    averageScores?: number[];
    rankings?: Array<{ candidateId: string; rank: number; score: number }>;
    
    // Profile insights specific
    insights?: string[];
    strengthsSummary?: string;
    developmentAreas?: string[];
    
    // Any additional data
    [key: string]: any;
  }>(),
  
  // Credit tracking
  creditsUsed: integer("credits_used").notNull().default(1),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // Optional: who generated the report
  generatedByUserId: varchar("generated_by_user_id").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_partner_reports_partner").on(table.partnerId),
  index("idx_partner_reports_type").on(table.reportType),
  index("idx_partner_reports_created").on(table.createdAt),
  index("idx_partner_reports_candidates").on(table.candidateIds),
]);

export const insertPartnerAnalysisReportSchema = createInsertSchema(partnerAnalysisReports).omit({
  id: true,
  createdAt: true,
});

export type InsertPartnerAnalysisReport = z.infer<typeof insertPartnerAnalysisReportSchema>;
export type PartnerAnalysisReport = typeof partnerAnalysisReports.$inferSelect;

// Stripe webhook event idempotency - prevent duplicate processing
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: varchar("id").primaryKey(), // Stripe event ID (e.g., evt_xxx)
  eventType: varchar("event_type").notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
  status: varchar("status").notNull().default("processed"),
  metadata: jsonb("metadata").$type<{
    partnerId?: string;
    paymentIntentId?: string;
    customerId?: string;
    error?: string;
  } | null>(),
}, (table) => [
  index("idx_stripe_events_type").on(table.eventType),
  index("idx_stripe_events_processed").on(table.processedAt),
]);

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;

// Auto top-up retry queue - for failed payment retries with exponential backoff
export const autoTopUpRetries = pgTable("auto_top_up_retries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  packageTier: varchar("package_tier").notNull(),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  nextRetryAt: timestamp("next_retry_at").notNull(),
  lastError: varchar("last_error"),
  status: varchar("status").notNull().default("pending"),
  paymentIntentId: varchar("payment_intent_id"),
  requires3DS: boolean("requires_3ds").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_auto_topup_retries_partner").on(table.partnerId),
  index("idx_auto_topup_retries_status").on(table.status),
  index("idx_auto_topup_retries_next").on(table.nextRetryAt),
]);

export const insertAutoTopUpRetrySchema = createInsertSchema(autoTopUpRetries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAutoTopUpRetry = z.infer<typeof insertAutoTopUpRetrySchema>;
export type AutoTopUpRetry = typeof autoTopUpRetries.$inferSelect;

// Email logs table - track all emails sent from the platform
export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientEmail: varchar("recipient_email").notNull(),
  recipientName: varchar("recipient_name"),
  recipientType: varchar("recipient_type").notNull(), // 'partner', 'b2b_test_taker', 'b2c_customer', 'super_admin'
  subject: varchar("subject").notNull(),
  emailType: varchar("email_type").notNull(), // e.g., 'invitation', 'results', 'password_reset', 'welcome', 'billing', etc.
  provider: varchar("provider").notNull(), // 'gmail' or 'sendgrid'
  status: varchar("status").notNull().default("sent"), // 'sent', 'failed', 'bounced'
  messageId: varchar("message_id"),
  error: text("error"),
  metadata: jsonb("metadata").$type<{
    partnerId?: string;
    partnerName?: string;
    userId?: string;
    assessmentType?: string;
    invitationId?: string;
    [key: string]: any;
  } | null>(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_logs_recipient").on(table.recipientEmail),
  index("idx_email_logs_type").on(table.emailType),
  index("idx_email_logs_recipient_type").on(table.recipientType),
  index("idx_email_logs_sent").on(table.sentAt),
  index("idx_email_logs_status").on(table.status),
]);

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;


// App logs table for CloudWatch-like functionality
export const appLogs = pgTable("app_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  level: varchar("level").notNull().default("info"), // 'info', 'warn', 'error', 'debug'
  source: varchar("source").notNull(), // e.g., 'express', 'stripe', 'email', 'auth', 'scoring'
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any> | null>(),
}, (table) => [
  index("idx_app_logs_timestamp").on(table.timestamp),
  index("idx_app_logs_level").on(table.level),
  index("idx_app_logs_source").on(table.source),
]);

export type AppLog = typeof appLogs.$inferSelect;
export type InsertAppLog = typeof appLogs.$inferInsert;

// Bug report severity levels
export const BUG_SEVERITY = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type BugSeverity = typeof BUG_SEVERITY[keyof typeof BUG_SEVERITY];

// Bug report Kanban status stages
export const BUG_STATUS = {
  NEW: "new",
  IN_PROGRESS: "in_progress",
  UNDER_REVIEW: "under_review",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type BugStatus = typeof BUG_STATUS[keyof typeof BUG_STATUS];

export const BUG_STATUS_ORDER: BugStatus[] = [
  "new",
  "in_progress",
  "under_review",
  "resolved",
  "closed",
];

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  under_review: "Under Review",
  resolved: "Resolved",
  closed: "Closed",
};

// Bug reports table
export const bugReports = pgTable("bug_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  screenshotUrl: text("screenshot_url").notNull(),
  screenshotUrls: text("screenshot_urls").array().default([]),
  severity: varchar("severity").notNull().default("medium"),
  status: varchar("status").notNull().default("new"),
  reporterUserId: varchar("reporter_user_id"),
  reporterEmail: varchar("reporter_email").notNull(),
  reporterName: varchar("reporter_name").notNull(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bug_reports_status").on(table.status),
  index("idx_bug_reports_severity").on(table.severity),
  index("idx_bug_reports_created").on(table.createdAt),
]);

export const insertBugReportSchema = createInsertSchema(bugReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBugReport = z.infer<typeof insertBugReportSchema>;
export type BugReport = typeof bugReports.$inferSelect;
