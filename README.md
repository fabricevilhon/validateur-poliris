# Validateur Poliris

Outil de validation de fichiers CSV au format **Poliris** pour les annonces immobilières (Figaro Immo). Développé en **Nuxt 3** (TypeScript), déployable sur **Vercel**.

## 🚀 Fonctionnalités

- **Upload drag & drop** de fichiers CSV/TXT (séparateur `!#`, 334 colonnes)
- **Détection automatique de l'encodage** (UTF-8, ISO-8859-1, Windows-1252)
- **Validation complète** avec 15+ types de règles :
  - Champs obligatoires (11 champs)
  - Types de données : Entier, Décimal, Date (JJ/MM/AAAA), Texte, Booléen
  - Format : Code Postal (5 chiffres), Email, Téléphone français, URL
  - Détection de **pipes** `|` (risque de décalage de données)
  - Détection de **HTML non autorisé** (sauf `<br>`)
  - Valeurs permises (type d'annonce, type de bien)
  - Plages numériques (prix > 0, surface > 0…)
  - Cohérence croisée (chambres ≤ pièces, étage ≤ nb étages)
  - Longueur min/max (descriptif ≥ 50 car., libellé ≤ 255 car.)
  - DPE/GES (lettres A-G)
  - Coordonnées GPS (latitude/longitude)
  - Doublons de référence
  - Structure CSV (nombre de colonnes, guillemets)
- **Dashboard de synthèse** avec compteurs par sévérité et graphique par catégorie
- **Tableau d'erreurs** avec filtrage, tri et pagination
- **Aperçu des données** avec surlignage des lignes en erreur
- **Recherche globale** des champs par nom ou numéro de rang (Quick Search)
- **Filtre par référence agence** pour cibler une annonce précise
- **Vue fiche** annonce par annonce avec navigation et filtrage intégré
- **Export Excel** des données validées et du rapport d'erreurs
- **Thème aux couleurs Figaro Immo Pro** (orange, blanc, noir, Montserrat, boutons pill)

## 📦 Installation

```bash
# Prérequis : Node.js >= 18
npm install
```

## 🛠️ Développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`.

## 🌐 Déploiement Vercel

1. Connecter le dépôt GitHub à Vercel
2. Vercel détecte automatiquement Nuxt.js
3. Le déploiement se fait à chaque push

Ou manuellement :

```bash
npx vercel
```

## 📁 Structure du projet

```
├── app/
│   ├── app.vue                  # Layout principal (header, thème, footer)
│   └── pages/
│       └── index.vue            # Page unique (upload → validation → résultats)
├── components/
│   ├── FileUpload.vue           # Zone de drag & drop
│   ├── ErrorDashboard.vue       # Compteurs et graphique de répartition
│   ├── ErrorTable.vue           # Tableau d'erreurs filtrable
│   └── DataPreview.vue          # Aperçu des données CSV
├── utils/
│   ├── poliris-schema.ts        # Schéma des 334 colonnes + règles
│   ├── validator.ts             # Moteur de validation (pipeline)
│   └── export.ts                # Export Excel (données + rapport)
├── assets/css/
│   └── main.css                 # Design system (thème, composants)
├── nuxt.config.ts               # Configuration Nuxt
├── vercel.json                  # Configuration Vercel
└── En-tête_Poliris.csv          # Référence des en-têtes (legacy)
```

## 🔧 Règles de validation

Les règles sont configurées dans `utils/poliris-schema.ts` :

| Champ | Rang | Type | Contraintes |
|---|---|---|---|
| Identifiant agence | 1 | Texte sans espace | Obligatoire, **erreur critique si espaces avant/après** (job d'intégration) |
| Référence agence | 2 | Texte | Obligatoire, unicité |
| Type d'annonce | 3 | Texte | Obligatoire, liste fermée |
| Type de bien | 4 | Texte | Obligatoire, liste fermée |
| CP | 5 | Code Postal | Obligatoire, 5 chiffres |
| Ville | 6 | Texte | Obligatoire |
| Prix | 11 | Décimal | Obligatoire, > 0 |
| NB de pièces | 18 | Entier | Obligatoire, ≥ 0 |
| NB de chambres | 19 | Entier | ≤ NB de pièces |
| Libellé | 20 | Texte | Obligatoire, ≤ 255 car. |
| Descriptif | 21 | Texte | Obligatoire, ≥ 50 car. |
| Étage | 24 | Entier | ≤ NB d'étages |
| Photos | 83-91, 161-171, 273-282 | URL | Format URL valide |
| Email | 104 | Email | Format email valide |
| Téléphone | 102, 117 | Téléphone | Format français |
| DPE/GES | 177, 179 | DPE | Lettre A-G, "NS" (non soumis) ou "VI" (vierge) |
| GPS | 323-324 | Lat/Long | Plages [-90,90] / [-180,180] |
| Identifiant technique | 175 | Texte | Obligatoire |

**Tolérances (valeurs spéciales acceptées) :**
- **Date mandat** (rang 113) : `00/00/0000` accepté (équivalent champ non rempli)
- **Bilan énergie / GES** (rangs 177, 179) : `NS` (non soumis au diagnostic) et `VI` (vierge) acceptés
- **Année de construction** (rang 27) : `0` accepté (équivalent champ non rempli)
- **Type de bien** (rang 4) : `parking/box`, `local`, `maison/villa`, `bureaux`, `cave` ajoutés aux valeurs autorisées

**Règles globales (tous les champs) :**
- Détection de pipes `|`
- Détection de HTML non autorisé (seul `<br>` est accepté)
- Vérification des guillemets CSV

## 🧪 Test en masse (compilation d'archives)

Un script permet de compiler plusieurs fichiers CSV issus d'archives ZIP en un seul fichier pour test groupé :

```bash
# 1. Déposer vos archives .zip dans le dossier test-archives/
# 2. Lancer la compilation
node scripts/compile-csv.mjs
# 3. Uploader le fichier test-archives/compiled.csv dans le validateur
```

Le script extrait automatiquement le fichier `Annonces.csv` de chaque archive, gère les différents encodages, et fusionne toutes les lignes.

## 🔄 Migration depuis Python

Ce projet est la migration de `validator_app.py` (Python/Streamlit) vers Nuxt.js/TypeScript. Les fichiers Python originaux (`validator_app.py`, `requirements.txt`) sont conservés à titre de référence.

## 📝 Technologies

- **Nuxt 3** (Vue 3 + TypeScript)
- **xlsx** (SheetJS) pour l'export Excel
- **Vercel** pour l'hébergement
