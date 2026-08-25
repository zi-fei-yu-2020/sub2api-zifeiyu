<template>
  <!-- Custom Home Content: Full Page Mode -->
  <div v-if="hasHomeContent" class="min-h-screen">
    <!-- iframe mode -->
    <iframe
      v-if="isHomeContentUrl"
      :src="homeContent.trim()"
      class="h-screen w-full border-0"
      allowfullscreen
    ></iframe>
    <!-- HTML mode -->
    <div v-else v-html="sanitizedHomeContent"></div>
  </div>

  <!-- Compact Home Page -->
  <div
    v-else-if="compactHomeEnabled"
    data-testid="compact-home"
    class="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white"
  >
    <header class="border-b border-slate-200/80 px-4 py-4 sm:px-6 dark:border-slate-800">
      <nav class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <img
            :src="siteLogo || '/logo.svg'"
            alt="Logo"
            class="h-9 w-9 shrink-0 rounded-lg object-contain"
          />
          <span class="min-w-0 truncate text-base font-semibold">{{ siteName }}</span>
        </div>
        <div class="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
          <LocaleSwitcher />
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            :title="t('home.viewDocs')"
          >
            <Icon name="book" size="md" />
          </a>
          <router-link
            v-if="showModelPlazaEntry"
            to="/model-plaza"
            class="flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            :title="t('nav.modelPlaza')"
          >
            <Icon name="grid" size="md" />
            <span class="hidden sm:inline">{{ t('nav.modelPlaza') }}</span>
          </router-link>
          <button
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
            @click="toggleTheme"
          >
            <Icon v-if="isDark" name="sun" size="md" />
            <Icon v-else name="moon" size="md" />
          </button>
          <router-link
            :to="isAuthenticated ? dashboardPath : '/login'"
            class="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            {{ isAuthenticated ? t('home.dashboard') : t('home.login') }}
          </router-link>
        </div>
      </nav>
    </header>

    <main class="flex min-w-0 flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div class="min-w-0 max-w-2xl text-center">
        <img
          :src="siteLogo || '/logo.svg'"
          alt="Logo"
          class="mx-auto mb-6 h-20 w-20 rounded-2xl object-contain shadow-sm border border-slate-200/80 bg-white p-2"
        />
        <h1 class="[overflow-wrap:anywhere] text-3xl font-bold md:text-4xl text-slate-900 dark:text-white">{{ siteName }}</h1>
        <p class="mt-4 whitespace-pre-wrap [overflow-wrap:anywhere] text-base text-slate-600 dark:text-slate-300">{{ siteSubtitle }}</p>
        <router-link
          :to="isAuthenticated ? dashboardPath : '/login'"
          class="mt-8 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700"
        >
          {{ isAuthenticated ? t('home.goToDashboard') : t('home.login') }}
        </router-link>
      </div>
    </main>

    <footer class="min-w-0 border-t border-slate-200/80 px-4 py-5 text-center text-sm text-slate-400 [overflow-wrap:anywhere] sm:px-6 dark:border-slate-800 dark:text-slate-500">
      &copy; {{ currentYear }} {{ siteName }}
    </footer>
  </div>

  <!-- Ultimate Blue-White SaaS Landing Page -->
  <div
    v-else
    data-testid="default-home"
    class="relative flex min-h-screen flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
  >
    <!-- Background Decor (Pure Blue-White Light & Subtle Radial Gradients) -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <!-- Top Center Blue Radial Glow -->
      <div class="absolute -top-[18%] left-1/2 h-[750px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-400/20 via-blue-500/10 to-transparent blur-[120px] dark:from-blue-600/20 dark:via-blue-800/10"></div>
      
      <!-- Right Sky-Blue Orb -->
      <div class="absolute top-[30%] right-[-10%] h-[600px] w-[600px] rounded-full bg-sky-300/15 blur-[140px] dark:bg-blue-600/15"></div>
      
      <!-- Bottom Left Deep-Blue Orb -->
      <div class="absolute -bottom-[15%] -left-[10%] h-[650px] w-[650px] rounded-full bg-blue-300/15 blur-[140px] dark:bg-indigo-600/15"></div>
      
      <!-- Subtle Grid Blueprint -->
      <div class="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_40%,#000_65%,transparent_100%)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] opacity-60"></div>
    </div>

    <!-- Header Navigation -->
    <header class="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <!-- Logo / Brand -->
        <router-link to="/" class="flex items-center gap-3 group">
          <div class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-sm border border-slate-200/80 transition-all duration-200 group-hover:shadow-md group-hover:scale-105 dark:bg-slate-900 dark:border-slate-800">
            <img :src="siteLogo || '/logo.svg'" alt="Logo" class="h-full w-full object-contain" />
          </div>
          <span class="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {{ siteName }}
          </span>
        </router-link>

        <!-- Right: Tools, Locale & Auth Buttons -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Docs Link -->
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="hidden sm:flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Icon name="book" size="sm" />
            <span>{{ t('home.docs') }}</span>
          </a>

          <!-- Model Plaza Entry -->
          <router-link
            v-if="showModelPlazaEntry"
            to="/model-plaza"
            class="hidden sm:flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Icon name="grid" size="sm" />
            <span>{{ t('nav.modelPlaza') }}</span>
          </router-link>

          <!-- Language Switcher -->
          <LocaleSwitcher />

          <!-- Theme Toggle -->
          <button
            class="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
            @click="toggleTheme"
          >
            <Icon v-if="isDark" name="sun" size="sm" class="text-amber-500" />
            <Icon v-else name="moon" size="sm" />
          </button>

          <!-- Auth Actions -->
          <template v-if="isAuthenticated">
            <router-link
              :to="dashboardPath"
              class="btn btn-primary"
            >
              {{ t('home.dashboard') }}
            </router-link>
          </template>
          <template v-else>
            <router-link
              to="/login"
              class="btn btn-secondary"
            >
              {{ t('home.login') }}
            </router-link>
            <router-link
              v-if="registrationEnabled"
              to="/register"
              class="btn btn-primary"
            >
              {{ t('home.register') }}
            </router-link>
          </template>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="relative z-10 flex-1">
      <!-- 1. Hero Section: Left Text / Right Floating Code Window -->
      <section class="relative py-16 sm:py-24 lg:py-28 overflow-hidden">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            
            <!-- Left Column: Headline & Action Buttons -->
            <div class="text-center lg:text-left lg:col-span-6 xl:col-span-6">
              <!-- Blue Glass Tag -->
              <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-4 py-1.5 text-xs font-semibold text-primary-700 backdrop-blur-md shadow-sm dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-300">
                <span class="flex h-2 w-2 rounded-full bg-primary-600 animate-ping"></span>
                <span>{{ t('home.heroTag') }}</span>
              </div>

              <!-- Headline -->
              <h1 class="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white leading-[1.12]">
                {{ siteName }}
              </h1>

              <!-- Value Proposition -->
              <p class="mt-5 text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                {{ t('home.heroSubtitle') }}
              </p>
              <p class="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-lg mx-auto lg:mx-0">
                {{ siteSubtitle || t('home.heroDescription') }}
              </p>

              <!-- CTAs -->
              <div class="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <router-link
                  v-if="isAuthenticated"
                  :to="dashboardPath"
                  class="btn btn-primary btn-lg shadow-lg shadow-blue-500/25 px-7 py-3"
                >
                  <Icon name="chart" size="md" />
                  {{ t('home.goToDashboard') }}
                </router-link>
                <template v-else>
                  <router-link
                    v-if="registrationEnabled"
                    to="/register"
                    class="btn btn-primary btn-lg shadow-lg shadow-blue-500/25 px-7 py-3"
                  >
                    <Icon name="play" size="md" />
                    {{ t('home.getStarted') }}
                  </router-link>
                  <router-link
                    to="/login"
                    class="btn btn-secondary btn-lg px-7 py-3"
                  >
                    <Icon name="login" size="md" />
                    {{ t('home.login') }}
                  </router-link>
                </template>
                <a
                  v-if="docUrl"
                  :href="docUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-ghost btn-lg text-slate-600 dark:text-slate-300"
                >
                  <Icon name="book" size="md" />
                  {{ t('home.viewDocs') }}
                </a>
              </div>

              <!-- Feature Pills -->
              <div class="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                <span class="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3.5 py-1.5 shadow-sm border border-slate-200/80 backdrop-blur-md dark:bg-slate-900/90 dark:border-slate-800">
                  <span class="flex h-1.5 w-1.5 rounded-full bg-primary-600"></span>
                  {{ t('home.tags.subscriptionToApi') }}
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3.5 py-1.5 shadow-sm border border-slate-200/80 backdrop-blur-md dark:bg-slate-900/90 dark:border-slate-800">
                  <span class="flex h-1.5 w-1.5 rounded-full bg-primary-600"></span>
                  {{ t('home.tags.stickySession') }}
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-3.5 py-1.5 shadow-sm border border-slate-200/80 backdrop-blur-md dark:bg-slate-900/90 dark:border-slate-800">
                  <span class="flex h-1.5 w-1.5 rounded-full bg-primary-600"></span>
                  {{ t('home.tags.realtimeBilling') }}
                </span>
              </div>
            </div>

            <!-- Right Column: Floating Interactive Code Window -->
            <div class="lg:col-span-6 xl:col-span-6">
              <div class="relative group">
                <!-- Ambient Glow Behind Code Box -->
                <div class="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500/25 to-sky-400/25 blur-xl opacity-75 group-hover:opacity-100 transition duration-500 group-hover:duration-200"></div>
                
                <!-- Main Floating Code Window -->
                <div class="relative rounded-3xl border border-slate-200/90 bg-white/95 p-6 sm:p-7 shadow-2xl shadow-blue-500/10 backdrop-blur-2xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-500/20 dark:border-slate-800 dark:bg-slate-900/95">
                  <!-- Mac Terminal Window Top Bar -->
                  <div class="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div class="flex items-center gap-2">
                      <span class="h-3 w-3 rounded-full bg-rose-400"></span>
                      <span class="h-3 w-3 rounded-full bg-amber-400"></span>
                      <span class="h-3 w-3 rounded-full bg-blue-500"></span>
                      <span class="ml-2 font-mono text-xs font-medium text-slate-400">quickstart.py</span>
                    </div>
                    <span class="rounded-full bg-blue-50 px-3 py-1 font-mono text-[11px] font-semibold text-primary-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                      OpenAI SDK Compatible
                    </span>
                  </div>

                  <!-- Code Content -->
                  <pre class="overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200"><code><span class="text-blue-600 dark:text-blue-400">from</span> openai <span class="text-blue-600 dark:text-blue-400">import</span> OpenAI

