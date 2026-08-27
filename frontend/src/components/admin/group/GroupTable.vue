<template>
<DataTable
  :columns="columns"
  :data="groups"
  :loading="loading"
  :server-side-sort="true"
  default-sort-key="sort_order"
  default-sort-order="asc"
  @sort="handleSort"
>
  <template #cell-name="{ row, value }">
    <div class="flex items-center gap-3 py-1">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/70 text-primary-600 font-bold text-sm shadow-sm ring-1 ring-blue-100/80 dark:from-blue-950/40 dark:to-dark-800 dark:text-primary-400 dark:ring-dark-700">
        <Icon name="grid" size="sm" />
      </div>
      <div class="flex flex-col min-w-0">
        <span class="font-semibold text-slate-900 dark:text-white truncate max-w-[220px]" :title="value">
          {{ value }}
        </span>
        <span v-if="row.description" class="text-xs text-slate-400 dark:text-slate-400 truncate max-w-[240px]" :title="row.description">
          {{ row.description }}
        </span>
      </div>
    </div>
  </template>

  <template #cell-id="{ value }">
    <span class="font-mono text-xs text-slate-400 dark:text-slate-400"
      >#{{ value }}</span
    >
  </template>

  <template #cell-platform="{ value }">
    <span
      :class="[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        value === 'anthropic'
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          : value === 'openai'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : value === 'antigravity'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
              : value === 'grok'
                ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100'
                : value === 'kimi'
                  ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                  : value === 'zhipu'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : value === 'deepseek'
                      ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      ]"
    >
      <PlatformIcon :platform="value" size="xs" />
      {{ t("admin.groups.platforms." + value) }}
    </span>
  </template>

  <template #cell-billing_type="{ row }">
    <div class="space-y-1">
      <!-- Type Badge -->
      <span
        :class="[
          'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
          row.subscription_type === 'subscription'
            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
            : 'bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-gray-300',
        ]"
      >
        {{
          row.subscription_type === "subscription"
            ? t("admin.groups.subscription.subscription")
            : t("admin.groups.subscription.standard")
        }}
      </span>
      <!-- Subscription Limits - compact single line -->
      <div
        v-if="row.subscription_type === 'subscription'"
        class="space-y-0.5 text-xs text-slate-400 dark:text-slate-400"
      >
        <div
          v-if="
            row.daily_limit_usd ||
            row.weekly_limit_usd ||
            row.monthly_limit_usd
          "
          class="flex flex-wrap items-center gap-x-1 gap-y-0.5"
        >
          <span v-if="row.daily_limit_usd" class="whitespace-nowrap">
            <span
              v-if="usageLoading"
              class="font-medium text-slate-400 dark:text-slate-400"
              >—</span
            >
            <span
              v-else
              :class="
                getQuotaUsageClass(
                  usageMap.get(row.id)?.today_cost ?? 0,
                  row.daily_limit_usd
                )
              "
              >{{
                formatUsd(usageMap.get(row.id)?.today_cost ?? 0)
              }}</span
            >
            <span class="text-slate-400 dark:text-slate-400">
              / {{ formatUsd(row.daily_limit_usd) }}/{{
                t("admin.groups.limitDay")
              }}</span
            >
          </span>
          <span
            v-if="
              row.daily_limit_usd &&
              (row.weekly_limit_usd || row.monthly_limit_usd)
            "
            class="mx-1 text-gray-300 dark:text-slate-600"
            >·</span
          >
          <span v-if="row.weekly_limit_usd" class="whitespace-nowrap"
            >{{ formatUsd(row.weekly_limit_usd) }}/{{
              t("admin.groups.limitWeek")
            }}</span
          >
          <span
            v-if="row.weekly_limit_usd && row.monthly_limit_usd"
            class="mx-1 text-gray-300 dark:text-slate-600"
            >·</span
          >
          <span v-if="row.monthly_limit_usd" class="whitespace-nowrap"
            >{{ formatUsd(row.monthly_limit_usd) }}/{{
              t("admin.groups.limitMonth")
            }}</span
          >
        </div>
        <span v-else class="text-slate-400 dark:text-slate-400">{{
          t("admin.groups.subscription.noLimit")
        }}</span>
        <div class="text-slate-400 dark:text-slate-400">
          {{ t("admin.groups.usageTotal") }}
          <span class="ml-1 font-medium text-slate-600 dark:text-gray-300"
            >{{
              usageLoading
                ? "—"
                : formatUsd(usageMap.get(row.id)?.total_cost ?? 0)
            }}</span
          >
        </div>
      </div>
    </div>
  </template>

  <template #cell-rate_multiplier="{ value }">
    <span class="font-bold text-primary-600 dark:text-primary-400 font-mono text-sm">
      {{ (value || 1).toFixed(2) }}x
    </span>
  </template>

  <template #cell-is_exclusive="{ value }">
    <span :class="['badge', value ? 'badge-primary' : 'badge-gray']">
      {{
        value ? t("admin.groups.exclusive") : t("admin.groups.public")
      }}
    </span>
  </template>

  <template #cell-account_count="{ row }">
    <div class="space-y-0.5 text-xs">
      <div>
        <span class="text-slate-400 dark:text-slate-400">{{
          t("admin.groups.accountsAvailable")
        }}</span>
        <span
          class="ml-1 font-medium text-blue-600 dark:text-emerald-400"
          >{{ row.active_account_count || 0 }}</span
        >
        <span
          class="ml-1 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-medium text-gray-800 dark:bg-dark-600 dark:text-gray-300"
          >{{ t("admin.groups.accountsUnit") }}</span
        >
      </div>
      <div v-if="row.rate_limited_account_count">
        <span class="text-slate-400 dark:text-slate-400">{{
          t("admin.groups.accountsRateLimited")
        }}</span>
        <span
          class="ml-1 font-medium text-amber-600 dark:text-amber-400"
          >{{ row.rate_limited_account_count }}</span
        >
        <span
          class="ml-1 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-medium text-gray-800 dark:bg-dark-600 dark:text-gray-300"
          >{{ t("admin.groups.accountsUnit") }}</span
        >
      </div>
      <div>
        <span class="text-slate-400 dark:text-slate-400">{{
          t("admin.groups.accountsTotal")
        }}</span>
        <span
          class="ml-1 font-medium text-slate-700 dark:text-gray-300"
          >{{ row.account_count || 0 }}</span
        >
        <span
          class="ml-1 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-medium text-gray-800 dark:bg-dark-600 dark:text-gray-300"
          >{{ t("admin.groups.accountsUnit") }}</span
        >
      </div>
    </div>
  </template>

  <template #cell-capacity="{ row }">
    <GroupCapacityBadge
      v-if="capacityMap.get(row.id)"
      :concurrency-used="capacityMap.get(row.id)!.concurrencyUsed"
      :concurrency-max="capacityMap.get(row.id)!.concurrencyMax"
      :sessions-used="capacityMap.get(row.id)!.sessionsUsed"
      :sessions-max="capacityMap.get(row.id)!.sessionsMax"
      :rpm-used="capacityMap.get(row.id)!.rpmUsed"
      :rpm-max="capacityMap.get(row.id)!.rpmMax"
    />
    <span v-else class="text-xs text-slate-400">—</span>
  </template>

  <template #cell-usage="{ row }">
    <div v-if="usageLoading" class="text-xs text-slate-400">—</div>
    <div v-else class="space-y-0.5 text-xs">
      <div class="text-slate-400 dark:text-slate-400">
        <span class="text-slate-400 dark:text-slate-400">{{
          t("admin.groups.usageToday")
        }}</span>
        <span class="ml-1 font-medium text-slate-700 dark:text-gray-300"
          >${{
            formatCost(usageMap.get(row.id)?.today_cost ?? 0)
          }}</span
        >
      </div>
      <div class="text-slate-400 dark:text-slate-400">
        <span class="text-slate-400 dark:text-slate-400">{{
          t("admin.groups.usageYesterday")
        }}</span>
        <span class="ml-1 font-medium text-slate-700 dark:text-gray-300"
          >${{
            formatCost(usageMap.get(row.id)?.yesterday_cost ?? 0)
          }}</span
        >
      </div>
      <div class="text-slate-400 dark:text-slate-400">
        <span class="text-slate-400 dark:text-slate-400">{{
          t("admin.groups.usageTotal")
        }}</span>
        <span class="ml-1 font-medium text-slate-700 dark:text-gray-300"
          >${{
            formatCost(usageMap.get(row.id)?.total_cost ?? 0)
          }}</span
        >
      </div>
    </div>
  </template>

  <template #cell-status="{ value }">
    <span
      :class="[
        'badge',
        value === 'active' ? 'badge-success' : 'badge-danger',
      ]"
    >
      {{ t("admin.accounts.status." + value) }}
    </span>
  </template>

  <template #cell-actions="{ row }">
    <div class="flex items-center gap-1">
      <button
        @click="handleEdit(row)"
        class="flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400"
      >
        <Icon name="edit" size="sm" />
        <span class="text-xs">{{ t("common.edit") }}</span>
      </button>
      <button
        data-testid="group-duplicate"
        :title="
          duplicatingGroupIds.has(row.id)
            ? t('admin.groups.duplicating')
            : t('admin.groups.duplicate')
        "
        :disabled="duplicatingGroupIds.has(row.id)"
        @click="handleDuplicate(row)"
        class="flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-dark-700 dark:hover:text-primary-400"
      >
        <Icon name="copy" size="sm" />
        <span class="text-xs">
          {{
            duplicatingGroupIds.has(row.id)
              ? t("admin.groups.duplicating")
              : t("admin.groups.duplicate")
          }}
        </span>
      </button>
      <button
        v-if="row.platform === 'composite'"
        @click="handleCompositeRoutes(row)"
        class="flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-cyan-600 dark:hover:bg-dark-700 dark:hover:text-cyan-400"
      >
        <Icon name="swap" size="sm" />
        <span class="text-xs">{{
          t("admin.groups.compositeRoutes.action")
        }}</span>
      </button>
      <button
        @click="handleRateMultipliers(row)"
        class="flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-purple-600 dark:hover:bg-dark-700 dark:hover:text-purple-400"
      >
        <Icon name="dollar" size="sm" />
        <span class="text-xs">{{
          t("admin.groups.rateMultipliers")
        }}</span>
      </button>
      <button
        @click="handleRPMOverrides(row)"
        class="flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-orange-600 dark:hover:bg-dark-700 dark:hover:text-orange-400"
      >
        <Icon name="bolt" size="sm" />
        <span class="text-xs">{{
          t("admin.groups.rpmOverrides")
        }}</span>
      </button>
      <button
        @click="handleDelete(row)"
        class="flex flex-col items-center gap-0.5 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
      >
        <Icon name="trash" size="sm" />
        <span class="text-xs">{{ t("common.delete") }}</span>
      </button>
    </div>
  </template>

  <template #empty>
    <EmptyState
      :title="t('admin.groups.noGroupsYet')"
      :description="t('admin.groups.createFirstGroup')"
      :action-text="t('admin.groups.createGroup')"
      @action="openCreateModal"
    />
  </template>
