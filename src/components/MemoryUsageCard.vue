<template>
  <div class="info-card">
    <div class="card-header">
      <Icon icon="tabler/chart-donut" class="card-icon" />
      <h2>Memory Usage</h2>
    </div>

    <div v-if="loading" class="loading-message">Reading memory usage...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>

    <template v-else-if="report">
      <table class="info-table">
        <tbody>
          <tr>
            <td class="label">Total</td>
            <td class="value">{{ mb(report.system.total_kb) }}</td>
          </tr>
          <tr>
            <td class="label">Available</td>
            <td class="value">{{ mb(report.system.available_kb) }}</td>
          </tr>
          <tr v-if="report.system.swap_total_kb > 0">
            <td class="label">Swap used</td>
            <td class="value">{{ mb(report.system.swap_used_kb) }} of {{ mb(report.system.swap_total_kb) }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="reducible.length" data-test="reducible" class="feature-group">
        <h3>Can be reduced</h3>
        <table class="info-table">
          <tbody>
            <tr v-for="f in reducible" :key="f.id">
              <td class="label">
                {{ f.name }}
                <span class="process-count">{{ f.processes }} {{ f.processes === 1 ? 'process' : 'processes' }}</span>
              </td>
              <td class="value">
                <span class="usage">{{ mb(f.memory.rss_kb) }} RES / {{ mb(f.memory.pss_kb) }} actual</span>
                <span :data-test="`reclaimable-${f.id}`" class="reclaimable">
                  frees ~{{ mb(f.memory.reclaimable.estimate_kb) }}
                </span>
                <RouterLink
                  v-if="actionFor(f)"
                  :data-test="`action-${f.id}`"
                  :to="actionFor(f)!.to"
                >{{ actionFor(f)!.label }}</RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="required.length" data-test="required" class="feature-group">
        <h3>Required</h3>
        <table class="info-table">
          <tbody>
            <tr v-for="f in required" :key="f.id">
              <td class="label">
                {{ f.name }}
                <span class="process-count">{{ f.processes }} {{ f.processes === 1 ? 'process' : 'processes' }}</span>
              </td>
              <td class="value">{{ mb(f.memory.rss_kb) }} RES / {{ mb(f.memory.pss_kb) }} actual</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import type { MemoryFeature, MemoryReport } from '@/api/memory'

const props = defineProps<{
  report: MemoryReport | null
  loading: boolean
  error: string | null
}>()

const mb = (kb: number): string => `${Math.round(kb / 1024)} MB`

const byEstimate = (a: MemoryFeature, b: MemoryFeature) =>
  b.memory.reclaimable.estimate_kb - a.memory.reclaimable.estimate_kb

const byUsage = (a: MemoryFeature, b: MemoryFeature) => b.memory.pss_kb - a.memory.pss_kb

const ACTIONABLE = ['disable', 'uninstall', 'reconfigure']

const reducible = computed(() =>
  (props.report?.features ?? []).filter(f => ACTIONABLE.includes(f.disposition)).sort(byEstimate))

const required = computed(() =>
  (props.report?.features ?? []).filter(f => !ACTIONABLE.includes(f.disposition)).sort(byUsage))

/** Where the owner goes to act on this feature. Nothing is turned off from
 *  this page: the flows that install, remove and configure features already
 *  exist and know what else they need to do. */
const actionFor = (f: MemoryFeature): { label: string; to: object } | null => {
  if (f.disposition === 'uninstall') {
    return { label: 'Extensions', to: { name: 'extensions' } }
  }
  if (f.disposition === 'reconfigure') {
    return { label: 'Display settings', to: { name: 'display' } }
  }
  if (f.disposition === 'disable') {
    return { label: 'Settings', to: { name: 'services' } }
  }
  return null
}
</script>

<style scoped>
.feature-group h3 {
  margin: 1rem 0 0.25rem;
  font-size: 0.9rem;
  opacity: 0.7;
}
.process-count {
  display: block;
  font-size: 0.8rem;
  opacity: 0.6;
}
.usage {
  display: block;
}
.reclaimable {
  display: block;
  font-size: 0.85rem;
  opacity: 0.8;
}
</style>
