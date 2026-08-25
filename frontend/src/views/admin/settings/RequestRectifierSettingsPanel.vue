<template>
  <div class="card">
    <div class="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
        {{ t('admin.settings.rectifier.title') }}
      </h2>
      <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
        {{ t('admin.settings.rectifier.description') }}
      </p>
    </div>
    <div class="space-y-5 p-6">
      <div v-if="loading" class="flex items-center gap-2 text-slate-400">
        <div class="h-4 w-4 animate-spin rounded-full border-b-2 border-primary-600"></div>
        {{ t('common.loading') }}
      </div>

      <template v-else>
        <div class="flex items-center justify-between">
          <div>
            <label class="font-medium text-slate-900 dark:text-white">
              {{ t('admin.settings.rectifier.enabled') }}
            </label>
            <p class="text-sm text-slate-400 dark:text-slate-400">
              {{ t('admin.settings.rectifier.enabledHint') }}
            </p>
          </div>
          <Toggle v-model="enabledModel" />
        </div>

        <div
          v-if="enabledModel"
          class="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800"
        >
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                {{ t('admin.settings.rectifier.thinkingSignature') }}
              </label>
              <p class="text-xs text-slate-400 dark:text-slate-400">
                {{ t('admin.settings.rectifier.thinkingSignatureHint') }}
              </p>
            </div>
            <Toggle v-model="thinkingSignatureEnabledModel" />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                {{ t('admin.settings.rectifier.thinkingBudget') }}
              </label>
              <p class="text-xs text-slate-400 dark:text-slate-400">
                {{ t('admin.settings.rectifier.thinkingBudgetHint') }}
              </p>
            </div>
            <Toggle v-model="thinkingBudgetEnabledModel" />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                {{ t('admin.settings.rectifier.apikeySignature') }}
              </label>
              <p class="text-xs text-slate-400 dark:text-slate-400">
                {{ t('admin.settings.rectifier.apikeySignatureHint') }}
              </p>
            </div>
            <Toggle v-model="apiKeySignatureEnabledModel" />
          </div>

          <div
            v-if="apiKeySignatureEnabledModel"
            class="ml-4 space-y-3 border-l-2 border-slate-200 pl-4 dark:border-slate-700"
          >
            <div>
              <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                {{ t('admin.settings.rectifier.apikeyPatterns') }}
              </label>
              <p class="text-xs text-slate-400 dark:text-slate-400">
                {{ t('admin.settings.rectifier.apikeyPatternsHint') }}
              </p>
            </div>
            <div
              v-for="(_, index) in apiKeySignaturePatterns"
              :key="index"
              class="flex items-center gap-2"
            >
              <input
                :value="apiKeySignaturePatterns[index]"
                type="text"
                class="input input-sm flex-1"
                :placeholder="t('admin.settings.rectifier.apikeyPatternPlaceholder')"
                @input="updatePattern(index, $event)"
              />
              <button
                type="button"
                class="btn btn-ghost btn-xs text-red-500 hover:text-red-700"
                @click="removePattern(index)"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <button
              type="button"
              class="btn btn-ghost btn-xs text-primary-600 dark:text-primary-400"
              @click="addPattern"
            >
              + {{ t('admin.settings.rectifier.addPattern') }}
            </button>
          </div>
        </div>

        <div class="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            :disabled="saving"
            class="btn btn-primary btn-sm"
            @click="emit('save')"
          >
            <svg
              v-if="saving"
              class="mr-1 h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import Toggle from '@/components/common/Toggle.vue'

const props = defineProps<{
  loading: boolean
  saving: boolean
  enabled: boolean
  thinkingSignatureEnabled: boolean
  thinkingBudgetEnabled: boolean
  apiKeySignatureEnabled: boolean
  apiKeySignaturePatterns: string[]
}>()

const emit = defineEmits<{
  'update:enabled': [value: boolean]
  'update:thinkingSignatureEnabled': [value: boolean]
  'update:thinkingBudgetEnabled': [value: boolean]
  'update:apiKeySignatureEnabled': [value: boolean]
  'update:apiKeySignaturePatterns': [value: string[]]
  save: []
}>()

const enabledModel = computed({
  get: () => props.enabled,
  set: (value: boolean) => emit('update:enabled', value),
})
const thinkingSignatureEnabledModel = computed({
  get: () => props.thinkingSignatureEnabled,
  set: (value: boolean) => emit('update:thinkingSignatureEnabled', value),
})
const thinkingBudgetEnabledModel = computed({
  get: () => props.thinkingBudgetEnabled,
  set: (value: boolean) => emit('update:thinkingBudgetEnabled', value),
})
const apiKeySignatureEnabledModel = computed({
  get: () => props.apiKeySignatureEnabled,
  set: (value: boolean) => emit('update:apiKeySignatureEnabled', value),
})

function updatePattern(index: number, event: Event): void {
  const value = (event.target as HTMLInputElement).value
  const patterns = [...props.apiKeySignaturePatterns]
  patterns[index] = value
  emit('update:apiKeySignaturePatterns', patterns)
}

function removePattern(index: number): void {
  const patterns = [...props.apiKeySignaturePatterns]
  patterns.splice(index, 1)
  emit('update:apiKeySignaturePatterns', patterns)
}

function addPattern(): void {
  emit('update:apiKeySignaturePatterns', [...props.apiKeySignaturePatterns, ''])
}

const { t } = useI18n()
</script>
