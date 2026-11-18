import { ActionForm, Field } from "@/components/ActionForm";
import { MediaInput } from "@/components/MediaInput";
import { saveProgramAction } from "@/app/actions/admin";
import type { trainingPrograms } from "@/db/schema";

export function ProgramForm({ p }: { p?: typeof trainingPrograms.$inferSelect }) {
  return (
    <ActionForm action={saveProgramAction} submitLabel="Enregistrer la formation" submitClass="btn btn-primary">
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre" name="title" defaultValue={p?.title} />
        <Field label="Adresse (slug)" name="slug" defaultValue={p?.slug} required={false} hint="Générée depuis le titre si vide" />
      </div>
      <Field label="Description courte" name="shortDescription" as="textarea" rows={2} defaultValue={p?.shortDescription} />
      <Field label="Description détaillée" name="description" as="textarea" rows={4} defaultValue={p?.description} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Objectifs pédagogiques (un par ligne)" name="objectives" as="textarea" rows={4} defaultValue={p?.objectives.join("\n")} required={false} />
        <Field label="Compétences développées (une par ligne)" name="skills" as="textarea" rows={4} defaultValue={p?.skills.join("\n")} required={false} />
        <Field label="Programmes disponibles (un par ligne)" name="programs" as="textarea" rows={4} defaultValue={p?.programs.join("\n")} required={false} />
        <Field label="Débouchés (un par ligne)" name="careers" as="textarea" rows={4} defaultValue={p?.careers.join("\n")} required={false} />
      </div>
      <MediaInput name="imageUrl" label="Photographie" folder="images/formations" defaultValue={p?.imageUrl} />
      <div className="flex flex-wrap items-center gap-6">
        <div className="w-32"><Field label="Ordre" name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} required={false} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={p?.isActive ?? true} /> Formation active (visible)</label>
      </div>
    </ActionForm>
  );
}
