"use client";

import { BrainCircuit, Keyboard, LayoutGrid, Palette, Type } from "lucide-react";

import { ShortcutList } from "@/components/customs/ShortcutsDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OptionGrid } from "@/components/ui/option-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiKeysSection } from "@/features/Settings/ApiKeysSection";
import { cn } from "@/lib/cn";
import { appThemeCssVars, COLOR_THEMES, type ColorTheme } from "@/lib/color-themes";
import { LIGHT_PALETTES, resolvePalette } from "@/lib/palette";
import * as ui from "@/lib/ui-styles";
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
  PAGE_SIZE_OPTIONS,
  setBoardCompact,
  setFocusMode,
  setFont,
  setFontSize,
  setFontWeight,
  setPageSize,
  setPalette,
  setSidebarWidth,
} from "@/stores/slices/settingsSlice";

const DEFAULT_SIDEBAR_WIDTH = 320;

/** Page, panel and accent tones of one palette, as an option tile's preview. */
function PaletteSwatch({ theme }: { theme: ColorTheme }) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-full items-end gap-1 rounded-sm border border-app-border p-1"
      style={{ background: theme.bg }}
    >
      <span className="h-3 flex-1 rounded-[3px]" style={{ background: theme.bgPanel }} />
      <span className="size-3 rounded-full" style={{ background: theme.accent }} />
    </span>
  );
}

