# Procédure de sauvegarde et de restauration

## Quoi sauvegarder
1. **Base PostgreSQL** (toutes les données, y compris journaux financiers immuables).
2. **Médias téléversés** : dossiers `public/images`, `public/banners`, `public/videos`, `public/documents`, `public/icons`, `public/social`. En hébergement serverless (Vercel), le disque est éphémère : brancher un stockage objet (S3, Cloudflare R2, Supabase Storage) en remplaçant l'écriture de `src/app/api/admin/upload/route.ts` avant la mise en production.
3. Variables d'environnement (coffre sécurisé, jamais dans GitHub).

## Base de données
Sauvegarde quotidienne automatique (au minimum) chez l'hébergeur de la base (Neon, Supabase, RDS… : activer PITR si disponible) **et** un export logique hebdomadaire hors site :

```bash
pg_dump "$DATABASE_URL" --format=custom --file=herman-$(date +%F).dump
```

Conserver : 7 quotidiennes, 4 hebdomadaires, 12 mensuelles. Chiffrer les archives et les stocker hors de l'hébergeur principal.

## Restauration
```bash
createdb herman_restore
pg_restore --no-owner --dbname=herman_restore herman-AAAA-MM-JJ.dump
```
Vérifier : nombre d'utilisateurs, et pour les portefeuilles `select sum(available) from reward_wallets` = somme du journal (`select sum(available_delta) from reward_transactions`). Pointer `DATABASE_URL` vers la base restaurée puis redémarrer.

## Test
Tester une restauration complète **chaque trimestre** et consigner le résultat.
