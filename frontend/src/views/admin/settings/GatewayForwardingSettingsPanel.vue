<template>
<!-- Gateway Forwarding Behavior -->
<div class="card">
  <div
    class="border-b border-slate-100 px-6 py-4 dark:border-slate-800"
  >
    <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
      {{ t("admin.settings.gatewayForwarding.title") }}
    </h2>
    <p class="mt-1 text-sm text-slate-400 dark:text-slate-400">
      {{ t("admin.settings.gatewayForwarding.description") }}
    </p>
  </div>
  <div class="space-y-5 p-6">
    <div class="grid gap-5 border-b border-slate-100 pb-5 dark:border-slate-800 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div>
        <label
          for="grok-default-text-model"
          class="text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{ t("admin.settings.gatewayForwarding.grokDefaultTextModel") }}
        </label>
        <input
          id="grok-default-text-model"
          v-model.trim="form.grok_default_text_model"
          type="text"
          class="input mt-2 w-full"
          list="grok-default-text-model-options"
          data-testid="grok-default-text-model"
          placeholder="grok-4.5"
        />
        <datalist id="grok-default-text-model-options">
          <option value="grok-4.5" />
          <option value="grok-4.1-fast" />
          <option value="grok-4" />
        </datalist>
        <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
          {{ t("admin.settings.gatewayForwarding.grokDefaultTextModelHint") }}
        </p>
      </div>
      <div class="flex items-center justify-between gap-5 md:min-w-72">
        <div>
          <label class="text-sm font-medium text-slate-700 dark:text-gray-300">
            {{ t("admin.settings.gatewayForwarding.grokCrossClientMap") }}
          </label>
          <p class="mt-0.5 max-w-sm text-xs text-slate-400 dark:text-slate-400">
            {{ t("admin.settings.gatewayForwarding.grokCrossClientMapHint") }}
          </p>
        </div>
        <Toggle
          v-model="form.grok_cross_client_model_map_enabled"
          data-testid="grok-cross-client-model-map-toggle"
        />
      </div>
      </div>
      <div class="md:col-span-2">
        <label
          for="grok-default-base-url-mode"
          class="text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{ t("admin.settings.gatewayForwarding.grokDefaultBaseURLMode") }}
        </label>
        <select
          id="grok-default-base-url-mode"
          v-model="form.grok_default_base_url_mode"
          class="input mt-2 w-full"
          data-testid="grok-default-base-url-mode"
        >
          <option value="cli">{{ t("admin.settings.gatewayForwarding.grokBaseURLModeCLI") }}</option>
          <option value="api">{{ t("admin.settings.gatewayForwarding.grokBaseURLModeAPI") }}</option>
          <option value="us-east-1">{{ t("admin.settings.gatewayForwarding.grokBaseURLModeUSEast1") }}</option>
          <option value="us-west-2">{{ t("admin.settings.gatewayForwarding.grokBaseURLModeUSWest2") }}</option>
          <option value="eu-west-1">{{ t("admin.settings.gatewayForwarding.grokBaseURLModeEUWest1") }}</option>
        </select>
        <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
          {{ t("admin.settings.gatewayForwarding.grokDefaultBaseURLModeHint") }}
        </p>
      </div>

    <!-- Fingerprint Unification -->
    <div class="flex items-center justify-between">
      <div>
        <label
          class="text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{
            t(
              "admin.settings.gatewayForwarding.fingerprintUnification",
            )
          }}
        </label>
        <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-400">
          {{
            t(
              "admin.settings.gatewayForwarding.fingerprintUnificationHint",
            )
          }}
        </p>
      </div>
      <Toggle v-model="form.enable_fingerprint_unification" />
    </div>

    <!-- Metadata Passthrough -->
    <div class="flex items-center justify-between">
      <div>
        <label
          class="text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{
            t("admin.settings.gatewayForwarding.metadataPassthrough")
          }}
        </label>
        <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-400">
          {{
            t(
              "admin.settings.gatewayForwarding.metadataPassthroughHint",
            )
          }}
        </p>
      </div>
      <Toggle v-model="form.enable_metadata_passthrough" />
    </div>

    <!-- CCH Signing -->
    <div class="flex items-center justify-between">
      <div>
        <label
          class="text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{ t("admin.settings.gatewayForwarding.cchSigning") }}
        </label>
        <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-400">
          {{ t("admin.settings.gatewayForwarding.cchSigningHint") }}
        </p>
      </div>
      <Toggle v-model="form.enable_cch_signing" />
    </div>

    <!-- Claude OAuth System Prompt Injection -->
    <div class="flex items-center justify-between">
      <div>
        <label
          class="text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{
            t(
              "admin.settings.gatewayForwarding.claudeOAuthSystemPromptInjection",
            )
          }}
        </label>
        <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-400">
          {{
            t(
              "admin.settings.gatewayForwarding.claudeOAuthSystemPromptInjectionHint",
            )
          }}
        </p>
      </div>
      <Toggle
        v-model="form.enable_claude_oauth_system_prompt_injection"
      />
    </div>

    <div>
      <label
        class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
      >
        {{
          t(
            "admin.settings.gatewayForwarding.claudeOAuthSystemPromptBlocks",
          )
        }}
      </label>
      <div class="space-y-3">
        <div
          v-for="(block, index) in claudeOAuthSystemPromptBlocks"
          :key="block.id"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
        >
          <div
            :class="[
              'flex flex-wrap items-center justify-between gap-3',
              block.expanded && 'mb-3',
            ]"
          >
            <div class="min-w-0">
              <div
                class="text-sm font-medium text-slate-900 dark:text-white"
              >
                {{
                  t(
                    "admin.settings.gatewayForwarding.systemBlockTitle",
                    { index: index + 1 },
                  )
                }}
              </div>
              <div
                class="mt-0.5 text-xs text-slate-400 dark:text-slate-400"
              >
                {{ getClaudeOAuthPresetLabel(block.preset) }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn btn-secondary btn-sm px-2"
                :title="
                  block.expanded
                    ? t(
                        'admin.settings.gatewayForwarding.systemBlockHide',
                      )
                    : t(
                        'admin.settings.gatewayForwarding.systemBlockShow',
                      )
                "
                :aria-label="
                  block.expanded
                    ? t(
                        'admin.settings.gatewayForwarding.systemBlockHide',
                      )
                    : t(
                        'admin.settings.gatewayForwarding.systemBlockShow',
                      )
                "
                @click="toggleClaudeOAuthSystemPromptBlock(index)"
              >
                <Icon
                  :name="block.expanded ? 'eyeOff' : 'eye'"
                  size="xs"
                />
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm px-2"
                :disabled="index === 0"
                @click="moveClaudeOAuthSystemPromptBlock(index, -1)"
              >
                <Icon name="arrowUp" size="xs" />
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm px-2"
                :disabled="
                  index === claudeOAuthSystemPromptBlocks.length - 1
                "
                @click="moveClaudeOAuthSystemPromptBlock(index, 1)"
              >
                <Icon name="arrowDown" size="xs" />
              </button>
              <Toggle v-model="block.enabled" />
              <button
                type="button"
                class="btn btn-secondary btn-sm px-2 text-red-600 hover:text-red-700 dark:text-red-400"
                @click="removeClaudeOAuthSystemPromptBlock(index)"
              >
                <Icon name="trash" size="xs" />
              </button>
            </div>
          </div>

          <div v-show="block.expanded">
            <div class="grid gap-3 md:grid-cols-2">
              <div>
                <label
                  class="mb-1 block text-xs font-medium text-slate-600 dark:text-gray-300"
                >
                  {{
                    t(
                      "admin.settings.gatewayForwarding.systemBlockPreset",
                    )
                  }}
                </label>
                <Select
                  v-model="block.preset"
                  :options="claudeOAuthSystemPromptPresetOptions"
                  @change="
                    (value) =>
                      applyClaudeOAuthSystemPromptPreset(index, value)
                  "
                />
              </div>
              <div>
                <label
                  class="mb-1 block text-xs font-medium text-slate-600 dark:text-gray-300"
                >
                  {{
                    t(
                      "admin.settings.gatewayForwarding.systemBlockType",
                    )
                  }}
                </label>
                <Select
                  v-model="block.type"
                  :options="claudeOAuthSystemPromptBlockTypeOptions"
                />
              </div>
            </div>

            <div class="mt-3">
              <label
                class="mb-1 block text-xs font-medium text-slate-600 dark:text-gray-300"
              >
                {{ t("admin.settings.gatewayForwarding.systemBlockText") }}
              </label>
              <textarea
                v-model="block.text"
                rows="6"
                class="input w-full resize-y font-mono text-xs leading-5"
                @input="markClaudeOAuthSystemPromptBlockCustom(block)"
              />
            </div>

            <div
              class="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]"
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <label
                    class="text-xs font-medium text-slate-600 dark:text-gray-300"
                  >
                    {{
                      t(
                        "admin.settings.gatewayForwarding.systemBlockCacheControl",
                      )
                    }}
                  </label>
                </div>
                <Toggle v-model="block.cacheControlEnabled" />
              </div>
              <div v-if="block.cacheControlEnabled">
                <Select
                  v-model="block.cacheControlTTL"
                  :options="claudeOAuthSystemPromptCacheTTLOptions"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          data-testid="add-system-prompt-block"
          @click="addClaudeOAuthSystemPromptBlock"
        >
          <Icon name="plus" size="xs" />
          {{ t("admin.settings.gatewayForwarding.addSystemBlock") }}
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          @click="resetClaudeOAuthSystemPromptBlocks"
        >
          <Icon name="refresh" size="xs" />
          {{
            t("admin.settings.gatewayForwarding.resetSystemBlocks")
          }}
        </button>
      </div>
      <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
        {{
          t(
            "admin.settings.gatewayForwarding.claudeOAuthSystemPromptBlocksHint",
          )
        }}
      </p>
    </div>

    <!-- Anthropic Cache TTL 1h Injection -->
    <div class="flex items-center justify-between">
      <div>
        <label
          class="text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{
            t(
              "admin.settings.gatewayForwarding.anthropicCacheTTL1hInjection",
            )
          }}
        </label>
        <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-400">
          {{
            t(
              "admin.settings.gatewayForwarding.anthropicCacheTTL1hInjectionHint",
            )
          }}
        </p>
      </div>
      <Toggle
        v-model="form.enable_anthropic_cache_ttl_1h_injection"
      />
    </div>

    <!-- messages cache_control 改写 -->
    <div class="flex items-center justify-between">
      <div>
        <label
          class="text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{
            t(
              "admin.settings.gatewayForwarding.rewriteMessageCacheControl",
            )
          }}
        </label>
        <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-400">
          {{
            t(
              "admin.settings.gatewayForwarding.rewriteMessageCacheControlHint",
            )
          }}
        </p>
      </div>
      <Toggle v-model="form.rewrite_message_cache_control" />
    </div>

    <!-- 客户端 dateline 归一化（仅 Anthropic OAuth/SetupToken） -->
    <div class="flex items-center justify-between">
      <div>
        <label
          class="text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{
            t(
              "admin.settings.gatewayForwarding.clientDatelineNormalization",
            )
          }}
        </label>
        <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-400">
          {{
            t(
              "admin.settings.gatewayForwarding.clientDatelineNormalizationHint",
            )
          }}
        </p>
      </div>
      <Toggle
        v-model="form.enable_client_dateline_normalization"
      />
    </div>

    <!-- Antigravity UA 版本 -->
    <div>
      <label
        class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
      >
        {{
          t(
            "admin.settings.gatewayForwarding.antigravityUserAgentVersion",
          )
        }}
      </label>
      <input
        v-model="form.antigravity_user_agent_version"
        type="text"
        class="input max-w-xs font-mono text-sm"
        :placeholder="
          t(
            'admin.settings.gatewayForwarding.antigravityUserAgentVersionPlaceholder',
          )
        "
      />
      <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
        {{
          t(
            "admin.settings.gatewayForwarding.antigravityUserAgentVersionHint",
          )
        }}
      </p>
    </div>

    <!-- OpenAI Codex UA -->
    <div>
      <label
        class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
      >
        {{
          t(
            "admin.settings.gatewayForwarding.openaiCodexUserAgent",
          )
        }}
      </label>
      <input
        v-model="form.openai_codex_user_agent"
        type="text"
        class="input w-full font-mono text-sm"
        :placeholder="
          t(
            'admin.settings.gatewayForwarding.openaiCodexUserAgentPlaceholder',
          )
        "
      />
      <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
        {{
          t(
            "admin.settings.gatewayForwarding.openaiCodexUserAgentHint",
          )
        }}
      </p>
    </div>

    <!-- Codex 客户端版本号 -->
    <div>
      <label
        class="mb-2 block text-sm font-medium text-slate-700 dark:text-gray-300"
      >
        {{
          t(
            "admin.settings.gatewayForwarding.openaiCodexClientVersion",
          )
        }}
      </label>
      <input
        v-model="form.openai_codex_client_version"
        type="text"
        class="input w-full font-mono text-sm"
        :placeholder="
          t(
            'admin.settings.gatewayForwarding.openaiCodexClientVersionPlaceholder',
          )
        "
      />
      <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-400">
        {{
          t(
            "admin.settings.gatewayForwarding.openaiCodexClientVersionHint",
          )
        }}
      </p>
    </div>

    <!-- Codex 版本号自动同步 -->
    <div class="flex items-center justify-between">
      <div>
        <label
          class="text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          {{
            t(
              "admin.settings.gatewayForwarding.openaiCodexVersionAutoSync",
            )
          }}
        </label>
        <p class="mt-0.5 text-xs text-slate-400 dark:text-slate-400">
          {{
            t(
              "admin.settings.gatewayForwarding.openaiCodexVersionAutoSyncHint",
            )
          }}
        </p>
        <p
          v-if="codexSyncedVersionLabel"
          class="mt-0.5 text-xs text-slate-400 dark:text-slate-400"
        >
          {{ codexSyncedVersionLabel }}
        </p>
      </div>
      <Toggle v-model="form.openai_codex_version_auto_sync_enabled" />
    </div>

  </div>
