import { Router } from "express";
import {
  getAccountSecuritySummary,
  login,
  loginSchema,
  logout,
  logoutSchema,
  refreshAccessToken,
  refreshTokenSchema,
  signUp,
  signUpSchema,
  updateProfile,
  updateProfileSchema
} from "../services/auth.service.js";
import { HttpError } from "../errors/httpError.js";
import { verifyAccessToken } from "../services/token.service.js";

export const authRouter = Router();

function getAuthenticatedUserId(authorizationHeader: string | undefined) {
  const [type, token] = authorizationHeader?.split(" ") ?? [];

  if (type !== "Bearer" || !token) {
    throw new HttpError(401, "인증이 필요합니다.");
  }

  try {
    return verifyAccessToken(token).sub;
  } catch {
    throw new HttpError(401, "세션이 만료되었습니다. 다시 로그인해 주세요.");
  }
}

authRouter.post("/signup", async (req, res, next) => {
  try {
    const body = signUpSchema.parse(req.body);
    const user = await signUp(body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.status(201).json({
      data: user
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await login(body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.json({
      data: result
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const body = refreshTokenSchema.parse(req.body);
    const result = await refreshAccessToken(body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.json({
      data: result
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const body = logoutSchema.parse(req.body);
    const result = await logout(body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.json({
      data: result
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me/security", async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req.get("authorization"));
    const summary = await getAccountSecuritySummary(userId);

    res.json({
      data: summary
    });
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/me", async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req.get("authorization"));
    const body = updateProfileSchema.parse(req.body);
    const user = await updateProfile(userId, body);

    res.json({
      data: user
    });
  } catch (error) {
    next(error);
  }
});
