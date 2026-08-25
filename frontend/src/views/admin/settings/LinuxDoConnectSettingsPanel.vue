<template>
<div class="card">
  <div
    class="border-b border-slate-100 px-6 py-4 dark:border-slate-800"
  >
    <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
      {{ t("admin.settings.linuxdo.title") }}
    </h2>
    <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
      {{ t("admin.settings.linuxdo.description") }}
    </p>
  </div>
  <div class="space-y-5 p-6">
    <div class="flex items-center justify-between">
      <div>
        <label class="font-medium text-slate-900 dark:text-white">{{
          t("admin.settings.linuxdo.enable")
        }}</label>
        <p class="text-sm text-slate-400 dark:text-slate-400">
          {{ t("admin.settings.linuxdo.enableHint") }}
        </p>
      </div>
      <Toggle v-model="linuxdoForm.linuxdo_connect_enabled" />
    </div>

    <div
      v-if="linuxdoForm.linuxdo_connect_enabled"
      class="border-t border-slate-100 pt-4 dark:border-slate-800"
    >
      <div class="grid grid-cols-1 gap-6">
        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.linuxdo.clientId") }}
          </label>
          <input
            v-model="linuxdoForm.linuxdo_connect_client_id"
            type="text"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.linuxdo.clientIdPlaceholder')
            "
          />
          <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
            {{ t("admin.settings.linuxdo.clientIdHint") }}
          </p>
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.linuxdo.clientSecret") }}
          </label>
          <input
            v-model="linuxdoForm.linuxdo_connect_client_secret"
            type="password"
            class="input font-mono text-sm"
            :placeholder="
              linuxdoForm.linuxdo_connect_client_secret_configured
                ? t(
                    'admin.settings.linuxdo.clientSecretConfiguredPlaceholder',
                  )
                : t('admin.settings.linuxdo.clientSecretPlaceholder')
            "
          />
          <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
            {{
              linuxdoForm.linuxdo_connect_client_secret_configured
                ? t(
                    "admin.settings.linuxdo.clientSecretConfiguredHint",
                  )
                : t("admin.settings.linuxdo.clientSecretHint")
            }}
          </p>
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.linuxdo.redirectUrl") }}
          </label>
          <input
            v-model="linuxdoForm.linuxdo_connect_redirect_url"
            type="url"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.linuxdo.redirectUrlPlaceholder')
            "
          />
          <div
            class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
          >
            <button
              type="button"
              class="btn btn-secondary btn-sm w-fit"
              @click="emit('quickSet')"
            >
              {{ t("admin.settings.linuxdo.quickSetCopy") }}
            </button>
            <code
              v-if="redirectUrlSuggestion"
              class="select-all break-all rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-900 dark:text-gray-300"
            >
              {{ redirectUrlSuggestion }}
            </code>
          </div>
          <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
            {{ t("admin.settings.linuxdo.redirectUrlHint") }}
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import Toggle from '@/components/common/Toggle.vue'

interface LinuxDoSettingsForm {
  linuxdo_connect_enabled: boolean
  linuxdo_connect_client_id: string
  linuxdo_connect_client_secret: string
  linuxdo_connect_client_secret_configured: boolean
  linuxdo_connect_redirect_url: string
}

const props = defineProps<{
  form: LinuxDoSettingsForm
  redirectUrlSuggestion: string
}>()
const emit = defineEmits<{ quickSet: [] }>()
const linuxdoForm = props.form
const { t } = useI18n()
</script>
