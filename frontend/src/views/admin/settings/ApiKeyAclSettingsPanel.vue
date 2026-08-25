<template>
<div class="card">
  <div
    class="border-b border-slate-100 px-6 py-4 dark:border-slate-800"
  >
    <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
      {{ t("admin.settings.apiKeyAcl.title") }}
    </h2>
    <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
      {{ t("admin.settings.apiKeyAcl.description") }}
    </p>
  </div>
  <div class="space-y-5 p-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <label class="font-medium text-slate-900 dark:text-white">
          {{ t("admin.settings.apiKeyAcl.trustForwardedIp") }}
        </label>
        <p class="text-sm text-slate-400 dark:text-slate-400">
          {{ t("admin.settings.apiKeyAcl.trustForwardedIpHint") }}
        </p>
      </div>
      <Toggle v-model="trustForwardedIpModel" />
    </div>

    <div
      v-if="trustForwardedIpModel"
      class="border-t border-slate-100 pt-4 dark:border-slate-800"
    >
      <label
        for="forwarded-client-ip-headers"
        class="font-medium text-slate-900 dark:text-white"
      >
        {{ t("admin.settings.apiKeyAcl.forwardedClientIpHeaders") }}
      </label>
      <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
        {{ t("admin.settings.apiKeyAcl.forwardedClientIpHeadersHint") }}
      </p>
      <div
        class="mt-3 rounded-xl border border-slate-300 bg-white p-2 dark:border-dark-500 dark:bg-slate-800"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span
            v-for="header in headers"
            :key="header"
            data-testid="forwarded-client-ip-header-tag"
            class="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700 dark:bg-dark-600 dark:text-gray-200"
          >
            <span>{{ header }}</span>
            <button
              type="button"
              class="rounded-full text-slate-400 hover:bg-gray-200 hover:text-slate-700 dark:text-gray-300 dark:hover:bg-dark-500 dark:hover:text-white"
              :aria-label="t('admin.settings.apiKeyAcl.removeForwardedClientIpHeader', { header })"
              @click="emit('removeHeader', header)"
            >
              <Icon
                name="x"
                size="xs"
                class="h-3.5 w-3.5"
                :stroke-width="2"
              />
            </button>
          </span>
          <div
            class="flex min-w-[220px] flex-1 items-center gap-1 rounded border border-transparent px-2 py-1 focus-within:border-primary-300 dark:focus-within:border-primary-700"
          >
            <input
              id="forwarded-client-ip-headers"
              v-model="draftModel"
              data-testid="forwarded-client-ip-headers-input"
              type="text"
              class="w-full bg-transparent text-sm font-mono text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-400"
              :placeholder="t('admin.settings.apiKeyAcl.forwardedClientIpHeadersPlaceholder')"
              @keydown="emit('keydown', $event)"
              @blur="emit('blur')"
              @paste="emit('paste', $event)"
            />
          </div>
        </div>
      </div>
      <p class="mt-2 text-xs text-slate-400 dark:text-slate-400">
        {{ t("admin.settings.apiKeyAcl.forwardedClientIpHeadersRiskHint") }}
      </p>
    </div>
  </div>
</div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import Toggle from '@/components/common/Toggle.vue'
import Icon from '@/components/icons/Icon.vue'

const props = defineProps<{
  trustForwardedIp: boolean
  headers: string[]
  draft: string
}>()

const emit = defineEmits<{
  'update:trustForwardedIp': [value: boolean]
  'update:draft': [value: string]
  removeHeader: [header: string]
  keydown: [event: KeyboardEvent]
  blur: []
  paste: [event: ClipboardEvent]
}>()

const trustForwardedIpModel = computed({
  get: () => props.trustForwardedIp,
  set: (value: boolean) => emit('update:trustForwardedIp', value),
})

const draftModel = computed({
  get: () => props.draft,
  set: (value: string) => emit('update:draft', value),
})

const { t } = useI18n()
</script>
