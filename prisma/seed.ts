import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient();

/**
 * Legt den Demo-Operator an, mit dem die App läuft, bis der Auth-Slice
 * (Supabase Auth) echte operator_admin-Sessions liefert.
 * Siehe DEMO_OPERATOR_ID in src/server/api/trpc.ts.
 */
async function main() {
  const operator = await db.operator.upsert({
    where: { id: "demo-operator" },
    update: {},
    create: { id: "demo-operator", name: "Demo Transport GmbH" },
  });
  console.log(`Seed ok: Operator "${operator.name}" (${operator.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
