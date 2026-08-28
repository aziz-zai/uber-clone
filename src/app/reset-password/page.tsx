import { type Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Neues Passwort — Operator Portal" };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">OP</span>
          </div>
          <h1 className="text-xl font-semibold">Neues Passwort setzen</h1>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
