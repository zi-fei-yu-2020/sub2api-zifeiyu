<template>
          <div class="card" data-testid="ollama-cloud-usage-global-settings">
            <div class="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ t("admin.settings.ollamaCloudUsage.title") }}
              </h2>
              <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
                {{ t("admin.settings.ollamaCloudUsage.description") }}
              </p>
            </div>
            <div class="space-y-5 p-6">
              <div v-if="loading" class="flex items-center gap-2 text-slate-400">
                <div class="h-4 w-4 animate-spin rounded-full border-b-2 border-primary-600"></div>
                {{ t("common.loading") }}
              </div>
              <template v-else>
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <label class="font-medium text-slate-900 dark:text-white">
                      {{ t("admin.settings.ollamaCloudUsage.enabled") }}
                    </label>
                    <p class="text-sm text-slate-400 dark:text-slate-400">
                      {{ t("admin.settings.ollamaCloudUsage.enabledHint") }}
                    </p>
                  </div>
                  <Toggle
                    v-model="enabledModel"
                    :aria-label="t('admin.settings.ollamaCloudUsage.enabled')"
                    data-testid="ollama-cloud-usage-global-enabled"
                  />
                </div>
                <div v-if="enabledModel" class="space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div>
                    <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300" for="ollama-cloud-usage-debounce">
                      {{ t("admin.settings.ollamaCloudUsage.debounceMinutes") }}
                    </label>
                    <input
                      id="ollama-cloud-usage-debounce"
                      v-model.number="debounceMinutesModel"
                      type="number"
                      min="1"
                      max="60"
                      class="input w-32"
                      data-testid="ollama-cloud-usage-global-debounce"
                      @keydown.enter.prevent="emit('save')"
                    />
                    <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
                      {{ t("admin.settings.ollamaCloudUsage.debounceHint") }}
                    </p>
                  </div>
                  <div>
                    <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300" for="ollama-cloud-usage-interval">
                      {{ t("admin.settings.ollamaCloudUsage.intervalMinutes") }}
                    </label>
                    <input
                      id="ollama-cloud-usage-interval"
                      v-model.number="intervalMinutesModel"
                      type="number"
                      min="15"
                      max="1440"
                      class="input w-32"
                      data-testid="ollama-cloud-usage-global-interval"
                      @keydown.enter.prevent="emit('save')"
                    />
                    <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
                      {{ t("admin.settings.ollamaCloudUsage.intervalHint") }}
                    </p>
                  </div>
                </div>
                <div class="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    :disabled="saving"
                    data-testid="ollama-cloud-usage-global-save"
                    @click="emit('save')"
                  >
                    {{ saving ? t("common.saving") : t("common.save") }}
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
const props = defineProps<{ enabled:boolean; debounceMinutes:number; intervalMinutes:number; loading:boolean; saving:boolean }>()
const emit = defineEmits<{ 'update:enabled':[value:boolean]; 'update:debounceMinutes':[value:number]; 'update:intervalMinutes':[value:number]; save:[] }>()
const { t } = useI18n()
const enabledModel=computed({get:()=>props.enabled,set:value=>emit('update:enabled',value)})
const debounceMinutesModel=computed({get:()=>props.debounceMinutes,set:value=>emit('update:debounceMinutes',value)})
const intervalMinutesModel=computed({get:()=>props.intervalMinutes,set:value=>emit('update:intervalMinutes',value)})
</script>