/** One labelled setting: title + help on the left, the control on the right. */
function SettingRow({
  title,
  help,
  htmlFor,
  children,
}: {
  title: string;
  help?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="setting-row"
      className="flex items-center justify-between gap-4 border-b border-app-border py-3 last:border-b-0"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={htmlFor} className="font-title text-[12px] font-semibold text-app-bright">
          {title}
        </label>
        {help && <p className={ui.help}>{help}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className={cn(ui.label, "mb-1")}>{children}</h3>;
}

function AppearanceSection() {
  const dispatch = useAppDispatch();
  const active = resolvePalette(useAppSelector((s) => s.settings.accentColor)).key;
  return (
    <div className="flex flex-col gap-2">
      <SectionHeading>Theme</SectionHeading>
      <p className={ui.help}>Light palettes from compacto-ui. Each tile previews itself.</p>
      <OptionGrid
        className="mt-1 grid-cols-2 gap-2 sm:grid-cols-3"
        data-testid="settings-theme"
        value={active}
        onValueChange={(key) => dispatch(setPalette(key))}
        options={LIGHT_PALETTES.map(({ key, label }) => ({
          value: key,
          label,
          style: appThemeCssVars(COLOR_THEMES[key]),
          swatch: <PaletteSwatch theme={COLOR_THEMES[key]} />,
        }))}
      />
    </div>
  );
}

function TableTextSection() {
  const dispatch = useAppDispatch();
  const font = useAppSelector((s) => s.settings.tableFont);
  const size = useAppSelector((s) => s.settings.titleFontSize);
  const weight = useAppSelector((s) => s.settings.titleFontWeight);
  return (
    <div className="flex flex-col">
      <SectionHeading>Task titles</SectionHeading>
      <SettingRow title="Font" help="Typeface for task titles in the table." htmlFor="set-font">
        <Select value={font} onValueChange={(v) => dispatch(setFont(v as FontKey))}>
          <SelectTrigger id="set-font" size="sm" className="w-36" data-testid="settings-font">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {FONTS.map((f) => (
              <SelectItem key={f} value={f} style={{ fontFamily: FONT_VAR[f] }}>
                {FONT_LABEL[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow title="Size" htmlFor="set-size">
        <Select
          value={String(size)}
          onValueChange={(v) => dispatch(setFontSize(Number(v) as FontSize))}
        >
          <SelectTrigger id="set-size" size="sm" className="w-36" data-testid="settings-size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {FONT_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow title="Weight" htmlFor="set-weight">
        <Select
          value={String(weight)}
          onValueChange={(v) => dispatch(setFontWeight(Number(v) as FontWeight))}
        >
          <SelectTrigger id="set-weight" size="sm" className="w-36" data-testid="settings-weight">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {FONT_WEIGHTS.map((w) => (
              <SelectItem key={w} value={String(w)}>
                {FONT_WEIGHT_LABEL[w]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
    </div>
  );
}

function WorkspaceSection() {
  const dispatch = useAppDispatch();
  const focusMode = useAppSelector((s) => s.settings.focusMode);
  const boardCompact = useAppSelector((s) => s.settings.boardCompact);
  const pageSize = useAppSelector((s) => s.settings.pageSize);
  const sidebarWidth = useAppSelector((s) => s.settings.sidebarWidth);
  return (
    <div className="flex flex-col">
      <SectionHeading>Workspace</SectionHeading>
      <SettingRow
        title="Focus mode"
        help="Hide table chrome and show only open tasks. Shift+Z."
        htmlFor="set-focus"
      >
        <Switch
          id="set-focus"
          checked={focusMode}
          onCheckedChange={(v) => dispatch(setFocusMode(v))}
          data-testid="settings-focus"
        />
      </SettingRow>
      <SettingRow title="Compact board" help="Board cards show titles only." htmlFor="set-compact">
        <Switch
          id="set-compact"
          checked={boardCompact}
          onCheckedChange={(v) => dispatch(setBoardCompact(v))}
          data-testid="settings-compact"
        />
      </SettingRow>
      <SettingRow title="Rows per page" help="Task table page size." htmlFor="set-page-size">
        <Select value={String(pageSize)} onValueChange={(v) => dispatch(setPageSize(Number(v)))}>
          <SelectTrigger
            id="set-page-size"
            size="sm"
            className="w-36"
            data-testid="settings-page-size"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow
        title="Sidebar width"
        help={`Currently ${sidebarWidth}px. Drag its edge to resize.`}
      >
        <Button
          variant="outline"
          size="sm"
          disabled={sidebarWidth === DEFAULT_SIDEBAR_WIDTH}
          onClick={() => dispatch(setSidebarWidth(DEFAULT_SIDEBAR_WIDTH))}
          data-testid="settings-sidebar-reset"
        >
          Reset
        </Button>
      </SettingRow>
    </div>
  );
}

const SECTIONS = [
  { value: "appearance", label: "Appearance", icon: Palette, body: AppearanceSection },
  { value: "titles", label: "Task titles", icon: Type, body: TableTextSection },
  { value: "workspace", label: "Workspace", icon: LayoutGrid, body: WorkspaceSection },
  { value: "api", label: "API keys", icon: BrainCircuit, body: ApiKeysSection },
  { value: "shortcuts", label: "Shortcuts", icon: Keyboard, body: ShortcutList },
] as const;

/**
 * App settings — a compacto `Dialog` with a vertical `nav` tab list:
 * Appearance (light palettes), Task titles (font / size / weight),
 * Workspace (focus mode, compact board, page size, sidebar width), API keys
 * and Shortcuts. Every control writes straight to the settings slice, so changes
 * apply live and persist like the rest of the settings.
 */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="settings-dialog"
        className="h-[min(560px,calc(100dvh-2rem))] w-[min(720px,94vw)]"
      >
        <DialogHeader data-testid="settings-dialog-header">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Theme, task title style, workspace, API keys and keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          defaultValue="appearance"
          orientation="vertical"
          className="min-h-0 flex-1 flex-row gap-0"
        >
          <TabsList variant="nav" className="hidden sm:flex">
            {SECTIONS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} data-testid={`settings-tab-${value}`}>
                <Icon />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Narrow screens: the nav collapses to a horizontal strip. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <TabsList className="m-2 mb-0 w-auto sm:hidden">
              {SECTIONS.map(({ value, icon: Icon, label }) => (
                <TabsTrigger key={value} value={value} aria-label={label}>
                  <Icon />
                </TabsTrigger>
              ))}
            </TabsList>
            {SECTIONS.map(({ value, body: Body }) => (
              <TabsContent key={value} value={value} className="min-h-0 overflow-y-auto px-4 py-3">
                <Body />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