client = OpenAI(
    base_url=<span class="text-primary-700 dark:text-blue-300">"{{ displayApiBaseUrl }}"</span>,
    api_key=<span class="text-primary-700 dark:text-blue-300">"sk-your-sub2api-key"</span>
)

response = client.chat.completions.create(
    model=<span class="text-primary-700 dark:text-blue-300">"claude-3-7-sonnet"</span>, <span class="text-slate-400"># or gpt-4o, gemini-2.5-pro, deepseek-r1</span>
    messages=[{<span class="text-primary-700 dark:text-blue-300">"role"</span>: <span class="text-primary-700 dark:text-blue-300">"user"</span>, <span class="text-primary-700 dark:text-blue-300">"content"</span>: <span class="text-primary-700 dark:text-blue-300">"Hello Sub2API Gateway!"</span>}]
)
<span class="text-blue-600 dark:text-blue-400">print</span>(response.choices[0].message.content)</code></pre>
                  
                  <!-- Bottom Status Bar -->
                  <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-mono text-slate-400 dark:border-slate-800">
                    <span class="flex items-center gap-1.5">
                      <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Gateway Latency: 12ms
                    </span>
                    <span>HTTP/2 • Streaming Ready</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- 2. Core Enterprise Capabilities (6 Blue-White Cards) -->
      <section class="py-20 bg-white/60 border-y border-slate-200/80 dark:bg-slate-900/50 dark:border-slate-800">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mb-14 text-center">
            <h2 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {{ t('home.featureTitle') }}
            </h2>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ t('home.featureDesc') }}
            </p>
          </div>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <!-- 1. Multi-Protocol -->
            <div class="card p-7 card-hover bg-white dark:bg-slate-900">
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
                <Icon name="server" size="lg" />
              </div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">
                {{ t('home.multiProtocolTitle') }}
              </h3>
              <p class="mt-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {{ t('home.multiProtocolDesc') }}
              </p>
            </div>

            <!-- 2. HA & Routing -->
            <div class="card p-7 card-hover bg-white dark:bg-slate-900">
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
                <Icon name="shield" size="lg" />
              </div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">
                {{ t('home.haTitle') }}
              </h3>
              <p class="mt-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {{ t('home.haDesc') }}
              </p>
            </div>

            <!-- 3. Cost & Token Analytics -->
            <div class="card p-7 card-hover bg-white dark:bg-slate-900">
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
                <Icon name="chart" size="lg" />
              </div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">
                {{ t('home.analyticsTitle') }}
              </h3>
              <p class="mt-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {{ t('home.analyticsDesc') }}
              </p>
            </div>

            <!-- 4. Key Management -->
            <div class="card p-7 card-hover bg-white dark:bg-slate-900">
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
                <Icon name="key" size="lg" />
              </div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">
                {{ t('home.features.unifiedGateway') }}
              </h3>
              <p class="mt-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {{ t('home.features.unifiedGatewayDesc') }}
              </p>
            </div>

            <!-- 5. Multiple Account Pool -->
            <div class="card p-7 card-hover bg-white dark:bg-slate-900">
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
                <Icon name="user" size="lg" />
              </div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">
                {{ t('home.features.multiAccount') }}
              </h3>
              <p class="mt-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {{ t('home.features.multiAccountDesc') }}
              </p>
            </div>

            <!-- 6. Developer First -->
            <div class="card p-7 card-hover bg-white dark:bg-slate-900">
              <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-primary-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/40">
                <Icon name="link" size="lg" />
              </div>
              <h3 class="text-base font-semibold text-slate-900 dark:text-white">
                {{ t('home.developerFirst') }}
              </h3>
              <p class="mt-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {{ t('home.developerDesc') }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Bottom CTA Section -->
      <section class="py-24 text-center">
        <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div class="rounded-3xl border border-blue-200/80 bg-gradient-to-b from-blue-50/90 to-blue-100/40 p-8 sm:p-14 shadow-xl shadow-blue-500/5 dark:border-blue-900/40 dark:from-slate-900 dark:to-blue-950/30">
            <h2 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              {{ t('home.cta.title') }}
            </h2>
            <p class="mx-auto mt-4 max-w-xl text-sm sm:text-base text-slate-600 dark:text-slate-300">
              {{ t('home.cta.description') }}
            </p>
            <div class="mt-9 flex justify-center gap-4">
              <router-link
                v-if="registrationEnabled"
                to="/register"
                class="btn btn-primary btn-lg shadow-lg shadow-blue-500/25 px-8 py-3"
              >
                <Icon name="play" size="md" />
                {{ t('home.cta.button') }}
              </router-link>
              <router-link
                to="/login"
                class="btn btn-secondary btn-lg px-8 py-3"
              >
                <Icon name="login" size="md" />
                {{ t('home.login') }}
              </router-link>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="relative z-10 border-t border-slate-200/80 bg-white/70 py-8 dark:border-slate-800 dark:bg-slate-900/70">
      <div class="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8 dark:text-slate-500">
        &copy; {{ currentYear }} {{ siteName }}. {{ t('home.footer.allRightsReserved') }}
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore } from '@/stores'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'
import DOMPurify from 'dompurify'
import { sanitizeUrl } from '@/utils/url'
import { FeatureFlags, isFeatureFlagEnabled } from '@/utils/featureFlags'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()

