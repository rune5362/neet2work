import { Router } from "express";
import { login, loginSchema, signUp, signUpSchema } from "../services/auth.service.js";

export const authRouter = Router();

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
