import { unstable_rethrow } from "next/navigation";
import type { FormState } from "@/components/ActionForm";

/** Exécute une action serveur et convertit les erreurs métier en message affichable. */
export async function safe(fn: () => Promise<string | void | { info: string }>): Promise<FormState> {
  try {
    const r = await fn();
    if (r && typeof r === "object") return { info: r.info };
    return { ok: r || "Enregistré avec succès." };
  } catch (e) {
    unstable_rethrow(e);
    return { error: e instanceof Error ? e.message : "Une erreur est survenue." };
  }
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const num = (fd: FormData, k: string) => {
  const v = Number(String(fd.get(k) ?? "").replace(/\s/g, ""));
  return Number.isFinite(v) ? Math.round(v) : 0;
};
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
