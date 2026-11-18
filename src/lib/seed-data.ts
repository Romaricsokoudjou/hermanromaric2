const px = (id: string, ext = "jpeg") => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.${ext}?auto=compress&cs=tinysrgb&fit=crop&h=700&w=1100`;

export const PROGRAMS = [
  {
    slug: "coiffure-femme",
    title: "Coiffure femme",
    image: px("3993320"),
    short: "Coupe, coloration, brushing, tresses et coiffures de cérémonie : maîtrisez l'ensemble des techniques du salon.",
    desc: "La formation Coiffure femme prépare à exercer en salon ou à son compte. Elle associe démonstrations, pratique encadrée sur modèles et apprentissage des règles d'hygiène et d'accueil client.",
    objectives: ["Maîtriser les techniques de base et avancées de la coiffure féminine", "Réaliser coupes, couleurs, soins et mises en forme", "Appliquer les règles d'hygiène et de sécurité du salon", "Accueillir et conseiller la clientèle"],
    skills: ["Shampoing, soins capillaires et diagnostic du cheveu", "Brushing, lissage, boucles et mises en plis", "Coloration et techniques de nuançage", "Tresses, tissages et coiffures de cérémonie"],
    programs: ["Module technique : base de la coiffure", "Module pratique sur modèles", "Module accueil et gestion de salon"],
    careers: ["Coiffeuse en salon", "Coiffeuse à domicile", "Création de son propre salon"],
  },
  {
    slug: "onglerie-professionnelle",
    title: "Onglerie professionnelle",
    image: px("7446914"),
    short: "Pose de gel, résine, capsules et nail art : devenez prothésiste ongulaire qualifiée.",
    desc: "Cette formation couvre la préparation de l'ongle naturel, les techniques de pose et de décoration, ainsi que l'hygiène et la sécurité indispensables au métier de prothésiste ongulaire.",
    objectives: ["Préparer et entretenir l'ongle naturel", "Réaliser des poses en gel, résine et capsules", "Créer des décorations et du nail art", "Respecter les protocoles d'hygiène"],
    skills: ["Limage, cuticules et préparation", "Extensions et remplissage", "Vernis semi-permanent", "Nail art et finitions"],
    programs: ["Module théorique : ongle et hygiène", "Module pratique : poses et dépose", "Module création et nail art"],
    careers: ["Prothésiste ongulaire", "Onglerie à domicile", "Ouverture d'un institut d'ongles"],
  },
  {
    slug: "esthetique-bio",
    title: "Esthétique bio",
    image: px("12115040"),
    short: "Soins du visage et du corps à base de produits naturels : une approche professionnelle du bien-être.",
    desc: "La formation Esthétique bio initie aux soins du visage et du corps, à l'analyse de peau et à l'utilisation raisonnée de produits d'origine naturelle dans un cadre professionnel.",
    objectives: ["Analyser les types de peau", "Réaliser des soins du visage et du corps", "Choisir des produits adaptés", "Conseiller et fidéliser la clientèle"],
    skills: ["Diagnostic de peau", "Nettoyage, gommage, masques", "Soins corps et relaxation", "Épilation et soins complémentaires"],
    programs: ["Module théorique : peau et produits", "Module pratique : soins visage", "Module pratique : soins corps"],
    careers: ["Esthéticienne en institut", "Praticienne à domicile", "Création d'un institut de beauté"],
  },
  {
    slug: "make-up-professionnel",
    title: "Make-up professionnel",
    image: px("6954005"),
    short: "Maquillage de jour, de soirée, de mariée et d'événement : révélez la beauté de chaque visage.",
    desc: "Cette formation développe la maîtrise du teint, des yeux et des lèvres sur toutes les carnations, pour le maquillage quotidien, événementiel et de mariage.",
    objectives: ["Maîtriser les techniques de maquillage sur toutes les carnations", "Réaliser maquillages de jour, soirée et mariée", "Connaître les produits et outils", "Constituer un portfolio professionnel"],
    skills: ["Préparation de la peau et teint", "Maquillage des yeux et sourcils", "Contouring et illumination", "Maquillage de mariée et d'événement"],
    programs: ["Module technique : teint et colorimétrie", "Module pratique sur modèles", "Module portfolio et clientèle"],
    careers: ["Maquilleuse professionnelle", "Maquilleuse de mariage et d'événements", "Conseillère beauté"],
  },
  {
    slug: "massage-professionnel",
    title: "Massage professionnel",
    image: px("6628649"),
    short: "Techniques de massage bien-être et de relaxation dans le respect des règles d'hygiène et d'éthique.",
    desc: "La formation Massage professionnel enseigne les gestes, les postures et les protocoles de massage de bien-être, ainsi que l'accueil et l'éthique du praticien.",
    objectives: ["Apprendre les techniques de massage de bien-être", "Adapter le massage au client", "Respecter hygiène, éthique et confort", "Gérer son activité de praticien"],
    skills: ["Gestes et manœuvres de base", "Massage relaxant et du dos", "Massage des jambes et du visage", "Accueil et déontologie"],
    programs: ["Module anatomie et bases", "Module pratique : protocoles de massage", "Module gestion de cabine"],
    careers: ["Praticienne de massage bien-être", "Spa et centres de relaxation", "Activité à domicile"],
  },
  {
    slug: "pedicure-et-manucure",
    title: "Pédicure et manucure",
    image: px("31091766"),
    short: "Soins des mains et des pieds, beauté des ongles et protocoles d'hygiène professionnels.",
    desc: "Cette formation permet d'acquérir les gestes de la manucure et de la pédicure : soins, mise en beauté, pose de vernis et respect strict de l'hygiène.",
    objectives: ["Réaliser des soins complets des mains et des pieds", "Appliquer vernis classiques et semi-permanents", "Maîtriser les protocoles d'hygiène", "Conseiller sur l'entretien des ongles"],
    skills: ["Soin des mains et des pieds", "Traitement des cuticules et callosités", "Pose de vernis", "Hygiène et désinfection du matériel"],
    programs: ["Module théorique : hygiène", "Module pratique : manucure", "Module pratique : pédicure"],
    careers: ["Manucure-pédicure en institut", "Prestations à domicile", "Création d'un espace beauté des mains et des pieds"],
  },
  {
    slug: "extension-de-cils",
    title: "Extension de cils",
    image: px("8554941"),
    short: "Pose cil à cil, volume et techniques de rehaussement : un savoir-faire de précision.",
    desc: "La formation Extension de cils apprend à analyser l'œil et la cil naturels, à poser des extensions en toute sécurité et à entretenir le résultat.",
    objectives: ["Analyser le regard et choisir la courbure et la longueur", "Poser des extensions cil à cil et en volume", "Garantir la sécurité et l'hygiène", "Conseiller sur l'entretien"],
    skills: ["Isolation des cils", "Pose cil à cil et volume", "Dépose en sécurité", "Conseil et suivi client"],
    programs: ["Module théorique : œil et hygiène", "Module pratique : pose", "Module perfectionnement"],
    careers: ["Technicienne cils", "Spécialiste regard en institut", "Activité indépendante"],
  },
  {
    slug: "microblading",
    title: "Microblading",
    image: px("8826403"),
    short: "Technique de restructuration des sourcils poil à poil, dans le respect des protocoles de sécurité.",
    desc: "La formation Microblading présente la théorie et la pratique de la restructuration des sourcils, l'analyse du visage, le choix des pigments et les règles d'hygiène strictes.",
    objectives: ["Analyser le visage et dessiner la forme du sourcil", "Maîtriser la technique poil à poil", "Choisir les pigments adaptés", "Respecter hygiène et consentement client"],
    skills: ["Morphologie et tracé", "Gestes de microblading", "Colorimétrie des pigments", "Protocole d'hygiène et suivi post-soin"],
    programs: ["Module théorique : peau, pigments, hygiène", "Module pratique : tracé et gestes", "Module suivi et retouche"],
    careers: ["Praticienne en maquillage semi-permanent", "Spécialiste sourcils", "Activité indépendante"],
  },
  {
    slug: "microshading",
    title: "Microshading",
    image: px("16057715"),
    short: "Technique de sourcils ombrés par pointillé, pour un rendu poudré et naturel.",
    desc: "La formation Microshading enseigne la technique d'ombrage des sourcils par pigmentation, les différences avec le microblading et les protocoles de sécurité.",
    objectives: ["Maîtriser la technique d'ombrage par pointillé", "Adapter la technique au type de peau", "Choisir et mélanger les pigments", "Appliquer les règles d'hygiène"],
    skills: ["Dessin et ombrage", "Dosage des pigments", "Gestion de la profondeur", "Soins et retouches"],
    programs: ["Module théorique : technique et hygiène", "Module pratique : ombrage", "Module suivi client"],
    careers: ["Praticienne en maquillage semi-permanent", "Spécialiste sourcils poudrés", "Activité indépendante"],
  },
];

export const DURATIONS = [
  { key: "3m", label: "3 mois", months: 3, diploma: "AQP", tuition: 150000, enrollment: 10000, installments: [100000, 30000, 20000] },
  { key: "6m", label: "6 mois", months: 6, diploma: "CQP", tuition: 250000, enrollment: 10000, installments: [150000, 70000, 30000] },
  { key: "1y", label: "1 an", months: 12, diploma: "DQP", tuition: 350000, enrollment: 10000, installments: [200000, 100000, 50000] },
];

export const CENTERS = [
  { slug: "ange-raphael", name: "Centre Ange Raphaël", address: "Ange Raphaël, en face de Santa Lucia, Douala, Cameroun.", mapsUrl: "https://maps.app.goo.gl/QMwqZmXKME88vSZ98?g_st=ic" },
  { slug: "deido", name: "Centre Deido", address: "Carrefour École publique de Deido, en face de la station MRS, Douala, Cameroun.", mapsUrl: "https://maps.app.goo.gl/BpdXVPmtQd7YRa858?g_st=ic" },
];

export const CONTENT: Record<string, { title: string; body: string }> = {
  history: {
    title: "Notre histoire",
    body: "CFP HERMAN FASHION est un centre de formation professionnelle installé à Douala, au Cameroun, dédié aux métiers de la beauté et du bien-être.\n\nL'établissement forme des apprenants à travers un enseignement pratique, au plus près des réalités du secteur, dans ses centres d'Ange Raphaël et de Deido.\n\n(Texte éditable depuis l'administration : la direction peut compléter la chronologie officielle de l'établissement.)",
  },
  vision: { title: "Notre vision", body: "Faire de CFP HERMAN FASHION une référence de la formation aux métiers de la beauté et du bien-être, capable de révéler des talents et de les accompagner vers l'emploi et l'entrepreneuriat." },
  mission: { title: "Notre mission", body: "Dispenser un enseignement professionnel, pratique et adapté aux exigences du secteur de la beauté, afin que chaque apprenant acquière un savoir-faire reconnu et construise son avenir." },
  commitments: {
    title: "Nos engagements",
    body: "- Un enseignement pratique et encadré\n- Le respect des règles d'hygiène et de sécurité\n- Une information transparente sur les tarifs et les modalités\n- Un accompagnement personnalisé des apprenants\n- La protection des données personnelles",
  },
  "faq.referral": {
    title: "FAQ du programme HERMAN REWARDS",
    body: "Qui peut devenir parrain ?\nTout utilisateur disposant d'un compte Herman FASHION. Aucun frais d'adhésion et aucune obligation d'achat.\n\nQuand mon bonus de 500 FCFA est-il attribué ?\nLorsque la personne que vous avez parrainée crée un compte valide, vérifie son numéro de téléphone, complète ses informations obligatoires et passe les contrôles antifraude.\n\nQuand mon bonus de 5 000 FCFA est-il attribué ?\nLorsque votre filleul effectue un paiement éligible, vérifié côté serveur par le système (première tranche validée ou paiement intégral selon la politique de l'établissement). Il est attribué une seule fois par filleul.\n\nQuels sont les délais de validation ?\nLes récompenses sont créditées automatiquement dès que l'événement est vérifié. Les cas suspects restent en attente jusqu'à vérification par l'administration.\n\nComment retirer mes récompenses ?\nDepuis votre espace Récompenses, par MTN Mobile Money, Orange Money ou un autre moyen proposé, dès que votre solde disponible atteint le seuil de retrait. Chaque retrait est validé par un gestionnaire financier et n'est affiché comme payé qu'avec une preuve de transaction.\n\nPuis-je me parrainer moi-même ?\nNon. L'auto-parrainage et la création de comptes multiples sont interdits et détectés ; les comptes concernés peuvent être suspendus.",
  },
  "referral.terms": {
    title: "Conditions de participation",
    body: "- Le parrainage est direct : vous ne gagnez que pour les personnes que vous avez personnellement invitées.\n- Aucune commission sur plusieurs générations, aucun rang payant, aucun frais d'adhésion, aucune obligation d'achat.\n- Les récompenses ne sont attribuées qu'après un événement réel et vérifié par le système.\n- Les montants et le déclencheur du bonus de formation sont configurés par l'administration ; toute modification n'est pas rétroactive.\n- Les récompenses liées à des comptes suspects restent en attente jusqu'à vérification.\n- En cas de remboursement ou d'annulation d'un paiement, la politique de reprise définie par l'administration s'applique, de manière tracée.",
  },
  "legal.cgu": {
    title: "Conditions générales d'utilisation",
    body: "## Objet\nLes présentes conditions encadrent l'usage de la plateforme CFP HERMAN FASHION : consultation du catalogue, création de compte, candidature, paiement et programme de parrainage.\n\n## Compte utilisateur\nChaque utilisateur est responsable de la confidentialité de ses identifiants. Les informations fournies doivent être exactes. Un seul compte par personne est autorisé.\n\n## Usage acceptable\nIl est interdit de créer des comptes multiples, de falsifier des informations, de tenter de contourner les contrôles de sécurité ou d'automatiser les inscriptions.\n\n## Suspension\nL'établissement peut suspendre ou bloquer un compte en cas de fraude ou de non-respect des présentes conditions.\n\n## Évolution\nLes conditions peuvent évoluer ; la version en vigueur est celle publiée sur cette page.\n\n(Document à faire valider juridiquement avant le lancement public.)",
  },
  "legal.confidentialite": {
    title: "Politique de confidentialité",
    body: "## Données collectées\nNom, prénom, téléphone, e-mail, pays, ville, informations de candidature, historique de paiements et de récompenses.\n\n## Finalités\nGestion des comptes et des inscriptions, paiement, relation avec les apprenants, prévention de la fraude, fonctionnement du programme de parrainage.\n\n## Confidentialité financière\nLes données financières d'un utilisateur ne sont accessibles qu'à lui-même et aux personnels autorisés. L'assistant HERMAN AI n'y a jamais accès.\n\n## Conservation et droits\nVous pouvez demander l'accès, la rectification ou la suppression de vos données en contactant l'établissement.\n\n## Sécurité\nMots de passe chiffrés, sessions sécurisées, journalisation des opérations sensibles.\n\n(Document à faire valider juridiquement avant le lancement public.)",
  },
  "legal.mentions": {
    title: "Mentions légales",
    body: "## Éditeur\nCFP HERMAN FASHION — Douala, Cameroun.\n\n## Référence officielle\nARRÊTÉ/ORDRE N°000651/MINEFOP/SG/DFOP/SDGSF/CSACD/CBAC\n\n## Centres\nCentre Ange Raphaël : Ange Raphaël, en face de Santa Lucia, Douala.\nCentre Deido : Carrefour École publique de Deido, en face de la station MRS, Douala.\n\n## Informations administratives complémentaires\nNuméro RCCM, numéro d'identification fiscale, directeur de la publication, hébergeur : à renseigner par l'administration depuis l'espace d'administration (aucune information n'est inventée).",
  },
  "legal.inscription": {
    title: "Conditions d'inscription",
    body: "## Dossier\nL'inscription s'effectue en ligne : création d'un compte, sélection d'une ou plusieurs formations, choix de la durée et du centre.\n\n## Frais\nLes tarifs officiels affichés par durée comprennent les frais de formation et les frais d'inscription et polo. Aucun frais supplémentaire n'est appliqué sans mention explicite.\n\n## Cumul de formations\nLorsque plusieurs formations sont sélectionnées, les règles de cumul sont définies par l'administration ; à défaut, la candidature est soumise à une validation administrative avant paiement.\n\n## Confirmation\nUne inscription n'est confirmée qu'après vérification du paiement côté serveur.",
  },
  "legal.paiement": {
    title: "Politique de paiement et de remboursement",
    body: "## Moyens de paiement\nPaiement en ligne via Chariow (Mobile Money MTN, Orange Money, cartes Visa et Mastercard selon disponibilité).\n\n## Vérification\nUne simple redirection n'est jamais une preuve de paiement : l'inscription est confirmée après notification signée du prestataire ou vérification par un gestionnaire financier.\n\n## Tranches\nLes tranches de paiement sont celles du barème officiel de la durée choisie.\n\n## Remboursement\nLes conditions de remboursement sont étudiées par l'administration ; tout remboursement est tracé et peut entraîner la reprise des récompenses associées.\n\n(Modalités de remboursement à valider par la direction et le conseil juridique.)",
  },
  "legal.recompenses": {
    title: "Politique de gestion des récompenses",
    body: "## Attribution\nLes récompenses (bonus d'inscription, bonus de formation) sont attribuées uniquement après un événement vérifié par le système.\n\n## Portefeuille\nHERMAN REWARDS WALLET comporte trois soldes : récompenses en attente, solde disponible et total retiré. Chaque mouvement est inscrit dans un journal financier immuable.\n\n## Retraits\nLes retraits sont soumis au seuil, aux plafonds et aux frais éventuels configurés par l'administration, puis validés par un gestionnaire financier. Un retrait n'est « payé » qu'avec preuve de transaction.\n\n## Reprise\nEn cas de fraude, de remboursement ou d'annulation, une reprise peut être appliquée selon la politique en vigueur, avec traçabilité. Aucun montant déjà retiré n'est repris sans procédure documentée.\n\n(Modalités à valider juridiquement et comptablement avant le lancement public.)",
  },
  "legal.parrainage": {
    title: "Règlement du programme de parrainage",
    body: "## Principe\nHERMAN FASHION REWARDS est un programme de recommandation commerciale directe. Ce n'est pas un système pyramidal.\n\n## Événements éligibles\n1. Bonus d'inscription : le filleul crée un compte valide, vérifie son téléphone, complète ses informations et passe les contrôles antifraude.\n2. Bonus de formation : le filleul effectue un paiement éligible, vérifié et confirmé par le système.\n\n## Montants\nLes montants en vigueur sont affichés sur la page du programme et peuvent être modifiés sans effet rétroactif.\n\n## Interdictions\nAuto-parrainage, comptes multiples, inscriptions automatisées, usurpation d'identité.\n\n## Sanctions\nMise en attente, annulation des récompenses, suspension ou blocage du compte.\n\n(Règlement à valider juridiquement avant le lancement public.)",
  },
  "legal.donnees": {
    title: "Politique de traitement des données personnelles",
    body: "## Responsable du traitement\nCFP HERMAN FASHION.\n\n## Bases et finalités\nExécution du contrat d'inscription, intérêt légitime (prévention de la fraude), consentement (communications).\n\n## Destinataires\nPersonnel habilité de l'établissement et prestataires de paiement.\n\n## Droits\nAccès, rectification, suppression, opposition : contactez l'établissement par téléphone ou WhatsApp.\n\n(Document à faire valider juridiquement avant le lancement public.)",
  },
  "legal.cookies": {
    title: "Consentement aux cookies",
    body: "Le site utilise un cookie de session strictement nécessaire à la connexion, ainsi qu'un cookie de mémorisation du code de parrainage et de votre choix de consentement. Aucun cookie publicitaire n'est déposé.",
  },
};

export const KNOWLEDGE = [
  { title: "Présentation de l'établissement", keywords: "institution herman fashion présentation qui êtes vous école centre douala histoire agrément arrêté", content: "CFP HERMAN FASHION est un centre de formation professionnelle aux métiers de la beauté et du bien-être situé à Douala (Cameroun), avec deux centres : Ange Raphaël et Deido. Référence officielle : ARRÊTÉ/ORDRE N°000651/MINEFOP/SG/DFOP/SDGSF/CSACD/CBAC." },
  { title: "Modalités d'inscription", keywords: "inscription inscrire candidature compte comment s'inscrire étapes", content: "Pour s'inscrire : 1) créer un compte (nom, prénom, téléphone, e-mail, pays, ville, mot de passe) ; 2) vérifier son téléphone ; 3) depuis son espace, choisir une ou plusieurs formations, la durée de chacune et le centre ; 4) valider le récapitulatif ; 5) payer en ligne ; 6) l'inscription est confirmée après vérification du paiement et un reçu est généré. Si plusieurs formations sont choisies et que les règles de cumul ne sont pas définies, une validation administrative est demandée avant paiement." },
  { title: "Moyens de paiement", keywords: "paiement payer mobile money mtn orange visa mastercard chariow carte moyen", content: "Le paiement s'effectue en ligne via Chariow : MTN Mobile Money, Orange Money, cartes Visa et Mastercard selon disponibilité. Une simple redirection n'est pas une preuve de paiement : l'inscription n'est confirmée qu'après vérification côté serveur. Les tranches suivent le barème officiel de la durée choisie." },
  { title: "Conseiller humain", keywords: "conseiller humain parler appeler téléphone whatsapp contact personne agent", content: "Pour parler à un conseiller humain, utilisez le bouton WhatsApp ou appelez les numéros indiqués sur la page Contact." },
  { title: "Sécurité et confidentialité", keywords: "solde portefeuille mon compte données privées modifier", content: "L'assistant ne peut pas consulter les données financières personnelles ni modifier un solde. Les utilisateurs retrouvent leur portefeuille, leurs paiements et leurs reçus dans leur espace personnel (/compte)." },
  { title: "Centres de formation", keywords: "centre adresse où localisation ange raphaël deido santa lucia mrs itinéraire", content: "Centre Ange Raphaël : Ange Raphaël, en face de Santa Lucia, Douala. Centre Deido : Carrefour École publique de Deido, en face de la station MRS, Douala. Cartes et itinéraires sur la page Centres." },
];
