"use client";

import { useCallback, useEffect, useState } from "react";

type F = { folder: string; name: string; size: number; url: string };

export function MediaManager({ folders }: { folders: string[] }) {
  const [files, setFiles] = useState<F[]>([]);
  const [folder, setFolder] = useState(folders[0]);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/upload");
    const j = await r.json();
    setFiles(j.files ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function up(file: File, replace?: string) {
    setMsg("Envoi…");
    const fd = new FormData();
    fd.set("folder", replace ? replace.split("/").slice(0, -1).join("/") : folder);
    fd.set("file", file);
    if (replace) fd.set("replace", replace);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const j = await r.json();
    setMsg(j.url ? "Fichier enregistré : " + j.url : j.error);
    load();
  }
  async function del(f: F) {
    if (!confirm(`Supprimer ${f.name} ?`)) return;
    await fetch("/api/admin/upload", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ folder: f.folder, name: f.name }) });
    load();
  }
  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div><label className="label">Dossier</label><select className="input" value={folder} onChange={(e) => setFolder(e.target.value)}>{folders.map((f) => (<option key={f}>{f}</option>))}</select></div>
        <div><label className="label">Fichier</label><input type="file" onChange={(e) => e.target.files?.[0] && up(e.target.files[0])} /></div>
        {msg && <p className="text-sm text-neutral-600">{msg}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {files.map((f) => (
          <div key={f.url} className="card overflow-hidden text-xs">
            {/\.(jpe?g|png|webp|gif)$/i.test(f.name) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.url} alt={f.name} className="h-32 w-full object-cover" />
            ) : (
              <div className="grid h-32 place-items-center bg-beige text-2xl">{/\.pdf$/i.test(f.name) ? "📄" : "🎬"}</div>
            )}
            <div className="space-y-1 p-3">
              <p className="break-all font-semibold">{f.folder}/{f.name}</p>
              <p className="text-neutral-500">{(f.size / 1024).toFixed(0)} Ko</p>
              <input readOnly value={f.url} className="input !py-1 text-[11px]" onFocus={(e) => e.currentTarget.select()} />
              <div className="flex items-center gap-2 pt-1">
                <label className="cursor-pointer font-semibold text-brand">Remplacer<input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && up(e.target.files[0], `${f.folder}/${f.name}`)} /></label>
                <button onClick={() => del(f)} className="font-semibold text-red-600">Supprimer</button>
              </div>
            </div>
          </div>
        ))}
        {!files.length && <p className="text-sm text-neutral-500">Aucun média téléversé.</p>}
      </div>
    </div>
  );
}
