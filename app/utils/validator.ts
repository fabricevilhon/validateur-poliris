import {
    type FieldRule,
    type ValidationError,
    type ErrorSeverity,
    buildSchema,
    EXPECTED_COLUMNS,
    REF_ANNONCE_INDEX
} from './poliris-schema'

// =============================================================================
// SCHÉMA (singleton)
// =============================================================================
const SCHEMA = buildSchema()

// =============================================================================
// FONCTIONS DE VALIDATION INDIVIDUELLES
// =============================================================================
function checkObligatoire(value: string, rule: FieldRule): string | null {
    if (rule.obligatoire && !value) return 'Le champ obligatoire est vide.'
    return null
}

function checkEntier(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Entier' && value && !/^-?\d+$/.test(value)) return 'Doit être un entier.'
    return null
}

function checkDecimal(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Décimal' && value) {
        const num = Number(value.replace(',', '.'))
        if (isNaN(num)) return 'Doit être un nombre.'
    }
    return null
}

function checkDate(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Date' && value) {
        // "00/00/0000" est accepté comme équivalent d'un champ non rempli
        if (value === '00/00/0000') return null
        const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (!match) return `Format de date invalide. Attendu JJ/MM/AAAA, reçu "${value}".`
        const [, day, month, year] = match.map(Number)
        if (month < 1 || month > 12) return `Mois invalide : ${month}.`
        if (day < 1 || day > 31) return `Jour invalide : ${day}.`
        const d = new Date(year, month - 1, day)
        if (d.getDate() !== day || d.getMonth() !== month - 1) return `Date invalide : ${value}.`
    }
    return null
}

function checkValeursPermises(value: string, rule: FieldRule): string | null {
    if (rule.valeurs && value) {
        const normalize = (s: string) => s.toLowerCase().replace(/-/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const normalizedInput = normalize(value)
        const normalizedAllowed = rule.valeurs.map(v => normalize(v))
        if (!normalizedAllowed.includes(normalizedInput)) {
            return `Valeur non autorisée. Attendues : ${rule.valeurs.join(', ')}`
        }
    }
    return null
}

function checkSansEspace(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Texte_Sans_Espace' && value && value.includes(' ')) {
        return "Format invalide : Ce champ ne doit pas contenir d'espaces."
    }
    return null
}

function checkPipes(value: string, _rule: FieldRule): string | null {
    if (value && value.includes('|')) {
        return 'Caractère pipe (|) détecté — risque de décalage de données.'
    }
    return null
}

function checkHtmlInterdit(value: string, _rule: FieldRule): string | null {
    if (!value) return null
    // Supprimer les balises <br> autorisées sous toutes leurs formes
    const cleaned = value.replace(/<\/?br\s*\/?>/gi, '')
    // Vérifier s'il reste des balises HTML
    const htmlMatch = cleaned.match(/<[^>]+>/)
    if (htmlMatch) {
        return `HTML non autorisé détecté : "${htmlMatch[0]}". Seules les balises <br> sont acceptées.`
    }
    return null
}

function checkCodePostal(value: string, rule: FieldRule): string | null {
    if (rule.type === 'CodePostal' && value && !/^\d{5}$/.test(value)) {
        return 'Code postal invalide : doit contenir exactement 5 chiffres.'
    }
    return null
}

function checkUrl(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Url' && value) {
        try {
            new URL(value)
        } catch {
            return 'URL invalide. Format attendu : https://...'
        }
    }
    return null
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|bmp|tiff)$/i

function checkPhoto(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Photo' && value) {
        // Accepter une URL valide
        try {
            new URL(value)
            return null
        } catch {
            // Sinon vérifier que c'est un nom de fichier image valide
            if (!IMAGE_EXTENSIONS.test(value)) {
                return `Format photo invalide : "${value}". Attendu : une URL ou un fichier image (png, jpg, jpeg, webp, bmp, tiff).`
            }
        }
    }
    return null
}

function checkEmail(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return 'Format email invalide.'
    }
    return null
}

