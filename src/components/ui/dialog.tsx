"use client";

import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

/**
 * Dialog root. Compose {@link DialogTrigger} with {@link DialogContent}, and
 * inside it {@link DialogHeader} / {@link DialogBody} / {@link DialogFooter}.
 *
 * @example
 * ```tsx
 * <Dialog>
 *   <DialogTrigger asChild>
 *     <Button variant="outline">Rename</Button>
 *   </DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Rename collection</DialogTitle>
 *     </DialogHeader>
 *     <DialogBody>
 *       <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" />
 *     </DialogBody>
 *     <DialogFooter>
 *       <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
 *       <Button onClick={save}>Save</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

/** The control that opens the dialog. Pass `asChild` to keep your own element. */
function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

/** Portal host. {@link DialogContent} mounts one for you. */
function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

/** Closes the dialog. Wrap a `Button` with `asChild` for a Cancel action. */
function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** The scrim behind the panel. {@link DialogContent} renders one for you. */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-200 bg-black/65",
        "data-[state=closed]:animate-[compacto-fade-out_0.12s_ease] data-[state=open]:animate-[compacto-fade-in_0.15s_ease]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The dialog panel: a `border-2 app-border-mid` surface on `app-panel`,
 * rounded, no drop shadow, a short fade-and-rise entrance.
 *
 * The panel carries **no padding of its own** — {@link DialogHeader},
 * {@link DialogBody} and {@link DialogFooter} each bring their own compact
 * `px-3` gutter and hairline dividers, which is what keeps every dialog in an
 * app reading as the same object. Width defaults to 400px; pass
 * `w-[min(…px,92vw)]` in `className` for a wider one.
 *
 * The close X lives in {@link DialogHeader}, not here, so it always sits on the
 * title row rather than floating in the panel corner.
 *
 * @param props.className - Extra classes merged onto the panel — almost always
 *   a width.
 */
function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-200 flex max-h-[calc(100dvh-2rem)] w-[min(400px,92vw)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-lg border-2 border-app-border-mid bg-app-panel text-app-text outline-none",
          "data-[state=closed]:animate-[compacto-fade-out_0.15s_ease] data-[state=open]:animate-[compacto-fade-up_0.18s_ease]",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/**
 * Title bar: children (usually a {@link DialogTitle}, optionally with a
 * {@link DialogDescription} stacked under it) fill the row; the borderless
 * close X sits at the end. Hairline divider below.
 *
 * @param props.showCloseButton - Render the X. Turn it off for dialogs whose
 *   footer already carries an explicit Cancel and must not be dismissed
 *   casually — destructive confirms, forms with unsaved input.
 * @param props.closeLabel - Accessible name for the close X. English by
 *   default; pass a translated string from the call site.
 * @param props.className - Extra classes merged onto the bar.
 */
function DialogHeader({
  className,
  showCloseButton = true,
  closeLabel = "Close",
  children,
  "data-testid": testId,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
  closeLabel?: string;
  /**
   * Lands on the bar. The close X derives `${testId}-close-button` from it.
   * Declared explicitly because React's `ComponentProps` does not admit
   * `data-*` keys even though JSX does.
   */
  "data-testid"?: string;
}) {
  return (
    <div
      data-slot="dialog-header"
      data-testid={testId}
      className={cn(
        "flex shrink-0 items-center gap-2 border-b border-app-border px-3 py-1.5",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
      {showCloseButton && (
        <DialogPrimitive.Close
          data-slot="dialog-close"
          data-testid={testId ? `${testId}-close-button` : undefined}
          aria-label={closeLabel}
          className="flex size-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-app-dim transition-colors duration-(--motion-duration-fast) hover:bg-app-hover hover:text-app-bright focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none disabled:pointer-events-none"
        >
          <XIcon size={14} aria-hidden />
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

/** Scrollable content region between the title bar and the footer. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("min-h-0 flex-1 overflow-y-auto px-3 py-2", className)}
      {...props}
    />
  );
}

/**
 * Action row, right-aligned, hairline divider above.
 *
 * Direct `Button` children are normalised to the compact footer geometry
 * (h-8, 11px uppercase, tracked) so callers keep using `variant` for role
 * without having to restate size on every dialog.
 *
 * @param props.showCloseButton - Append a plain Close button. For a dialog
 *   that only reports something and has no action to confirm.
 * @param props.closeLabel - Text and accessible name for that button. English
 *   by default; pass a translated string from the call site.
 * @param props.className - Extra classes merged onto the row.
 */
function DialogFooter({
  className,
  showCloseButton = false,
  closeLabel = "Close",
  children,
  "data-testid": testId,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
  closeLabel?: string;
  /**
   * Lands on the row. A rendered Close button derives
   * `${testId}-close-button` from it. Declared explicitly because React's
   * `ComponentProps` does not admit `data-*` keys even though JSX does.
   */
  "data-testid"?: string;
}) {
  return (
    <div
      data-slot="dialog-footer"
      data-testid={testId}
      className={cn(
        "flex shrink-0 items-center justify-end gap-2 border-t border-app-border px-3 py-1.5",
        "[&>button]:h-8 [&>button]:px-3.5 [&>button]:text-[11px] [&>button]:font-semibold [&>button]:tracking-[0.07em] [&>button]:uppercase",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button
            variant="outline"
            aria-label={closeLabel}
            data-testid={testId ? `${testId}-close-button` : undefined}
          >
            {closeLabel}
          </Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

/** The dialog's accessible name. Required by Radix — never omit it. */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "truncate font-display text-[13px] leading-6 font-semibold tracking-[-0.01em] text-app-bright",
        className,
      )}
      {...props}
    />
  );
}

/** Secondary line under a {@link DialogTitle}. */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-[12px] leading-relaxed text-app-dim", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
