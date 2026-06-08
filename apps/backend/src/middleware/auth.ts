import type { RequestHandler } from "express";
import { getPrismaClient } from "../database/prisma.js";
import { UserStatus } from "../generated/prisma/client.js";
import { getAuthenticatedSession } from "../utils/auth-session.js";
import { HttpError } from "../utils/http-error.js";

export const requireAuthenticatedUser: RequestHandler = async (req, res, next) => {
  try {
    const session = getAuthenticatedSession(req.get("authorization"));
    const prisma = getPrismaClient();

    if (prisma) {
      const activeUser = await prisma.user.findFirst({
        where: {
          id: session.userId,
          deletedAt: null,
          status: UserStatus.ACTIVE
        },
        select: {
          id: true
        }
      });

      if (!activeUser) {
        throw new HttpError(401, "세션이 만료되었습니다. 다시 로그인해 주세요.");
      }
    }

    res.locals.authenticatedUserId = session.userId;
    next();
  } catch (error) {
    next(error);
  }
};