function checkTelephone(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Telephone' && value) {
        // Nettoyer : supprimer espaces, tirets, points, parenthèses
        const cleaned = value.replace(/[\s.\-()]/g, '')
        // Formats acceptés :
        // - 0XXXXXXXXX (10 chiffres français)
        // - +33XXXXXXXXX (international avec +)
        // - 33XXXXXXXXX (international sans +)
        // - +XXXXXXXXXXX (international générique, 7-15 chiffres)
        if (!/^(\+?\d{7,15}|0\d{9})$/.test(cleaned)) {
            return 'Format téléphone invalide. Attendu : 10 chiffres commençant par 0, ou format international (+33..., 33...).'
        }
    }
    return null
}

function checkPlageNumerique(value: string, rule: FieldRule): string | null {
    if (!value) return null
    if (rule.type !== 'Entier' && rule.type !== 'Décimal') return null
    const num = Number(value.replace(',', '.'))
    if (isNaN(num)) return null // déjà vérifié par checkEntier/checkDecimal
    // "0" est accepté comme équivalent d'un champ non rempli (ex: année de construction)
    if (num === 0) return null
    if (rule.minValue !== undefined && num < rule.minValue) {
        return `Valeur trop petite : ${num}. Minimum attendu : ${rule.minValue}.`
    }
    if (rule.maxValue !== undefined && num > rule.maxValue) {
        return `Valeur trop grande : ${num}. Maximum attendu : ${rule.maxValue}.`
    }
    return null
}

function checkLongueur(value: string, rule: FieldRule): string | null {
    if (!value) return null
    if (rule.minLength !== undefined && value.length < rule.minLength) {
        return `Texte trop court : ${value.length} caractères. Minimum attendu : ${rule.minLength}.`
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return `Texte trop long : ${value.length} caractères. Maximum attendu : ${rule.maxLength}.`
    }
    return null
}

function checkBooleen(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Booléen' && value) {
        const normalized = value.toLowerCase().trim()
        if (!['oui', 'non', '0', '1', 'true', 'false', 'o', 'n', 'yes', 'no'].includes(normalized)) {
            return `Valeur booléenne invalide : "${value}". Attendu : oui/non, yes/no, 0/1, true/false.`
        }
    }
    return null
}

function checkDPE(value: string, rule: FieldRule): string | null {
    if (rule.type === 'DPE' && value) {
        // "NS" = Non Soumis au diagnostic, "VI" = Vierge : valeurs autorisées
        const upper = value.toUpperCase()
        if (upper === 'NS' || upper === 'VI') return null
        if (!/^[A-Ga-g]$/.test(value)) {
            return `Valeur DPE/GES invalide : "${value}". Attendu : une lettre de A à G, "NS" (non soumis) ou "VI" (vierge).`
        }
    }
    return null
}

function checkLatitude(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Latitude' && value) {
        const num = Number(value.replace(',', '.'))
        if (isNaN(num) || num < -90 || num > 90) {
            return `Latitude invalide : "${value}". Attendu : nombre entre -90 et 90.`
        }
    }
    return null
}

function checkLongitude(value: string, rule: FieldRule): string | null {
    if (rule.type === 'Longitude' && value) {
        const num = Number(value.replace(',', '.'))
        if (isNaN(num) || num < -180 || num > 180) {
            return `Longitude invalide : "${value}". Attendu : nombre entre -180 et 180.`
        }
    }
    return null
}

function checkAnneeConstruction(value: string, rule: FieldRule): string | null {
    if (rule.type === 'AnneeConstruction' && value) {
        // Accepter "0" comme non rempli
        if (value === '0') return null
        // Doit être composé uniquement de chiffres
        if (!/^\d+$/.test(value)) return `Année de construction invalide : "${value}". Attendu : un entier à 4 chiffres.`
        // Warning si seulement 3 chiffres (année probablement tronquée)
        if (value.length === 3) return `Année de construction suspecte : "${value}" ne contient que 3 chiffres — année tronquée ?`
        // Doit contenir exactement 4 chiffres
        if (value.length !== 4) return `Année de construction invalide : "${value}". Attendu : un entier à 4 chiffres.`
    }
    return null
}

// =============================================================================
// PIPELINE DE VALIDATION
// =============================================================================
type ValidationFn = (value: string, rule: FieldRule) => string | null

