"use client";

import { useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { TitleStyleControls } from "@/components/title-font-dropdown";
import { TodoTable } from "@/components/todo-table";
import { UserTable } from "@/components/user-table";
import { AnalyticsChart, RangeFilter } from "@/components/analytics-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setFocusMode } from "@/lib/settingsSlice";
import { Switch } from "@/components/ui/switch";
import { BadgeCheck, UsersRound, ChartArea, CalendarRange, PanelRight, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineView } from "@/components/timeline-view";

export function MainContent({
  onToggleSidebar,
  sidebarOpen,
  onOpenShortcuts,
}: {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  onOpenShortcuts?: () => void;
} = {}) {
  const [tab, setTab] = useState("todo");
  const [rangeDays, setRangeDays] = useState(7);
  const focusMode = useAppSelector((s) => s.settings.focusMode);
  const dispatch = useAppDispatch();

  const tabList = (
    <TabsList className="w-max shrink-0">
      <TabsTrigger value="todo" className="gap-1" title="Todo">
        <BadgeCheck className="size-4" />
        <span className="hidden lg:inline">Todo</span>
      </TabsTrigger>
      <TabsTrigger value="analytics" className="gap-1" title="Analytics">
        <ChartArea className="size-4" />
        <span className="hidden lg:inline">Analytics</span>
      </TabsTrigger>
      <TabsTrigger value="timeline" className="gap-1" title="Timeline">
        <CalendarRange className="size-4" />
        <span className="hidden lg:inline">Timeline</span>
      </TabsTrigger>
      <TabsTrigger value="users" className="gap-1" title="Users">
        <UsersRound className="size-4" />
        <span className="hidden lg:inline">Users</span>
      </TabsTrigger>
    </TabsList>
  );

  const focusSwitch = tab === "todo" && (
    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground shrink-0">
      <span>Focus</span>
      <Switch
        checked={focusMode}
        onCheckedChange={(v) => dispatch(setFocusMode(v))}
      />
    </label>
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
      {/* Compact header: mobile + tablet (< lg) */}
      <div className="lg:hidden flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" className="size-7 shrink-0" />
          <div className="min-w-0 flex-1">
            <PageHeading />
          </div>
          <div className="shrink-0">{sidebarBtn}</div>
        </div>
        <div className="-mx-3 px-3 overflow-x-auto">
          <div className="flex items-center gap-2 w-max pb-1">
            {tabList}
            {focusSwitch}
            {tab === "todo" && <TitleStyleControls compact />}
            {tab === "analytics" && (
              <RangeFilter rangeDays={rangeDays} onChange={setRangeDays} compact />
            )}
            {shortcutsBtn}
          </div>
        </div>
      </div>

      {/* Desktop header (lg+) */}
      <div className="hidden lg:flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.svg" alt="Logo" className="size-8 shrink-0" />
          <PageHeading />
          {tabList}
        </div>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {focusSwitch}
          {tab === "todo" && <TitleStyleControls />}
          {tab === "analytics" && (
            <RangeFilter rangeDays={rangeDays} onChange={setRangeDays} />
          )}
          {shortcutsBtn}
        </div>
      </div>
      <TabsContent value="todo">
        <TodoTable />
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
    </Tabs>
  );
}
