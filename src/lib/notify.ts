import { db } from "@/db";
import { notifications, userProfiles, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Envoi externe (e-mail / WhatsApp / SMS) via un webhook de messagerie configurable.
 *  Si aucun fournisseur n'est configuré, rien n'est envoyé (aucune fausse notification). */
export async function deliverExternal(channel: "email" | "whatsapp" | "sms", to: string, subject: string, body: string) {
  const url = process.env.MESSAGING_WEBHOOK_URL;
  if (!url || !to) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(process.env.MESSAGING_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.MESSAGING_WEBHOOK_TOKEN}` } : {}) },
      body: JSON.stringify({ channel, to, subject, body }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Notification interne liée à un événement réel. `dedupeKey` empêche les doublons. */
export async function notify(opts: { userId: string; type: string; title: string; body: string; dedupeKey?: string; external?: boolean }) {
  const inserted = await db
    .insert(notifications)
    .values({ userId: opts.userId, type: opts.type, title: opts.title, body: opts.body, dedupeKey: opts.dedupeKey, channel: "internal", status: "sent" })
    .onConflictDoNothing()
    .returning({ id: notifications.id });
  if (inserted.length && opts.external) {
    const [u] = await db.select({ email: users.email, phone: users.phone }).from(users).where(eq(users.id, opts.userId));
    if (u) {
      const ok = await deliverExternal("whatsapp", u.phone, opts.title, opts.body);
      if (ok) await db.insert(notifications).values({ userId: opts.userId, type: opts.type, title: opts.title, body: opts.body, channel: "whatsapp", status: "sent" });
    }
  }
}

export async function displayName(userId: string) {
  const [p] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  return p ? `${p.firstName} ${p.lastName}` : "Un utilisateur";
}
