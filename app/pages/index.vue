<template>
  <div>
    <!-- Section 1 : Upload -->
    <div class="card slide-up">
      <div class="card-header">
        <span class="icon">📁</span>
        <h2>1. Chargez votre fichier d'annonces</h2>
      </div>
      <FileUpload @file-loaded="onFileLoaded" />
    </div>

    <!-- Progress -->
    <div v-if="isValidating" class="progress-container slide-up">
      <div class="progress-bar-track">
        <div class="progress-bar-fill" :style="{ width: '100%' }"></div>
      </div>
      <p class="progress-text">Validation en cours…</p>
    </div>

    <!-- Encoding info -->
    <div v-if="detectedEncoding && !isValidating" class="alert alert-info fade-in">
      📋 Fichier lu avec l'encodage : <strong>{{ detectedEncoding }}</strong>
      — {{ totalLines }} ligne(s) analysée(s)
    </div>

    <!-- Alerte identifiants agences multiples -->
    <div v-if="uniqueAgencyIds.length > 1 && !isValidating" class="alert alert-warning fade-in" id="multi-agency-alert">
      <div class="alert-warning-header">
        ⚠️ <strong>Attention : {{ uniqueAgencyIds.length }} identifiants agence différents détectés</strong>
      </div>
      <div class="alert-warning-ids">
        <span v-for="id in uniqueAgencyIds" :key="id" class="agency-id-badge">{{ id }}</span>
      </div>
      <div class="alert-warning-hint">
        Si ce fichier ne concerne qu'une seule agence, vérifiez qu'il n'y a pas d'erreur de saisie dans l'identifiant.
      </div>
    </div>


    <!-- Section 2 : Dashboard -->
    <div v-if="validationDone" class="card slide-up">
      <div class="card-header">
        <span class="icon">📊</span>
        <h2>2. Synthèse de la validation</h2>
      </div>
      <ErrorDashboard :errors="errors" :total-lines="totalLines" :detected-columns="detectedColumns" />
    </div>

    <!-- Section 3 : Export -->
    <div v-if="validationDone" class="card slide-up">
      <div class="card-header">
        <span class="icon">📥</span>
        <h2>3. Exports</h2>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" @click="downloadExcel">
          📊 Télécharger les données Excel
        </button>
        <button v-if="errors.length > 0" class="btn btn-secondary" @click="downloadReport">
          📋 Télécharger le rapport d'erreurs
        </button>
      </div>
    </div>

    <!-- Section 4 : Error Table -->
    <div v-if="validationDone && errors.length > 0" class="card slide-up">
      <div class="card-header">
        <span class="icon">🚨</span>
        <h2>4. Détail des erreurs</h2>
        <span class="badge critique">{{ errors.length }} erreur(s)</span>
      </div>
      <ErrorTable :errors="errors" />
    </div>

    <!-- Success message -->
    <div v-if="validationDone && errors.length === 0" class="card slide-up">
      <div class="success-message">
        <span class="success-icon">🎉</span>
        <h3>Félicitations !</h3>
        <p>Aucune erreur détectée dans votre fichier.</p>
      </div>
    </div>

    <!-- Section 5 : Data Preview -->
    <div v-if="validationDone && dataRows.length > 0" class="card slide-up">
      <div class="card-header">
        <span class="icon">👁️</span>
        <h2>5. Visualisation des données</h2>
        <span class="badge info">{{ dataRows.length }} annonce(s)</span>
      </div>
      <DataPreview :data-rows="dataRows" :column-headers="columnHeaders" :errors="errors" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { validateFile } from '~/utils/validator'
import { exportToExcel, exportErrorReport, downloadBlob } from '~/utils/export'
import type { ValidationError } from '~/utils/poliris-schema'

// SEO
useHead({
  title: 'Validateur Poliris — Validation de fichiers CSV immobiliers',
  meta: [
    { name: 'description', content: 'Outil de validation de fichiers CSV au format Poliris pour les annonces immobilières. Détecte les erreurs de structure, format et contenu.' }
  ]
})

// State
const isValidating = ref(false)
const validationDone = ref(false)
const detectedEncoding = ref('')
const totalLines = ref(0)
const detectedColumns = ref(334)
const errors = ref<ValidationError[]>([])
const dataRows = ref<string[][]>([])
const columnHeaders = ref<string[]>([])
const uniqueAgencyIds = ref<string[]>([])

async function onFileLoaded(content: string, encoding: string, _fileName: string, _fileSize: string) {
  isValidating.value = true
  validationDone.value = false
  detectedEncoding.value = encoding

  // Laisser le UI se mettre à jour
  await new Promise(resolve => setTimeout(resolve, 100))

  const result = validateFile(content)

  errors.value = result.errors
  dataRows.value = result.dataRows
  columnHeaders.value = result.columnHeaders
  totalLines.value = result.totalLines
  detectedColumns.value = result.detectedColumns
  uniqueAgencyIds.value = result.uniqueAgencyIds

  isValidating.value = false
  validationDone.value = true
}

function downloadExcel() {
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const blob = exportToExcel(dataRows.value, columnHeaders.value)
  downloadBlob(blob, `donnees_validees_${ts}.xlsx`)
}

function downloadReport() {
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const blob = exportErrorReport(errors.value)
  downloadBlob(blob, `rapport_erreurs_${ts}.xlsx`)
}
</script>
