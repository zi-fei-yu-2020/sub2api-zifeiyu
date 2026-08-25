<template>
<div class="card">
  <div
    class="border-b border-slate-100 px-6 py-4 dark:border-slate-800"
  >
    <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
      {{ t("admin.settings.wechatConnect.title") }}
    </h2>
    <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
      {{ t("admin.settings.wechatConnect.description") }}
    </p>
  </div>
  <div class="space-y-5 p-6">
    <div class="flex items-center justify-between">
      <div>
        <label class="font-medium text-slate-900 dark:text-white">{{
          t("admin.settings.wechatConnect.enabledLabel")
        }}</label>
        <p class="text-sm text-slate-400 dark:text-slate-400">
          {{ t("admin.settings.wechatConnect.enabledHint") }}
        </p>
      </div>
      <Toggle
        v-model="wechatForm.wechat_connect_enabled"
        data-testid="wechat-connect-enabled"
      />
    </div>

    <div
      v-if="wechatForm.wechat_connect_enabled"
      class="space-y-6 border-t border-slate-100 pt-4 dark:border-slate-800"
    >
      <div class="space-y-4">
        <div
          class="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="font-medium text-slate-900 dark:text-white">
                {{ localText("PC 应用", "PC App") }}
              </h3>
              <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
                {{
                  localText(
                    "桌面浏览器通过微信开放平台扫码登录。可与公众号或移动应用同时存在。",
                    "Desktop browsers sign in through WeChat Open Platform QR login. This can coexist with Official Account or Mobile App.",
                  )
                }}
              </p>
            </div>
            <Toggle
              :model-value="wechatForm.wechat_connect_open_enabled"
              data-testid="wechat-connect-open-enabled"
              @update:model-value="emit('openEnabledChange', $event)"
            />
          </div>
          <div
            v-if="wechatForm.wechat_connect_open_enabled"
            class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
              >
                {{ localText("PC AppID", "PC App ID") }}
              </label>
              <input
                v-model="wechatForm.wechat_connect_open_app_id"
                data-testid="wechat-connect-open-app-id"
                type="text"
                class="input font-mono text-sm"
                :placeholder="
                  localText(
                    '微信开放平台 PC 应用 AppID',
                    'WeChat Open Platform PC App ID',
                  )
                "
              />
            </div>
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
              >
                {{ localText("PC AppSecret", "PC App Secret") }}
              </label>
              <input
                v-model="wechatForm.wechat_connect_open_app_secret"
                data-testid="wechat-connect-open-app-secret"
                type="password"
                class="input font-mono text-sm"
                :placeholder="
                  wechatForm.wechat_connect_open_app_secret_configured
                    ? localText(
                        '密钥已配置，留空以保留当前值。',
                        'Secret configured. Leave empty to keep the current value.',
                      )
                    : localText(
                        '微信开放平台 PC 应用 AppSecret',
                        'WeChat Open Platform PC App Secret',
                      )
                "
              />
            </div>
          </div>
        </div>

        <div
          class="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="font-medium text-slate-900 dark:text-white">
                {{ localText("公众号", "Official Account") }}
              </h3>
              <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
                {{
                  localText(
                    "仅在微信内浏览器可用；非微信环境下会显示不可用。",
                    "Only available inside the WeChat browser. It is shown as unavailable outside WeChat.",
                  )
                }}
              </p>
            </div>
            <Toggle
              :model-value="wechatForm.wechat_connect_mp_enabled"
              data-testid="wechat-connect-mp-enabled"
              @update:model-value="emit('mpEnabledChange', $event)"
            />
          </div>
          <div
            v-if="wechatForm.wechat_connect_mp_enabled"
            class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
              >
                {{ localText("公众号 AppID", "Official Account App ID") }}
              </label>
              <input
                v-model="wechatForm.wechat_connect_mp_app_id"
                data-testid="wechat-connect-mp-app-id"
                type="text"
                class="input font-mono text-sm"
                :placeholder="
                  localText(
                    '公众号 AppID',
                    'Official Account App ID',
                  )
                "
              />
            </div>
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
              >
                {{
                  localText(
                    "公众号 AppSecret",
                    "Official Account App Secret",
                  )
                }}
              </label>
              <input
                v-model="wechatForm.wechat_connect_mp_app_secret"
                data-testid="wechat-connect-mp-app-secret"
                type="password"
                class="input font-mono text-sm"
                :placeholder="
                  wechatForm.wechat_connect_mp_app_secret_configured
                    ? localText(
                        '密钥已配置，留空以保留当前值。',
                        'Secret configured. Leave empty to keep the current value.',
                      )
                    : localText(
                        '公众号 AppSecret',
                        'Official Account App Secret',
                      )
                "
              />
            </div>
          </div>
        </div>

        <div
          class="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="font-medium text-slate-900 dark:text-white">
                {{ localText("移动应用", "Mobile App") }}
              </h3>
              <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
                {{
                  localText(
                    "原生移动端通过微信 SDK 唤起授权，网页端不会直接发起该流程。",
                    "Native mobile clients start authorization through the WeChat SDK. The web UI does not launch this flow directly.",
                  )
                }}
              </p>
            </div>
            <Toggle
              :model-value="wechatForm.wechat_connect_mobile_enabled"
              data-testid="wechat-connect-mobile-enabled"
              @update:model-value="emit('mobileEnabledChange', $event)"
            />
          </div>
          <div
            v-if="wechatForm.wechat_connect_mobile_enabled"
            class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
              >
                {{ localText("移动应用 AppID", "Mobile App ID") }}
              </label>
              <input
                v-model="wechatForm.wechat_connect_mobile_app_id"
                data-testid="wechat-connect-mobile-app-id"
                type="text"
                class="input font-mono text-sm"
                :placeholder="
                  localText(
                    '移动应用 AppID',
                    'Mobile App ID',
                  )
                "
              />
            </div>
            <div>
              <label
                class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
              >
                {{ localText("移动应用 AppSecret", "Mobile App Secret") }}
              </label>
              <input
                v-model="wechatForm.wechat_connect_mobile_app_secret"
                data-testid="wechat-connect-mobile-app-secret"
                type="password"
                class="input font-mono text-sm"
                :placeholder="
                  wechatForm.wechat_connect_mobile_app_secret_configured
                    ? localText(
                        '密钥已配置，留空以保留当前值。',
                        'Secret configured. Leave empty to keep the current value.',
                      )
                    : localText(
                        '移动应用 AppSecret',
                        'Mobile App Secret',
                      )
                "
              />
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="
          wechatForm.wechat_connect_open_enabled &&
          (wechatForm.wechat_connect_mp_enabled ||
            wechatForm.wechat_connect_mobile_enabled)
        "
        class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300"
      >
        {{
          localText(
            "如果同时启用 PC 应用和公众号/移动应用，这些应用需要挂在同一个微信开放平台主体下，否则 UnionID 无法稳定归并账号。",
            "When PC App is enabled together with Official Account or Mobile App, they should belong to the same WeChat Open Platform account so UnionID can merge identities reliably.",
          )
        }}
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label
            class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
          >
            {{
              localText(
                "浏览器回调地址",
                "Browser Redirect URL",
              )
            }}
          </label>
          <input
            data-testid="wechat-connect-redirect-url"
            v-model="wechatForm.wechat_connect_redirect_url"
            type="url"
            class="input font-mono text-sm"
            :placeholder="t('admin.settings.wechatConnect.redirectUrlPlaceholder')"
          />
          <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
            {{
              localText(
                "用于 PC 应用和公众号的网页回调。移动应用走原生 SDK 时不直接使用这个浏览器回调。",
                "Used by PC App and Official Account browser callbacks. Native mobile SDK flows do not start from this browser callback directly.",
              )
            }}
          </p>
          <div
            class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
          >
            <button
              type="button"
              class="btn btn-secondary btn-sm w-fit"
              @click="emit('quickSet')"
            >
              {{ t("admin.settings.wechatConnect.generateAndCopy") }}
            </button>
            <code
              v-if="redirectUrlSuggestion"
              class="select-all break-all rounded bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-900 dark:text-gray-300"
            >
              {{ redirectUrlSuggestion }}
            </code>
          </div>
        </div>
      </div>

      <div>
        <label
          class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{ t("admin.settings.wechatConnect.frontendRedirectUrlLabel") }}
        </label>
        <input
          data-testid="wechat-connect-frontend-redirect-url"
          v-model="wechatForm.wechat_connect_frontend_redirect_url"
          type="text"
          class="input font-mono text-sm"
          :placeholder="t('admin.settings.wechatConnect.frontendRedirectUrlPlaceholder')"
        />
        <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
          {{ t("admin.settings.wechatConnect.frontendRedirectUrlHint") }}
        </p>
      </div>
    </div>
  </div>
