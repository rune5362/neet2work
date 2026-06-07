import type { RequestHandler } from "express";
import { getAuthenticatedUserId } from "../utils/auth-session.js";

export const requireAuthenticatedUser: RequestHandler = (req, res, next) => {
  try {
    res.locals.authenticatedUserId = getAuthenticatedUserId(req.get("authorization"));
    next();
  } catch (error) {
    next(error);
  }
};