const TYPE_VALIDATION_PIPELINE: ValidationFn[] = [
    checkEntier,
    checkDecimal,
    checkDate,
    checkValeursPermises,
    checkSansEspace,
    checkCodePostal,
    checkUrl,
    checkPhoto,
    checkEmail,
    checkTelephone,
    checkBooleen,
    checkDPE,
    checkLatitude,
    checkLongitude,
    checkAnneeConstruction,
    checkPlageNumerique,
    checkLongueur,
]

// Règles appliquées à tous les champs (indépendamment du type)
const GLOBAL_VALIDATION_PIPELINE: ValidationFn[] = [
    checkPipes,
    checkHtmlInterdit,
]

// =============================================================================
// VALIDATION D'UNE LIGNE
// =============================================================================
function getSeverity(message: string): ErrorSeverity {
    if (message.includes('obligatoire') || message.includes('HTML') || message.includes('multiple')) return 'critique'
    if (message.includes('pipe')) return 'warning'
    if (message.includes('année tronquée') || message.includes('Année de construction suspecte')) return 'warning'
    if (message.includes('absent')) return 'info'
    if (message.includes('Structure') || message.includes('excédentaire')) return 'warning'
    return 'info'
}

function getCategory(message: string): string {
    if (message.includes('obligatoire')) return 'Champ obligatoire'
    if (message.includes('pipe')) return 'Pipe détecté'
    if (message.includes('HTML')) return 'HTML non autorisé'
    if (message.includes('absent')) return 'Champs absents'
    if (message.includes('Structure') || message.includes('colonnes') || message.includes('guillemets')) return 'Structure'
    if (message.includes('multiple') || message.includes('Référence')) return 'Doublon'
    if (message.includes('Code postal')) return 'Code postal'
    if (message.includes('URL')) return 'URL'
    if (message.includes('email')) return 'Email'
    if (message.includes('éléphone')) return 'Téléphone'
    if (message.includes('DPE') || message.includes('GES')) return 'DPE/GES'
    if (message.includes('GPS') || message.includes('atitude') || message.includes('ongitude')) return 'GPS'
    if (message.includes('date')) return 'Date'
    if (message.includes('Année de construction')) return 'Année de construction'
    if (message.includes('entier') || message.includes('nombre') || message.includes('Valeur trop')) return 'Type numérique'
    if (message.includes('booléen')) return 'Booléen'
    if (message.includes('autorisée')) return 'Valeur non autorisée'
    if (message.includes('caractères')) return 'Longueur de texte'
    return 'Autre'
}

