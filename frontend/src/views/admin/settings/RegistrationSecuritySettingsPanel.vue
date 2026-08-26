<template>
          <div class="card">
            <div
              class="border-b border-slate-100 px-6 py-4 dark:border-slate-800"
            >
              <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ t("admin.settings.registration.title") }}
              </h2>
              <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
                {{ t("admin.settings.registration.description") }}
              </p>
            </div>
            <div class="space-y-5 p-6">
              <!-- Enable Registration -->
              <div class="flex items-center justify-between">
                <div>
                  <label class="font-medium text-slate-900 dark:text-white">{{
                    t("admin.settings.registration.enableRegistration")
                  }}</label>
                  <p class="text-sm text-slate-400 dark:text-slate-400">
                    {{
                      t("admin.settings.registration.enableRegistrationHint")
                    }}
                  </p>
                </div>
                <Toggle v-model="form.registration_enabled" />
              </div>

              <!-- Email Verification -->
              <div
                class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <div>
                  <label class="font-medium text-slate-900 dark:text-white">{{
                    t("admin.settings.registration.emailVerification")
                  }}</label>
                  <p class="text-sm text-slate-400 dark:text-slate-400">
                    {{ t("admin.settings.registration.emailVerificationHint") }}
                  </p>
                </div>
                <Toggle v-model="form.email_verify_enabled" />
              </div>

              <!-- Email Suffix Whitelist -->
              <div class="border-t border-slate-100 pt-4 dark:border-slate-800">
                <label class="font-medium text-slate-900 dark:text-white">{{
                  t("admin.settings.registration.emailSuffixWhitelist")
                }}</label>
                <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
                  {{
                    t("admin.settings.registration.emailSuffixWhitelistHint")
                  }}
                </p>
                <div
                  class="mt-3 rounded-xl border border-slate-300 bg-white p-2 dark:border-dark-500 dark:bg-slate-800"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      v-for="suffix in registrationEmailSuffixWhitelistTags"
                      :key="suffix"
                      class="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700 dark:bg-dark-600 dark:text-gray-200"
                    >
                      <span>{{ suffix }}</span>
                      <button
                        type="button"
                        class="rounded-full text-slate-400 hover:bg-gray-200 hover:text-slate-700 dark:text-gray-300 dark:hover:bg-dark-500 dark:hover:text-white"
                        @click="
                          removeRegistrationEmailSuffixWhitelistTag(suffix)
                        "
                      >
                        <Icon
                          name="x"
                          size="xs"
                          class="h-3.5 w-3.5"
                          :stroke-width="2"
                        />
                      </button>
                    </span>

                    <div
                      class="flex min-w-[220px] flex-1 items-center gap-1 rounded border border-transparent px-2 py-1 focus-within:border-primary-300 dark:focus-within:border-primary-700"
                    >
                      <input
                        v-model="registrationEmailSuffixWhitelistDraft"
                        type="text"
                        class="w-full bg-transparent text-sm font-mono text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-400"
                        :placeholder="
                          t(
                            'admin.settings.registration.emailSuffixWhitelistPlaceholder',
                          )
                        "
                        @input="
                          handleRegistrationEmailSuffixWhitelistDraftInput
                        "
                        @keydown="
                          handleRegistrationEmailSuffixWhitelistDraftKeydown
                        "
                        @blur="commitRegistrationEmailSuffixWhitelistDraft"
                        @paste="handleRegistrationEmailSuffixWhitelistPaste"
                      />
                    </div>
                  </div>
                </div>
                <p class="mt-2 text-xs text-slate-400 dark:text-slate-400">
                  {{
                    t(
                      "admin.settings.registration.emailSuffixWhitelistInputHint",
                    )
                  }}
                </p>
              </div>

              <!-- Email Domain Quota -->
              <div
                class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <div>
                  <label class="font-medium text-slate-900 dark:text-white">{{
                    t("admin.settings.registration.emailDomainQuota")
                  }}</label>
                  <p class="text-sm text-slate-400 dark:text-slate-400">
                    {{ t("admin.settings.registration.emailDomainQuotaHint") }}
                  </p>
                </div>
                <Toggle
                  v-model="form.registration_email_domain_quota_enabled"
                />
              </div>

              <!-- Promo Code -->
              <div
                class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <div>
                  <label class="font-medium text-slate-900 dark:text-white">{{
                    t("admin.settings.registration.promoCode")
                  }}</label>
                  <p class="text-sm text-slate-400 dark:text-slate-400">
                    {{ t("admin.settings.registration.promoCodeHint") }}
                  </p>
                </div>
                <Toggle v-model="form.promo_code_enabled" />
              </div>

              <!-- Invitation Code -->
              <div
                class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <div>
                  <label class="font-medium text-slate-900 dark:text-white">{{
                    t("admin.settings.registration.invitationCode")
                  }}</label>
                  <p class="text-sm text-slate-400 dark:text-slate-400">
                    {{ t("admin.settings.registration.invitationCodeHint") }}
                  </p>
                </div>
                <Toggle v-model="form.invitation_code_enabled" />
              </div>
              <!-- Password Reset - Only show when email verification is enabled -->
              <div
                v-if="form.email_verify_enabled"
                class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <div>
                  <label class="font-medium text-slate-900 dark:text-white">{{
                    t("admin.settings.registration.passwordReset")
                  }}</label>
                  <p class="text-sm text-slate-400 dark:text-slate-400">
                    {{ t("admin.settings.registration.passwordResetHint") }}
                  </p>
                </div>
                <Toggle v-model="form.password_reset_enabled" />
              </div>
              <!-- Frontend URL - Only show when password reset is enabled -->
              <div
                v-if="form.email_verify_enabled && form.password_reset_enabled"
                class="border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <label
                  class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
                >
                  {{ t("admin.settings.registration.frontendUrl") }}
                </label>
                <input
                  v-model="form.frontend_url"
                  type="url"
                  class="input"
                  :placeholder="
                    t('admin.settings.registration.frontendUrlPlaceholder')
                  "
                />
                <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
                  {{ t("admin.settings.registration.frontendUrlHint") }}
                </p>
              </div>

              <!-- TOTP 2FA -->
              <div
                class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <div>
                  <label class="font-medium text-slate-900 dark:text-white">{{
                    t("admin.settings.registration.totp")
                  }}</label>
                  <p class="text-sm text-slate-400 dark:text-slate-400">
                    {{ t("admin.settings.registration.totpHint") }}
                  </p>
                  <!-- Warning when encryption key not configured -->
                  <p
                    v-if="!form.totp_encryption_key_configured"
                    class="mt-2 text-sm text-amber-600 dark:text-amber-400"
                  >
                    {{ t("admin.settings.registration.totpKeyNotConfigured") }}
                  </p>
                </div>
                <Toggle
                  v-model="form.totp_enabled"
                  :disabled="!form.totp_encryption_key_configured"
                />
              </div>

              <!-- Passkey sign-in -->
              <div
                class="border-t border-slate-100 pt-4 dark:border-slate-800"
                data-testid="passkey-settings"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <label class="font-medium text-slate-900 dark:text-white">{{
                      t("admin.settings.security.passkey")
                    }}</label>
                    <p class="text-sm text-slate-400 dark:text-slate-400">
                      {{ t("admin.settings.security.passkeyHint") }}
                    </p>
                  </div>
                  <Toggle
                    v-model="form.passkey_enabled"
                    data-testid="passkey-toggle"
                    :disabled="!form.passkey_configured"
                  />
                </div>
                <div
                  class="mt-3 rounded-xl border px-3 py-2 text-sm"
                  :class="
                    form.passkey_configured
                      ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'
                      : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                  "
                  data-testid="passkey-config-status"
                >
                  <p class="font-medium">
                    {{
                      form.passkey_configured
                        ? t("admin.settings.security.passkeyConfigured")
                        : t("admin.settings.security.passkeyNotConfigured")
                    }}
                  </p>
                  <p class="mt-1 break-all">
                    {{ t("admin.settings.security.passkeyRPID") }}:
                    {{
                      form.passkey_rp_id ||
                      t("admin.settings.security.passkeyValueNotConfigured")
                    }}
                  </p>
                  <p class="mt-1 break-all">
                    {{ t("admin.settings.security.passkeyOrigins") }}:
                    {{
                      form.passkey_rp_origins.length > 0
                        ? form.passkey_rp_origins.join(", ")
                        : t(
                            "admin.settings.security.passkeyValueNotConfigured",
                          )
                    }}
                  </p>
                  <p v-if="!form.passkey_configured" class="mt-2">
                    {{ t("admin.settings.security.passkeyDeploymentHint") }}
                  </p>
                </div>
              </div>

              <!-- 敏感操作 step-up 2FA -->
              <div
                class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <div>
                  <label class="font-medium text-slate-900 dark:text-white">{{
                    t("admin.settings.security.stepUp")
                  }}</label>
                  <p class="text-sm text-slate-400 dark:text-slate-400">
                    {{ t("admin.settings.security.stepUpHint") }}
                  </p>
                </div>
                <Toggle v-model="form.step_up_enabled" />
              </div>

              <!-- 会话 IP/UA 绑定 -->
              <div
                class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <div>
                  <label class="font-medium text-slate-900 dark:text-white">{{
                    t("admin.settings.security.sessionBinding")
                  }}</label>
                  <p class="text-sm text-slate-400 dark:text-slate-400">
                    {{ t("admin.settings.security.sessionBindingHint") }}
                  </p>
                </div>
                <Toggle v-model="form.session_binding_enabled" />
              </div>

              <!-- 审计日志保留天数 -->
              <div
                class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
              >
                <div>
                  <label class="font-medium text-slate-900 dark:text-white">{{
                    t("admin.settings.security.auditRetention")
                  }}</label>
                  <p class="text-sm text-slate-400 dark:text-slate-400">
                    {{ t("admin.settings.security.auditRetentionHint") }}
                  </p>
                </div>
                <input
                  v-model.number="form.audit_log_retention_days"
                  type="number"
                  min="0"
                  class="input w-28 text-right"
                />
              </div>
            </div>
          </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import Icon from '@/components/icons/Icon.vue'
