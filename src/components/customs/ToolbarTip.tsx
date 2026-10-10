"use client";

import type { LucideIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

/**
 * Rich toolbar tooltip on compacto's `Tooltip`: an accent-tinted icon chip,
 * a title, a one-line hint and, when the action has one, its keyboard
 * shortcut as key caps. The child is wrapped in a span trigger, so it composes
 * with other radix triggers (a `TabsTrigger`, a `DropdownMenuTrigger`) without
 * overwriting their `data-state`.
 *
 * @param props.icon - Glyph repeated in the chip, tying the tip to its button.
 * @param props.title - What the control is.
 * @param props.hint - Why you'd press it — one short line.
 * @param props.keys - Shortcut keys, rendered as caps (`["Shift", "Z"]`).
 * @param props.side - Which side of the trigger the tip opens on.
 */
export function ToolbarTip({
  icon: Icon,
  title,
  hint,
  keys,
  side = "bottom",
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  keys?: string[];
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      {/* A wrapper, not asChild on the control itself: the tooltip trigger
          writes its own data-state, which would clobber a tab's "active" or
          a menu trigger's "open". Focus still bubbles, so keyboard users get
          the tip too. */}
      <TooltipTrigger asChild>
        <span data-slot="toolbar-tip-trigger" className="flex h-full items-center">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-60 p-2" data-slot="toolbar-tip">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border tint-current text-app-accent"
          >
            <Icon className="size-3.5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <span className="font-title text-[12px] font-semibold text-app-bright">{title}</span>
              {keys && (
                <span className="ml-auto flex items-center gap-0.5">
                  {keys.map((k) => (
                    <kbd
                      key={k}
                      className={cn(
                        "inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-app-border-mid bg-app-bg px-1",
                        "font-mono text-[9px] leading-none text-app-dim",
                      )}
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              )}
            </span>
            <span className="font-description text-[11px] leading-snug text-app-dim">{hint}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
