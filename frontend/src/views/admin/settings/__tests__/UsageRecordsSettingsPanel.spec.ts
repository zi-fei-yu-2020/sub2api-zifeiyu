import { nextTick, reactive } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import UsageRecordsSettingsPanel from "../UsageRecordsSettingsPanel.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

function mountPanel(enabled = false) {
  const form = reactive({ allow_user_view_error_requests: enabled });
  const wrapper = mount(UsageRecordsSettingsPanel, { props: { form } });
  return { wrapper, form };
}

describe("UsageRecordsSettingsPanel", () => {
  it("preserves the usage records card and native toggle markup", () => {
    const { wrapper } = mountPanel();
    expect(wrapper.classes()).toContain("card");
    expect(wrapper.findAll("input")).toHaveLength(1);
    expect(wrapper.get('input[type="checkbox"]').exists()).toBe(true);
    expect(wrapper.get("label.toggle").exists()).toBe(true);
    expect(wrapper.get(".toggle-slider").exists()).toBe(true);
    expect(wrapper.text()).toContain("admin.settings.usageRecords.title");
    expect(wrapper.text()).toContain("admin.settings.user_error_view.label");
  });

  it("keeps the error-request visibility setting directly bound", async () => {
    const { wrapper, form } = mountPanel();
    await wrapper.get('input[type="checkbox"]').setValue(true);
    expect(form.allow_user_view_error_requests).toBe(true);
  });

  it("reflects parent form updates without recreating the panel", async () => {
    const { wrapper, form } = mountPanel();
    form.allow_user_view_error_requests = true;
    await nextTick();
    expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true);
  });
});
