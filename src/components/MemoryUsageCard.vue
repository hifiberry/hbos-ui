<template>
  <div class="info-card">
    <div class="card-header">
      <Icon icon="tabler/schema" class="card-icon" />
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
          <tr data-test="summary-used">
            <td class="label">Used</td>
            <td class="value">{{ mb(report.system.used_kb) }}</td>
          </tr>
          <tr v-if="report.system.swap_total_kb > 0">
            <td class="label">Swap used</td>
            <td class="value">{{ mb(report.system.swap_used_kb) }} of {{ mb(report.system.swap_total_kb) }}</td>
          </tr>
          <tr data-test="summary-unaccounted">
            <td class="label">Other / unaccounted</td>
            <td class="value">
              {{ mb(report.system.unaccounted_kb) }}
              <span class="note">the kernel, drivers and page tables, which belong to no feature</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- The five biggest memory users overall, regardless of group -- a
           required or unknown feature shows no frees figure and no link
           here, exactly as it would in its own group below. -->
      <div data-test="top-five" class="feature-group">
        <table class="info-table">
          <tbody>
            <tr v-for="f in topFive" :key="f.id">
              <td class="label">
                {{ f.name }}
                <span class="process-count">{{ f.processes }} {{ f.processes === 1 ? 'process' : 'processes' }}</span>
              </td>
              <td class="value">
                <span class="usage">{{ mb(f.memory.rss_kb) }} RES / {{ mb(f.memory.pss_kb) }} actual</span>
                <template v-if="isActionable(f)">
                  <span :data-test="`reclaimable-${f.id}`" class="reclaimable">
                    frees {{ reclaimableRange(f.memory.reclaimable) }}
                  </span>
                  <span
                    v-if="f.memory.reclaimable.swap_pss_kb > 0"
                    :data-test="`swap-${f.id}`"
                    class="swap"
                  >
                    plus {{ mb(f.memory.reclaimable.swap_pss_kb) }} of swap
                  </span>
                  <RouterLink
                    v-if="actionFor(f)"
                    :data-test="`action-${f.id}`"
                    :to="actionFor(f)!.to"
                    :aria-label="`${actionFor(f)!.label} for ${f.name}`"
                  >{{ actionFor(f)!.label }}</RouterLink>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Collapsed by default: with more than five features, the card would
           otherwise run to dozens of rows. The full breakdown is one click
           away, grouped by what the owner can do about each feature. With
           five or fewer features total, the list above already shows
           everything, so there is nothing to expand. -->
      <details v-if="shown.length > 5" class="disclosure" :open="expanded">
        <summary data-test="show-all" @click.prevent="expanded = !expanded">
          Show all {{ shown.length }} features
        </summary>

        <template v-if="expanded">
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
                      frees {{ reclaimableRange(f.memory.reclaimable) }}
                    </span>
                    <span
                      v-if="f.memory.reclaimable.swap_pss_kb > 0"
                      :data-test="`swap-${f.id}`"
                      class="swap"
                    >
                      plus {{ mb(f.memory.reclaimable.swap_pss_kb) }} of swap
                    </span>
                    <RouterLink
                      v-if="actionFor(f)"
                      :data-test="`action-${f.id}`"
                      :to="actionFor(f)!.to"
                      :aria-label="`${actionFor(f)!.label} for ${f.name}`"
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

          <div v-if="unknown.length" data-test="unknown" class="feature-group">
            <h3>Unknown functionality</h3>
            <p class="note">Running units HiFiBerry ships no description for -- the report cannot say whether they matter.</p>
            <table class="info-table">
              <tbody>
                <tr v-for="f in unknown" :key="f.id">
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
      </details>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '@/components/Icon.vue'
import type { MemoryFeature, MemoryReport, Reclaimable } from '@/api/memory'

const props = defineProps<{
  report: MemoryReport | null
  loading: boolean
  error: string | null
}>()

/** Whole megabytes, except that a real but small figure must not read as
 *  nothing: rounding 400 kB to "0 MB" claims the feature uses no memory. */
const mbNumber = (kb: number): string =>
  kb > 0 && kb < 1024 ? '<1' : String(Math.round(kb / 1024))

const mb = (kb: number): string => `${mbNumber(kb)} MB`

/** Both ends of the range, because no exact figure exists and the floor is
 *  the honest half. `estimate_kb` counts, at their per-process share, pages
 *  the feature shares with everything outside it -- glibc, and the Python
 *  interpreter shared between config-server, sigmatcpserver and roomeq-server
 *  -- and stopping the feature returns none of those. Showing it alone
 *  overstates what is freed, worst for exactly the shared-interpreter case.
 *  When the two bounds round to the same figure, "8-8 MB" is just noise. */
