// =============================================================================
// TYPES
// =============================================================================
export type FieldType = 'Texte' | 'Texte_Sans_Espace' | 'Entier' | 'Décimal' | 'Date' | 'Booléen' | 'CodePostal' | 'Email' | 'Telephone' | 'Url' | 'Photo' | 'DPE' | 'Latitude' | 'Longitude' | 'AnneeConstruction'

export interface FieldRule {
    rang: number
    nom: string
    type: FieldType
    obligatoire: boolean
    valeurs?: string[]
    minLength?: number
    maxLength?: number
    minValue?: number
    maxValue?: number
    /** Rang d'un champ qui doit être >= à ce champ (ex: nb chambres <= nb pièces) */
    lteField?: number
    /** Rang d'un champ qui doit être <= à ce champ (ex: nb étages >= étage) */
    gteField?: number
}

export type ErrorSeverity = 'critique' | 'warning' | 'info'

export interface ValidationError {
    ligne: number
    referenceAnnonce: string
    rang: number | string
    champ: string
    message: string
    valeur: string
    severity: ErrorSeverity
    category: string
}

// =============================================================================
// CHAMPS OBLIGATOIRES
// =============================================================================
export const MANDATORY_RANKS = new Set([1, 2, 3, 4, 5, 6, 11, 21])

// =============================================================================
// EXPECTED COLUMNS
// =============================================================================
export const EXPECTED_COLUMNS = 334
export const REF_ANNONCE_INDEX = 1

