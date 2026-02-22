import { Express, Request, Response } from "express";
import { isAuthenticated } from "./auth";
import { generatedLeads, salesFunnelContacts, LEAD_STATUS_ORDER } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

const VALID_STATUSES = new Set(LEAD_STATUS_ORDER);

function isSuperAdmin(req: Request): boolean {
  return (req as any).user?.role === "super_admin";
}

export function registerLeadsGenerationRoutes(app: Express) {
  app.get("/api/admin/leads", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const leads = await db.select().from(generatedLeads).orderBy(desc(generatedLeads.createdAt));
      res.json(leads);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/leads", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { name, company, domain, email, phone, linkedinUrl, status, notes, sourceQueries } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      const resolvedStatus = status || "new";
      if (!VALID_STATUSES.has(resolvedStatus as any)) return res.status(400).json({ error: "Invalid status" });
      const [lead] = await db.insert(generatedLeads).values({
        name,
        company: company || null,
        domain: domain || null,
        email: email || null,
        phone: phone || null,
        linkedinUrl: linkedinUrl || null,
        status: resolvedStatus,
        notes: notes || null,
        sourceQueries: sourceQueries || null,
      }).returning();
      res.json(lead);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { id } = req.params;
      const updates: Record<string, any> = { updatedAt: new Date() };
      const allowed = ["name", "company", "domain", "email", "phone", "linkedinUrl", "status", "notes", "sourceQueries"];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (updates.status && !VALID_STATUSES.has(updates.status as any)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const [updated] = await db.update(generatedLeads).set(updates).where(eq(generatedLeads.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Lead not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/leads/:id", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { id } = req.params;
      const [deleted] = await db.delete(generatedLeads).where(eq(generatedLeads.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Lead not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/leads/:id/push-to-funnel", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { id } = req.params;
      const [lead] = await db.select().from(generatedLeads).where(eq(generatedLeads.id, id));
      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const [contact] = await db.insert(salesFunnelContacts).values({
        name: lead.name,
        email: lead.email || null,
        company: lead.company || null,
        phone: lead.phone || null,
        stage: "lead",
        notes: lead.notes || null,
      }).returning();

      await db.update(generatedLeads).set({ status: "converted", updatedAt: new Date() }).where(eq(generatedLeads.id, id));

      res.json({ success: true, contact });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
