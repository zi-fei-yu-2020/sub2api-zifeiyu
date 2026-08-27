import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import LoginAgreementSettingsPanel from "../LoginAgreementSettingsPanel.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ locale: { value: "zh-CN" } }),
}));

function createForm() {
  return {
    login_agreement_enabled: true,
    login_agreement_mode: "modal",
    login_agreement_updated_at: "2026-03-31",
    login_agreement_documents: [
      {
        id: "terms",
        title: "\u670d\u52a1\u6761\u6b3e",
        content_md: "\u6761\u6b3e\u5185\u5bb9",
      },
    ],
  };
}

function mountPanel(form = createForm()) {
  return mount(LoginAgreementSettingsPanel, {
    props: { form },
    global: {
      stubs: {
        Icon: true,
        Toggle: true,
      },
    },
  });
}

describe("LoginAgreementSettingsPanel", () => {
  it("keeps mode, route and markdown fields bound to the original form", async () => {
    const form = createForm();
    const wrapper = mountPanel(form);

    expect(wrapper.text()).toContain("/legal/terms");
    await wrapper
      .get('[data-testid="agreement-mode-checkbox"]')
      .trigger("click");
    await wrapper
      .get("textarea")
      .setValue("\u66f4\u65b0\u540e\u7684\u6761\u6b3e");

    expect(form.login_agreement_mode).toBe("checkbox");
    expect(form.login_agreement_documents[0]?.content_md).toBe(
      "\u66f4\u65b0\u540e\u7684\u6761\u6b3e",
    );
  });

  it("preserves add/remove behavior and the last-document guard", async () => {
    const form = createForm();
    const wrapper = mountPanel(form);

    expect(
      wrapper.get('[data-testid="remove-agreement-document"]').attributes("disabled"),
    ).toBeDefined();
    await wrapper.get('[data-testid="add-agreement-document"]').trigger("click");
    expect(form.login_agreement_documents).toHaveLength(2);

    const deleteButtons = wrapper.findAll(
      '[data-testid="remove-agreement-document"]',
    );
    await deleteButtons.at(-1)!.trigger("click");

    expect(form.login_agreement_documents).toHaveLength(1);
  });
});