// =============================================================================
// DÉFINITION ENRICHIE DES CHAMPS CONNUS
// =============================================================================
export const KNOWN_FIELDS: Record<number, Partial<FieldRule>> = {
    // === Identification & localisation ===
    1: { nom: 'Identifiant agence', type: 'Texte_Sans_Espace' },
    2: { nom: 'Référence agence du bien', type: 'Texte' },
    3: { nom: "Type d'annonce", type: 'Texte', valeurs: ['cession de bail', 'location', 'location vacances', "produit d'investissement", 'vente', 'vente-de-prestige', 'vente-fonds-de-commerce', 'viager', 'lease termination', 'rental', 'holiday rental', 'investment product', 'sale', 'luxury sale', 'sale of business assets'] },
    4: { nom: 'Type de bien', type: 'Texte', valeurs: ['appartement', 'maison', 'maison/villa', "maison d'architecte", 'terrain', 'parking', 'garage', 'box', 'parking/box', 'bureau', 'bureaux', 'cave', 'local', 'local commercial', 'local industriel', 'immeuble', 'château', 'hôtel particulier', 'loft', 'loft/atelier/surface', 'duplex', 'triplex', 'studio', 'chambre', 'programme neuf', 'ferme', 'moulin', 'péniche', 'propriété', 'bâtiment', 'chalet', 'villa', 'manoir', 'fonds de commerce', 'droit au bail', 'murs commerciaux', 'hôtel bureau', 'boutique', 'commerce', 'divers', 'flat', 'building trade', 'shop', 'offices', 'castel', 'inconnu', 'private mansion', 'building', 'loft/workshop/area', 'house/villa', 'ground', 'house with ground', 'apartment'] },
    5: { nom: 'CP', type: 'Texte' },  // Validation 5 chiffres conditionnelle au pays (dans validator.ts)
    6: { nom: 'Ville', type: 'Texte' },
    7: { nom: 'Pays', type: 'Texte' },
    8: { nom: 'Adresse', type: 'Texte' },
    // === Prix & charges ===
    11: { nom: 'Prix / Loyer / Prix de cession', type: 'Décimal', minValue: 0 },
    12: { nom: 'Loyer / mois murs', type: 'Décimal', minValue: 0 },
    13: { nom: 'Loyer CC', type: 'Booléen' },               // OUI/NON (charges comprises ?)
    14: { nom: 'Loyer HT', type: 'Booléen' },               // OUI/NON (hors taxes ?)
    15: { nom: 'Honoraires', type: 'Décimal', minValue: 0 },
    16: { nom: 'Surface (m²)', type: 'Décimal', minValue: 0 },
    17: { nom: 'SF terrain (m²)', type: 'Décimal', minValue: 0 },
    // === Pièces & description ===
    18: { nom: 'NB de pièces', type: 'Entier', minValue: 0 },
    19: { nom: 'NB de chambres', type: 'Entier', minValue: 0, lteField: 18 },
    20: { nom: 'Libellé', type: 'Texte', maxLength: 255 },
    21: { nom: 'Descriptif', type: 'Texte', minLength: 10 },
    22: { nom: 'Date de disponibilité', type: 'Date' },
    23: { nom: 'Charges', type: 'Décimal', minValue: 0 },
    24: { nom: 'Etage', type: 'Entier' },  // Peut être négatif (sous-sol)
    25: { nom: "NB d'étages", type: 'Entier', minValue: 0 },
    // === Caractéristiques booléennes ===
    26: { nom: 'Meublé', type: 'Booléen' },
    27: { nom: 'Année de construction', type: 'AnneeConstruction' },
    28: { nom: 'Refait à neuf', type: 'Booléen' },
    29: { nom: 'NB de salles de bain', type: 'Entier', minValue: 0 },
    30: { nom: "NB de salles d'eau", type: 'Entier', minValue: 0 },
    31: { nom: 'NB de WC', type: 'Entier', minValue: 0 },
    32: { nom: 'WC séparés', type: 'Booléen' },
    39: { nom: 'NB balcons', type: 'Entier', minValue: 0 },
    40: { nom: 'SF Balcon', type: 'Décimal', minValue: 0 },
    41: { nom: 'Ascenseur', type: 'Booléen' },
    42: { nom: 'Cave', type: 'Booléen' },
    43: { nom: 'NB de parkings', type: 'Entier', minValue: 0 },
    44: { nom: 'NB de boxes', type: 'Entier', minValue: 0 },
    45: { nom: 'Digicode', type: 'Booléen' },
    46: { nom: 'Interphone', type: 'Booléen' },
    47: { nom: 'Gardien', type: 'Booléen' },
    48: { nom: 'Terrasse', type: 'Booléen' },
    // === Booléens divers ===
    83: { nom: 'Mandat en exclusivité', type: 'Booléen' },
    84: { nom: 'Coup de coeur', type: 'Booléen' },
    // === Photos 1–9 (rangs 85–93) ===
    85: { nom: 'Photo 1', type: 'Photo' },
    86: { nom: 'Photo 2', type: 'Photo' },
    87: { nom: 'Photo 3', type: 'Photo' },
    88: { nom: 'Photo 4', type: 'Photo' },
    89: { nom: 'Photo 5', type: 'Photo' },
    90: { nom: 'Photo 6', type: 'Photo' },
    91: { nom: 'Photo 7', type: 'Photo' },
    92: { nom: 'Photo 8', type: 'Photo' },
    93: { nom: 'Photo 9', type: 'Photo' },
    // === Visite virtuelle (rang 104) ===
    104: { nom: 'URL visite virtuelle', type: 'Url' },
    // === Contact (rangs 105, 107, 108) ===
    105: { nom: 'Téléphone à afficher', type: 'Telephone' },
    107: { nom: 'Email à afficher', type: 'Email' },
    108: { nom: 'CP Réel du bien', type: 'Texte' },  // CP validé conditionnellement au pays (France)
    // === Mandataire (rangs 113, 118, 120) ===
    113: { nom: 'Date mandat', type: 'Date' },
    118: { nom: 'CP mandataire', type: 'CodePostal' },
    120: { nom: 'Téléphone mandataire', type: 'Telephone' },
    // === Photos 10–20 (rangs 164–174) ===
    164: { nom: 'Photo 10', type: 'Photo' },
    165: { nom: 'Photo 11', type: 'Photo' },
    166: { nom: 'Photo 12', type: 'Photo' },
    167: { nom: 'Photo 13', type: 'Photo' },
    168: { nom: 'Photo 14', type: 'Photo' },
    169: { nom: 'Photo 15', type: 'Photo' },
    170: { nom: 'Photo 16', type: 'Photo' },
    171: { nom: 'Photo 17', type: 'Photo' },
    172: { nom: 'Photo 18', type: 'Photo' },
    173: { nom: 'Photo 19', type: 'Photo' },
    174: { nom: 'Photo 20', type: 'Photo' },
    // === Identifiant technique (rang 175) ===
    175: { nom: 'Identifiant technique', type: 'Texte' },
    // === DPE / GES (rangs 176–179) ===
    176: { nom: 'Consommation énergie', type: 'Décimal', minValue: 0 },
    177: { nom: 'Bilan consommation énergie', type: 'DPE' },
    178: { nom: 'Emissions GES', type: 'Décimal', minValue: 0 },
    179: { nom: 'Bilan émission GES', type: 'DPE' },
    // === GPS (rangs 298–299) ===
    298: { nom: 'Latitude', type: 'Latitude' },
    299: { nom: 'Longitude', type: 'Longitude' },
    // === Photos 21–30 (rangs 264–273) ===
    264: { nom: 'Photo 21', type: 'Photo' },
    265: { nom: 'Photo 22', type: 'Photo' },
    266: { nom: 'Photo 23', type: 'Photo' },
    267: { nom: 'Photo 24', type: 'Photo' },
    268: { nom: 'Photo 25', type: 'Photo' },
    269: { nom: 'Photo 26', type: 'Photo' },
    270: { nom: 'Photo 27', type: 'Photo' },
    271: { nom: 'Photo 28', type: 'Photo' },
    272: { nom: 'Photo 29', type: 'Photo' },
    273: { nom: 'Photo 30', type: 'Photo' },
    // === Prix hors honoraires (rang 303) ===
    303: { nom: 'Prix hors honoraires acquéreur', type: 'Décimal', minValue: 0, lteField: 11 },
}

