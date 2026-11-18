import { processChariowWebhook } from "@/lib/payments";

export async function POST(req: Request) {
  // Le corps brut est nécessaire : la signature HMAC couvre exactement les octets reçus.
  const raw = await req.text();
  const r = await processChariowWebhook(raw, req.headers);
  return new Response(r.message, { status: r.status });
}
