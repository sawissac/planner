import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";
import * as ui from "@/lib/ui-styles";

/**
 * Rail control geometry: a 36px square hit area, borderless, accent tint when
 * active.
 *
 * The `before` bar is the state marker. It grows from zero height rather than
 * appearing at full size, so switching between controls animates without ever
 * shifting the icon it sits beside — a marker that reserved no space would
 * nudge the glyph on every selection.
 */
const sidebarRailButtonVariants = cva(
  "relative flex shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-(--motion-duration-fast) before:absolute before:top-1/2 before:h-0 before:w-[2px] before:-translate-y-1/2 before:rounded-full before:bg-app-accent before:transition-all before:duration-(--motion-duration-fast) hover:bg-app-hover hover:text-app-accent focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 data-active:bg-app-selected data-active:text-app-accent data-active:before:h-5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      side: {
        left: "before:left-0",
        right: "before:right-0",
      },
      size: {
        default: "size-9 [&_svg:not([class*='size-'])]:size-4",
        sm: "size-8 [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: { side: "left", size: "default" },
  },
);

/**
 * Decorative wash a panel can carry so its surface reads as a distinct layer
 * from the work area rather than flat filler. The classes live in the
 * package's `texture.css`; the pattern is drawn on a `::before` from
 * `--app-accent`, so it follows the active palette, and its strength is
 * `--app-texture-alpha`.
 */
type SidebarTexture = "none" | "checker" | "dots" | "graph";

/** Class for a texture, or nothing for `"none"` so the panel stays flat. */
function textureClass(texture: SidebarTexture | undefined) {
  return texture && texture !== "none"
    ? `compacto-texture--${texture}`
    : undefined;
}

/**
 * Fixed-width vertical icon strip, pinned to the edge of the window: a brand
 * mark, the section switches, and the app-level controls.
 *
 * 48px wide by default, which is the 36px control plus its breathing room —
 * narrow enough that it costs nothing against the work area, wide enough that
 * every control is a comfortable target.
 *
 * Renders a `<nav>`, so give it an `aria-label`: on a page with more than one
 * navigation landmark, an unnamed one is indistinguishable from the others.
 * When the rail's controls switch a single pane, mark them up as a
 * {@link SidebarRailTablist} instead of leaving them loose children.
 *
 * @param props.side - Which edge the rail sits on. Moves the border to the
 *   facing side; pass the same value to each {@link SidebarRailButton} so
 *   their state markers point inward too.
 * @param props.texture - Decorative wash over the rail surface. Off by
 *   default, and the apps leave it off: the rail is chrome, and a flat strip
 *   beside a textured pane is what makes the pane read as a surface.
 * @param props.className - Extra classes merged onto the rail.
 *
 * @example
 * ```tsx
 * <SidebarRail aria-label="Primary">
 *   <Logo />
 *   <SidebarRailTablist aria-label="Sections" aria-orientation="vertical">
 *     {tabs.map((t) => (
 *       <SidebarRailButton
 *         key={t.id}
 *         role="tab"
 *         aria-label={t.label}
 *         aria-selected={t.id === active}
 *         aria-controls="sidebar-pane"
 *         data-active={t.id === active || undefined}
 *         onClick={() => setActive(t.id)}
 *       >
 *         <t.Icon />
 *       </SidebarRailButton>
 *     ))}
 *   </SidebarRailTablist>
 *   <SidebarRailSpacer />
 *   <SidebarRailButton aria-label="Settings" onClick={openSettings}>
 *     <Settings />
 *   </SidebarRailButton>
 * </SidebarRail>
 * ```
 */
function SidebarRail({
  className,
  side = "left",
  texture = "none",
  ...props
}: React.ComponentProps<"nav"> & {
  side?: "left" | "right";
  texture?: SidebarTexture;
}) {
  return (
    <nav
      data-slot="sidebar-rail"
      data-side={side}
      data-texture={texture}
      className={cn(
        "flex h-full w-12 shrink-0 flex-col items-center gap-1 bg-app-sidebar py-2",
        side === "left"
          ? "border-r border-app-border"
          : "border-l border-app-border",
        textureClass(texture),
        className,
      )}
      {...props}
    />
  );
}

/**
 * Groups the rail controls that select a pane, as a vertical tablist.
 *
 * Only for controls that switch one shared pane — a rail also holds buttons
 * that open a dialog or sign you out, and those are not tabs. Keep them
 * outside this wrapper.
 *
 * @param props.className - Extra classes merged onto the group.
 */
function SidebarRailTablist({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-rail-tablist"
      role="tablist"
      aria-orientation="vertical"
      className={cn("flex flex-col items-center gap-1", className)}
      {...props}
    />
  );
}

/**
 * One rail control.
 *
 * Icon-only by design, so it carries no visible text — give it an `aria-label`
 * and, ideally, a {@link Tooltip}. Mark the current one with `data-active`;
 * that drives both the tint and the edge marker. When the control is a tab,
 * set `aria-selected` and `aria-controls` alongside it, since `data-active` is
 * a styling hook and says nothing to a screen reader.
 *
 * @param props.side - Which edge the state marker sits on. Match the rail's
 *   own `side` so the marker points into the work area.
 * @param props.size - `default` is the 36px control; `sm` is 32px for a denser
 *   rail.
 * @param props.asChild - Render the caller's child element instead of a
 *   `<button>`, keeping these styles — for a rail control that is really a
 *   link.
 * @param props.className - Extra classes merged onto the control. This is how
 *   you recolor a status control (a green save tick, a red error dot) without
 *   a variant for every state.
 */
function SidebarRailButton({
  className,
  side,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof sidebarRailButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="sidebar-rail-button"
      className={cn(sidebarRailButtonVariants({ side, size, className }))}
      {...props}
    />
  );
}

