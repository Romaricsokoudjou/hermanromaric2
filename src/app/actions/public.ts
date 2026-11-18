"use server";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { getIp } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { safe, str } from "@/lib/action";
import type { FormState } from "@/components/ActionForm";

export async function contactAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    if (str(fd, "website")) throw new Error("Message refusé.");
    const ip = await getIp();
    if (!rateLimit(`contact:${ip}`, 4, 3600_000)) throw new Error("Trop de messages envoyés. Réessayez plus tard.");
    const name = str(fd, "name");
    const message = str(fd, "message");
    if (name.length < 2 || message.length < 10) throw new Error("Veuillez renseigner votre nom et un message d'au moins 10 caractères.");
    if (!str(fd, "email") && !str(fd, "phone")) throw new Error("Indiquez un e-mail ou un téléphone pour que nous puissions vous répondre.");
    await db.insert(contactMessages).values({ name: name.slice(0, 120), email: str(fd, "email").slice(0, 160) || null, phone: str(fd, "phone").slice(0, 30) || null, message: message.slice(0, 3000) });
    return "Message envoyé. Nous vous répondrons dans les meilleurs délais.";
  });
}
