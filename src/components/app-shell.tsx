"use client";

import { useState } from "react";
import { MainContent } from "@/components/main-content";
import { Sidebar } from "@/components/sidebar";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <main className="flex-1 p-6 flex flex-col gap-4 overflow-auto min-w-0">
        <MainContent />
      </main>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
    </div>
  );
}
