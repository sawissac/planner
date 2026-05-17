"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Clock } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppDispatch } from "@/lib/hooks";
import { updateTodo } from "@/lib/todoSlice";
import { cn } from "@/lib/utils";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

function to12(h24: number): { h12: number; ampm: "AM" | "PM" } {
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return { h12, ampm };
}

function to24(h12: number, ampm: "AM" | "PM"): number {
  const h = h12 % 12;
  return ampm === "PM" ? h + 12 : h;
}

function fmtTime12(d: Date): string {
  const { h12, ampm } = to12(d.getHours());
  return `${pad(h12)}:${pad(d.getMinutes())} ${ampm}`;
}

function fmtFull(d: Date): string {
  return `${fmtDate(d)} ${fmtTime12(d)}`;
}

function withTime(base: Date, h24: number, m: number): Date {
  const x = new Date(base);
  x.setHours(h24, m, 0, 0);
  return x;
}

function NumberDropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: number;
  options: number[];
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        itemRefs.current.get(value)?.scrollIntoView({ block: "center" });
      });
    }
  }, [open, value]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label={ariaLabel}
            className="h-8 w-16 justify-between gap-1 px-2 text-base font-medium tabular-nums"
          >
            {pad(value)}
            <ChevronDown className="size-3 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="center" className="max-h-56 w-16 min-w-0 overflow-y-auto p-1">
        {options.map((n) => (
          <DropdownMenuItem
            key={n}
            ref={(el) => {
              if (el) itemRefs.current.set(n, el);
              else itemRefs.current.delete(n);
            }}
            onClick={() => onChange(n)}
            className={cn(
              "justify-center tabular-nums",
              n === value && "bg-accent text-accent-foreground",
            )}
          >
            {pad(n)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function AmPmToggle({
  value,
  onChange,
}: {
  value: "AM" | "PM";
  onChange: (v: "AM" | "PM") => void;
}) {
  return (
    <div className="inline-flex h-8 overflow-hidden rounded-md border border-border text-xs font-medium">
      {(["AM", "PM"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "w-8 transition-colors",
            value === v
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (h24: number, m: number) => void;
}) {
  const { h12, ampm } = to12(value.getHours());
  const min = value.getMinutes();

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {label}
      </span>
      <div className="inline-flex items-center gap-1.5">
        <NumberDropdown
          ariaLabel={`${label} hour`}
          value={h12}
          options={HOURS}
          onChange={(v) => onChange(to24(v, ampm), min)}
        />
        <span className="text-base font-medium text-muted-foreground">:</span>
        <NumberDropdown
          ariaLabel={`${label} minute`}
          value={min}
          options={MINUTES}
          onChange={(v) => onChange(value.getHours(), v)}
        />
        <AmPmToggle
          value={ampm}
          onChange={(v) => onChange(to24(h12, v), min)}
        />
      </div>
    </div>
  );
}

export function DateRangeCell({
  id,
  from,
  to,
}: {
  id: string;
  from: number;
  to: number;
}) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const range: DateRange = { from: fromDate, to: toDate };

  const commit = (f: Date, t: Date) => {
    dispatch(
      updateTodo({ id, completedFrom: f.getTime(), completedTo: t.getTime() }),
    );
  };

  const onSelect = (r: DateRange | undefined) => {
    if (!r?.from) return;
    const f = withTime(r.from, fromDate.getHours(), fromDate.getMinutes());
    const t = withTime(r.to ?? r.from, toDate.getHours(), toDate.getMinutes());
    commit(f, t);
  };

  const label = `${fmtFull(fromDate)} → ${fmtFull(toDate)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-full justify-start px-2 text-xs font-normal text-muted-foreground"
          >
            <CalendarDays className="size-3" />
            <span className="truncate">{label}</span>
          </Button>
        }
      />
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <Calendar
          mode="range"
          selected={range}
          onSelect={onSelect}
          numberOfMonths={2}
          defaultMonth={range.from}
        />
        <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
          <TimeRow
            label="Start"
            value={fromDate}
            onChange={(h, m) => commit(withTime(fromDate, h, m), toDate)}
          />
          <TimeRow
            label="End"
            value={toDate}
            onChange={(h, m) => commit(fromDate, withTime(toDate, h, m))}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
