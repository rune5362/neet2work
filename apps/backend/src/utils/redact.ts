export function redactSensitiveText(value: string): string {
  return value
    .replace(/\b([a-z][a-z0-9+.-]*:\/\/[^:\s/@]+):([^@\s]+)@/gi, "$1:[redacted]@")
    .replace(
      /\b(database_url|database_password|password|passwd|pwd|secret|token|api[_-]?key)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1=[redacted]"
    );
}

export function formatErrorForLog(error: unknown): string {
  if (error instanceof Error) {
    return redactSensitiveText(error.stack ?? `${error.name}: ${error.message}`);
  }

  if (typeof error === "string") {
    return redactSensitiveText(error);
  }

  try {
    return redactSensitiveText(JSON.stringify(error));
  } catch {
    return redactSensitiveText(String(error));
  }
}
