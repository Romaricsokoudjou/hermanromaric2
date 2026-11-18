import { answer, logConversation } from "@/lib/ai";
import { getCurrentUser, getIp } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const ip = await getIp();
  if (!rateLimit(`ai:${ip}`, 20, 60_000)) return Response.json({ error: "Trop de messages. Patientez un instant." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { message?: string; sessionKey?: string; history?: { role: "user" | "assistant"; content: string }[] } | null;
  const message = String(body?.message ?? "").slice(0, 500).trim();
  if (!message) return Response.json({ error: "Message vide." }, { status: 400 });
  const s = await getSettings();
  if (!s["ai.enabled"]) return Response.json({ reply: `L'assistant est momentanément indisponible. ${s["ai.handoff_text"]}` });
  const user = await getCurrentUser();
  const history = (body?.history ?? []).filter((m) => m && (m.role === "user" || m.role === "assistant")).map((m) => ({ role: m.role, content: String(m.content).slice(0, 800) })).slice(-8);
  const reply = await answer(message, history, !!user);
  const key = String(body?.sessionKey ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 64) || ip;
  await logConversation(key, user?.id ?? null, message, reply).catch(() => {});
  return Response.json({ reply });
}
