"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * On/off switch on radix `Switch`. Off is a `border-mid` track; on fills the
 * track with the accent. The thumb slides — no scale, no shadow.
 *
 * Not in compacto-ui yet — written to its contract (radix, `--app-*` only,
 * `data-slot`) so it can be upstreamed unchanged.
 *
 * @param props.checked - Controlled state.
 * @param props.onCheckedChange - Receives the next state.
 * @param props.thumbClassName - Extra classes for the thumb.
 */
function Switch({
  className,
  thumbClassName,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { thumbClassName?: string }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-app-border-mid transition-colors duration-(--motion-duration-fast) outline-none",
        "focus-visible:ring-2 focus-visible:ring-app-accent/30 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-app-accent",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 translate-x-0.5 rounded-full bg-app-panel transition-transform duration-(--motion-duration-fast) data-[state=checked]:translate-x-[18px]",
          thumbClassName,
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
