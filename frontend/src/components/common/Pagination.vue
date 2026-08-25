<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 text-xs text-slate-500 dark:text-slate-400">
    <!-- Mobile pagination -->
    <div class="flex w-full items-center justify-between sm:hidden">
      <button
        @click="goToPage(page - 1)"
        :disabled="page === 1"
        class="btn btn-secondary btn-sm"
      >
        {{ t('pagination.previous') }}
      </button>
      <span class="text-xs font-medium text-slate-700 dark:text-slate-300">
        {{ t('pagination.pageOf', { page, total: totalPages }) }}
      </span>
      <button
        @click="goToPage(page + 1)"
        :disabled="page === totalPages"
        class="btn btn-secondary btn-sm"
      >
        {{ t('pagination.next') }}
      </button>
    </div>

    <!-- Desktop pagination info & PerPage selector -->
    <div class="hidden sm:flex items-center gap-4">
      <p class="text-xs text-slate-500 dark:text-slate-400">
        {{ t('pagination.showing') }}
        <span class="font-semibold text-slate-900 dark:text-white">{{ fromItem }}</span>
        {{ t('pagination.to') }}
        <span class="font-semibold text-slate-900 dark:text-white">{{ toItem }}</span>
        {{ t('pagination.of') }}
        <span class="font-semibold text-slate-900 dark:text-white">{{ total }}</span>
        {{ t('pagination.results') }}
      </p>

      <!-- Page size selector -->
      <div v-if="showPageSizeSelector" class="flex items-center gap-2">
        <span class="text-slate-400">{{ t('pagination.perPage') }}:</span>
        <div class="w-20">
          <Select
            :model-value="pageSize"
            :options="pageSizeSelectOptions"
            @update:model-value="handlePageSizeChange"
          />
        </div>
      </div>

      <div v-if="showJump" class="flex items-center gap-2">
        <span class="text-slate-400">{{ t('pagination.jumpTo') }}</span>
        <input
          v-model="jumpPage"
          type="number"
          min="1"
          :max="totalPages"
          class="input w-16 py-1 text-xs"
          :placeholder="t('pagination.jumpPlaceholder')"
          @keyup.enter="submitJump"
        />
        <button type="button" class="btn btn-secondary btn-sm" @click="submitJump">
          {{ t('pagination.jumpAction') }}
        </button>
      </div>
    </div>

    <!-- Page navigation numbers (SaaS Blue & White Pills) -->
    <div class="flex items-center gap-1">
      <!-- Previous button -->
      <button
        @click="goToPage(page - 1)"
        :disabled="page === 1"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-xs transition-all hover:bg-blue-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
        :aria-label="t('pagination.previous')"
      >
        <Icon name="chevronLeft" size="sm" />
      </button>

      <!-- Page numbers -->
      <button
        v-for="(pageNum, index) in visiblePages"
        :key="`${pageNum}-${index}`"
        @click="typeof pageNum === 'number' && goToPage(pageNum)"
        :disabled="typeof pageNum !== 'number'"
        :class="[
          'flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-all',
          pageNum === page
            ? 'bg-primary-600 text-white shadow-sm shadow-blue-500/20'
            : typeof pageNum === 'number'
              ? 'border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-blue-50 hover:text-primary-600 hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              : 'text-slate-400 cursor-default'
        ]"
        :aria-label="
          typeof pageNum === 'number' ? t('pagination.goToPage', { page: pageNum }) : undefined
        "
        :aria-current="pageNum === page ? 'page' : undefined"
      >
        {{ pageNum }}
      </button>

      <!-- Next button -->
      <button
        @click="goToPage(page + 1)"
        :disabled="page === totalPages"
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-xs transition-all hover:bg-blue-50 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
        :aria-label="t('pagination.next')"
      >
        <Icon name="chevronRight" size="sm" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import Select from './Select.vue'
import { getConfiguredTablePageSizeOptions, normalizeTablePageSize } from '@/utils/tablePreferences'
import { setPersistedPageSize } from '@/composables/usePersistedPageSize'

const { t } = useI18n()

interface Props {
  total: number
  page: number
  pageSize: number
  pageSizeOptions?: number[]
  showPageSizeSelector?: boolean
  showJump?: boolean
}

interface Emits {
  (e: 'update:page', page: number): void
  (e: 'update:pageSize', pageSize: number): void
}

const props = withDefaults(defineProps<Props>(), {
  pageSizeOptions: () => getConfiguredTablePageSizeOptions(),
  showPageSizeSelector: true,
  showJump: false
})

const emit = defineEmits<Emits>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const fromItem = computed(() => {
  if (props.total === 0) return 0
  return (props.page - 1) * props.pageSize + 1
})

const toItem = computed(() => {
  const to = props.page * props.pageSize
  return to > props.total ? props.total : to
})

const pageSizeSelectOptions = computed(() => {
  const options = Array.from(
    new Set([
      ...getConfiguredTablePageSizeOptions(),
      normalizeTablePageSize(props.pageSize)
    ])
  ).sort((a, b) => a - b)

  return options.map((size) => ({
    value: size,
    label: String(size)
  }))
})

const jumpPage = ref('')

const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const maxVisible = 7
  const total = totalPages.value

  if (total <= maxVisible) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    pages.push(1)

    const start = Math.max(2, props.page - 2)
    const end = Math.min(total - 1, props.page + 2)

    if (start > 2) {
      pages.push('...')
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (end < total - 1) {
      pages.push('...')
    }

    pages.push(total)
  }

  return pages
})

const goToPage = (newPage: number) => {
  if (newPage >= 1 && newPage <= totalPages.value && newPage !== props.page) {
    emit('update:page', newPage)
  }
}

const handlePageSizeChange = (value: string | number | boolean | null) => {
  if (value === null || typeof value === 'boolean') return
  const newPageSize = normalizeTablePageSize(typeof value === 'string' ? parseInt(value, 10) : value)
  setPersistedPageSize(newPageSize)
  emit('update:pageSize', newPageSize)
}

const submitJump = () => {
  const value = jumpPage.value.trim()
  if (!value) return
  const pageNum = Number.parseInt(value, 10)
  if (Number.isNaN(pageNum)) return
  const nextPage = Math.min(Math.max(pageNum, 1), totalPages.value)
  jumpPage.value = ''
  goToPage(nextPage)
}
</script>