import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";
import { ProviderExecutionError } from "./provider-utils.js";

type JsonRpcId = number;

type JsonRpcError = {
  code?: number;
  message?: string;
};

type JsonRpcMessage = {
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: JsonRpcError;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type CodexAccountState = {
  account: null | CodexAccount;
  requiresOpenaiAuth: boolean;
};

export type CodexAccount = {
  type?: string;
  email?: string;
  planType?: string;
};

type CodexLoginStartResult = {
  type: string;
  loginId?: string;
  authUrl?: string;
  verificationUrl?: string;
  userCode?: string;
};

type CodexLoginCompletion = {
  loginId: string | null;
  success: boolean;
  error: string | null;
};

type CodexAppServerClientOptions = {
  command: string;
  home?: string;
  clientName?: string;
  clientTitle?: string;
  clientVersion?: string;
};

type RunPromptOptions = {
  prompt: string;
  model?: string;
  reasoningEffort?: string;
  cwd?: string;
};

function assertRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function extractThreadId(result: unknown) {
  const root = assertRecord(result);
  const thread = assertRecord(root.thread);
  return typeof thread.id === "string" ? thread.id : "";
}

function extractTurnId(result: unknown) {
  const root = assertRecord(result);
  const turn = assertRecord(root.turn);
  return typeof turn.id === "string" ? turn.id : "";
}

function extractAgentText(item: unknown) {
  const record = assertRecord(item);
  const type = record.type;
  if (type !== "agentMessage" && type !== "agent_message") {
    return "";
  }
  return typeof record.text === "string" ? record.text : "";
}

function extractDelta(params: unknown) {
  const record = assertRecord(params);
  if (typeof record.delta === "string") {
    return record.delta;
  }
  if (typeof record.text === "string") {
    return record.text;
  }
  return "";
}

function extractTurnStatus(params: unknown) {
  const record = assertRecord(params);
  const turn = assertRecord(record.turn);
  return {
    id: typeof turn.id === "string" ? turn.id : "",
    status: typeof turn.status === "string" ? turn.status : "",
    errorMessage: typeof assertRecord(turn.error).message === "string" ? String(assertRecord(turn.error).message) : ""
  };
}

function extractAccount(value: unknown): CodexAccount | null {
  if (value === null || value === undefined) {
    return null;
  }

  const account = assertRecord(value);
  if (typeof account.type !== "string") {
    return null;
  }

  return {
    type: account.type,
    email: typeof account.email === "string" ? account.email : undefined,
    planType: typeof account.planType === "string" ? account.planType : undefined
  };
}

export class CodexAppServerClient {
  private readonly proc: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<JsonRpcId, PendingRequest>();
  private readonly notificationHandlers = new Set<(message: JsonRpcMessage) => void>();
  private readonly activeNotificationRejects = new Set<(error: Error) => void>();
  private nextId = 1;
  private initialized = false;
  private stderr = "";

  constructor(private readonly options: CodexAppServerClientOptions) {
    try {
      this.proc = spawn(options.command, ["app-server", "--listen", "stdio://"], {
        env: options.home ? { ...process.env, CODEX_HOME: options.home } : { ...process.env },
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "codex_app_server_unavailable";
      throw new ProviderExecutionError("offline", message);
    }

    const lines = readline.createInterface({ input: this.proc.stdout });
    lines.on("line", (line) => this.handleLine(line));
    this.proc.stderr.on("data", (chunk: Buffer | string) => {
      this.stderr += String(chunk);
    });
    this.proc.on("error", (error) => {
      this.rejectAll(new ProviderExecutionError("offline", error.message || "codex_app_server_unavailable"));
    });
    this.proc.on("close", (code) => {
      if (this.pending.size > 0 || this.activeNotificationRejects.size > 0) {
        this.rejectAll(new ProviderExecutionError("offline", this.stderr || `codex app-server exited with ${code}`));
      }
    });
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    await this.request("initialize", {
      clientInfo: {
        name: this.options.clientName ?? "neet2work_codex_bridge",
        title: this.options.clientTitle ?? "Neet2Work Codex Bridge",
        version: this.options.clientVersion ?? "1.0.0"
      }
    });
    this.notify("initialized", {});
    this.initialized = true;
  }

  async readAccount(refreshToken = true) {
    await this.initialize();
    const result = await this.request("account/read", { refreshToken });
    const accountState = assertRecord(result);
    return {
      account: extractAccount(accountState.account),
      requiresOpenaiAuth: accountState.requiresOpenaiAuth !== false
    } as CodexAccountState;
  }

  async startChatGptLogin(codexStreamlinedLogin = true) {
    await this.initialize();
    const result = await this.request("account/login/start", {
      type: "chatgpt",
      codexStreamlinedLogin
    });
    const login = assertRecord(result);

    return {
      type: typeof login.type === "string" ? login.type : "",
      loginId: typeof login.loginId === "string" ? login.loginId : undefined,
      authUrl: typeof login.authUrl === "string" ? login.authUrl : undefined,
      verificationUrl: typeof login.verificationUrl === "string" ? login.verificationUrl : undefined,
      userCode: typeof login.userCode === "string" ? login.userCode : undefined
    } as CodexLoginStartResult;
  }

  async waitForLoginCompletion(loginId: string) {
    await this.initialize();

    let rejectLogin: (error: Error) => void = () => undefined;
    let loginHandler: (message: JsonRpcMessage) => void = () => undefined;
    const cleanupLogin = () => {
      this.notificationHandlers.delete(loginHandler);
      this.activeNotificationRejects.delete(rejectLogin);
    };

    return new Promise<CodexLoginCompletion>((resolve, reject) => {
      rejectLogin = reject;
      loginHandler = (message: JsonRpcMessage) => {
        if (message.method !== "account/login/completed") {
          return;
        }

        const params = assertRecord(message.params);
        const completedLoginId = typeof params.loginId === "string" ? params.loginId : null;
        if (completedLoginId && completedLoginId !== loginId) {
          return;
        }

        cleanupLogin();
        resolve({
          loginId: completedLoginId,
          success: params.success === true,
          error: typeof params.error === "string" ? params.error : null
        });
      };
      this.notificationHandlers.add(loginHandler);
      this.activeNotificationRejects.add(rejectLogin);
    });
  }

  async cancelLogin(loginId: string) {
    await this.initialize();
    const result = await this.request("account/login/cancel", { loginId });
    const cancelResult = assertRecord(result);
    return typeof cancelResult.status === "string" ? cancelResult.status : "unknown";
  }

  async runPrompt({ prompt, model, reasoningEffort, cwd }: RunPromptOptions) {
    await this.initialize();

    const threadResult = await this.request("thread/start", model ? { model } : {});
    const threadId = extractThreadId(threadResult);
    if (!threadId) {
      throw new ProviderExecutionError("provider_error", "codex app-server did not return a thread id");
    }

    let turnId = "";
    let agentText = "";
    let deltaText = "";
    let turnReject: (error: Error) => void = () => undefined;
    let turnHandler: (message: JsonRpcMessage) => void = () => undefined;
    const cleanupTurn = () => {
      this.notificationHandlers.delete(turnHandler);
      this.activeNotificationRejects.delete(turnReject);
    };

    const turnCompleted = new Promise<string>((resolve, reject) => {
      turnReject = reject;
      turnHandler = (message: JsonRpcMessage) => {
        if (message.method === "item/agentMessage/delta") {
          deltaText += extractDelta(message.params);
          return;
        }

        if (message.method === "item/completed") {
          const item = assertRecord(message.params).item;
          const completedText = extractAgentText(item);
          if (completedText) {
            agentText = completedText;
          }
          return;
        }

        if (message.method !== "turn/completed") {
          return;
        }

        const turn = extractTurnStatus(message.params);
        if (turnId && turn.id && turn.id !== turnId) {
          return;
        }

        cleanupTurn();
        if (turn.status === "failed") {
          reject(new ProviderExecutionError("provider_error", turn.errorMessage || "codex turn failed"));
          return;
        }
        resolve(agentText || deltaText);
      };
      this.notificationHandlers.add(turnHandler);
      this.activeNotificationRejects.add(turnReject);
    });

    const turnParams: Record<string, unknown> = {
      threadId,
      input: [{ type: "text", text: prompt }],
      approvalPolicy: "never",
      sandboxPolicy: { type: "readOnly" }
    };
    if (cwd) {
      turnParams.cwd = cwd;
    }
    if (model) {
      turnParams.model = model;
    }
    if (reasoningEffort) {
      turnParams.effort = reasoningEffort;
    }

    try {
      const turnResult = await this.request("turn/start", turnParams);
      turnId = extractTurnId(turnResult);
      if (!turnId) {
        throw new ProviderExecutionError("provider_error", "codex app-server did not return a turn id");
      }

      return await turnCompleted;
    } catch (error) {
      cleanupTurn();
      throw error;
    }
  }

  close() {
    const closeError = new ProviderExecutionError("provider_error", "codex app-server client closed");
    for (const pending of this.pending.values()) {
      pending.reject(closeError);
    }
    this.pending.clear();
    for (const reject of this.activeNotificationRejects) {
      reject(closeError);
    }
    this.activeNotificationRejects.clear();
    this.notificationHandlers.clear();
    this.proc.stdin.end();
    this.proc.kill();
  }

  private request(method: string, params: Record<string, unknown>) {
    const id = this.nextId++;
    const payload = { method, id, params };
    return new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  private notify(method: string, params: Record<string, unknown>) {
    this.proc.stdin.write(`${JSON.stringify({ method, params })}\n`);
  }

  private handleLine(line: string) {
    if (!line.trim()) {
      return;
    }

    let message: JsonRpcMessage;
    try {
      message = JSON.parse(line) as JsonRpcMessage;
    } catch {
      return;
    }

    if (typeof message.id === "number" && (Object.hasOwn(message, "result") || message.error)) {
      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }

      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new ProviderExecutionError("provider_error", message.error.message || "codex app-server error"));
        return;
      }
      pending.resolve(message.result);
      return;
    }

    if (typeof message.id === "number" && message.method) {
      this.respondToServerRequest(message);
      return;
    }

    for (const handler of this.notificationHandlers) {
      handler(message);
    }
  }

  private respondToServerRequest(message: JsonRpcMessage) {
    const id = message.id;
    if (typeof id !== "number") {
      return;
    }

    if (
      message.method === "item/commandExecution/requestApproval" ||
      message.method === "item/fileChange/requestApproval"
    ) {
      this.proc.stdin.write(`${JSON.stringify({ id, result: { decision: "decline" } })}\n`);
      return;
    }

    this.proc.stdin.write(
      `${JSON.stringify({
        id,
        error: { code: -32601, message: `Unsupported Codex app-server request: ${message.method}` }
      })}\n`
    );
  }

  private rejectAll(error: Error) {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
    for (const reject of this.activeNotificationRejects) {
      reject(error);
    }
    this.activeNotificationRejects.clear();
    this.notificationHandlers.clear();
  }
}
