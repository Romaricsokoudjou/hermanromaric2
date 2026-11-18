"use client";

import { useState } from "react";

export function MediaInput({ name, defaultValue, folder, label, required, kind = "image" }: { name: string; defaultValue?: string | null; folder: string; label: string; required?: boolean; kind?: "image" | "file" }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function upload(file: File) {
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.set("folder", folder);
    fd.set("file", file);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const j = await r.json();
    if (j.url) setValue(j.url);
    else setErr(j.error ?? "Échec du téléversement");
    setBusy(false);
  }
  return (
    <div>
      <label className="label">{label}{required && <span className="text-brand"> *</span>}</label>
      <input name={name} value={value} onChange={(e) => setValue(e.target.value)} required={required} className="input" placeholder="URL ou téléversez un fichier ↓" />
      <div className="mt-2 flex items-center gap-3">
        <input type="file" accept={kind === "image" ? "image/*" : "image/*,video/mp4,video/webm,application/pdf"} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="text-xs" aria-label={`Téléverser ${label}`} />
        {busy && <span className="text-xs text-neutral-500">Envoi…</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(value) && <img src={value} alt="" className="h-10 w-10 rounded object-cover" />}
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