// =============================================================================
// NOMS DES COLONNES (issus de En-tête_Poliris.csv)
// =============================================================================
export const COLUMN_NAMES: string[] = [
    'Identifiant agence', 'Référence agence du bien', "Type d'annonce", 'Type de bien', 'CP', 'Ville', 'Pays',
    'Adresse', 'Quartier / Proximité', 'Activités commerciales', 'Prix / Loyer / Prix de cession',
    'Loyer / mois murs', 'Loyer CC', 'Loyer HT', 'Honoraires', 'Surface (m²)', 'SF terrain (m²)',
    'NB de pièces', 'NB de chambres', 'Libellé', 'Descriptif', 'Date de disponibilité', 'Charges',
    'Etage', "NB d'étages", 'Meublé', 'Année de construction', 'Refait à neuf', 'NB de salles de bain',
    "NB de salles d'eau", 'NB de WC', 'WC séparés', 'Type de chauffage', 'Type de cuisine',
    'Orientation sud', 'Orientation est', 'Orientation ouest', 'Orientation nord', 'NB balcons',
    'SF Balcon', 'Ascenseur', 'Cave', 'NB de parkings', 'NB de boxes', 'Digicode', 'Interphone',
    'Gardien', 'Terrasse', 'Prix semaine / basse saison', 'Prix quinzaine / basse saison',
    'Prix mois / basse saison', 'Prix semaine / haute saison', 'Prix quinzaine / haute saison',
    'Prix mois / haute saison', 'NB de personnes', 'Type de résidence', 'Situation', 'NB de couverts',
    'NB de lits doubles', 'NB de lits simples', 'Alarme', 'Câble TV', 'Calme', 'Climatisation',
    'Piscine', 'Aménagement pour handicapés', 'Animaux acceptés', 'Cheminée', 'Congélateur', 'Four',
    'Lave-vaisselle', 'Micro-ondes', 'Placards', 'Téléphone', 'Proche lac', 'Proche tennis',
    'Proche pistes de ski', 'Vue dégagée', "Chiffre d'affaire", 'Longueur façade (m)', 'Duplex',
    'Publications', 'Mandat en exclusivité', 'Coup de coeur', 'Photo 1', 'Photo 2', 'Photo 3',
    'Photo 4', 'Photo 5', 'Photo 6', 'Photo 7', 'Photo 8', 'Photo 9', 'Titre photo 1',
    'Titre photo 2', 'Titre photo 3', 'Titre photo 4', 'Titre photo 5', 'Titre photo 6',
    'Titre photo 7', 'Titre photo 8', 'Titre photo 9', 'Photo panoramique', 'URL visite virtuelle',
    'Téléphone à afficher', 'Contact à afficher', 'Email à afficher', 'CP Réel du bien',
    'Ville réelle du bien', 'Intercabinet', 'Intercabinet prive', 'N° de mandat', 'Date mandat',
    'Nom mandataire', 'Prénom mandataire', 'Raison sociale mandataire', 'Adresse mandataire',
    'CP mandataire', 'Ville mandataire', 'Téléphone mandataire', 'Commentaires mandataire',
    'Commentaires privés', 'Code négociateur', 'Code Langue 1', 'Proximité Langue 1',
    'Libellé Langue 1', 'Descriptif Langue 1', 'Code Langue 2', 'Proximité Langue 2',
    'Libellé Langue 2', 'Descriptif Langue 2', 'Code Langue 3', 'Proximité Langue 3',
    'Libellé Langue 3', 'Descriptif Langue 3', 'Champ personnalisé 1', 'Champ personnalisé 2',
    'Champ personnalisé 3', 'Champ personnalisé 4', 'Champ personnalisé 5', 'Champ personnalisé 6',
    'Champ personnalisé 7', 'Champ personnalisé 8', 'Champ personnalisé 9', 'Champ personnalisé 10',
    'Champ personnalisé 11', 'Champ personnalisé 12', 'Champ personnalisé 13', 'Champ personnalisé 14',
    'Champ personnalisé 15', 'Champ personnalisé 16', 'Champ personnalisé 17', 'Champ personnalisé 18',
    'Champ personnalisé 19', 'Champ personnalisé 20', 'Champ personnalisé 21', 'Champ personnalisé 22',
    'Champ personnalisé 23', 'Champ personnalisé 24', 'Champ personnalisé 25', 'Dépôt de garantie',
    'Récent', 'Travaux à prévoir', 'Photo 10', 'Photo 11', 'Photo 12', 'Photo 13', 'Photo 14',
    'Photo 15', 'Photo 16', 'Photo 17', 'Photo 18', 'Photo 19', 'Photo 20', 'Identifiant technique',
    'Consommation énergie', 'Bilan consommation énergie', 'Emissions GES', 'Bilan émission GES',
    'Identifiant quartier', 'Sous type de bien', 'Périodes de disponibilité', 'Périodes basse saison',
    'Périodes haute saison', 'Prix du bouquet', 'Rente mensuelle', 'Age de l\'homme', 'Age de la femme',
    'Entrée', 'Résidence', 'Parquet', 'Vis-à-vis', 'Transport : Ligne', 'Transport : Station',
    'Durée bail', 'Places en salle', 'Monte charge', 'Quai', 'Nombre de bureaux',
    'Prix du droit d\'entrée', 'Prix masqué', 'Loyer annuel global', 'Charges annuelles globales',
    'Loyer annuel au m2', 'Charges annuelles au m2', 'Charges mensuelles HT', 'Loyer annuel CC',
    'Loyer annuel HT', 'Charges annuelles HT', 'Loyer annuel au m2 CC', 'Loyer annuel au m2 HT',
    'Charges annuelles au m2 HT', 'Divisible', 'Surface divisible minimale',
    'Surface divisible maximale', 'Surface séjour', 'Nombre de véhicules', 'Prix du droit au bail',
    'Valeur à l\'achat', 'Répartition du chiffre d\'affaire', 'Terrain agricole', 'Equipement bébé',
    'Terrain constructible', 'Résultat Année N-2', 'Résultat Année N-1', 'Résultat Actuel',
    'Immeuble de parkings', 'Parking isolé', 'Si Viager Vendu Libre', 'Logement à disposition',
    'Terrain en pente', "Plan d'eau", 'Lave linge', 'Sèche linge', 'Connexion internet',
    "Chiffre affaire Année N-2", "Chiffre affaire Année N-1", 'Conditions financières',
    'Prestations diverses', 'Longueur façade', 'Montant du rapport', 'Nature du bail',
    'Nature bail commercial', 'Nombre terrasses', 'Prix hors taxes', 'Si Salle à manger',
    'Si Séjour', 'Terrain donne sur la rue', 'Immeuble de type bureaux', 'Terrain viabilisé',
    'Equipement Vidéo', 'Surface de la cave', 'Surface de la salle à manger',
    'Situation commerciale', "Surface maximale d'un bureau", 'Honoraires charge acquéreur',
    'Pourcentage honoraires TTC', 'En copropriété', 'Nombre de lots', 'Charges annuelles',
    'Procédure syndicat copro', 'Détail procédure', 'Champs perso 26', 'Photo 21', 'Photo 22',
    'Photo 23', 'Photo 24', 'Photo 25', 'Photo 26', 'Photo 27', 'Photo 28', 'Photo 29', 'Photo 30',
    'Titre Photo 10', 'Titre Photo 11', 'Titre Photo 12', 'Titre Photo 13', 'Titre Photo 14',
    'Titre Photo 15', 'Titre Photo 16', 'Titre Photo 17', 'Titre Photo 18', 'Titre Photo 19',
    'Titre Photo 20', 'Titre Photo 21', 'Titre Photo 22', 'Titre Photo 23', 'Titre Photo 24',
    'Titre Photo 25', 'Titre Photo 26', 'Titre Photo 27', 'Titre Photo 28', 'Titre Photo 29',
    'Titre Photo 30', 'Prix du terrain', 'Prix du modèle de maison',
    "Nom de l'agence gérant le terrain", 'Latitude', 'Longitude', 'Précision GPS',
    'Version Format', 'Honoraires à la charge de', 'Prix hors honoraires acquéreur',
    'Modalités charges locataire', 'Complément loyer', "Part Honoraires état des lieux",
    "URL du Barème des honoraires de l'Agence", 'Prix minimum', 'Prix maximum', 'Surface minimale',
    'Surface maximale', 'Nombre de pièces minimum', 'Nombre de pièces maximum',
    'Nombre de chambres minimum', 'Nombre de chambres maximum', 'ID type étage',
    'Si combles aménageables', 'Si garage', 'ID type garage', 'Si possibilité mitoyenneté',
    'Surface terrain nécessaire', 'Localisation', 'Nom du modèle', 'Date réalisation DPE',
    'Version DPE', 'DPE coût min conso', 'DPE coût max conso', 'DPE Année de référence conso',
    'Surface terrasse', 'DPE coût conso annuelle', 'Loyer de base', 'Loyer de référence majoré',
    'Encadrement des loyers', 'Conso énergie finale'
]

// =============================================================================
// CONSTRUCTION DU SCHÉMA COMPLET (334 champs)
// =============================================================================
export function buildSchema(): FieldRule[] {
    const schema: FieldRule[] = []
    for (let i = 1; i <= EXPECTED_COLUMNS; i++) {
        const isObligatoire = MANDATORY_RANKS.has(i)
        const knownField = KNOWN_FIELDS[i]
        const columnName = COLUMN_NAMES[i - 1] || `Champ Poliris ${i}`

        if (knownField) {
            schema.push({
                rang: i,
                nom: knownField.nom || columnName,
                type: knownField.type || 'Texte',
                obligatoire: isObligatoire,
                valeurs: knownField.valeurs,
                minLength: knownField.minLength,
                maxLength: knownField.maxLength,
                minValue: knownField.minValue,
                maxValue: knownField.maxValue,
                lteField: knownField.lteField,
                gteField: knownField.gteField,
            })
        } else {
            schema.push({
                rang: i,
                nom: columnName,
                type: 'Texte',
                obligatoire: isObligatoire,
            })
        }
    }
    return schema
}
