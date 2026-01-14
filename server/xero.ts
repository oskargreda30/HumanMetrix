import { XeroClient } from "xero-node";
import { db } from "./db";
import { xeroIntegration, expenses, revenueSyncLogs, purchases, partnerInvoices, users } from "@shared/schema";
import { eq, desc, and, gte, lte, isNull } from "drizzle-orm";
import type { Expense, XeroIntegration, RevenueSyncLog, InsertExpense, InsertRevenueSyncLog } from "@shared/schema";

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_REDIRECT_URI = process.env.XERO_REDIRECT_URI || `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.replit.app` : 'http://localhost:5000'}/api/admin/xero/callback`;

const XERO_SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.transactions",
  "accounting.contacts",
  "accounting.settings",
  "offline_access",
];

let xeroClient: XeroClient | null = null;

export function getXeroClient(): XeroClient | null {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET) {
    console.log("[Xero] Missing XERO_CLIENT_ID or XERO_CLIENT_SECRET");
    return null;
  }
  
  if (!xeroClient) {
    xeroClient = new XeroClient({
      clientId: XERO_CLIENT_ID,
      clientSecret: XERO_CLIENT_SECRET,
      redirectUris: [XERO_REDIRECT_URI],
      scopes: XERO_SCOPES,
    });
  }
  
  return xeroClient;
}

export async function getXeroAuthUrl(): Promise<string | null> {
  const client = getXeroClient();
  if (!client) return null;
  
  try {
    const consentUrl = await client.buildConsentUrl();
    return consentUrl;
  } catch (error) {
    console.error("[Xero] Failed to build consent URL:", error);
    return null;
  }
}

export async function handleXeroCallback(url: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const client = getXeroClient();
  if (!client) return { success: false, error: "Xero client not configured" };
  
  try {
    const tokenSet = await client.apiCallback(url);
    
    const tenants = await client.updateTenants();
    const tenant = tenants[0];
    
    if (!tenant) {
      return { success: false, error: "No Xero organization found" };
    }
    
    const existingIntegration = await db.select().from(xeroIntegration).limit(1);
    
    const integrationData = {
      accessToken: tokenSet.access_token || null,
      refreshToken: tokenSet.refresh_token || null,
      idToken: tokenSet.id_token || null,
      tokenExpiresAt: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : null,
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName || null,
      connectedAt: new Date(),
      connectedBy: userId,
      isActive: true,
      updatedAt: new Date(),
    };
    
    if (existingIntegration.length > 0) {
      await db.update(xeroIntegration)
        .set(integrationData)
        .where(eq(xeroIntegration.id, existingIntegration[0].id));
    } else {
      await db.insert(xeroIntegration).values(integrationData);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("[Xero] OAuth callback error:", error);
    return { success: false, error: error.message || "Failed to connect to Xero" };
  }
}

export async function refreshXeroToken(): Promise<boolean> {
  const client = getXeroClient();
  if (!client) return false;
  
  try {
    const [integration] = await db.select().from(xeroIntegration).where(eq(xeroIntegration.isActive, true)).limit(1);
    
    if (!integration || !integration.refreshToken) {
      return false;
    }
    
    await client.setTokenSet({
      access_token: integration.accessToken || undefined,
      refresh_token: integration.refreshToken,
      id_token: integration.idToken || undefined,
      token_type: "Bearer",
    });
    
    const newTokenSet = await client.refreshToken();
    
    await db.update(xeroIntegration)
      .set({
        accessToken: newTokenSet.access_token || null,
        refreshToken: newTokenSet.refresh_token || null,
        idToken: newTokenSet.id_token || null,
        tokenExpiresAt: newTokenSet.expires_at ? new Date(newTokenSet.expires_at * 1000) : null,
        updatedAt: new Date(),
      })
      .where(eq(xeroIntegration.id, integration.id));
    
    return true;
  } catch (error) {
    console.error("[Xero] Token refresh error:", error);
    return false;
  }
}

export async function getXeroStatus(): Promise<{
  isConnected: boolean;
  tenantName?: string;
  connectedAt?: Date;
  lastSyncAt?: Date;
  isConfigured: boolean;
}> {
  const isConfigured = !!(XERO_CLIENT_ID && XERO_CLIENT_SECRET);
  
  try {
    const [integration] = await db.select().from(xeroIntegration).where(eq(xeroIntegration.isActive, true)).limit(1);
    
    if (!integration) {
      return { isConnected: false, isConfigured };
    }
    
    return {
      isConnected: true,
      tenantName: integration.tenantName || undefined,
      connectedAt: integration.connectedAt || undefined,
      lastSyncAt: integration.lastSyncAt || undefined,
      isConfigured,
    };
  } catch (error) {
    return { isConnected: false, isConfigured };
  }
}

export async function disconnectXero(): Promise<boolean> {
  try {
    await db.update(xeroIntegration)
      .set({
        isActive: false,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        updatedAt: new Date(),
      })
      .where(eq(xeroIntegration.isActive, true));
    
    return true;
  } catch (error) {
    console.error("[Xero] Disconnect error:", error);
    return false;
  }
}

async function ensureXeroAuth(): Promise<{ client: XeroClient; tenantId: string } | null> {
  const client = getXeroClient();
  if (!client) return null;
  
  try {
    const [integration] = await db.select().from(xeroIntegration).where(eq(xeroIntegration.isActive, true)).limit(1);
    
    if (!integration || !integration.accessToken || !integration.tenantId) {
      return null;
    }
    
    await client.setTokenSet({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken || undefined,
      id_token: integration.idToken || undefined,
      token_type: "Bearer",
    });
    
    if (integration.tokenExpiresAt && new Date(integration.tokenExpiresAt) < new Date()) {
      const refreshed = await refreshXeroToken();
      if (!refreshed) return null;
      
      const [updatedIntegration] = await db.select().from(xeroIntegration).where(eq(xeroIntegration.isActive, true)).limit(1);
      if (!updatedIntegration?.accessToken) return null;
      
      await client.setTokenSet({
        access_token: updatedIntegration.accessToken,
        refresh_token: updatedIntegration.refreshToken || undefined,
        id_token: updatedIntegration.idToken || undefined,
        token_type: "Bearer",
      });
    }
    
    return { client, tenantId: integration.tenantId };
  } catch (error) {
    console.error("[Xero] Auth check error:", error);
    return null;
  }
}

export async function syncExpenseToXero(expenseId: string): Promise<{ success: boolean; xeroInvoiceId?: string; error?: string }> {
  const auth = await ensureXeroAuth();
  if (!auth) {
    return { success: false, error: "Xero not connected" };
  }
  
  try {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
    
    if (!expense) {
      return { success: false, error: "Expense not found" };
    }
    
    const { client, tenantId } = auth;
    
    let contactId: string | undefined;
    
    if (expense.vendor) {
      const contactsResponse = await client.accountingApi.getContacts(
        tenantId,
        undefined,
        `Name=="${expense.vendor}"`
      );
      
      if (contactsResponse.body.contacts && contactsResponse.body.contacts.length > 0) {
        contactId = contactsResponse.body.contacts[0].contactID;
      } else {
        const newContactResponse = await client.accountingApi.createContacts(tenantId, {
          contacts: [{
            name: expense.vendor,
            isSupplier: true,
          }],
        });
        contactId = newContactResponse.body.contacts?.[0]?.contactID;
      }
    }
    
    const invoiceResponse = await client.accountingApi.createInvoices(tenantId, {
      invoices: [{
        type: "ACCPAY",
        contact: contactId ? { contactID: contactId } : { name: expense.vendor || "Unknown Vendor" },
        lineItems: [{
          description: expense.description,
          quantity: 1,
          unitAmount: expense.amount / 100,
          accountCode: "400",
        }],
        date: expense.invoiceDate ? expense.invoiceDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: expense.dueDate ? expense.dueDate.toISOString().split('T')[0] : undefined,
        reference: expense.invoiceNumber || undefined,
        currencyCode: expense.currency,
        status: expense.status === "paid" ? "AUTHORISED" : "DRAFT",
      }],
    });
    
    const xeroInvoiceId = invoiceResponse.body.invoices?.[0]?.invoiceID;
    
    if (xeroInvoiceId) {
      await db.update(expenses)
        .set({
          xeroInvoiceId,
          xeroSyncStatus: "synced",
          xeroSyncError: null,
          xeroSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, expenseId));
      
      return { success: true, xeroInvoiceId };
    } else {
      throw new Error("No invoice ID returned from Xero");
    }
  } catch (error: any) {
    console.error("[Xero] Sync expense error:", error);
    
    await db.update(expenses)
      .set({
        xeroSyncStatus: "error",
        xeroSyncError: error.message || "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, expenseId));
    
    return { success: false, error: error.message || "Failed to sync to Xero" };
  }
}

export async function syncRevenueToXero(purchaseId?: string, partnerInvoiceId?: string): Promise<{ success: boolean; xeroInvoiceId?: string; error?: string }> {
  const auth = await ensureXeroAuth();
  if (!auth) {
    return { success: false, error: "Xero not connected" };
  }
  
  try {
    const { client, tenantId } = auth;
    
    let amount: number;
    let currency: string;
    let description: string;
    let customerName: string;
    let customerEmail: string;
    let sourceType: string;
    
    if (purchaseId) {
      const [purchase] = await db.select({
        purchase: purchases,
        user: users,
      })
      .from(purchases)
      .leftJoin(users, eq(purchases.userId, users.id))
      .where(eq(purchases.id, purchaseId));
      
      if (!purchase) {
        return { success: false, error: "Purchase not found" };
      }
      
      amount = purchase.purchase.totalAmount;
      currency = purchase.purchase.currency;
      description = `HumanMetrix Assessment - Order ${purchaseId.substring(0, 8)}`;
      customerName = [purchase.user?.firstName, purchase.user?.lastName].filter(Boolean).join(' ') || 'Unknown';
      customerEmail = purchase.user?.email || '';
      sourceType = 'b2c_purchase';
    } else if (partnerInvoiceId) {
      const [invoice] = await db.select().from(partnerInvoices).where(eq(partnerInvoices.id, partnerInvoiceId));
      
      if (!invoice) {
        return { success: false, error: "Partner invoice not found" };
      }
      
      amount = invoice.totalAmount;
      currency = invoice.currency;
      description = `HumanMetrix B2B - Invoice ${invoice.invoiceNumber || partnerInvoiceId.substring(0, 8)}`;
      customerName = 'B2B Partner';
      customerEmail = '';
      sourceType = 'b2b_partner';
    } else {
      return { success: false, error: "No purchase or invoice ID provided" };
    }
    
    let contactId: string | undefined;
    
    if (customerEmail) {
      const contactsResponse = await client.accountingApi.getContacts(
        tenantId,
        undefined,
        `EmailAddress=="${customerEmail}"`
      );
      
      if (contactsResponse.body.contacts && contactsResponse.body.contacts.length > 0) {
        contactId = contactsResponse.body.contacts[0].contactID;
      }
    }
    
    if (!contactId) {
      const newContactResponse = await client.accountingApi.createContacts(tenantId, {
        contacts: [{
          name: customerName,
          emailAddress: customerEmail || undefined,
          isCustomer: true,
        }],
      });
      contactId = newContactResponse.body.contacts?.[0]?.contactID;
    }
    
    const invoiceResponse = await client.accountingApi.createInvoices(tenantId, {
      invoices: [{
        type: "ACCREC",
        contact: { contactID: contactId },
        lineItems: [{
          description,
          quantity: 1,
          unitAmount: amount / 100,
          accountCode: "200",
        }],
        date: new Date().toISOString().split('T')[0],
        currencyCode: currency,
        status: "AUTHORISED",
      }],
    });
    
    const xeroInvoiceId = invoiceResponse.body.invoices?.[0]?.invoiceID;
    
    if (xeroInvoiceId) {
      await db.insert(revenueSyncLogs).values({
        purchaseId: purchaseId || null,
        partnerInvoiceId: partnerInvoiceId || null,
        sourceType,
        amount,
        currency,
        description,
        customerName,
        customerEmail,
        xeroInvoiceId,
        xeroContactId: contactId,
        syncStatus: "synced",
        syncedAt: new Date(),
      });
      
      await db.update(xeroIntegration)
        .set({ lastSyncAt: new Date() })
        .where(eq(xeroIntegration.isActive, true));
      
      return { success: true, xeroInvoiceId };
    } else {
      throw new Error("No invoice ID returned from Xero");
    }
  } catch (error: any) {
    console.error("[Xero] Sync revenue error:", error);
    
    await db.insert(revenueSyncLogs).values({
      purchaseId: purchaseId || null,
      partnerInvoiceId: partnerInvoiceId || null,
      sourceType: purchaseId ? 'b2c_purchase' : 'b2b_partner',
      amount: 0,
      currency: 'GBP',
      syncStatus: "error",
      syncError: error.message || "Unknown error",
    });
    
    return { success: false, error: error.message || "Failed to sync to Xero" };
  }
}

export async function getUnsyncedRevenue(): Promise<Array<{
  id: string;
  type: 'b2c' | 'b2b';
  amount: number;
  currency: string;
  customerName: string;
  date: Date;
}>> {
  try {
    const syncedPurchaseIds = await db.select({ purchaseId: revenueSyncLogs.purchaseId })
      .from(revenueSyncLogs)
      .where(and(
        eq(revenueSyncLogs.syncStatus, "synced"),
        revenueSyncLogs.purchaseId ? true : false
      ));
    
    const syncedIds = new Set(syncedPurchaseIds.map(r => r.purchaseId).filter(Boolean));
    
    const completedPurchases = await db.select({
      purchase: purchases,
      user: users,
    })
    .from(purchases)
    .leftJoin(users, eq(purchases.userId, users.id))
    .where(eq(purchases.status, "completed"))
    .orderBy(desc(purchases.createdAt))
    .limit(100);
    
    return completedPurchases
      .filter(p => !syncedIds.has(p.purchase.id))
      .map(p => ({
        id: p.purchase.id,
        type: 'b2c' as const,
        amount: p.purchase.totalAmount,
        currency: p.purchase.currency,
        customerName: [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ') || 'Unknown',
        date: p.purchase.createdAt,
      }));
  } catch (error) {
    console.error("[Xero] Get unsynced revenue error:", error);
    return [];
  }
}

export async function createExpense(data: InsertExpense): Promise<Expense> {
  const [result] = await db.insert(expenses).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return result;
}

export async function getExpenses(options?: {
  category?: string;
  status?: string;
  syncStatus?: string;
  limit?: number;
  offset?: number;
}): Promise<Expense[]> {
  let query = db.select().from(expenses);
  
  const conditions = [];
  if (options?.category) conditions.push(eq(expenses.category, options.category));
  if (options?.status) conditions.push(eq(expenses.status, options.status));
  if (options?.syncStatus) conditions.push(eq(expenses.xeroSyncStatus, options.syncStatus));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query
    .orderBy(desc(expenses.createdAt))
    .limit(options?.limit || 100)
    .offset(options?.offset || 0);
}

export async function getExpense(id: string): Promise<Expense | undefined> {
  const [result] = await db.select().from(expenses).where(eq(expenses.id, id));
  return result;
}

export async function updateExpense(id: string, data: Partial<InsertExpense>): Promise<Expense | undefined> {
  const [result] = await db.update(expenses)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(expenses.id, id))
    .returning();
  return result;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const result = await db.delete(expenses).where(eq(expenses.id, id));
  return true;
}

export async function getRevenueSyncLogs(options?: {
  status?: string;
  limit?: number;
}): Promise<RevenueSyncLog[]> {
  let query = db.select().from(revenueSyncLogs);
  
  if (options?.status) {
    query = query.where(eq(revenueSyncLogs.syncStatus, options.status)) as any;
  }
  
  return query
    .orderBy(desc(revenueSyncLogs.createdAt))
    .limit(options?.limit || 100);
}

export async function getExpenseStats(): Promise<{
  totalExpenses: number;
  totalAmount: number;
  syncedCount: number;
  pendingCount: number;
  byCategory: Record<string, { count: number; amount: number }>;
}> {
  const allExpenses = await db.select().from(expenses);
  
  const stats = {
    totalExpenses: allExpenses.length,
    totalAmount: allExpenses.reduce((sum, e) => sum + e.amount, 0),
    syncedCount: allExpenses.filter(e => e.xeroSyncStatus === 'synced').length,
    pendingCount: allExpenses.filter(e => e.xeroSyncStatus === 'not_synced').length,
    byCategory: {} as Record<string, { count: number; amount: number }>,
  };
  
  allExpenses.forEach(e => {
    if (!stats.byCategory[e.category]) {
      stats.byCategory[e.category] = { count: 0, amount: 0 };
    }
    stats.byCategory[e.category].count++;
    stats.byCategory[e.category].amount += e.amount;
  });
  
  return stats;
}

export async function getRevenueStats(): Promise<{
  totalRevenue: number;
  syncedRevenue: number;
  unsyncedCount: number;
  syncedCount: number;
}> {
  const logs = await db.select().from(revenueSyncLogs);
  const syncedLogs = logs.filter(l => l.syncStatus === 'synced');
  
  const unsynced = await getUnsyncedRevenue();
  
  return {
    totalRevenue: syncedLogs.reduce((sum, l) => sum + l.amount, 0) + unsynced.reduce((sum, u) => sum + u.amount, 0),
    syncedRevenue: syncedLogs.reduce((sum, l) => sum + l.amount, 0),
    unsyncedCount: unsynced.length,
    syncedCount: syncedLogs.length,
  };
}
