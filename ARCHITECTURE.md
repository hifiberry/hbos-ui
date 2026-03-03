# hbos-ui Architecture & Design Patterns

## Technology Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Pinia** (state management)
- **TypeScript**
- **SCSS** (scoped per component)
- **Vite** (build tool)
- **VueUse** (`useFetch`, composable utilities)

---

## Layered Architecture

```
┌──────────────────────────────────────┐
│   Views & Components (src/views/)    │
│   - Render UI                        │
│   - Use storeToRefs() for state      │
│   - Call store action methods        │
└──────────────────┬───────────────────┘
                   │ imports & calls
┌──────────────────▼───────────────────┐
│   Pinia Stores (src/stores/)         │
│   - Own reactive state               │
│   - Contain business logic           │
│   - Call api/* functions             │
│   - Show toasts on errors            │
└──────────────────┬───────────────────┘
                   │ imports & calls
┌──────────────────▼───────────────────┐
│   API Functions (src/api/)           │
│   - One file per backend service     │
│   - Raw fetch() calls                │
│   - Use appconfig store for base URL │
│   - Throw on HTTP errors             │
└──────────────────┬───────────────────┘
                   │ URL resolution
┌──────────────────▼───────────────────┐
│   AppConfig Store (src/stores/       │
│   appconfig.ts)                      │
│   - getApiBaseUrl()      → ACR       │
│   - getConfigApiBaseUrl() → Configurator │
│   - getDSPToolkitApiBaseUrl() → DSP  │
│   - getRoomEQApiBaseUrl() → RoomEQ   │
└──────────────────────────────────────┘
```

Composables (`src/composables/`) are optional helpers that encapsulate reusable UI logic. They may use both stores and api/* functions but do not own long-lived state.

---

## Rules

### Views
- Access state via `storeToRefs(useXxxStore())` — never access store state directly
- Trigger data loading by calling store action methods
- Do **not** import from `src/api/` directly
- Do **not** own API loading state — that belongs in the store

### Stores
- Own reactive state (`ref`, `computed`)
- Import and call functions from `src/api/` for data fetching
- Use `useToastStore().showErrorToast()` for user-visible errors
- Export state refs and action functions in the `return {}` block

### API functions (`src/api/`)
- One file per backend service (e.g. `player.ts`, `volume.ts`, `system.ts`)
- Always obtain the base URL from `useAppConfigStore().getApiBaseUrl()` (or the appropriate variant)
- Throw an `Error` on non-OK HTTP responses
- Keep functions pure — no side effects, no toast calls, no reactive state

### Composables (`src/composables/`)
- For logic that is reused across multiple views
- May call stores and api/* functions
- Do **not** duplicate what a store already does

---

## API Files by Backend

| File | Backend | Base URL getter |
|------|---------|-----------------|
| `player.ts` | ACR (AudioControl) | `getApiBaseUrl()` |
| `volume.ts` | ACR | `getApiBaseUrl()` |
| `coverart.ts` | ACR | `getApiBaseUrl()` |
| `audiocontrol-library.ts` | ACR | `getApiBaseUrl()` |
| `filterchain.ts` | ACR | `getApiBaseUrl()` |
| `lastfm.ts` | ACR | `getApiBaseUrl()` |
| `spotify.ts` | ACR | `getApiBaseUrl()` |
| `system.ts` | Configurator | `getConfigApiBaseUrl()` |
| `config.ts` | Configurator | `getConfigApiBaseUrl()` |
| `smb.ts` | Configurator | `getConfigApiBaseUrl()` |
| `dsptoolkit.ts` | DSP Toolkit | `getDSPToolkitApiBaseUrl()` |
| `roomeq.ts` | RoomEQ | `getRoomEQApiBaseUrl()` |
| `pipewire.ts` | PipeWire API | `window.location.origin/api/pipewire` |

---

## Example: Adding a New Feature

Say you need to display battery status from a new ACR endpoint `/api/audiocontrol/battery`.

**1. Add the API function** (`src/api/battery.ts`):
```typescript
import { useAppConfigStore } from '@/stores/appconfig'

export interface BatteryStatus { level: number; charging: boolean }

export const getBatteryStatus = async (): Promise<BatteryStatus> => {
  const baseUrl = useAppConfigStore().getApiBaseUrl()
  const response = await fetch(`${baseUrl}/battery`)
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return response.json()
}
```

**2. Add a store** (`src/stores/battery.ts`):
```typescript
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getBatteryStatus, type BatteryStatus } from '@/api/battery'
import { useToastStore } from '@/stores/toast'

export const useBatteryStore = defineStore('battery', () => {
  const status = ref<BatteryStatus | null>(null)
  const loading = ref(false)

  const fetchStatus = async () => {
    loading.value = true
    try {
      status.value = await getBatteryStatus()
    } catch (err) {
      useToastStore().showErrorToast('Could not fetch battery status.')
    } finally {
      loading.value = false
    }
  }

  return { status, loading, fetchStatus }
})
```

**3. Use in a view**:
```typescript
const batteryStore = useBatteryStore()
const { status, loading } = storeToRefs(batteryStore)

onMounted(() => batteryStore.fetchStatus())
```
