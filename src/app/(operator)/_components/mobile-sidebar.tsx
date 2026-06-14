"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="size-8 px-0 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
      >
        <Menu className="size-4" />
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-sidebar-border bg-sidebar md:hidden">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded bg-primary">
                  <span className="text-[10px] font-bold text-primary-foreground">OP</span>
                </div>
                <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                  Operator Portal
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 px-0 text-sidebar-foreground/50"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
            <div className="flex items-center justify-between border-t border-sidebar-border px-4 py-3">
              <p className="text-xs text-sidebar-foreground/40">Demo-Operator</p>
              <ThemeToggle />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
