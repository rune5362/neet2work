export type AiProviderId = "codex_bridge" | "gemini" | "local" | "fallback";

export type AiRoutingMode = "auto" | "manual";

export type FallbackReason =
  | "offline"
  | "quota_exceeded"
  | "timeout"
  | "invalid_output"
  | "provider_error"
  | "all_providers_unavailable";

export type AiProviderStatus = {
  providerId: AiProviderId;
  label: string;
  online: boolean;
  configured: boolean;
  quotaExceeded: boolean;
  latencyMs?: number;
  reason?: string;
  models: Array<{
    modelId: string;
    label: string;
    online: boolean;
    quotaExceeded: boolean;
    recommended?: boolean;
  }>;
};

export type AiSelection = {
  mode: AiRoutingMode;
  providerId?: AiProviderId;
  modelId?: string;
};

export type AiExecutionMeta = {
  providerId: AiProviderId;
  modelId: string;
  routingMode: AiRoutingMode;
  usedFallback: boolean;
  fallbackReason?: FallbackReason;
};

export type AiWorkflowOperation = "analyze" | "plan" | "draft" | "revise";

export type AiProviderExecuteInput<TPayload> = {
  operation: AiWorkflowOperation;
  payload: TPayload;
  modelId?: string;
  timeoutMs: number;
};

export type AiProviderExecuteResult<T> = {
  data: T;
  modelId: string;
  latencyMs: number;
};

export interface AiProvider {
  readonly id: AiProviderId;
  readonly label: string;
  getStatus(): Promise<AiProviderStatus>;
  execute<T>(input: AiProviderExecuteInput<unknown>): Promise<AiProviderExecuteResult<T>>;
}
