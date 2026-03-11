<template>
  <div class="fade-in">
    <!-- Toolbar : Search + View Toggle -->
    <div class="filters-bar" id="data-preview-toolbar">
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          class="filter-search search-field"
          v-model="searchQuery"
          placeholder="Rechercher un champ (ex: contact, photo, prix…)"
          id="data-preview-search"
        />
        <button
          v-if="searchQuery"
          class="search-clear"
          @click="searchQuery = ''"
          title="Effacer la recherche"
        >✕</button>
      </div>

      <div class="view-toggle" id="view-toggle">
        <button
          :class="['view-toggle-btn', { active: viewMode === 'table' }]"
          @click="viewMode = 'table'"
          title="Vue tableau"
        >
          <span class="toggle-icon">☰</span> Tableau
        </button>
        <button
          :class="['view-toggle-btn', { active: viewMode === 'card' }]"
          @click="viewMode = 'card'"
          title="Vue fiche"
        >
          <span class="toggle-icon">📋</span> Fiche
        </button>
      </div>
    </div>

    <!-- Search results indicator -->
    <div v-if="searchQuery" class="search-results-info" id="search-results-info">
      <span v-if="filteredColumnIndices.length > 0">
        🎯 <strong>{{ filteredColumnIndices.length }}</strong> champ(s) trouvé(s) sur {{ columnHeaders.length }} pour « <em>{{ searchQuery }}</em> »
      </span>
      <span v-else class="no-results">
        ❌ Aucun champ ne correspond à « <em>{{ searchQuery }}</em> »
      </span>
    </div>

    <!-- Info bar -->
    <div class="filters-bar" style="margin-bottom: 8px;">
      <span style="font-size: 0.85rem; color: var(--text-muted);">
        {{ dataRows.length }} annonce(s) — {{ columnHeaders.length }} colonnes
      </span>
      <label style="display: flex; align-items: center; gap: 6px; margin-left: auto; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer;">
        <input type="checkbox" v-model="highlightErrors" />
        Surligner les lignes en erreur
      </label>
    </div>

    <!-- ========== MODE TABLEAU ========== -->
    <template v-if="viewMode === 'table'">
      <div class="table-container" style="max-height: 500px; overflow: auto;" v-if="filteredColumnIndices.length > 0 || !searchQuery">
        <table class="data-table" id="data-table-view">
          <thead>
            <tr>
              <th style="position: sticky; left: 0; z-index: 2; background: var(--bg-surface-elevated);">#</th>
              <th v-for="colIdx in displayColumnIndices" :key="colIdx">
                <span class="col-rank">{{ colIdx + 1 }}</span> {{ columnHeaders[colIdx] }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIdx) in paginatedRows" :key="rowIdx"
                :class="{ 'row-error': highlightErrors && errorRowIndices.has(actualRowIndex(rowIdx)) }">
              <td style="position: sticky; left: 0; z-index: 1; background: var(--bg-surface); font-weight: 600; color: var(--text-muted);">
                {{ actualRowIndex(rowIdx) }}
              </td>
              <td v-for="colIdx in displayColumnIndices" :key="colIdx" :title="row[colIdx]"
                  :class="{ 'cell-space-warning': colIdx === 0 && hasLeadingTrailingSpaces(row[colIdx]) }">
                <template v-if="colIdx === 0 && hasLeadingTrailingSpaces(row[colIdx])">
                  <span class="space-indicator">⚠</span> {{ formatSpaces(row[colIdx], 50) }}
                </template>
                <template v-else>
                  {{ truncate(row[colIdx], 50) }}
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button :disabled="currentPage <= 1" @click="currentPage = 1">⟪</button>
        <button :disabled="currentPage <= 1" @click="currentPage--">◀</button>
        <span class="page-info">Page {{ currentPage }} / {{ totalPages }}</span>
        <button :disabled="currentPage >= totalPages" @click="currentPage++">▶</button>
        <button :disabled="currentPage >= totalPages" @click="currentPage = totalPages">⟫</button>
      </div>
    </template>

    <!-- ========== MODE FICHE ========== -->
    <template v-if="viewMode === 'card'">
      <!-- Navigation annonce -->
      <div class="annonce-nav" id="annonce-navigation">
        <button class="btn btn-sm btn-secondary" :disabled="cardIndex <= 0" @click="cardIndex = 0">⟪</button>
        <button class="btn btn-sm btn-secondary" :disabled="cardIndex <= 0" @click="cardIndex--">◀</button>
        <span class="annonce-nav-info">
          Annonce <strong>{{ cardIndex + 1 }}</strong> / {{ dataRows.length }}
          <template v-if="currentRowRef"> — Réf. <strong>{{ currentRowRef }}</strong></template>
        </span>
        <button class="btn btn-sm btn-secondary" :disabled="cardIndex >= dataRows.length - 1" @click="cardIndex++">▶</button>
        <button class="btn btn-sm btn-secondary" :disabled="cardIndex >= dataRows.length - 1" @click="cardIndex = dataRows.length - 1">⟫</button>
      </div>

      <!-- Fiche détail -->
      <div class="card-view-container" id="card-detail-view" v-if="dataRows.length > 0">
        <div class="field-list">
          <div
            v-for="colIdx in displayColumnIndices"
            :key="colIdx"
            :class="[
              'field-card',
              {
                'field-empty': !currentRow[colIdx],
                'field-error': highlightErrors && fieldHasError(cardIndex + 1, colIdx + 1)
              }
            ]"
          >
            <div class="field-rank">{{ colIdx + 1 }}</div>
            <div class="field-name">{{ columnHeaders[colIdx] }}</div>
            <div class="field-value" :title="currentRow[colIdx]">
              <template v-if="currentRow[colIdx]">
                {{ currentRow[colIdx] }}
              </template>
              <span v-else class="field-empty-label">(vide)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Indicateur erreurs -->
      <div v-if="highlightErrors && cardFieldErrors.length > 0" class="card-error-summary">
        ⚠️ <strong>{{ cardFieldErrors.length }}</strong> erreur(s) sur cette annonce
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ValidationError } from '~/utils/poliris-schema'

