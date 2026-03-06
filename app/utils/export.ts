import * as XLSX from 'xlsx'
import type { ValidationError } from './poliris-schema'

/**
 * Exporte les données validées en fichier Excel (.xlsx)
 */
export function exportToExcel(dataRows: string[][], columnHeaders: string[]): Blob {
    const ws = XLSX.utils.aoa_to_sheet([columnHeaders, ...dataRows])

    // Ajuster la largeur des colonnes
    ws['!cols'] = columnHeaders.map(header => ({
        wch: Math.min(header.length + 2, 50)
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Données Validées')

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.xml' })
}

/**
 * Exporte le rapport d'erreurs en fichier Excel (.xlsx)
 */
export function exportErrorReport(errors: ValidationError[]): Blob {
    const headers = ['Ligne', 'Référence Annonce', 'Rang', 'Champ', 'Sévérité', 'Catégorie', 'Message', 'Valeur']
    const rows = errors.map(e => [
        e.ligne,
        e.referenceAnnonce,
        e.rang,
        e.champ,
        e.severity === 'critique' ? '🔴 Critique' : e.severity === 'warning' ? '🟠 Warning' : '🔵 Info',
        e.category,
        e.message,
        e.valeur,
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    ws['!cols'] = [
        { wch: 8 },   // Ligne
        { wch: 20 },  // Référence
        { wch: 8 },   // Rang
        { wch: 25 },  // Champ
        { wch: 14 },  // Sévérité
        { wch: 18 },  // Catégorie
        { wch: 60 },  // Message
        { wch: 30 },  // Valeur
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Rapport d'Erreurs")

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.xml' })
}

/**
 * Déclenche le téléchargement d'un blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
