import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import GatewayForwardingSettingsPanel from "../GatewayForwardingSettingsPanel.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

function createForm() {
  return {
    grok_default_text_model: "grok-4.5",
    grok_cross_client_model_map_enabled: true,
    grok_default_base_url_mode: "cli",
    enable_fingerprint_unification: true,
    enable_metadata_passthrough: false,
    enable_cch_signing: false,
    enable_claude_oauth_system_prompt_injection: true,
    claude_oauth_system_prompt: "prompt",
    claude_oauth_system_prompt_blocks: "[]",
    enable_anthropic_cache_ttl_1h_injection: false,
    rewrite_message_cache_control: false,
    enable_client_dateline_normalization: true,
    antigravity_user_agent_version: "1.0.0",
    openai_codex_user_agent: "codex-cli",
    openai_codex_client_version: "1.2.3",
    openai_codex_version_auto_sync_enabled: true,
  };
}

const promptBlocks = [
  {
    id: "block-1",
    enabled: true,
    expanded: true,
    type: "text" as const,
    preset: "custom" as const,
    text: "custom prompt",
    cacheControlEnabled: false,
    cacheControlTTL: "5m",
  },
];

function mountPanel(form = createForm()) {
  return mount(GatewayForwardingSettingsPanel, {
    props: {
      form,
      promptBlocks,
      presetOptions: [{ value: "custom", label: "Custom" }],
      blockTypeOptions: [{ value: "text", label: "Text" }],
      cacheTTLOptions: [{ value: "5m", label: "5m" }],
      codexSyncedVersionLabel: "Synced 1.2.3",
    },
    global: {
      stubs: {
        Icon: true,
        Select: true,
        Toggle: true,
      },
    },
  });
}

describe("GatewayForwardingSettingsPanel", () => {
  it("keeps the original forwarding fields bound to the parent form", async () => {
    const form = createForm();
    const wrapper = mountPanel(form);

    await wrapper
      .get('[data-testid="grok-default-text-model"]')
      .setValue("grok-4.1-fast");
    await wrapper
      .get('[data-testid="grok-default-base-url-mode"]')
      .setValue("api");

    expect(form.grok_default_text_model).toBe("grok-4.1-fast");
    expect(form.grok_default_base_url_mode).toBe("api");
    expect(wrapper.text()).toContain("Synced 1.2.3");
  });

  it("forwards prompt-block actions without changing their payload", async () => {
    const wrapper = mountPanel();
    await wrapper.get('[data-testid="add-system-prompt-block"]').trigger("click");

    expect(wrapper.emitted("addPromptBlock")).toEqual([[]]);
  });
});
