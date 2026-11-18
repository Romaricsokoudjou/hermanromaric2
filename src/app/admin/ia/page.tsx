import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { aiConversations } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { getSettings, type SettingKey } from "@/lib/settings";
import { ActionForm } from "@/components/ActionForm";
import { SettingsFields } from "@/components/SettingsFields";
import { saveSettingsAction } from "@/app/actions/admin";
import { dateFr } from "@/lib/format";
import { AdminTitle, Panel } from "@/components/admin";

export const metadata = { title: "HERMAN AI" };

export default async function Page() {
  await requirePermission("ai.manage");
  const [s, convs] = await Promise.all([getSettings(), db.select().from(aiConversations).orderBy(desc(aiConversations.updatedAt)).limit(30)]);
  return (
    <div className="space-y-6">
      <AdminTitle title="HERMAN AI ASSISTANT" subtitle="L'assistant n'invente aucun tarif ni récompense : il lit les tarifs officiels et paramètres en base, ainsi que la base de connaissances." />
      <Panel title="État">
        <p className="text-sm">Fournisseur IA : {process.env.AI_API_KEY ? <b className="text-green-700">configuré (AI_API_KEY)</b> : <b className="text-amber-700">non configuré — réponses factuelles basées sur la base de connaissances</b>}</p>
        <p className="mt-1 text-xs text-neutral-500">Variables : AI_API_KEY, AI_API_URL (compatible OpenAI), AI_MODEL. Aucune clé n&apos;est exposée au navigateur.</p>
        <Link href="/admin/contenu/base-connaissances" className="btn btn-dark btn-sm mt-3">Gérer la base de connaissances →</Link>
      </Panel>
      <Panel title="Paramètres">
        <ActionForm action={saveSettingsAction} submitLabel="Enregistrer" submitClass="btn btn-primary btn-sm" className="space-y-4">
          <input type="hidden" name="__group" value="ai" />
          <SettingsFields keys={["ai.enabled", "ai.handoff_text"] as SettingKey[]} s={s} />
        </ActionForm>
      </Panel>
      <Panel title="Conversations récentes">
        <div className="space-y-2">
          {convs.map((c) => (
            <details key={c.id} className="rounded-xl border p-3 text-sm">
              <summary className="cursor-pointer">{dateFr(c.updatedAt, true)} · {c.messages.length} message(s) · {c.userId ? "utilisateur connecté" : "visiteur"}</summary>
              <ul className="mt-2 space-y-1">{c.messages.map((m, i) => (<li key={i} className={m.role === "user" ? "text-neutral-900" : "text-neutral-500"}><b>{m.role === "user" ? "Visiteur" : "HERMAN AI"} :</b> {m.content}</li>))}</ul>
            </details>
          ))}
          {!convs.length && <p className="text-sm text-neutral-500">Aucune conversation.</p>}
        </div>
      </Panel>
    </div>
  );
}
