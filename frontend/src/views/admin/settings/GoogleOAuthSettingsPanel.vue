<template>
<div class="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h3 class="font-medium text-slate-900 dark:text-white">
        Google
      </h3>
      <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
        {{
          localText(
            "Google OAuth 客户端需要 openid email profile 范围，并在凭据里登记后端回调地址。",
            "Google OAuth client needs openid email profile scopes and the backend callback URL registered in credentials.",
          )
        }}
      </p>
    </div>
    <Toggle v-model="googleForm.google_oauth_enabled" />
  </div>

  <div v-if="googleForm.google_oauth_enabled" class="mt-4 space-y-4">
    <div class="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-gray-300">
      {{
        localText(
          "开通引导：Google Cloud Console → APIs & Services → OAuth consent screen 完成同意屏幕；Credentials → Create Credentials → OAuth client ID，类型选择 Web application，并把下面地址加入 Authorized redirect URIs。",
          "Setup guide: Google Cloud Console → APIs & Services → OAuth consent screen, then Credentials → Create Credentials → OAuth client ID, choose Web application, and add the URL below to Authorized redirect URIs.",
        )
      }}
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">Client ID</label>
        <input
          v-model="googleForm.google_oauth_client_id"
          type="text"
          class="input font-mono text-sm"
          placeholder="Google OAuth Client ID"
        />
      </div>
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">Client Secret</label>
        <input
          v-model="googleForm.google_oauth_client_secret"
          type="password"
          class="input font-mono text-sm"
          :placeholder="
            googleForm.google_oauth_client_secret_configured
              ? localText('密钥已配置，留空以保留当前值。', 'Secret configured. Leave empty to keep the current value.')
              : 'Google OAuth Client Secret'
          "
        />
      </div>
    </div>

    <div>
      <label class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300">
        {{ localText("后端回调地址", "Backend Callback URL") }}
      </label>
      <input
        v-model="googleForm.google_oauth_redirect_url"
        type="url"
        class="input font-mono text-sm"
        placeholder="https://your-domain.com/api/v1/auth/oauth/google/callback"
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
        v-model="googleForm.google_oauth_frontend_redirect_url"
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

interface GoogleOAuthSettingsForm {
  google_oauth_enabled: boolean
  google_oauth_client_id: string
  google_oauth_client_secret: string
  google_oauth_client_secret_configured: boolean
  google_oauth_redirect_url: string
  google_oauth_frontend_redirect_url: string
}

const props = defineProps<{
  form: GoogleOAuthSettingsForm
  redirectUrlSuggestion: string
}>()
const emit = defineEmits<{ quickSet: [] }>()
const googleForm = props.form
const { locale } = useI18n()
const isZhLocale = computed(() => locale.value.startsWith('zh'))
function localText(zh: string, en: string): string {
  return isZhLocale.value ? zh : en
}
</script>
