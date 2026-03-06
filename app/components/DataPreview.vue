<template>
  <div class="fade-in">
    <div class="filters-bar">
      <span style="font-size: 0.85rem; color: var(--text-muted);">
        {{ dataRows.length }} annonce(s) — {{ columnHeaders.length }} colonnes
      </span>
      <label style="display: flex; align-items: center; gap: 6px; margin-left: auto; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer;">
        <input type="checkbox" v-model="highlightErrors" />
        Surligner les lignes en erreur
      </label>
    </div>

    <div class="table-container" style="max-height: 500px; overflow: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th style="position: sticky; left: 0; z-index: 2; background: var(--bg-surface-elevated);">#</th>
            <th v-for="(header, idx) in visibleHeaders" :key="idx">{{ header }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIdx) in paginatedRows" :key="rowIdx"
              :class="{ 'row-error': highlightErrors && errorRowIndices.has(actualRowIndex(rowIdx)) }">
            <td style="position: sticky; left: 0; z-index: 1; background: var(--bg-surface); font-weight: 600; color: var(--text-muted);">
              {{ actualRowIndex(rowIdx) }}
            </td>
            <td v-for="(cell, colIdx) in row" :key="colIdx" :title="cell"
                :class="{ 'cell-space-warning': colIdx === 0 && hasLeadingTrailingSpaces(cell) }">
              <template v-if="colIdx === 0 && hasLeadingTrailingSpaces(cell)">
                <span class="space-indicator">⚠</span> {{ formatSpaces(cell, 50) }}
              </template>
              <template v-else>
                {{ truncate(cell, 50) }}
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ValidationError } from '~/utils/poliris-schema'

const props = defineProps<{
  dataRows: string[][]
  columnHeaders: string[]
  errors: ValidationError[]
}>()

const ITEMS_PER_PAGE = 50

const currentPage = ref(1)
const highlightErrors = ref(false)

const visibleHeaders = computed(() => props.columnHeaders)

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

function actualRowIndex(paginatedIdx: number): number {
  return (currentPage.value - 1) * ITEMS_PER_PAGE + paginatedIdx + 1
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
  // Rendre les espaces visibles avec le caractère Unicode ␣
  let result = str.replace(/^ +/, (m) => '␣'.repeat(m.length))
  result = result.replace(/ +$/, (m) => '␣'.repeat(m.length))
  return result.length > maxLen ? result.slice(0, maxLen) + '…' : result
}
</script>

<style scoped>
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
</style>
