"use client";

import { CalendarRange, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function fmt(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export type DateRangeValue = { from: Date; to: Date };

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 180 days", days: 180 },
  { label: "Last 365 days", days: 365 },
];

export function presetRange(days: number): DateRangeValue {
  const now = new Date();
  const to = endOfDay(now);
  const from = startOfDay(now);
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

function diffDays(v: DateRangeValue): number {
  const ms = endOfDay(v.to).getTime() - startOfDay(v.from).getTime();
  return Math.round(ms / 86400000) + 1;
}

function matchPreset(v: DateRangeValue): number | null {
  const today = startOfDay(new Date()).getTime();
  if (startOfDay(v.to).getTime() !== today) {
    return null;
  }
  const days = diffDays(v);
  return PRESETS.find((p) => p.days === days)?.days ?? null;
}

export function DateRangeFilter({
  value,
  onChange,
  compact = false,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const presetDays = matchPreset(value);
  const label = presetDays ? `Last ${presetDays} days` : `${fmt(value.from)} → ${fmt(value.to)}`;

  const onSelect = (r: DateRange | undefined) => {
    if (!r?.from) {
      return;
    }
    const from = startOfDay(r.from);
    const to = endOfDay(r.to ?? r.from);
    onChange({ from, to });
  };

  const body = (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex flex-wrap gap-1 px-1">
        {PRESETS.map((p) => (
          <Button
            key={p.days}
            size="sm"
            variant={presetDays === p.days ? "secondary" : "ghost"}
            onClick={() => {
              onChange(presetRange(p.days));
              setOpen(false);
            }}
            className="h-7 text-xs"
          >
            {p.label}
          </Button>
        ))}
      </div>
      <Calendar
        mode="range"
        selected={{ from: value.from, to: value.to }}
        onSelect={onSelect}
        numberOfMonths={isMobile ? 1 : 2}
        defaultMonth={value.from}
      />
    </div>
  );

  const trigger = (
    <button
      type="button"
      className={cn(
        buttonVariants({
          variant: "outline",
          size: compact ? "icon-sm" : "lg",
        }),
        !compact && "gap-2",
      )}
      title={`Range: ${label}`}
      aria-label={`Range: ${label}`}
    >
      <CalendarRange className="size-4" />
      {!compact && (
        <>
          {label}
          <ChevronDown className="size-4" />
        </>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="border-b border-border">
            <DrawerTitle>Date range</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto pb-4">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-auto p-0" align="end">
        {body}
      </PopoverContent>
    </Popover>
  );
}