const props = defineProps<{
  dataRows: string[][]
  columnHeaders: string[]
  errors: ValidationError[]
}>()

const ITEMS_PER_PAGE = 50

// --- State ---
const currentPage = ref(1)
const highlightErrors = ref(false)
const searchQuery = ref('')
const viewMode = ref<'table' | 'card'>('table')
const cardIndex = ref(0)

// --- Computed : filtrage colonnes ---
const filteredColumnIndices = computed(() => {
  if (!searchQuery.value.trim()) return []
  const q = searchQuery.value.toLowerCase().trim()
  const indices: number[] = []
  for (let i = 0; i < props.columnHeaders.length; i++) {
    const header = props.columnHeaders[i] || ''
    const rankStr = String(i + 1)
    if (header.toLowerCase().includes(q) || rankStr === q) {
      indices.push(i)
    }
  }
  return indices
})

const displayColumnIndices = computed(() => {
  if (searchQuery.value.trim() && filteredColumnIndices.value.length > 0) {
    return filteredColumnIndices.value
  }
  // Si pas de recherche, afficher toutes les colonnes
  return props.columnHeaders.map((_, i) => i)
})

// --- Computed : tableau ---
const totalPages = computed(() => Math.ceil(props.dataRows.length / ITEMS_PER_PAGE))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return props.dataRows.slice(start, start + ITEMS_PER_PAGE)
})

const errorRowIndices = computed(() => {
  const indices = new Set<number>()
  for (const err of props.errors) {
    if (err.ligne > 0) indices.add(err.ligne)
  }
  return indices
})

// --- Computed : fiche ---
const currentRow = computed(() => {
  return props.dataRows[cardIndex.value] || []
})

const currentRowRef = computed(() => {
  const row = currentRow.value
  // Colonne 2 (index 1) = Référence agence du bien
  return row[1] || ''
})

const cardFieldErrors = computed(() => {
  const ligne = cardIndex.value + 1
  return props.errors.filter(e => e.ligne === ligne)
})

// Index des erreurs par (ligne, rang) pour lookup rapide
const errorIndex = computed(() => {
  const idx = new Set<string>()
  for (const err of props.errors) {
    if (err.ligne > 0 && typeof err.rang === 'number') {
      idx.add(`${err.ligne}-${err.rang}`)
    }
  }
  return idx
})

// --- Méthodes ---
function actualRowIndex(paginatedIdx: number): number {
  return (currentPage.value - 1) * ITEMS_PER_PAGE + paginatedIdx + 1
}

function fieldHasError(ligne: number, rang: number): boolean {
  return errorIndex.value.has(`${ligne}-${rang}`)
}

function truncate(str: string, maxLen: number): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

function hasLeadingTrailingSpaces(str: string): boolean {
  if (!str) return false
  return str !== str.trim()
}

function formatSpaces(str: string, maxLen: number): string {
  if (!str) return ''
  let result = str.replace(/^ +/, (m) => '␣'.repeat(m.length))
  result = result.replace(/ +$/, (m) => '␣'.repeat(m.length))
  return result.length > maxLen ? result.slice(0, maxLen) + '…' : result
}

