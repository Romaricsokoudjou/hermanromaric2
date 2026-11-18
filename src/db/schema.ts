import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/* ───────── Accès & utilisateurs ───────── */
export const roles = pgTable("roles", {
  key: varchar("key", { length: 40 }).primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
});

export const permissions = pgTable("permissions", {
  key: varchar("key", { length: 60 }).primaryKey(),
  label: text("label").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleKey: varchar("role_key", { length: 40 }).notNull(),
    permissionKey: varchar("permission_key", { length: 60 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleKey, t.permissionKey] })],
);

export const users = pgTable(
  "users",
  {
    id: id(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 40 }).notNull().default("learner"),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active | suspended | blocked
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), uniqueIndex("users_phone_uq").on(t.phone)],
);

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  signupIp: varchar("signup_ip", { length: 64 }),
  signupUserAgent: text("signup_user_agent"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.tokenHash)],
);

export const verificationCodes = pgTable("verification_codes", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: varchar("purpose", { length: 20 }).notNull(), // email | phone | reset
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/* ───────── Catalogue ───────── */
export const centers = pgTable("centers", {
  id: id(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  mapsUrl: text("maps_url"),
  phone: text("phone"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const trainingPrograms = pgTable("training_programs", {
  id: id(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: text("title").notNull(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  objectives: jsonb("objectives").$type<string[]>().notNull().default([]),
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  programs: jsonb("programs").$type<string[]>().notNull().default([]),
  careers: jsonb("careers").$type<string[]>().notNull().default([]),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const trainingDurations = pgTable(
  "training_durations",
  {
    id: id(),
    programId: uuid("program_id").notNull().references(() => trainingPrograms.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 10 }).notNull(), // 3m | 6m | 1y
    label: text("label").notNull(),
    months: integer("months").notNull(),
    diploma: varchar("diploma", { length: 20 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [uniqueIndex("durations_program_key_uq").on(t.programId, t.key)],
);

export const trainingPrices = pgTable(
  "training_prices",
  {
    id: id(),
    durationId: uuid("duration_id").notNull().references(() => trainingDurations.id, { onDelete: "cascade" }),
    tuitionFee: integer("tuition_fee").notNull(),
    enrollmentFee: integer("enrollment_fee").notNull(),
    installments: jsonb("installments").$type<number[]>().notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("prices_duration_uq").on(t.durationId), check("prices_nonneg", sql`${t.tuitionFee} >= 0 and ${t.enrollmentFee} >= 0`)],
);

/* ───────── Candidatures, commandes, paiements ───────── */
export const applications = pgTable(
  "applications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    centerId: uuid("center_id").notNull().references(() => centers.id),
    status: varchar("status", { length: 24 }).notNull().default("draft"),
    // draft | needs_review | pending_payment | confirmed | cancelled
    indicativeTotal: integer("indicative_total").notNull().default(0),
    approvedTotal: integer("approved_total"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("applications_user_idx").on(t.userId)],
);

export const applicationItems = pgTable(
  "application_items",
  {
    id: id(),
    applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
    programId: uuid("program_id").notNull().references(() => trainingPrograms.id),
    durationId: uuid("duration_id").notNull().references(() => trainingDurations.id),
    tuitionFee: integer("tuition_fee").notNull(),
    enrollmentFee: integer("enrollment_fee").notNull(),
    installments: jsonb("installments").$type<number[]>().notNull().default([]),
  },
  (t) => [uniqueIndex("items_app_program_uq").on(t.applicationId, t.programId)],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    reference: varchar("reference", { length: 30 }).notNull(),
    applicationId: uuid("application_id").notNull().references(() => applications.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    amount: integer("amount").notNull(),
    paidAmount: integer("paid_amount").notNull().default(0),
    currency: varchar("currency", { length: 5 }).notNull().default("XAF"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending | confirmed | failed | refunded | to_verify
    provider: varchar("provider", { length: 30 }).notNull().default("chariow"),
    redirectedAt: timestamp("redirected_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("orders_ref_uq").on(t.reference), uniqueIndex("orders_app_uq").on(t.applicationId)],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    provider: varchar("provider", { length: 30 }).notNull(),
    providerTransactionId: varchar("provider_transaction_id", { length: 120 }).notNull(),
    amount: integer("amount").notNull(),
    installmentNo: integer("installment_no").notNull().default(1),
    status: varchar("status", { length: 20 }).notNull(), // confirmed | failed | refunded | to_verify
    method: varchar("method", { length: 40 }),
    source: varchar("source", { length: 20 }).notNull().default("webhook"), // webhook | manual
    verifiedBy: uuid("verified_by").references(() => users.id),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("payments_provider_tx_uq").on(t.provider, t.providerTransactionId)],
);

export const paymentWebhooks = pgTable(
  "payment_webhooks",
  {
    id: id(),
    provider: varchar("provider", { length: 30 }).notNull(),
    deliveryId: varchar("delivery_id", { length: 120 }).notNull(),
    event: varchar("event", { length: 80 }),
    signatureValid: boolean("signature_valid").notNull(),
    payload: jsonb("payload"),
    result: text("result"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("webhooks_delivery_uq").on(t.provider, t.deliveryId)],
);

export const receipts = pgTable(
  "receipts",
  {
    id: id(),
    number: varchar("number", { length: 30 }).notNull(),
    paymentId: uuid("payment_id").notNull().references(() => payments.id),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    amount: integer("amount").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("receipts_number_uq").on(t.number), uniqueIndex("receipts_payment_uq").on(t.paymentId)],
);

/* ───────── Notifications ───────── */
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 40 }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    channel: varchar("channel", { length: 20 }).notNull().default("internal"), // internal | email | whatsapp | sms
    status: varchar("status", { length: 20 }).notNull().default("sent"), // sent | queued | failed
    dedupeKey: varchar("dedupe_key", { length: 160 }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("notifications_dedupe_uq").on(t.dedupeKey), index("notifications_user_idx").on(t.userId)],
);

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: createdAt(),
});

/* ───────── Contenus ───────── */
export const instructors = pgTable("instructors", {
  id: id(),
  name: text("name").notNull(),
  title: text("title"),
  bio: text("bio"),
  imageUrl: text("image_url"),
  isPublished: boolean("is_published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const testimonials = pgTable("testimonials", {
  id: id(),
  authorName: text("author_name").notNull(),
  program: text("program"),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: createdAt(),
});

export const news = pgTable("news", {
  id: id(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow(),
});

export const gallery = pgTable("gallery", {
  id: id(),
  title: text("title"),
  imageUrl: text("image_url").notNull(),
  category: text("category"),
  isPublished: boolean("is_published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const videos = pgTable("videos", {
  id: id(),
  slot: varchar("slot", { length: 20 }).notNull(), // presentation | formations | temoignages
  title: text("title").notNull(),
  url: text("url").notNull(), // fichier téléversé ou lien YouTube / Vimeo / Facebook
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: createdAt(),
});

export const documents = pgTable("documents", {
  id: id(),
  kind: varchar("kind", { length: 30 }).notNull().default("autre"), // agrement | reglement | autre
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: createdAt(),
});

export const siteContent = pgTable("site_content", {
  key: varchar("key", { length: 80 }).primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeBase = pgTable("knowledge_base", {
  id: id(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  keywords: text("keywords").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionKey: varchar("session_key", { length: 64 }).notNull(),
  messages: jsonb("messages").$type<{ role: "user" | "assistant"; content: string; at: string }[]>().notNull().default([]),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────── Parrainage & récompenses ───────── */
export const referralCodes = pgTable(
  "referral_codes",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 20 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("referral_codes_user_uq").on(t.userId), uniqueIndex("referral_codes_code_uq").on(t.code)],
);

export const referralAttributions = pgTable(
  "referral_attributions",
  {
    id: id(),
    referrerId: uuid("referrer_id").notNull().references(() => users.id),
    referredUserId: uuid("referred_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 20 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | validated | suspicious | rejected
    signupIp: varchar("signup_ip", { length: 64 }),
    lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  // Un filleul n'a qu'un seul parrain : le premier valide.
  (t) => [uniqueIndex("attributions_referred_uq").on(t.referredUserId), index("attributions_referrer_idx").on(t.referrerId)],
);

export const referralEvents = pgTable(
  "referral_events",
  {
    id: id(),
    type: varchar("type", { length: 40 }).notNull(),
    referrerId: uuid("referrer_id").references(() => users.id),
    referredUserId: uuid("referred_user_id").references(() => users.id),
    uniqueKey: varchar("unique_key", { length: 160 }),
    meta: jsonb("meta"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("referral_events_key_uq").on(t.uniqueKey), index("referral_events_referrer_idx").on(t.referrerId)],
);

export const rewardWallets = pgTable(
  "reward_wallets",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    pending: integer("pending").notNull().default(0),
    available: integer("available").notNull().default(0),
    withdrawn: integer("withdrawn").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("wallets_user_uq").on(t.userId),
    check("wallet_nonneg", sql`${t.pending} >= 0 and ${t.available} >= 0 and ${t.withdrawn} >= 0`),
  ],
);

// Journal financier immuable (aucun UPDATE / DELETE : protégé par trigger SQL).
export const rewardTransactions = pgTable(
  "reward_transactions",
  {
    id: id(),
    walletId: uuid("wallet_id").notNull().references(() => rewardWallets.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    type: varchar("type", { length: 40 }).notNull(),
    // signup_bonus | training_bonus | hold | hold_release | hold_cancel | withdrawal_request
    // withdrawal_paid | withdrawal_release | admin_adjustment | clawback
    pendingDelta: integer("pending_delta").notNull().default(0),
    availableDelta: integer("available_delta").notNull().default(0),
    withdrawnDelta: integer("withdrawn_delta").notNull().default(0),
    pendingAfter: integer("pending_after").notNull(),
    availableAfter: integer("available_after").notNull(),
    withdrawnAfter: integer("withdrawn_after").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }),
    referredUserId: uuid("referred_user_id").references(() => users.id),
    withdrawalId: uuid("withdrawal_id"),
    actorId: uuid("actor_id").references(() => users.id),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reward_tx_idem_uq").on(t.idempotencyKey), index("reward_tx_user_idx").on(t.userId)],
);

export const rewardHolds = pgTable(
  "reward_holds",
  {
    id: id(),
    referrerId: uuid("referrer_id").notNull().references(() => users.id),
    referredUserId: uuid("referred_user_id").notNull().references(() => users.id),
    kind: varchar("kind", { length: 20 }).notNull(), // signup | training
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("held"), // held | released | cancelled
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("holds_unique_uq").on(t.referredUserId, t.kind)],
);

export const withdrawalRequests = pgTable(
  "withdrawal_requests",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    walletId: uuid("wallet_id").notNull().references(() => rewardWallets.id),
    beneficiaryName: text("beneficiary_name").notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    operator: varchar("operator", { length: 40 }).notNull(),
    amount: integer("amount").notNull(),
    fee: integer("fee").notNull().default(0),
    status: varchar("status", { length: 24 }).notNull().default("pending_validation"),
    // recorded | pending_validation | approved | processing | paid | rejected
    proofReference: text("proof_reference"),
    rejectionReason: text("rejection_reason"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("withdrawals_user_idx").on(t.userId), check("withdrawal_positive", sql`${t.amount} > 0`)],
);

export const withdrawalTransactions = pgTable("withdrawal_transactions", {
  id: id(),
  withdrawalId: uuid("withdrawal_id").notNull().references(() => withdrawalRequests.id),
  fromStatus: varchar("from_status", { length: 24 }),
  toStatus: varchar("to_status", { length: 24 }).notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  proofReference: text("proof_reference"),
  note: text("note"),
  createdAt: createdAt(),
});

export const referralCampaigns = pgTable("referral_campaigns", {
  id: id(),
  name: text("name").notNull(),
  budget: integer("budget").notNull().default(0), // 0 = illimité
  perReferrerCap: integer("per_referrer_cap").notNull().default(0), // 0 = illimité (FCFA)
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAt(),
});

export const fraudAlerts = pgTable("fraud_alerts", {
  id: id(),
  userId: uuid("user_id").references(() => users.id),
  relatedUserId: uuid("related_user_id").references(() => users.id),
  kind: varchar("kind", { length: 40 }).notNull(),
  severity: varchar("severity", { length: 10 }).notNull().default("medium"),
  details: text("details").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"), // open | dismissed | confirmed
  resolvedBy: uuid("resolved_by").references(() => users.id),
  createdAt: createdAt(),
});

/* ───────── Administration ───────── */
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: id(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity"),
  entityId: text("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  ip: varchar("ip", { length: 64 }),
  createdAt: createdAt(),
});

export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const systemSettingsHistory = pgTable("system_settings_history", {
  id: id(),
  key: varchar("key", { length: 80 }).notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  actorId: uuid("actor_id").references(() => users.id),
  createdAt: createdAt(),
});
