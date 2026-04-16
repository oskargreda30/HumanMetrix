import { Express, Request, Response } from "express";
import { isAuthenticated } from "./auth";
import { socialPosts, SOCIAL_PLATFORMS, SOCIAL_POST_STATUSES } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  ...(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL }),
});

function isSuperAdmin(req: Request): boolean {
  return (req as any).user?.role === "super_admin";
}

const TOPIC_CATEGORIES = [
  "AI in Hiring",
  "Behavioral Assessment",
  "AI Literacy",
  "Future of Work",
  "HR Tech Trends",
  "Candidate Experience",
  "Skills-Based Hiring",
  "Team Diagnostics",
  "Ethical AI",
  "Recruitment Innovation",
];

async function generatePostContent(platform: string, topic?: string): Promise<{
  content: string;
  hashtags: string;
  imagePrompt: string;
  topicCategory: string;
}> {
  const selectedTopic = topic || TOPIC_CATEGORIES[Math.floor(Math.random() * TOPIC_CATEGORIES.length)];

  const platformGuidance = platform === "linkedin"
    ? "Write a professional LinkedIn post (150-250 words). Use a compelling hook in the first line. Include data points or insights where relevant. End with a call-to-action or thought-provoking question. Use line breaks for readability. Do NOT use emojis."
    : "Write an Instagram caption (80-150 words). Keep it concise and engaging. Use a strong opening line. Include a call-to-action. Do NOT use emojis. The tone should be professional but approachable.";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a social media content strategist for HumanMetrix, an AI assessment platform for recruitment and career development. HumanMetrix offers enterprise-grade assessments to objectively measure behavioral skills and AI literacy. The brand voice is authoritative, innovative, and forward-thinking. Never use emojis. Never use first person ("I", "we"). Write in third person or address the audience directly.`,
      },
      {
        role: "user",
        content: `Create a ${platform} post about "${selectedTopic}".

${platformGuidance}

Respond in JSON format:
{
  "content": "the post content",
  "hashtags": "relevant hashtags separated by spaces",
  "imagePrompt": "a detailed description for generating a matching social media image (professional, clean, tech-oriented)"
}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");

  return {
    content: result.content || "",
    hashtags: result.hashtags || "",
    imagePrompt: result.imagePrompt || "",
    topicCategory: selectedTopic,
  };
}

