import { hasDatabaseUrl } from "../database/connection.js";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT) || 3000,
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  hasDatabaseUrl: hasDatabaseUrl(),
  hasAiKey: Boolean(process.env.AI_API_KEY),
  hasR2Key: Boolean(process.env.R2_ACCESS_KEY_ID)
};
