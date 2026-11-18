export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super administrateur",
  admin: "Administrateur",
  registration_manager: "Gestionnaire des inscriptions",
  finance_manager: "Gestionnaire financier",
  content_manager: "Gestionnaire de contenu",
  learner: "Apprenant",
};

export const STAFF_ROLES = ["super_admin", "admin", "registration_manager", "finance_manager", "content_manager"] as const;

export const PERMISSIONS: Record<string, string> = {
  "dashboard.view": "Voir le tableau de bord",
  "users.manage": "Gérer les utilisateurs et apprenants",
  "applications.manage": "Gérer les inscriptions",
  "catalog.manage": "Gérer les formations et centres",
  "pricing.manage": "Gérer les tarifs",
  "payments.manage": "Gérer les paiements",
  "finance.view": "Consulter la gestion financière",
  "wallets.manage": "Gérer les portefeuilles",
  "rewards.manage": "Gérer le programme HERMAN REWARDS",
  "withdrawals.manage": "Valider les retraits",
  "content.manage": "Gérer les contenus et médias",
  "ai.manage": "Gérer HERMAN AI",
  "notifications.manage": "Gérer les notifications",
  "admins.manage": "Gérer les administrateurs et permissions",
  "settings.manage": "Modifier les paramètres généraux",
  "audit.view": "Consulter le journal d'audit",
};

const ALL = Object.keys(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ALL,
  admin: ALL.filter((p) => p !== "admins.manage"),
  registration_manager: ["dashboard.view", "users.manage", "applications.manage", "notifications.manage"],
  finance_manager: ["dashboard.view", "payments.manage", "finance.view", "wallets.manage", "withdrawals.manage", "rewards.manage"],
  content_manager: ["dashboard.view", "catalog.manage", "content.manage", "ai.manage", "notifications.manage"],
  learner: [],
};

export function can(role: string | undefined | null, perm: string) {
  return !!role && (ROLE_PERMISSIONS[role] ?? []).includes(perm);
}

export function isStaff(role: string | undefined | null) {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}
