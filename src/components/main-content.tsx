"use client";

import { useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { TitleStyleControls } from "@/components/title-font-dropdown";
import { TodoTable } from "@/components/todo-table";
import { UserTable } from "@/components/user-table";
import { AnalyticsChart } from "@/components/analytics-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setFocusMode } from "@/lib/settingsSlice";
import { Switch } from "@/components/ui/switch";
import { BadgeCheck, UsersRound, BarChart2, ChartArea } from "lucide-react";

export function MainContent() {
  const [tab, setTab] = useState("todo");
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
        </div>
      </div>
      <TabsContent value="todo">
        <TodoTable />
      </TabsContent>
      <TabsContent value="users">
        <UserTable />
      </TabsContent>
      <TabsContent value="analytics">
        <AnalyticsChart />
      </TabsContent>
    </Tabs>
  );
}