</DataTable>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AdminGroup } from "@/types";
import type { Column } from "@/components/common/types";
import DataTable from "@/components/common/DataTable.vue";
import EmptyState from "@/components/common/EmptyState.vue";
import PlatformIcon from "@/components/common/PlatformIcon.vue";
import GroupCapacityBadge from "@/components/common/GroupCapacityBadge.vue";
import Icon from "@/components/icons/Icon.vue";

interface GroupUsageSummary {
  today_cost: number;
  yesterday_cost: number;
  total_cost: number;
}

interface GroupCapacitySummary {
  concurrencyUsed: number;
  concurrencyMax: number;
  sessionsUsed: number;
  sessionsMax: number;
  rpmUsed: number;
  rpmMax: number;
}

defineProps<{
  columns: Column[];
  groups: AdminGroup[];
  loading: boolean;
  usageLoading: boolean;
  usageMap: Map<number, GroupUsageSummary>;
  capacityMap: Map<number, GroupCapacitySummary>;
  duplicatingGroupIds: Set<number>;
}>();

const emit = defineEmits<{
  sort: [key: string, order: "asc" | "desc"];
  edit: [group: AdminGroup];
  duplicate: [group: AdminGroup];
  compositeRoutes: [group: AdminGroup];
  rateMultipliers: [group: AdminGroup];
  rpmOverrides: [group: AdminGroup];
  delete: [group: AdminGroup];
  create: [];
}>();

