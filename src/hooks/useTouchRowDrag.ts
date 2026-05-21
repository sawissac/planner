"use client";

import { useCallback, useRef, useState } from "react";

export function useTouchRowDrag(onReorder: (fromId: string, toId: string) => void) {
  const [touchDragId, setTouchDragId] = useState<string | null>(null);
  const [touchOverId, setTouchOverId] = useState<string | null>(null);
  const dragRef = useRef<{ from: string; over: string | null }>({
    from: "",
    over: null,
  });

  const start = useCallback(
    (id: string) => {
      dragRef.current = { from: id, over: null };
      setTouchDragId(id);
      setTouchOverId(null);

      const move = (e: TouchEvent) => {
        const t = e.touches[0];
        if (!t) {
          return;
        }
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const row = (el as HTMLElement | null)?.closest("[data-row-id]") as HTMLElement | null;
        const overId = row?.dataset.rowId ?? null;
        if (overId && overId !== dragRef.current.over) {
          dragRef.current.over = overId;
          setTouchOverId(overId);
        }
      };

      const end = () => {
        const { from, over } = dragRef.current;
        if (from && over && from !== over) {
          onReorder(from, over);
        }
        dragRef.current = { from: "", over: null };
        setTouchDragId(null);
        setTouchOverId(null);
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", end);
        window.removeEventListener("touchcancel", end);
      };

      window.addEventListener("touchmove", move, { passive: true });
      window.addEventListener("touchend", end);
      window.addEventListener("touchcancel", end);
    },
    [onReorder],
  );

  return { touchDragId, touchOverId, start };
}
