import { reactive } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import GatewaySchedulingSettingsPanel from "../GatewaySchedulingSettingsPanel.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const platforms = ["openai", "anthropic", "grok", "kimi", "zhipu"] as const;
const weightKeys = [
  "openai_advanced_scheduler_lb_top_k",
  "openai_advanced_scheduler_weight_priority",
  "openai_advanced_scheduler_weight_load",
  "openai_advanced_scheduler_weight_queue",
  "openai_advanced_scheduler_weight_error_rate",
  "openai_advanced_scheduler_weight_ttft",
  "openai_advanced_scheduler_weight_reset",
  "openai_advanced_scheduler_weight_quota_headroom",
  "openai_advanced_scheduler_weight_upstream_cost",
  "openai_advanced_scheduler_weight_previous_response",
  "openai_advanced_scheduler_weight_session_sticky",
] as const;

function mountPanel() {
  const form = reactive({
    allow_ungrouped_key_scheduling: false,
    account_scheduling_thresholds: {
      openai: 100,
      anthropic: 90,
      grok: 80,
      kimi: 70,
      zhipu: 60,
    },
    openai_low_upstream_rate_priority_enabled: false,
    openai_oauth_scheduling_rate_multiplier: 1,
    openai_advanced_scheduler_enabled: false,
    openai_advanced_scheduler_sticky_weighted_enabled: false,
    openai_advanced_scheduler_subscription_priority_enabled: false,
    openai_advanced_scheduler_lb_top_k: "",
    openai_advanced_scheduler_weight_priority: "",
    openai_advanced_scheduler_weight_load: "",
    openai_advanced_scheduler_weight_queue: "",
    openai_advanced_scheduler_weight_error_rate: "",
    openai_advanced_scheduler_weight_ttft: "",
    openai_advanced_scheduler_weight_reset: "",
    openai_advanced_scheduler_weight_quota_headroom: "",
    openai_advanced_scheduler_weight_upstream_cost: "",
    openai_advanced_scheduler_weight_previous_response: "",
    openai_advanced_scheduler_weight_session_sticky: "",
  });
  const openAIAdvancedSchedulerWeightFields = weightKeys.map((key, index) => ({
    key,
    label: `weight-${index}`,
    placeholder: `default-${index}`,
  }));
  const wrapper = mount(GatewaySchedulingSettingsPanel, {
    props: {
      form,
      schedulingThresholdPlatforms: platforms,
      openAIAdvancedSchedulerWeightFields,
    },
  });
  return { wrapper, form };
}

describe("GatewaySchedulingSettingsPanel", () => {
  it("preserves the scheduling card, platform thresholds and legacy mode order", () => {
    const { wrapper } = mountPanel();
    expect(wrapper.classes()).toContain("card");
    expect(wrapper.findAll('[data-testid^="account-scheduling-threshold-"]')).toHaveLength(5);
    expect(wrapper.get('[data-testid="openai-low-rate-priority-toggle"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="openai-advanced-scheduler-toggle"]').exists()).toBe(true);
    expect(wrapper.findAll('input[inputmode="decimal"]')).toHaveLength(0);
    expect(wrapper.text().indexOf("admin.settings.scheduling.title")).toBeLessThan(
      wrapper.text().indexOf("admin.settings.openaiExperimentalScheduler.title"),
    );
  });

  it("keeps ungrouped, threshold and legacy rate controls directly bound", async () => {
    const { wrapper, form } = mountPanel();
    const switches = wrapper.findAll('[role="switch"]');
    await switches[0].trigger("click");
    await wrapper.get('[data-testid="account-scheduling-threshold-openai"]').setValue("73");
    await wrapper.get('[data-testid="openai-low-rate-priority-toggle"]').trigger("click");
    await wrapper.get('[data-testid="openai-oauth-scheduling-rate-multiplier"]').setValue("0.05");

    expect(form.allow_ungrouped_key_scheduling).toBe(true);
    expect(form.account_scheduling_thresholds.openai).toBe(73);
    expect(form.openai_low_upstream_rate_priority_enabled).toBe(true);
    expect(form.openai_oauth_scheduling_rate_multiplier).toBe(0.05);
  });

  it("switches to advanced scheduling without changing weighted controls", async () => {
    const { wrapper, form } = mountPanel();
    await wrapper.get('[data-testid="openai-advanced-scheduler-toggle"]').trigger("click");

    expect(wrapper.find('[data-testid="openai-low-rate-priority-toggle"]').exists()).toBe(false);
    expect(wrapper.findAll('input[inputmode="decimal"]')).toHaveLength(11);
    expect(wrapper.findAll('[role="switch"]')).toHaveLength(4);

    await wrapper.findAll('[role="switch"]')[2].trigger("click");
    await wrapper.findAll('[role="switch"]')[3].trigger("click");
    await wrapper.findAll('input[inputmode="decimal"]')[0].setValue("9");

    expect(form.openai_advanced_scheduler_enabled).toBe(true);
    expect(form.openai_advanced_scheduler_sticky_weighted_enabled).toBe(true);
    expect(form.openai_advanced_scheduler_subscription_priority_enabled).toBe(true);
    expect(form.openai_advanced_scheduler_lb_top_k).toBe("9");
  });
});