import Toggle from '@/components/common/Toggle.vue'
import {
  isRegistrationEmailSuffixDomainValid,
  normalizeRegistrationEmailSuffixDomain,
  parseRegistrationEmailSuffixWhitelistInput,
} from '@/utils/registrationEmailPolicy'

interface RegistrationSecurityForm {
  registration_enabled: boolean
  email_verify_enabled: boolean
  registration_email_domain_quota_enabled: boolean
  promo_code_enabled: boolean
  invitation_code_enabled: boolean
  password_reset_enabled: boolean
  frontend_url: string
  totp_enabled: boolean
  totp_encryption_key_configured: boolean
  passkey_enabled: boolean
  passkey_configured: boolean
  passkey_rp_id: string
  passkey_rp_origins: string[]
  step_up_enabled: boolean
  session_binding_enabled: boolean
  audit_log_retention_days: number
}

const props = defineProps<{
  form: RegistrationSecurityForm
  emailSuffixTags: string[]
  emailSuffixDraft: string
}>()

const emit = defineEmits<{
  'update:emailSuffixTags': [value: string[]]
  'update:emailSuffixDraft': [value: string]
}>()

const { t } = useI18n()
const form = toRef(props, 'form')
const emailSuffixTagsState = ref([...props.emailSuffixTags])
const emailSuffixDraftState = ref(props.emailSuffixDraft)

