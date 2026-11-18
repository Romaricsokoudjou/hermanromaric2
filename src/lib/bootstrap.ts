import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  centers,
  knowledgeBase,
  permissions,
  rolePermissions,
  roles,
  siteContent,
  trainingDurations,
  trainingPrices,
  trainingPrograms,
  userProfiles,
  users,
  videos,
} from "@/db/schema";
import { PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/permissions";
import { CENTERS, CONTENT, DURATIONS, KNOWLEDGE, PROGRAMS } from "@/lib/seed-data";
import { hashPassword } from "@/lib/auth";

async function run() {
  // Rôles & permissions (référentiel)
  for (const [key, label] of Object.entries(ROLE_LABELS)) await db.insert(roles).values({ key, label }).onConflictDoNothing();
  for (const [key, label] of Object.entries(PERMISSIONS)) await db.insert(permissions).values({ key, label }).onConflictDoNothing();
  for (const [roleKey, perms] of Object.entries(ROLE_PERMISSIONS))
    for (const permissionKey of perms) await db.insert(rolePermissions).values({ roleKey, permissionKey }).onConflictDoNothing();

  // Centres
  const existingCenters = await db.select({ id: centers.id }).from(centers);
  if (!existingCenters.length) await db.insert(centers).values(CENTERS.map((c, i) => ({ ...c, sortOrder: i })));

  // Formations + durées + tarifs officiels (uniquement si le catalogue est vide)
  const existing = await db.select({ id: trainingPrograms.id }).from(trainingPrograms);
  if (!existing.length) {
    let order = 0;
    for (const p of PROGRAMS) {
      const [row] = await db
        .insert(trainingPrograms)
        .values({ slug: p.slug, title: p.title, shortDescription: p.short, description: p.desc, objectives: p.objectives, skills: p.skills, programs: p.programs, careers: p.careers, imageUrl: p.image, sortOrder: order++ })
        .returning();
      for (const d of DURATIONS) {
        const [dur] = await db.insert(trainingDurations).values({ programId: row.id, key: d.key, label: d.label, months: d.months, diploma: d.diploma }).returning();
        await db.insert(trainingPrices).values({ durationId: dur.id, tuitionFee: d.tuition, enrollmentFee: d.enrollment, installments: d.installments });
      }
    }
  }

  // Contenus éditables
  for (const [key, c] of Object.entries(CONTENT)) await db.insert(siteContent).values({ key, title: c.title, body: c.body }).onConflictDoNothing();

  // Base de connaissances HERMAN AI
  const kb = await db.select({ id: knowledgeBase.id }).from(knowledgeBase);
  if (!kb.length) await db.insert(knowledgeBase).values(KNOWLEDGE);
  void videos;

  // Journaux immuables (trigger SQL)
  await db.execute(sql.raw(`
    CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION '% est un journal immuable (UPDATE/DELETE interdits)', TG_TABLE_NAME; END;
    $$ LANGUAGE plpgsql;`));
  for (const t of ["reward_transactions", "admin_audit_logs", "system_settings_history"]) {
    await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${t}_immutable ON ${t}; CREATE TRIGGER ${t}_immutable BEFORE UPDATE OR DELETE ON ${t} FOR EACH ROW EXECUTE FUNCTION forbid_mutation();`));
  }

  // Premier super administrateur
  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "super_admin")).limit(1);
  if (!admin && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const [u] = await db
      .insert(users)
      .values({
        email: process.env.ADMIN_EMAIL.toLowerCase(),
        phone: process.env.ADMIN_PHONE || "+237600000000",
        passwordHash: await hashPassword(process.env.ADMIN_PASSWORD),
        role: "super_admin",
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    if (u) await db.insert(userProfiles).values({ userId: u.id, firstName: "Super", lastName: "Admin", country: "Cameroun", city: "Douala" });
  }
}

const g = globalThis as typeof globalThis & { __hfBootstrap?: Promise<void> };

export function ensureBootstrap() {
  if (!g.__hfBootstrap) {
    g.__hfBootstrap = run().catch((e) => {
      g.__hfBootstrap = undefined;
      console.error("[bootstrap]", e);
    });
  }
  return g.__hfBootstrap;
}
