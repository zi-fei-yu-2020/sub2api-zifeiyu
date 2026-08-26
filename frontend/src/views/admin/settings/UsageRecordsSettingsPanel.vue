<template>
        <div class="card">
          <div class="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ t('admin.settings.usageRecords.title') }}
            </h2>
            <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
              {{ t('admin.settings.usageRecords.description') }}
            </p>
          </div>
          <div class="space-y-4 p-6">
            <!-- User error requests visibility -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
                  {{ t('admin.settings.user_error_view.label') }}
                </label>
                <p class="text-xs text-slate-400 dark:text-slate-400">
                  {{ t('admin.settings.user_error_view.description') }}
                </p>
              </div>
              <label class="toggle">
                <input v-model="form.allow_user_view_error_requests" type="checkbox" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { useI18n } from "vue-i18n";

interface UsageRecordsSettingsForm {
  allow_user_view_error_requests: boolean;
}

const props = defineProps<{
  form: UsageRecordsSettingsForm;
}>();

const { t } = useI18n();
const form = toRef(props, "form");
</script>
