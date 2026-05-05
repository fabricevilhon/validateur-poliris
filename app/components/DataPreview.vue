<template>
  <div class="fade-in">
    <!-- Toolbar : Column Select + Ref Filter + Counter + View Toggle -->
    <div class="filters-bar" id="data-preview-toolbar">
      <div class="combobox" id="column-select" ref="comboboxRef">
        <div class="combobox-trigger" @click="toggleDropdown">
          <span class="combobox-display">
            <template v-if="selectedColumnIndices.size === 0">🔍 Toutes les colonnes</template>
            <template v-else>
              <span
                v-for="idx in sortedSelectedIndices"
                :key="idx"
                class="column-badge"
              >
                <span class="column-badge-rank">{{ idx + 1 }}</span>
                {{ cleanHeader(columnHeaders[idx]) }}
                <button class="column-badge-remove" @click.stop="toggleColumn(idx)" title="Retirer">✕</button>
              </span>
            </template>
          </span>
          <span class="combobox-arrow">{{ dropdownOpen ? '▲' : '▼' }}</span>
        </div>
        <div v-if="dropdownOpen" class="combobox-dropdown">
          <input
            ref="comboboxInputRef"
            type="text"
            class="combobox-search"
            v-model="columnSearchQuery"
            placeholder="Rechercher un champ…"
            @keydown.escape="closeDropdown"
          />
          <div class="combobox-options">
            <div
              class="combobox-option combobox-option-reset"
              :class="{ 'combobox-option-active': selectedColumnIndices.size === 0 }"
              @click="clearSelection"
            >🔍 Toutes les colonnes</div>
            <div
              v-for="item in filteredColumnOptions"
              :key="item.idx"
              class="combobox-option"
              :class="{ 'combobox-option-active': selectedColumnIndices.has(item.idx) }"
              @click="toggleColumn(item.idx)"
            >
              <input
                type="checkbox"
                class="combobox-checkbox"
                :checked="selectedColumnIndices.has(item.idx)"
                @click.stop
                @change="toggleColumn(item.idx)"
              />
              <span class="combobox-option-rank">{{ item.idx + 1 }}.</span> {{ item.label }}
            </div>
            <div v-if="filteredColumnOptions.length === 0" class="combobox-no-results">
              Aucun champ trouvé
            </div>
          </div>
        </div>
      </div>

      <div class="search-wrapper ref-search-wrapper">
        <span class="search-icon">🏷️</span>
        <input
          type="text"
          class="filter-search search-field"
          v-model="refQuery"
          placeholder="Filtrer par référence agence…"
          id="data-preview-ref-search"
        />
        <button
          v-if="refQuery"
          class="search-clear"
          @click="refQuery = ''"
          title="Effacer le filtre référence"
        >✕</button>
      </div>

      <div class="search-wrapper counter-search-wrapper">
        <span class="search-icon">🔎</span>
        <input
          type="text"
          class="filter-search search-field"
          v-model="counterQuery"
          placeholder="Rechercher une valeur (ex: vente, appartement…)"
          id="data-counter-search"
        />
        <button
          v-if="counterQuery"
          class="search-clear"
          @click="counterQuery = ''"
          title="Effacer"
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

    <!-- Résultat de la recherche avec navigation -->
    <div v-if="counterQuery" class="search-results-info counter-results-info" id="counter-results-info">
      <div class="search-nav-bar">
        <span v-if="searchMatches.length > 0" class="search-nav-label">
          🔎 Résultat <strong>{{ currentMatchIndex + 1 }}</strong> / <strong>{{ searchMatches.length }}</strong>
          <span class="search-nav-detail">
            ({{ counterResult.count }} annonce(s) sur {{ dataRows.length }}
            <template v-if="selectedColumnIndices.size > 0"> dans {{ selectedColumnsLabel }}</template>
            — {{ counterResult.percent }}%)
          </span>
        </span>
        <span v-else class="no-results">
          ❌ Aucun résultat pour « <em>{{ counterQuery }}</em> »
          <template v-if="selectedColumnIndices.size > 0"> dans <strong>{{ selectedColumnsLabel }}</strong></template>
        </span>
        <div v-if="searchMatches.length > 0" class="search-nav-buttons">
          <button class="btn btn-sm btn-secondary search-nav-btn" @click="goToPrevMatch" title="Résultat précédent">▲</button>
          <button class="btn btn-sm btn-secondary search-nav-btn" @click="goToNextMatch" title="Résultat suivant">▼</button>
        </div>
      </div>
    </div>

    <!-- Ref filter results indicator -->
    <div v-if="refQuery" class="search-results-info ref-results-info" id="ref-results-info">
      <span v-if="filteredRows.length > 0">
        🏷️ <strong>{{ filteredRows.length }}</strong> annonce(s) trouvée(s) sur {{ dataRows.length }} pour réf. « <em>{{ refQuery }}</em> »
      </span>
      <span v-else class="no-results">
        ❌ Aucune annonce ne correspond à la référence « <em>{{ refQuery }}</em> »
      </span>
    </div>

    <!-- Info bar -->
    <div class="filters-bar" style="margin-bottom: 8px;">
      <span style="font-size: 0.85rem; color: var(--text-muted);">
        <template v-if="refQuery && filteredRows.length !== dataRows.length">
          {{ filteredRows.length }} / {{ dataRows.length }} annonce(s) — {{ columnHeaders.length }} colonnes
        </template>
        <template v-else>
          {{ dataRows.length }} annonce(s) — {{ columnHeaders.length }} colonnes
        </template>
      </span>
      <label style="display: flex; align-items: center; gap: 6px; margin-left: auto; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer;">
        <input type="checkbox" v-model="highlightErrors" />
        Surligner les lignes en erreur
      </label>
    </div>

    <!-- ========== MODE TABLEAU ========== -->
    <template v-if="viewMode === 'table'">
      <div class="table-container" style="max-height: 500px; overflow: auto;">
        <table class="data-table" id="data-table-view">
          <thead>
            <tr>
              <th style="position: sticky; left: 0; z-index: 2; background: var(--bg-surface-elevated);">#</th>
              <th v-for="colIdx in displayColumnIndices" :key="colIdx">
                <span class="col-rank">{{ colIdx + 1 }}</span> {{ cleanHeader(columnHeaders[colIdx]) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(entry, rowIdx) in paginatedRows" :key="rowIdx"
                :ref="el => setTableRowRef(el as HTMLElement | null, entry.originalIndex)"
                :class="{ 'row-error': highlightErrors && errorRowIndices.has(entry.originalIndex) }">
              <td style="position: sticky; left: 0; z-index: 1; background: var(--bg-surface); font-weight: 600; color: var(--text-muted);">
                {{ entry.originalIndex }}
              </td>
              <td v-for="colIdx in displayColumnIndices" :key="colIdx"
                  :class="cellHighlightClass(entry.originalIndex, colIdx)"
                  :ref="el => setCellRef(el as HTMLElement | null, entry.originalIndex, colIdx)"
                  @mouseenter="colIdx === 19 || colIdx === 20 ? showTooltip($event, entry.row[colIdx]) : null"
                  @mouseleave="hideTooltip">
                <template v-if="colIdx === 0 && hasLeadingTrailingSpaces(entry.row[colIdx])">
                  <span class="space-indicator">⚠</span> {{ formatSpaces(entry.row[colIdx], 50) }}
                </template>
                <template v-else-if="isCellMatch(entry.originalIndex, colIdx)">
                  <span v-html="highlightText(entry.row[colIdx], 50)"></span>
                </template>
                <template v-else>
                  {{ truncate(entry.row[colIdx], 50) }}
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Tooltip Dynamique -->
      <div v-if="tooltip.show" class="dynamic-tooltip" :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }">
        <div class="tooltip-content" v-html="tooltipContent"></div>
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
          Annonce <strong>{{ cardIndex + 1 }}</strong> / {{ filteredRows.length }}
          <template v-if="currentRowRef"> — Réf. <strong>{{ currentRowRef }}</strong></template>
        </span>
        <button class="btn btn-sm btn-secondary" :disabled="cardIndex >= filteredRows.length - 1" @click="cardIndex++">▶</button>
        <button class="btn btn-sm btn-secondary" :disabled="cardIndex >= filteredRows.length - 1" @click="cardIndex = filteredRows.length - 1">⟫</button>
      </div>

      <!-- Fiche détail -->
      <div class="card-view-container" id="card-detail-view" v-if="filteredRows.length > 0">
        <div class="field-list">
          <div
            v-for="colIdx in displayColumnIndices"
            :key="colIdx"
            :ref="el => setCardFieldRef(el as HTMLElement | null, colIdx)"
            :class="[
              'field-card',
              {
                'field-empty': !currentRow[colIdx],
                'field-error': highlightErrors && fieldHasError(colIdx + 1),
                'field-highlight': isCardCellMatch(colIdx),
                'field-highlight-active': isCardCellActiveMatch(colIdx)
              }
            ]"
          >
            <div class="field-rank">{{ colIdx + 1 }}</div>
            <div class="field-name">{{ cleanHeader(columnHeaders[colIdx]) }}</div>
            <div class="field-value" :title="currentRow[colIdx]">
              <template v-if="currentRow[colIdx] && isCardCellMatch(colIdx)">
                <span v-html="highlightCardText(currentRow[colIdx])"></span>
              </template>
              <template v-else-if="currentRow[colIdx]">
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue'
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
const refQuery = ref('')
const viewMode = ref<'table' | 'card'>('table')
const cardIndex = ref(0)
const counterQuery = ref('')
const currentMatchIndex = ref(0)
const selectedColumnIndices = ref<Set<number>>(new Set())
const dropdownOpen = ref(false)
const columnSearchQuery = ref('')
const comboboxRef = ref<HTMLElement | null>(null)
const comboboxInputRef = ref<HTMLInputElement | null>(null)

