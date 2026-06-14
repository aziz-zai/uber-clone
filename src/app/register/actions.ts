"use server";

import { z } from "zod";
import { db } from "~/server/db";
import { createAdminClient } from "~/lib/supabase/admin";

const RegisterSchema = z.object({
  companyName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export type RegisterResult = { success: true } | { error: string };

export async function registerOperator(
  formData: FormData,
): Promise<RegisterResult> {
  const parsed = RegisterSchema.safeParse({
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Ungültige Eingabe." };
  }

  const { companyName, email, password } = parsed.data;

  // 1. Operator-Datensatz anlegen
  const operator = await db.operator.create({ data: { name: companyName } });

  // 2. Supabase-User anlegen; operator_id in app_metadata (nie user_metadata)
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    app_metadata: { operator_id: operator.id },
    email_confirm: true, // MVP: kein separater E-Mail-Bestätigungsflow
  });

  if (error) {
    // Rollback: Operator-Datensatz wieder entfernen
    await db.operator.delete({ where: { id: operator.id } });
    if (error.message.toLowerCase().includes("already")) {
      return { error: "Diese E-Mail ist bereits registriert." };
    }
    return { error: "Registrierung fehlgeschlagen. Bitte erneut versuchen." };
  }

  return { success: true };
}
