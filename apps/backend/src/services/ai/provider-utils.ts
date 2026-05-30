import type { AiProviderExecuteInput, AiProviderExecuteResult, AiProviderStatus } from "../../types/ai-routing.js";
import type { AiProvider } from "../../types/ai-routing.js";

export class ProviderExecutionError extends Error {
  readonly code:
    | "offline"
    | "quota_exceeded"
    | "timeout"
    | "invalid_output"
    | "provider_error";

  constructor(
    code: ProviderExecutionError["code"],
    message: string
  ) {
    super(message);
    this.code = code;
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new ProviderExecutionError("timeout", `${label} timeout`)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function extractJsonObject(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ProviderExecutionError("invalid_output", "empty output");
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
      } catch {
        throw new ProviderExecutionError("invalid_output", "invalid json output");
      }
    }
    throw new ProviderExecutionError("invalid_output", "invalid json output");
  }
}

export function extractAssistantOutputFromJsonl(raw: string) {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let lastAssistant = "";
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as { type?: string; role?: string; content?: string; text?: string };
      const content = parsed.content ?? parsed.text ?? "";
      if (parsed.type === "message" && parsed.role === "assistant" && content) {
        lastAssistant = content;
      }
    } catch {
      // ignore non-json lines
    }
  }

  return lastAssistant || raw;
}

export type BaseProviderContext = {
  getStatus(): Promise<AiProviderStatus>;
  execute<T>(input: AiProviderExecuteInput<unknown>): Promise<AiProviderExecuteResult<T>>;
};

export type { AiProvider };
