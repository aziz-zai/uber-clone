"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="size-8 px-0 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10"
      onClick={handleLogout}
      aria-label="Abmelden"
    >
      <LogOut className="size-4" />
    </Button>
  );
}
