"use client";

import { Check, Palette } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { setAccentColor } from "@/stores/slices/settingsSlice";

const PRESETS = [
  { name: "Default", hex: null },
  { name: "Indigo", hex: "#6366f1" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Sky", hex: "#0ea5e9" },
  { name: "Fuchsia", hex: "#d946ef" },
  { name: "Slate", hex: "#475569" },
];

export function AccentPicker({ compact = false }: { compact?: boolean }) {
  const accent = useAppSelector((s) => s.settings.accentColor);
  const dispatch = useAppDispatch();
  const [custom, setCustom] = useState(accent ?? "#6366f1");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={compact ? "icon-sm" : "lg"}
            title="Accent color"
            aria-label="Accent color"
          >
            <Palette size={16} />
            {!compact && <span>Accent</span>}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56 p-2">
        <div className="grid grid-cols-5 gap-2 p-1">
          {PRESETS.map((p) => {
            const selected =
              (p.hex === null && !accent) ||
              (p.hex !== null && accent?.toLowerCase() === p.hex.toLowerCase());
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => dispatch(setAccentColor(p.hex))}
                title={p.name}
                aria-label={p.name}
                className="relative h-8 w-8 rounded-full border border-border transition hover:scale-110"
                style={{
                  background:
                    p.hex ??
                    "conic-gradient(from 0deg, #6366f1, #8b5cf6, #f43f5e, #f59e0b, #10b981, #0ea5e9, #d946ef, #6366f1)",
                }}
              >
                {selected && (
                  <Check
                    className="absolute inset-0 m-auto size-4 text-white drop-shadow"
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-2 px-1">
          <input
            type="color"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
              dispatch(setAccentColor(e.target.value));
            }}
            className="h-8 w-8 cursor-pointer rounded-md border border-border bg-transparent p-0"
            aria-label="Custom accent color"
          />
          <input
            type="text"
            value={custom}
            onChange={(e) => {
              const v = e.target.value;
              setCustom(v);
              if (/^#[0-9a-f]{6}$/i.test(v)) {
                dispatch(setAccentColor(v));
              }
            }}
            className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs font-mono outline-none focus:ring-2 focus:ring-ring"
            placeholder="#6366f1"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
