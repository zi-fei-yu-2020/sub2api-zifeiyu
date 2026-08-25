<template>
<div class="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h3 class="font-medium text-slate-900 dark:text-white">
        GitHub
      </h3>
      <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
        {{
          localText(
            "GitHub OAuth App 需要 read:user user:email 权限，回调地址填写下方后端地址。",
            "GitHub OAuth App needs read:user user:email scopes. Use the backend callback URL below.",
          )
        }}
      </p>
    </div>
    <Toggle v-model="githubForm.github_oauth_enabled" />
  </div>

  <div v-if="githubForm.github_oauth_enabled" class="mt-4 space-y-4">
    <div class="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-gray-300">
      <template v-if="isZhLocale">
        开通引导：GitHub Settings → Developer settings →
        <a
          data-testid="github-oauth-apps-guide-link"
          href="https://github.com/settings/developers"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >OAuth Apps</a>
        → New OAuth App；Homepage URL 填站点域名，Authorization callback URL 填下面的后端回调地址。
      </template>
      <template v-else>
        Setup guide: GitHub Settings → Developer settings →
        <a
          data-testid="github-oauth-apps-guide-link"
          href="https://github.com/settings/developers"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >OAuth Apps</a>
        → New OAuth App. Use your site origin as Homepage URL and the backend callback URL below as Authorization callback URL.
      </template>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">Client ID</label>
        <input
          v-model="githubForm.github_oauth_client_id"
          type="text"
          class="input font-mono text-sm"
          placeholder="GitHub OAuth Client ID"
        />
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">Client Secret</label>
        <input
          v-model="githubForm.github_oauth_client_secret"
          type="password"
          class="input font-mono text-sm"
          :placeholder="
            githubForm.github_oauth_client_secret_configured
              ? localText('密钥已配置，留空以保留当前值。', 'Secret configured. Leave empty to keep the current value.')
              : 'GitHub OAuth Client Secret'
          "
        />
      </div>
    </div>

    <div>
      <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">
        {{ localText("后端回调地址", "Backend Callback URL") }}
      </label>
      <input
        v-model="githubForm.github_oauth_redirect_url"
        type="url"
        class="input font-mono text-sm"
        placeholder="https://your-domain.com/api/v1/auth/oauth/github/callback"
      />
      <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          class="btn btn-secondary btn-sm w-fit"
          @click="emit('quickSet')"
        >
          {{ localText("生成并复制", "Generate and copy") }}
        </button>
        <code
          v-if="redirectUrlSuggestion"
          class="select-all break-all rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-900 dark:text-gray-300"
        >
          {{ redirectUrlSuggestion }}
        </code>
      </div>
    </div>

    <div>
      <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">
        {{ localText("前端回跳地址", "Frontend Callback URL") }}
      </label>
      <input
        v-model="githubForm.github_oauth_frontend_redirect_url"
        type="text"
        class="input font-mono text-sm"
        placeholder="/auth/oauth/callback"
      />
    </div>
  </div>
</div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import Toggle from '@/components/common/Toggle.vue'

interface GithubOAuthSettingsForm {
  github_oauth_enabled: boolean
  github_oauth_client_id: string
  github_oauth_client_secret: string
  github_oauth_client_secret_configured: boolean
  github_oauth_redirect_url: string
  github_oauth_frontend_redirect_url: string
}

const props = defineProps<{
  form: GithubOAuthSettingsForm
  redirectUrlSuggestion: string
}>()
const emit = defineEmits<{ quickSet: [] }>()
const githubForm = props.form
const { locale } = useI18n()
const isZhLocale = computed(() => locale.value.startsWith('zh'))
function localText(zh: string, en: string): string {
  return isZhLocale.value ? zh : en
}
</script>
