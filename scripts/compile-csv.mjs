/**
 * Script de compilation CSV depuis des archives ZIP.
 * 
 * Usage : node scripts/compile-csv.mjs
 * 
 * - Lit toutes les archives .zip dans le dossier test-archives/
 * - Extrait le fichier Annonces.csv (ou annonces.csv) de chaque archive
 * - Détecte l'encodage (UTF-8, ISO-8859-1, Windows-1252)
 * - Compile toutes les lignes en un seul fichier test-archives/compiled.csv
 * - Affiche un résumé du traitement
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, basename } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'fs'

const ARCHIVES_DIR = join(process.cwd(), 'test-archives')
const OUTPUT_FILE = join(ARCHIVES_DIR, 'compiled.csv')

// Détection d'encodage et lecture
function readWithEncoding(buffer) {
    const encodings = ['utf-8', 'utf8']

    // Essayer UTF-8 en mode strict
    try {
        const decoder = new TextDecoder('utf-8', { fatal: true })
        return decoder.decode(buffer)
    } catch {
        // Fallback ISO-8859-1 (ne peut pas échouer)
        const decoder = new TextDecoder('iso-8859-1')
        return decoder.decode(buffer)
    }
}

// Extraire le CSV d'un ZIP en utilisant PowerShell
function extractCsvFromZip(zipPath) {
    const tempDir = mkdtempSync(join(tmpdir(), 'poliris-'))

    try {
        // Extraire avec PowerShell
        execSync(
            `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`,
            { stdio: 'pipe' }
        )

        // Chercher annonces.csv (insensible à la casse)
        const files = readdirSync(tempDir)
        const csvFile = files.find(f => f.toLowerCase() === 'annonces.csv')

        if (!csvFile) {
            console.warn(`  ⚠️  Aucun fichier Annonces.csv trouvé dans ${basename(zipPath)}`)
            return null
        }

        const csvPath = join(tempDir, csvFile)
        const buffer = readFileSync(csvPath)
        return readWithEncoding(buffer)
    } finally {
        // Nettoyer le dossier temporaire
        rmSync(tempDir, { recursive: true, force: true })
    }
}

// === Main ===
console.log('📦 Compilation des CSV depuis les archives ZIP\n')
console.log(`📂 Dossier source : ${ARCHIVES_DIR}`)

if (!existsSync(ARCHIVES_DIR)) {
    mkdirSync(ARCHIVES_DIR, { recursive: true })
    console.log('   Dossier créé. Déposez vos archives .zip ici.\n')
    process.exit(0)
}

const zipFiles = readdirSync(ARCHIVES_DIR).filter(f => f.toLowerCase().endsWith('.zip'))

if (zipFiles.length === 0) {
    console.log('\n❌ Aucune archive .zip trouvée dans test-archives/')
    console.log('   Déposez vos archives .zip dans ce dossier puis relancez le script.')
    process.exit(1)
}

console.log(`📁 ${zipFiles.length} archive(s) trouvée(s)\n`)

const allLines = []
let totalExtracted = 0
let totalErrors = 0

for (const zipFile of zipFiles) {
    const zipPath = join(ARCHIVES_DIR, zipFile)
    console.log(`🔄 Traitement : ${zipFile}`)

    try {
        const content = extractCsvFromZip(zipPath)
        if (!content) {
            totalErrors++
            continue
        }

        // Normaliser les fins de ligne et extraire les lignes non vides
        const lines = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .trim()
            .split('\n')
            .filter(line => line.trim().length > 0)

        allLines.push(...lines)
        totalExtracted++
        console.log(`   ✅ ${lines.length} ligne(s) extraite(s)`)
    } catch (err) {
        console.error(`   ❌ Erreur : ${err.message}`)
        totalErrors++
    }
}

if (allLines.length === 0) {
    console.log('\n❌ Aucune ligne extraite. Vérifiez le contenu de vos archives.')
    process.exit(1)
}

// Écrire le fichier compilé
writeFileSync(OUTPUT_FILE, allLines.join('\n'), 'utf-8')

console.log('\n' + '='.repeat(50))
console.log(`✅ Compilation terminée !`)
console.log(`   📊 ${totalExtracted} archive(s) traitée(s)`)
console.log(`   📝 ${allLines.length} ligne(s) au total`)
if (totalErrors > 0) console.log(`   ⚠️  ${totalErrors} archive(s) en erreur`)
console.log(`   📄 Fichier compilé : ${OUTPUT_FILE}`)
console.log('\n💡 Uploadez maintenant ce fichier dans le validateur Poliris !')
