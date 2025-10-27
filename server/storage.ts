import {
  users,
  purchasedAssessments,
  assessmentResults,
  invitations,
  promptArchitectureEvaluations,
  aiqRationales,
  type User,
  type UpsertUser,
  type PurchasedAssessment,
  type InsertPurchasedAssessment,
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
import { eq, and, or } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Purchase operations
  createPurchase(purchase: InsertPurchasedAssessment): Promise<PurchasedAssessment>;
  getPurchase(id: string): Promise<PurchasedAssessment | undefined>;
  getPurchasesByUser(userId: string): Promise<PurchasedAssessment[]>;
  updatePurchaseStatus(id: string, status: string): Promise<void>;
  
  // Assessment result operations
  createAssessmentResult(result: InsertAssessmentResult): Promise<AssessmentResult>;
  getAssessmentResult(id: string): Promise<AssessmentResult | undefined>;
  getResultsByUser(userId: string): Promise<AssessmentResult[]>;
  getResultsByPurchase(purchaseId: string): Promise<AssessmentResult[]>;
  
  // Invitation operations
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitation(id: string): Promise<Invitation | undefined>;
  getInvitationsBySender(senderId: string): Promise<Invitation[]>;
  updateInvitationStatus(id: string, status: string, completedAt?: Date): Promise<void>;
  
  // Prompt architecture evaluation operations
  createPromptEvaluation(evaluation: InsertPromptArchitectureEvaluation): Promise<PromptArchitectureEvaluation>;
  getEvaluationsByResult(resultId: string): Promise<PromptArchitectureEvaluation[]>;
  
  // AIQ rationale operations
  createAiqRationale(rationale: InsertAiqRationale): Promise<AiqRationale>;
  getRationalesByResult(resultId: string): Promise<AiqRationale[]>;
  
  // Admin operations
  getAllResults(): Promise<AssessmentResult[]>;
  getAllInvitations(): Promise<Invitation[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
  async createPurchase(purchase: InsertPurchasedAssessment): Promise<PurchasedAssessment> {
    const [result] = await db
      .insert(purchasedAssessments)
      .values(purchase)
      .returning();
    return result;
  }

  async getPurchase(id: string): Promise<PurchasedAssessment | undefined> {
    const [purchase] = await db
      .select()
      .from(purchasedAssessments)
      .where(eq(purchasedAssessments.id, id));
    return purchase;
  }

  async getPurchasesByUser(userId: string): Promise<PurchasedAssessment[]> {
    return await db
      .select()
      .from(purchasedAssessments)
      .where(eq(purchasedAssessments.userId, userId));
  }

  async updatePurchaseStatus(id: string, status: string): Promise<void> {
    await db
      .update(purchasedAssessments)
      .set({ status })
      .where(eq(purchasedAssessments.id, id));
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
      .where(eq(assessmentResults.userId, userId));
  }

  async getResultsByPurchase(purchaseId: string): Promise<AssessmentResult[]> {
    return await db
      .select()
      .from(assessmentResults)
      .where(eq(assessmentResults.purchaseId, purchaseId));
  }

  // Invitation operations
  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [created] = await db
      .insert(invitations)
      .values(invitation)
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

  async getInvitationsBySender(senderId: string): Promise<Invitation[]> {
    return await db
      .select()
      .from(invitations)
      .where(eq(invitations.sentBy, senderId));
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
    return await db.select().from(assessmentResults);
  }

  async getAllInvitations(): Promise<Invitation[]> {
    return await db.select().from(invitations);
  }
}

export const storage = new DatabaseStorage();
