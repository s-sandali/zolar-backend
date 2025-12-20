import { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { User } from "../../infrastructure/entities/User";
import { ForbiddenError, UnauthorizedError } from "../../domain/errors/errors";
import { UserPublicMetadata } from "../../domain/types";

export const authorizationMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const auth = getAuth(req);
    if (!auth.userId) {
        throw new UnauthorizedError("Unauthorized");
    }

    // Try to get role from JWT token first
    const publicMetadata = auth.sessionClaims?.publicMetadata as UserPublicMetadata;

    // If not in JWT, check MongoDB (fallback for when JWT doesn't include metadata)
    if (!publicMetadata || !publicMetadata.role) {
        const user = await User.findOne({ clerkUserId: auth.userId });
        if (!user || user.role !== "admin") {
            throw new ForbiddenError("Forbidden");
        }
    } else if (publicMetadata.role !== "admin") {
        throw new ForbiddenError("Forbidden");
    }

    next();
};