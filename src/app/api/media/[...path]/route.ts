import { readFile } from "fs/promises";
import path from "path";
import { MEDIA_FOLDERS, MIME, publicDir } from "@/lib/media";

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const rel = parts.join("/");
  const folder = MEDIA_FOLDERS.find((f) => rel.startsWith(f + "/"));
  if (!folder || rel.includes("..")) return new Response("Introuvable", { status: 404 });
  const abs = path.join(publicDir(), rel);
  if (!abs.startsWith(path.join(publicDir(), folder))) return new Response("Introuvable", { status: 404 });
  const mime = MIME[path.extname(abs).toLowerCase()];
  if (!mime) return new Response("Introuvable", { status: 404 });
  try {
    const buf = await readFile(abs);
    return new Response(new Uint8Array(buf), { headers: { "content-type": mime, "cache-control": "public, max-age=3600" } });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
