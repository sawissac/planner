"use client";

import { useMemo, useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { TitleStyleControls } from "@/components/title-font-dropdown";
import { AccentPicker } from "@/components/accent-picker";
import { TodoTable } from "@/components/todo-table";
import { UserTable } from "@/components/user-table";
import { AnalyticsChart } from "@/components/analytics-chart";
import {
  DateRangeFilter,
  presetRange,
  type DateRangeValue,
} from "@/components/date-range-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  setActiveTab,
  setBoardCompact,
  setFocusMode,
} from "@/lib/settingsSlice";
import {
  BadgeCheck,
  UsersRound,
  ChartArea,
  CalendarRange,
  PanelRight,
  Keyboard,
  LayoutList,
  Columns3,
  Maximize2,
  Minimize2,
  ListIndentIncrease,
  NotebookPen,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineView } from "@/components/timeline-view";
import { BoardView } from "@/components/board-view";
import { ThoughtsView } from "@/components/thoughts-view";
import { preloadThoughtEditor } from "@/components/todo-row-actions";

export function MainContent({
  onToggleSidebar,
  sidebarOpen,
  onOpenShortcuts,
}: {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  onOpenShortcuts?: () => void;
} = {}) {
  const dispatch = useAppDispatch();
  const tab = useAppSelector((s) => s.settings.activeTab);
  const setTab = (v: string) => dispatch(setActiveTab(v));
  const [range, setRange] = useState<DateRangeValue>(() => presetRange(7));
  const rangeDays = useMemo(() => {
    const ms =
      new Date(range.to).setHours(23, 59, 59, 999) -
      new Date(range.from).setHours(0, 0, 0, 0);
    return Math.max(1, Math.round(ms / 86400000) + 1);
  }, [range]);
  const focusMode = useAppSelector((s) => s.settings.focusMode);
  const boardCompact = useAppSelector((s) => s.settings.boardCompact);

  const tabList = (
    <TabsList className="w-max shrink-0">
      <TabsTrigger value="todo" className="gap-1">
        <span title="Todo" className="flex items-center gap-1">
          <BadgeCheck className="size-4" />
        </span>
      </TabsTrigger>
      <TabsTrigger value="board" className="gap-1">
        <span title="Board" className="flex items-center gap-1">
          <Columns3 className="size-4" />
        </span>
      </TabsTrigger>
      <TabsTrigger value="analytics" className="gap-1">
        <span title="Analytics" className="flex items-center gap-1">
          <ChartArea className="size-4" />
        </span>
      </TabsTrigger>
      <TabsTrigger value="timeline" className="gap-1">
        <span title="Timeline" className="flex items-center gap-1">
          <CalendarRange className="size-4" />
        </span>
      </TabsTrigger>
      <TabsTrigger value="users" className="gap-1">
        <span title="Users" className="flex items-center gap-1">
          <UsersRound className="size-4" />
        </span>
      </TabsTrigger>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              title="Options"
              aria-label="Options"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Settings className="size-4" />
            </button>
          }
        />
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
        </DropdownMenuContent>
      </DropdownMenu>
    </TabsList>
  );

  const focusSwitch = tab === "todo" && (
    <Button
      size="icon-sm"
      variant={focusMode ? "secondary" : "ghost"}
      onClick={() => dispatch(setFocusMode(!focusMode))}
      aria-label={focusMode ? "Disable focus mode" : "Enable focus mode"}
      aria-pressed={focusMode}
      title="Focus mode (Shift+Z)"
      className={focusMode ? "text-primary" : ""}
    >
      <LayoutList className="size-4" />
    </Button>
  );

  const boardCompactSwitch = tab === "board" && (
    <Button
      size="icon-sm"
      variant={boardCompact ? "secondary" : "ghost"}
      onClick={() => dispatch(setBoardCompact(!boardCompact))}
      aria-label={boardCompact ? "Show card details" : "Show titles only"}
      aria-pressed={boardCompact}
      title={boardCompact ? "Show details" : "Compact cards"}
      className={boardCompact ? "text-primary" : ""}
    >
      {boardCompact ? (
        <Maximize2 className="size-4" />
      ) : (
        <Minimize2 className="size-4" />
      )}
    </Button>
  );

  const shortcutsBtn = onOpenShortcuts && (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={onOpenShortcuts}
      aria-label="Keyboard shortcuts"
      title="Keyboard shortcuts (?)"
    >
      <Keyboard className="size-4" />
    </Button>
  );

  const sidebarBtn = onToggleSidebar && (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={onToggleSidebar}
      aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
    >
      <PanelRight className={sidebarOpen ? "" : "rotate-180"} />
    </Button>
  );

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" className="size-7 shrink-0" />
          <div className="min-w-0 flex-1">
            <PageHeading />
          </div>
          <div className="shrink-0 lg:hidden">{sidebarBtn}</div>
        </div>
        <div className="-mx-3 px-3 overflow-x-auto">
          <div className="flex items-center gap-2 w-max pb-1">
            {tabList}
            {focusSwitch}
            {boardCompactSwitch}
            {tab === "todo" && <TitleStyleControls compact />}
            <AccentPicker compact />
            {(tab === "analytics" || tab === "board") && (
              <DateRangeFilter value={range} onChange={setRange} compact />
            )}
            {shortcutsBtn}
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