function validateRow(rowNum: number, rowData: string[], allFieldsData: string[][]): ValidationError[] {
    const errors: ValidationError[] = []
    const annonceRef = rowData.length > REF_ANNONCE_INDEX ? rowData[REF_ANNONCE_INDEX] : 'N/A'
    const typeBien = rowData.length > 3 ? (rowData[3] ?? '').toLowerCase().trim() : ''

    for (let i = 0; i < rowData.length; i++) {
        const cleanValue = rowData[i]
        const rule = SCHEMA[i]
        if (!rule) continue

        // Vérification obligatoire
        const oblError = checkObligatoire(cleanValue, rule)
        if (oblError) {
            const err = makeError(rowNum, annonceRef, rule, cleanValue, oblError)
            errors.push(err)
            continue
        }

        if (!cleanValue) continue

        // Validations globales (pipes, HTML) sur tous les champs
        for (const fn of GLOBAL_VALIDATION_PIPELINE) {
            const msg = fn(cleanValue, rule)
            if (msg) {
                errors.push(makeError(rowNum, annonceRef, rule, cleanValue, msg))
            }
        }

        // Validations par type
        for (const fn of TYPE_VALIDATION_PIPELINE) {
            const msg = fn(cleanValue, rule)
            if (msg) {
                errors.push(makeError(rowNum, annonceRef, rule, cleanValue, msg))
                break
            }
        }

        // Cohérence croisée : ce champ doit être <= à un autre champ
        if (rule.lteField !== undefined) {
            const otherIdx = rule.lteField - 1
            if (otherIdx >= 0 && otherIdx < rowData.length) {
                const otherValue = rowData[otherIdx]
                if (otherValue) {
                    const thisNum = Number(cleanValue.replace(',', '.'))
                    const otherNum = Number(otherValue.replace(',', '.'))
                    if (!isNaN(thisNum) && !isNaN(otherNum) && thisNum > otherNum) {
                        const otherRule = SCHEMA[otherIdx]
                        errors.push(makeError(
                            rowNum, annonceRef, rule, cleanValue,
                            `Incohérence : ${rule.nom} (${thisNum}) ne devrait pas dépasser ${otherRule?.nom || `Champ ${rule.lteField}`} (${otherNum}).`
                        ))
                    }
                }
            }
        }
    }

    // Index du champ Pays (rang 7, index 0-based) — utilisé par les validations croisées CP
    const paysIdx = 6

    // Validation croisée : CP (rang 5) → vérifier 5 chiffres uniquement si Pays = France ou vide
    const cpIdx = 4      // rang 5, index 0-based
    if (rowData.length > cpIdx && rowData[cpIdx]) {
        const pays = (rowData[paysIdx] || '').toLowerCase().trim()
        if ((pays === 'france' || pays === '') && !/^\d{5}$/.test(rowData[cpIdx])) {
            const cpRule = SCHEMA[cpIdx]
            if (cpRule) {
                errors.push(makeError(
                    rowNum, annonceRef, cpRule, rowData[cpIdx],
                    'Code postal invalide pour la France : doit contenir exactement 5 chiffres.'
                ))
            }
        }
    }

    // Validation croisée : CP Réel du bien (rang 108) → vérifier 5 chiffres uniquement si Pays = France
    const cpReelIdx = 107  // rang 108, index 0-based
    if (rowData.length > cpReelIdx && rowData[cpReelIdx]) {
        const pays = (rowData[paysIdx] || '').toLowerCase().trim()
        const cpReel = rowData[cpReelIdx]
        if (pays === 'france' && !/^\d{5}$/.test(cpReel)) {
            const cpRule = SCHEMA[cpReelIdx]
            if (cpRule) {
                errors.push(makeError(
                    rowNum, annonceRef, cpRule, cpReel,
                    'Code postal invalide pour la France : doit contenir exactement 5 chiffres.'
                ))
            }
        }
    }

    return errors
}

// Vérifications croisées supplémentaires appelées depuis validateFile
function validateRowCrossChecks(rowNum: number, rowData: string[]): ValidationError[] {
    const errors: ValidationError[] = []
    const annonceRef = rowData.length > REF_ANNONCE_INDEX ? rowData[REF_ANNONCE_INDEX] : 'N/A'

    // Warning si Photo 1 (rang 85, index 84) est vide
    const photo1Idx = 84
    if (rowData.length > photo1Idx && !rowData[photo1Idx]) {
        const photoRule = SCHEMA[photo1Idx]
        if (photoRule) {
            errors.push({
                ligne: rowNum,
                referenceAnnonce: annonceRef,
                rang: 85,
                champ: 'Photo 1',
                message: 'Aucune photo transmise pour cette annonce.',
                valeur: '[VIDE]',
                severity: 'warning',
                category: 'Photo manquante',
            })
        }
    }

    return errors
}

function makeError(ligne: number, ref: string, rule: FieldRule, value: string, message: string): ValidationError {
    return {
        ligne,
        referenceAnnonce: ref,
        rang: rule.rang,
        champ: rule.nom,
        valeur: value ? `"${value}"` : '[VIDE]',
        message,
        severity: getSeverity(message),
        category: getCategory(message),
    }
}

// =============================================================================
// DÉTECTION D'ENCODAGE
// =============================================================================
export function tryDecode(buffer: ArrayBuffer): { content: string; encoding: string } | null {
    const encodings = ['utf-8', 'iso-8859-1', 'windows-1252']
    for (const encoding of encodings) {
        try {
            const decoder = new TextDecoder(encoding, { fatal: true })
            const content = decoder.decode(buffer)
            return { content, encoding }
        } catch {
            continue
        }
    }
    return null
}

