# Procédure de déploiement

## 1. GitHub
```bash
git init && git add . && git commit -m "Herman FASHION 4.0"
git remote add origin git@github.com:<organisation>/herman-fashion.git && git push -u origin main
```
`.env` est ignoré par git : **ne jamais publier de clé secrète**.

## 2. Base de données de production
Créer une base PostgreSQL gérée (Neon, Supabase, Railway, RDS…) avec sauvegardes activées. Appliquer le schéma :
```bash
DATABASE_URL=... npx drizzle-kit push
```
(pour des migrations versionnées : `npx drizzle-kit generate` puis `npx drizzle-kit migrate`, en fixant le dossier `out` dans `drizzle.config.json`).

## 3. Hébergement (Vercel ou compatible Node)
Importer le dépôt, framework Next.js, définir les variables de `.env.example` (production) :
`DATABASE_URL`, `SITE_URL`, `ADMIN_*`, `CHARIOW_WEBHOOK_SECRET`, `MESSAGING_WEBHOOK_URL/TOKEN`, `AI_*`, `SHOW_DEV_CODES=0`.
Prévoir un stockage objet pour les médias (voir `docs/05-sauvegarde.md`) si l'hébergeur est serverless.

## 4. Domaine & HTTPS
Ajouter `hermanfashion.com` (et `www`) chez l'hébergeur, configurer les DNS indiqués ; HTTPS est automatique. Vérifier `SITE_URL`, `/sitemap.xml`, `/robots.txt`, soumettre le sitemap à Google Search Console.

## 5. Paiement & messagerie
Déclarer le Pulse Chariow (`/api/webhooks/chariow`), renseigner le secret, **faire une vente réelle de test** et vérifier : webhook reçu (Admin → Paiements), paiement confirmé, reçu, inscription confirmée. Brancher une passerelle SMS/e-mail pour les codes de vérification (`MESSAGING_WEBHOOK_URL`).

## 6. Environnements
Développement : base locale + `.env` local. Production : base et secrets distincts. Ne jamais pointer l'environnement de test vers la base de production.

## 7. Check-list avant lancement public
- [ ] Super admin : mot de passe changé, `ADMIN_PASSWORD` retiré de l'environnement
- [ ] `SHOW_DEV_CODES=0` et passerelle de codes opérationnelle
- [ ] Webhook Chariow vérifié avec une vente réelle ; règle de cumul multi-formations décidée
- [ ] Tarifs, durées par formation, coordonnées (WhatsApp) confirmés par la direction
- [ ] Document officiel (arrêté), logo, photos, vidéos, enseignants, témoignages authentiques téléversés
- [ ] RCCM / NIU / hébergeur renseignés dans les mentions légales (si officiels)
- [ ] Validation juridique et comptable du programme REWARDS (sinon le désactiver)
- [ ] Sauvegardes testées ; tests sur iPhone, Android et ordinateur
- [ ] Les fonctionnalités financières non vérifiées ne sont pas annoncées comme opérationnelles
