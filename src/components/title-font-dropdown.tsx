"use client";

import {
  ChevronDown,
  Bold,
  Heading,
  AArrowUp,
  ALargeSmall,
  TextSelect,
  TextInitial,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  FONTS,
  FONT_LABEL,
  FONT_SIZES,
  FONT_VAR,
  FONT_WEIGHTS,
  FONT_WEIGHT_LABEL,
  setFont,
  setFontSize,
  setFontWeight,
  type FontKey,
  type FontSize,
  type FontWeight,
} from "@/lib/settingsSlice";

export function TitleStyleControls() {
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
            <Button variant="outline" size="lg">
              <TextInitial size={16} />
              <span style={{ fontFamily: FONT_VAR[font] }}>
                {FONT_LABEL[font]}
              </span>
              <ChevronDown />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={font}
            onValueChange={(v) => dispatch(setFont(v as FontKey))}
          >
            {FONTS.map((f) => (
              <DropdownMenuRadioItem
                key={f}
                value={f}
                style={{ fontFamily: FONT_VAR[f] }}
              >
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
            <Button variant="outline" size="lg">
              <ALargeSmall size={16} />
              {size}px
              <ChevronDown />
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
            <Button variant="outline" size="lg">
              <AArrowUp size={16} />
              <span style={{ fontWeight: weight }}>
                {FONT_WEIGHT_LABEL[weight]}
              </span>
              <ChevronDown />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={String(weight)}
            onValueChange={(v) =>
              dispatch(setFontWeight(Number(v) as FontWeight))
            }
          >
            {FONT_WEIGHTS.map((w) => (
              <DropdownMenuRadioItem
                key={w}
                value={String(w)}
                style={{ fontWeight: w }}
              >
                {FONT_WEIGHT_LABEL[w]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
