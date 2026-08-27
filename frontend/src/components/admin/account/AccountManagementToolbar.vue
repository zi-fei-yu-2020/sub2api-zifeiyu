<template>
  <div>
    <div class="flex flex-wrap-reverse items-start justify-between gap-3">
      <AccountTableFilters
        :search-query="searchQuery"
        :filters="filters"
        :groups="groups"
        @update:filters="$emit('update:filters', $event)"
        @change="$emit('change')"
        @update:search-query="$emit('update:searchQuery', $event)"
      />
      <AccountTableActions :loading="loading" @refresh="$emit('refresh')" @create="$emit('create')">
        <template #after>
          <div ref="autoRefreshDropdownRef" class="relative">
            <button
              class="btn btn-secondary px-2 md:px-3"
              :title="t('admin.accounts.autoRefresh')"
              @click="toggleAutoRefreshDropdown"
            >
              <Icon name="refresh" size="sm" :class="[autoRefreshEnabled ? 'animate-spin' : '']" />
              <span class="hidden md:inline">
                {{
                  autoRefreshEnabled
                    ? t('admin.accounts.autoRefreshCountdown', { seconds: autoRefreshCountdown })
                    : t('admin.accounts.autoRefresh')
                }}
              </span>
            </button>
            <div
              v-if="showAutoRefreshDropdown"
              class="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="p-2">
                <button
                  class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-dark-700"
                  @click="$emit('set-auto-refresh-enabled', !autoRefreshEnabled)"
                >
                  <span>{{ t('admin.accounts.enableAutoRefresh') }}</span>
                  <Icon v-if="autoRefreshEnabled" name="check" size="sm" class="text-primary-500" />
                </button>
                <div class="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                <button
                  v-for="sec in autoRefreshIntervals"
                  :key="sec"
                  class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-dark-700"
                  @click="$emit('set-auto-refresh-interval', sec)"
                >
                  <span>{{ autoRefreshIntervalLabel(sec) }}</span>
                  <Icon v-if="autoRefreshIntervalSeconds === sec" name="check" size="sm" class="text-primary-500" />
                </button>
              </div>
            </div>
          </div>

          <div ref="accountToolsDropdownRef" class="relative">
            <button
              ref="accountToolsTriggerRef"
              class="btn btn-secondary px-2 md:px-3"
              :title="t('admin.accounts.moreActions')"
              :aria-expanded="showAccountToolsDropdown"
              @click="toggleAccountToolsDropdown"
            >
              <Icon name="more" size="sm" class="md:mr-1.5" />
              <span class="hidden md:inline">{{ t('admin.accounts.moreActions') }}</span>
              <Icon name="chevronDown" size="xs" class="ml-1 hidden md:inline" />
            </button>
            <Teleport to="body">
              <div
                v-if="showAccountToolsDropdown"
                class="fixed z-[9999] origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
                :style="accountToolsDropdownStyle"
                @click.stop
              >
                <div class="overflow-y-auto p-2" :style="{ maxHeight: `${accountToolsDropdownPosition.maxHeight}px` }">
                  <div class="px-2 py-2">
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
                      {{ t('admin.accounts.dataActions') }}
                    </div>
                  </div>
                  <button class="account-tools-menu-item" @click="emitToolAction('sync')">
                    <span class="account-tools-menu-icon bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                      <Icon name="sync" size="sm" />
                    </span>
                    <span class="flex-1 text-left">{{ t('admin.accounts.syncFromCrs') }}</span>
                  </button>
                  <button class="account-tools-menu-item" @click="emitToolAction('import')">
                    <span class="account-tools-menu-icon bg-emerald-50 text-blue-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <Icon name="upload" size="sm" />
                    </span>
                    <span class="flex-1 text-left">{{ t('admin.accounts.dataImport') }}</span>
                  </button>
                  <button class="account-tools-menu-item" @click="emitToolAction('export')">
                    <span class="account-tools-menu-icon bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                      <Icon name="download" size="sm" />
                    </span>
                    <span class="flex-1 text-left">
                      {{ selectedCount ? t('admin.accounts.dataExportSelected') : t('admin.accounts.dataExport') }}
                    </span>
                    <span
                      v-if="selectedCount"
                      class="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                    >
                      {{ t('admin.accounts.selectedCount', { count: selectedCount }) }}
                    </span>
                  </button>

                  <div class="my-2 border-t border-slate-100 dark:border-slate-800"></div>
                  <div class="px-2 py-2">
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
                      {{ t('admin.accounts.toolActions') }}
                    </div>
                  </div>
                  <button class="account-tools-menu-item" @click="emitToolAction('error-passthrough')">
                    <span class="account-tools-menu-icon bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                      <Icon name="shield" size="sm" />
                    </span>
                    <span class="flex-1 text-left">{{ t('admin.errorPassthrough.title') }}</span>
                  </button>
                  <button class="account-tools-menu-item" @click="emitToolAction('tls-profiles')">
                    <span class="account-tools-menu-icon bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                      <Icon name="lock" size="sm" />
                    </span>
                    <span class="flex-1 text-left">{{ t('admin.tlsFingerprintProfiles.title') }}</span>
                  </button>

                  <div class="my-2 border-t border-slate-100 dark:border-slate-800"></div>
                  <div class="px-2 py-2">
                    <div class="flex items-center justify-between gap-3">
                      <span class="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
                        {{ t('admin.accounts.viewColumns') }}
                      </span>
                      <Icon name="grid" size="sm" class="text-slate-400" />
                    </div>
                  </div>
                  <div class="grid grid-cols-1 gap-1">
                    <button
                      v-for="col in toggleableColumns"
                      :key="col.key"
                      class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-dark-700"
                      @click="$emit('toggle-column', col.key)"
                    >
                      <span class="truncate">{{ col.label }}</span>
                      <Icon v-if="isColumnVisible(col.key)" name="check" size="sm" class="text-primary-500" />
                    </button>
                  </div>
                </div>
              </div>
            </Teleport>
          </div>
        </template>
      </AccountTableActions>
    </div>
    <div
      v-if="hasPendingListSync"
      class="mt-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <span>{{ t('admin.accounts.listPendingSyncHint') }}</span>
      <button class="btn btn-secondary px-2 py-1 text-xs" @click="$emit('sync-pending')">
        {{ t('admin.accounts.listPendingSyncAction') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdminGroup } from '@/types'
import { getFloatingPanelPosition } from '@/utils/floatingPanel'
import Icon from '@/components/icons/Icon.vue'
import AccountTableActions from './AccountTableActions.vue'
import AccountTableFilters from './AccountTableFilters.vue'

type AccountColumn = { key: string; label: string; sortable?: boolean }
type AutoRefreshInterval = 5 | 10 | 15 | 30
type ToolAction = 'sync' | 'import' | 'export' | 'error-passthrough' | 'tls-profiles'

defineProps<{
  searchQuery: string
  filters: Record<string, any>
  groups: AdminGroup[]
  loading: boolean
  autoRefreshEnabled: boolean
  autoRefreshCountdown: number
  autoRefreshIntervals: readonly AutoRefreshInterval[]
  autoRefreshIntervalSeconds: AutoRefreshInterval
  selectedCount: number
  toggleableColumns: AccountColumn[]
  isColumnVisible: (key: string) => boolean
  hasPendingListSync: boolean
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'update:filters': [value: Record<string, any>]
  change: []
  refresh: []
  create: []
  'set-auto-refresh-enabled': [enabled: boolean]
  'set-auto-refresh-interval': [seconds: AutoRefreshInterval]
  'toggle-column': [key: string]
  'tool-action': [action: ToolAction]
  'sync-pending': []
  'dropdown-visibility-change': [visible: boolean]
}>()

const { t } = useI18n()
const showAutoRefreshDropdown = ref(false)
const showAccountToolsDropdown = ref(false)
const autoRefreshDropdownRef = ref<HTMLElement | null>(null)
const accountToolsDropdownRef = ref<HTMLElement | null>(null)
const accountToolsTriggerRef = ref<HTMLElement | null>(null)
const accountToolsDropdownPosition = reactive({
  top: null as number | null,
  bottom: null as number | null,
  left: 16,
  width: 320,
  maxHeight: 0
})
const accountToolsDropdownStyle = computed(() => ({
  top: accountToolsDropdownPosition.top == null ? 'auto' : `${accountToolsDropdownPosition.top}px`,
  bottom: accountToolsDropdownPosition.bottom == null ? 'auto' : `${accountToolsDropdownPosition.bottom}px`,
  left: `${accountToolsDropdownPosition.left}px`,
  width: `${accountToolsDropdownPosition.width}px`
}))

watch(
  () => showAutoRefreshDropdown.value || showAccountToolsDropdown.value,
  visible => emit('dropdown-visibility-change', visible),
  { immediate: true }
)

const autoRefreshIntervalLabel = (sec: number) => {
  if (sec === 5) return t('admin.accounts.refreshInterval5s')
  if (sec === 10) return t('admin.accounts.refreshInterval10s')
  if (sec === 15) return t('admin.accounts.refreshInterval15s')
  if (sec === 30) return t('admin.accounts.refreshInterval30s')
  return `${sec}s`
}

const updateAccountToolsDropdownPosition = () => {
  const trigger = accountToolsTriggerRef.value
  if (!trigger) return
  Object.assign(
    accountToolsDropdownPosition,
    getFloatingPanelPosition(
      trigger.getBoundingClientRect(),
      document.documentElement.clientWidth || window.innerWidth,
      window.innerHeight
    )
  )
}

const toggleAutoRefreshDropdown = () => {
  showAutoRefreshDropdown.value = !showAutoRefreshDropdown.value
  showAccountToolsDropdown.value = false
}

const toggleAccountToolsDropdown = () => {
  const nextVisible = !showAccountToolsDropdown.value
  showAutoRefreshDropdown.value = false
  if (nextVisible) updateAccountToolsDropdownPosition()
  showAccountToolsDropdown.value = nextVisible
}

const emitToolAction = (action: ToolAction) => {
  showAccountToolsDropdown.value = false
  emit('tool-action', action)
}

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node
  if (accountToolsDropdownRef.value && !accountToolsDropdownRef.value.contains(target)) {
    showAccountToolsDropdown.value = false
  }
  if (autoRefreshDropdownRef.value && !autoRefreshDropdownRef.value.contains(target)) {
    showAutoRefreshDropdown.value = false
  }
}

const handleViewportChange = () => {
  if (showAccountToolsDropdown.value) updateAccountToolsDropdownPosition()
}

onMounted(() => {
  window.addEventListener('scroll', handleViewportChange, true)
  window.addEventListener('resize', handleViewportChange)
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleViewportChange, true)
  window.removeEventListener('resize', handleViewportChange)
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.account-tools-menu-item {
  @apply flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-gray-200 dark:hover:bg-dark-700;
}

.account-tools-menu-icon {
  @apply inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl;
}
</style>
