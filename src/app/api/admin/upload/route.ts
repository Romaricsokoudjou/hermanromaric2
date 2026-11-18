import { mkdir, readdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { audit, getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { MEDIA_FOLDERS, MIME, publicDir } from "@/lib/media";
import { slugify } from "@/lib/format";

const MAX = 60 * 1024 * 1024;

async function guard() {
  const u = await getCurrentUser();
  return u && can(u.role, "content.manage") ? u : null;
}

export async function POST(req: Request) {
  const user = await guard();
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 403 });
  const fd = await req.formData();
  const folder = String(fd.get("folder") ?? "");
  const file = fd.get("file");
  if (!(MEDIA_FOLDERS as readonly string[]).includes(folder)) return Response.json({ error: "Dossier invalide" }, { status: 400 });
  if (!(file instanceof File) || !file.size) return Response.json({ error: "Fichier manquant" }, { status: 400 });
  const ext = path.extname(file.name).toLowerCase();
  if (!MIME[ext]) return Response.json({ error: "Type de fichier non autorisé (jpg, png, webp, gif, mp4, webm, pdf)" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "Fichier trop volumineux (60 Mo max)" }, { status: 400 });
  const replace = String(fd.get("replace") ?? "");
  const base = slugify(path.basename(file.name, ext)) || "fichier";
  const name = replace && replace.startsWith(folder + "/") && !replace.includes("..") ? path.basename(replace) : `${Date.now()}-${base}${ext}`;
  const dir = path.join(publicDir(), folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  await audit(user.id, "media.upload", "media", `${folder}/${name}`);
  return Response.json({ url: `/api/media/${folder}/${name}` });
}

export async function GET() {
  const user = await guard();
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 403 });
  const out: { folder: string; name: string; size: number; url: string }[] = [];
  for (const folder of MEDIA_FOLDERS) {
    try {
      for (const name of await readdir(path.join(publicDir(), folder))) {
        if (name.startsWith(".")) continue;
        const s = await stat(path.join(publicDir(), folder, name));
        out.push({ folder, name, size: s.size, url: `/api/media/${folder}/${name}` });
      }
    } catch {}
  }
  return Response.json({ files: out });
}

export async function DELETE(req: Request) {
  const user = await guard();
  if (!user) return Response.json({ error: "Non autorisé" }, { status: 403 });
  const { folder, name } = (await req.json().catch(() => ({}))) as { folder?: string; name?: string };
  if (!folder || !name || !(MEDIA_FOLDERS as readonly string[]).includes(folder) || name.includes("/") || name.includes("..")) return Response.json({ error: "Requête invalide" }, { status: 400 });
  await unlink(path.join(publicDir(), folder, name)).catch(() => {});
  await audit(user.id, "media.delete", "media", `${folder}/${name}`);
  return Response.json({ ok: true });
}
