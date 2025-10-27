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

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const purchasedAssessments = pgTable("purchased_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assessmentIds: jsonb("assessment_ids").notNull().$type<string[]>(),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  totalAmount: integer("total_amount").notNull(),
  baseFee: integer("base_fee").notNull().default(1500),
  status: text("status").notNull().default("pending"),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
});

export const insertPurchasedAssessmentSchema = createInsertSchema(purchasedAssessments).omit({
  id: true,
  purchasedAt: true,
});

export type InsertPurchasedAssessment = z.infer<typeof insertPurchasedAssessmentSchema>;
export type PurchasedAssessment = typeof purchasedAssessments.$inferSelect;

export const assessmentResults = pgTable("assessment_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purchaseId: varchar("purchase_id").references(() => purchasedAssessments.id, { onDelete: "set null" }),
  assessmentType: text("assessment_type").notNull(),
  answers: jsonb("answers").notNull().$type<Record<string, any>>(),
  scores: jsonb("scores").notNull().$type<Record<string, number>>(),
  totalScore: integer("total_score"),
  percentile: integer("percentile"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertAssessmentResultSchema = createInsertSchema(assessmentResults).omit({
  id: true,
  completedAt: true,
});

export type InsertAssessmentResult = z.infer<typeof insertAssessmentResultSchema>;
export type AssessmentResult = typeof assessmentResults.$inferSelect;

export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  candidateEmail: text("candidate_email").notNull(),
  candidateName: text("candidate_name").notNull(),
  assessmentIds: jsonb("assessment_ids").notNull().$type<string[]>(),
  message: text("message"),
  sentBy: varchar("sent_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("sent"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  sentAt: true,
  status: true,
  completedAt: true,
});

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

export const promptArchitectureEvaluations = pgTable("prompt_architecture_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resultId: varchar("result_id").notNull().references(() => assessmentResults.id, { onDelete: "cascade" }),
  level: integer("level").notNull(),
  userPrompt: text("user_prompt").notNull(),
  aiResponse: text("ai_response").notNull(),
  evaluationScores: jsonb("evaluation_scores").notNull().$type<{
    clarity: number;
    structure: number;
    contextRelevance: number;
    creativity: number;
    iterativeImprovement: number;
  }>(),
  totalScore: integer("total_score").notNull(),
  feedback: text("feedback"),
  evaluatedAt: timestamp("evaluated_at").defaultNow().notNull(),
});

export const insertPromptArchitectureEvaluationSchema = createInsertSchema(promptArchitectureEvaluations).omit({
  id: true,
  evaluatedAt: true,
});

export type InsertPromptArchitectureEvaluation = z.infer<typeof insertPromptArchitectureEvaluationSchema>;
export type PromptArchitectureEvaluation = typeof promptArchitectureEvaluations.$inferSelect;

export const aiqRationales = pgTable("aiq_rationales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resultId: varchar("result_id").notNull().references(() => assessmentResults.id, { onDelete: "cascade" }),
  questionNumber: integer("question_number").notNull(),
  selectedAnswer: text("selected_answer").notNull(),
  rationale: text("rationale").notNull(),
  rationalScore: integer("rational_score"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertAiqRationaleSchema = createInsertSchema(aiqRationales).omit({
  id: true,
  submittedAt: true,
});

export type InsertAiqRationale = z.infer<typeof insertAiqRationaleSchema>;
export type AiqRationale = typeof aiqRationales.$inferSelect;
