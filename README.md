# CFP HERMAN FASHION 4.0 — Learn. Create. Grow. Earn.

Plateforme web Full Stack (Next.js 16 App Router · TypeScript · Tailwind · PostgreSQL · Drizzle ORM) :
site institutionnel, catalogue administrable, inscription multi-formations, paiement Chariow (webhooks signés),
espace apprenant, **HERMAN FASHION REWARDS** (parrainage direct, portefeuille, retraits), **HERMAN AI ASSISTANT** et administration à 5 niveaux d'accès.

## Démarrage

```bash
cp .env.example .env        # renseigner les variables
npm install
npx drizzle-kit push        # applique le schéma (src/db/schema.ts)
npm run build && npm start  # le premier lancement crée : catalogue, tarifs officiels, centres, textes, super admin
```

Le premier **super administrateur** est créé depuis `ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_PASSWORD` (à changer dès la première connexion en production).

## Tests

Tests d'intégration métier sur la base réelle (parrainage, anti-fraude, webhook signé, paiement, reçu, retraits, journal immuable, reprise) :

```bash
set -a; source .env; set +a; npx tsx scripts/e2e-test.ts   # 36 contrôles
```

⚠️ Ces tests écrivent dans la base : ne pas les lancer sur la production.

## Documentation

| Document | Contenu |
|---|---|
| `docs/01-documentation-technique.md` | Architecture, modèle de données, sécurité, API |
| `docs/02-guide-administration.md` | Utilisation de l'espace admin, rôles, contenus |
| `docs/03-guide-gestion-financiere.md` | Paiements, webhooks Chariow, remboursements, exports |
| `docs/04-guide-recompenses.md` | HERMAN REWARDS : règles, antifraude, retraits |
| `docs/05-sauvegarde.md` | Procédure de sauvegarde et restauration |
| `docs/06-deploiement.md` | GitHub, Vercel / hébergeur, domaine, variables, check-list de lancement |
