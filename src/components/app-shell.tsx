"use client";

import { useEffect, useState } from "react";
import { MainContent } from "@/components/main-content";
import { Sidebar } from "@/components/sidebar";
import {
  ShortcutsDialog,
  useShortcutsController,
} from "@/components/shortcuts-dialog";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { setDarkMode, setSidebarOpen } from "@/lib/settingsSlice";

export function AppShell() {
  const sidebarOpenPersisted = useAppSelector((s) => s.settings.sidebarOpen);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useAppDispatch();
  const darkMode = useAppSelector((s) => s.settings.darkMode);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setIsMobile(mq.matches);
      if (mq.matches) setMobileOpen(false);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const sidebarOpen = isMobile ? mobileOpen : sidebarOpenPersisted;
  const toggleSidebar = () => {
    if (isMobile) setMobileOpen((v) => !v);
    else dispatch(setSidebarOpen(!sidebarOpenPersisted));
  };
  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };
  const toggleDark = () => dispatch(setDarkMode(!darkMode));

  const { open: helpOpen, setOpen: setHelpOpen } = useShortcutsController({
    onToggleSidebar: toggleSidebar,
    onToggleFullscreen: toggleFullscreen,
    onToggleDark: toggleDark,
  });

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden relative">
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
    </div>
  );
}
