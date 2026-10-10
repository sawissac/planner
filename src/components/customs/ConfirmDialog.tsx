"use client";

import { createContext, useCallback, useContext, useState } from "react";

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

export type ConfirmState = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void;
};

export type ConfirmOptions = Omit<ConfirmState, "open">;

export function ConfirmDialog({
  state,
  onOpenChange,
}: {
  state: ConfirmState;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="confirm-dialog">
        <DialogHeader showCloseButton={false}>
          <DialogTitle>{state.title}</DialogTitle>
        </DialogHeader>
        {state.description ? (
          <DialogBody>
            <DialogDescription>{state.description}</DialogDescription>
          </DialogBody>
        ) : (
          <DialogDescription className="sr-only">{state.title}</DialogDescription>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {state.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={state.destructive ? "destructive" : "default"}
            onClick={() => {
              state.onConfirm?.();
              onOpenChange(false);
            }}
          >
            {state.confirmLabel ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => void) | null>(null);

/**
 * One app-wide ConfirmDialog. Components that only need a yes/no before an
 * action (every delete) call `useConfirm()` instead of keeping their own
 * dialog state.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({ open: false, title: "" });
  const confirm = useCallback((opts: ConfirmOptions) => setState({ ...opts, open: true }), []);
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog state={state} onOpenChange={(open) => setState((s) => ({ ...s, open }))} />
    </ConfirmContext.Provider>
  );
}

/**
 * Opens the shared confirm dialog; `onConfirm` runs only if the user accepts.
 *
 * @example
 *   const confirm = useConfirm();
 *   confirm({ title: "Delete task?", confirmLabel: "Delete", destructive: true,
 *     onConfirm: () => dispatch(deleteTodo(id)) });
 */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return confirm;
}
