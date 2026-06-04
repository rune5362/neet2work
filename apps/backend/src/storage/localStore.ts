import { hasDatabaseUrl } from "../database/connection.js";

export type LocalStoreStatus = {
  database: "configured" | "not_configured";
  storage: "local";
};

export function getLocalStoreStatus(): LocalStoreStatus {
  return {
    database: hasDatabaseUrl() ? "configured" : "not_configured",
    storage: "local"
  };
}
