import { reactive } from "vue";
import { useI18n } from "vue-i18n";
import { adminAPI } from "@/api";
import type {
  WebSearchEmulationConfig,
  WebSearchProviderConfig,
  WebSearchTestResult,
} from "@/api/admin/settings";
import type { Proxy } from "@/types";
import { extractApiErrorMessage } from "@/utils/apiError";
import { useAppStore } from "@/stores";

const DEFAULT_WEB_SEARCH_QUOTA_LIMIT = 1000;

interface WebSearchEmulationSettingsState {
  config: WebSearchEmulationConfig;
  proxies: Proxy[];
  expandedProviders: Record<number, boolean>;
  apiKeyVisible: Record<number, boolean>;
  testQuery: string;
  testLoading: boolean;
  testResult: WebSearchTestResult | null;
  testDialogOpen: boolean;
}

export interface WebSearchEmulationSettingsController
  extends WebSearchEmulationSettingsState {
  openTestDialog(): void;
  toggleProviderExpand(index: number): void;
  removeProvider(index: number): void;
  addProvider(): void;
  formatSubscribedAt(timestamp: number | null): string;
  parseSubscribedAt(date: string): number | null;
  quotaPercentage(provider: WebSearchProviderConfig): number;
  resetUsage(index: number): Promise<void>;
  copyApiKey(index: number): Promise<void>;
  testProvider(): Promise<void>;
  load(): Promise<void>;
  save(): Promise<boolean>;
}