const reclaimableRange = (r: Reclaimable): string => {
  const low = mbNumber(r.min_kb)
  const high = mbNumber(r.estimate_kb)
  return low === high ? `${high} MB` : `${low}–${high} MB`
}

/** A feature using nothing is not worth a row. Kernel threads have no mm, so
 *  every one of them reports zero, and a Pi runs well over a hundred: without
 *  this the card shows "Kernel, 118 processes, 0 MB RES / 0 MB actual" on
 *  every device. Real kernel memory is already in `unaccounted_kb`. */
const usesMemory = (f: MemoryFeature) => f.memory.rss_kb > 0 || f.memory.pss_kb > 0

const byEstimate = (a: MemoryFeature, b: MemoryFeature) =>
  b.memory.reclaimable.estimate_kb - a.memory.reclaimable.estimate_kb

const byUsage = (a: MemoryFeature, b: MemoryFeature) => b.memory.pss_kb - a.memory.pss_kb

const ACTIONABLE = ['disable', 'uninstall', 'reconfigure']

/** Actionable features -- the ones the owner can do something about --
 *  always land in "Can be reduced" regardless of everything else. */
const isActionable = (f: MemoryFeature) => ACTIONABLE.includes(f.disposition)

const shown = computed(() => (props.report?.features ?? []).filter(usesMemory))

/** disposition === 'disable' | 'uninstall' | 'reconfigure'. */
const reducible = computed(() =>
  shown.value.filter(isActionable).sort(byEstimate))

/** disposition === 'required' exactly. A feature we know is needed and know
 *  cannot be turned off. */
const required = computed(() =>
  shown.value.filter(f => !isActionable(f) && f.disposition === 'required').sort(byUsage))

/** Everything left over: disposition === 'none' (a unit found running that no
 *  descriptor claims), and -- so a value outside the known set lands
 *  somewhere visible instead of vanishing -- anything that isn't actionable
 *  and isn't 'required' either. The full set the backend emits today is
 *  required | disable | uninstall | reconfigure | none; only 'none' is
 *  expected to reach this branch. */
const unknown = computed(() =>
  shown.value.filter(f => !isActionable(f) && f.disposition !== 'required').sort(byUsage))

/** The five biggest memory users overall, by the same honest measure the
 *  card labels "actual" -- independent of which group a feature belongs to. */
const topFive = computed(() => [...shown.value].sort(byUsage).slice(0, 5))

/** Collapsed on every load; only reachable when there is something to expand
 *  (see the `v-if="shown.length > 5"` on the <details> in the template). */
const expanded = ref(false)

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
/* No shared partial covers this card shape (checked src/assets/scss/_card.scss
 * and _service-item.scss — both style a different card family: a flat
 * elevated `.card` with box-shadow, or an icon+details+actions service row).
 * `.info-card` / `.info-table` are defined only inside system-info.vue's own
 * scoped block, nested under `.info-tables`, and Vue's scoped CSS only
 * stamps a parent's scope attribute onto a child component's root element,
 * never its internal descendants — so those nested rules would never reach
 * this component if left out. Reproduced verbatim here (same class names,
 * same --color-* / --background-* custom properties) so the card matches its
 * siblings standalone, in both themes, without relying on the parent. */
.info-card {
  background: var(--background-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.card-header h2 {
  margin: 0;
  color: var(--color-head);
  font-size: 1.25rem;
  font-weight: 600;
  flex: 1;
}

.card-icon {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
}

.info-table {
  width: 100%;
  border-collapse: collapse;
}

.info-table tbody tr {
  border-bottom: 1px solid var(--color-border);
}

.info-table tbody tr:last-child {
  border-bottom: none;
}

.info-table td {
  padding: 5px 0;
  vertical-align: top;
}

.info-table td.label {
  font-weight: 500;
  color: var(--color-body-secondary);
  width: 40%;
  padding-right: 16px;
  line-height: 1.5;
}

.info-table td.value {
  color: var(--color-body);
  font-family: 'Metropolis', sans-serif;
  line-height: 1.5;
}

.loading-message,
.error-message {
  padding: 16px;
  text-align: center;
  color: var(--color-body-secondary);
  font-style: italic;
}

.error-message {
  color: var(--color-error);
}

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
.swap {
  display: block;
  font-size: 0.85rem;
  opacity: 0.6;
  color: var(--color-body-secondary);
}
.note {
  display: block;
  font-size: 0.8rem;
  opacity: 0.6;
}
.disclosure {
  margin-top: 1rem;
}
.disclosure summary {
  cursor: pointer;
  color: var(--color-primary);
  font-size: 0.9rem;
  font-weight: 500;
  padding: 4px 0;
}
.disclosure summary::marker {
  color: var(--color-body-secondary);
}
</style>
