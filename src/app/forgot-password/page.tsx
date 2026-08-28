import { type Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Passwort vergessen — Operator Portal" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">OP</span>
          </div>
          <h1 className="text-xl font-semibold">Passwort vergessen</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gib deine E-Mail ein, wir schicken dir einen Link zum Zurücksetzen.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            Zurück zur Anmeldung
          </Link>
        </p>
      </div>
    </div>
  );
}
