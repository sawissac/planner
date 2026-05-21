"use client";

import { AArrowUp, ALargeSmall, ChevronDown, TextInitial } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  FONT_LABEL,
  FONT_SIZES,
  FONT_VAR,
  FONT_WEIGHT_LABEL,
  FONT_WEIGHTS,
  type FontKey,
  FONTS,
  type FontSize,
  type FontWeight,
  setFont,
  setFontSize,
  setFontWeight,
} from "@/stores/slices/settingsSlice";

export function TitleStyleControls({ compact = false }: { compact?: boolean } = {}) {
  const font = useAppSelector((s) => s.settings.tableFont);
  const size = useAppSelector((s) => s.settings.titleFontSize);
  const weight = useAppSelector((s) => s.settings.titleFontWeight);
  const dispatch = useAppDispatch();

  return (
    <div className="flex items-center gap-2">
      {/* Font family */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size={compact ? "icon-sm" : "lg"}
              title={`Font: ${FONT_LABEL[font]}`}
              aria-label={`Font: ${FONT_LABEL[font]}`}
            >
              <TextInitial size={16} />
              {!compact && (
                <>
                  <span style={{ fontFamily: FONT_VAR[font] }}>{FONT_LABEL[font]}</span>
                  <ChevronDown />
                </>
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={font}
            onValueChange={(v) => dispatch(setFont(v as FontKey))}
          >
            {FONTS.map((f) => (
              <DropdownMenuRadioItem key={f} value={f} style={{ fontFamily: FONT_VAR[f] }}>
                {FONT_LABEL[f]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font size */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size={compact ? "icon-sm" : "lg"}
              title={`Size: ${size}px`}
              aria-label={`Size: ${size}px`}
            >
              <ALargeSmall size={16} />
              {!compact && (
                <>
                  {size}px
                  <ChevronDown />
                </>
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={String(size)}
            onValueChange={(v) => dispatch(setFontSize(Number(v) as FontSize))}
          >
            {FONT_SIZES.map((s) => (
              <DropdownMenuRadioItem key={s} value={String(s)}>
                {s}px
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font weight */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size={compact ? "icon-sm" : "lg"}
              title={`Weight: ${FONT_WEIGHT_LABEL[weight]}`}
              aria-label={`Weight: ${FONT_WEIGHT_LABEL[weight]}`}
            >
              <AArrowUp size={16} />
              {!compact && (
                <>
                  <span style={{ fontWeight: weight }}>{FONT_WEIGHT_LABEL[weight]}</span>
                  <ChevronDown />
                </>
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={String(weight)}
            onValueChange={(v) => dispatch(setFontWeight(Number(v) as FontWeight))}
          >
            {FONT_WEIGHTS.map((w) => (
              <DropdownMenuRadioItem key={w} value={String(w)} style={{ fontWeight: w }}>
                {FONT_WEIGHT_LABEL[w]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
