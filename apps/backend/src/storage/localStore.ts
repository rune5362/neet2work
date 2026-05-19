import { hasDatabaseUrl } from "../database/connection.js";

export type LocalStoreStatus = {
  database: "configured" | "not_configured";
  storage: "configured" | "local";
};

export function getLocalStoreStatus(): LocalStoreStatus {
  return {
    database: hasDatabaseUrl() ? "configured" : "not_configured",
    storage: process.env.R2_ACCESS_KEY_ID ? "configured" : "local"
  };
}
