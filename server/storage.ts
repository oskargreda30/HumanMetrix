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
  partnerInvoices,
  type PartnerInvoice,
  type InsertPartnerInvoice,
  partnerMonthlyUsage,
  partnerOrganisations,
  type PartnerOrganisation,
  type InsertPartnerOrganisation,
  type PartnerMonthlyUsage,
  type InsertPartnerMonthlyUsage,
  errorLogs,
  type ErrorLog,
  type InsertErrorLog,
  partnerWebhooks,
  webhookDeliveryLogs,
  partnerAtsIntegrations,
  partnerScheduledExports,
  partnerNotifications,
  partnerTeamMembers,
  billingChangeRequests,
  type PartnerWebhook,
  type InsertPartnerWebhook,
  type WebhookDeliveryLog,
  type InsertWebhookDeliveryLog,
  type PartnerAtsIntegration,
  type InsertPartnerAtsIntegration,
  type PartnerScheduledExport,
  type InsertPartnerScheduledExport,
  type PartnerNotification,
  type InsertPartnerNotification,
  type PartnerTeamMember,
  type InsertPartnerTeamMember,
  type BillingChangeRequest,
  type InsertBillingChangeRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, inArray, gte, lte, count, countDistinct } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<void>; // For cleanup of just-created users only
  setResetToken(userId: string, token: string, expiry: Date): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  updateResultsRetentionConsent(userId: string, consent: boolean): Promise<void>;
  
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
  deletePurchaseItem(id: string): Promise<void>;
  getPurchaseItem(id: string): Promise<PurchaseItem | undefined>;
  
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
  
  // Partner organisation operations (sub-accounts for B2B partners)
  createPartnerOrganisation(org: InsertPartnerOrganisation): Promise<PartnerOrganisation>;
  getPartnerOrganisation(id: string): Promise<PartnerOrganisation | undefined>;
  getPartnerOrganisationBySlug(partnerId: string, slug: string): Promise<PartnerOrganisation | undefined>;
  getPartnerOrganisationsByPartner(partnerId: string): Promise<PartnerOrganisation[]>;
  updatePartnerOrganisation(id: string, updates: Partial<InsertPartnerOrganisation>): Promise<void>;
  deletePartnerOrganisation(id: string): Promise<void>;
  countPartnerOrganisations(partnerId: string): Promise<number>;
  
  // Partner API key operations
  createPartnerApiKey(key: InsertPartnerApiKey): Promise<PartnerApiKey>;
  getPartnerApiKey(id: string): Promise<PartnerApiKey | undefined>;
  getPartnerApiKeyByPrefix(prefix: string): Promise<PartnerApiKey | undefined>;
  getPartnerApiKeysByPartner(partnerId: string): Promise<PartnerApiKey[]>;
  updatePartnerApiKey(id: string, updates: Partial<{ keyHash: string; keyHint: string; name: string; permissions: string[]; rateLimit: number }>): Promise<void>;
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
  
  // Partner invoice operations
  createPartnerInvoice(invoice: InsertPartnerInvoice): Promise<PartnerInvoice>;
  getPartnerInvoice(id: string): Promise<PartnerInvoice | undefined>;
  getPartnerInvoices(partnerId: string): Promise<PartnerInvoice[]>;
  updatePartnerInvoice(id: string, updates: Partial<InsertPartnerInvoice>): Promise<void>;
  getNextInvoiceNumber(): Promise<string>;
  
  // Error log operations
  createErrorLog(errorLog: InsertErrorLog): Promise<ErrorLog>;
  getErrorLog(id: string): Promise<ErrorLog | undefined>;
  getErrorLogs(filters?: { 
    severity?: string; 
    status?: string; 
    startDate?: Date; 
    endDate?: Date; 
    userId?: string;
    partnerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ErrorLog[]>;
  getErrorLogsByFingerprint(fingerprint: string): Promise<ErrorLog[]>;
  updateErrorLog(id: string, updates: Partial<InsertErrorLog>): Promise<void>;
  incrementErrorOccurrence(fingerprint: string): Promise<ErrorLog | undefined>;
  getErrorStats(): Promise<{
    total: number;
    newCount: number;
    investigatingCount: number;
    criticalCount: number;
    last24Hours: number;
    affectedUsers: number;
    affectedPartners: number;
  }>;
  resolveErrorLog(id: string, resolvedBy: string, notes?: string): Promise<void>;
  
  // Billing operations
  getAllPurchasesWithDetails(filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    purchase: Purchase;
    user: { id: string; email: string; firstName: string | null; lastName: string | null };
    items: PurchaseItem[];
  }>>;
  getBillingStats(startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    averageOrderValue: number;
    revenueByMonth: Array<{ month: string; revenue: number; count: number }>;
  }>;
  
  // Consent operations
  getUsersWithConsentData(filter?: string): Promise<Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    resultsRetentionConsent: boolean | null;
    resultsRetentionConsentDate: Date | null;
    createdAt: Date | null;
  }>>;
  
  // Partner webhook operations
  createPartnerWebhook(webhook: InsertPartnerWebhook): Promise<PartnerWebhook>;
  getPartnerWebhook(id: string): Promise<PartnerWebhook | undefined>;
  getPartnerWebhooks(partnerId: string): Promise<PartnerWebhook[]>;
  getActiveWebhooksForEvent(partnerId: string, eventType: string): Promise<PartnerWebhook[]>;
  updatePartnerWebhook(id: string, updates: Partial<InsertPartnerWebhook>): Promise<void>;
  deletePartnerWebhook(id: string): Promise<void>;
  updateWebhookStats(id: string, success: boolean): Promise<void>;
  
  // Webhook delivery log operations
  createWebhookDeliveryLog(log: InsertWebhookDeliveryLog): Promise<WebhookDeliveryLog>;
  getWebhookDeliveryLog(id: string): Promise<WebhookDeliveryLog | undefined>;
  getWebhookDeliveryLogs(webhookId: string, limit?: number): Promise<WebhookDeliveryLog[]>;
  getPendingWebhookDeliveries(): Promise<WebhookDeliveryLog[]>;
  updateWebhookDeliveryLog(id: string, updates: Partial<InsertWebhookDeliveryLog>): Promise<void>;
  
  // Partner ATS integration operations
  createPartnerAtsIntegration(integration: InsertPartnerAtsIntegration): Promise<PartnerAtsIntegration>;
  getPartnerAtsIntegration(id: string): Promise<PartnerAtsIntegration | undefined>;
  getPartnerAtsIntegrations(partnerId: string): Promise<PartnerAtsIntegration[]>;
  updatePartnerAtsIntegration(id: string, updates: Partial<InsertPartnerAtsIntegration>): Promise<void>;
  deletePartnerAtsIntegration(id: string): Promise<void>;
  
  // Partner scheduled export operations
  createPartnerScheduledExport(exportConfig: InsertPartnerScheduledExport): Promise<PartnerScheduledExport>;
  getPartnerScheduledExport(id: string): Promise<PartnerScheduledExport | undefined>;
  getPartnerScheduledExports(partnerId: string): Promise<PartnerScheduledExport[]>;
  getDueScheduledExports(): Promise<PartnerScheduledExport[]>;
  updatePartnerScheduledExport(id: string, updates: Partial<InsertPartnerScheduledExport>): Promise<void>;
  deletePartnerScheduledExport(id: string): Promise<void>;

  // Partner notification operations
  createPartnerNotification(notification: InsertPartnerNotification): Promise<PartnerNotification>;
  getPartnerNotifications(partnerId: string, limit?: number, unreadOnly?: boolean): Promise<PartnerNotification[]>;
  getUnreadNotificationCount(partnerId: string): Promise<number>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(partnerId: string): Promise<void>;
  deletePartnerNotification(id: string): Promise<void>;

  // Partner team member operations
  createPartnerTeamMember(member: InsertPartnerTeamMember): Promise<PartnerTeamMember>;
  getPartnerTeamMember(id: string): Promise<PartnerTeamMember | undefined>;
  getPartnerTeamMemberByToken(token: string): Promise<PartnerTeamMember | undefined>;
  getPartnerTeamMemberByEmail(partnerId: string, email: string): Promise<PartnerTeamMember | undefined>;
  getPartnerTeamMembers(partnerId: string): Promise<PartnerTeamMember[]>;
  updatePartnerTeamMember(id: string, updates: Partial<InsertPartnerTeamMember>): Promise<void>;
  deletePartnerTeamMember(id: string): Promise<void>;

  // Partner analytics operations
  getPartnerAnalytics(partnerId: string, period: 'daily' | 'weekly' | 'monthly', days?: number): Promise<{
    testsOverTime: Array<{ date: string; count: number }>;
    byAssessmentType: Array<{ type: string; count: number; avgScore: number | null }>;
    byOrganization: Array<{ orgId: string; orgName: string; count: number }>;
  }>;

  // Billing change request operations
  createBillingChangeRequest(request: InsertBillingChangeRequest): Promise<BillingChangeRequest>;
  getBillingChangeRequest(id: string): Promise<BillingChangeRequest | undefined>;
  getBillingChangeRequestsByPartner(partnerId: string): Promise<BillingChangeRequest[]>;
  getPendingBillingChangeRequest(partnerId: string): Promise<BillingChangeRequest | undefined>;
  getAllPendingBillingChangeRequests(): Promise<Array<BillingChangeRequest & { partnerName: string; requestedByName: string; requestedByEmail: string }>>;
  updateBillingChangeRequest(id: string, updates: { status: string; reviewedByUserId?: string; reviewNotes?: string; reviewedAt?: Date }): Promise<void>;
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

  async deleteUser(id: string): Promise<void> {
    // For cleanup of just-created users only (no cascade needed)
    await db.delete(users).where(eq(users.id, id));
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

  async deletePurchaseItem(id: string): Promise<void> {
    await db
      .delete(purchaseItems)
      .where(eq(purchaseItems.id, id));
  }

  async getPurchaseItem(id: string): Promise<PurchaseItem | undefined> {
    const [item] = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.id, id));
    return item;
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

  async updateResultsRetentionConsent(userId: string, consent: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        resultsRetentionConsent: consent, 
        resultsRetentionConsentDate: new Date(),
        updatedAt: new Date() 
      })
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
    // Case-insensitive email lookup
    const [result] = await db.select().from(partnerAccounts).where(
      sql`LOWER(${partnerAccounts.email}) = LOWER(${email})`
    );
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

  // Partner organisation operations (sub-accounts for B2B partners)
  async createPartnerOrganisation(org: InsertPartnerOrganisation): Promise<PartnerOrganisation> {
    const [result] = await db.insert(partnerOrganisations).values(org).returning();
    return result;
  }

  async getPartnerOrganisation(id: string): Promise<PartnerOrganisation | undefined> {
    const [result] = await db.select().from(partnerOrganisations).where(eq(partnerOrganisations.id, id));
    return result;
  }

  async getPartnerOrganisationBySlug(partnerId: string, slug: string): Promise<PartnerOrganisation | undefined> {
    const [result] = await db.select().from(partnerOrganisations).where(
      and(eq(partnerOrganisations.partnerId, partnerId), eq(partnerOrganisations.slug, slug))
    );
    return result;
  }

  async getPartnerOrganisationsByPartner(partnerId: string): Promise<PartnerOrganisation[]> {
    return await db.select().from(partnerOrganisations).where(eq(partnerOrganisations.partnerId, partnerId));
  }

  async updatePartnerOrganisation(id: string, updates: Partial<InsertPartnerOrganisation>): Promise<void> {
    await db.update(partnerOrganisations).set(updates).where(eq(partnerOrganisations.id, id));
  }

  async deletePartnerOrganisation(id: string): Promise<void> {
    await db.delete(partnerOrganisations).where(eq(partnerOrganisations.id, id));
  }

  async countPartnerOrganisations(partnerId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(partnerOrganisations).where(eq(partnerOrganisations.partnerId, partnerId));
    return Number(result[0]?.count || 0);
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
      .where(and(
        eq(partnerApiKeys.partnerId, partnerId),
        eq(partnerApiKeys.isActive, true)
      ))
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

  async updatePartnerApiKey(id: string, updates: Partial<{ keyHash: string; keyHint: string; name: string; permissions: string[]; rateLimit: number }>): Promise<void> {
    await db.update(partnerApiKeys)
      .set(updates as any)
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

  // Partner invoice operations
  async createPartnerInvoice(invoice: InsertPartnerInvoice): Promise<PartnerInvoice> {
    const [result] = await db.insert(partnerInvoices).values(invoice).returning();
    return result;
  }

  async getPartnerInvoice(id: string): Promise<PartnerInvoice | undefined> {
    const [result] = await db.select().from(partnerInvoices).where(eq(partnerInvoices.id, id));
    return result;
  }

  async getPartnerInvoices(partnerId: string): Promise<PartnerInvoice[]> {
    return await db.select().from(partnerInvoices)
      .where(eq(partnerInvoices.partnerId, partnerId))
      .orderBy(desc(partnerInvoices.createdAt));
  }

  async updatePartnerInvoice(id: string, updates: Partial<InsertPartnerInvoice>): Promise<void> {
    await db.update(partnerInvoices).set(updates).where(eq(partnerInvoices.id, id));
  }

  async getNextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    
    // Get the highest invoice number for this year
    const result = await db.select({ invoiceNumber: partnerInvoices.invoiceNumber })
      .from(partnerInvoices)
      .where(sql`${partnerInvoices.invoiceNumber} LIKE ${prefix + '%'}`)
      .orderBy(desc(partnerInvoices.invoiceNumber))
      .limit(1);
    
    let nextNumber = 1;
    if (result.length > 0) {
      const lastNumber = parseInt(result[0].invoiceNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }
    
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  // Partner monthly usage operations
  async getOrCreateMonthlyUsage(partnerId: string, monthKey: string): Promise<PartnerMonthlyUsage> {
    const [existing] = await db.select().from(partnerMonthlyUsage)
      .where(and(
        eq(partnerMonthlyUsage.partnerId, partnerId),
        eq(partnerMonthlyUsage.monthKey, monthKey)
      ));
    
    if (existing) return existing;
    
    // Create new monthly usage record
    const [result] = await db.insert(partnerMonthlyUsage).values({
      partnerId,
      monthKey,
      testsUsed: 0,
      totalAmountPence: 0,
      billingStatus: 'pending',
    }).returning();
    
    return result;
  }

  async incrementMonthlyUsage(partnerId: string, pricePerTest: number): Promise<PartnerMonthlyUsage> {
    const monthKey = this.getCurrentMonthKey();
    const usage = await this.getOrCreateMonthlyUsage(partnerId, monthKey);
    
    const [updated] = await db.update(partnerMonthlyUsage)
      .set({
        testsUsed: usage.testsUsed + 1,
        totalAmountPence: usage.totalAmountPence + pricePerTest,
        updatedAt: new Date(),
      })
      .where(eq(partnerMonthlyUsage.id, usage.id))
      .returning();
    
    return updated;
  }

  async getMonthlyUsage(partnerId: string, monthKey: string): Promise<PartnerMonthlyUsage | undefined> {
    const [result] = await db.select().from(partnerMonthlyUsage)
      .where(and(
        eq(partnerMonthlyUsage.partnerId, partnerId),
        eq(partnerMonthlyUsage.monthKey, monthKey)
      ));
    return result;
  }

  async getMonthlyUsageHistory(partnerId: string, limit: number = 12): Promise<PartnerMonthlyUsage[]> {
    return await db.select().from(partnerMonthlyUsage)
      .where(eq(partnerMonthlyUsage.partnerId, partnerId))
      .orderBy(desc(partnerMonthlyUsage.monthKey))
      .limit(limit);
  }

  async updateMonthlyUsageBillingStatus(
    id: string,
    status: string,
    stripePaymentIntentId?: string,
    invoiceId?: string
  ): Promise<void> {
    await db.update(partnerMonthlyUsage)
      .set({
        billingStatus: status,
        stripePaymentIntentId,
        invoiceId,
        billedAt: status === 'billed' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(partnerMonthlyUsage.id, id));
  }

  async getPendingMonthlyUsageForBilling(monthKey: string): Promise<PartnerMonthlyUsage[]> {
    return await db.select().from(partnerMonthlyUsage)
      .where(and(
        eq(partnerMonthlyUsage.monthKey, monthKey),
        eq(partnerMonthlyUsage.billingStatus, 'pending')
      ));
  }

  getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  getPreviousMonthKey(): string {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  }

  // Update partner's current month usage counter and prepaid balance based on billing type
  async recordPartnerTestUsage(partnerId: string): Promise<{ success: boolean; error?: string }> {
    const partner = await this.getPartnerAccount(partnerId);
    if (!partner) return { success: false, error: 'Partner not found' };

    const pricePerTest = partner.pricePerAssessment || 500;

    switch (partner.billingType) {
      case 'prepaid': {
        // Deduct from prepaid balance
        if (partner.prepaidBalance <= 0) {
          return { success: false, error: 'No prepaid credits remaining' };
        }
        await db.update(partnerAccounts).set({
          prepaidBalance: partner.prepaidBalance - 1,
          updatedAt: new Date(),
        }).where(eq(partnerAccounts.id, partnerId));
        break;
      }
      case 'auto_bill':
      case 'invoice': {
        // Track usage for month-end billing
        await db.update(partnerAccounts).set({
          currentMonthUsage: (partner.currentMonthUsage || 0) + 1,
          updatedAt: new Date(),
        }).where(eq(partnerAccounts.id, partnerId));
        
        // Also increment monthly usage record
        await this.incrementMonthlyUsage(partnerId, pricePerTest);
        break;
      }
      default:
        return { success: false, error: `Unknown billing type: ${partner.billingType}` };
    }

    return { success: true };
  }

  // Add prepaid credits to partner account (after successful payment)
  async addPrepaidCredits(partnerId: string, credits: number): Promise<{ success: boolean; newBalance: number }> {
    const partner = await this.getPartnerAccount(partnerId);
    if (!partner) return { success: false, newBalance: 0 };

    const newBalance = (partner.prepaidBalance || 0) + credits;
    
    await db.update(partnerAccounts).set({
      prepaidBalance: newBalance,
      apiAccessSuspendedAt: null, // Reactivate if suspended
      updatedAt: new Date(),
    }).where(eq(partnerAccounts.id, partnerId));

    return { success: true, newBalance };
  }

  // Reset monthly usage after billing cycle (for auto_bill and invoice)
  async resetMonthlyUsage(partnerId: string): Promise<void> {
    await db.update(partnerAccounts).set({
      currentMonthUsage: 0,
      lastBilledAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(partnerAccounts.id, partnerId));
  }

  // Get partners needing month-end billing
  async getPartnersForMonthEndBilling(billingType: 'auto_bill' | 'invoice'): Promise<PartnerAccount[]> {
    return await db.select().from(partnerAccounts)
      .where(and(
        eq(partnerAccounts.billingType, billingType),
        eq(partnerAccounts.isActive, true),
        sql`${partnerAccounts.currentMonthUsage} > 0`
      ));
  }

  // Error log operations
  async createErrorLog(errorLog: InsertErrorLog): Promise<ErrorLog> {
    const [log] = await db.insert(errorLogs).values(errorLog).returning();
    return log;
  }

  async getErrorLog(id: string): Promise<ErrorLog | undefined> {
    const [log] = await db.select().from(errorLogs).where(eq(errorLogs.id, id));
    return log;
  }

  async getErrorLogs(filters?: { 
    severity?: string; 
    status?: string; 
    startDate?: Date; 
    endDate?: Date; 
    userId?: string;
    partnerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ErrorLog[]> {
    const conditions = [];
    
    if (filters?.severity) {
      conditions.push(eq(errorLogs.severity, filters.severity));
    }
    if (filters?.status) {
      conditions.push(eq(errorLogs.status, filters.status));
    }
    if (filters?.startDate) {
      conditions.push(gte(errorLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(errorLogs.createdAt, filters.endDate));
    }
    if (filters?.userId) {
      conditions.push(eq(errorLogs.userId, filters.userId));
    }
    if (filters?.partnerId) {
      conditions.push(eq(errorLogs.partnerId, filters.partnerId));
    }

    let query = db.select().from(errorLogs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    query = query.orderBy(desc(errorLogs.lastOccurredAt)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return await query;
  }

  async getErrorLogsByFingerprint(fingerprint: string): Promise<ErrorLog[]> {
    return await db.select().from(errorLogs)
      .where(eq(errorLogs.fingerprint, fingerprint))
      .orderBy(desc(errorLogs.createdAt));
  }

  async updateErrorLog(id: string, updates: Partial<InsertErrorLog>): Promise<void> {
    await db.update(errorLogs).set(updates).where(eq(errorLogs.id, id));
  }

  async incrementErrorOccurrence(fingerprint: string): Promise<ErrorLog | undefined> {
    const [existing] = await db.select().from(errorLogs)
      .where(and(
        eq(errorLogs.fingerprint, fingerprint),
        eq(errorLogs.status, 'new')
      ))
      .limit(1);
    
    if (existing) {
      const [updated] = await db.update(errorLogs)
        .set({
          occurrenceCount: existing.occurrenceCount + 1,
          lastOccurredAt: new Date(),
        })
        .where(eq(errorLogs.id, existing.id))
        .returning();
      return updated;
    }
    return undefined;
  }

  async getErrorStats(): Promise<{
    total: number;
    newCount: number;
    investigatingCount: number;
    criticalCount: number;
    last24Hours: number;
    affectedUsers: number;
    affectedPartners: number;
  }> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalResult] = await db.select({ count: count() }).from(errorLogs);
    const [newResult] = await db.select({ count: count() }).from(errorLogs).where(eq(errorLogs.status, 'new'));
    const [investigatingResult] = await db.select({ count: count() }).from(errorLogs).where(eq(errorLogs.status, 'investigating'));
    const [criticalResult] = await db.select({ count: count() }).from(errorLogs).where(eq(errorLogs.severity, 'critical'));
    const [last24Result] = await db.select({ count: count() }).from(errorLogs).where(gte(errorLogs.createdAt, yesterday));
    const [usersResult] = await db.select({ count: countDistinct(errorLogs.userId) }).from(errorLogs).where(sql`${errorLogs.userId} IS NOT NULL`);
    const [partnersResult] = await db.select({ count: countDistinct(errorLogs.partnerId) }).from(errorLogs).where(sql`${errorLogs.partnerId} IS NOT NULL`);

    return {
      total: totalResult?.count || 0,
      newCount: newResult?.count || 0,
      investigatingCount: investigatingResult?.count || 0,
      criticalCount: criticalResult?.count || 0,
      last24Hours: last24Result?.count || 0,
      affectedUsers: usersResult?.count || 0,
      affectedPartners: partnersResult?.count || 0,
    };
  }

  async resolveErrorLog(id: string, resolvedBy: string, notes?: string): Promise<void> {
    await db.update(errorLogs)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy,
        notes: notes || null,
      })
      .where(eq(errorLogs.id, id));
  }

  // Billing operations
  async getAllPurchasesWithDetails(filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    purchase: Purchase;
    user: { id: string; email: string; firstName: string | null; lastName: string | null };
    items: PurchaseItem[];
  }>> {
    const conditions = [];
    
    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(purchases.status, filters.status));
    }
    if (filters?.startDate) {
      conditions.push(gte(purchases.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(purchases.createdAt, filters.endDate));
    }

    const query = db
      .select({
        purchase: purchases,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(purchases)
      .innerJoin(users, eq(purchases.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(purchases.createdAt))
      .limit(filters?.limit || 100)
      .offset(filters?.offset || 0);

    const results = await query;
    
    // Get purchase items for all purchases
    const purchaseIds = results.map(r => r.purchase.id);
    const itemsMap = purchaseIds.length > 0 
      ? await this.getPurchaseItemsBulk(purchaseIds)
      : new Map<string, PurchaseItem[]>();

    return results.map(r => ({
      purchase: r.purchase,
      user: r.user,
      items: itemsMap.get(r.purchase.id) || [],
    }));
  }

  async getBillingStats(startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    averageOrderValue: number;
    revenueByMonth: Array<{ month: string; revenue: number; count: number }>;
  }> {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(purchases.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(purchases.createdAt, endDate));
    }

    // Get completed transactions (paid and NOT refunded)
    const completedConditions = [
      ...conditions, 
      eq(purchases.resultsAccessPaid, true),
      sql`${purchases.status} != 'refunded'`
    ];
    const [completedStats] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${purchases.totalAmount}), 0)::integer`,
        count: count(),
      })
      .from(purchases)
      .where(and(...completedConditions));

    // Get all transactions count
    const [totalStats] = await db
      .select({ count: count() })
      .from(purchases)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get pending transactions (not paid and not refunded)
    const pendingConditions = [
      ...conditions, 
      eq(purchases.resultsAccessPaid, false),
      sql`${purchases.status} != 'refunded'`
    ];
    const [pendingStats] = await db
      .select({ count: count() })
      .from(purchases)
      .where(and(...pendingConditions));

    // Get revenue by month (last 12 months, excluding refunded)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const monthlyData = await db
      .select({
        month: sql<string>`TO_CHAR(${purchases.createdAt}, 'YYYY-MM')`,
        revenue: sql<number>`COALESCE(SUM(${purchases.totalAmount}), 0)::integer`,
        count: count(),
      })
      .from(purchases)
      .where(and(
        gte(purchases.createdAt, twelveMonthsAgo),
        eq(purchases.resultsAccessPaid, true),
        sql`${purchases.status} != 'refunded'`
      ))
      .groupBy(sql`TO_CHAR(${purchases.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${purchases.createdAt}, 'YYYY-MM')`);

    const totalRevenue = completedStats?.totalRevenue || 0;
    const completedCount = completedStats?.count || 0;

    return {
      totalRevenue,
      totalTransactions: totalStats?.count || 0,
      completedTransactions: completedCount,
      pendingTransactions: pendingStats?.count || 0,
      averageOrderValue: completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0,
      revenueByMonth: monthlyData.map(m => ({
        month: m.month,
        revenue: m.revenue,
        count: m.count,
      })),
    };
  }

  async getUsersWithConsentData(filter?: string): Promise<Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    resultsRetentionConsent: boolean | null;
    resultsRetentionConsentDate: Date | null;
    createdAt: Date | null;
  }>> {
    let condition;
    if (filter === 'opted_in') {
      condition = eq(users.resultsRetentionConsent, true);
    } else if (filter === 'opted_out') {
      condition = eq(users.resultsRetentionConsent, false);
    } else if (filter === 'pending') {
      condition = sql`${users.resultsRetentionConsent} IS NULL`;
    }
    
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        resultsRetentionConsent: users.resultsRetentionConsent,
        resultsRetentionConsentDate: users.resultsRetentionConsentDate,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(condition)
      .orderBy(desc(users.resultsRetentionConsentDate));
    
    return result;
  }

  // Partner webhook operations
  async createPartnerWebhook(webhook: InsertPartnerWebhook): Promise<PartnerWebhook> {
    const [result] = await db.insert(partnerWebhooks).values(webhook).returning();
    return result;
  }

  async getPartnerWebhook(id: string): Promise<PartnerWebhook | undefined> {
    const [result] = await db.select().from(partnerWebhooks).where(eq(partnerWebhooks.id, id));
    return result;
  }

  async getPartnerWebhooks(partnerId: string): Promise<PartnerWebhook[]> {
    return await db.select().from(partnerWebhooks)
      .where(eq(partnerWebhooks.partnerId, partnerId))
      .orderBy(desc(partnerWebhooks.createdAt));
  }

  async getActiveWebhooksForEvent(partnerId: string, eventType: string): Promise<PartnerWebhook[]> {
    const webhooks = await db.select().from(partnerWebhooks)
      .where(and(
        eq(partnerWebhooks.partnerId, partnerId),
        eq(partnerWebhooks.isActive, true)
      ));
    
    // Filter by event type (stored as JSON array)
    return webhooks.filter(w => {
      const events = w.events as string[];
      return events.includes(eventType);
    });
  }

  async updatePartnerWebhook(id: string, updates: Partial<InsertPartnerWebhook>): Promise<void> {
    await db.update(partnerWebhooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(partnerWebhooks.id, id));
  }

  async deletePartnerWebhook(id: string): Promise<void> {
    await db.delete(partnerWebhooks).where(eq(partnerWebhooks.id, id));
  }

  async updateWebhookStats(id: string, success: boolean): Promise<void> {
    const webhook = await this.getPartnerWebhook(id);
    if (!webhook) return;

    const updates: any = {
      lastTriggeredAt: new Date(),
      totalDeliveries: webhook.totalDeliveries + 1,
      updatedAt: new Date(),
    };

    if (success) {
      updates.lastSuccessAt = new Date();
      updates.successfulDeliveries = webhook.successfulDeliveries + 1;
      updates.consecutiveFailures = 0;
    } else {
      updates.lastFailureAt = new Date();
      updates.consecutiveFailures = webhook.consecutiveFailures + 1;
    }

    await db.update(partnerWebhooks).set(updates).where(eq(partnerWebhooks.id, id));
  }

  // Webhook delivery log operations
  async createWebhookDeliveryLog(log: InsertWebhookDeliveryLog): Promise<WebhookDeliveryLog> {
    const [result] = await db.insert(webhookDeliveryLogs).values(log).returning();
    return result;
  }

  async getWebhookDeliveryLog(id: string): Promise<WebhookDeliveryLog | undefined> {
    const [result] = await db.select().from(webhookDeliveryLogs).where(eq(webhookDeliveryLogs.id, id));
    return result;
  }

  async getWebhookDeliveryLogs(webhookId: string, limit: number = 50): Promise<WebhookDeliveryLog[]> {
    return await db.select().from(webhookDeliveryLogs)
      .where(eq(webhookDeliveryLogs.webhookId, webhookId))
      .orderBy(desc(webhookDeliveryLogs.createdAt))
      .limit(limit);
  }

  async getPendingWebhookDeliveries(): Promise<WebhookDeliveryLog[]> {
    return await db.select().from(webhookDeliveryLogs)
      .where(and(
        eq(webhookDeliveryLogs.status, 'retrying'),
        lte(webhookDeliveryLogs.nextRetryAt, new Date())
      ))
      .orderBy(webhookDeliveryLogs.nextRetryAt);
  }

  async updateWebhookDeliveryLog(id: string, updates: Partial<InsertWebhookDeliveryLog>): Promise<void> {
    await db.update(webhookDeliveryLogs).set(updates).where(eq(webhookDeliveryLogs.id, id));
  }

  // Partner ATS integration operations
  async createPartnerAtsIntegration(integration: InsertPartnerAtsIntegration): Promise<PartnerAtsIntegration> {
    const [result] = await db.insert(partnerAtsIntegrations).values(integration).returning();
    return result;
  }

  async getPartnerAtsIntegration(id: string): Promise<PartnerAtsIntegration | undefined> {
    const [result] = await db.select().from(partnerAtsIntegrations).where(eq(partnerAtsIntegrations.id, id));
    return result;
  }

  async getPartnerAtsIntegrations(partnerId: string): Promise<PartnerAtsIntegration[]> {
    return await db.select().from(partnerAtsIntegrations)
      .where(eq(partnerAtsIntegrations.partnerId, partnerId))
      .orderBy(desc(partnerAtsIntegrations.createdAt));
  }

  async updatePartnerAtsIntegration(id: string, updates: Partial<InsertPartnerAtsIntegration>): Promise<void> {
    await db.update(partnerAtsIntegrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(partnerAtsIntegrations.id, id));
  }

  async deletePartnerAtsIntegration(id: string): Promise<void> {
    await db.delete(partnerAtsIntegrations).where(eq(partnerAtsIntegrations.id, id));
  }

  // Partner scheduled export operations
  async createPartnerScheduledExport(exportConfig: InsertPartnerScheduledExport): Promise<PartnerScheduledExport> {
    const [result] = await db.insert(partnerScheduledExports).values(exportConfig).returning();
    return result;
  }

  async getPartnerScheduledExport(id: string): Promise<PartnerScheduledExport | undefined> {
    const [result] = await db.select().from(partnerScheduledExports).where(eq(partnerScheduledExports.id, id));
    return result;
  }

  async getPartnerScheduledExports(partnerId: string): Promise<PartnerScheduledExport[]> {
    return await db.select().from(partnerScheduledExports)
      .where(eq(partnerScheduledExports.partnerId, partnerId))
      .orderBy(desc(partnerScheduledExports.createdAt));
  }

  async getDueScheduledExports(): Promise<PartnerScheduledExport[]> {
    return await db.select().from(partnerScheduledExports)
      .where(and(
        eq(partnerScheduledExports.isActive, true),
        lte(partnerScheduledExports.nextRunAt, new Date())
      ))
      .orderBy(partnerScheduledExports.nextRunAt);
  }

  async updatePartnerScheduledExport(id: string, updates: Partial<InsertPartnerScheduledExport>): Promise<void> {
    await db.update(partnerScheduledExports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(partnerScheduledExports.id, id));
  }

  async deletePartnerScheduledExport(id: string): Promise<void> {
    await db.delete(partnerScheduledExports).where(eq(partnerScheduledExports.id, id));
  }

  // Partner notification operations
  async createPartnerNotification(notification: InsertPartnerNotification): Promise<PartnerNotification> {
    const [result] = await db.insert(partnerNotifications).values(notification).returning();
    return result;
  }

  async getPartnerNotifications(partnerId: string, limit = 50, unreadOnly = false): Promise<PartnerNotification[]> {
    const conditions = [eq(partnerNotifications.partnerId, partnerId)];
    if (unreadOnly) {
      conditions.push(eq(partnerNotifications.isRead, false));
    }
    return await db.select().from(partnerNotifications)
      .where(and(...conditions))
      .orderBy(desc(partnerNotifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(partnerId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(partnerNotifications)
      .where(and(
        eq(partnerNotifications.partnerId, partnerId),
        eq(partnerNotifications.isRead, false)
      ));
    return Number(result[0]?.count || 0);
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(partnerNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(partnerNotifications.id, id));
  }

  async markAllNotificationsRead(partnerId: string): Promise<void> {
    await db.update(partnerNotifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(partnerNotifications.partnerId, partnerId),
        eq(partnerNotifications.isRead, false)
      ));
  }

  async deletePartnerNotification(id: string): Promise<void> {
    await db.delete(partnerNotifications).where(eq(partnerNotifications.id, id));
  }

  // Partner team member operations
  async createPartnerTeamMember(member: InsertPartnerTeamMember): Promise<PartnerTeamMember> {
    const [result] = await db.insert(partnerTeamMembers).values(member).returning();
    return result;
  }

  async getPartnerTeamMember(id: string): Promise<PartnerTeamMember | undefined> {
    const [result] = await db.select().from(partnerTeamMembers).where(eq(partnerTeamMembers.id, id));
    return result;
  }

  async getPartnerTeamMemberByToken(token: string): Promise<PartnerTeamMember | undefined> {
    const [result] = await db.select().from(partnerTeamMembers).where(eq(partnerTeamMembers.inviteToken, token));
    return result;
  }

  async getPartnerTeamMemberByEmail(partnerId: string, email: string): Promise<PartnerTeamMember | undefined> {
    const [result] = await db.select().from(partnerTeamMembers)
      .where(and(
        eq(partnerTeamMembers.partnerId, partnerId),
        eq(partnerTeamMembers.email, email.toLowerCase())
      ));
    return result;
  }

  async getPartnerTeamMembers(partnerId: string): Promise<PartnerTeamMember[]> {
    return await db.select().from(partnerTeamMembers)
      .where(eq(partnerTeamMembers.partnerId, partnerId))
      .orderBy(desc(partnerTeamMembers.createdAt));
  }

  async updatePartnerTeamMember(id: string, updates: Partial<InsertPartnerTeamMember>): Promise<void> {
    await db.update(partnerTeamMembers).set(updates).where(eq(partnerTeamMembers.id, id));
  }

  async deletePartnerTeamMember(id: string): Promise<void> {
    await db.delete(partnerTeamMembers).where(eq(partnerTeamMembers.id, id));
  }

  // Partner analytics operations
  async getPartnerAnalytics(partnerId: string, period: 'daily' | 'weekly' | 'monthly', days = 30): Promise<{
    testsOverTime: Array<{ date: string; count: number }>;
    byAssessmentType: Array<{ type: string; count: number; avgScore: number | null }>;
    byOrganization: Array<{ orgId: string; orgName: string; count: number }>;
    scoreDistribution: Array<{ type: string; buckets: Array<{ range: string; count: number }> }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Determine the date truncation based on period
    const dateTrunc = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';

    // Tests over time
    const testsOverTimeResult = await db.select({
      date: sql<string>`date_trunc(${dateTrunc}, ${assessmentSessions.completedAt})::date`,
      count: sql<number>`count(*)`,
    })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.partnerId, partnerId),
        eq(assessmentSessions.status, 'completed'),
        gte(assessmentSessions.completedAt, startDate)
      ))
      .groupBy(sql`date_trunc(${dateTrunc}, ${assessmentSessions.completedAt})`)
      .orderBy(sql`date_trunc(${dateTrunc}, ${assessmentSessions.completedAt})`);

    // Breakdown by assessment type
    const byTypeResult = await db.select({
      type: assessmentSessions.assessmentType,
      count: sql<number>`count(*)`,
      avgScore: sql<number>`avg(${assessmentSessions.totalScore})`,
    })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.partnerId, partnerId),
        eq(assessmentSessions.status, 'completed'),
        gte(assessmentSessions.completedAt, startDate)
      ))
      .groupBy(assessmentSessions.assessmentType)
      .orderBy(sql`count(*) desc`);

    // Breakdown by organization
    const byOrgResult = await db.select({
      orgId: partnerOrganisations.id,
      orgName: partnerOrganisations.name,
      count: sql<number>`count(${assessmentSessions.id})`,
    })
      .from(assessmentSessions)
      .leftJoin(partnerOrganisations, eq(assessmentSessions.partnerOrganisationId, partnerOrganisations.id))
      .where(and(
        eq(assessmentSessions.partnerId, partnerId),
        eq(assessmentSessions.status, 'completed'),
        gte(assessmentSessions.completedAt, startDate)
      ))
      .groupBy(partnerOrganisations.id, partnerOrganisations.name)
      .orderBy(sql`count(${assessmentSessions.id}) desc`);

    // Score distribution by assessment type (buckets: 0-20, 21-40, 41-60, 61-80, 81-100)
    const scoreDistributionResult = await db.select({
      type: assessmentSessions.assessmentType,
      score: assessmentSessions.totalScore,
    })
      .from(assessmentSessions)
      .where(and(
        eq(assessmentSessions.partnerId, partnerId),
        eq(assessmentSessions.status, 'completed'),
        gte(assessmentSessions.completedAt, startDate),
        sql`${assessmentSessions.totalScore} IS NOT NULL`
      ));

    // Group scores into buckets by type
    const scoresByType: Record<string, number[]> = {};
    for (const row of scoreDistributionResult) {
      if (!scoresByType[row.type]) {
        scoresByType[row.type] = [];
      }
      if (row.score !== null) {
        scoresByType[row.type].push(row.score);
      }
    }

    const bucketRanges = ['0-20', '21-40', '41-60', '61-80', '81-100'];
    const scoreDistribution: Array<{ type: string; buckets: Array<{ range: string; count: number }> }> = [];
    
    for (const type of Object.keys(scoresByType)) {
      const scores = scoresByType[type];
      const buckets = bucketRanges.map(range => {
        const [min, max] = range.split('-').map(Number);
        const count = scores.filter((s: number) => s >= min && s <= max).length;
        return { range, count };
      });
      scoreDistribution.push({ type, buckets });
    }

    return {
      testsOverTime: testsOverTimeResult.map(r => ({
        date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
        count: Number(r.count),
      })),
      byAssessmentType: byTypeResult.map(r => ({
        type: r.type,
        count: Number(r.count),
        avgScore: r.avgScore ? Math.round(Number(r.avgScore)) : null,
      })),
      byOrganization: byOrgResult.map(r => ({
        orgId: r.orgId || 'unassigned',
        orgName: r.orgName || 'Unassigned',
        count: Number(r.count),
      })),
      scoreDistribution,
    };
  }

  // Billing change request operations
  async createBillingChangeRequest(request: InsertBillingChangeRequest): Promise<BillingChangeRequest> {
    const [result] = await db.insert(billingChangeRequests).values(request).returning();
    return result;
  }

  async getBillingChangeRequest(id: string): Promise<BillingChangeRequest | undefined> {
    const [result] = await db.select().from(billingChangeRequests).where(eq(billingChangeRequests.id, id));
    return result;
  }

  async getBillingChangeRequestsByPartner(partnerId: string): Promise<BillingChangeRequest[]> {
    return await db.select().from(billingChangeRequests)
      .where(eq(billingChangeRequests.partnerId, partnerId))
      .orderBy(desc(billingChangeRequests.createdAt));
  }

  async getPendingBillingChangeRequest(partnerId: string): Promise<BillingChangeRequest | undefined> {
    const [result] = await db.select().from(billingChangeRequests)
      .where(and(
        eq(billingChangeRequests.partnerId, partnerId),
        eq(billingChangeRequests.status, 'pending')
      ));
    return result;
  }

  async getAllPendingBillingChangeRequests(): Promise<Array<BillingChangeRequest & { partnerName: string; requestedByName: string; requestedByEmail: string }>> {
    const results = await db.select({
      id: billingChangeRequests.id,
      partnerId: billingChangeRequests.partnerId,
      requestedByUserId: billingChangeRequests.requestedByUserId,
      currentBillingType: billingChangeRequests.currentBillingType,
      requestedBillingType: billingChangeRequests.requestedBillingType,
      reason: billingChangeRequests.reason,
      status: billingChangeRequests.status,
      reviewedByUserId: billingChangeRequests.reviewedByUserId,
      reviewNotes: billingChangeRequests.reviewNotes,
      createdAt: billingChangeRequests.createdAt,
      reviewedAt: billingChangeRequests.reviewedAt,
      partnerName: partnerAccounts.companyName,
      requestedByName: users.fullName,
      requestedByEmail: users.email,
    })
      .from(billingChangeRequests)
      .leftJoin(partnerAccounts, eq(billingChangeRequests.partnerId, partnerAccounts.id))
      .leftJoin(users, eq(billingChangeRequests.requestedByUserId, users.id))
      .where(eq(billingChangeRequests.status, 'pending'))
      .orderBy(desc(billingChangeRequests.createdAt));
    
    return results.map(r => ({
      ...r,
      partnerName: r.partnerName || 'Unknown Partner',
      requestedByName: r.requestedByName || 'Unknown User',
      requestedByEmail: r.requestedByEmail || 'unknown@example.com',
    }));
  }

  async updateBillingChangeRequest(id: string, updates: { status: string; reviewedByUserId?: string; reviewNotes?: string; reviewedAt?: Date }): Promise<void> {
    await db.update(billingChangeRequests)
      .set(updates)
      .where(eq(billingChangeRequests.id, id));
  }
}

export const storage = new DatabaseStorage();
