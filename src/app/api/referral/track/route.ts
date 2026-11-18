import { eq } from "drizzle-orm";
import { db } from "@/db";
import { referralCodes, referralEvents } from "@/db/schema";
import { getIp } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const ip = await getIp();
  if (!rateLimit(`track:${ip}`, 20, 3600_000)) return Response.json({ ok: false }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = String(body?.code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  if (!code) return Response.json({ ok: false }, { status: 400 });
  const [rc] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
  if (!rc) return Response.json({ ok: false }, { status: 404 });
  await db.insert(referralEvents).values({ type: "link_visit", referrerId: rc.userId, meta: { ip } });
  return Response.json({ ok: true });
}
