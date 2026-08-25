<template>
<div class="card">
  <div
    class="border-b border-slate-100 px-6 py-4 dark:border-slate-800"
  >
    <div class="flex items-center gap-2">
      <Icon
        name="shield"
        size="md"
        class="text-primary-500"
      />
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
        {{ t("admin.settings.panelRateLimit.title") }}
      </h2>
    </div>
    <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
      {{ t("admin.settings.panelRateLimit.description") }}
    </p>
  </div>
  <div class="space-y-5 p-6">
    <div
      v-if="loading"
      class="flex items-center gap-2 text-slate-400"
    >
      <div
        class="h-4 w-4 animate-spin rounded-full border-b-2 border-primary-600"
      ></div>
      {{ t("common.loading") }}
    </div>

    <template v-else>
      <!-- 计数维度说明：按账号计数，反代部署无误伤 -->
      <div
        class="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-900/20"
      >
        <div class="flex items-start">
          <Icon
            name="infoCircle"
            size="md"
            class="mt-0.5 flex-shrink-0 text-sky-500"
          />
          <p class="ml-3 text-sm text-sky-700 dark:text-sky-300">
            {{ t("admin.settings.panelRateLimit.proxySafeNote") }}
          </p>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <label class="font-medium text-slate-900 dark:text-white">{{
            t("admin.settings.panelRateLimit.enabled")
          }}</label>
          <p class="text-sm text-slate-400 dark:text-slate-400">
            {{ t("admin.settings.panelRateLimit.enabledHint") }}
          </p>
        </div>
        <Toggle v-model="enabledModel" />
      </div>

      <div
        v-if="enabledModel"
        class="space-y-5 border-t border-slate-100 pt-4 dark:border-slate-800"
      >
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label
              class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
            >
              {{ t("admin.settings.panelRateLimit.userRpm") }}
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="userRpmModel"
                data-testid="panel-rate-limit-user-rpm"
                type="number"
                min="0"
                max="100000"
                class="input w-32"
              />
              <span class="text-sm text-slate-400 dark:text-slate-400">
                {{ t("admin.settings.panelRateLimit.perMinute") }}
              </span>
            </div>
            <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
              {{ t("admin.settings.panelRateLimit.userRpmHint") }}
            </p>
          </div>

          <div>
            <label
              class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
            >
              {{ t("admin.settings.panelRateLimit.heavyRpm") }}
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="heavyRpmModel"
                type="number"
                min="0"
                max="100000"
                class="input w-32"
              />
              <span class="text-sm text-slate-400 dark:text-slate-400">
                {{ t("admin.settings.panelRateLimit.perMinute") }}
              </span>
            </div>
            <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
              {{ t("admin.settings.panelRateLimit.heavyRpmHint") }}
            </p>
          </div>

          <div>
            <label
              class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
            >
              {{ t("admin.settings.panelRateLimit.publicIpRpm") }}
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="publicIpRpmModel"
                type="number"
                min="0"
                max="100000"
                class="input w-32"
              />
              <span class="text-sm text-slate-400 dark:text-slate-400">
                {{ t("admin.settings.panelRateLimit.perMinute") }}
              </span>
            </div>
            <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
              {{ t("admin.settings.panelRateLimit.publicIpRpmHint") }}
            </p>
          </div>
        </div>

        <div
          class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
        >
          <div>
            <label class="font-medium text-slate-900 dark:text-white">{{
              t("admin.settings.panelRateLimit.exemptAdmin")
            }}</label>
            <p class="text-sm text-slate-400 dark:text-slate-400">
              {{ t("admin.settings.panelRateLimit.exemptAdminHint") }}
            </p>
          </div>
          <Toggle v-model="exemptAdminModel" />
        </div>
      </div>

      <div
        class="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800"
      >
        <button
          type="button"
          data-testid="panel-rate-limit-save"
          @click="emit('save')"
          :disabled="saving"
          class="btn btn-primary btn-sm"
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
          {{
            saving
              ? t("common.saving")
              : t("common.save")
          }}
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
import Icon from '@/components/icons/Icon.vue'

const props = defineProps<{
  loading: boolean
  saving: boolean
  enabled: boolean
  userRpm: number
  heavyRpm: number
  publicIpRpm: number
  exemptAdmin: boolean
}>()

const emit = defineEmits<{
  'update:enabled': [value: boolean]
  'update:userRpm': [value: number]
  'update:heavyRpm': [value: number]
  'update:publicIpRpm': [value: number]
  'update:exemptAdmin': [value: boolean]
  save: []
}>()

const enabledModel = computed({
  get: () => props.enabled,
  set: (value: boolean) => emit('update:enabled', value),
})
const userRpmModel = computed({
  get: () => props.userRpm,
  set: (value: number) => emit('update:userRpm', value),
})
const heavyRpmModel = computed({
  get: () => props.heavyRpm,
  set: (value: number) => emit('update:heavyRpm', value),
})
const publicIpRpmModel = computed({
  get: () => props.publicIpRpm,
  set: (value: number) => emit('update:publicIpRpm', value),
})
const exemptAdminModel = computed({
  get: () => props.exemptAdmin,
  set: (value: boolean) => emit('update:exemptAdmin', value),
})

const { t } = useI18n()
</script>
