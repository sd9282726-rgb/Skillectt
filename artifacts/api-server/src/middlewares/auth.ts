import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";

export function getUserId(req: Request): string | undefined {
  const auth = getAuth(req);
  return auth?.userId ?? undefined;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
