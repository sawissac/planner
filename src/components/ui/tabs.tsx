"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Tabs root. Compose with {@link TabsList} of {@link TabsTrigger}s and one
 * {@link TabsContent} per tab.
 *
 * @param props.orientation - `"horizontal"` (default) runs the list across the
 *   top; `"vertical"` stacks it down the side. The triggers' active marker
 *   follows — an underline horizontally, a right-hand rule vertically.
 * @param props.className - Extra classes merged onto the wrapper.
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="body">
 *   <TabsList variant="line">
 *     <TabsTrigger value="body">Body</TabsTrigger>
 *     <TabsTrigger value="headers">Headers</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="body">…</TabsContent>
 *   <TabsContent value="headers">…</TabsContent>
 * </Tabs>
 * ```
 */
function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Trigger container. `default` is a filled segmented track; `line` is a bare
 * row where the active tab is marked by a rule instead of a pill; `nav` is an
 * icon-rail column — a fixed-width, bordered sidebar of full-width rows,
 * meant for `orientation="vertical"` (a settings dialog's section list, not a
 * compact in-page tab strip); `segmented` is a bordered button group of icon
 * triggers, stretching via flex to match whatever height
 * its sibling {@link TabsContent} ends up at so its border runs the full
 * height of the panel rather than stopping at its own last row.
 *
 * `nav`'s height override is written as
 * `group-data-[orientation=vertical]/tabs:data-[variant=nav]:h-auto`, not a
 * plain `h-auto` — the base string's `group-data-[orientation=vertical]/tabs:h-fit`
 * carries an ancestor attribute selector, so it is more specific than a bare
 * `h-auto` class and wins regardless of class-list order. Matching that same
 * modifier shape (plus the element's own `data-[variant=nav]`) is what
 * actually outranks it.
 */
const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-app-dim group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-app-hover",
        line: "gap-1 bg-transparent",
        nav: "group-data-[orientation=vertical]/tabs:data-[variant=nav]:h-auto w-40 shrink-0 items-stretch justify-start gap-0.5 overflow-y-auto rounded-none border-r border-app-border-mid bg-transparent p-2",
        segmented:
          "group-data-[orientation=horizontal]/tabs:data-[variant=segmented]:h-8 items-stretch divide-x divide-app-border overflow-hidden rounded-md border border-app-border bg-app-bg p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/**
 * Holds the triggers.
 *
 * @param props.variant - `"default"` gives the filled segmented track;
 *   `"line"` drops the track and marks the active tab with a rule, which reads
 *   better when the tabs sit directly on a panel edge; `"nav"` is the
 *   icon-rail column for a vertical section list; `"segmented"` is a bordered
 *   button group of square icon triggers split by hairlines, the active one
 *   accent-tinted.
 * @param props.className - Extra classes merged onto the list.
 */
function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

/**
 * One tab button.
 *
 * @param props.value - Matches the `value` on the corresponding
 *   {@link TabsContent}.
 * @param props.className - Extra classes merged onto the trigger.
 */
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-app-dim transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-app-bright focus-visible:border-app-accent focus-visible:ring-[3px] focus-visible:ring-app-accent/50 focus-visible:outline-1 focus-visible:outline-app-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "group-data-[variant=default]/tabs-list:data-[state=active]:bg-app-panel group-data-[variant=default]/tabs-list:data-[state=active]:text-app-bright",
        "group-data-[variant=line]/tabs-list:data-[state=active]:text-app-bright",
        "after:absolute after:bg-app-accent after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        "group-data-[variant=segmented]/tabs-list:h-full group-data-[variant=segmented]/tabs-list:w-7.5 group-data-[variant=segmented]/tabs-list:flex-none group-data-[variant=segmented]/tabs-list:rounded-none group-data-[variant=segmented]/tabs-list:border-0 group-data-[variant=segmented]/tabs-list:px-0 group-data-[variant=segmented]/tabs-list:focus-visible:ring-inset group-data-[variant=segmented]/tabs-list:after:hidden group-data-[variant=segmented]/tabs-list:hover:bg-app-hover group-data-[variant=segmented]/tabs-list:data-[state=active]:bg-app-accent-faint group-data-[variant=segmented]/tabs-list:data-[state=active]:text-app-accent",
        "group-data-[variant=nav]/tabs-list:h-auto group-data-[variant=nav]/tabs-list:flex-none group-data-[variant=nav]/tabs-list:justify-start group-data-[variant=nav]/tabs-list:gap-2 group-data-[variant=nav]/tabs-list:rounded-md group-data-[variant=nav]/tabs-list:px-2.5 group-data-[variant=nav]/tabs-list:py-1.5 group-data-[variant=nav]/tabs-list:font-title group-data-[variant=nav]/tabs-list:text-[11px] group-data-[variant=nav]/tabs-list:font-semibold group-data-[variant=nav]/tabs-list:tracking-[0.08em] group-data-[variant=nav]/tabs-list:uppercase group-data-[variant=nav]/tabs-list:after:hidden group-data-[variant=nav]/tabs-list:hover:bg-app-hover group-data-[variant=nav]/tabs-list:data-[state=active]:bg-app-accent-faint group-data-[variant=nav]/tabs-list:data-[state=active]:text-app-accent",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The panel for one tab.
 *
 * @param props.value - Matches the `value` on its {@link TabsTrigger}.
 * @param props.className - Extra classes merged onto the panel.
 */
function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, tabsListVariants, TabsTrigger };
