<template>
<div class="card">
  <div
    class="border-b border-slate-100 px-6 py-4 dark:border-slate-800"
  >
    <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
      {{ t("admin.settings.oidc.title") }}
    </h2>
    <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
      {{ t("admin.settings.oidc.description") }}
    </p>
  </div>
  <div class="space-y-5 p-6">
    <div class="flex items-center justify-between">
      <div>
        <label class="font-medium text-slate-900 dark:text-white">{{
          t("admin.settings.oidc.enable")
        }}</label>
        <p class="text-sm text-slate-400 dark:text-slate-400">
          {{ t("admin.settings.oidc.enableHint") }}
        </p>
      </div>
      <Toggle v-model="oidcForm.oidc_connect_enabled" />
    </div>

    <div
      v-if="oidcForm.oidc_connect_enabled"
      class="space-y-6 border-t border-slate-100 pt-4 dark:border-slate-800"
    >
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.providerName") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_provider_name"
            type="text"
            class="input"
            :placeholder="
              t('admin.settings.oidc.providerNamePlaceholder')
            "
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.clientId") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_client_id"
            type="text"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.clientIdPlaceholder')
            "
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.clientSecret") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_client_secret"
            type="password"
            class="input font-mono text-sm"
            :placeholder="
              oidcForm.oidc_connect_client_secret_configured
                ? t(
                    'admin.settings.oidc.clientSecretConfiguredPlaceholder',
                  )
                : t('admin.settings.oidc.clientSecretPlaceholder')
            "
          />
          <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
            {{
              oidcForm.oidc_connect_client_secret_configured
                ? t("admin.settings.oidc.clientSecretConfiguredHint")
                : t("admin.settings.oidc.clientSecretHint")
            }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.issuerUrl") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_issuer_url"
            type="url"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.issuerUrlPlaceholder')
            "
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.discoveryUrl") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_discovery_url"
            type="url"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.discoveryUrlPlaceholder')
            "
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.authorizeUrl") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_authorize_url"
            type="url"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.authorizeUrlPlaceholder')
            "
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.tokenUrl") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_token_url"
            type="url"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.tokenUrlPlaceholder')
            "
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.userinfoUrl") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_userinfo_url"
            type="url"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.userinfoUrlPlaceholder')
            "
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.jwksUrl") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_jwks_url"
            type="url"
            class="input font-mono text-sm"
            :placeholder="t('admin.settings.oidc.jwksUrlPlaceholder')"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.scopes") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_scopes"
            type="text"
            class="input font-mono text-sm"
            :placeholder="t('admin.settings.oidc.scopesPlaceholder')"
          />
          <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
            {{ t("admin.settings.oidc.scopesHint") }}
          </p>
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.redirectUrl") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_redirect_url"
            type="url"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.redirectUrlPlaceholder')
            "
          />
          <div
            class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
          >
            <button
              type="button"
              class="btn btn-secondary btn-sm w-fit"
              @click="emit('quickSet')"
            >
              {{ t("admin.settings.oidc.quickSetCopy") }}
            </button>
            <code
              v-if="redirectUrlSuggestion"
              class="select-all break-all rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-900 dark:text-gray-300"
            >
              {{ redirectUrlSuggestion }}
            </code>
          </div>
          <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
            {{ t("admin.settings.oidc.redirectUrlHint") }}
          </p>
        </div>

        <div class="lg:col-span-2">
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.frontendRedirectUrl") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_frontend_redirect_url"
            type="text"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.frontendRedirectUrlPlaceholder')
            "
          />
          <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
            {{ t("admin.settings.oidc.frontendRedirectUrlHint") }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.tokenAuthMethod") }}
          </label>
          <select
            v-model="oidcForm.oidc_connect_token_auth_method"
            class="input font-mono text-sm"
          >
            <option value="client_secret_post">
              client_secret_post
            </option>
            <option value="client_secret_basic">
              client_secret_basic
            </option>
            <option value="none">none</option>
          </select>
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.clockSkewSeconds") }}
          </label>
          <input
            v-model.number="oidcForm.oidc_connect_clock_skew_seconds"
            type="number"
            min="0"
            max="600"
            class="input"
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.allowedSigningAlgs") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_allowed_signing_algs"
            type="text"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.allowedSigningAlgsPlaceholder')
            "
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div
          class="flex items-center justify-between rounded border border-slate-200 px-4 py-3 dark:border-slate-800"
        >
          <div>
            <label class="font-medium text-slate-900 dark:text-white">
              {{ t("admin.settings.oidc.usePkce") }}
            </label>
          </div>
          <Toggle
            v-model="oidcForm.oidc_connect_use_pkce"
            data-testid="oidc-connect-use-pkce"
          />
        </div>

        <div
          class="flex items-center justify-between rounded border border-slate-200 px-4 py-3 dark:border-slate-800"
        >
          <div>
            <label class="font-medium text-slate-900 dark:text-white">
              {{ t("admin.settings.oidc.validateIdToken") }}
            </label>
          </div>
          <Toggle
            v-model="oidcForm.oidc_connect_validate_id_token"
            data-testid="oidc-connect-validate-id-token"
          />
        </div>

        <div
          class="flex items-center justify-between rounded border border-slate-200 px-4 py-3 dark:border-slate-800"
        >
          <div>
            <label class="font-medium text-slate-900 dark:text-white">
              {{ t("admin.settings.oidc.requireEmailVerified") }}
            </label>
          </div>
          <Toggle
            v-model="oidcForm.oidc_connect_require_email_verified"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.userinfoEmailPath") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_userinfo_email_path"
            type="text"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.userinfoEmailPathPlaceholder')
            "
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.userinfoIdPath") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_userinfo_id_path"
            type="text"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.userinfoIdPathPlaceholder')
            "
          />
        </div>

        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{ t("admin.settings.oidc.userinfoUsernamePath") }}
          </label>
          <input
            v-model="oidcForm.oidc_connect_userinfo_username_path"
            type="text"
            class="input font-mono text-sm"
            :placeholder="
              t('admin.settings.oidc.userinfoUsernamePathPlaceholder')
            "
          />
        </div>
      </div>
    </div>
  </div>
</div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Toggle from '@/components/common/Toggle.vue'

interface OIDCSettingsForm {
  oidc_connect_enabled: boolean
  oidc_connect_provider_name: string
  oidc_connect_client_id: string
  oidc_connect_client_secret: string
  oidc_connect_client_secret_configured: boolean
  oidc_connect_issuer_url: string
  oidc_connect_discovery_url: string
  oidc_connect_authorize_url: string
  oidc_connect_token_url: string
  oidc_connect_userinfo_url: string
  oidc_connect_jwks_url: string
  oidc_connect_scopes: string
  oidc_connect_redirect_url: string
  oidc_connect_frontend_redirect_url: string
  oidc_connect_token_auth_method: string
  oidc_connect_clock_skew_seconds: number
  oidc_connect_allowed_signing_algs: string
  oidc_connect_use_pkce: boolean
  oidc_connect_validate_id_token: boolean
  oidc_connect_require_email_verified: boolean
  oidc_connect_userinfo_email_path: string
  oidc_connect_userinfo_id_path: string
  oidc_connect_userinfo_username_path: string
}
const props = defineProps<{ form: OIDCSettingsForm; redirectUrlSuggestion: string }>()
const emit = defineEmits<{ quickSet: [] }>()
const oidcForm = props.form
const { t } = useI18n()
</script>
