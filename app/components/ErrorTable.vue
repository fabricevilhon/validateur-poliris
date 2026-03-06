<template>
  <div class="fade-in">
    <!-- Filters -->
    <div class="filters-bar">
      <select v-model="filterSeverity" class="filter-select">
        <option value="">Toutes les sévérités</option>
        <option value="critique">🔴 Critique</option>
        <option value="warning">🟠 Warning</option>
        <option value="info">🔵 Info</option>
      </select>

      <select v-model="filterCategory" class="filter-select">
        <option value="">Toutes les catégories</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>

      <input
        v-model="searchQuery"
        type="text"
        class="filter-search"
        placeholder="🔍 Rechercher dans les erreurs..."
      />

      <span style="margin-left: auto; font-size: 0.85rem; color: var(--text-muted);">
        {{ filteredErrors.length }} erreur(s) affichée(s) sur {{ errors.length }}
      </span>
    </div>

    <!-- Table -->
    <div class="table-container" style="max-height: 500px; overflow-y: auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th @click="toggleSort('ligne')" :class="sortClasses('ligne')">Ligne</th>
            <th @click="toggleSort('referenceAnnonce')" :class="sortClasses('referenceAnnonce')">Référence</th>
            <th @click="toggleSort('rang')" :class="sortClasses('rang')">Rang</th>
            <th @click="toggleSort('champ')" :class="sortClasses('champ')">Champ</th>
            <th @click="toggleSort('severity')" :class="sortClasses('severity')">Sévérité</th>
            <th @click="toggleSort('category')" :class="sortClasses('category')">Catégorie</th>
            <th @click="toggleSort('message')" :class="sortClasses('message')">Message</th>
            <th>Valeur</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(error, idx) in paginatedErrors" :key="idx">
            <td>{{ error.ligne }}</td>
            <td>{{ error.referenceAnnonce }}</td>
            <td>{{ error.rang }}</td>
            <td>{{ error.champ }}</td>
            <td>
              <span class="badge" :class="error.severity">
                {{ error.severity === 'critique' ? '🔴' : error.severity === 'warning' ? '🟠' : '🔵' }}
                {{ error.severity }}
              </span>
            </td>
            <td>{{ error.category }}</td>
            <td :title="error.message" style="max-width: 400px;">{{ error.message }}</td>
            <td :title="error.valeur">{{ truncate(error.valeur, 40) }}</td>
          </tr>
          <tr v-if="paginatedErrors.length === 0">
            <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">
              Aucune erreur correspondant aux filtres.
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
import { ref, computed, watch } from 'vue'
import type { ValidationError } from '~/utils/poliris-schema'

const props = defineProps<{
  errors: ValidationError[]
}>()

const ITEMS_PER_PAGE = 50

const filterSeverity = ref('')
const filterCategory = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const sortField = ref<string>('')
const sortDirection = ref<'asc' | 'desc'>('asc')

const categories = computed(() => {
  const cats = new Set(props.errors.map(e => e.category))
  return [...cats].sort()
})

const filteredErrors = computed(() => {
  let result = props.errors

  if (filterSeverity.value) {
    result = result.filter(e => e.severity === filterSeverity.value)
  }
  if (filterCategory.value) {
    result = result.filter(e => e.category === filterCategory.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(e =>
      e.message.toLowerCase().includes(q) ||
      e.champ.toLowerCase().includes(q) ||
      e.valeur.toLowerCase().includes(q) ||
      e.referenceAnnonce.toLowerCase().includes(q)
    )
  }

  if (sortField.value) {
    result = [...result].sort((a, b) => {
      const aVal = String((a as any)[sortField.value])
      const bVal = String((b as any)[sortField.value])
      const cmp = aVal.localeCompare(bVal, 'fr', { numeric: true })
      return sortDirection.value === 'asc' ? cmp : -cmp
    })
  }

  return result
})

const totalPages = computed(() => Math.ceil(filteredErrors.value.length / ITEMS_PER_PAGE))

const paginatedErrors = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filteredErrors.value.slice(start, start + ITEMS_PER_PAGE)
})

// Reset page number when filters change
watch([filterSeverity, filterCategory, searchQuery], () => {
  currentPage.value = 1
})

function toggleSort(field: string) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

function sortClasses(field: string) {
  if (sortField.value !== field) return ''
  return sortDirection.value === 'asc' ? 'sorted-asc' : 'sorted-desc'
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}
</script>
