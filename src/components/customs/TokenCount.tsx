import { cn } from "@/lib/cn";
import { estimateTokens, formatTokens } from "@/lib/tokens";
import * as ui from "@/lib/ui-styles";

/**
 * Estimated token usage of Markdown handed to an AI agent, e.g. `~1.2k tokens`.
 *
 * With `base`, the count is `base` + `text` and the label spells out both —
 * a comment's context is the thought plus the comment (that is what its
 * "Copy context" request returns).
 *
 * @param text - Markdown being counted (the draft while editing).
 * @param base - Context that always comes along, e.g. the saved thought.
 * @param baseLabel - Name for `base` in the label. Defaults to "thought".
 * @param textLabel - Name for `text` in the label. Defaults to "comment".
 * @param brief - Show only the total; the breakdown moves to the tooltip.
 */
export function TokenCount({
  text,
  base,
  baseLabel = "thought",
  textLabel = "comment",
  brief = false,
  className,
  "data-testid": testId,
}: {
  text: string;
  base?: string;
  baseLabel?: string;
  textLabel?: string;
  brief?: boolean;
  className?: string;
  "data-testid"?: string;
}) {
  const own = estimateTokens(text);
  const total = base === undefined ? own : own + estimateTokens(base);
  const totalText = `~${formatTokens(total)} tokens`;
  const breakdown =
    base === undefined
      ? undefined
      : `${baseLabel} ${formatTokens(total - own)} + ${textLabel} ${formatTokens(own)}`;

  return (
    <span
      data-testid={testId}
      title={breakdown ? `Estimated tokens: ${breakdown}` : "Estimated tokens (~4 characters each)"}
      className={cn(ui.meta, "shrink-0 tabular-nums", className)}
    >
      {breakdown && !brief ? `${breakdown} = ${totalText}` : totalText}
    </span>
  );
}
