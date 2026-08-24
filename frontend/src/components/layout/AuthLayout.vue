<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
    <!-- Blue & White SaaS Background Mesh & Glow -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-[20%] left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-400/10 blur-[120px] dark:bg-blue-600/10"></div>
      <div class="absolute -bottom-[20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-300/10 blur-[100px] dark:bg-indigo-600/10"></div>
      <div class="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] opacity-60"></div>
    </div>

    <!-- Content Container -->
    <div class="relative z-10 w-full max-w-md">
      <!-- Logo / Brand Header -->
      <div class="mb-8 text-center">
        <template v-if="settingsLoaded">
          <router-link to="/" class="inline-flex flex-col items-center group">
            <div class="mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm border border-slate-200/80 transition-transform group-hover:scale-105 dark:bg-slate-900 dark:border-slate-800">
              <img :src="siteLogo || '/logo.svg'" alt="Logo" class="h-full w-full object-contain" />
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {{ siteName }}
            </h1>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ siteSubtitle }}
            </p>
          </router-link>
        </template>
      </div>

      <!-- Card Box (Blue-White SaaS Card) -->
      <div class="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-200/40 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-none">
        <slot />
      </div>

      <!-- Footer Links -->
      <div class="mt-6 text-center text-sm">
        <slot name="footer" />
      </div>

      <!-- Copyright -->
      <div class="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
        &copy; {{ currentYear }} {{ siteName }}. All rights reserved.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { sanitizeUrl } from '@/utils/url'

const appStore = useAppStore()

const siteName = computed(() => appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || 'Subscription to API Conversion Platform')
const settingsLoaded = computed(() => appStore.publicSettingsLoaded)

const currentYear = computed(() => new Date().getFullYear())

onMounted(() => {
  appStore.fetchPublicSettings()
})
</script>