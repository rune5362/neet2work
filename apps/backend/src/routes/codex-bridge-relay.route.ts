import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { aiConfig } from "../config/ai-config.js";
import {
  getCodexBridgeLoginStatus,
  startCodexBridgeLogin
} from "../services/ai/codex-login-session.service.js";
import { CodexBridgeProvider } from "../services/ai/codex-bridge.provider.js";
import { HttpError } from "../utils/http-error.js";

export const codexBridgeRelayRouter = Router();

const relayProvider = new CodexBridgeProvider({ forceLocal: true });

const executeSchema = z.object({
  operation: z.enum(["analyze", "plan", "draft", "revise"]),
  payload: z.unknown(),
  modelId: z.string().optional(),
  timeoutMs: z.number().int().positive().max(600_000)
});

const requireRelayAccess: RequestHandler = (req, _res, next) => {
  try {
    if (!aiConfig.codexBridge.relayEnabled) {
      throw new HttpError(404, "Codex relay를 찾을 수 없습니다.");
    }

    const expectedToken = aiConfig.codexBridge.relayToken.trim();
    if (expectedToken) {
      const authorization = req.get("authorization") ?? "";
      if (authorization !== `Bearer ${expectedToken}`) {
        throw new HttpError(401, "Codex relay 인증이 필요합니다.");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

codexBridgeRelayRouter.use(requireRelayAccess);

codexBridgeRelayRouter.get("/status", async (_req, res, next) => {
  try {
    const data = await relayProvider.getStatus();
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

codexBridgeRelayRouter.post("/execute", async (req, res, next) => {
  try {
    const body = executeSchema.parse(req.body);
    const data = await relayProvider.execute({
      operation: body.operation,
      payload: body.payload,
      modelId: body.modelId,
      timeoutMs: body.timeoutMs
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

codexBridgeRelayRouter.post("/login", async (_req, res, next) => {
  try {
    const data = await startCodexBridgeLogin({ forceLocal: true });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

codexBridgeRelayRouter.get("/login/:loginId", async (req, res, next) => {
  try {
    const loginId = req.params.loginId.trim();
    const data = await getCodexBridgeLoginStatus(loginId, { forceLocal: true });
    if (!data) {
      throw new HttpError(404, "Codex 로그인 세션을 찾을 수 없습니다.");
    }

    res.json({ data });
  } catch (error) {
    next(error);
  }
});
