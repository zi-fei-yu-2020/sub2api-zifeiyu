<template>
  <button
    type="button"
    role="switch"
    data-testid="account-schedulable-toggle"
    :aria-checked="effectivelySchedulable"
    :aria-disabled="!accountActive || loading"
    :disabled="!accountActive || loading"
    :title="title"
    class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-dark-800"
    :class="
      effectivelySchedulable
        ? 'cursor-pointer bg-primary-500 hover:bg-primary-600'
        : 'bg-gray-200 dark:bg-dark-600'
    "
    @click="emit('toggle')"
  >
    <span
      class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
      :class="effectivelySchedulable ? 'translate-x-4' : 'translate-x-0'"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Account } from '@/types'

const props = defineProps<{
  account: Pick<Account, 'status' | 'schedulable'>
  loading?: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const { t } = useI18n()
const accountActive = computed(() => props.account.status === 'active')
const effectivelySchedulable = computed(
  () => accountActive.value && props.account.schedulable,
)
const title = computed(() => {
  if (!accountActive.value) {
    return props.account.schedulable
      ? t('admin.accounts.schedulableUnavailableWillResume')
      : t('admin.accounts.schedulableUnavailable')
  }
  return props.account.schedulable
    ? t('admin.accounts.schedulableEnabled')
    : t('admin.accounts.schedulableDisabled')
})
</script>