/**
 * Pushes everything after it to the far end of the rail — the divide between
 * what the app is for and what the app is.
 */
function SidebarRailSpacer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-rail-spacer"
      aria-hidden
      className={cn("flex-1", className)}
      {...props}
    />
  );
}

/**
 * The pane the rail selects: a full-height column on the `app-sidebar`
 * surface.
 *
 * Holds no chrome of its own. Compose {@link SidebarHeader},
 * {@link SidebarContent} and {@link SidebarFooter} inside it — same reasoning
 * as `DialogContent`, where keeping the padding and dividers in the parts is
 * what makes every instance read as the same object.
 *
 * Fills its parent edge to edge, so it drops straight into a
 * {@link ResizablePanel}.
 *
 * When the rail's controls are tabs, this is their tab panel: give it
 * `role="tabpanel"`, an `id` the tabs point `aria-controls` at, and an
 * `aria-label` naming the active section — no visible title necessarily does.
 *
 * @param props.texture - Decorative wash over the pane surface: `checker`,
 *   `dots` or `graph`, or `none` (default) for a flat panel. Drawn from the
 *   active palette's accent, behind the content, at `--app-texture-alpha`.
 *   {@link SidebarHeader} and {@link SidebarFooter} paint flat above it, so
 *   the wash reads as the content area's surface rather than the chrome's.
 *   The rail beside it usually stays flat too, and so should the work area —
 *   a texture under code or prose costs legibility for nothing.
 * @param props.className - Extra classes merged onto the pane.
 *
 * @example
 * ```tsx
 * <Sidebar id="sidebar-pane" role="tabpanel" aria-label={sectionLabel}>
 *   <SidebarHeader>
 *     <SidebarTitle>Collections</SidebarTitle>
 *     <Button size="icon-sm" variant="ghost" aria-label="New"><Plus /></Button>
 *   </SidebarHeader>
 *   <SidebarContent>
 *     <SidebarGroup>
 *       <SidebarGroupLabel>Recent</SidebarGroupLabel>
 *       {items.map((i) => (
 *         <SidebarItem key={i.id} data-selected={i.id === openId || undefined}>
 *           {i.name}
 *         </SidebarItem>
 *       ))}
 *     </SidebarGroup>
 *   </SidebarContent>
 * </Sidebar>
 * ```
 */
function Sidebar({
  className,
  texture = "none",
  ...props
}: React.ComponentProps<"div"> & { texture?: SidebarTexture }) {
  return (
    <div
      data-slot="sidebar"
      data-texture={texture}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-app-sidebar",
        textureClass(texture),
        className,
      )}
      {...props}
    />
  );
}

/**
 * Title bar at the top of a pane: 48px tall, hairline divider beneath, with
 * room for a title and the actions that belong to the whole pane.
 *
 * The same height as the rail's own top control, so the two line up across the
 * seam rather than missing each other by a few pixels.
 *
 * @param props.className - Extra classes merged onto the bar.
 */
function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn(
        // `relative` + an opaque background so the bar paints ABOVE the pane's
        // texture ::before. A pattern under a search field or a title reads as
        // noise; the wash belongs to the content area, not the chrome.
        "relative flex h-12 shrink-0 items-center gap-2 border-b border-app-border bg-app-sidebar px-3",
        className,
      )}
      {...props}
    />
  );
}

/** Pane title. Takes the remaining width and truncates rather than wrapping. */
function SidebarTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="sidebar-title"
      className={cn(
        "min-w-0 flex-1 truncate font-title text-[12px] font-semibold text-app-bright",
        className,
      )}
      {...props}
    />
  );
}

/** The scrolling region between header and footer. */
function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn("min-h-0 flex-1 overflow-y-auto", className)}
      {...props}
    />
  );
}

/** Pinned bar at the bottom of a pane. Hairline divider above. */
function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn(
        // Same reasoning as SidebarHeader: a pinned bar stays flat above the wash.
        "relative flex shrink-0 items-center gap-2 border-t border-app-border bg-app-sidebar px-3 py-2",
        className,
      )}
      {...props}
    />
  );
}

/** A titled block of rows inside {@link SidebarContent}. */
function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn("flex flex-col gap-1 p-2", className)}
      {...props}
    />
  );
}

/**
 * Heading above a {@link SidebarGroup} — the `label` recipe, so a section
 * heading here matches one anywhere else in the system.
 *
 * Renders a plain div: it labels a group of controls, not a document section,
 * and a heading level here would land in the page outline claiming more than
 * it means.
 */
function SidebarGroupLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(ui.label, "px-1 pt-1 pb-0.5", className)}
      {...props}
    />
  );
}

/**
 * A selectable row — the `row` recipe, which already carries the hover and
 * `data-selected` treatment the rest of the system uses.
 *
 * Mark the current row with `data-selected`. Renders a `<button>` unless you
 * pass `asChild`, which is what you want for a row that is really a link.
 *
 * @param props.asChild - Render the caller's child element instead of a
 *   `<button>`.
 * @param props.className - Extra classes merged onto the row.
 */
function SidebarItem({
  className,
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="sidebar-item"
      // Only a real <button> takes a type, and it needs one: inside a form the
      // default is "submit", which would post the form on every row click.
      type={asChild ? undefined : (type ?? "button")}
      className={cn(ui.row, "text-[12px]", className)}
      {...props}
    />
  );
}

/** Hairline divider between groups inside a pane. */
function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-separator"
      role="separator"
      className={cn("mx-2 h-px shrink-0 bg-app-border", className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarItem,
  SidebarRail,
  SidebarRailButton,
  sidebarRailButtonVariants,
  SidebarRailSpacer,
  SidebarRailTablist,
  SidebarSeparator,
  type SidebarTexture,
  SidebarTitle,
};
