import {
  users,
  purchases,
  purchaseItems,
  assessmentResults,
  invitations,
  promptArchitectureEvaluations,
  aiqRationales,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Purchase operations
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  getPurchaseByStripeSession(sessionId: string): Promise<Purchase | undefined>;
  getPurchasesByUser(userId: string): Promise<Purchase[]>;
  updatePurchaseStatus(id: string, status: string, completedAt?: Date): Promise<void>;
  updatePurchaseStripeSession(id: string, stripeSessionId: string): Promise<void>;
  
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
