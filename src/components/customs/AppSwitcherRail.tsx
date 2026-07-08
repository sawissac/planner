"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Slim full-height rail on the far left of the app shell for jumping between
 * the sibling wauxai apps. Collapsible: expanded shows icon + label, collapsed
 * shows icon-only with a tooltip on hover. Planner's own icon is an internal
 * `Link` (no full reload); the toolkits icon is a real cross-origin redirect,
 * so its target comes from an env var rather than being hardcoded.
 */
export function AppSwitcherRail() {
  const [open, setOpen] = useState(false);
  const toolkitsUrl = process.env.NEXT_PUBLIC_TOOLKITS_URL;

  return (
    <TooltipProvider delay={150}>
      <div
        className={cn(
          "flex shrink-0 flex-col gap-1 border-r border-border bg-sidebar py-3 transition-[width] duration-200",
          open ? "w-40 px-2" : "w-12 items-center px-0",
        )}
      >
        {open ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
            aria-label="Collapse"
            className="justify-start gap-2 text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
            Collapse
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setOpen(true)}
                  aria-label="Expand"
                >
                  <ChevronRight className="size-4" />
                </Button>
              }
            />
            <TooltipContent side="right">Expand</TooltipContent>
          </Tooltip>
        )}

        {toolkitsUrl && (
          <RailLink
            open={open}
            href={toolkitsUrl}
            label="WauxAiStudio"
            iconSrc="/toolkits-logo.svg"
            external
          />
        )}
        <RailLink open={open} href="/" label="Planner" iconSrc="/logo.svg" />
      </div>
    </TooltipProvider>
  );
}

function RailLink({
  open,
  href,
  label,
  iconSrc,
  external,
}: {
  open: boolean;
  href: string;
  label: string;
  iconSrc: string;
  external?: boolean;
}) {
  const linkProps = external ? { href, target: "_blank", rel: "noopener noreferrer" } : undefined;
  const icon = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={iconSrc} alt="" className="size-6 shrink-0" />
  );

  if (open) {
    const content = (
      <>
        {icon}
        <span className="truncate text-sm font-medium">{label}</span>
      </>
    );
    return external ? (
      <a
        {...linkProps}
        aria-label={label}
        className="flex items-center gap-2 rounded-md p-1.5 opacity-80 transition-opacity hover:opacity-100"
      >
        {content}
      </a>
    ) : (
      <Link
        href={href}
        aria-label={label}
        className="flex items-center gap-2 rounded-md p-1.5 transition-opacity hover:opacity-80"
      >
        {content}
      </Link>
    );
  }

  const trigger = external ? (
    <a
      {...linkProps}
      aria-label={label}
      className="flex items-center justify-center rounded-md p-1.5 opacity-80 transition-opacity hover:opacity-100"
    >
      {icon}
    </a>
  ) : (
    <Link
      href={href}
      aria-label={label}
      className="flex items-center justify-center rounded-md p-1.5 transition-opacity hover:opacity-80"
    >
      {icon}
    </Link>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
