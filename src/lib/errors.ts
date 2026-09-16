function safeSerialize(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function describeUnknownError(error: unknown, fallback = "Erro desconhecido.") {
  if (error instanceof Error) return error.message || error.name || fallback;
  if (typeof error === "string" && error.trim()) return error.trim();

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
      name?: unknown;
    };
    const message = typeof candidate.message === "string" && candidate.message.trim()
      ? candidate.message.trim()
      : typeof candidate.name === "string" ? candidate.name : null;
    const extras = [candidate.code, candidate.details, candidate.hint]
      .filter((value) => value !== null && value !== undefined && value !== "")
      .map((value) => typeof value === "string" ? value : safeSerialize(value))
      .filter((value): value is string => Boolean(value));
    const description = [message, ...extras].filter(Boolean).join(" | ");
    if (description) return description.slice(0, 1800);
  }

  return fallback;
}
