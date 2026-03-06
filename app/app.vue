<template>
  <div>
    <div class="app-container">
      <!-- Header — Style Figaro Immo Pro -->
      <header class="app-header">
        <h1>
          <span class="logo-main">Validateur</span>
          <span class="logo-sub">Poliris</span>
          <span class="version">v2.0.0</span>
        </h1>
        <div class="header-actions">
          <button class="theme-toggle" @click="toggleTheme" :title="isDark ? 'Mode clair' : 'Mode sombre'">
            <span class="toggle-icon">{{ isDark ? '☀️' : '🌙' }}</span>
            {{ isDark ? 'Clair' : 'Sombre' }}
          </button>
        </div>
      </header>

      <!-- Main content -->
      <NuxtPage />

      <!-- Footer -->
      <footer class="app-footer">
        <strong>Validateur Poliris</strong> v2.0.0 — Figaro Classifieds
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isDark = ref(false)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') {
    isDark.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})
</script>
