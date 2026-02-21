import { Express, Request, Response } from "express";
import multer from "multer";
import { sendEmail } from "./email";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Word documents are allowed"));
    }
  },
});

export function registerCVRoutes(app: Express) {
  app.post("/api/send-cv", cvUpload.single("cv"), async (req: Request, res: Response) => {
    try {
      const { name, email, message } = req.body;
      const file = req.file;

      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      if (!file) {
        return res.status(400).json({ message: "CV file is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email address" });
      }

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeMessage = message ? escapeHtml(message) : '';

      const result = await sendEmail({
        to: "hello@humanmetrix.co.uk",
        subject: `CV Submission from ${safeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0891b2;">New CV Submission</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #374151; width: 120px;">Name:</td>
                <td style="padding: 8px 12px; color: #111827;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #374151;">Email:</td>
                <td style="padding: 8px 12px; color: #111827;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
              </tr>
            </table>
            ${safeMessage ? `
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 4px 0; font-weight: bold; color: #374151;">Cover Note:</p>
                <p style="margin: 0; color: #374151; white-space: pre-wrap;">${safeMessage}</p>
              </div>
            ` : ''}
            <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
              CV attached below. Submitted via the HumanMetrix careers page.
            </p>
          </div>
        `,
        replyTo: email,
        attachments: [
          {
            content: file.buffer.toString("base64"),
            filename: file.originalname,
            type: file.mimetype,
            disposition: "attachment",
          },
        ],
      });

      if (result.success) {
        return res.json({ success: true, message: "CV sent successfully" });
      } else {
        console.error("[CV] Failed to send CV email");
        return res.status(500).json({ message: "Failed to send CV. Please try again later." });
      }
    } catch (error: any) {
      console.error("[CV] Error:", error.message);
      if (error.message?.includes("Only PDF and Word")) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "An error occurred. Please try again." });
    }
  });
}
