import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { referralCodes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const [rc] = await db.select().from(referralCodes).where(eq(referralCodes.userId, user.id));
  if (!rc) return new Response("Introuvable", { status: 404 });
  const base = process.env.SITE_URL || new URL(req.url).origin;
  const svg = await QRCode.toString(`${base}/inscription?ref=${rc.code}`, { type: "svg", margin: 1, color: { dark: "#0c0c0d", light: "#ffffff" } });
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "private, max-age=3600" } });
}
