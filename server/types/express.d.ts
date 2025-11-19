import type { User } from "../../shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string | null;
      isAdmin: boolean;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