// =============================================================================
// RÉSULTAT DE VALIDATION
// =============================================================================
export interface ValidationResult {
    errors: ValidationError[]
    dataRows: string[][]
    columnHeaders: string[]
    totalLines: number
    detectedEncoding: string
    detectedColumns: number
    isGlobalStructureError: boolean
    globalStructureMsg: string
    uniqueAgencyIds: string[]
}

// =============================================================================
// FONCTION PRINCIPALE DE VALIDATION
// =============================================================================
export function validateFile(content: string): Omit<ValidationResult, 'detectedEncoding'> {
    const errors: ValidationError[] = []
    const dataRows: string[][] = []

    const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalized.trim().split('\n')

    // =========================================================================
    // ÉTAPE 1 : Pré-analyse (doublons + structure globale)
    // =========================================================================
    const refLocations: Record<string, number[]> = {}
    const lineLengths: number[] = []
    const agencyIdSet = new Set<string>()

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue

        const tempFields = line.split('!#')
        if (tempFields.length === 335 && tempFields[334] === '') {
            tempFields.pop()
        }

        lineLengths.push(tempFields.length)

        // Collecter les identifiants agences distincts (champ index 0)
        if (tempFields.length > 0) {
            const agencyId = tempFields[0].replace(/"/g, '').trim()
            if (agencyId) agencyIdSet.add(agencyId)
        }

        if (tempFields.length > REF_ANNONCE_INDEX) {
            const r = tempFields[REF_ANNONCE_INDEX].replace(/"/g, '').trim()
            if (r) {
                if (!refLocations[r]) refLocations[r] = []
                refLocations[r].push(i + 1)
            }
        }
    }

    const uniqueLengths = new Set(lineLengths)
    let isGlobalStructureError = false
    let globalStructureMsg = ''

    if (uniqueLengths.size === 1) {
        const commonLen = [...uniqueLengths][0]
        if (commonLen !== EXPECTED_COLUMNS) {
            isGlobalStructureError = true
            // Ne signaler que si l'écart est significatif (< 300 colonnes = vrai problème de format)
            if (commonLen < 300) {
                globalStructureMsg = `Structure fichier : TOUTES les lignes contiennent ${commonLen} champs au lieu de ${EXPECTED_COLUMNS}. Les colonnes ont été ajustées automatiquement pour la validation.`
                errors.push({
                    ligne: 0,
                    referenceAnnonce: 'FICHIER ENTIER',
                    rang: '-',
                    champ: 'Structure Générale',
                    message: globalStructureMsg,
                    valeur: `${commonLen} colonnes`,
                    severity: 'warning',
                    category: 'Structure',
                })
            }
        }
    }

    // =========================================================================
    // ÉTAPE 2 : Traitement ligne par ligne
    // =========================================================================
    const allFieldsData: string[][] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue

        let fields = line.split('!#')
        if (fields.length === 335 && fields[334] === '') fields.pop()

        const currentLen = fields.length

        // Trouver le dernier champ encapsulé avec des guillemets (= fin logique de la ligne)
        let lastQuotedIndex = -1
        for (let idx = fields.length - 1; idx >= 0; idx--) {
            const f = fields[idx]
            if (f.length >= 2 && f.startsWith('"') && f.endsWith('"')) {
                lastQuotedIndex = idx
                break
            }
        }
        // Le nombre de champs "utiles" est jusqu'au dernier guillemet inclus
        const effectiveLen = lastQuotedIndex + 1

        if (currentLen > EXPECTED_COLUMNS && !isGlobalStructureError) {
            errors.push({
                ligne: i + 1,
                referenceAnnonce: 'Inconnue',
                rang: 'Général',
                champ: 'Structure',
                message: `${currentLen} champs trouvés (attendu ${EXPECTED_COLUMNS}). Colonnes excédentaires ignorées.`,
                valeur: `${currentLen} cols`,
                severity: 'warning',
                category: 'Structure',
            })
        }

        // Vérification guillemets CSV — uniquement sur les champs "utiles" (jusqu'au dernier guillemet)
        const rawRef = fields.length > REF_ANNONCE_INDEX ? fields[REF_ANNONCE_INDEX].replace(/"/g, '') : 'N/A'
        for (let idx = 0; idx <= lastQuotedIndex; idx++) {
            const rawVal = fields[idx]
            const isValidQuote = rawVal.length >= 2 && rawVal.startsWith('"') && rawVal.endsWith('"')
            if (!isValidQuote) {
                const fieldName = idx < SCHEMA.length ? SCHEMA[idx].nom : `Champ ${idx + 1}`
                const valeurAffichee = rawVal === '' ? '[VIDE]' : rawVal
                errors.push({
                    ligne: i + 1,
                    referenceAnnonce: rawRef,
                    rang: idx + 1,
                    champ: fieldName,
                    message: 'Format CSV invalide : Tout champ doit être entre guillemets (""), même vide.',
                    valeur: valeurAffichee,
                    severity: 'warning',
                    category: 'Structure',
                })
            }
        }

        // Vérification doublons
        const cleanRefForCheck = fields.length > REF_ANNONCE_INDEX ? fields[REF_ANNONCE_INDEX].replace(/"/g, '').trim() : ''
        if (cleanRefForCheck && (refLocations[cleanRefForCheck]?.length ?? 0) > 1) {
            const locations = refLocations[cleanRefForCheck]
            errors.push({
                ligne: i + 1,
                referenceAnnonce: cleanRefForCheck,
                rang: 2,
                champ: 'Référence agence du bien',
                message: `Référence multiple détectée : Présente ${locations.length} fois (lignes : ${locations.join(', ')}).`,
                valeur: cleanRefForCheck,
                severity: 'critique',
                category: 'Doublon',
            })
        }

        // Nettoyage et ajustement des colonnes
        // On conserve la valeur brute (sans guillemets) du champ 1 pour pouvoir détecter les espaces
        const rawIdentifiantAgence = fields[0] ? fields[0].replace(/"/g, '') : ''
        let cleanedRow = fields.map(f => f.replace(/"/g, '').trim())

        // Détection des espaces avant/après l'identifiant agence (champ n°1, index 0)
        if (rawIdentifiantAgence && rawIdentifiantAgence !== rawIdentifiantAgence.trim()) {
            const hasLeading = rawIdentifiantAgence !== rawIdentifiantAgence.trimStart()
            const hasTrailing = rawIdentifiantAgence !== rawIdentifiantAgence.trimEnd()
            let detail = ''
            if (hasLeading && hasTrailing) detail = 'avant et après'
            else if (hasLeading) detail = 'avant (début)'
            else detail = 'après (fin)'

            errors.push({
                ligne: i + 1,
                referenceAnnonce: rawRef,
                rang: 1,
                champ: 'Identifiant agence',
                message: `Espace(s) détecté(s) ${detail} l'identifiant agence : "${rawIdentifiantAgence}". L'identifiant ne sera pas reconnu par le job d'intégration.`,
                valeur: `"${rawIdentifiantAgence}"`,
                severity: 'critique',
                category: 'Identifiant agence',
            })

            // Conserver la valeur NON trimmée pour la visualisation
            cleanedRow[0] = rawIdentifiantAgence
        }

        if (cleanedRow.length < EXPECTED_COLUMNS) {
            cleanedRow = [...cleanedRow, ...Array(EXPECTED_COLUMNS - cleanedRow.length).fill('')]
        } else if (cleanedRow.length > EXPECTED_COLUMNS) {
            cleanedRow = cleanedRow.slice(0, EXPECTED_COLUMNS)
        }

        dataRows.push(cleanedRow)
        allFieldsData.push(cleanedRow)
        errors.push(...validateRow(i + 1, cleanedRow, allFieldsData))
        errors.push(...validateRowCrossChecks(i + 1, cleanedRow))
    }

    // Construction des en-têtes de colonnes
    const columnHeaders = SCHEMA.map((rule, idx) => `${idx + 1} - ${rule.nom}`)

    // Déterminer le nombre moyen de champs détectés
    const detectedColumns = lineLengths.length > 0
        ? Math.round(lineLengths.reduce((a, b) => a + b, 0) / lineLengths.length)
        : EXPECTED_COLUMNS

    return {
        errors,
        dataRows,
        columnHeaders,
        totalLines: lines.length,
        detectedColumns,
        isGlobalStructureError,
        globalStructureMsg,
        uniqueAgencyIds: [...agencyIdSet].sort(),
    }
}
