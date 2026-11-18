import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { ENTITIES, type EntityCfg } from "@/lib/entities";
import { ActionForm, Field } from "@/components/ActionForm";
import { MediaInput } from "@/components/MediaInput";
import { deleteEntityAction, saveEntityAction } from "@/app/actions/admin";
import { AdminTitle, Panel } from "@/components/admin";

type Row = Record<string, unknown>;

function Fields({ cfg, row }: { cfg: EntityCfg; row?: Row }) {
  return (
    <>
      {cfg.fields.map((f) => {
        const v = row?.[f.name];
        if (f.kind === "bool") return <label key={f.name} className="flex items-center gap-2 text-sm"><input type="checkbox" name={f.name} defaultChecked={row ? !!v : true} /> {f.label}</label>;
        if (f.kind === "image" || f.kind === "file") return <MediaInput key={f.name} name={f.name} label={f.label} folder={f.folder ?? "images/galerie"} defaultValue={v as string} required={f.required} kind={f.kind} />;
        if (f.kind === "textarea") return <Field key={f.name} label={f.label} name={f.name} as="textarea" rows={4} defaultValue={v as string} required={f.required} hint={f.hint} />;
        if (f.kind === "select") return <Field key={f.name} label={f.label} name={f.name} as="select" defaultValue={v as string} required={f.required} hint={f.hint}>{f.options!.map((o) => <option key={o}>{o}</option>)}</Field>;
        return <Field key={f.name} label={f.label} name={f.name} type={f.kind === "number" ? "number" : "text"} defaultValue={(v as string) ?? (f.kind === "number" ? 0 : undefined)} required={f.required} hint={f.hint} />;
      })}
    </>
  );
}

export default async function Page({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const cfg = ENTITIES[type];
  if (!cfg) notFound();
  await requirePermission(cfg.perm);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (await db.select().from(cfg.table as any)) as Row[];
  rows.sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) || +new Date(String(b.createdAt ?? b.updatedAt ?? b.publishedAt ?? 0)) - +new Date(String(a.createdAt ?? a.updatedAt ?? a.publishedAt ?? 0)));
  return (
    <div>
      <AdminTitle title={cfg.label} subtitle={cfg.help} />
      <Panel title="Ajouter">
        <ActionForm action={saveEntityAction} submitLabel="Créer" submitClass="btn btn-primary">
          <input type="hidden" name="__type" value={type} />
          {cfg.keyedCreate && <Field label="Clé" name="key" placeholder="ex. brand.logo" />}
          <Fields cfg={cfg} />
        </ActionForm>
      </Panel>
      <div className="mt-6 space-y-3">
        {rows.map((r) => {
          const id = String(r[cfg.idField]);
          return (
            <details key={id} className="card p-4">
              <summary className="cursor-pointer list-none"><b>{cfg.title(r)}</b><span className="block text-xs text-neutral-500">{cfg.subtitle?.(r)}</span></summary>
              <div className="mt-4 space-y-3">
                <ActionForm action={saveEntityAction} submitLabel="Enregistrer" submitClass="btn btn-primary btn-sm">
                  <input type="hidden" name="__type" value={type} />
                  <input type="hidden" name="__id" value={id} />
                  <Fields cfg={cfg} row={r} />
                </ActionForm>
                {!cfg.noDelete && (
                  <ActionForm action={deleteEntityAction} submitLabel="Supprimer" submitClass="btn btn-outline btn-sm text-red-600" confirmText="Supprimer définitivement cet élément ?" className="">
                    <input type="hidden" name="__type" value={type} />
                    <input type="hidden" name="__id" value={id} />
                  </ActionForm>
                )}
              </div>
            </details>
          );
        })}
        {!rows.length && <p className="text-sm text-neutral-500">Aucun élément pour le moment.</p>}
      </div>
    </div>
  );
}