</div>
</template>

<script setup lang="ts">
import { toRefs } from "vue";
import { useI18n } from "vue-i18n";
import type { SystemSettings } from "@/api/admin/settings";
import Icon from "@/components/icons/Icon.vue";
import Select, { type SelectOption } from "@/components/common/Select.vue";
import Toggle from "@/components/common/Toggle.vue";

type GatewayForwardingSettingsForm = Pick<
  SystemSettings,
  | "grok_default_text_model"
  | "grok_cross_client_model_map_enabled"
  | "grok_default_base_url_mode"
  | "enable_fingerprint_unification"
  | "enable_metadata_passthrough"
  | "enable_cch_signing"
  | "enable_claude_oauth_system_prompt_injection"
  | "claude_oauth_system_prompt"
  | "claude_oauth_system_prompt_blocks"
  | "enable_anthropic_cache_ttl_1h_injection"
  | "rewrite_message_cache_control"
  | "enable_client_dateline_normalization"
  | "antigravity_user_agent_version"
  | "openai_codex_user_agent"
  | "openai_codex_client_version"
  | "openai_codex_version_auto_sync_enabled"
>;

type ClaudeOAuthSystemPromptPreset = "billing" | "system" | "expansion" | "custom";

interface ClaudeOAuthSystemPromptBlock {
  id: string;
  enabled: boolean;
  expanded: boolean;
  type: "text";
  preset: ClaudeOAuthSystemPromptPreset;
  text: string;
  cacheControlEnabled: boolean;
  cacheControlTTL: string;
}

