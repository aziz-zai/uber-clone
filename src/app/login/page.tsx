import { type Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden — Operator Portal" };

export default function LoginPage() {
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
        <LoginForm />
      </div>
    </div>
  );
}
