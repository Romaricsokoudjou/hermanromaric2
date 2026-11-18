import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiConversations, knowledgeBase } from "@/db/schema";
import { getCatalog, getCenters } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { fcfa } from "@/lib/format";

type Hist = { role: "user" | "assistant"; content: string }[];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function facts() {
  const [programs, centers, s] = await Promise.all([getCatalog(), getCenters(), getSettings()]);
  const tariffs = programs
    .map((p) => `• ${p.title} : ` + (p.durations.length ? p.durations.map((d) => `${d.label} (${d.diploma}) ${fcfa(d.tuitionFee)} + inscription et polo ${fcfa(d.enrollmentFee)}${d.installments.length ? `, tranches ${d.installments.map(fcfa).join(" + ")}` : ""}`).join(" ; ") : "tarifs à confirmer"))
    .join("\n");
  const centerTxt = centers.map((c) => `• ${c.name} : ${c.address}`).join("\n");
  const rewards = `HERMAN FASHION REWARDS${s["rewards.enabled"] ? "" : " (actuellement suspendu)"} : ${fcfa(s["rewards.signup_bonus"])} lorsque le filleul valide son inscription (compte valide, téléphone vérifié, contrôles antifraude) ; ${fcfa(s["rewards.training_bonus"])} lorsque son paiement éligible est confirmé par le système (${s["rewards.training_trigger"] === "full_payment" ? "paiement intégral" : "première tranche validée"}), une seule fois par filleul. Retrait minimum ${fcfa(s["withdrawal.min"])}${s["withdrawal.fee"] > 0 ? `, frais ${fcfa(s["withdrawal.fee"])}` : ", sans frais de retrait configurés"}. Parrainage direct uniquement : pas de commission multi-niveaux, pas de frais d'adhésion.`;
  const contact = `Téléphones : ${s["contact.phones"].join(", ")}. WhatsApp : ${s["contact.whatsapp_url"]}.`;
  return { programs, tariffs, centerTxt, rewards, contact, s };
}

