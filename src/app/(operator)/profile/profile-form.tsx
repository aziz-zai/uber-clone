"use client";

import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { updateOperatorName } from "./actions";

export function ProfileForm({ currentName }: { currentName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateOperatorName(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="name">Firmenname</Label>
        <Input
          id="name"
          name="name"
          defaultValue={currentName}
          required
          minLength={2}
          maxLength={100}
        />
      </div>
      <Button type="submit" disabled={isPending} size="sm">
        {isPending ? "Speichern…" : "Speichern"}
      </Button>
      {error && <p className="text-sm text-destructive self-end">{error}</p>}
      {saved && (
        <p className="text-sm text-green-600 dark:text-green-400 self-end">
          Gespeichert.
        </p>
      )}
    </form>
  );
}
