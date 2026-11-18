"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/* ───────── Capture persistante du code de parrainage (premier parrain valide) ───────── */
function RefInner() {
  const sp = useSearchParams();
  const ref = sp.get("ref");
  useEffect(() => {
    if (!ref || !/^[A-Za-z0-9]{4,20}$/.test(ref)) return;
    const code = ref.toUpperCase();
    const existing = document.cookie.split("; ").find((c) => c.startsWith("hf_ref="));
    if (!existing) {
      document.cookie = `hf_ref=${code}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
      try {
        localStorage.setItem("hf_ref", code);
      } catch {}
    }
    if (!sessionStorage.getItem("hf_ref_tracked")) {
      sessionStorage.setItem("hf_ref_tracked", "1");
      fetch("/api/referral/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => {});
    }
  }, [ref]);
  return null;
}
export function RefCapture() {
  return (
    <Suspense fallback={null}>
      <RefInner />
    </Suspense>
  );
}

/* ───────── Consentement cookies ───────── */
export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("hf_cookie")) setShow(true);
    } catch {}
  }, []);
  if (!show) return null;
  const choose = (v: string) => {
    try {
      localStorage.setItem("hf_cookie", v);
    } catch {}
    setShow(false);
  };
  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-xl rounded-2xl bg-ink p-4 text-sm text-white shadow-2xl lg:bottom-4" role="dialog" aria-label="Cookies">
      <p>
        Nous utilisons uniquement des cookies nécessaires (session, mémorisation du code de parrainage). <Link href="/legal/legal.cookies" className="underline">En savoir plus</Link>.
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => choose("accepted")} className="btn btn-primary btn-sm">J&apos;accepte</button>
        <button onClick={() => choose("necessary")} className="btn btn-ghost-light btn-sm">Nécessaires uniquement</button>
      </div>
    </div>
  );
}

/* ───────── HERMAN AI ASSISTANT ───────── */
type Msg = { role: "user" | "assistant"; content: string };
const SUGGESTIONS = ["Quels sont les tarifs ?", "Comment m'inscrire ?", "Comment fonctionne le parrainage ?", "Parler à un conseiller"];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Bonjour, je suis HERMAN AI ASSISTANT. Je peux vous renseigner sur nos formations, tarifs officiels, inscriptions, paiements et le programme de parrainage. Comment puis-je vous aider ?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const key = useRef("");
  useEffect(() => {
    try {
      key.current = localStorage.getItem("hf_chat") || crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem("hf_chat", key.current);
    } catch {
      key.current = Math.random().toString(36).slice(2);
    }
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next);
    setBusy(true);
    try {
      const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: t, sessionKey: key.current, history: next.slice(-8) }) });
      const j = await r.json();
      setMsgs([...next, { role: "assistant", content: j.reply ?? j.error ?? "Une erreur est survenue." }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Connexion impossible pour le moment. Réessayez dans un instant." }]);
    }
    setBusy(false);
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label="Ouvrir HERMAN AI ASSISTANT" className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white shadow-xl lg:bottom-6">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-xs">AI</span>
        <span className="hidden sm:inline">HERMAN AI</span>
      </button>
      {open && (
        <div className="fixed inset-x-3 bottom-36 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 sm:inset-x-auto sm:right-4 sm:w-96 lg:bottom-20" role="dialog" aria-label="Assistant HERMAN AI">
          <div className="flex items-center justify-between bg-ink px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">HERMAN AI ASSISTANT</p>
              <p className="text-[11px] text-white/60">Disponible 24 h/24</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fermer" className="text-white/70">✕</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-beige/40 p-4 text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 ${m.role === "user" ? "bg-brand text-white" : "bg-white text-neutral-800 shadow-sm"}`}>{m.content}</p>
              </div>
            ))}
            {busy && <p className="text-xs text-neutral-500">HERMAN AI écrit…</p>}
            <div ref={bottom} />
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-black/5 px-3 pt-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-full bg-beige px-2.5 py-1 text-[11px] font-medium hover:bg-beige-dark">{s}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} placeholder="Posez votre question…" className="input" aria-label="Votre message" />
            <button className="btn btn-primary btn-sm" disabled={busy}>Envoyer</button>
          </form>
        </div>
      )}
    </>
  );
}

export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-dark btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {}
      }}
    >
      {done ? "Copié ✓" : label}
    </button>
  );
}
