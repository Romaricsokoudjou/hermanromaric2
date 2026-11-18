# Guide de gestion financière

## Principes
1. Aucune redirection n'est une preuve de paiement.
2. Un paiement n'est « confirmé » que par (a) un webhook Chariow signé, ou (b) une saisie manuelle d'un gestionnaire avec **identifiant de transaction** du prestataire + mot de passe.
3. Une transaction ne peut être enregistrée qu'une fois (contrainte d'unicité) ; une candidature n'a qu'une commande.

## Configuration Chariow
1. Chariow → Automations → Pulses → créer un Pulse vers `https://<domaine>/api/webhooks/chariow` (événement `successful.sale`).
2. Copier le *Signing secret* `whsec_…` dans la variable `CHARIOW_WEBHOOK_SECRET`. Sans elle, les webhooks sont refusés (503).
3. Lien produit utilisé : `https://dycwotra.mychariow.shop/prd_2iywa1pa` (modifiable dans Paramètres → Paiement). La référence de commande `HF-AAAA-XXXXXX` est ajoutée au lien (`hf_ref`).

⚠️ Le rapprochement automatique se fait par la référence (si Chariow la restitue) ou, à défaut, par e-mail/téléphone du client lorsqu'une seule commande est ouverte. Sinon, le webhook est journalisé « non rapproché » : saisir le paiement manuellement. Si le montant n'est pas lisible dans le payload, le paiement passe en **À vérifier**. Valider ces comportements avec une vente réelle de test avant le lancement.

## Statuts
Commande : En attente · Paiement confirmé · Paiement échoué · Remboursé · À vérifier. Une commande reste « En attente » tant que les tranches ne totalisent pas le montant.

## Opérations (Admin → Paiements)
- **Enregistrer un paiement vérifié** : référence de commande, ID de transaction, montant, mot de passe → crée le paiement, le reçu, confirme l'inscription et déclenche le contrôle de bonus de parrainage.
- **Confirmer un paiement « à vérifier »** : saisir le montant vérifié chez le prestataire.
- **Rembourser** : marque le paiement remboursé et applique la politique de reprise des récompenses (voir guide récompenses). Le remboursement effectif chez Chariow reste à effectuer.

## Suivi et exports
*Gestion financière* : encaissements, restant dû, engagements de récompenses, encaissements par mois. Exports CSV : paiements, commandes, journal des récompenses, portefeuilles, retraits (chaque export est journalisé).

## Reçus
Générés automatiquement par paiement confirmé (numéro `HF-R-AAAAMM-XXXXXX`), consultables et imprimables par l'apprenant (`/compte/paiements`).
