import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, rewardTransactions, rewardWallets, userProfiles, users, withdrawalRequests } from "@/db/schema";
import { audit, getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

const esc = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString() : String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "aucune donnée\n";
  const keys = Object.keys(rows[0]);
  return "\uFEFF" + [keys.join(";"), ...rows.map((r) => keys.map((k) => esc(r[k])).join(";"))].join("\n") + "\n";
};

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !(can(user.role, "finance.view") || can(user.role, "rewards.manage"))) return new Response("Non autorisé", { status: 403 });
  const type = new URL(req.url).searchParams.get("type") ?? "";
  let rows: Record<string, unknown>[] = [];
  if (type === "payments") rows = (await db.select().from(payments).orderBy(desc(payments.createdAt))) as never;
  else if (type === "orders") rows = (await db.select().from(orders).orderBy(desc(orders.createdAt))) as never;
  else if (type === "ledger") rows = (await db.select().from(rewardTransactions).orderBy(desc(rewardTransactions.createdAt))) as never;
  else if (type === "wallets")
    rows = (await db.select({ userId: rewardWallets.userId, nom: userProfiles.lastName, prenom: userProfiles.firstName, telephone: users.phone, enAttente: rewardWallets.pending, disponible: rewardWallets.available, retire: rewardWallets.withdrawn }).from(rewardWallets).innerJoin(users, eq(users.id, rewardWallets.userId)).innerJoin(userProfiles, eq(userProfiles.userId, rewardWallets.userId))) as never;
  else if (type === "withdrawals") rows = (await db.select().from(withdrawalRequests).orderBy(desc(withdrawalRequests.createdAt))) as never;
  else return new Response("Type inconnu", { status: 400 });
  await audit(user.id, "export.csv", "export", type);
  return new Response(csv(rows), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="herman-${type}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
