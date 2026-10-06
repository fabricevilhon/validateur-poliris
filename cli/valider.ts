/**
 * Validateur Poliris en ligne de commande — même moteur que l'interface, retour JSON.
 *
 * Construction (un seul fichier, sans dépendance à l'exécution) :
 *     npm run build:cli            → .output/cli/valider.mjs
 *
 * Usage :
 *     node .output/cli/valider.mjs <Annonces.csv> [--detail]
 *
 * Sortie : un objet JSON sur stdout (synthèse ; avec --detail, chaque erreur).
 * Code de sortie : 0 = aucune erreur critique, 1 = au moins une critique ou structure
 * invalide, 2 = usage incorrect ou fichier illisible.
 */
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { tryDecode, validateFile, type ValidationResult } from '../app/utils/validator'

type Erreur = ValidationResult['errors'][number]

function compter(erreurs: Erreur[], cle: (e: Erreur) => string): Record<string, number> {
    const compteurs: Record<string, number> = {}
    for (const e of erreurs) compteurs[cle(e)] = (compteurs[cle(e)] ?? 0) + 1
    return compteurs
}

function main(argv: string[]): number {
    const fichiers = argv.filter(a => !a.startsWith('--'))
    const detail = argv.includes('--detail')
    const chemin = fichiers[0]
    if (chemin === undefined || fichiers.length > 1) {
        console.error('Usage : node valider.mjs <Annonces.csv> [--detail]')
        return 2
    }

    let octets: Buffer
    try {
        octets = readFileSync(chemin)
    } catch (err) {
        console.log(JSON.stringify({ fichier: chemin, erreur: `fichier illisible : ${(err as Error).message}` }))
        return 2
    }
    // Copie dans un ArrayBuffer propre : le tampon de Node peut être partagé (pool) et plus large.
    const tampon = new Uint8Array(octets).buffer
    const decode = tryDecode(tampon)
    if (!decode) {
        console.log(JSON.stringify({ fichier: chemin, erreur: 'encodage non reconnu (UTF-8, ISO-8859-1, Windows-1252)' }))
        return 2
    }

    const resultat = validateFile(decode.content)
    const synthese = {
        fichier: chemin,
        encodage: decode.encoding,
        lignes: resultat.totalLines,
        colonnesDetectees: resultat.detectedColumns,
        identifiantsAgence: resultat.uniqueAgencyIds,
        structure: resultat.isGlobalStructureError ? resultat.globalStructureMsg : null,
        erreurs: resultat.errors.length,
        parSeverite: compter(resultat.errors, e => e.severity),
        parCategorie: compter(resultat.errors, e => e.category),
        ...(detail ? { detail: resultat.errors } : {}),
    }
    console.log(JSON.stringify(synthese, null, 2))

    const critique = resultat.isGlobalStructureError || resultat.errors.some(e => e.severity === 'critique')
    return critique ? 1 : 0
}

process.exitCode = main(process.argv.slice(2))