// Reset page quand la recherche change
watch(searchQuery, () => {
  currentPage.value = 1
})

// Reset card index si on change de vue ou si les données changent
watch(() => props.dataRows, () => {
  cardIndex.value = 0
  currentPage.value = 1
})
</script>

<style scoped>
/* Search wrapper */
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 250px;
}

.search-icon {
  position: absolute;
  left: 14px;
  font-size: 0.9rem;
  pointer-events: none;
  z-index: 1;
}

.search-field {
  padding-left: 38px !important;
  padding-right: 36px !important;
  width: 100%;
}

.search-clear {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1rem;
  padding: 4px 6px;
  border-radius: 50%;
  line-height: 1;
  transition: all var(--transition-fast);
}

.search-clear:hover {
  color: var(--color-critique);
  background: var(--color-critique-bg);
}

/* Search results info */
.search-results-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
  padding: 8px 14px;
  background: var(--bg-surface-elevated);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  border-left: 3px solid var(--color-primary);
}

.search-results-info .no-results {
  color: var(--color-critique);
}

/* View toggle */
.view-toggle {
  display: flex;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  overflow: hidden;
  flex-shrink: 0;
}

.view-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: var(--bg-surface);
  border: none;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.view-toggle-btn:first-child {
  border-right: 1px solid var(--border-color);
}

.view-toggle-btn:hover:not(.active) {
  background: var(--bg-surface-hover);
  color: var(--color-primary);
}

.view-toggle-btn.active {
  background: var(--color-primary);
  color: #fff;
}

.view-toggle-btn .toggle-icon {
  font-size: 0.9rem;
}

/* Column rank badge in table header */
.col-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 18px;
  padding: 0 5px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 9px;
  font-size: 0.65rem;
  font-weight: 700;
  margin-right: 4px;
  vertical-align: middle;
}

/* Annonce navigation */
.annonce-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 0;
  margin-bottom: 12px;
}

.annonce-nav-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
  padding: 0 12px;
  min-width: 200px;
  text-align: center;
}

/* Field list (fiche) */
.card-view-container {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  max-height: 600px;
  overflow-y: auto;
}

.field-list {
  display: flex;
  flex-direction: column;
}

.field-card {
  display: grid;
  grid-template-columns: 55px 250px 1fr;
  align-items: stretch;
  border-bottom: 1px solid var(--border-color);
  transition: background var(--transition-fast);
  min-height: 38px;
}

.field-card:last-child {
  border-bottom: none;
}

.field-card:hover {
  background: var(--table-row-hover);
}

.field-card:nth-child(even) {
  background: var(--table-row-even);
}

.field-card:nth-child(even):hover {
  background: var(--table-row-hover);
}

.field-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg-surface-elevated);
  border-right: 1px solid var(--border-color);
  font-variant-numeric: tabular-nums;
}

.field-name {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  border-right: 1px solid var(--border-color);
  word-break: break-word;
}

.field-value {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  font-size: 0.84rem;
  color: var(--text-primary);
  word-break: break-all;
}

/* Field states */
.field-empty .field-name {
  color: var(--text-muted);
}

.field-empty .field-value {
  color: var(--text-muted);
}

.field-empty-label {
  font-style: italic;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.field-error {
  background: var(--color-critique-bg) !important;
  border-left: 3px solid var(--color-critique);
}

.field-error .field-rank {
  color: var(--color-critique);
  background: rgba(239, 68, 68, 0.1);
}

.field-error .field-name {
  color: var(--color-critique);
}

/* Card error summary */
.card-error-summary {
  margin-top: 12px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: var(--color-warning-bg);
  border: 1px solid var(--color-warning-border);
  color: var(--color-warning);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}

/* Existing scoped styles */
.cell-space-warning {
  background: rgba(239, 68, 68, 0.15) !important;
  border: 1px solid rgba(239, 68, 68, 0.4) !important;
  color: #ef4444;
  font-weight: 600;
}

.space-indicator {
  color: #ef4444;
  font-weight: bold;
  margin-right: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .search-wrapper {
    min-width: 100%;
  }

  .view-toggle {
    width: 100%;
  }

  .view-toggle-btn {
    flex: 1;
    justify-content: center;
  }

  .field-card {
    grid-template-columns: 45px 1fr;
  }

  .field-name {
    border-right: none;
    font-size: 0.78rem;
  }

  .field-value {
    grid-column: 1 / -1;
    padding-left: 45px;
    border-top: 1px dashed var(--border-color);
  }

  .annonce-nav {
    flex-wrap: wrap;
  }
}
</style>
