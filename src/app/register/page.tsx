import { type Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren — Operator Portal" };

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">OP</span>
          </div>
          <h1 className="text-xl font-semibold">Konto erstellen</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Starten Sie Ihr Operator-Portal — kostenlos.
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