export function useWebSearchEmulationSettings(): WebSearchEmulationSettingsController {
  const { t } = useI18n();
  const appStore = useAppStore();
  const state = reactive<WebSearchEmulationSettingsState>({
    config: {
      enabled: false,
      providers: [],
    },
    proxies: [],
    expandedProviders: {},
    apiKeyVisible: {},
    testQuery: "",
    testLoading: false,
    testResult: null,
    testDialogOpen: false,
  });

  function openTestDialog(): void {
    state.testResult = null;
    state.testDialogOpen = true;
  }

  function toggleProviderExpand(index: number): void {
    state.expandedProviders[index] = !state.expandedProviders[index];
  }

  function removeProvider(index: number): void {
    state.config.providers.splice(index, 1);
    const newExpanded: Record<number, boolean> = {};
    const newVisible: Record<number, boolean> = {};
    for (let currentIndex = 0; currentIndex < state.config.providers.length; currentIndex++) {
      const previousIndex = currentIndex >= index ? currentIndex + 1 : currentIndex;
      newExpanded[currentIndex] = state.expandedProviders[previousIndex] ?? false;
      newVisible[currentIndex] = state.apiKeyVisible[previousIndex] ?? false;
    }
    Object.keys(state.expandedProviders).forEach(
      (key) => delete state.expandedProviders[Number(key)],
    );
    Object.keys(state.apiKeyVisible).forEach(
      (key) => delete state.apiKeyVisible[Number(key)],
    );
    Object.assign(state.expandedProviders, newExpanded);
    Object.assign(state.apiKeyVisible, newVisible);
  }

  function addProvider(): void {
    const index = state.config.providers.length;
    state.config.providers.push({
      type: "brave",
      api_key: "",
      api_key_configured: false,
      quota_limit: DEFAULT_WEB_SEARCH_QUOTA_LIMIT,
      subscribed_at: null,
      proxy_id: null,
      expires_at: null,
    });
    state.expandedProviders[index] = true;
  }

  function formatSubscribedAt(timestamp: number | null): string {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseSubscribedAt(date: string): number | null {
    if (!date) return null;
    return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 1000);
  }

  function quotaPercentage(provider: WebSearchProviderConfig): number {
    if (!provider.quota_limit || provider.quota_limit <= 0) return 0;
    return ((provider.quota_used ?? 0) / provider.quota_limit) * 100;
  }

  async function resetUsage(index: number): Promise<void> {
    const provider = state.config.providers[index];
    if (!provider) return;
    if (!confirm(t("admin.settings.webSearchEmulation.resetUsageConfirm"))) return;
    try {
      await adminAPI.settings.resetWebSearchUsage({
        provider_type: provider.type,
      });
      provider.quota_used = 0;
      appStore.showSuccess(
        t("admin.settings.webSearchEmulation.resetUsageSuccess"),
      );
    } catch (error: unknown) {
      appStore.showError(extractApiErrorMessage(error, t("common.error")));
    }
  }

  async function copyApiKey(index: number): Promise<void> {
    const key = state.config.providers[index]?.api_key;
    if (!key) {
      appStore.showError(
        t("admin.settings.webSearchEmulation.apiKeyPlaceholder"),
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(key);
      appStore.showSuccess(t("admin.settings.webSearchEmulation.copied"));
    } catch {
      appStore.showError(t("common.error"));
    }
  }

  async function testProvider(): Promise<void> {
    state.testLoading = true;
    state.testResult = null;
    try {
      const query =
        state.testQuery.trim() ||
        t("admin.settings.webSearchEmulation.testDefaultQuery");
      state.testResult = await adminAPI.settings.testWebSearchEmulation(query);
    } catch (error: unknown) {
      appStore.showError(extractApiErrorMessage(error, t("common.error")));
    } finally {
      state.testLoading = false;
    }
  }

  async function load(): Promise<void> {
    try {
      const [response, proxiesResponse] = await Promise.all([
        adminAPI.settings.getWebSearchEmulationConfig(),
        adminAPI.proxies.list().catch(() => ({ items: [] as Proxy[] })),
      ]);
      if (response) {
        state.config.enabled = response.enabled || false;
        state.config.providers = response.providers || [];
      }
      state.proxies = proxiesResponse.items || [];
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status !== 404 && status !== undefined) {
        appStore.showError(extractApiErrorMessage(error, t("common.error")));
      }
    }
  }

  async function save(): Promise<boolean> {
    try {
      for (const provider of state.config.providers) {
        const raw = provider.quota_limit;
        if (raw != null && Number(raw) !== 0 && Number(raw) < 1) {
          appStore.showError(
            t("admin.settings.webSearchEmulation.quotaLimitMustBePositive"),
          );
          return false;
        }
      }
      const providers = state.config.providers.map(
        (provider: WebSearchProviderConfig) => ({
          ...provider,
          quota_limit:
            Number(provider.quota_limit) > 0
              ? Number(provider.quota_limit)
              : null,
        }),
      );
      await adminAPI.settings.updateWebSearchEmulationConfig({
        enabled: state.config.enabled,
        providers,
      });
      return true;
    } catch (error: unknown) {
      appStore.showError(extractApiErrorMessage(error, t("common.error")));
      return false;
    }
  }

  return {
    get config() {
      return state.config;
    },
    set config(value) {
      state.config = value;
    },
    get proxies() {
      return state.proxies;
    },
    set proxies(value) {
      state.proxies = value;
    },
    get expandedProviders() {
      return state.expandedProviders;
    },
    set expandedProviders(value) {
      state.expandedProviders = value;
    },
    get apiKeyVisible() {
      return state.apiKeyVisible;
    },
    set apiKeyVisible(value) {
      state.apiKeyVisible = value;
    },
    get testQuery() {
      return state.testQuery;
    },
    set testQuery(value) {
      state.testQuery = value;
    },
    get testLoading() {
      return state.testLoading;
    },
    set testLoading(value) {
      state.testLoading = value;
    },
    get testResult() {
      return state.testResult;
    },
    set testResult(value) {
      state.testResult = value;
    },
    get testDialogOpen() {
      return state.testDialogOpen;
    },
    set testDialogOpen(value) {
      state.testDialogOpen = value;
    },
    openTestDialog,
    toggleProviderExpand,
    removeProvider,
    addProvider,
    formatSubscribedAt,
    parseSubscribedAt,
    quotaPercentage,
    resetUsage,
    copyApiKey,
    testProvider,
    load,
    save,
  };
}