const props = defineProps<{
  form: GatewayForwardingSettingsForm;
  promptBlocks: ClaudeOAuthSystemPromptBlock[];
  presetOptions: SelectOption[];
  blockTypeOptions: SelectOption[];
  cacheTTLOptions: SelectOption[];
  codexSyncedVersionLabel: string;
}>();

const emit = defineEmits<{
  addPromptBlock: [];
  togglePromptBlock: [index: number];
  removePromptBlock: [index: number];
  movePromptBlock: [index: number, direction: -1 | 1];
  applyPromptPreset: [
    index: number,
    value: string | number | boolean | null,
  ];
  markPromptBlockCustom: [block: ClaudeOAuthSystemPromptBlock];
  resetPromptBlocks: [];
}>();

const { t } = useI18n();
const {
  form,
  promptBlocks: claudeOAuthSystemPromptBlocks,
  presetOptions: claudeOAuthSystemPromptPresetOptions,
  blockTypeOptions: claudeOAuthSystemPromptBlockTypeOptions,
  cacheTTLOptions: claudeOAuthSystemPromptCacheTTLOptions,
  codexSyncedVersionLabel,
} = toRefs(props);

function getClaudeOAuthPresetLabel(
  preset: ClaudeOAuthSystemPromptPreset,
): string {
  return (
    claudeOAuthSystemPromptPresetOptions.value.find(
      (option) => option.value === preset,
    )?.label || t("admin.settings.gatewayForwarding.systemBlockPresetCustom")
  );
}

function addClaudeOAuthSystemPromptBlock(): void {
  emit("addPromptBlock");
}

function toggleClaudeOAuthSystemPromptBlock(index: number): void {
  emit("togglePromptBlock", index);
}

function removeClaudeOAuthSystemPromptBlock(index: number): void {
  emit("removePromptBlock", index);
}

function moveClaudeOAuthSystemPromptBlock(index: number, direction: -1 | 1): void {
  emit("movePromptBlock", index, direction);
}

function applyClaudeOAuthSystemPromptPreset(
  index: number,
  value: string | number | boolean | null,
): void {
  emit("applyPromptPreset", index, value);
}

function markClaudeOAuthSystemPromptBlockCustom(
  block: ClaudeOAuthSystemPromptBlock,
): void {
  emit("markPromptBlockCustom", block);
}

function resetClaudeOAuthSystemPromptBlocks(): void {
  emit("resetPromptBlocks");
}
</script>
