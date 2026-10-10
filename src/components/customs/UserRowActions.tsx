"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";

import { useConfirm } from "@/components/customs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { deleteUser } from "@/stores/slices/userSlice";

export function UserRowActions({ id }: { id: string }) {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const name = useAppSelector((s) => s.users.users.find((u) => u.id === id)?.name);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={(e) => e.stopPropagation()}
          aria-label="Row options"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          variant="destructive"
          onSelect={() =>
            confirm({
              title: "Delete user?",
              description: `"${name || "(unnamed)"}" will be permanently removed.`,
              confirmLabel: "Delete",
              destructive: true,
              onConfirm: () => dispatch(deleteUser(id)),
            })
          }
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