const { t } = useI18n();
const handleSort = (key: string, order: "asc" | "desc") => emit("sort", key, order);
const handleEdit = (group: AdminGroup) => emit("edit", group);
const handleDuplicate = (group: AdminGroup) => emit("duplicate", group);
const handleCompositeRoutes = (group: AdminGroup) => emit("compositeRoutes", group);
const handleRateMultipliers = (group: AdminGroup) => emit("rateMultipliers", group);
const handleRPMOverrides = (group: AdminGroup) => emit("rpmOverrides", group);
const handleDelete = (group: AdminGroup) => emit("delete", group);
const openCreateModal = () => emit("create");

const formatCost = (cost: number): string => {
  if (cost >= 1000) return cost.toFixed(0);
  if (cost >= 100) return cost.toFixed(1);
  return cost.toFixed(2);
};

const formatUsd = (cost: number | null | undefined): string =>
  `$${formatCost(cost ?? 0)}`;

const getQuotaUsageClass = (
  used: number,
  limit: number | null | undefined,
): string => {
  if (!limit || limit <= 0) {
    return "font-medium text-slate-700 dark:text-gray-300";
  }
  const ratio = used / limit;
  if (ratio >= 1) {
    return "font-semibold text-red-600 dark:text-red-400";
  }
  if (ratio >= 0.8) {
    return "font-semibold text-amber-600 dark:text-amber-400";
  }
  return "font-medium text-slate-700 dark:text-gray-300";
};
</script>