// --- Tooltip State ---
const tooltip = ref({
  show: false,
  x: 0,
  y: 0
})
const currentHoveredText = ref('')
const tooltipContent = computed(() => highlightCardText(currentHoveredText.value))

// --- Helper : nettoyer le préfixe "N - " des en-têtes CSV ---
function cleanHeader(header: string | undefined): string {
  if (!header) return ''
  return header.replace(/^\d+\s*-\s*/, '')
}

// --- Computed : options filtrées du combobox colonnes ---
const filteredColumnOptions = computed(() => {
  const q = columnSearchQuery.value.toLowerCase().trim()
  const options = props.columnHeaders.map((header, idx) => ({
    idx,
    label: cleanHeader(header)
  }))
  if (!q) return options
  return options.filter(opt => opt.label.toLowerCase().includes(q))
})

// --- Computed : colonnes affichées ---
const displayColumnIndices = computed(() => {
  if (selectedColumnIndices.value.size > 0) {
    return [...selectedColumnIndices.value].sort((a, b) => a - b)
  }
  return props.columnHeaders.map((_, i) => i)
})

// --- Computed : indices sélectionnés triés (pour les badges) ---
const sortedSelectedIndices = computed(() => {
  return [...selectedColumnIndices.value].sort((a, b) => a - b)
})

