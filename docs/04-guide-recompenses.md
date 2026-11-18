# Guide de gestion des récompenses — HERMAN FASHION REWARDS

Programme de **parrainage direct** : pas de commissions multi-niveaux, pas de rangs payants, pas de frais d'adhésion, pas d'obligation d'achat.

## Règles par défaut (modifiables : Admin → HERMAN REWARDS)
- **Bonus d'inscription : 500 FCFA** — le filleul a utilisé le code, créé un compte, **vérifié son téléphone** (informations obligatoires complètes) et passé les contrôles antifraude. Une seule fois par filleul.
- **Bonus de formation : 5 000 FCFA** — premier paiement **confirmé par le serveur** (déclencheur configurable : première tranche validée ou paiement intégral). Une seule fois par filleul, même avec plusieurs formations.
- Aucun bonus sur simple intention de paiement.
- Les changements de règles sont **historisés** et **non rétroactifs** : chaque écriture du journal conserve le montant appliqué à l'époque.

## Parcours technique
Lien `/inscription?ref=CODE` → cookie 90 jours (premier parrain conservé) → compte créé → attribution unique (`referral_attributions`) → téléphone vérifié → bonus 500 → paiement confirmé → bonus 5 000. Chaque crédit est un `INSERT` idempotent dans le journal (clé `signup_bonus:<filleul>` / `training_bonus:<filleul>`) et met à jour le portefeuille dans la **même transaction** SQL avec verrou de ligne.

## Portefeuille (HERMAN REWARDS WALLET)
Trois soldes : *en attente*, *disponible*, *total retiré*. Un solde ne change jamais sans écriture au journal (immuable, protégé par trigger). Contrainte SQL : aucun solde négatif. Contrôle : solde = somme du journal.

## Antifraude
Auto-parrainage impossible · numéro/e-mail uniques · même identité + même IP → alerte « doublon » · même IP que le parrain, trop d'inscriptions par IP/24 h, rafale (≥10/h) → attribution **suspecte** : le bonus est mis **en attente** (`reward_holds`) jusqu'à décision · parrain suspendu/bloqué → mise en attente · champ piège, délai de formulaire, limitation de débit · blocage de compte possible (Utilisateurs) · alertes consultables et décidables (Confirmer + suspendre / Classer).
Budget : les campagnes (budget global, plafond par parrain) mettent en attente les bonus excédentaires.

## Décisions administratives
- *Libérer* ou *Annuler* une récompense en attente (justification + mot de passe).
- *Corriger une attribution* : uniquement sur attribution existante, justification ≥ 15 caractères, tracée dans l'audit ; les bonus déjà crédités ne sont pas déplacés automatiquement.
- *Ajustement de portefeuille* (Portefeuilles) : justification ≥ 10 caractères obligatoire, écriture immuable.

## Remboursement / annulation
Politique configurable : **reprise sur solde disponible** (jamais au-delà du disponible, jamais sur le déjà retiré ; un reliquat génère une alerte « reprise partielle » à traiter par procédure documentée) ou **revue manuelle** (alerte seulement). Une récompense encore en attente est annulée.

## Retraits
Demande : nom du bénéficiaire, téléphone, opérateur (MTN MoMo, Orange Money, ou autres configurés), montant ≥ seuil, ≤ plafonds ; téléphone du compte vérifié obligatoire ; montant **réservé** immédiatement.
Statuts : Demande enregistrée → En attente de validation → Approuvée → En cours de paiement → **Payée** (preuve de transaction obligatoire) ou **Rejetée** (motif obligatoire, montant restitué). Frais : 0 par défaut, configurables.

## Avant le lancement public
Faire valider juridiquement et comptablement : règlement du parrainage, traitement fiscal/comptable des récompenses, conditions de retrait. Le programme peut être suspendu (interrupteur « Programme actif »).
