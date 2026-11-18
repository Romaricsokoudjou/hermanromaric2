# Documentation technique — HERMAN FASHION 4.0

## Pile technique
Next.js 16 (App Router, Server Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL · Drizzle ORM.
Une seule base de données, une seule solution d'authentification (sessions maison en base).

## Arborescence
- `src/db/schema.ts` — toutes les tables (voir ci-dessous).
- `src/lib/` — services métier : `auth` (sessions, scrypt, codes), `rewards` (portefeuille, journal, parrainage, retraits, antifraude), `payments` (candidature → commande → paiement → reçu, webhook Chariow), `settings` (paramètres historisés), `ai`, `notify`, `bootstrap` (amorçage idempotent), `entities` (CRUD de contenu générique).
- `src/app/(site)` — pages publiques et espace apprenant `/compte`. `src/app/admin` — administration. `src/app/api` — webhooks, IA, médias, exports, QR code.
- `src/app/actions` — Server Actions (validation et autorisations côté serveur).
- `public/images|banners|videos|icons|documents|social` — médiathèque (servie par `/api/media/...`, gérée depuis l'admin).

## Modèle de données
Accès : `users`, `user_profiles`, `sessions`, `verification_codes`, `roles`, `permissions`, `role_permissions`.
Catalogue : `training_programs`, `training_durations`, `training_prices`, `centers`.
Inscription & paiement : `applications`, `application_items`, `orders` (unique par candidature), `payments` (unique par prestataire + transaction), `payment_webhooks` (unique par livraison), `receipts`.
Parrainage : `referral_codes`, `referral_attributions` (unique par filleul), `referral_events` (clé d'unicité), `reward_wallets` (CHECK ≥ 0), `reward_transactions` (journal **immuable**, clé d'idempotence unique), `reward_holds`, `withdrawal_requests`, `withdrawal_transactions`, `referral_campaigns`, `fraud_alerts`.
Contenu : `instructors`, `testimonials`, `news`, `gallery`, `videos`, `documents`, `site_content`, `knowledge_base`, `ai_conversations`, `contact_messages`, `notifications`.
Gouvernance : `admin_audit_logs` (immuable), `system_settings`, `system_settings_history` (immuable).

Les journaux `reward_transactions`, `admin_audit_logs`, `system_settings_history` sont protégés par un trigger SQL interdisant UPDATE/DELETE (créé à l'amorçage).

## Sécurité
- Mots de passe : scrypt + sel. Sessions : jeton aléatoire, seul son hash SHA-256 est stocké, cookie HttpOnly / SameSite=Lax (Secure derrière HTTPS).
- Autorisations vérifiées **côté serveur** dans chaque page admin et chaque Server Action (`requirePermission`). Un utilisateur ne lit que ses propres données (requêtes filtrées par `user_id`).
- Opérations sensibles (ajustement de portefeuille, retraits, remboursements, permissions, règles de récompense) : **ressaisie du mot de passe** + journal d'audit.
- Anti-robot : champ piège, délai minimal du formulaire, limitation de débit (inscription, connexion, codes, retraits, IA, contact, paiements). Le limiteur est en mémoire : utiliser Redis/Upstash en multi-instances.
- Aucune clé secrète côté navigateur : Chariow, IA et messagerie sont lus via `process.env` côté serveur.
- Webhook Chariow : signature HMAC-SHA256 sur le corps brut (`x-chariow-signature: sha256=…`), comparaison en temps constant, déduplication par `x-pulse-delivery-id`.

## Flux de paiement
Sélection → récapitulatif (tarifs relus en base) → validation (validation administrative si plusieurs formations sans règle de cumul) → commande unique → redirection Chariow → webhook signé `successful.sale` → rapprochement (référence `HF-…`, sinon e-mail/téléphone unique) → paiement `confirmed` ou `to_verify` → reçu → confirmation de l'inscription → éventuel bonus de formation.
Une redirection de retour n'a **aucun** effet financier.

## Variables d'environnement
Voir `.env.example`.

## Extension
Ajouter un prestataire (CinetPay…) : créer `src/app/api/webhooks/<prestataire>/route.ts` qui vérifie la signature puis appelle `recordPayment()` ; ajouter un type de contenu : déclarer une entrée dans `src/lib/entities.ts`.
