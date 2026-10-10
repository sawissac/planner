"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Square checkbox on radix `Checkbox`. Rest state is a `border-mid` box on the
 * page surface; checked and indeterminate fill with the accent and draw the
 * glyph in `--app-on-solid`.
 *
 * Not in compacto-ui yet — written to its contract (radix, `--app-*` only,
 * `data-slot`) so it can be upstreamed unchanged.
 *
 * @param props.checked - `true`, `false` or `"indeterminate"`.
 * @param props.onCheckedChange - Receives the next checked state.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group/checkbox peer inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-app-border-mid bg-app-bg transition-colors duration-(--motion-duration-fast) outline-none",
        "hover:border-app-border-accent focus-visible:ring-2 focus-visible:ring-app-accent/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-app-accent data-[state=checked]:bg-app-accent data-[state=checked]:text-app-on-solid",
        "data-[state=indeterminate]:border-app-accent data-[state=indeterminate]:bg-app-accent data-[state=indeterminate]:text-app-on-solid",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <Check
          className="hidden size-3.5 group-data-[state=checked]/checkbox:block"
          strokeWidth={3}
        />
        <Minus
          className="hidden size-3.5 group-data-[state=indeterminate]/checkbox:block"
          strokeWidth={3}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
