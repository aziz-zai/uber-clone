"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError("Anfrage fehlgeschlagen. Bitte erneut versuchen.");
      return;
    }

    // Aus E-Mail-Enumeration-Gründen immer Erfolg anzeigen, unabhängig davon
    // ob die Adresse existiert.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-md border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
        Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link
        zum Zurücksetzen des Passworts geschickt.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@beispiel.de"
          required
          autoComplete="email"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Wird gesendet…" : "Link zum Zurücksetzen senden"}
      </Button>
    </form>
  );
}
