import { SidebarNav } from "./_components/sidebar-nav";
import { ThemeToggle } from "./_components/theme-toggle";
import { MobileSidebar } from "./_components/mobile-sidebar";
import { LogoutButton } from "./_components/logout-button";

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-none flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center border-b border-sidebar-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center rounded bg-primary">
              <span className="text-[10px] font-bold text-primary-foreground">OP</span>
            </div>
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Operator Portal
            </span>
          </div>
        </div>

        <SidebarNav />

        <div className="flex items-center justify-between border-t border-sidebar-border px-4 py-3">
          <p className="text-xs text-sidebar-foreground/40">Operator Portal</p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Mobile: full-width column with top bar */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-14 items-center gap-3 border-b border-border px-4 md:hidden">
          <MobileSidebar />
          <div className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded bg-primary">
              <span className="text-[9px] font-bold text-primary-foreground">OP</span>
            </div>
            <span className="text-sm font-semibold">Operator Portal</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
