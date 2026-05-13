"use client";

import { useState } from "react";
import Avatar from "boring-avatars";
import { ChevronDown, Plus } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { updateTodo } from "@/lib/todoSlice";
import { addUser } from "@/lib/userSlice";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const AVATAR_COLORS = ["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"];

export function AssigneeCell({
  id,
  assignees,
}: {
  id: string;
  assignees: string[];
}) {
  const dispatch = useAppDispatch();
  const users = useAppSelector((s) => s.users.users);
  const [draft, setDraft] = useState("");

  const addNew = () => {
    const v = draft.trim();
    if (!v) return;
    dispatch(addUser(v));
    setDraft("");
  };

  const toggle = (userId: string) => {
    const next = assignees.includes(userId)
      ? assignees.filter((a) => a !== userId)
      : [...assignees, userId];
    dispatch(updateTodo({ id, assignees: next }));
  };

  const assignedUsers = assignees
    .map((aid) => users.find((u) => u.id === aid))
    .filter(Boolean) as { id: string; name: string; agenda: string }[];

  const single = assignedUsers.length === 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-full justify-between gap-1 px-2 font-normal"
          >
            {assignedUsers.length === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : single ? (
              <span className="flex items-center gap-1.5 min-w-0">
                <Avatar
                  size={20}
                  name={assignedUsers[0].name || assignedUsers[0].id}
                  variant="beam"
                  colors={AVATAR_COLORS}
                />
                <span className="text-xs truncate">{assignedUsers[0].name}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="flex items-center">
                  {assignedUsers.slice(0, 5).map((u, i) => (
                    <span
                      key={u.id}
                      style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 5 - i }}
                      className="relative rounded-full ring-1 ring-background"
                    >
                      <Avatar
                        size={20}
                        name={u.id}
                        variant="beam"
                        colors={AVATAR_COLORS}
                      />
                    </span>
                  ))}
                </span>
                <span className="text-xs truncate">Assignee {assignedUsers.length}</span>
              </span>
            )}
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-48">
        {users.map((u) => (
          <DropdownMenuCheckboxItem
            key={u.id}
            checked={assignees.includes(u.id)}
            onClick={(e) => {
              e.preventDefault();
              toggle(u.id);
            }}
            className="gap-2"
          >
            <Avatar
              size={18}
              name={u.id}
              variant="beam"
              colors={AVATAR_COLORS}
            />
            <span className="truncate">{u.name || "Unnamed"}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {assignedUsers.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={false}
              onClick={(e) => {
                e.preventDefault();
                dispatch(updateTodo({ id, assignees: [] }));
              }}
            >
              Clear all
            </DropdownMenuCheckboxItem>
          </>
        )}
        <DropdownMenuSeparator />
        <div
          className="flex items-center gap-1 px-1.5 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNew();
              }
              e.stopPropagation();
            }}
            placeholder="Add user..."
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={addNew}
            aria-label="Add user"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
