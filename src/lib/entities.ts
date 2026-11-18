import type { PgTable } from "drizzle-orm/pg-core";
import { centers, documents, gallery, instructors, knowledgeBase, news, siteContent, testimonials, videos } from "@/db/schema";

export type FieldDef = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "image" | "file" | "bool" | "number" | "select";
  options?: string[];
  required?: boolean;
  folder?: string;
  hint?: string;
};

export type EntityCfg = {
  label: string;
  perm: string;
  table: PgTable;
  idField: "id" | "key";
  fields: FieldDef[];
  title: (row: Record<string, unknown>) => string;
  subtitle?: (row: Record<string, unknown>) => string;
  noDelete?: boolean;
  keyedCreate?: boolean;
  help?: string;
};

const s = (v: unknown) => String(v ?? "");

export const ENTITIES: Record<string, EntityCfg> = {
  centres: {
    label: "Centres",
    perm: "catalog.manage",
    table: centers,
    idField: "id",
    fields: [
      { name: "name", label: "Nom du centre", kind: "text", required: true },
      { name: "address", label: "Adresse", kind: "textarea", required: true },
      { name: "mapsUrl", label: "Lien Google Maps", kind: "text" },
      { name: "phone", label: "Téléphone du centre", kind: "text" },
      { name: "imageUrl", label: "Photo", kind: "image", folder: "images/galerie" },
      { name: "sortOrder", label: "Ordre d'affichage", kind: "number" },
      { name: "isActive", label: "Actif", kind: "bool" },
    ],
    title: (r) => s(r.name),
    subtitle: (r) => s(r.address),
  },
  enseignants: {
    label: "Enseignants",
    perm: "content.manage",
    table: instructors,
    idField: "id",
    fields: [
      { name: "name", label: "Nom", kind: "text", required: true },
      { name: "title", label: "Fonction / spécialité", kind: "text" },
      { name: "bio", label: "Présentation", kind: "textarea" },
      { name: "imageUrl", label: "Photo", kind: "image", folder: "images/enseignants" },
      { name: "sortOrder", label: "Ordre", kind: "number" },
      { name: "isPublished", label: "Publié", kind: "bool" },
    ],
    title: (r) => s(r.name),
    subtitle: (r) => s(r.title),
  },
  galerie: {
    label: "Galerie",
    perm: "content.manage",
    table: gallery,
    idField: "id",
    fields: [
      { name: "title", label: "Légende", kind: "text" },
      { name: "imageUrl", label: "Image", kind: "image", folder: "images/galerie", required: true },
      { name: "category", label: "Catégorie", kind: "text" },
      { name: "sortOrder", label: "Ordre", kind: "number" },
      { name: "isPublished", label: "Publié", kind: "bool" },
    ],
    title: (r) => s(r.title) || "Image",
    subtitle: (r) => s(r.category),
  },
  videos: {
    label: "Vidéos",
    perm: "content.manage",
    table: videos,
    idField: "id",
    fields: [
      { name: "slot", label: "Espace vidéo", kind: "select", options: ["presentation", "formations", "temoignages"], required: true, hint: "presentation = Présentation · formations = Immersion · temoignages = Témoignages" },
      { name: "title", label: "Titre", kind: "text", required: true },
      { name: "url", label: "Fichier vidéo ou lien YouTube / Vimeo / Facebook", kind: "file", folder: "videos", required: true },
      { name: "isPublished", label: "Publiée", kind: "bool" },
    ],
    title: (r) => s(r.title),
    subtitle: (r) => `Espace : ${s(r.slot)}`,
    help: "Seules les vidéos réelles de l'établissement doivent être publiées.",
  },
  actualites: {
    label: "Actualités",
    perm: "content.manage",
    table: news,
    idField: "id",
    fields: [
      { name: "title", label: "Titre", kind: "text", required: true },
      { name: "excerpt", label: "Résumé", kind: "textarea" },
      { name: "content", label: "Contenu", kind: "textarea", required: true },
      { name: "imageUrl", label: "Image", kind: "image", folder: "banners" },
      { name: "isPublished", label: "Publiée", kind: "bool" },
    ],
    title: (r) => s(r.title),
    subtitle: (r) => (r.isPublished ? "Publiée" : "Brouillon"),
  },
  temoignages: {
    label: "Témoignages",
    perm: "content.manage",
    table: testimonials,
    idField: "id",
    fields: [
      { name: "authorName", label: "Auteur", kind: "text", required: true },
      { name: "program", label: "Formation suivie", kind: "text" },
      { name: "content", label: "Témoignage (authentique uniquement)", kind: "textarea", required: true },
      { name: "imageUrl", label: "Photo", kind: "image", folder: "images/temoignages" },
      { name: "isPublished", label: "Publié", kind: "bool" },
    ],
    title: (r) => s(r.authorName),
    subtitle: (r) => s(r.program),
  },
  documents: {
    label: "Documents & agrément",
    perm: "content.manage",
    table: documents,
    idField: "id",
    fields: [
      { name: "kind", label: "Type", kind: "select", options: ["agrement", "reglement", "autre"], required: true, hint: "« agrement » s'affiche sur la page Institution" },
      { name: "title", label: "Titre", kind: "text", required: true },
      { name: "fileUrl", label: "Fichier (PDF ou image)", kind: "file", folder: "documents", required: true },
      { name: "isPublished", label: "Publié", kind: "bool" },
    ],
    title: (r) => s(r.title),
    subtitle: (r) => s(r.kind),
  },
  textes: {
    label: "Textes, FAQ, légal & logo",
    perm: "content.manage",
    table: siteContent,
    idField: "key",
    keyedCreate: true,
    noDelete: true,
    fields: [
      { name: "title", label: "Titre", kind: "text", required: true },
      { name: "body", label: "Contenu", kind: "textarea", required: true, hint: "« ## Titre » pour un intertitre, « - » pour une liste. FAQ : question puis réponse, séparées par une ligne vide. Clé « brand.logo » : mettre l'URL du logo." },
    ],
    title: (r) => `${s(r.title)} (${s(r.key)})`,
    subtitle: (r) => s(r.body).slice(0, 90),
    help: "Clés : history, vision, mission, commitments, faq.referral, referral.terms, legal.*, brand.logo",
  },
  "base-connaissances": {
    label: "Base de connaissances HERMAN AI",
    perm: "ai.manage",
    table: knowledgeBase,
    idField: "id",
    fields: [
      { name: "title", label: "Sujet", kind: "text", required: true },
      { name: "content", label: "Réponse officielle", kind: "textarea", required: true },
      { name: "keywords", label: "Mots-clés (séparés par des espaces)", kind: "text" },
      { name: "isActive", label: "Actif", kind: "bool" },
    ],
    title: (r) => s(r.title),
    subtitle: (r) => s(r.content).slice(0, 90),
    help: "L'assistant ne s'appuie que sur ces informations et sur les tarifs officiels de la base de données.",
  },
};
