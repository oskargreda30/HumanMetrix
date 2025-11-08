import {
  users,
  purchases,
  purchaseItems,
  assessmentResults,
  invitations,
  promptArchitectureEvaluations,
  aiqRationales,
  jobRoles,
  candidateTags,
  candidateNotes,
  cachedRoleAlignments,
  reportExports,
  type User,
  type UpsertUser,
  type Purchase,
  type InsertPurchase,
  type PurchaseItem,
  type InsertPurchaseItem,
  type AssessmentResult,
  type InsertAssessmentResult,
  type Invitation,
  type InsertInvitation,
  type PromptArchitectureEvaluation,
  type InsertPromptArchitectureEvaluation,
  type AiqRationale,
  type InsertAiqRationale,
  type JobRole,
  type InsertJobRole,
  type CandidateTag,
  type InsertCandidateTag,
  type CandidateNote,
  type InsertCandidateNote,
  type CachedRoleAlignment,
  type InsertCachedRoleAlignment,
  type ReportExport,
  type InsertReportExport,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  setResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  
  // Purchase operations
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  getPurchaseByStripeSession(sessionId: string): Promise<Purchase | undefined>;
  getPurchasesByUser(userId: string): Promise<Purchase[]>;
  updatePurchaseStatus(id: string, status: string, completedAt?: Date): Promise<void>;
  updatePurchaseStripeSession(id: string, stripeSessionId: string): Promise<void>;
  updatePurchase(id: string, updates: Partial<InsertPurchase>): Promise<void>;
  
  // Purchase item operations
  createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem>;
  getPurchaseItems(purchaseId: string): Promise<PurchaseItem[]>;
  updatePurchaseItemStatus(id: string, status: string): Promise<void>;
  
  // Assessment result operations
  createAssessmentResult(result: InsertAssessmentResult): Promise<AssessmentResult>;
  getAssessmentResult(id: string): Promise<AssessmentResult | undefined>;
  getResultsByUser(userId: string): Promise<AssessmentResult[]>;
  getResultByPurchaseItem(purchaseItemId: string): Promise<AssessmentResult | undefined>;
  updateAssessmentResultStatus(id: string, status: string, completedAt?: Date): Promise<void>;
  updateAssessmentScores(id: string, scores: Record<string, number>, totalScore?: number, percentile?: number): Promise<void>;
  
  // Invitation operations
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitation(id: string): Promise<Invitation | undefined>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  getInvitationsBySender(senderId: string): Promise<Invitation[]>;
  updateInvitationStatus(id: string, status: string, completedAt?: Date): Promise<void>;
  
  // Prompt architecture evaluation operations
  createPromptEvaluation(evaluation: InsertPromptArchitectureEvaluation): Promise<PromptArchitectureEvaluation>;
  getEvaluationsByResult(resultId: string): Promise<PromptArchitectureEvaluation[]>;
  updatePromptEvaluationStatus(id: string, status: string, evaluationScores?: any, totalScore?: number, feedback?: string, evaluatedAt?: Date): Promise<void>;
  
  // AIQ rationale operations
  createAiqRationale(rationale: InsertAiqRationale): Promise<AiqRationale>;
  getRationalesByResult(resultId: string): Promise<AiqRationale[]>;
  
  // Admin operations
  getAllResults(): Promise<AssessmentResult[]>;
  getAllInvitations(): Promise<Invitation[]>;
  getCandidatesWithResults(): Promise<Array<{
    user: User;
    results: AssessmentResult[];
    tags: CandidateTag[];
    notes: CandidateNote[];
    invitations: Invitation[];
  }>>;
  
  // Job role operations
  createJobRole(role: InsertJobRole): Promise<JobRole>;
  getJobRole(id: string): Promise<JobRole | undefined>;
  getAllJobRoles(): Promise<JobRole[]>;
  updateJobRole(id: string, updates: Partial<InsertJobRole>): Promise<void>;
  deleteJobRole(id: string): Promise<void>;
  
  // Candidate tag operations
  createCandidateTag(tag: InsertCandidateTag): Promise<CandidateTag>;
  getTagsByCandidate(userId: string): Promise<CandidateTag[]>;
  deleteTag(id: string): Promise<void>;
  
  // Candidate note operations
  createCandidateNote(note: InsertCandidateNote): Promise<CandidateNote>;
  getNotesByCandidate(userId: string): Promise<CandidateNote[]>;
  updateNote(id: string, noteText: string): Promise<void>;
  deleteNote(id: string): Promise<void>;
  
  // Cached role alignment operations
  createRoleAlignment(alignment: InsertCachedRoleAlignment): Promise<CachedRoleAlignment>;
  getRoleAlignment(userId: string, jobRoleId: string): Promise<CachedRoleAlignment | undefined>;
  getRoleAlignmentsByCandidate(userId: string): Promise<CachedRoleAlignment[]>;
  invalidateRoleAlignmentCache(userId: string, jobRoleId: string): Promise<void>;
  
  // Report export operations
  createReportExport(report: InsertReportExport): Promise<ReportExport>;
  getReportExport(id: string): Promise<ReportExport | undefined>;
  getReportByShareToken(token: string): Promise<ReportExport | undefined>;
  incrementReportAccess(id: string): Promise<void>;
  getReportsByCreator(userId: string): Promise<ReportExport[]>;
  
  // Test/development operations
  createTestPurchaseWithAllAssessments(userId: string): Promise<void>;
  
  // Free assessment operations
  createFreeAssessmentsForUser(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async setResetToken(userId: string, token: string, expiry: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        resetToken: token, 
        resetTokenExpiry: expiry,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordHash, 
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Purchase operations
  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [result] = await db
      .insert(purchases)
      .values(purchase)
      .returning();
    return result;
  }

  async getPurchase(id: string): Promise<Purchase | undefined> {
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, id));
    return purchase;
  }

  async getPurchaseByStripeSession(sessionId: string): Promise<Purchase | undefined> {
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripeSessionId, sessionId));
    return purchase;
  }

  async getPurchasesByUser(userId: string): Promise<Purchase[]> {
    return await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, userId))
      .orderBy(desc(purchases.createdAt));
  }

  async updatePurchaseStatus(id: string, status: string, completedAt?: Date): Promise<void> {
    await db
      .update(purchases)
      .set({ status, completedAt })
      .where(eq(purchases.id, id));
  }

  async updatePurchaseStripeSession(id: string, stripeSessionId: string): Promise<void> {
    await db
      .update(purchases)
      .set({ stripeSessionId })
      .where(eq(purchases.id, id));
  }

  async updatePurchase(id: string, updates: Partial<InsertPurchase>): Promise<void> {
    await db
      .update(purchases)
      .set(updates)
      .where(eq(purchases.id, id));
  }

  // Purchase item operations
  async createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem> {
    const [result] = await db
      .insert(purchaseItems)
      .values(item)
      .returning();
    return result;
  }

  async getPurchaseItems(purchaseId: string): Promise<PurchaseItem[]> {
    return await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId));
  }

  async updatePurchaseItemStatus(id: string, status: string): Promise<void> {
    await db
      .update(purchaseItems)
      .set({ status })
      .where(eq(purchaseItems.id, id));
  }

  // Assessment result operations
  async createAssessmentResult(result: InsertAssessmentResult): Promise<AssessmentResult> {
    const [created] = await db
      .insert(assessmentResults)
      .values(result)
      .returning();
    return created;
  }

  async getAssessmentResult(id: string): Promise<AssessmentResult | undefined> {
    const [result] = await db
      .select()
      .from(assessmentResults)
      .where(eq(assessmentResults.id, id));
    return result;
  }

  async getResultsByUser(userId: string): Promise<AssessmentResult[]> {
    return await db
      .select()
      .from(assessmentResults)
      .where(eq(assessmentResults.userId, userId))
      .orderBy(desc(assessmentResults.startedAt));
  }

  async getResultByPurchaseItem(purchaseItemId: string): Promise<AssessmentResult | undefined> {
    const [result] = await db
      .select()
      .from(assessmentResults)
      .where(eq(assessmentResults.purchaseItemId, purchaseItemId));
    return result;
  }

  async updateAssessmentResultStatus(id: string, status: string, completedAt?: Date): Promise<void> {
    await db
      .update(assessmentResults)
      .set({ status, completedAt })
      .where(eq(assessmentResults.id, id));
  }

  async updateAssessmentScores(id: string, scores: Record<string, number>, totalScore?: number, percentile?: number): Promise<void> {
    await db
      .update(assessmentResults)
      .set({ scores, totalScore, percentile })
      .where(eq(assessmentResults.id, id));
  }

  // Invitation operations
  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [created] = await db
      .insert(invitations)
      .values({
        ...invitation,
        assessmentTypes: invitation.assessmentTypes as any,
      })
      .returning();
    return created;
  }

  async getInvitation(id: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, id));
    return invitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));
    return invitation;
  }

  async getInvitationsBySender(senderId: string): Promise<Invitation[]> {
    return await db
      .select()
      .from(invitations)
      .where(eq(invitations.sentBy, senderId))
      .orderBy(desc(invitations.sentAt));
  }

  async updateInvitationStatus(id: string, status: string, completedAt?: Date): Promise<void> {
    await db
      .update(invitations)
      .set({ status, completedAt })
      .where(eq(invitations.id, id));
  }

  // Prompt architecture evaluation operations
  async createPromptEvaluation(evaluation: InsertPromptArchitectureEvaluation): Promise<PromptArchitectureEvaluation> {
    const [created] = await db
      .insert(promptArchitectureEvaluations)
      .values(evaluation)
      .returning();
    return created;
  }

  async getEvaluationsByResult(resultId: string): Promise<PromptArchitectureEvaluation[]> {
    return await db
      .select()
      .from(promptArchitectureEvaluations)
      .where(eq(promptArchitectureEvaluations.resultId, resultId));
  }

  async updatePromptEvaluationStatus(id: string, status: string, evaluationScores?: any, totalScore?: number, feedback?: string, evaluatedAt?: Date): Promise<void> {
    await db
      .update(promptArchitectureEvaluations)
      .set({ status, evaluationScores, totalScore, feedback, evaluatedAt })
      .where(eq(promptArchitectureEvaluations.id, id));
  }

  // AIQ rationale operations
  async createAiqRationale(rationale: InsertAiqRationale): Promise<AiqRationale> {
    const [created] = await db
      .insert(aiqRationales)
      .values(rationale)
      .returning();
    return created;
  }

  async getRationalesByResult(resultId: string): Promise<AiqRationale[]> {
    return await db
      .select()
      .from(aiqRationales)
      .where(eq(aiqRationales.resultId, resultId));
  }

  // Admin operations
  async getAllResults(): Promise<AssessmentResult[]> {
    return await db
      .select()
      .from(assessmentResults)
      .orderBy(desc(assessmentResults.startedAt));
  }

  async getAllInvitations(): Promise<Invitation[]> {
    return await db
      .select()
      .from(invitations)
      .orderBy(desc(invitations.sentAt));
  }

  async getCandidatesWithResults(): Promise<Array<{
    user: User;
    results: AssessmentResult[];
    tags: CandidateTag[];
    notes: CandidateNote[];
    invitations: Invitation[];
  }>> {
    // Get all users who have taken at least one assessment or been invited
    // NOTE: Temporarily including admins for testing purposes
    const allUsers = await db
      .select()
      .from(users); // Include all users (including admins for testing)

    const candidatesData = await Promise.all(
      allUsers.map(async (user) => {
        const [results, tags, notes, userInvitations] = await Promise.all([
          this.getResultsByUser(user.id),
          this.getTagsByCandidate(user.id),
          this.getNotesByCandidate(user.id),
          db.select().from(invitations).where(eq(invitations.candidateEmail, user.email)),
        ]);

        return {
          user,
          results,
          tags,
          notes,
          invitations: userInvitations,
        };
      })
    );

    // Filter to only include candidates with results or invitations
    return candidatesData.filter(
      (candidate) => candidate.results.length > 0 || candidate.invitations.length > 0
    );
  }

  // Job role operations
  async createJobRole(role: InsertJobRole): Promise<JobRole> {
    const [created] = await db
      .insert(jobRoles)
      .values(role)
      .returning();
    return created;
  }

  async getJobRole(id: string): Promise<JobRole | undefined> {
    const [role] = await db
      .select()
      .from(jobRoles)
      .where(eq(jobRoles.id, id));
    return role;
  }

  async getAllJobRoles(): Promise<JobRole[]> {
    return await db
      .select()
      .from(jobRoles)
      .orderBy(desc(jobRoles.createdAt));
  }

  async updateJobRole(id: string, updates: Partial<InsertJobRole>): Promise<void> {
    await db
      .update(jobRoles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobRoles.id, id));
  }

  async deleteJobRole(id: string): Promise<void> {
    await db
      .delete(jobRoles)
      .where(eq(jobRoles.id, id));
  }

  // Candidate tag operations
  async createCandidateTag(tag: InsertCandidateTag): Promise<CandidateTag> {
    const [created] = await db
      .insert(candidateTags)
      .values(tag)
      .returning();
    return created;
  }

  async getTagsByCandidate(userId: string): Promise<CandidateTag[]> {
    return await db
      .select()
      .from(candidateTags)
      .where(eq(candidateTags.userId, userId))
      .orderBy(desc(candidateTags.createdAt));
  }

  async deleteTag(id: string): Promise<void> {
    await db
      .delete(candidateTags)
      .where(eq(candidateTags.id, id));
  }

  // Candidate note operations
  async createCandidateNote(note: InsertCandidateNote): Promise<CandidateNote> {
    const [created] = await db
      .insert(candidateNotes)
      .values(note)
      .returning();
    return created;
  }

  async getNotesByCandidate(userId: string): Promise<CandidateNote[]> {
    return await db
      .select()
      .from(candidateNotes)
      .where(eq(candidateNotes.userId, userId))
      .orderBy(desc(candidateNotes.createdAt));
  }

  async updateNote(id: string, noteText: string): Promise<void> {
    await db
      .update(candidateNotes)
      .set({ note: noteText, updatedAt: new Date() })
      .where(eq(candidateNotes.id, id));
  }

  async deleteNote(id: string): Promise<void> {
    await db
      .delete(candidateNotes)
      .where(eq(candidateNotes.id, id));
  }

  // Cached role alignment operations
  async createRoleAlignment(alignment: InsertCachedRoleAlignment): Promise<CachedRoleAlignment> {
    const [created] = await db
      .insert(cachedRoleAlignments)
      .values(alignment)
      .returning();
    return created;
  }

  async getRoleAlignment(userId: string, jobRoleId: string): Promise<CachedRoleAlignment | undefined> {
    const [alignment] = await db
      .select()
      .from(cachedRoleAlignments)
      .where(
        and(
          eq(cachedRoleAlignments.userId, userId),
          eq(cachedRoleAlignments.jobRoleId, jobRoleId)
        )
      )
      .orderBy(desc(cachedRoleAlignments.createdAt))
      .limit(1);
    
    // Check if cache is still valid
    if (alignment && new Date() < new Date(alignment.expiresAt)) {
      return alignment;
    }
    
    return undefined;
  }

  async getRoleAlignmentsByCandidate(userId: string): Promise<CachedRoleAlignment[]> {
    return await db
      .select()
      .from(cachedRoleAlignments)
      .where(eq(cachedRoleAlignments.userId, userId))
      .orderBy(desc(cachedRoleAlignments.createdAt));
  }

  async invalidateRoleAlignmentCache(userId: string, jobRoleId: string): Promise<void> {
    await db
      .delete(cachedRoleAlignments)
      .where(
        and(
          eq(cachedRoleAlignments.userId, userId),
          eq(cachedRoleAlignments.jobRoleId, jobRoleId)
        )
      );
  }

  // Report export operations
  async createReportExport(report: InsertReportExport): Promise<ReportExport> {
    const [created] = await db
      .insert(reportExports)
      .values(report)
      .returning();
    return created;
  }

  async getReportExport(id: string): Promise<ReportExport | undefined> {
    const [report] = await db
      .select()
      .from(reportExports)
      .where(eq(reportExports.id, id));
    return report;
  }

  async getReportByShareToken(token: string): Promise<ReportExport | undefined> {
    const [report] = await db
      .select()
      .from(reportExports)
      .where(eq(reportExports.shareToken, token));
    
    // Check if share link has expired
    if (report && report.expiresAt && new Date() > new Date(report.expiresAt)) {
      return undefined;
    }
    
    return report;
  }

  async incrementReportAccess(id: string): Promise<void> {
    await db
      .update(reportExports)
      .set({
        accessCount: sql`${reportExports.accessCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(reportExports.id, id));
  }

  async getReportsByCreator(userId: string): Promise<ReportExport[]> {
    return await db
      .select()
      .from(reportExports)
      .where(eq(reportExports.createdBy, userId))
      .orderBy(desc(reportExports.createdAt));
  }

  // Test/development operations
  async createTestPurchaseWithAllAssessments(userId: string): Promise<void> {
    // Check if test purchase already exists
    const existingPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, userId));
    
    if (existingPurchases.length > 0) {
      console.log('[TEST LOGIN] Test purchase already exists, skipping creation');
      return;
    }

    // Import assessment types and prices
    const { ASSESSMENT_TYPES, ASSESSMENT_PRICES, BASE_FEE } = await import("@shared/schema");

    // Create a completed purchase
    const [purchase] = await db
      .insert(purchases)
      .values({
        userId,
        stripeSessionId: 'test-session-123',
        stripePaymentIntentId: 'test-payment-intent-123',
        totalAmount: BASE_FEE + Object.values(ASSESSMENT_PRICES).reduce((a, b) => a + b, 0),
        baseFee: BASE_FEE,
        status: 'completed',
        resultsAccessPaid: true, // Paid users can view results
        completedAt: new Date(),
      })
      .returning();

    // Create purchase items for all 4 assessment types
    const assessmentTypes = Object.values(ASSESSMENT_TYPES);
    for (const assessmentType of assessmentTypes) {
      await db.insert(purchaseItems).values({
        purchaseId: purchase.id,
        assessmentType,
        price: ASSESSMENT_PRICES[assessmentType as keyof typeof ASSESSMENT_PRICES],
        status: 'ready', // Ready to be taken
      });
    }

    console.log('[TEST LOGIN] Created test purchase with all 4 assessments');
  }

  // Free assessment operations
  async createFreeAssessmentsForUser(userId: string): Promise<void> {
    // Check if user already has assessments
    const existingPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, userId));
    
    if (existingPurchases.length > 0) {
      console.log('[FREE ASSESSMENTS] User already has assessments, skipping');
      return;
    }

    // Import assessment types
    const { ASSESSMENT_TYPES, ASSESSMENT_PRICES, BASE_FEE } = await import("@shared/schema");

    // Create a free "purchase" (no payment required)
    const [purchase] = await db
      .insert(purchases)
      .values({
        userId,
        stripeSessionId: null,
        stripePaymentIntentId: null,
        totalAmount: 0, // Free!
        baseFee: 0,
        status: 'completed',
        resultsAccessPaid: false, // Invited users must pay to view results
        completedAt: new Date(),
      })
      .returning();

    // Create purchase items for all 4 assessment types
    const assessmentTypes = Object.values(ASSESSMENT_TYPES);
    for (const assessmentType of assessmentTypes) {
      await db.insert(purchaseItems).values({
        purchaseId: purchase.id,
        assessmentType,
        price: 0, // Free!
        status: 'ready',
      });
    }

    console.log('[FREE ASSESSMENTS] Created free assessments for user');
  }
}

export const storage = new DatabaseStorage();
