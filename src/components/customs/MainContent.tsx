"use client";

import {
  BadgeCheck,
  CalendarRange,
  ChartArea,
  Columns3,
  Ellipsis,
  Keyboard,
  LayoutList,
  Maximize2,
  Minimize2,
  NotebookPen,
  PanelLeft,
  Settings,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AnalyticsChart } from "@/components/customs/AnalyticsChart";
import {
  DateRangeFilter,
  type DateRangeValue,
  presetRange,
} from "@/components/customs/DateRangeFilter";
import { PageHeading } from "@/components/customs/PageHeading";
import { preloadThoughtEditor } from "@/components/customs/TodoRowActions";
import { ToolbarTip } from "@/components/customs/ToolbarTip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BoardView } from "@/features/BoardView/BoardView";
import { ThoughtsView } from "@/features/ThoughtsView/ThoughtsView";
import { TimelineView } from "@/features/TimelineView/TimelineView";
import { TodoTable } from "@/features/TodoTable/TodoTable";
import { UserTable } from "@/features/UserTable/UserTable";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { setActiveTab, setBoardCompact, setFocusMode } from "@/stores/slices/settingsSlice";

/** Square icon segment sized to sit flush inside a {@link TOOL_GROUP}. */
const TOOL_BTN =
  "size-7.5 rounded-none border-0 text-app-dim hover:bg-app-hover hover:text-app-bright focus-visible:ring-inset data-active:bg-app-accent-faint data-active:text-app-accent";

/** Bordered button-group cluster; children are split by hairlines. */
const TOOL_GROUP =
  "flex h-8 shrink-0 items-stretch divide-x divide-app-border overflow-hidden rounded-md border border-app-border bg-app-bg";

/** The five views, with the copy their tooltips show. */
const VIEW_TABS = [
  {
    value: "todo",
    icon: BadgeCheck,
    title: "Tasks",
    hint: "Home base. Capture it, sort it, check it off.",
  },
  {
    value: "board",
    icon: Columns3,
    title: "Board",
    hint: "Drag cards across columns as the work moves.",
  },
  {
    value: "analytics",
    icon: ChartArea,
    title: "Analytics",
    hint: "Trends and heatmaps of what actually got done.",
  },
  {
    value: "timeline",
    icon: CalendarRange,
    title: "Timeline",
    hint: "Every group stretched across the calendar.",
  },
  {
    value: "users",
    icon: UsersRound,
    title: "People",
    hint: "Who's on the hook for what, and how it's going.",
  },
] as const;

