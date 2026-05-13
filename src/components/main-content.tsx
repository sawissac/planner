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
import { BadgeCheck, UsersRound, BarChart2, ChartArea, CalendarRange } from "lucide-react";
import { TimelineView } from "@/components/timeline-view";

export function MainContent() {
  const [tab, setTab] = useState("todo");
  const [rangeDays, setRangeDays] = useState(7);
  const focusMode = useAppSelector((s) => s.settings.focusMode);
  const dispatch = useAppDispatch();

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageHeading />
          <TabsList className="w-max">
            <TabsTrigger value="todo" className="gap-1">
              {tab === "todo" && <BadgeCheck className="size-4" />}
              Todo
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1">
              {tab === "users" && <UsersRound className="size-4" />}
              Users
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1">
              {tab === "analytics" && <ChartArea className="size-4" />}
              Analytics
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1">
              {tab === "timeline" && <CalendarRange className="size-4" />}
              Timeline
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex items-center gap-3">
          {tab === "todo" && (
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
              <span>Focus</span>
              <Switch
                checked={focusMode}
                onCheckedChange={(v) => dispatch(setFocusMode(v))}
              />
            </label>
          )}
          {tab === "todo" && <TitleStyleControls />}
          {tab === "analytics" && (
            <RangeFilter rangeDays={rangeDays} onChange={setRangeDays} />
          )}
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