watch(
  () => props.emailSuffixTags,
  (value) => {
    if (value !== emailSuffixTagsState.value) {
      emailSuffixTagsState.value = [...value]
    }
  },
)
watch(
  () => props.emailSuffixDraft,
  (value) => {
    if (value !== emailSuffixDraftState.value) {
      emailSuffixDraftState.value = value
    }
  },
)

const registrationEmailSuffixWhitelistTags = computed({
  get: () => emailSuffixTagsState.value,
  set: (value: string[]) => {
    emailSuffixTagsState.value = value
    emit('update:emailSuffixTags', value)
  },
})
const registrationEmailSuffixWhitelistDraft = computed({
  get: () => emailSuffixDraftState.value,
  set: (value: string) => {
    emailSuffixDraftState.value = value
    emit('update:emailSuffixDraft', value)
  },
})

const registrationEmailSuffixWhitelistSeparatorKeys = new Set([
  " ",
  ",",
  "，",
  "Enter",
  "Tab",
]);

function removeRegistrationEmailSuffixWhitelistTag(suffix: string) {
  registrationEmailSuffixWhitelistTags.value =
    registrationEmailSuffixWhitelistTags.value.filter(
      (item) => item !== suffix,
    );
}

function addRegistrationEmailSuffixWhitelistTag(raw: string) {
  const suffix = normalizeRegistrationEmailSuffixDomain(raw);
  if (
    !isRegistrationEmailSuffixDomainValid(suffix) ||
    registrationEmailSuffixWhitelistTags.value.includes(suffix)
  ) {
    return;
  }
  registrationEmailSuffixWhitelistTags.value = [
    ...registrationEmailSuffixWhitelistTags.value,
    suffix,
  ];
}

function commitRegistrationEmailSuffixWhitelistDraft() {
  if (!registrationEmailSuffixWhitelistDraft.value) {
    return;
  }
  addRegistrationEmailSuffixWhitelistTag(
    registrationEmailSuffixWhitelistDraft.value,
  );
  registrationEmailSuffixWhitelistDraft.value = "";
}

function handleRegistrationEmailSuffixWhitelistDraftInput() {
  registrationEmailSuffixWhitelistDraft.value =
    normalizeRegistrationEmailSuffixDomain(
      registrationEmailSuffixWhitelistDraft.value,
    );
}

function handleRegistrationEmailSuffixWhitelistDraftKeydown(
  event: KeyboardEvent,
) {
  if (event.isComposing) {
    return;
  }

  if (registrationEmailSuffixWhitelistSeparatorKeys.has(event.key)) {
    event.preventDefault();
    commitRegistrationEmailSuffixWhitelistDraft();
    return;
  }

  if (
    event.key === "Backspace" &&
    !registrationEmailSuffixWhitelistDraft.value &&
    registrationEmailSuffixWhitelistTags.value.length > 0
  ) {
    registrationEmailSuffixWhitelistTags.value =
      registrationEmailSuffixWhitelistTags.value.slice(0, -1);
  }
}

function handleRegistrationEmailSuffixWhitelistPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData("text") || "";
  if (!text.trim()) {
    return;
  }
  event.preventDefault();
  const tokens = parseRegistrationEmailSuffixWhitelistInput(text);
  for (const token of tokens) {
    addRegistrationEmailSuffixWhitelistTag(token);
  }
}
</script>