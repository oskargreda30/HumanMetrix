import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { getEvaluationProgress } from "./evaluation-progress";

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string };
}

type AuthHandler = (req: AuthenticatedRequest, res: Response) => Promise<void | Response>;

function auth(handler: AuthHandler) {
  return [isAuthenticated, (req: Request, res: Response) => handler(req as AuthenticatedRequest, res)];
}

export function registerAssessmentRoutes(app: Express): void {
  app.post("/api/assessments/:id/heartbeat", ...auth(async (req, res) => {
    try {
      const { id } = req.params;
      const { timeRemainingMs } = req.body;
      const userId = req.user.id;

      const result = await storage.getAssessmentResult(id);

      if (!result) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (result.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (result.status !== "in_progress") {
        return res.json({ success: true });
      }

      if (typeof timeRemainingMs === 'number' && timeRemainingMs >= 0 && !result.pausedAt && (!result.pausedTimeRemainingMs || timeRemainingMs <= result.pausedTimeRemainingMs)) {
        await storage.updateAssessmentResult(id, {
          pausedTimeRemainingMs: Math.max(0, Math.floor(timeRemainingMs)),
        });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error in heartbeat:", error);
      return res.json({ success: true });
    }
  }));

  app.post("/api/assessments/:id/pause", ...auth(async (req, res) => {
    try {
      const { id } = req.params;
      const { timeRemainingMs } = req.body;
      const userId = req.user.id;

      if (typeof timeRemainingMs !== 'number' || timeRemainingMs < 0) {
        return res.status(400).json({ message: "Invalid timeRemainingMs" });
      }

      const result = await storage.getAssessmentResult(id);

      if (!result) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (result.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (result.status !== "in_progress") {
        return res.status(400).json({
          message: `Cannot pause assessment. Status is "${result.status}". Only in-progress assessments can be paused.`,
        });
      }

      if (result.pausedAt) {
        const clampedMs = Math.min(Math.floor(timeRemainingMs), result.pausedTimeRemainingMs || Infinity);
        await storage.updateAssessmentResult(id, {
          pausedTimeRemainingMs: Math.max(0, clampedMs),
        });
        return res.json({
          success: true,
          pausedAt: result.pausedAt,
          graceExpiresAt: result.pauseGraceExpiresAt,
          timeRemainingMs: Math.max(0, clampedMs),
        });
      }

      const now = new Date();
      const graceExpiresAt = new Date(now.getTime() + 30 * 60 * 1000);

      await storage.updateAssessmentResult(id, {
        pausedAt: now,
        pausedTimeRemainingMs: Math.floor(timeRemainingMs),
        pauseGraceExpiresAt: graceExpiresAt,
      });

      console.log(`[Assessment Pause] Assessment ${id} paused with ${Math.floor(timeRemainingMs / 1000)}s remaining. Grace expires at ${graceExpiresAt.toISOString()}`);

      return res.json({
        success: true,
        pausedAt: now.toISOString(),
        graceExpiresAt: graceExpiresAt.toISOString(),
        timeRemainingMs: Math.floor(timeRemainingMs),
      });
    } catch (error) {
      console.error("Error pausing assessment:", error);
      return res.status(500).json({ message: "Failed to pause assessment" });
    }
  }));

  app.post("/api/assessments/:id/resume", ...auth(async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await storage.getAssessmentResult(id);

      if (!result) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (result.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (!result.pausedAt) {
        return res.status(400).json({
          message: "Assessment is not currently paused.",
        });
      }

      const now = new Date();
      if (result.pauseGraceExpiresAt && new Date(result.pauseGraceExpiresAt) < now) {
        await storage.updateAssessmentResult(id, { status: "expired" });
        return res.status(400).json({
          message: "The 30-minute grace period has expired. The assessment has been marked as expired.",
        });
      }

      const newResumeCount = (result.resumeCount || 0) + 1;

      await storage.updateAssessmentResult(id, {
        pausedAt: null,
        resumeCount: newResumeCount,
      });

      console.log(`[Assessment Resume] Assessment ${id} resumed. Resume count: ${newResumeCount}. Time remaining: ${result.pausedTimeRemainingMs}ms`);

      return res.json({
        success: true,
        resumedAt: now.toISOString(),
        timeRemainingMs: result.pausedTimeRemainingMs || 0,
        resumeCount: newResumeCount,
        canPauseAgain: false,
      });
    } catch (error) {
      console.error("Error resuming assessment:", error);
      return res.status(500).json({ message: "Failed to resume assessment" });
    }
  }));

  app.post("/api/assessments/:id/abandon", ...auth(async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await storage.getAssessmentResult(id);

      if (!result) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (result.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (result.status !== "in_progress") {
        return res.status(400).json({
          message: `Cannot abandon assessment. Status is "${result.status}". Only in-progress assessments can be abandoned.`,
        });
      }

      await storage.updateAssessmentResult(id, {
        status: "abandoned",
        completedAt: new Date(),
      });

      console.log(`[Assessment Abandon] Assessment ${id} abandoned by user ${userId}`);

      return res.json({
        success: true,
        message: "Assessment has been marked as incomplete",
      });
    } catch (error) {
      console.error("Error abandoning assessment:", error);
      return res.status(500).json({ message: "Failed to abandon assessment" });
    }
  }));

  app.get("/api/assessments/:id/status", ...auth(async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await storage.getAssessmentResult(id);

      if (!result) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      if (result.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const now = new Date();
      if (result.pausedAt && result.pauseGraceExpiresAt && new Date(result.pauseGraceExpiresAt) < now) {
        await storage.updateAssessmentResult(id, { status: "expired" });
        return res.status(400).json({ message: "The 30-minute grace period has expired. The assessment has been marked as expired." });
      }

      const evalProgress = result.status === 'evaluating' ? getEvaluationProgress(id) : null;

      return res.json({
        id: result.id,
        status: result.status,
        isPaused: !!result.pausedAt,
        pausedAt: result.pausedAt || null,
        pausedTimeRemainingMs: result.pausedTimeRemainingMs ?? null,
        pauseGraceExpiresAt: result.pauseGraceExpiresAt || null,
        resumeCount: result.resumeCount || 0,
        canPauseAgain: (result.resumeCount || 0) < 1,
        evaluationProgress: evalProgress ? {
          completedEvaluations: evalProgress.completed,
          totalEvaluations: evalProgress.total,
        } : null,
      });
    } catch (error) {
      console.error("Error getting assessment status:", error);
      return res.status(500).json({ message: "Failed to get assessment status" });
    }
  }));
}
