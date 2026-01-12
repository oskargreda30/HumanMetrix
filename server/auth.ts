import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { isValidEmail, isValidName, normalizeEmail } from "@shared/validation";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Warning for production proxy misconfiguration
  if (isProduction) {
    console.log("🔒 Production mode: secure cookies enabled");
    console.log("⚠️  IMPORTANT: Ensure your proxy/load balancer sets X-Forwarded-Proto header");
    console.log("⚠️  Without proper proxy configuration, session cookies will be silently dropped!");
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax', // Required for Stripe redirects
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  
  // Runtime check for proxy misconfiguration
  app.use((req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !req.secure && req.get('X-Forwarded-Proto') !== 'https') {
      console.warn(`⚠️  PROXY WARNING: req.secure is false in production for ${req.path}`);
      console.warn(`⚠️  This will cause secure session cookies to be dropped!`);
      console.warn(`⚠️  Check X-Forwarded-Proto header and trust proxy settings`);
    }
    next();
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
      
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const user = await storage.getUserByEmail(normalizeEmail(email));
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Regenerate session to prevent session fixation attacks
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err: any) => {
          if (err) {
            console.error("Session regenerate error during login:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Set session and explicitly save to ensure it's persisted before responding
      (req.session as any).userId = user.id;
      
      // Explicitly save session to PostgreSQL before responding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error("Session save error during login:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Signup endpoint
  app.post("/api/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
      
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // Validate names if provided
      if (firstName && !isValidName(firstName)) {
        return res.status(400).json({ message: "Invalid first name format" });
      }
      if (lastName && !isValidName(lastName)) {
        return res.status(400).json({ message: "Invalid last name format" });
      }

      const normalizedEmail = normalizeEmail(email);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user with normalized email
      const user = await storage.createUser({
        email: normalizedEmail,
        passwordHash,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        profileImageUrl: null,
      });

      // Auto-grant all assessments for free
      await storage.createFreeAssessmentsForUser(user.id);

      // Regenerate session to prevent session fixation attacks
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err: any) => {
          if (err) {
            console.error("Session regenerate error during signup:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Set session and explicitly save to ensure it's persisted before responding
      (req.session as any).userId = user.id;
      
      // Explicitly save session to PostgreSQL before responding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error("Session save error during signup:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Request password reset
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }
      
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const user = await storage.getUserByEmail(normalizeEmail(email));
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "If the email exists, a reset link has been sent" });
      }

      // Generate reset token
      const crypto = await import("crypto");
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.setResetToken(user.id, resetToken, resetTokenExpiry);

      // Send reset email
      const { sendPasswordResetEmail } = await import("./email");
      await sendPasswordResetEmail(user.email, user.firstName || 'User', resetToken);

      res.json({ message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with token
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > user.resetTokenExpiry) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      await storage.updatePassword(user.id, passwordHash);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Change password endpoint (for logged-in users)
  app.post("/api/change-password", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updatePassword(user.id, passwordHash);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any).userId;

  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  // Attach user to request
  (req as any).user = user;
  next();
};

// Middleware that populates req.user if logged in, but doesn't require it
export const populateUser: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any).userId;

  if (userId) {
    const user = await storage.getUser(userId);
    if (user) {
      (req as any).user = user;
    }
  }
  
  next();
};
