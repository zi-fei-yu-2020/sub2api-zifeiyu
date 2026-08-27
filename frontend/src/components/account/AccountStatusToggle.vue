<template>
  <button
    type="button"
    role="switch"
    data-testid="account-status-toggle"
    :aria-checked="active"
    :aria-disabled="loading"
    :disabled="loading"
    :title="title"
    class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-dark-800"
    :class="active ? 'bg-primary-500 hover:bg-primary-600' : 'bg-gray-200 hover:bg-gray-300 dark:bg-dark-600 dark:hover:bg-dark-500'"
    @click="emit('toggle')"
  >
    <span
      class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
      :class="active ? 'translate-x-4' : 'translate-x-0'"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Account } from '@/types'

const props = defineProps<{
  account: Pick<Account, 'status'>
  loading?: boolean
}>()

const emit = defineEmits<{
  toggle: []
}>()

const { t } = useI18n()
const active = computed(() => props.account.status === 'active')
const title = computed(() => {
  if (props.account.status === 'error') {
    return t('admin.accounts.statusToggleRecover')
  }
  return active.value
    ? t('admin.accounts.statusToggleDisable')
    : t('admin.accounts.statusToggleEnable')
})
</script>