async function kbMatches(q: string, limit = 3) {
  const items = await db.select().from(knowledgeBase).where(eq(knowledgeBase.isActive, true));
  const words = norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  return items
    .map((i) => {
      const hay = norm(`${i.title} ${i.keywords} ${i.content}`);
      return { i, score: words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.i);
}

const PRIVATE = /(mon solde|mon portefeuille|mes paiements|mes retraits|mon wallet|mes recompenses|mon historique|mon mot de passe)/;
const MUTATE = /(credit|ajouter .*solde|modifier .*solde|augmenter .*solde|donne.*(argent|fcfa)|change.*solde|valider mon retrait|rembours)/;

export async function answer(message: string, history: Hist, signedIn: boolean): Promise<string> {
  const q = norm(message);
  if (MUTATE.test(q)) return "Je ne peux ni créditer, ni modifier un solde, ni valider un retrait ou un remboursement : ces opérations sont réservées aux gestionnaires autorisés et tracées. Pour toute demande, contactez un conseiller humain.";
  if (PRIVATE.test(q))
    return signedIn
      ? "Vos données financières sont privées : je n'y ai pas accès. Retrouvez votre portefeuille, vos paiements et vos reçus dans votre espace : Mon espace → Récompenses (/compte/recompenses) et Paiements (/compte/paiements)."
      : "Vos données financières sont privées et je n'y ai pas accès. Connectez-vous (/connexion) pour consulter votre portefeuille, vos paiements et vos reçus depuis votre espace personnel.";

  const f = await facts();
  const kb = await kbMatches(message);

  const key = process.env.AI_API_KEY;
  if (key) {
    try {
      const system = `Tu es HERMAN AI ASSISTANT, assistant de CFP HERMAN FASHION (école de beauté à Douala, Cameroun). Réponds en français, de façon concise et chaleureuse.
RÈGLES STRICTES : n'invente JAMAIS un tarif, une récompense, un paiement, un délai ou une information administrative ; utilise uniquement les FAITS ci-dessous. Si l'information manque, dis-le et oriente vers un conseiller humain. Tu n'as accès à aucune donnée personnelle ou financière d'utilisateur et tu ne peux modifier aucun solde. Ne donne jamais de conseils d'investissement. Programme de parrainage = recommandation directe, pas pyramidal.
FAITS — TARIFS OFFICIELS (FCFA) :\n${f.tariffs}\nCENTRES :\n${f.centerTxt}\nPROGRAMME REWARDS : ${f.rewards}\nCONTACT : ${f.contact} ${f.s["ai.handoff_text"]}\nINSCRIPTION : créer un compte, vérifier le téléphone, choisir formations/durées/centre dans /compte/candidature, payer via Chariow (MTN MoMo, Orange Money, cartes), confirmation après vérification serveur, reçu généré.\nBASE DE CONNAISSANCES :\n${kb.map((k) => `- ${k.title}: ${k.content}`).join("\n")}`;
      const res = await fetch(`${process.env.AI_API_URL || "https://api.openai.com/v1"}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: process.env.AI_MODEL || "gpt-4o-mini", temperature: 0.2, max_tokens: 500, messages: [{ role: "system", content: system }, ...history.slice(-6), { role: "user", content: message }] }),
      });
      if (res.ok) {
        const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const t = j.choices?.[0]?.message?.content?.trim();
        if (t) return t;
      }
    } catch {
      /* repli sur les réponses basées sur la base de connaissances */
    }
  }

  // Mode sans fournisseur IA : réponses factuelles issues de la base de données et de la base de connaissances.
  if (/(tarif|prix|cout|combien|frais|tranche|payer combien)/.test(q)) return `Voici les tarifs officiels en vigueur :\n${f.tariffs}\n\nLes tarifs sont fixés par l'établissement et peuvent être consultés sur chaque fiche formation.`;
  if (/(parrain|recompense|bonus|gagner|reward|ambassadeur)/.test(q)) return `${f.rewards}\n\nDétails et règlement : /parrainage.`;
  if (/(retrait|retirer|mobile money|orange money|mtn)/.test(q) && /(retrait|retirer)/.test(q)) return `Les retraits se demandent depuis Mon espace → Récompenses, via MTN Mobile Money, Orange Money ou un autre moyen proposé. Minimum : ${fcfa(f.s["withdrawal.min"])}. Chaque demande est validée par un gestionnaire financier et n'est marquée « payée » qu'avec une preuve de transaction.`;
  if (/(centre|adresse|ou etes|localisation|itineraire|deido|raphael)/.test(q)) return `Nos centres :\n${f.centerTxt}\nCartes et itinéraires : /centres.`;
  if (/(conseiller|humain|appeler|telephone|whatsapp|contact|numero)/.test(q)) return `${f.contact}\n${f.s["ai.handoff_text"]}`;
  if (/(formation|specialite|metier|proposez|catalogue)/.test(q)) return `Nos formations :\n${f.programs.map((p) => `• ${p.title}`).join("\n")}\n\nDétails, objectifs et débouchés sur /formations.`;
  if (/(compte|tableau de bord|mon espace|dashboard)/.test(q)) return "Votre espace personnel (/compte) regroupe votre profil, vos inscriptions, paiements, reçus, notifications et votre portefeuille de récompenses. Connectez-vous via /connexion.";
  if (kb.length) return kb.map((k) => k.content).slice(0, 2).join("\n\n");
  if (/(bonjour|salut|bonsoir|hello|coucou)/.test(q)) return "Bonjour ! Je peux vous renseigner sur nos formations, nos tarifs officiels, l'inscription, les paiements et le programme de parrainage. Que souhaitez-vous savoir ?";
  return `Je n'ai pas cette information et je préfère ne pas l'inventer. ${f.s["ai.handoff_text"]} ${f.contact}`;
}

export async function logConversation(sessionKey: string, userId: string | null, user: string, assistant: string) {
  const at = new Date().toISOString();
  const entries = [
    { role: "user" as const, content: user.slice(0, 600), at },
    { role: "assistant" as const, content: assistant.slice(0, 1500), at },
  ];
  const [c] = await db.select().from(aiConversations).where(eq(aiConversations.sessionKey, sessionKey));
  if (c) await db.update(aiConversations).set({ messages: sql`${aiConversations.messages} || ${JSON.stringify(entries)}::jsonb`, updatedAt: new Date() }).where(eq(aiConversations.id, c.id));
  else await db.insert(aiConversations).values({ sessionKey, userId, messages: entries });
}
