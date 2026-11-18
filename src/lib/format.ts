export function fcfa(n: number | null | undefined) {
  const v = Math.round(Number(n ?? 0));
  return `${v.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} FCFA`;
}

export function dateFr(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("fr-FR", {
    timeZone: "Africa/Douala",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function normalizePhone(raw: string) {
  let p = raw.replace(/[\s().-]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (!p.startsWith("+")) {
    if (/^(237)?[62]\d{8}$/.test(p)) p = p.startsWith("237") ? "+" + p : "+237" + p;
  }
  return p;
}

export function isValidPhone(p: string) {
  return /^\+\d{8,15}$/.test(p);
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  needs_review: "Validation administrative requise",
  pending_payment: "En attente de paiement",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  pending: "En attente",
  failed: "Paiement échoué",
  refunded: "Remboursé",
  to_verify: "À vérifier",
  paid: "Payée",
  recorded: "Demande enregistrée",
  pending_validation: "En attente de validation",
  approved: "Approuvée",
  processing: "En cours de paiement",
  rejected: "Rejetée",
  active: "Actif",
  suspended: "Suspendu",
  blocked: "Bloqué",
  validated: "Validé",
  suspicious: "Suspect",
  held: "En attente",
  released: "Libérée",
  open: "Ouverte",
  dismissed: "Classée",
};

export const TX_LABELS: Record<string, string> = {
  signup_bonus: "Bonus d'inscription",
  training_bonus: "Bonus de formation",
  hold: "Récompense mise en attente",
  hold_release: "Récompense libérée",
  hold_cancel: "Récompense annulée",
  withdrawal_request: "Demande de retrait",
  withdrawal_paid: "Retrait confirmé",
  withdrawal_release: "Retrait rejeté — montant restitué",
  admin_adjustment: "Ajustement administratif",
  clawback: "Reprise de récompense",
};
