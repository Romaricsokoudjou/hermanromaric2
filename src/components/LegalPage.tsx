import { notFound } from "next/navigation";
import { getContent } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { PageHero, RichText, Section } from "@/components/ui";

export async function LegalPage({ contentKey }: { contentKey: string }) {
  const c = await getContent(contentKey);
  if (!c) notFound();
  const s = contentKey === "legal.mentions" ? await getSettings() : null;
  return (
    <>
      <PageHero eyebrow="Informations légales" title={c.title} />
      <Section>
        <div className="mx-auto max-w-3xl">
          <RichText body={c.body} />
          {s?.["institution.legal_notes"] && <RichText body={s["institution.legal_notes"]} className="mt-6 border-t pt-6" />}
          <p className="mt-10 text-xs text-neutral-500">Dernière mise à jour : {c.updatedAt.toLocaleDateString("fr-FR")}</p>
        </div>
      </Section>
    </>
  );
}