export function registerSocialPosterRoutes(app: Express) {
  app.get("/api/admin/social-posts", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { status, platform } = req.query;
      let query = db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt));

      const conditions: any[] = [];
      if (status && typeof status === "string") {
        conditions.push(eq(socialPosts.status, status));
      }
      if (platform && typeof platform === "string") {
        conditions.push(eq(socialPosts.platform, platform));
      }

      let posts;
      if (conditions.length > 0) {
        posts = await db.select().from(socialPosts)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(socialPosts.createdAt));
      } else {
        posts = await db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt));
      }

      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/social-posts", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { platform, content, hashtags, imagePrompt, imageUrl, status, scheduledFor, topicCategory } = req.body;
      if (!platform || !content) return res.status(400).json({ error: "Platform and content are required" });
      if (!SOCIAL_PLATFORMS.includes(platform)) return res.status(400).json({ error: "Invalid platform" });

      const [post] = await db.insert(socialPosts).values({
        platform,
        content,
        hashtags: hashtags || null,
        imagePrompt: imagePrompt || null,
        imageUrl: imageUrl || null,
        status: status || "draft",
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        topicCategory: topicCategory || null,
        aiGenerated: false,
      }).returning();

      res.json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/social-posts/:id", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const id = parseInt(req.params.id);
      const updates: any = { updatedAt: new Date() };

      if (req.body.content !== undefined) updates.content = req.body.content;
      if (req.body.hashtags !== undefined) updates.hashtags = req.body.hashtags;
      if (req.body.imagePrompt !== undefined) updates.imagePrompt = req.body.imagePrompt;
      if (req.body.imageUrl !== undefined) updates.imageUrl = req.body.imageUrl;
      if (req.body.status !== undefined) {
        if (!SOCIAL_POST_STATUSES.includes(req.body.status)) return res.status(400).json({ error: "Invalid status" });
        updates.status = req.body.status;
      }
      if (req.body.scheduledFor !== undefined) updates.scheduledFor = req.body.scheduledFor ? new Date(req.body.scheduledFor) : null;
      if (req.body.platform !== undefined) {
        if (!SOCIAL_PLATFORMS.includes(req.body.platform)) return res.status(400).json({ error: "Invalid platform" });
        updates.platform = req.body.platform;
      }
      if (req.body.topicCategory !== undefined) updates.topicCategory = req.body.topicCategory;

      const [post] = await db.update(socialPosts).set(updates).where(eq(socialPosts.id, id)).returning();
      if (!post) return res.status(404).json({ error: "Post not found" });
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/social-posts/:id", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const id = parseInt(req.params.id);
      const [deleted] = await db.delete(socialPosts).where(eq(socialPosts.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Post not found" });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/social-posts/generate", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { platform, topic } = req.body;
      if (!platform) return res.status(400).json({ error: "Platform is required" });
      if (!SOCIAL_PLATFORMS.includes(platform)) return res.status(400).json({ error: "Invalid platform" });

      const generated = await generatePostContent(platform, topic);

      const [post] = await db.insert(socialPosts).values({
        platform,
        content: generated.content,
        hashtags: generated.hashtags,
        imagePrompt: generated.imagePrompt,
        status: "pending_approval",
        aiGenerated: true,
        topicCategory: generated.topicCategory,
      }).returning();

      res.json(post);
    } catch (error: any) {
      console.error("AI generation error:", error);
      res.status(500).json({ error: "Failed to generate content: " + error.message });
    }
  });

  app.post("/api/admin/social-posts/generate-batch", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const { platforms, count } = req.body;
      const targetPlatforms = platforms || ["linkedin", "instagram"];
      const postsPerPlatform = count || 1;

      const results: any[] = [];

      for (const platform of targetPlatforms) {
        for (let i = 0; i < postsPerPlatform; i++) {
          try {
            const generated = await generatePostContent(platform);
            const [post] = await db.insert(socialPosts).values({
              platform,
              content: generated.content,
              hashtags: generated.hashtags,
              imagePrompt: generated.imagePrompt,
              status: "pending_approval",
              aiGenerated: true,
              topicCategory: generated.topicCategory,
            }).returning();
            results.push(post);
          } catch (err: any) {
            results.push({ error: err.message, platform });
          }
        }
      }

      res.json({ generated: results.length, posts: results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/social-posts/:id/approve", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const id = parseInt(req.params.id);
      const user = (req as any).user;

      const [post] = await db.update(socialPosts).set({
        status: "approved",
        approvedBy: user?.email || user?.username || "admin",
        updatedAt: new Date(),
      }).where(eq(socialPosts.id, id)).returning();

      if (!post) return res.status(404).json({ error: "Post not found" });
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/social-posts/:id/reject", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      const [post] = await db.update(socialPosts).set({
        status: "rejected",
        rejectedReason: reason || null,
        updatedAt: new Date(),
      }).where(eq(socialPosts.id, id)).returning();

      if (!post) return res.status(404).json({ error: "Post not found" });
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/social-posts/:id/publish", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const id = parseInt(req.params.id);

      const [existing] = await db.select().from(socialPosts).where(eq(socialPosts.id, id));
      if (!existing) return res.status(404).json({ error: "Post not found" });
      if (existing.status !== "approved") return res.status(400).json({ error: "Post must be approved before publishing" });

      let publishResult: { success: boolean; externalId?: string; error?: string };

      if (existing.platform === "linkedin") {
        publishResult = await publishToLinkedIn(existing.content, existing.hashtags);
      } else if (existing.platform === "instagram") {
        publishResult = await publishToInstagram(existing.content, existing.hashtags, existing.imageUrl);
      } else {
        publishResult = { success: false, error: "Unsupported platform" };
      }

      if (publishResult.success) {
        const [post] = await db.update(socialPosts).set({
          status: "posted",
          postedAt: new Date(),
          externalPostId: publishResult.externalId || null,
          updatedAt: new Date(),
        }).where(eq(socialPosts.id, id)).returning();
        res.json(post);
      } else {
        const [post] = await db.update(socialPosts).set({
          status: "failed",
          rejectedReason: publishResult.error || "Publishing failed",
          updatedAt: new Date(),
        }).where(eq(socialPosts.id, id)).returning();
        res.json({ ...post, publishError: publishResult.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/social-posts/stats", isAuthenticated, async (req: Request, res: Response) => {
    if (!isSuperAdmin(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const allPosts = await db.select().from(socialPosts);
      const stats = {
        total: allPosts.length,
        draft: allPosts.filter(p => p.status === "draft").length,
        pending_approval: allPosts.filter(p => p.status === "pending_approval").length,
        approved: allPosts.filter(p => p.status === "approved").length,
        rejected: allPosts.filter(p => p.status === "rejected").length,
        posted: allPosts.filter(p => p.status === "posted").length,
        failed: allPosts.filter(p => p.status === "failed").length,
        byPlatform: {
          linkedin: allPosts.filter(p => p.platform === "linkedin").length,
          instagram: allPosts.filter(p => p.platform === "instagram").length,
        },
      };
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

async function publishToLinkedIn(content: string, hashtags: string | null): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const authorId = process.env.LINKEDIN_AUTHOR_ID;

  if (!accessToken || !authorId) {
    return { success: false, error: "LinkedIn API credentials not configured. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_ID environment variables." };
  }

  try {
    const fullContent = hashtags ? `${content}\n\n${hashtags}` : content;

    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:person:${authorId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: fullContent },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, externalId: data.id };
    } else {
      const errorText = await response.text();
      return { success: false, error: `LinkedIn API error (${response.status}): ${errorText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function publishToInstagram(content: string, hashtags: string | null, imageUrl: string | null): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_USER_ID;

  if (!accessToken || !igUserId) {
    return { success: false, error: "Instagram API credentials not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID environment variables." };
  }

  if (!imageUrl) {
    return { success: false, error: "Instagram posts require an image. Please add an image URL before publishing." };
  }

  try {
    const fullCaption = hashtags ? `${content}\n\n${hashtags}` : content;

    const createResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: fullCaption,
          access_token: accessToken,
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return { success: false, error: `Instagram media creation failed (${createResponse.status}): ${errorText}` };
    }

    const createData = await createResponse.json();
    const creationId = createData.id;

    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: accessToken,
        }),
      }
    );

    if (publishResponse.ok) {
      const publishData = await publishResponse.json();
      return { success: true, externalId: publishData.id };
    } else {
      const errorText = await publishResponse.text();
      return { success: false, error: `Instagram publish failed (${publishResponse.status}): ${errorText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
