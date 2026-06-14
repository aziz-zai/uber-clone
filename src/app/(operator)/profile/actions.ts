"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "~/lib/supabase/server";
import { db } from "~/server/db";

export type UpdateNameResult = { success: true } | { error: string };

export async function updateOperatorName(
  formData: FormData,
): Promise<UpdateNameResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet." };

  const operatorId = user.app_metadata?.operator_id as string | undefined;
  if (!operatorId) return { error: "Kein Operator-Konto verknüpft." };

  const parsed = z.string().min(2).max(100).safeParse(formData.get("name"));
  if (!parsed.success) return { error: "Name muss 2–100 Zeichen lang sein." };

  await db.operator.update({
    where: { id: operatorId },
    data: { name: parsed.data },
  });

  revalidatePath("/profile");
  return { success: true };
}
