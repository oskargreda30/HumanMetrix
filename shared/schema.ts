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
  ORGANIZATION_ADMIN: "organization_admin",
  PARTNER_ADMIN: "partner_admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

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
export const jobRoles = pgTable("job_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  competencies: jsonb("competencies").notNull().$type<{
    skillName: string;
    importance: number; // 1-5 scale
    minimumScore: number; // 0-100
  }[]>(),
  requiredSkillScores: jsonb("required_skill_scores").$type<{
    fitSkills: Record<string, number>;
    aiReadinessSkills: Record<string, number>;
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
  }[]>(),
  fitSkillAlignments: jsonb("fit_skill_alignments").$type<{
    skillName: string;
    candidateScore: number;
    requiredScore: number;
    gap: number;
    alignment: string;
  }[]>(),
  aiReadinessSkillAlignments: jsonb("ai_readiness_skill_alignments").$type<{
    skillName: string;
    candidateScore: number;
    requiredScore: number;
    gap: number;
    alignment: string;
  }[]>(),
  strengths: jsonb("strengths").notNull().$type<string[]>(),
  gaps: jsonb("gaps").notNull().$type<string[]>(),
  recommendations: text("recommendations").notNull(),
  riskFlags: jsonb("risk_flags").$type<string[]>(),
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
  billingEmail: varchar("billing_email"),
  organizationId: varchar("organization_id").references(() => organizations.id), // Link to organisation for admin dashboard access
  monthlyQuota: integer("monthly_quota").default(1000),
  pricePerAssessment: integer("price_per_assessment").default(500), // £5.00 in pence
  isActive: boolean("is_active").notNull().default(true),
  // Billing configuration - 3 payment options:
  // 'prepaid': Purchase test packages upfront, top up when needed
  // 'auto_bill': Card on file, automatically billed at month-end based on usage
  // 'invoice': Enterprise invoicing, we send invoices based on usage
  billingType: varchar("billing_type").notNull().default("prepaid"), // 'prepaid', 'auto_bill', or 'invoice'
  freeTestsAllocated: integer("free_tests_allocated").notNull().default(0), // Complimentary tests given on signup
  freeTestsExpiresAt: timestamp("free_tests_expires_at"), // Expiry date for free tests (7 days from allocation)
  // Prepaid billing fields
  prepaidBalance: integer("prepaid_balance").notNull().default(0), // Current test credit balance
  prepaidCreditsExpiresAt: timestamp("prepaid_credits_expires_at"), // Expiry date for prepaid credits (12 months from purchase)
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
  // Invoice fields
  paymentTermsDays: integer("payment_terms_days").default(30), // For invoice clients: Net 15/30/45/60/90
  invoiceNotes: varchar("invoice_notes"), // Special terms or notes for invoiced clients
  invoiceContact: varchar("invoice_contact"), // Contact name for invoices
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
  // White-label branding settings
  brandingEnabled: boolean("branding_enabled").notNull().default(false),
  brandingPrimaryColor: varchar("branding_primary_color"), // Hex color e.g. "#0891b2"
  brandingAccentColor: varchar("branding_accent_color"), // Hex color for accents
  brandingWelcomeTitle: varchar("branding_welcome_title"), // Custom welcome title for candidates
  brandingWelcomeMessage: text("branding_welcome_message"), // Custom welcome message
  brandingCompanyDisplayName: varchar("branding_company_display_name"), // Display name shown to candidates (can differ from companyName)
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
}, (table) => [
  index("idx_assessment_sessions_partner").on(table.partnerId),
  index("idx_assessment_sessions_status").on(table.status),
  index("idx_assessment_sessions_external").on(table.partnerId, table.externalUserId),
]);

export const insertAssessmentSessionSchema = createInsertSchema(assessmentSessions).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
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

// Partner notifications - in-app notifications for partners
export const partnerNotifications = pgTable("partner_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // quota_warning, quota_critical, purchase_success, api_key_created, api_key_rotated, api_key_revoked, etc.
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
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
  invitedByUserId: varchar("invited_by_user_id").references(() => users.id),
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
  currentBillingType: varchar("current_billing_type").notNull(), // 'prepaid', 'auto_bill', 'invoice'
  requestedBillingType: varchar("requested_billing_type").notNull(), // 'prepaid', 'auto_bill', 'invoice'
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
} as const;
