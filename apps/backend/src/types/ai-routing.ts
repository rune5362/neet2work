/**
 * backend AI router가 실행 대상으로 인식하는 provider id입니다.
 */
export type AiProviderId = "codex_bridge" | "gemini" | "local" | "agy_cli" | "fallback";

export type AiRoutingMode = "auto" | "manual";

export type FallbackReason =
  | "offline"
  | "quota_exceeded"
  | "timeout"
  | "invalid_output"
  | "provider_error"
  | "all_providers_unavailable";

/**
 * provider 선택 UI와 상태 점검 API가 공유하는 provider/모델 상태입니다.
 */
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

export const agyCliStatusReasons = [
  "disabled",
  "missing_command",
  "invalid_command",
  "sandbox_required",
  "invalid_task_profile",
  "agy_not_logged_in",
  "agy_probe_timeout",
  "agy_app_data_unwritable",
  "ssh_missing_config",
  "ssh_key_unreadable",
  "ssh_host_key_mismatch",
  "ssh_wrapper_invalid",
  "ssh_wrapper_timeout",
  "output_limit_exceeded",
  "invalid_json_output"
] as const;

export type AgyCliStatusReason = (typeof agyCliStatusReasons)[number];

/**
 * 요청별 AI routing 방식과 provider/model override입니다.
 */
export type AiSelection = {
  mode: AiRoutingMode;
  providerId?: AiProviderId;
  modelId?: string;
};

/**
 * 실제 AI 실행에 사용된 provider와 fallback 여부를 설명하는 메타데이터입니다.
 */
export type AiExecutionMeta = {
  providerId: AiProviderId;
  modelId: string;
  routingMode: AiRoutingMode;
  usedFallback: boolean;
  fallbackReason?: FallbackReason;
};

export type AiWorkflowOperation = "analyze" | "plan" | "draft" | "revise";

/**
 * AI provider adapter가 실행 시 받는 공통 입력입니다.
 */
export type AiProviderExecuteInput<TPayload> = {
  operation: AiWorkflowOperation;
  payload: TPayload;
  modelId?: string;
  timeoutMs: number;
};

/**
 * AI provider adapter가 router로 돌려주는 정규화된 실행 결과입니다.
 */
export type AiProviderExecuteResult<T> = {
  data: T;
  modelId: string;
  latencyMs: number;
};

/**
 * AI router가 호출할 수 있는 provider adapter 계약입니다.
 */
export interface AiProvider {
  readonly id: AiProviderId;
  readonly label: string;
  getStatus(): Promise<AiProviderStatus>;
  execute<T>(input: AiProviderExecuteInput<unknown>): Promise<AiProviderExecuteResult<T>>;
}
