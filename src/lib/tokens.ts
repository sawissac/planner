/**
 * Rough LLM token count for Markdown: about four characters per token, the
 * usual rule of thumb for English text. Good enough to size a prompt, not
 * to bill one.
 */
export function estimateTokens(text: string | undefined): number {
  const t = text?.trim() ?? "";
  return t ? Math.ceil(t.length / 4) : 0;
}

/** `1234` → `1.2k`; below a thousand, the plain number. */
export function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}