const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || '')
const docUrl = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.doc_url || appStore.docUrl))

const displayApiBaseUrl = computed(() => {
  const customUrl = appStore.cachedPublicSettings?.api_base_url || appStore.apiBaseUrl
  if (customUrl) {
    const trimmed = customUrl.replace(/\/+$/, '')
    return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
  }
  return `${window.location.origin}/v1`
})

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isDark = ref(document.documentElement.classList.contains('dark'))
const currentYear = computed(() => new Date().getFullYear())

const registrationEnabled = computed(() => appStore.cachedPublicSettings?.registration_enabled ?? true)
const showModelPlazaEntry = computed(() => {
  if (!isFeatureFlagEnabled(FeatureFlags.modelPlaza)) return false
  const requiresAuth = appStore.cachedPublicSettings?.model_plaza_require_auth === true
  return !requiresAuth || authStore.isAuthenticated
})

const compactHomeEnabled = computed(() => Boolean(appStore.cachedPublicSettings?.compact_home_enabled))
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')
const hasHomeContent = computed(() => Boolean(homeContent.value.trim()))
const sanitizedHomeContent = computed(() =>
  DOMPurify.sanitize(homeContent.value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['formaction'],
  })
)
const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

const dashboardPath = computed(() => {
  return authStore.isAdmin ? '/admin/dashboard' : '/dashboard'
})

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  if (!appStore.publicSettingsLoaded) {
    void appStore.fetchPublicSettings()
  }
})
</script>