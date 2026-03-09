<script setup>
import LiveDrinkTracker from "./components/LiveDrinkTracker.vue";
</script>

<template>
  <div class="fab-app-shell min-h-screen px-3 py-3 sm:px-5 sm:py-4">
    <div class="brew-bubbles" aria-hidden="true">
      <span class="brew-bubbles__bubble brew-bubbles__bubble--1"></span>
      <span class="brew-bubbles__bubble brew-bubbles__bubble--2"></span>
      <span class="brew-bubbles__bubble brew-bubbles__bubble--3"></span>
      <span class="brew-bubbles__bubble brew-bubbles__bubble--4"></span>
      <span class="brew-bubbles__bubble brew-bubbles__bubble--5"></span>
    </div>

    <div class="mx-auto max-w-5xl space-y-3">
      <header class="fab-hero enter-rise">
        <div class="flex items-end justify-between gap-3">
          <div class="space-y-1">
            <p class="fab-eyebrow">Experience Alcohol</p>
            <h1 class="fab-title">Live drink tracker</h1>
          </div>
          <span class="fab-chip">Live</span>
        </div>
        <p class="fab-copy">
          Track drinks, watch BAC drift in real time, and keep everyone visible.
        </p>
      </header>

      <LiveDrinkTracker />

      <p class="fab-legal">
        Never use this to decide whether it is safe to drive.
      </p>
    </div>
  </div>
</template>
