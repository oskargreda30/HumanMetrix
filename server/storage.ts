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
  userReferences,
  marketingOptins,
  goldenSetPrompts,
  goldenSetResults,
  organizations,
  partnerAccounts,
  partnerApiKeys,
  assessmentSessions,
  usageEvents,
  partnerTestPackages,
  partnerQuotaLedger,
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
  type UserReference,
  type InsertUserReference,
  type MarketingOptin,
  type InsertMarketingOptin,
  type GoldenSetPrompt,
  type InsertGoldenSetPrompt,
  type GoldenSetResult,
  type InsertGoldenSetResult,
  type Organization,
  type InsertOrganization,
  type UserRole,
  type PartnerAccount,
  type InsertPartnerAccount,
  type PartnerApiKey,
  type InsertPartnerApiKey,
  type AssessmentSession,
  type InsertAssessmentSession,
  type UsageEvent,
  type InsertUsageEvent,
  type PartnerTestPackage,
  type InsertPartnerTestPackage,
  type PartnerQuotaLedger,
  type InsertPartnerQuotaLedger,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";

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
  ensureInvitationPurchase(userId: string, userEmail: string): Promise<Purchase | null>;
  
  // Purchase item operations
  createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem>;
  getPurchaseItems(purchaseId: string): Promise<PurchaseItem[]>;
  getPurchaseItemsBulk(purchaseIds: string[]): Promise<Map<string, PurchaseItem[]>>;
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
  
  // User reference operations
  createUserReference(reference: InsertUserReference): Promise<UserReference>;
  getUserReference(userId: string): Promise<UserReference | undefined>;
  
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
  
  // Marketing opt-in operations
  createMarketingOptin(optin: InsertMarketingOptin): Promise<MarketingOptin>;
  getMarketingOptins(): Promise<MarketingOptin[]>;
  
  // Golden Set operations (scoring consistency benchmarks)
  createGoldenSetPrompt(prompt: InsertGoldenSetPrompt): Promise<GoldenSetPrompt>;
  getAllGoldenSetPrompts(): Promise<GoldenSetPrompt[]>;
  createGoldenSetResult(result: InsertGoldenSetResult): Promise<GoldenSetResult>;
  getLatestGoldenSetResults(): Promise<Array<GoldenSetResult & { prompt: GoldenSetPrompt }>>;
  getGoldenSetResultHistory(promptId: string, limit?: number): Promise<GoldenSetResult[]>;
  deleteAllGoldenSetPrompts(): Promise<void>;
  deleteAllGoldenSetResults(): Promise<void>;
  
  // Organization operations
  createOrganization(org: InsertOrganization): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<void>;
  deleteOrganization(id: string): Promise<void>;
  
  // User role/organization operations
  updateUserRole(userId: string, role: UserRole): Promise<void>;
  updateUserOrganization(userId: string, organizationId: string | null): Promise<void>;
  getUsersByOrganization(organizationId: string): Promise<User[]>;
  getCandidatesWithResultsByOrganization(organizationId: string | null): Promise<Array<{
    user: User;
    results: AssessmentResult[];
    tags: CandidateTag[];
    notes: CandidateNote[];
    invitations: Invitation[];
  }>>;
  
  // B2B Partner operations
  createPartnerAccount(partner: InsertPartnerAccount): Promise<PartnerAccount>;
  getPartnerAccount(id: string): Promise<PartnerAccount | undefined>;
  getPartnerAccountByEmail(email: string): Promise<PartnerAccount | undefined>;
  getPartnerAccountByOrganizationId(organizationId: string): Promise<PartnerAccount | undefined>;
  getAllPartnerAccounts(): Promise<PartnerAccount[]>;
  updatePartnerAccount(id: string, updates: Partial<InsertPartnerAccount>): Promise<void>;
  deletePartnerAccount(id: string): Promise<void>;
  
  // Partner API key operations
  createPartnerApiKey(key: InsertPartnerApiKey): Promise<PartnerApiKey>;
  getPartnerApiKey(id: string): Promise<PartnerApiKey | undefined>;
  getPartnerApiKeyByPrefix(prefix: string): Promise<PartnerApiKey | undefined>;
  getPartnerApiKeysByPartner(partnerId: string): Promise<PartnerApiKey[]>;
  updatePartnerApiKeyLastUsed(id: string): Promise<void>;
  revokePartnerApiKey(id: string): Promise<void>;
  
  // Assessment session operations (for embedded assessments)
  createAssessmentSession(session: InsertAssessmentSession): Promise<AssessmentSession>;
  getAssessmentSession(id: string): Promise<AssessmentSession | undefined>;
  getSessionsByPartner(partnerId: string, limit?: number): Promise<AssessmentSession[]>;
  updateAssessmentSession(id: string, updates: Partial<InsertAssessmentSession>): Promise<void>;
  
  // Usage event operations
  createUsageEvent(event: InsertUsageEvent): Promise<UsageEvent>;
  getUsageEventsByPartner(partnerId: string, startDate?: Date, endDate?: Date): Promise<UsageEvent[]>;
  getUsageSummaryByPartner(partnerId: string, startDate: Date, endDate: Date): Promise<{ eventType: string; count: number; totalAmount: number }[]>;
  getRecentUsageEvents(partnerId: string, limit: number): Promise<UsageEvent[]>;
  getBillableEventsForPeriod(partnerId: string, startDate: Date, endDate: Date): Promise<UsageEvent[]>;
  
  // Partner quota operations
  createPartnerTestPackage(pkg: InsertPartnerTestPackage): Promise<PartnerTestPackage>;
  getPartnerTestPackage(id: string): Promise<PartnerTestPackage | undefined>;
  getPartnerTestPackageByStripeSession(sessionId: string): Promise<PartnerTestPackage | undefined>;
  getPartnerTestPackages(partnerId: string): Promise<PartnerTestPackage[]>;
  updatePartnerTestPackage(id: string, updates: Partial<InsertPartnerTestPackage>): Promise<void>;
  createQuotaLedgerEntry(entry: InsertPartnerQuotaLedger): Promise<PartnerQuotaLedger>;
  getQuotaLedger(partnerId: string, limit?: number): Promise<PartnerQuotaLedger[]>;
  getPartnerQuotaBalance(partnerId: string): Promise<{ testsPurchased: number; testsConsumed: number; remaining: number }>;
  consumePartnerTest(partnerId: string, sessionId: string, description: string): Promise<{ success: boolean; remaining: number; suspended: boolean }>;
  creditPartnerTests(partnerId: string, packageId: string, amount: number, description: string): Promise<{ success: boolean; newBalance: number }>;
  updatePartnerQuotaNotification(partnerId: string, notificationType: '70' | '90'): Promise<void>;
  suspendPartnerApiAccess(partnerId: string): Promise<void>;
  reactivatePartnerApiAccess(partnerId: string): Promise<void>;
  
  // Alias for consistency
  getApiKeysByPartner(partnerId: string): Promise<PartnerApiKey[]>;
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

  async ensureInvitationPurchase(userId: string, userEmail: string): Promise<Purchase | null> {
    // 1. Get all active invitations for this user (newest first)
    const allInvitations = await this.getInvitationsByEmail(userEmail);
    const validInvitations = allInvitations.filter(inv => 
      (inv.status === 'sent' || inv.status === 'accepted') &&
      new Date(inv.expiresAt) > new Date()
    );
    
    if (validInvitations.length === 0) {
      return null; // No active invitation
    }
    
    // 2. Pick the newest invitation (already sorted by sentAt desc from getInvitationsByEmail)
    const invitation = validInvitations[0];
    
    // 3. Check if user already has a pending purchase linked to THIS invitation
    const userPurchases = await this.getPurchasesByUser(userId);
    const existingPurchase = userPurchases.find(p => 
      !p.resultsAccessPaid && 
      p.invitationId === invitation.id
    );
    
    if (existingPurchase) {
      return existingPurchase; // Re-use existing pending purchase
    }
    
    // 4. Create new pending purchase linked to invitation
    const BASE_FEE = 1500; // £15 in pence
    const newPurchase = await this.createPurchase({
      userId,
      invitationId: invitation.id,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      totalAmount: 0, // Will be calculated at unlock time
      baseFee: BASE_FEE,
      status: 'pending', // Not completed until payment
      resultsAccessPaid: false,
      completedAt: null,
    });
    
    // 5. Optionally update invitation status to 'accepted' to track engagement
    if (invitation.status === 'sent') {
      await this.updateInvitationStatus(invitation.id, 'accepted');
    }
    
    return newPurchase;
    // NOTE: No purchase items created - invitation.assessmentTypes defines billing
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

  async getPurchaseItemsBulk(purchaseIds: string[]): Promise<Map<string, PurchaseItem[]>> {
    if (purchaseIds.length === 0) return new Map();
    
    const allItems = await db
      .select()
      .from(purchaseItems)
      .where(inArray(purchaseItems.purchaseId, purchaseIds));
    
    // Group by purchaseId in memory
    const itemsMap = new Map<string, PurchaseItem[]>();
    allItems.forEach(item => {
      if (!itemsMap.has(item.purchaseId)) itemsMap.set(item.purchaseId, []);
      itemsMap.get(item.purchaseId)!.push(item);
    });
    
    return itemsMap;
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

  async getResultByInvitationAndType(invitationId: string, assessmentType: string): Promise<AssessmentResult | undefined> {
    // Normalize the database assessment_type column by replacing hyphens with underscores
    // This ensures matching even if legacy data has hyphens
    const [result] = await db
      .select()
      .from(assessmentResults)
      .where(
        and(
          eq(assessmentResults.invitationId, invitationId),
          sql`REPLACE(${assessmentResults.assessmentType}, '-', '_') = ${assessmentType}`
        )
      );
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

  async getInvitationsByEmail(email: string): Promise<Invitation[]> {
    return await db
      .select()
      .from(invitations)
      .where(eq(invitations.candidateEmail, email))
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
    // OPTIMIZED: Bulk fetch all data in 5 queries instead of N*4 queries
    const allUsers = await db.select().from(users);
    
    if (allUsers.length === 0) return [];
    
    const userIds = allUsers.map(u => u.id);
    const userEmails = allUsers.map(u => u.email);
    
    // Bulk fetch all related data in parallel
    const [allResults, allTags, allNotes, allInvitations] = await Promise.all([
      db.select().from(assessmentResults).where(inArray(assessmentResults.userId, userIds)),
      db.select().from(candidateTags).where(inArray(candidateTags.userId, userIds)),
      db.select().from(candidateNotes).where(inArray(candidateNotes.userId, userIds)),
      db.select().from(invitations).where(inArray(invitations.candidateEmail, userEmails)),
    ]);
    
    // Group data by user ID/email in memory (O(n) instead of O(n*m))
    const resultsMap = new Map<string, AssessmentResult[]>();
    const tagsMap = new Map<string, CandidateTag[]>();
    const notesMap = new Map<string, CandidateNote[]>();
    const invitationsMap = new Map<string, Invitation[]>();
    
    allResults.forEach(r => {
      if (!resultsMap.has(r.userId)) resultsMap.set(r.userId, []);
      resultsMap.get(r.userId)!.push(r);
    });
    
    allTags.forEach(t => {
      if (!tagsMap.has(t.userId)) tagsMap.set(t.userId, []);
      tagsMap.get(t.userId)!.push(t);
    });
    
    allNotes.forEach(n => {
      if (!notesMap.has(n.userId)) notesMap.set(n.userId, []);
      notesMap.get(n.userId)!.push(n);
    });
    
    allInvitations.forEach(i => {
      const emailLower = i.candidateEmail.toLowerCase();
      if (!invitationsMap.has(emailLower)) invitationsMap.set(emailLower, []);
      invitationsMap.get(emailLower)!.push(i);
    });
    
    // Assemble results
    const candidatesData = allUsers.map(user => ({
      user,
      results: resultsMap.get(user.id) || [],
      tags: tagsMap.get(user.id) || [],
      notes: notesMap.get(user.id) || [],
      invitations: invitationsMap.get(user.email.toLowerCase()) || [],
    }));

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
  
  // User reference operations
  async createUserReference(reference: InsertUserReference): Promise<UserReference> {
    const [ref] = await db.insert(userReferences).values(reference).returning();
    return ref;
  }
  
  async getUserReference(userId: string): Promise<UserReference | undefined> {
    const [ref] = await db
      .select()
      .from(userReferences)
      .where(eq(userReferences.userId, userId))
      .orderBy(desc(userReferences.submittedAt))
      .limit(1);
    return ref;
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

  // Marketing opt-in operations
  async createMarketingOptin(optin: InsertMarketingOptin): Promise<MarketingOptin> {
    const [created] = await db
      .insert(marketingOptins)
      .values(optin)
      .returning();
    return created;
  }

  async getMarketingOptins(): Promise<MarketingOptin[]> {
    return await db
      .select()
      .from(marketingOptins)
      .orderBy(desc(marketingOptins.optedInAt));
  }

  // Golden Set operations
  async createGoldenSetPrompt(prompt: InsertGoldenSetPrompt): Promise<GoldenSetPrompt> {
    const [created] = await db
      .insert(goldenSetPrompts)
      .values(prompt)
      .returning();
    return created;
  }

  async getAllGoldenSetPrompts(): Promise<GoldenSetPrompt[]> {
    return await db
      .select()
      .from(goldenSetPrompts)
      .orderBy(goldenSetPrompts.level);
  }

  async createGoldenSetResult(result: InsertGoldenSetResult): Promise<GoldenSetResult> {
    const [created] = await db
      .insert(goldenSetResults)
      .values(result)
      .returning();
    return created;
  }

  async getLatestGoldenSetResults(): Promise<Array<GoldenSetResult & { prompt: GoldenSetPrompt }>> {
    const prompts = await this.getAllGoldenSetPrompts();
    const results: Array<GoldenSetResult & { prompt: GoldenSetPrompt }> = [];
    
    for (const prompt of prompts) {
      const [latestResult] = await db
        .select()
        .from(goldenSetResults)
        .where(eq(goldenSetResults.promptId, prompt.id))
        .orderBy(desc(goldenSetResults.testedAt))
        .limit(1);
      
      if (latestResult) {
        results.push({ ...latestResult, prompt });
      }
    }
    
    return results;
  }

  async getGoldenSetResultHistory(promptId: string, limit: number = 30): Promise<GoldenSetResult[]> {
    return await db
      .select()
      .from(goldenSetResults)
      .where(eq(goldenSetResults.promptId, promptId))
      .orderBy(desc(goldenSetResults.testedAt))
      .limit(limit);
  }

  async deleteAllGoldenSetPrompts(): Promise<void> {
    await db.delete(goldenSetPrompts);
  }

  async deleteAllGoldenSetResults(): Promise<void> {
    await db.delete(goldenSetResults);
  }

  // Organization operations
  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db
      .insert(organizations)
      .values(org)
      .returning();
    return created;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug));
    return org;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return await db
      .select()
      .from(organizations)
      .orderBy(desc(organizations.createdAt));
  }

  async updateOrganization(id: string, updates: Partial<InsertOrganization>): Promise<void> {
    await db
      .update(organizations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizations.id, id));
  }

  async deleteOrganization(id: string): Promise<void> {
    await db
      .delete(organizations)
      .where(eq(organizations.id, id));
  }

  // User role/organization operations
  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserOrganization(userId: string, organizationId: string | null): Promise<void> {
    await db
      .update(users)
      .set({ organizationId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId));
  }

  async getCandidatesWithResultsByOrganization(organizationId: string | null): Promise<Array<{
    user: User;
    results: AssessmentResult[];
    tags: CandidateTag[];
    notes: CandidateNote[];
    invitations: Invitation[];
  }>> {
    // OPTIMIZED: Bulk fetch all data in 5 queries instead of N*4 queries
    let allUsers: User[];
    
    if (organizationId === null) {
      // Super admin: get all users
      allUsers = await db.select().from(users);
    } else {
      // Org admin: get only users in their organization
      allUsers = await db
        .select()
        .from(users)
        .where(eq(users.organizationId, organizationId));
    }

    if (allUsers.length === 0) return [];
    
    const userIds = allUsers.map(u => u.id);
    const userEmails = allUsers.map(u => u.email);
    
    // Bulk fetch all related data in parallel
    const [allResults, allTags, allNotes, allInvitations] = await Promise.all([
      db.select().from(assessmentResults).where(inArray(assessmentResults.userId, userIds)),
      db.select().from(candidateTags).where(inArray(candidateTags.userId, userIds)),
      db.select().from(candidateNotes).where(inArray(candidateNotes.userId, userIds)),
      db.select().from(invitations).where(inArray(invitations.candidateEmail, userEmails)),
    ]);
    
    // Group data by user ID/email in memory (O(n) instead of O(n*m))
    const resultsMap = new Map<string, AssessmentResult[]>();
    const tagsMap = new Map<string, CandidateTag[]>();
    const notesMap = new Map<string, CandidateNote[]>();
    const invitationsMap = new Map<string, Invitation[]>();
    
    allResults.forEach(r => {
      if (!resultsMap.has(r.userId)) resultsMap.set(r.userId, []);
      resultsMap.get(r.userId)!.push(r);
    });
    
    allTags.forEach(t => {
      if (!tagsMap.has(t.userId)) tagsMap.set(t.userId, []);
      tagsMap.get(t.userId)!.push(t);
    });
    
    allNotes.forEach(n => {
      if (!notesMap.has(n.userId)) notesMap.set(n.userId, []);
      notesMap.get(n.userId)!.push(n);
    });
    
    allInvitations.forEach(i => {
      const emailLower = i.candidateEmail.toLowerCase();
      if (!invitationsMap.has(emailLower)) invitationsMap.set(emailLower, []);
      invitationsMap.get(emailLower)!.push(i);
    });
    
    // Assemble results
    const candidatesData = allUsers.map(user => ({
      user,
      results: resultsMap.get(user.id) || [],
      tags: tagsMap.get(user.id) || [],
      notes: notesMap.get(user.id) || [],
      invitations: invitationsMap.get(user.email.toLowerCase()) || [],
    }));

    // Filter to only include candidates with results or invitations
    return candidatesData.filter(
      (candidate) => candidate.results.length > 0 || candidate.invitations.length > 0
    );
  }

  // B2B Partner operations
  async createPartnerAccount(partner: InsertPartnerAccount): Promise<PartnerAccount> {
    const [result] = await db.insert(partnerAccounts).values(partner).returning();
    return result;
  }

  async getPartnerAccount(id: string): Promise<PartnerAccount | undefined> {
    const [result] = await db.select().from(partnerAccounts).where(eq(partnerAccounts.id, id));
    return result;
  }

  async getPartnerAccountByEmail(email: string): Promise<PartnerAccount | undefined> {
    const [result] = await db.select().from(partnerAccounts).where(eq(partnerAccounts.email, email));
    return result;
  }

  async getPartnerAccountByOrganizationId(organizationId: string): Promise<PartnerAccount | undefined> {
    const [result] = await db.select().from(partnerAccounts).where(eq(partnerAccounts.organizationId, organizationId));
    return result;
  }

  async getAllPartnerAccounts(): Promise<PartnerAccount[]> {
    return await db.select().from(partnerAccounts).orderBy(desc(partnerAccounts.createdAt));
  }

  async updatePartnerAccount(id: string, updates: Partial<InsertPartnerAccount>): Promise<void> {
    await db.update(partnerAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(partnerAccounts.id, id));
  }

  async deletePartnerAccount(id: string): Promise<void> {
    await db.delete(partnerAccounts).where(eq(partnerAccounts.id, id));
  }

  // Partner API key operations
  async createPartnerApiKey(key: InsertPartnerApiKey): Promise<PartnerApiKey> {
    const [result] = await db.insert(partnerApiKeys).values(key).returning();
    return result;
  }

  async getPartnerApiKey(id: string): Promise<PartnerApiKey | undefined> {
    const [result] = await db.select().from(partnerApiKeys).where(eq(partnerApiKeys.id, id));
    return result;
  }

  async getPartnerApiKeyByPrefix(prefix: string): Promise<PartnerApiKey | undefined> {
    const [result] = await db.select().from(partnerApiKeys)
      .where(and(
        eq(partnerApiKeys.keyPrefix, prefix),
        eq(partnerApiKeys.isActive, true)
      ));
    return result;
  }

  async getPartnerApiKeysByPartner(partnerId: string): Promise<PartnerApiKey[]> {
    return await db.select().from(partnerApiKeys)
      .where(eq(partnerApiKeys.partnerId, partnerId))
      .orderBy(desc(partnerApiKeys.createdAt));
  }

  async updatePartnerApiKeyLastUsed(id: string): Promise<void> {
    await db.update(partnerApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(partnerApiKeys.id, id));
  }

  async revokePartnerApiKey(id: string): Promise<void> {
    await db.update(partnerApiKeys)
      .set({ isActive: false })
      .where(eq(partnerApiKeys.id, id));
  }

  // Assessment session operations
  async createAssessmentSession(session: InsertAssessmentSession): Promise<AssessmentSession> {
    const [result] = await db.insert(assessmentSessions).values(session).returning();
    return result;
  }

  async getAssessmentSession(id: string): Promise<AssessmentSession | undefined> {
    const [result] = await db.select().from(assessmentSessions).where(eq(assessmentSessions.id, id));
    return result;
  }

  async getSessionsByPartner(partnerId: string, limit: number = 100): Promise<AssessmentSession[]> {
    return await db.select().from(assessmentSessions)
      .where(eq(assessmentSessions.partnerId, partnerId))
      .orderBy(desc(assessmentSessions.createdAt))
      .limit(limit);
  }

  async updateAssessmentSession(id: string, updates: Partial<InsertAssessmentSession>): Promise<void> {
    await db.update(assessmentSessions)
      .set(updates)
      .where(eq(assessmentSessions.id, id));
  }

  // Usage event operations
  async createUsageEvent(event: InsertUsageEvent): Promise<UsageEvent> {
    const [result] = await db.insert(usageEvents).values(event).returning();
    return result;
  }

  async getUsageEventsByPartner(partnerId: string, startDate?: Date, endDate?: Date): Promise<UsageEvent[]> {
    let query = db.select().from(usageEvents).where(eq(usageEvents.partnerId, partnerId));
    
    if (startDate && endDate) {
      query = db.select().from(usageEvents).where(
        and(
          eq(usageEvents.partnerId, partnerId),
          sql`${usageEvents.createdAt} >= ${startDate}`,
          sql`${usageEvents.createdAt} <= ${endDate}`
        )
      );
    }
    
    return await query.orderBy(desc(usageEvents.createdAt));
  }

  async getUsageSummaryByPartner(partnerId: string, startDate: Date, endDate: Date): Promise<{ eventType: string; count: number; totalAmount: number }[]> {
    const result = await db
      .select({
        eventType: usageEvents.eventType,
        count: sql<number>`count(*)::int`,
        totalAmount: sql<number>`coalesce(sum(${usageEvents.billedAmount}), 0)::int`,
      })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.partnerId, partnerId),
          sql`${usageEvents.createdAt} >= ${startDate}`,
          sql`${usageEvents.createdAt} <= ${endDate}`
        )
      )
      .groupBy(usageEvents.eventType);
    
    return result;
  }

  async getRecentUsageEvents(partnerId: string, limit: number): Promise<UsageEvent[]> {
    return await db
      .select()
      .from(usageEvents)
      .where(eq(usageEvents.partnerId, partnerId))
      .orderBy(desc(usageEvents.createdAt))
      .limit(limit);
  }

  async getApiKeysByPartner(partnerId: string): Promise<PartnerApiKey[]> {
    return this.getPartnerApiKeysByPartner(partnerId);
  }

  async getBillableEventsForPeriod(partnerId: string, startDate: Date, endDate: Date): Promise<UsageEvent[]> {
    return await db
      .select()
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.partnerId, partnerId),
          eq(usageEvents.billable, true),
          sql`${usageEvents.createdAt} >= ${startDate}`,
          sql`${usageEvents.createdAt} <= ${endDate}`
        )
      )
      .orderBy(desc(usageEvents.createdAt));
  }

  // Partner quota operations
  async createPartnerTestPackage(pkg: InsertPartnerTestPackage): Promise<PartnerTestPackage> {
    const [result] = await db.insert(partnerTestPackages).values(pkg).returning();
    return result;
  }

  async getPartnerTestPackage(id: string): Promise<PartnerTestPackage | undefined> {
    const [result] = await db.select().from(partnerTestPackages).where(eq(partnerTestPackages.id, id));
    return result;
  }

  async getPartnerTestPackageByStripeSession(sessionId: string): Promise<PartnerTestPackage | undefined> {
    const [result] = await db.select().from(partnerTestPackages)
      .where(eq(partnerTestPackages.stripeCheckoutSessionId, sessionId));
    return result;
  }

  async getPartnerTestPackages(partnerId: string): Promise<PartnerTestPackage[]> {
    return await db.select().from(partnerTestPackages)
      .where(eq(partnerTestPackages.partnerId, partnerId))
      .orderBy(desc(partnerTestPackages.createdAt));
  }

  async updatePartnerTestPackage(id: string, updates: Partial<InsertPartnerTestPackage>): Promise<void> {
    await db.update(partnerTestPackages).set(updates).where(eq(partnerTestPackages.id, id));
  }

  async createQuotaLedgerEntry(entry: InsertPartnerQuotaLedger): Promise<PartnerQuotaLedger> {
    const [result] = await db.insert(partnerQuotaLedger).values(entry).returning();
    return result;
  }

  async getQuotaLedger(partnerId: string, limit: number = 100): Promise<PartnerQuotaLedger[]> {
    return await db.select().from(partnerQuotaLedger)
      .where(eq(partnerQuotaLedger.partnerId, partnerId))
      .orderBy(desc(partnerQuotaLedger.createdAt))
      .limit(limit);
  }

  async getPartnerQuotaBalance(partnerId: string): Promise<{ testsPurchased: number; testsConsumed: number; remaining: number }> {
    const [partner] = await db.select({
      testsPurchased: partnerAccounts.testsPurchased,
      testsConsumed: partnerAccounts.testsConsumed,
    }).from(partnerAccounts).where(eq(partnerAccounts.id, partnerId));
    
    if (!partner) {
      return { testsPurchased: 0, testsConsumed: 0, remaining: 0 };
    }
    
    return {
      testsPurchased: partner.testsPurchased,
      testsConsumed: partner.testsConsumed,
      remaining: partner.testsPurchased - partner.testsConsumed,
    };
  }

  async consumePartnerTest(partnerId: string, sessionId: string, description: string): Promise<{ success: boolean; remaining: number; suspended: boolean }> {
    // Get current balance
    const balance = await this.getPartnerQuotaBalance(partnerId);
    
    if (balance.remaining <= 0) {
      // No credits remaining - suspend access
      await this.suspendPartnerApiAccess(partnerId);
      return { success: false, remaining: 0, suspended: true };
    }
    
    const newConsumed = balance.testsConsumed + 1;
    const newRemaining = balance.testsPurchased - newConsumed;
    
    // Update partner account
    await db.update(partnerAccounts).set({
      testsConsumed: newConsumed,
      updatedAt: new Date(),
    }).where(eq(partnerAccounts.id, partnerId));
    
    // Create ledger entry
    await this.createQuotaLedgerEntry({
      partnerId,
      sessionId,
      entryType: 'debit',
      amount: -1,
      balanceAfter: newRemaining,
      description,
    });
    
    // Check if we need to suspend (hit 100%)
    if (newRemaining <= 0) {
      await this.suspendPartnerApiAccess(partnerId);
      return { success: true, remaining: 0, suspended: true };
    }
    
    return { success: true, remaining: newRemaining, suspended: false };
  }

  async creditPartnerTests(partnerId: string, packageId: string, amount: number, description: string): Promise<{ success: boolean; newBalance: number }> {
    // Get current balance
    const balance = await this.getPartnerQuotaBalance(partnerId);
    const newPurchased = balance.testsPurchased + amount;
    const newRemaining = newPurchased - balance.testsConsumed;
    
    // Update partner account
    await db.update(partnerAccounts).set({
      testsPurchased: newPurchased,
      // Clear suspension if they had remaining credits = 0 before
      apiAccessSuspendedAt: null,
      last70NoticeAt: null,
      last90NoticeAt: null,
      updatedAt: new Date(),
    }).where(eq(partnerAccounts.id, partnerId));
    
    // Create ledger entry
    await this.createQuotaLedgerEntry({
      partnerId,
      packageId,
      entryType: 'credit',
      amount,
      balanceAfter: newRemaining,
      description,
    });
    
    // Reactivate API keys if they were suspended
    await this.reactivatePartnerApiAccess(partnerId);
    
    return { success: true, newBalance: newRemaining };
  }

  async updatePartnerQuotaNotification(partnerId: string, notificationType: '70' | '90'): Promise<void> {
    const updateField = notificationType === '70' ? { last70NoticeAt: new Date() } : { last90NoticeAt: new Date() };
    await db.update(partnerAccounts).set({
      ...updateField,
      updatedAt: new Date(),
    }).where(eq(partnerAccounts.id, partnerId));
  }

  async suspendPartnerApiAccess(partnerId: string): Promise<void> {
    // Mark partner as suspended
    await db.update(partnerAccounts).set({
      apiAccessSuspendedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(partnerAccounts.id, partnerId));
    
    // Deactivate all API keys
    await db.update(partnerApiKeys).set({
      isActive: false,
    }).where(eq(partnerApiKeys.partnerId, partnerId));
  }

  async reactivatePartnerApiAccess(partnerId: string): Promise<void> {
    // Clear suspension
    await db.update(partnerAccounts).set({
      apiAccessSuspendedAt: null,
      updatedAt: new Date(),
    }).where(eq(partnerAccounts.id, partnerId));
    
    // Reactivate API keys (only those that haven't expired)
    await db.update(partnerApiKeys).set({
      isActive: true,
    }).where(
      and(
        eq(partnerApiKeys.partnerId, partnerId),
        or(
          sql`${partnerApiKeys.expiresAt} IS NULL`,
          sql`${partnerApiKeys.expiresAt} > NOW()`
        )
      )
    );
  }
}

export const storage = new DatabaseStorage();
