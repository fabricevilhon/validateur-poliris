<template>
  <div class="upload-zone"
    :class="{ dragover: isDragging }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
    @click="openFilePicker"
  >
    <span class="upload-icon">📂</span>
    <p class="upload-text">
      Glissez-déposez votre fichier ici ou <strong>cliquez pour sélectionner</strong>
    </p>
    <p class="upload-hint">Formats acceptés : .csv, .txt — Séparateur : !#</p>
    <input
      ref="fileInput"
      type="file"
      accept=".csv,.txt"
      class="upload-input"
      @change="onFileSelect"
    />
  </div>

  <div v-if="fileName" class="file-info fade-in">
    <span>📄</span>
    <span class="file-name">{{ fileName }}</span>
    <span class="file-meta">{{ fileSize }} — {{ encoding }}</span>
    <button class="change-btn" @click.stop="openFilePicker">Changer</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  fileLoaded: [content: string, encoding: string, fileName: string, fileSize: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const fileName = ref('')
const fileSize = ref('')
const encoding = ref('')

function openFilePicker() {
  fileInput.value?.click()
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) processFile(file)
}

function onFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) processFile(file)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1048576).toFixed(1)} Mo`
}

async function processFile(file: File) {
  const buffer = await file.arrayBuffer()

  // Détection d'encodage
  const { tryDecode } = await import('~/utils/validator')
  const result = tryDecode(buffer)

  if (!result) {
    alert('Impossible de lire le fichier. Aucun encodage compatible trouvé (UTF-8, ISO-8859-1, Windows-1252).')
    return
  }

  fileName.value = file.name
  fileSize.value = formatSize(file.size)
  encoding.value = `Encodage : ${result.encoding}`

  emit('fileLoaded', result.content, result.encoding, file.name, formatSize(file.size))
}
</script>
