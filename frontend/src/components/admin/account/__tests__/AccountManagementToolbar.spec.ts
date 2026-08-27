import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountManagementToolbar from '../AccountManagementToolbar.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const AccountTableActionsStub = {
  props: ['loading'],
  emits: ['refresh', 'create'],
  template: `
    <div>
      <button data-test="refresh" @click="$emit('refresh')" />
      <slot name="after" />
      <button data-test="create" @click="$emit('create')" />
    </div>
  `
}

const AccountTableFiltersStub = {
  emits: ['update:searchQuery', 'update:filters', 'change'],
  template: '<button data-test="filter" @click="$emit(\'update:searchQuery\', \'openai\'); $emit(\'change\')" />'
}

function mountToolbar() {
  return mount(AccountManagementToolbar, {
    props: {
      searchQuery: '',
      filters: {},
      groups: [],
      loading: false,
      autoRefreshEnabled: false,
      autoRefreshCountdown: 0,
      autoRefreshIntervals: [5, 10, 15, 30],
      autoRefreshIntervalSeconds: 30,
      selectedCount: 2,
      toggleableColumns: [{ key: 'priority', label: 'Priority' }],
      isColumnVisible: () => true,
      hasPendingListSync: false
    },
    global: {
      stubs: {
        AccountTableActions: AccountTableActionsStub,
        AccountTableFilters: AccountTableFiltersStub,
        Icon: true,
        Teleport: false
      }
    }
  })
}

describe('AccountManagementToolbar', () => {
  it('keeps refresh, create and filter events owned by the page', async () => {
    const wrapper = mountToolbar()
    await wrapper.get('[data-test="refresh"]').trigger('click')
    await wrapper.get('[data-test="create"]').trigger('click')
    await wrapper.get('[data-test="filter"]').trigger('click')

    expect(wrapper.emitted('refresh')).toHaveLength(1)
    expect(wrapper.emitted('create')).toHaveLength(1)
    expect(wrapper.emitted('update:searchQuery')).toEqual([['openai']])
    expect(wrapper.emitted('change')).toHaveLength(1)
  })

  it('forwards column visibility changes from the tools menu', async () => {
    const wrapper = mountToolbar()
    const moreButton = wrapper.findAll('button').find(button =>
      button.attributes('title') === 'admin.accounts.moreActions'
    )
    expect(moreButton).toBeDefined()
    await moreButton!.trigger('click')

    const priorityButton = Array.from(document.body.querySelectorAll('button')).find(button => button.textContent === 'Priority')
    expect(priorityButton).toBeDefined()
    priorityButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('toggle-column')).toEqual([['priority']])
  })
})
