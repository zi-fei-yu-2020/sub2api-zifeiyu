import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import WebSearchEmulationSettingsPanel from "../WebSearchEmulationSettingsPanel.vue";
import { useWebSearchEmulationSettings } from "../useWebSearchEmulationSettings";

const {
  getConfig,
  updateConfig,
  listProxies,
  resetUsage,
  testProvider,
  showError,
  showSuccess,
} = vi.hoisted(() => ({
  getConfig: vi.fn(),
  updateConfig: vi.fn(),
  listProxies: vi.fn(),
  resetUsage: vi.fn(),
  testProvider: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("vue-i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("vue-i18n")>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
  };
});

vi.mock("@/api", () => ({
  adminAPI: {
    settings: {
      getWebSearchEmulationConfig: getConfig,
      updateWebSearchEmulationConfig: updateConfig,
      resetWebSearchUsage: resetUsage,
      testWebSearchEmulation: testProvider,
    },
    proxies: {
      list: listProxies,
    },
  },
}));

vi.mock("@/stores", () => ({
  useAppStore: () => ({ showError, showSuccess }),
}));

vi.mock("@/utils/apiError", () => ({
  extractApiErrorMessage: () => "error",
}));

function mountPanel() {
  let controller!: ReturnType<typeof useWebSearchEmulationSettings>;
  const Host = defineComponent({
    components: { WebSearchEmulationSettingsPanel },
    setup() {
      controller = useWebSearchEmulationSettings();
      return { controller };
    },
    template:
      '<WebSearchEmulationSettingsPanel :controller="controller" />',
  });
  const wrapper = mount(Host, {
    global: {
      stubs: {
        Select: true,
        Toggle: true,
        ProxySelector: true,
      },
    },
  });
  return { wrapper, controller };
}

describe("WebSearchEmulationSettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockResolvedValue({
      enabled: true,
      providers: [
        {
          type: "brave",
          api_key: "secret",
          api_key_configured: true,
          quota_limit: 1000,
          quota_used: 25,
          subscribed_at: 1_725_000_000,
          proxy_id: null,
          expires_at: null,
        },
      ],
    });
    listProxies.mockResolvedValue({ items: [{ id: 7, name: "proxy" }] });
    updateConfig.mockImplementation(async (payload) => payload);
  });

  it("loads the separate config and keeps the extracted provider UI intact", async () => {
    const { wrapper, controller } = mountPanel();

    await controller.load();
    await flushPromises();

    expect(getConfig).toHaveBeenCalledTimes(1);
    expect(listProxies).toHaveBeenCalledTimes(1);
    expect(controller.config.enabled).toBe(true);
    expect(controller.proxies).toHaveLength(1);
    expect(wrapper.text()).toContain("admin.settings.webSearchEmulation.title");
    expect(wrapper.text()).toContain("25 / 1000");
  });

  it("preserves provider defaults and the standalone save payload", async () => {
    const { wrapper, controller } = mountPanel();
    controller.config.enabled = true;
    await nextTick();

    await wrapper.get('[data-testid="add-web-search-provider"]').trigger("click");

    expect(controller.config.providers[0]).toMatchObject({
      type: "brave",
      quota_limit: 1000,
      proxy_id: null,
    });

    controller.config.providers[0]!.quota_limit = 0;
    expect(await controller.save()).toBe(true);
    expect(updateConfig).toHaveBeenCalledWith({
      enabled: true,
      providers: [
        expect.objectContaining({
          type: "brave",
          quota_limit: null,
        }),
      ],
    });
  });
});
