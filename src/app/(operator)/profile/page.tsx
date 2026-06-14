import { redirect } from "next/navigation";
import { type Metadata } from "next";
import { createClient } from "~/lib/supabase/server";
import { db } from "~/server/db";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profil — Operator Portal" };

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4 border-b border-border last:border-0">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs break-all" : "text-sm"}>{value}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const operatorId = user.app_metadata?.operator_id as string | undefined;

  const operator = operatorId
    ? await db.operator.findUnique({
        where: { id: operatorId },
        include: { _count: { select: { vehicles: true, drivers: true } } },
      })
    : null;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Profil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Konto- und Mandanten-Informationen.
          </p>
        </div>

        {/* Account */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Konto
          </h2>
          <InfoRow label="E-Mail" value={user.email ?? "—"} />
          <InfoRow label="User-ID" value={user.id} mono />
          <InfoRow
            label="Erstellt"
            value={new Date(user.created_at).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          />
        </section>

        {/* Operator / Tenant */}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Operator-Mandant
          </h2>

          {operator ? (
            <>
              <div className="mb-4">
                <InfoRow label="Operator-ID" value={operator.id} mono />
                <InfoRow
                  label="Fahrzeuge"
                  value={String(operator._count.vehicles)}
                />
                <InfoRow
                  label="Fahrer"
                  value={String(operator._count.drivers)}
                />
                <InfoRow
                  label="Angelegt am"
                  value={new Date(operator.createdAt).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                />
              </div>
              <ProfileForm currentName={operator.name} />
            </>
          ) : (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-medium text-destructive">
                Kein Operator-Mandant verknüpft
              </p>
              <p className="mt-1 text-xs text-destructive/80">
                {operatorId
                  ? `app_metadata.operator_id = "${operatorId}" existiert nicht in der Datenbank.`
                  : "app_metadata.operator_id ist nicht gesetzt."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
