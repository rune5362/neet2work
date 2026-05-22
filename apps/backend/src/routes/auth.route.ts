import { Router } from "express";
import { signUp, signUpSchema } from "../services/auth.service.js";

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
