"use client";

import { useEffect, useRef, useState } from "react";

import { AppSwitcherRail } from "@/components/customs/AppSwitcherRail";
import { MainContent } from "@/components/customs/MainContent";
import { ShortcutsDialog, useShortcutsController } from "@/components/customs/ShortcutsDialog";
import { AiChat } from "@/features/AiChat/AiChat";
import { Sidebar } from "@/features/Sidebar/Sidebar";
import { redoAction, undoAction } from "@/lib/undo";
import { useHydrated } from "@/providers/StoreProvider";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { setDarkMode, setFocusMode, setSidebarOpen } from "@/stores/slices/settingsSlice";

const INTRO_DELAY_MS = 450;

export function AppShell() {
  const sidebarOpenPersisted = useAppSelector((s) => s.settings.sidebarOpen);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(true);
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((s) => s.settings.darkMode);
  const focusMode = useAppSelector((s) => s.settings.focusMode);
  const hydrated = useHydrated();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setIsMobile(mq.matches);
      if (mq.matches) {
        setMobileOpen(false);
      }
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const introDoneRef = useRef(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch(undoAction());
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        dispatch(redoAction());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (introDoneRef.current) {
      // After intro completed, follow Redux state directly.
      setIntroOpen(sidebarOpenPersisted);
      return;
    }
    if (sidebarOpenPersisted) {
      introDoneRef.current = true;
      setIntroOpen(true);
      return;
    }
    const t = setTimeout(() => {
      introDoneRef.current = true;
      setIntroOpen(false);
    }, INTRO_DELAY_MS);
    return () => clearTimeout(t);
  }, [hydrated, sidebarOpenPersisted]);

  const sidebarOpen = isMobile ? mobileOpen : introOpen;
  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((v) => !v);
    } else {
      dispatch(setSidebarOpen(!sidebarOpenPersisted));
    }
  };
  const toggleFullscreen = () => {
    if (typeof document === "undefined") {
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };
  const toggleDark = () => dispatch(setDarkMode(!darkMode));
  const toggleFocus = () => dispatch(setFocusMode(!focusMode));

  const { open: helpOpen, setOpen: setHelpOpen } = useShortcutsController({
    onToggleSidebar: toggleSidebar,
    onToggleFullscreen: toggleFullscreen,
    onToggleDark: toggleDark,
    onToggleFocus: toggleFocus,
  });

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">
      <div className="hidden md:flex">
        <AppSwitcherRail />
      </div>
      <main className="flex-1 p-3 md:p-6 flex flex-col gap-4 overflow-auto min-w-0">
        <MainContent
          onToggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
          onOpenShortcuts={() => setHelpOpen(true)}
        />
      </main>
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={toggleSidebar}
          aria-hidden
        />
      )}
      <Sidebar open={sidebarOpen} onToggle={toggleSidebar} isMobile={isMobile} />
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <AiChat />
    </div>
  );
}