</div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Toggle from '@/components/common/Toggle.vue'

interface WeChatSettingsForm {
  wechat_connect_enabled: boolean
  wechat_connect_open_enabled: boolean
  wechat_connect_open_app_id?: string
  wechat_connect_open_app_secret?: string
  wechat_connect_open_app_secret_configured?: boolean
  wechat_connect_mp_enabled: boolean
  wechat_connect_mp_app_id?: string
  wechat_connect_mp_app_secret?: string
  wechat_connect_mp_app_secret_configured?: boolean
  wechat_connect_mobile_enabled: boolean
  wechat_connect_mobile_app_id?: string
  wechat_connect_mobile_app_secret?: string
  wechat_connect_mobile_app_secret_configured?: boolean
  wechat_connect_redirect_url: string
  wechat_connect_frontend_redirect_url: string
}
const props = defineProps<{ form: WeChatSettingsForm; redirectUrlSuggestion: string }>()
const emit = defineEmits<{
  openEnabledChange: [value: boolean]
  mpEnabledChange: [value: boolean]
  mobileEnabledChange: [value: boolean]
  quickSet: []
}>()
const wechatForm = props.form
const { t, locale } = useI18n()
const isZhLocale = computed(() => locale.value.startsWith('zh'))
function localText(zh: string, en: string): string {
  return isZhLocale.value ? zh : en
}
</script>
