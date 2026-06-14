import { type Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden — Operator Portal" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const params = await searchParams;
  const registered = params.registered === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">OP</span>
          </div>
          <h1 className="text-xl font-semibold">Operator Portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bitte mit deinem Operator-Account anmelden.
          </p>
        </div>
        {registered && (
          <div className="mb-4 rounded-md border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
            Konto erstellt! Bitte jetzt anmelden.
          </div>
        )}
        <LoginForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Noch kein Konto?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