export function MainContent({
  onToggleSidebar,
  sidebarOpen,
  onOpenShortcuts,
  onOpenSettings,
}: {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  onOpenShortcuts?: () => void;
  onOpenSettings?: () => void;
} = {}) {
  const dispatch = useAppDispatch();
  const tab = useAppSelector((s) => s.settings.activeTab);
  const setTab = (v: string) => dispatch(setActiveTab(v));
  const [range, setRange] = useState<DateRangeValue>(() => presetRange(7));
  const rangeDays = useMemo(() => {
    const ms =
      new Date(range.to).setHours(23, 59, 59, 999) - new Date(range.from).setHours(0, 0, 0, 0);
    return Math.max(1, Math.round(ms / 86400000) + 1);
  }, [range]);
  const focusMode = useAppSelector((s) => s.settings.focusMode);
  const boardCompact = useAppSelector((s) => s.settings.boardCompact);

  const tabList = (
    <TabsList variant="segmented" className="w-max shrink-0">
      {VIEW_TABS.map(({ value, icon: Icon, title, hint }) => (
        <ToolbarTip key={value} icon={Icon} title={title} hint={hint}>
          <TabsTrigger value={value} aria-label={title} data-testid={`main-tab-${value}`}>
            <Icon className="size-4" />
          </TabsTrigger>
        </ToolbarTip>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="More"
            className={TOOL_BTN}
            data-testid="main-more-menu-trigger"
          >
            <Ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto">
          <DropdownMenuItem
            onClick={() => setTab("thoughts")}
            onMouseEnter={preloadThoughtEditor}
            onFocus={preloadThoughtEditor}
            onPointerDown={preloadThoughtEditor}
            className="whitespace-nowrap"
          >
            <NotebookPen className="size-4" />
            Thought Editor
          </DropdownMenuItem>
          {onOpenSettings && (
            <DropdownMenuItem onClick={onOpenSettings} className="whitespace-nowrap">
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TabsList>
  );

  const focusSwitch = tab === "todo" && (
    <ToolbarTip
      icon={LayoutList}
      title={focusMode ? "Leave focus mode" : "Focus mode"}
      hint={
        focusMode
          ? "Bring the filters and done tasks back."
          : "Mute the noise — only open tasks stay on stage."
      }
      keys={["Shift", "Z"]}
    >
      <Button
        size="icon-sm"
        variant="ghost"
        data-active={focusMode || undefined}
        onClick={() => dispatch(setFocusMode(!focusMode))}
        aria-label={focusMode ? "Disable focus mode" : "Enable focus mode"}
        aria-pressed={focusMode}
        className={TOOL_BTN}
      >
        <LayoutList className="size-4" />
      </Button>
    </ToolbarTip>
  );

  const boardCompactSwitch = tab === "board" && (
    <ToolbarTip
      icon={boardCompact ? Maximize2 : Minimize2}
      title={boardCompact ? "Show details" : "Compact cards"}
      hint={
        boardCompact
          ? "Unfold every card — dates, people and progress."
          : "Titles only, so the whole board fits in one glance."
      }
    >
      <Button
        size="icon-sm"
        variant="ghost"
        data-active={boardCompact || undefined}
        onClick={() => dispatch(setBoardCompact(!boardCompact))}
        aria-label={boardCompact ? "Show card details" : "Show titles only"}
        aria-pressed={boardCompact}
        className={TOOL_BTN}
      >
        {boardCompact ? <Maximize2 className="size-4" /> : <Minimize2 className="size-4" />}
      </Button>
    </ToolbarTip>
  );

  const shortcutsBtn = onOpenShortcuts && (
    <ToolbarTip
      icon={Keyboard}
      title="Keyboard shortcuts"
      hint="Leave the mouse behind — every key worth knowing."
      keys={["?"]}
    >
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onOpenShortcuts}
        aria-label="Keyboard shortcuts"
        className={TOOL_BTN}
      >
        <Keyboard className="size-4" />
      </Button>
    </ToolbarTip>
  );

  const sidebarBtn = onToggleSidebar && (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={onToggleSidebar}
      aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
    >
      <PanelLeft className={sidebarOpen ? "" : "rotate-180"} />
    </Button>
  );

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="shrink-0 lg:hidden">{sidebarBtn}</div>
          <div className="min-w-0 flex-1">
            <PageHeading />
          </div>
        </div>
        <div className="-mx-3 px-3 overflow-x-auto">
          {/* Button-group clusters: view tabs | view tools | help */}
          <div
            role="toolbar"
            aria-label="View"
            data-testid="main-toolbar"
            className="mb-1 flex w-max items-center gap-2"
          >
            {tabList}
            {(focusSwitch || boardCompactSwitch || tab === "analytics" || tab === "board") && (
              <div className={TOOL_GROUP}>
                {focusSwitch}
                {boardCompactSwitch}
                {(tab === "analytics" || tab === "board") && (
                  <DateRangeFilter
                    value={range}
                    onChange={setRange}
                    compact
                    triggerClassName={cn(TOOL_BTN, "bg-transparent")}
                  />
                )}
              </div>
            )}
            {shortcutsBtn && <div className={TOOL_GROUP}>{shortcutsBtn}</div>}
          </div>
        </div>
      </div>
      <TabsContent value="todo">
        <TodoTable />
      </TabsContent>
      <TabsContent value="board">
        <BoardView from={range.from.getTime()} to={range.to.getTime()} />
      </TabsContent>
      <TabsContent value="users">
        <UserTable />
      </TabsContent>
      <TabsContent value="analytics">
        <AnalyticsChart rangeDays={rangeDays} />
      </TabsContent>
      <TabsContent value="timeline">
        <TimelineView />
      </TabsContent>
      <TabsContent value="thoughts">
        <ThoughtsView />
      </TabsContent>
    </Tabs>
  );
}
