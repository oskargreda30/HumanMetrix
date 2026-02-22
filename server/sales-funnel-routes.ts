import { Express, Request, Response } from "express";
import { isAuthenticated } from "./auth";
import { salesFunnelContacts, SALES_FUNNEL_STAGE_ORDER } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc } from "drizzle-orm";

const VALID_STAGES = new Set(SALES_FUNNEL_STAGE_ORDER);

function isSuperAdmin(req: Request): boolean {
  return (req as any).user?.role === "super_admin";
}

function isValidStage(stage: string): boolean {
  return VALID_STAGES.has(stage as any);
}

export function registerSalesFunnelRoutes(app: Express) {
  app.get("/api/admin/sales-funnel", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const contacts = await db.select().from(salesFunnelContacts).orderBy(asc(salesFunnelContacts.sortOrder), desc(salesFunnelContacts.createdAt));
      res.json(contacts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/sales-funnel", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { name, email, company, phone, stage, notes } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });
      const resolvedStage = stage || "lead";
      if (!isValidStage(resolvedStage)) return res.status(400).json({ error: "Invalid stage" });
      const [contact] = await db.insert(salesFunnelContacts).values({
        name,
        email: email || null,
        company: company || null,
        phone: phone || null,
        stage: resolvedStage,
        notes: notes || null,
        sortOrder: 0,
      }).returning();
      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/sales-funnel/:id", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { id } = req.params;
      if (req.body.stage !== undefined && !isValidStage(req.body.stage)) {
        return res.status(400).json({ error: "Invalid stage" });
      }
      const updates: any = { updatedAt: new Date() };
      if (req.body.stage !== undefined) updates.stage = req.body.stage;
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.company !== undefined) updates.company = req.body.company;
      if (req.body.phone !== undefined) updates.phone = req.body.phone;
      if (req.body.notes !== undefined) updates.notes = req.body.notes;
      if (req.body.sortOrder !== undefined) updates.sortOrder = req.body.sortOrder;
      const [updated] = await db.update(salesFunnelContacts).set(updates).where(eq(salesFunnelContacts.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Contact not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/sales-funnel/:id", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { id } = req.params;
      const [deleted] = await db.delete(salesFunnelContacts).where(eq(salesFunnelContacts.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Contact not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/sales-funnel/bulk-update-order", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates)) return res.status(400).json({ error: "updates must be an array" });
      for (const item of updates) {
        if (item.stage && !isValidStage(item.stage)) continue;
        await db.update(salesFunnelContacts)
          .set({ stage: item.stage, sortOrder: item.sortOrder, updatedAt: new Date() })
          .where(eq(salesFunnelContacts.id, item.id));
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/apollo/search", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const apiKey = process.env.APOLLO_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ message: "Apollo API key not configured. Add APOLLO_API_KEY to your secrets." });
      }

      const {
        person_titles = [],
        person_locations = [],
        person_seniorities = [],
        organization_industry,
        per_page = 25,
        page = 1,
      } = req.body;

      const params = new URLSearchParams();
      person_titles.forEach((t: string) => params.append("person_titles[]", t));
      person_locations.forEach((l: string) => params.append("person_locations[]", l));
      person_seniorities.forEach((s: string) => params.append("person_seniority[]", s));
      if (organization_industry) {
        params.append("q_organization_keyword_tags[]", organization_industry);
      }
      params.append("per_page", String(per_page));
      params.append("page", String(page));

      const response = await fetch(`https://api.apollo.io/api/v1/mixed_people/api_search?${params.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "x-api-key": apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Apollo] API error ${response.status}:`, errorText);
        return res.status(response.status).json({ message: `Apollo API error: ${response.status}` });
      }

      const data = await response.json();

      const people = (data.people || []).map((p: any) => ({
        id: p.id,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        title: p.title || "",
        headline: p.headline || "",
        email: p.email || null,
        phone_numbers: p.phone_numbers || [],
        city: p.city || "",
        state: p.state || "",
        country: p.country || "",
        linkedin_url: p.linkedin_url || "",
        organization: p.organization ? {
          name: p.organization.name || "",
          website_url: p.organization.website_url || "",
          industry: p.organization.industry || "",
          estimated_num_employees: p.organization.estimated_num_employees || 0,
        } : null,
      }));

      res.json({
        people,
        total_entries: data.pagination?.total_entries || data.total_entries || 0,
        page: data.pagination?.page || page,
        per_page: data.pagination?.per_page || per_page,
      });
    } catch (error: any) {
      console.error("[Apollo] Search error:", error.message);
      res.status(500).json({ message: "Failed to search Apollo. Please try again." });
    }
  });

  app.post("/api/admin/apollo/save-to-funnel", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { name, email, phone, company, title, city, country, linkedin_url, source } = req.body;
      if (!name) return res.status(400).json({ error: "Name is required" });

      const notes = [
        title ? `Title: ${title}` : "",
        city || country ? `Location: ${[city, country].filter(Boolean).join(", ")}` : "",
        linkedin_url ? `LinkedIn: ${linkedin_url}` : "",
        source ? `Source: ${source}` : "",
      ].filter(Boolean).join("\n");

      const [contact] = await db.insert(salesFunnelContacts).values({
        name,
        email: email || null,
        company: company || null,
        phone: phone || null,
        stage: "lead",
        notes: notes || null,
        sortOrder: 0,
      }).returning();

      res.json(contact);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
