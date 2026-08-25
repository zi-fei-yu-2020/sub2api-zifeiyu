<template>
  <div class="card">
    <div class="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
        {{ t('admin.settings.overloadCooldown.title') }}
      </h2>
      <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
        {{ t('admin.settings.overloadCooldown.description') }}
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
              {{ t('admin.settings.overloadCooldown.enabled') }}
            </label>
            <p class="text-sm text-slate-400 dark:text-slate-400">
              {{ t('admin.settings.overloadCooldown.enabledHint') }}
            </p>
          </div>
          <Toggle v-model="enabledModel" />
        </div>

        <div
          v-if="enabledModel"
          class="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800"
        >
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">
              {{ t('admin.settings.overloadCooldown.cooldownMinutes') }}
            </label>
            <input
              v-model.number="cooldownMinutesModel"
              type="number"
              min="1"
              max="120"
              class="input w-32"
            />
            <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
              {{ t('admin.settings.overloadCooldown.cooldownMinutesHint') }}
            </p>
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
  cooldownMinutes: number
}>()

const emit = defineEmits<{
  'update:enabled': [value: boolean]
  'update:cooldownMinutes': [value: number]
  save: []
}>()

const enabledModel = computed({
  get: () => props.enabled,
  set: (value: boolean) => emit('update:enabled', value),
})

const cooldownMinutesModel = computed({
  get: () => props.cooldownMinutes,
  set: (value: number) => emit('update:cooldownMinutes', value),
})

const { t } = useI18n()
</script>
