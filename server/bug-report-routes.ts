import { Express, Request, Response } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { bugReports } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import multer from "multer";
import OpenAI from "openai";
import { objectStorageClient } from "./replit_integrations/object_storage/objectStorage";
import { sendBugReportNotificationEmail } from "./email";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const screenshotUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

async function classifySeverity(title: string, description: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a bug severity classifier. Based on the bug title and description, classify the severity as exactly one of: critical, high, medium, low.

Guidelines:
- critical: System crashes, data loss, security vulnerabilities, complete feature failure affecting all users
- high: Major feature broken, significant UX issue, affects many users, workarounds difficult
- medium: Feature partially broken, moderate UX issue, workaround available, affects some users
- low: Minor cosmetic issue, typo, enhancement request, rarely encountered

Respond with ONLY the severity word, nothing else.`,
        },
        {
          role: "user",
          content: `Title: ${title}\nDescription: ${description}`,
        },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const severity = response.choices[0]?.message?.content?.trim().toLowerCase();
    if (["critical", "high", "medium", "low"].includes(severity || "")) {
      return severity!;
    }
    return "medium";
  } catch (error) {
    console.error("[Bug Report] Failed to classify severity:", error);
    return "medium";
  }
}

export function registerBugReportRoutes(app: Express) {
  app.post("/api/bug-reports", screenshotUpload.single("screenshot"), async (req: Request, res: Response) => {
    try {
      const { title, description, reporterEmail, reporterName } = req.body;
      const file = (req as any).file;

      if (!title || !description || !reporterEmail || !reporterName) {
        return res.status(400).json({ message: "Title, description, email, and name are required" });
      }

      if (!file) {
        return res.status(400).json({ message: "Screenshot is required" });
      }

      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        return res.status(500).json({ message: "Object storage not configured" });
      }

      const timestamp = Date.now();
      const ext = file.originalname.split(".").pop() || "png";
      const objectName = `.private/bug-screenshots/${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const bucket = objectStorageClient.bucket(bucketId);
      const gcsFile = bucket.file(objectName);
      await gcsFile.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      const screenshotPath = `/${bucketId}/${objectName}`;

      const severity = await classifySeverity(title, description);

      const userId = (req as any).user?.id || null;

      const [bugReport] = await db
        .insert(bugReports)
        .values({
          title,
          description,
          screenshotUrl: screenshotPath,
          severity,
          status: "new",
          reporterUserId: userId,
          reporterEmail,
          reporterName,
        })
        .returning();

      try {
        await sendBugReportNotificationEmail({
          bugId: bugReport.id,
          title,
          description,
          severity,
          reporterName,
          reporterEmail,
        });
      } catch (emailErr) {
        console.error("[Bug Report] Failed to send notification email:", emailErr);
      }

      res.json({ success: true, bugReport });
    } catch (error: any) {
      console.error("[Bug Report] Error creating report:", error);
      res.status(500).json({ message: "Failed to create bug report" });
    }
  });

  app.get("/api/bug-reports/screenshot/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const [bugReport] = await db
        .select()
        .from(bugReports)
        .where(eq(bugReports.id, req.params.id));

      if (!bugReport) {
        return res.status(404).json({ message: "Bug report not found" });
      }

      const screenshotUrl = bugReport.screenshotUrl;
      const parts = screenshotUrl.startsWith("/") ? screenshotUrl.slice(1).split("/") : screenshotUrl.split("/");
      const bucketName = parts[0];
      const objectName = parts.slice(1).join("/");

      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ message: "Screenshot not found" });
      }

      const [metadata] = await file.getMetadata();
      res.setHeader("Content-Type", (metadata as any).contentType || "image/png");
      res.setHeader("Cache-Control", "private, max-age=3600");
      file.createReadStream().pipe(res);
    } catch (error: any) {
      console.error("[Bug Report] Error fetching screenshot:", error);
      res.status(500).json({ message: "Failed to fetch screenshot" });
    }
  });

  app.get("/api/admin/bug-reports", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const reports = await db
        .select()
        .from(bugReports)
        .orderBy(desc(bugReports.createdAt));

      res.json(reports);
    } catch (error: any) {
      console.error("[Bug Report] Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch bug reports" });
    }
  });

  app.patch("/api/admin/bug-reports/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { status, adminNotes } = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

      const [updated] = await db
        .update(bugReports)
        .set(updateData)
        .where(eq(bugReports.id, req.params.id))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Bug report not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("[Bug Report] Error updating report:", error);
      res.status(500).json({ message: "Failed to update bug report" });
    }
  });

  app.delete("/api/admin/bug-reports/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const user = await storage.getUser(userId);
      if (user?.role !== "super_admin") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const [deleted] = await db
        .delete(bugReports)
        .where(eq(bugReports.id, req.params.id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Bug report not found" });
      }

      if (deleted.screenshotUrl) {
        try {
          const parts = deleted.screenshotUrl.startsWith("/")
            ? deleted.screenshotUrl.slice(1).split("/")
            : deleted.screenshotUrl.split("/");
          const bucketName = parts[0];
          const objectName = parts.slice(1).join("/");
          const bucket = objectStorageClient.bucket(bucketName);
          await bucket.file(objectName).delete();
        } catch (err) {
          console.error("[Bug Report] Failed to delete screenshot:", err);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Bug Report] Error deleting report:", error);
      res.status(500).json({ message: "Failed to delete bug report" });
    }
  });
}
