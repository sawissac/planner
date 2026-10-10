"use client";

import { ChevronRight, Circle } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Menu parts compacto-ui's `dropdown-menu` does not ship yet — separators,
 * labels, radio groups and submenus — written to the same contract (radix,
 * `--app-*` tokens only, `data-slot` on every node) so they sit inside a
 * compacto `DropdownMenuContent` without looking foreign.
 *
 * Kept out of `dropdown-menu.tsx` on purpose: that file is a verbatim copy of
 * the registry item, and `/cui-sync` would overwrite local additions. Upstream
 * these to compacto-ui and delete this file once they land there.
 */

/** Hairline between groups of items. */
function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-app-border", className)}
      {...props}
    />
  );
}

/** Uppercase section label above a group of items. */
function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn(
        "px-2 py-1.5 font-title text-[11px] font-semibold tracking-[0.14em] text-app-dim uppercase",
        className,
      )}
      {...props}
    />
  );
}

/** Groups related items for assistive tech. */
function DropdownMenuGroup(props: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

/** Single-choice group; pair with {@link DropdownMenuRadioItem}. */
function DropdownMenuRadioGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>,
) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

/**
 * One option in a {@link DropdownMenuRadioGroup}; the active one shows an
 * accent dot in the leading gutter.
 */
function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-7 text-sm transition-colors duration-(--motion-duration-fast) outline-none select-none",
        "focus:bg-app-selected focus:text-app-bright",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 grid place-items-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle className="size-2 fill-app-accent text-app-accent" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

/** Nested menu root; compose {@link DropdownMenuSubTrigger} + {@link DropdownMenuSubContent}. */
function DropdownMenuSub(props: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

/** Item that opens a submenu; shows a trailing chevron. */
function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors duration-(--motion-duration-fast) outline-none select-none",
        "focus:bg-app-selected focus:text-app-bright data-[state=open]:bg-app-selected data-[state=open]:text-app-bright",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-3.5! text-app-dim" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

/** The submenu panel — same surface as `DropdownMenuContent`. */
function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        sideOffset={4}
        className={cn(
          "z-200 max-h-(--radix-dropdown-menu-content-available-height) min-w-32 overflow-y-auto rounded-lg border border-app-border-mid bg-app-panel p-1 text-app-text",
          "data-[state=open]:animate-[compacto-fade-up_0.15s_ease]",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
};
