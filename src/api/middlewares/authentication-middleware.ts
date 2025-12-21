import { clerkClient, getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../domain/errors/errors";

export const authenticationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing auth token" });
    return;
  }

    const auth = getAuth(req);
    if (!auth.userId) {
        throw new UnauthorizedError("Unauthorized");
    }
    next();
};