<template>
  <div class="fade-in">
    <!-- Stat Cards -->
    <div class="dashboard-grid">
      <div class="stat-card total">
        <div class="stat-number">{{ totalLines }}</div>
        <div class="stat-label">Lignes analysées</div>
      </div>
      <div class="stat-card" :class="detectedColumns === 334 ? 'success' : 'total'">
        <div class="stat-number">{{ detectedColumns }} <span style="font-size: 0.5em; opacity: 0.6;">/ 334</span></div>
        <div class="stat-label">{{ detectedColumns === 334 ? 'Tous les champs ✨' : 'Champs renseignés' }}</div>
      </div>
      <div class="stat-card" :class="totalErrors === 0 ? 'success' : 'critique'">
        <div class="stat-number">{{ totalErrors }}</div>
        <div class="stat-label">{{ totalErrors === 0 ? 'Aucune erreur ✨' : 'Erreurs totales' }}</div>
      </div>
      <div class="stat-card critique">
        <div class="stat-number">{{ criticalCount }}</div>
        <div class="stat-label">Critiques</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-number">{{ warningCount }}</div>
        <div class="stat-label">Warnings</div>
      </div>
      <div class="stat-card info">
        <div class="stat-number">{{ infoCount }}</div>
        <div class="stat-label">Infos</div>
      </div>
    </div>

    <!-- Category breakdown -->
    <div v-if="totalErrors > 0" class="card" style="margin-top: 8px;">
      <div class="card-header">
        <span class="icon">📊</span>
        <h2>Répartition par catégorie</h2>
      </div>
      <div class="category-bars">
        <div v-for="cat in categoryBreakdown" :key="cat.name" class="category-bar-row">
          <span class="category-bar-label">{{ cat.name }}</span>
          <div class="category-bar-track">
            <div
              class="category-bar-fill"
              :style="{ width: `${(cat.count / maxCategoryCount) * 100}%`, background: severityGradient(cat.dominantSeverity) }"
            ></div>
          </div>
          <span class="category-bar-count" :style="{ color: severityColor(cat.dominantSeverity) }">{{ cat.count }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ValidationError } from '~/utils/poliris-schema'

const props = defineProps<{
  errors: ValidationError[]
  totalLines: number
  detectedColumns: number
}>()

const totalErrors = computed(() => props.errors.length)
const criticalCount = computed(() => props.errors.filter(e => e.severity === 'critique').length)
const warningCount = computed(() => props.errors.filter(e => e.severity === 'warning').length)
const infoCount = computed(() => props.errors.filter(e => e.severity === 'info').length)

const severityPriority: Record<string, number> = { critique: 3, warning: 2, info: 1 }

const categoryBreakdown = computed(() => {
  const counts: Record<string, number> = {}
  const severities: Record<string, Record<string, number>> = {}
  for (const e of props.errors) {
    counts[e.category] = (counts[e.category] || 0) + 1
    if (!severities[e.category]) severities[e.category] = {}
    severities[e.category][e.severity] = (severities[e.category][e.severity] || 0) + 1
  }
  return Object.entries(counts)
    .map(([name, count]) => {
      // Sévérité dominante = la plus haute priorité présente dans cette catégorie
      const sevCounts = severities[name] || {}
      let dominantSeverity = 'info'
      let maxPriority = 0
      for (const [sev] of Object.entries(sevCounts)) {
        const p = severityPriority[sev] || 0
        if (p > maxPriority) { maxPriority = p; dominantSeverity = sev }
      }
      return { name, count, dominantSeverity }
    })
    .sort((a, b) => b.count - a.count)
})

const maxCategoryCount = computed(() => {
  if (categoryBreakdown.value.length === 0) return 1
  return categoryBreakdown.value[0].count
})

function severityGradient(severity: string): string {
  if (severity === 'critique') return 'linear-gradient(90deg, #ef4444, #f87171)'
  if (severity === 'warning') return 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  return 'linear-gradient(90deg, #3b82f6, #60a5fa)'
}

function severityColor(severity: string): string {
  if (severity === 'critique') return '#ef4444'
  if (severity === 'warning') return '#f59e0b'
  return '#3b82f6'
}
</script>
