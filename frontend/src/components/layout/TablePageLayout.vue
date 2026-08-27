<template>
  <div class="table-page-layout space-y-6 w-full" :class="{ 'mobile-mode': isMobile }">
    <!-- 操作按钮与工具栏 -->
    <div v-if="$slots.actions || $slots.filters" class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div v-if="$slots.filters" class="flex flex-1 flex-wrap items-center gap-3">
        <slot name="filters" />
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 items-center justify-end gap-3">
        <slot name="actions" />
      </div>
    </div>

    <!-- 表格区域 (Blue-White SaaS Table Container) -->
    <div class="table-scroll-container overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-blue-500/5 transition-all dark:border-slate-800 dark:bg-slate-900">
      <slot name="table" />
    </div>

    <!-- 分页器 -->
    <div v-if="$slots.pagination" class="flex justify-end pt-2">
      <slot name="pagination" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.table-scroll-container :deep(.table-wrapper) {
  @apply overflow-x-auto;
}

.table-scroll-container :deep(table) {
  @apply w-full text-left text-sm;
}

.table-scroll-container :deep(thead) {
  @apply bg-slate-50/80 dark:bg-slate-800/80;
}

.table-scroll-container :deep(th) {
  @apply px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200/80 dark:border-slate-800;
}

.table-scroll-container :deep(td) {
  @apply px-4 py-3.5 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/60;
}

.table-scroll-container :deep(tbody tr:last-child td) {
  @apply border-b-0;
}

.table-scroll-container :deep(tbody tr) {
  @apply transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/50;
}
</style>