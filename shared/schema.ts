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
  ADMIN: "admin",
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
  assessmentType: text("assessment_type").notNull(),
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
  logoUrl: varchar("logo_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  billingEmail: varchar("billing_email"),
  organizationId: varchar("organization_id").references(() => organizations.id), // Link to organisation for admin dashboard access
  monthlyQuota: integer("monthly_quota").default(1000),
  pricePerAssessment: integer("price_per_assessment").default(500), // £5.00 in pence
  isActive: boolean("is_active").notNull().default(true),
  // Quota tracking fields
  testsPurchased: integer("tests_purchased").notNull().default(0),
  testsConsumed: integer("tests_consumed").notNull().default(0),
  last70NoticeAt: timestamp("last_70_notice_at"),
  last90NoticeAt: timestamp("last_90_notice_at"),
  apiAccessSuspendedAt: timestamp("api_access_suspended_at"),
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

// Partner API keys - for authentication
export const partnerApiKeys = pgTable("partner_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partnerAccounts.id, { onDelete: "cascade" }),
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
  apiKeyId: varchar("api_key_id").notNull().references(() => partnerApiKeys.id, { onDelete: "cascade" }),
  externalUserId: varchar("external_user_id"), // Partner's user ID
  externalEmail: varchar("external_email"),
  assessmentType: varchar("assessment_type").notNull(),
  status: varchar("status").notNull().default("created"), // created, started, completed, expired
  answers: jsonb("answers").$type<Record<string, any>>(),
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