// --- Computed : label des colonnes sélectionnées (pour le compteur) ---
const selectedColumnsLabel = computed(() => {
  const names = sortedSelectedIndices.value.map(idx => cleanHeader(props.columnHeaders[idx]))
  if (names.length <= 2) return names.join(' et ')
  return names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1]
})

// --- Computed : filtrage par référence (colonne index 1 = rang 2) ---
const filteredRows = computed(() => {
  const entries = props.dataRows.map((row, i) => ({ row, originalIndex: i + 1 }))
  if (!refQuery.value.trim()) return entries
  const q = refQuery.value.toLowerCase().trim()
  return entries.filter(e => {
    const ref = e.row[1] || ''
    return ref.toLowerCase().includes(q)
  })
})

// --- Computed : tableau ---
const totalPages = computed(() => Math.ceil(filteredRows.value.length / ITEMS_PER_PAGE))

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filteredRows.value.slice(start, start + ITEMS_PER_PAGE)
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
  const entry = filteredRows.value[cardIndex.value]
  return entry ? entry.row : []
})

const currentRowRef = computed(() => {
  const row = currentRow.value
  // Colonne 2 (index 1) = Référence agence du bien
  return row[1] || ''
})

const cardFieldErrors = computed(() => {
  const entry = filteredRows.value[cardIndex.value]
  if (!entry) return []
  return props.errors.filter(e => e.ligne === entry.originalIndex)
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

// --- Computed : toutes les correspondances (row, col) ---
interface SearchMatch {
  rowOriginalIndex: number  // index original (1-based) de la ligne
  rowDataIndex: number      // index dans dataRows (0-based)
  colIdx: number            // index de la colonne
}

const searchMatches = computed<SearchMatch[]>(() => {
  if (!counterQuery.value.trim()) return []
  const q = counterQuery.value.toLowerCase().trim()
  const selected = selectedColumnIndices.value
  const matches: SearchMatch[] = []
  const colsToSearch = selected.size > 0
    ? [...selected].sort((a, b) => a - b)
    : props.columnHeaders.map((_, i) => i)

  for (let rowIdx = 0; rowIdx < props.dataRows.length; rowIdx++) {
    const row = props.dataRows[rowIdx]
    if (!row) continue
    for (const colIdx of colsToSearch) {
      const val = row[colIdx] || ''
      if (val.toLowerCase().includes(q)) {
        matches.push({
          rowOriginalIndex: rowIdx + 1,
          rowDataIndex: rowIdx,
          colIdx
        })
      }
    }
  }
  return matches
})

// --- Computed : set rapide des cellules surlignées ---
const matchCellSet = computed(() => {
  const s = new Set<string>()
  for (const m of searchMatches.value) {
    s.add(`${m.rowOriginalIndex}-${m.colIdx}`)
  }
  return s
})

// --- Computed : match actif ---
const activeMatch = computed<SearchMatch | null>(() => {
  if (searchMatches.value.length === 0) return null
  return searchMatches.value[currentMatchIndex.value] || null
})

// --- Computed : compteur de valeurs (lignes uniques) ---
const counterResult = computed(() => {
  if (!counterQuery.value.trim()) return { count: 0, percent: '0' }
  const uniqueRows = new Set<number>()
  for (const m of searchMatches.value) {
    uniqueRows.add(m.rowOriginalIndex)
  }
  const count = uniqueRows.size
  const percent = props.dataRows.length > 0
    ? ((count / props.dataRows.length) * 100).toFixed(1)
    : '0'
  return { count, percent }
})

// --- Refs pour le scroll automatique ---
const tableRowRefs = new Map<number, HTMLElement>()
const tableCellRefs = new Map<string, HTMLElement>()
const cardFieldRefs = new Map<number, HTMLElement>()

function setTableRowRef(el: HTMLElement | null, originalIndex: number) {
  if (el) tableRowRefs.set(originalIndex, el)
  else tableRowRefs.delete(originalIndex)
}

function setCellRef(el: HTMLElement | null, originalIndex: number, colIdx: number) {
  const key = `${originalIndex}-${colIdx}`
  if (el) tableCellRefs.set(key, el)
  else tableCellRefs.delete(key)
}

function setCardFieldRef(el: HTMLElement | null, colIdx: number) {
  if (el) cardFieldRefs.set(colIdx, el)
  else cardFieldRefs.delete(colIdx)
}

// --- Méthodes de vérification de match ---
function isCellMatch(rowOriginalIndex: number, colIdx: number): boolean {
  return matchCellSet.value.has(`${rowOriginalIndex}-${colIdx}`)
}

function cellHighlightClass(rowOriginalIndex: number, colIdx: number): Record<string, boolean> {
  const key = `${rowOriginalIndex}-${colIdx}`
  const isMatch = matchCellSet.value.has(key)
  const isActive = activeMatch.value
    ? activeMatch.value.rowOriginalIndex === rowOriginalIndex && activeMatch.value.colIdx === colIdx
    : false
  return {
    'cell-highlight': isMatch && !isActive,
    'cell-highlight-active': isActive,
    'cell-space-warning': colIdx === 0 && hasLeadingTrailingSpaces(props.dataRows[rowOriginalIndex - 1]?.[colIdx] || '')
  }
}

function isCardCellMatch(colIdx: number): boolean {
  const entry = filteredRows.value[cardIndex.value]
  if (!entry) return false
  return matchCellSet.value.has(`${entry.originalIndex}-${colIdx}`)
}

function isCardCellActiveMatch(colIdx: number): boolean {
  const entry = filteredRows.value[cardIndex.value]
  if (!entry || !activeMatch.value) return false
  return activeMatch.value.rowOriginalIndex === entry.originalIndex && activeMatch.value.colIdx === colIdx
}

// --- Méthodes de surlignage du texte ---
function highlightText(str: string, maxLen: number): string {
  if (!str) return ''
  const truncated = str.length > maxLen ? str.slice(0, maxLen) + '…' : str
  if (!counterQuery.value.trim()) return truncated
  const q = counterQuery.value.trim()
  const regex = new RegExp(`(${escapeRegex(q)})`, 'gi')
  return truncated.replace(regex, '<mark class="search-mark">$1</mark>')
}

function highlightCardText(str: string): string {
  if (!str || !counterQuery.value.trim()) return str || ''
  const q = counterQuery.value.trim()
  const regex = new RegExp(`(${escapeRegex(q)})`, 'gi')
  return str.replace(regex, '<mark class="search-mark">$1</mark>')
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// --- Navigation entre résultats ---
function goToNextMatch() {
  if (searchMatches.value.length === 0) return
  currentMatchIndex.value = (currentMatchIndex.value + 1) % searchMatches.value.length
  navigateToCurrentMatch()
}

function goToPrevMatch() {
  if (searchMatches.value.length === 0) return
  currentMatchIndex.value = (currentMatchIndex.value - 1 + searchMatches.value.length) % searchMatches.value.length
  navigateToCurrentMatch()
}

function navigateToCurrentMatch() {
  const match = activeMatch.value
  if (!match) return

  if (viewMode.value === 'table') {
    // Calculer la page de la ligne cible dans filteredRows
    const targetFilteredIndex = filteredRows.value.findIndex(e => e.originalIndex === match.rowOriginalIndex)
    if (targetFilteredIndex < 0) return
    const targetPage = Math.floor(targetFilteredIndex / ITEMS_PER_PAGE) + 1
    currentPage.value = targetPage

    // Scroll vers la cellule après le rendu
    nextTick(() => {
      const cellKey = `${match.rowOriginalIndex}-${match.colIdx}`
      const cellEl = tableCellRefs.get(cellKey)
      if (cellEl) {
        cellEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      } else {
        const rowEl = tableRowRefs.get(match.rowOriginalIndex)
        if (rowEl) rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  } else {
    // Mode fiche : naviguer vers la bonne annonce
    const targetFilteredIndex = filteredRows.value.findIndex(e => e.originalIndex === match.rowOriginalIndex)
    if (targetFilteredIndex < 0) return
    cardIndex.value = targetFilteredIndex

    // Scroll vers le champ après le rendu
    nextTick(() => {
      const fieldEl = cardFieldRefs.get(match.colIdx)
      if (fieldEl) {
        fieldEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }
}

// --- Méthodes ---
// actualRowIndex n'est plus nécessaire car chaque entry porte son originalIndex

function fieldHasError(rang: number): boolean {
  const entry = filteredRows.value[cardIndex.value]
  if (!entry) return false
  return errorIndex.value.has(`${entry.originalIndex}-${rang}`)
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

// --- Combobox : toggle / select / close ---
function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
  if (dropdownOpen.value) {
    columnSearchQuery.value = ''
    nextTick(() => comboboxInputRef.value?.focus())
  }
}

function toggleColumn(idx: number) {
  const newSet = new Set(selectedColumnIndices.value)
  if (newSet.has(idx)) {
    newSet.delete(idx)
  } else {
    newSet.add(idx)
  }
  selectedColumnIndices.value = newSet
}

function clearSelection() {
  selectedColumnIndices.value = new Set()
  columnSearchQuery.value = ''
}

function closeDropdown() {
  dropdownOpen.value = false
  columnSearchQuery.value = ''
}

// --- Tooltip Handlers ---
function showTooltip(event: MouseEvent, text: string) {
  if (!text) return
  
  currentHoveredText.value = text
  
  // Position initiale (décalée du curseur pour éviter les conflits)
  tooltip.value = {
    ...tooltip.value,
    show: true,
    x: event.clientX + 20,
    y: event.clientY + 20
  }
  
  // Ajustement fin après rendu
  nextTick(() => {
    const el = document.querySelector('.dynamic-tooltip') as HTMLElement
    if (el) {
      const rect = el.getBoundingClientRect()
      const winW = window.innerWidth
      const winH = window.innerHeight
      
      let newX = event.clientX + 20
      let newY = event.clientY + 20
      
      // Ajustement horizontal (ne pas sortir à droite)
      if (newX + rect.width > winW - 20) {
        newX = winW - rect.width - 20
      }
      
      // Ajustement vertical : si ça dépasse en bas, on tente de l'afficher AU-DESSUS du curseur
      if (newY + rect.height > winH - 20) {
        newY = event.clientY - rect.height - 20
      }
      
      // Sécurité ultime : si après inversion ça dépasse en haut, on cale à 10px 
      // mais on s'assure que newX est décalé pour ne pas être sous le curseur si possible
      if (newY < 10) {
        newY = 10
        // Si la bulle est calée en haut et que le curseur est dans la zone, on décale à gauche
        if (event.clientY < rect.height + 20) {
           newX = event.clientX - rect.width - 20
        }
      }

      tooltip.value.x = Math.max(10, newX)
      tooltip.value.y = Math.max(10, newY)
    }
  })
}

function hideTooltip() {
  tooltip.value.show = false
}

function onClickOutside(e: MouseEvent) {
  if (comboboxRef.value && !comboboxRef.value.contains(e.target as Node)) {
    closeDropdown()
  }
}

// Reset page quand les colonnes sélectionnées changent
watch(selectedColumnIndices, () => {
  currentPage.value = 1
  currentMatchIndex.value = 0
}, { deep: true })

// Reset page et card quand le filtre référence change
watch(refQuery, () => {
  currentPage.value = 1
  cardIndex.value = 0
  currentMatchIndex.value = 0
})

// Reset match index quand la requête change et naviguer vers le premier résultat
watch(counterQuery, () => {
  currentMatchIndex.value = 0
  nextTick(() => {
    if (searchMatches.value.length > 0) {
      navigateToCurrentMatch()
    }
  })
})

// Reset card index si on change de vue ou si les données changent
watch(() => props.dataRows, () => {
  cardIndex.value = 0
  currentPage.value = 1
})

// --- Lifecycle : click outside listener ---
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
/* Combobox */
.combobox {
  position: relative;
  min-width: 220px;
  max-width: 480px;
  flex-shrink: 0;
}

.combobox-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color var(--transition-fast);
  overflow: hidden;
  flex-wrap: wrap;
  min-height: 38px;
}

.combobox-trigger:hover {
  border-color: var(--color-primary);
}

.combobox-display {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  overflow: hidden;
  flex: 1;
  align-items: center;
}

.combobox-arrow {
  font-size: 0.65rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.combobox-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 340px;
  max-height: 360px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: combobox-fade-in 0.15s ease;
}

@keyframes combobox-fade-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.combobox-search {
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid var(--border-color);
  font-family: inherit;
  font-size: 0.84rem;
  color: var(--text-primary);
  background: var(--bg-surface-elevated);
  outline: none;
}

.combobox-search::placeholder {
  color: var(--text-muted);
}

.combobox-options {
  overflow-y: auto;
  max-height: 300px;
}

.combobox-option {
  padding: 8px 12px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background var(--transition-fast);
  color: var(--text-primary);
}

.combobox-option:hover {
  background: var(--bg-surface-hover, rgba(0, 0, 0, 0.04));
}

.combobox-option-active {
  background: rgba(var(--color-primary-rgb, 232, 119, 34), 0.1);
  font-weight: 600;
  color: var(--color-primary);
}

.combobox-checkbox {
  margin-right: 8px;
  accent-color: var(--color-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.combobox-option-rank {
  display: inline-block;
  min-width: 28px;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.75rem;
}

/* Column badges */
.column-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(var(--color-primary-rgb, 232, 119, 34), 0.12);
  border: 1px solid rgba(var(--color-primary-rgb, 232, 119, 34), 0.3);
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
  line-height: 1.4;
}

.column-badge-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 16px;
  padding: 0 3px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 700;
}

.column-badge-remove {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.7rem;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.column-badge-remove:hover {
  opacity: 1;
}

.combobox-no-results {
  padding: 14px 12px;
  text-align: center;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-style: italic;
}

/* Search wrapper */
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 180px;
}

.ref-search-wrapper {
  flex: 0 1 240px;
  min-width: 160px;
}

.ref-results-info {
  border-left-color: var(--color-info);
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

/* Counter search */
.counter-search-wrapper {
  flex: 1;
  min-width: 180px;
}

.counter-results-info {
  border-left-color: #e8a820;
  background: linear-gradient(90deg, rgba(232, 168, 32, 0.08), var(--bg-surface-elevated));
}

/* Search navigation bar */
.search-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.search-nav-label {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.search-nav-detail {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 400;
}

.search-nav-buttons {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.search-nav-btn {
  padding: 4px 10px !important;
  font-size: 0.75rem !important;
  min-width: 32px;
  justify-content: center;
}

/* Cell highlight (match) */
.cell-highlight {
  background: rgba(255, 235, 59, 0.35) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 193, 7, 0.5);
}

.cell-highlight-active {
  background: rgba(255, 152, 0, 0.45) !important;
  box-shadow: inset 0 0 0 2px rgba(255, 152, 0, 0.8);
  animation: pulse-highlight 1s ease-in-out;
}

@keyframes pulse-highlight {
  0% { box-shadow: inset 0 0 0 2px rgba(255, 152, 0, 0.8), 0 0 0 0 rgba(255, 152, 0, 0.4); }
  50% { box-shadow: inset 0 0 0 2px rgba(255, 152, 0, 0.8), 0 0 8px 4px rgba(255, 152, 0, 0.2); }
  100% { box-shadow: inset 0 0 0 2px rgba(255, 152, 0, 0.8), 0 0 0 0 rgba(255, 152, 0, 0); }
}

/* Search mark inside text */
:deep(.search-mark) {
  background: rgba(255, 235, 59, 0.6);
  color: inherit;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 700;
}

/* Field highlight in card view */
.field-highlight {
  background: rgba(255, 235, 59, 0.15) !important;
  border-left: 3px solid #ffc107;
}

.field-highlight-active {
  background: rgba(255, 152, 0, 0.2) !important;
  border-left: 3px solid #ff9800;
  animation: pulse-field 1s ease-in-out;
}

@keyframes pulse-field {
  0% { box-shadow: inset 0 0 0 0 rgba(255, 152, 0, 0.3); }
  50% { box-shadow: inset 0 0 12px 0 rgba(255, 152, 0, 0.15); }
  100% { box-shadow: inset 0 0 0 0 rgba(255, 152, 0, 0); }
}

.field-highlight .field-rank,
.field-highlight-active .field-rank {
  color: #e8a820;
  background: rgba(255, 193, 7, 0.1);
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

  .ref-search-wrapper {
    flex: 1 1 100%;
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

/* Tooltip Dynamique */
</style>

<style>
/* Styles globaux pour l'info-bulle (pour v-html) */
.dynamic-tooltip {
  position: fixed;
  z-index: 9999;
  background: #ffffff;
  border: 1px solid #f26522;
  border-left: 8px solid #f26522;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  padding: 20px 30px;
  width: auto;
  min-width: 400px;
  max-width: 1100px; /* Plus large pour un aspect horizontal */
  max-height: 65vh;   /* Un peu moins haut pour éviter de déborder */
  overflow-y: auto;
  pointer-events: none;
  animation: tooltip-fade-in 0.1s ease-out;
}

[data-theme="dark"] .dynamic-tooltip {
  background: #242424;
  border-color: #f26522;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.6);
}

.tooltip-content {
  font-family: 'Montserrat', sans-serif;
  font-size: 0.98rem; /* Légèrement plus grand pour la lisibilité */
  color: #1a1a1a;
  line-height: 1.7;
  white-space: break-spaces;
  word-break: break-word;
  overflow-wrap: break-word;
}

[data-theme="dark"] .tooltip-content {
  color: #e8e8e8;
}

.tooltip-content mark,
.tooltip-content .search-mark {
  background-color: #ffeb3b !important;
  color: #000000 !important;
  box-shadow: 0 0 0 2px #f26522;
  font-weight: 800 !important;
  padding: 1px 3px;
  border-radius: 3px;
  display: inline;
}
</style>
