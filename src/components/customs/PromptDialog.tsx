"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type PromptState = {
  open: boolean;
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm?: (value: string) => void;
};

function PromptForm({ state, onClose }: { state: PromptState; onClose: () => void }) {
  const [value, setValue] = useState(state.defaultValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const v = value.trim();
    if (!v) {
      return;
    }
    state.onConfirm?.(v);
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{state.title}</DialogTitle>
        <DialogDescription className={state.description ? undefined : "sr-only"}>
          {state.description ?? state.title}
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <Input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={state.placeholder}
          data-testid="prompt-dialog-input"
        />
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!value.trim()}>
          {state.confirmLabel ?? "OK"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function PromptDialog({
  state,
  onOpenChange,
}: {
  state: PromptState;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent>
        {state.open && <PromptForm state={state} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
