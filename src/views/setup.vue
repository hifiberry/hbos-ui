<template>
  <div class="setup-page">
    <div class="setup-card">
      <div class="setup-logo">
        <img :src="logoUrl" alt="HiFiBerry" />
      </div>

      <!-- Step 1: Welcome & System Name -->
      <div v-if="currentStep === 1" class="setup-step">
        <h1>Welcome to HiFiBerryOS</h1>
        <p class="setup-subtitle">Let's set up your system in a few quick steps.</p>

        <div class="form-group">
          <label for="system-name">System Name</label>
          <input
            id="system-name"
            v-model="systemName"
            type="text"
            maxlength="64"
            placeholder="e.g. Living Room Speaker"
            class="form-input"
            @keyup.enter="nextStep"
          />
          <p class="form-hint">This name identifies your device on the network.</p>
        </div>
      </div>

      <!-- Step 2: Sound Card Selection -->
      <div v-if="currentStep === 2" class="setup-step">
        <h1>Sound Card</h1>
        <p class="setup-subtitle">Select your HiFiBerry sound card.</p>

        <div v-if="loadingSoundCards" class="loading">
          Detecting sound card...
        </div>

        <div v-else class="soundcard-selection">
          <!-- Detection confirmation panel: shown when autodetect succeeded and user hasn't switched to manual browse -->
          <div v-if="!showManualBrowse" class="detected-panel">
            <div class="detected-label">Detected sound card</div>
            <div class="detected-name">{{ detectedCard?.name }}</div>
            <p class="detected-help">
              Autodetection will run on every boot. Click <strong>Next</strong> to keep this, or
              <a href="#" class="link" @click.prevent="chooseManually">choose manually</a>
              if it's not correct.
            </p>
          </div>

          <!-- Manual browse: search + category tabs + card list. Always includes autodetect option at top so it remains reversible. -->
          <template v-if="showManualBrowse">
            <label class="soundcard-option" :class="{ selected: selectedCard === '__autodetect__' }">
              <input
                type="radio"
                v-model="selectedCard"
                value="__autodetect__"
                name="soundcard"
              />
              <div class="soundcard-info">
                <span class="soundcard-name">Autodetect</span>
                <span class="soundcard-desc">
                  Automatically detect the connected sound card on each boot
                  <template v-if="detectedCardName">
                    — currently detected: <strong>{{ detectedCardName }}</strong>
                  </template>
                </span>
              </div>
            </label>

            <div class="soundcard-divider"></div>

            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search cards (e.g. Beocreate, Amp4, DAC2)"
              class="form-input soundcard-search"
            />

            <!-- Hide category tabs while searching: search spans all categories -->
            <div v-if="!searchQuery.trim()" class="category-tabs">
              <button
                v-for="cat in categories"
                :key="cat.key"
                class="category-tab"
                :class="{ active: selectedCategory === cat.key }"
                @click="selectedCategory = cat.key"
              >
                {{ cat.label }}
                <span class="category-count">{{ cat.count }}</span>
              </button>
            </div>

            <div class="soundcard-list">
              <label
                v-for="card in filteredCards"
                :key="card.name"
                class="soundcard-option"
                :class="{ selected: selectedCard === card.name }"
              >
                <input
                  type="radio"
                  v-model="selectedCard"
                  :value="card.name"
                  name="soundcard"
                />
                <div class="soundcard-info">
                  <span class="soundcard-name">
                    {{ card.name }}
                    <span v-if="card.name === detectedCardName" class="soundcard-badge">detected</span>
                  </span>
                </div>
              </label>
              <p v-if="filteredCards.length === 0" class="form-hint" style="padding: 12px;">
                No cards match "{{ searchQuery }}".
              </p>
            </div>
          </template>
        </div>
      </div>

      <!-- Step 3: Music Sources -->
      <div v-if="currentStep === 3" class="setup-step">
        <h1>Music Sources</h1>
        <p class="setup-subtitle">Where does your music come from?</p>

        <div class="source-options">
          <label class="source-option" :class="{ selected: useLocalMusic }">
            <input type="checkbox" v-model="useLocalMusic" />
            <div class="source-info">
              <span class="source-name">Local Music</span>
              <span class="source-desc">Play music files from this device or a network share (NAS)</span>
            </div>
          </label>

          <label class="source-option" :class="{ selected: useStreaming }">
            <input type="checkbox" v-model="useStreaming" />
            <div class="source-info">
              <span class="source-name">Streaming Services</span>
              <span class="source-desc">Stream from Spotify, AirPlay, Roon, Squeezebox, and more</span>
            </div>
          </label>
        </div>

        <!-- Streaming service selection -->
        <div v-if="useStreaming" class="service-selection">
          <p class="form-hint" style="margin-bottom: 12px;">Select the services you want to enable:</p>
          <div class="service-list">
            <label
              v-for="svc in streamingServices"
              :key="svc.id"
              class="service-option"
              :class="{ selected: svc.enabled, unavailable: !svc.exists }"
            >
              <input
                type="checkbox"
                v-model="svc.enabled"
                :disabled="!svc.exists"
              />
              <div class="service-info">
                <span class="service-name">{{ svc.name }}</span>
                <span v-if="!svc.exists" class="service-badge">Not installed</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Local music: NAS setup -->
        <div v-if="useLocalMusic" class="local-music-section">
          <p class="form-hint" style="margin-bottom: 12px;">Add a network share (NAS) to access your music files:</p>

          <div v-if="nasMounted" class="nas-success">
            <p>NAS share mounted successfully: <strong>{{ nasMountInfo }}</strong></p>
            <button class="btn-link" @click="resetNasSetup">Add another share</button>
          </div>

          <div v-else>
            <button class="btn btn-secondary btn-sm" @click="showNasDialog = true">
              Add Network Share (NAS)
            </button>
            <p class="form-hint" style="margin-top: 8px;">You can also add shares later in <strong>Services → Music Files</strong>.</p>
          </div>
        </div>

        <AddSmbMountDialog
          :isOpen="showNasDialog"
          @close="showNasDialog = false"
          @mount-created="onNasMountCreated"
        />
      </div>

      <!-- Rebooting overlay (replaces step 4 content while reboot is in progress) -->
      <div v-if="rebooting" class="setup-step reboot-progress">
        <h1>Rebooting</h1>
        <p class="setup-subtitle">{{ rebootStatus }}</p>
        <div class="reboot-spinner" aria-hidden="true"></div>
        <p class="form-hint" style="text-align: center; margin-top: 16px;">
          This usually takes about a minute. The page will reload automatically when the system is back.
        </p>
      </div>

      <!-- Step 4: Summary & Reboot -->
      <div v-else-if="currentStep === 4" class="setup-step">
        <h1>Setup Complete</h1>

        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">System Name</span>
            <span class="summary-value">{{ systemName }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Sound Card</span>
            <span class="summary-value">
              {{
                selectedCard === '__autodetect__'
                  ? (detectedCardName || 'Autodetect')
                  : selectedCard
              }}
            </span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Music Sources</span>
            <span class="summary-value">{{ musicSourcesSummary }}</span>
          </div>
        </div>

        <div v-if="needsReboot" class="reboot-notice">
          <p>A reboot is required to apply the sound card configuration.</p>
        </div>
        <div v-else class="ready-notice">
          <p>Your system is ready to use.</p>
        </div>
      </div>

      <!-- Navigation -->
      <div v-if="!rebooting" class="setup-nav">
        <button
          v-if="currentStep > 1"
          class="btn btn-secondary"
          @click="previousStep"
          :disabled="saving"
        >
          Back
        </button>
        <div v-else></div>

        <div class="step-dots">
          <span v-for="s in totalSteps" :key="s" class="dot" :class="{ active: s === currentStep, done: s < currentStep }"></span>
        </div>

        <button
          v-if="currentStep < totalSteps"
          class="btn btn-primary"
          @click="nextStep"
          :disabled="!canProceed"
        >
          Next
        </button>
        <button
          v-else-if="needsReboot"
          class="btn btn-primary"
          @click="finishAndReboot"
          :disabled="saving"
        >
          {{ saving ? 'Saving...' : 'Reboot Now' }}
        </button>
        <button
          v-else
          class="btn btn-primary"
          @click="finishSetup"
          :disabled="saving"
        >
          {{ saving ? 'Saving...' : 'Get Started' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { markSetupCompleted } from '@/router'
import {
  getSystemInfo,
  updateHostname,
  getSoundCards,
  detectSoundCardLive,
  disableSoundCardDetection,
  setSoundCardDetection,
  completeSetup,
  rebootSystem,
} from '@/api/system'
import type { SoundCard } from '@/api/system'
import {
  enableNowService,
  disableNowService,
  getMultipleServiceStatus,
  checkSystemdServiceExists,
  getExternalPlayers,
} from '@/api/config'
import AddSmbMountDialog from '@/components/AddSmbMountDialog.vue'

const router = useRouter()
const logoUrl = computed(() => `${import.meta.env.BASE_URL}images/logo.svg`)

const currentStep = ref(1)
const totalSteps = 4
const saving = ref(false)
const rebooting = ref(false)
const rebootStatus = ref('')

// Step 1: System Name
const systemName = ref('')
const originalHostname = ref('')

// Step 2: Sound Card
const loadingSoundCards = ref(true)
const availableCards = ref<SoundCard[]>([])
const selectedCard = ref('__autodetect__')
const detectedCardName = ref('')
const originalCardName = ref('')
const selectedCategory = ref('DAC')
const searchQuery = ref('')
const manualBrowse = ref(false)

// Step 3: Music Sources
const useLocalMusic = ref(false)
const useStreaming = ref(false)
const showNasDialog = ref(false)
const nasMounted = ref(false)
const nasMountInfo = ref('')

function onNasMountCreated() {
  nasMounted.value = true
  nasMountInfo.value = 'Network share added'
  showNasDialog.value = false
}

function resetNasSetup() {
  nasMounted.value = false
  nasMountInfo.value = ''
}

interface StreamingService {
  id: string
  name: string
  systemdService: string
  enabled: boolean
  exists: boolean
}

const streamingServices = ref<StreamingService[]>([
  { id: 'spotify', name: 'Spotify Connect', systemdService: 'librespot', enabled: false, exists: true },
  { id: 'airplay', name: 'AirPlay', systemdService: 'shairport', enabled: false, exists: true },
  { id: 'roon', name: 'Roon', systemdService: 'raat', enabled: false, exists: true },
  { id: 'squeezebox', name: 'Squeezebox / LMS', systemdService: 'squeezelite', enabled: false, exists: true },
  { id: 'bluetooth', name: 'Bluetooth', systemdService: 'hifiberry-bluetooth', enabled: false, exists: true },
])

const musicSourcesSummary = computed(() => {
  const parts: string[] = []
  if (useLocalMusic.value) parts.push('Local music')
  if (useStreaming.value) {
    const enabled = streamingServices.value.filter(s => s.enabled && s.exists)
    if (enabled.length > 0) {
      parts.push(enabled.map(s => s.name).join(', '))
    }
  }
  return parts.length > 0 ? parts.join(', ') : 'None selected'
})

const CATEGORY_MAP: Record<string, { label: string; types: string[] }> = {
  DAC: { label: 'DAC', types: ['DAC'] },
  Digi: { label: 'Digital', types: ['Digi'] },
  Amp: { label: 'Amplifier', types: ['Amp'] },
}

const categories = computed(() => {
  return Object.entries(CATEGORY_MAP).map(([key, { label, types }]) => ({
    key,
    label,
    count: availableCards.value.filter(
      c => c.card_type.some(t => types.includes(t))
    ).length,
  })).filter(c => c.count > 0)
})

const detectedCard = computed(() => {
  if (!detectedCardName.value) return null
  return availableCards.value.find(c => c.name === detectedCardName.value) || null
})

const showManualBrowse = computed(() => {
  if (loadingSoundCards.value) return false
  return manualBrowse.value || !detectedCard.value
})

const filteredCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const cards = availableCards.value.filter(c => !c.card_type.includes('Null'))
  if (query) {
    return cards.filter(c => c.name.toLowerCase().includes(query))
  }
  const types = CATEGORY_MAP[selectedCategory.value]?.types || []
  return cards.filter(c => c.card_type.some(t => types.includes(t)))
})

function chooseManually() {
  manualBrowse.value = true
  // If autodetect found a card, pre-select its category for convenience
  if (detectedCard.value) {
    for (const [key, { types }] of Object.entries(CATEGORY_MAP)) {
      if (detectedCard.value.card_type.some(t => types.includes(t))) {
        selectedCategory.value = key
        break
      }
    }
  }
}

const canProceed = computed(() => {
  if (currentStep.value === 1) return systemName.value.trim().length > 0
  if (currentStep.value === 2) return selectedCard.value !== ''
  return true
})

const needsReboot = computed(() => {
  if (selectedCard.value === '__autodetect__') {
    return false
  }
  return selectedCard.value !== originalCardName.value
})

onMounted(async () => {
  try {
    const info = await getSystemInfo()
    systemName.value = info.system.pretty_hostname || info.system.hostname || ''
    originalHostname.value = systemName.value
    if (info.soundcard?.name) {
      originalCardName.value = info.soundcard.name
    }
  } catch (e) {
    console.error('Failed to load system info:', e)
  }
})

async function loadSoundCards() {
  loadingSoundCards.value = true
  try {
    const [cardsRes, detectRes] = await Promise.all([
      getSoundCards(),
      detectSoundCardLive(),
    ])
    availableCards.value = cardsRes.data.soundcards.filter(
      c => !c.card_type.includes('Null')
    )
    if (detectRes.data?.card_name) {
      detectedCardName.value = detectRes.data.card_name
      // Set initial category based on detected card
      const detected = availableCards.value.find(c => c.name === detectRes.data?.card_name)
      if (detected) {
        for (const [key, { types }] of Object.entries(CATEGORY_MAP)) {
          if (detected.card_type.some(t => types.includes(t))) {
            selectedCategory.value = key
            break
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to load sound cards:', e)
  } finally {
    loadingSoundCards.value = false
  }
}

async function loadStreamingServices() {
  try {
    // Check which services actually exist on this system
    const serviceNames = streamingServices.value.map(s => s.systemdService)
    const existsPromises = serviceNames.map(async (svc) => {
      try {
        const res = await checkSystemdServiceExists(svc)
        return res.data?.exists ?? false
      } catch {
        return false
      }
    })
    const existsResults = await Promise.all(existsPromises)
    for (let i = 0; i < streamingServices.value.length; i++) {
      streamingServices.value[i].exists = existsResults[i]
    }

    // Also check current enabled status
    const statusMap = await getMultipleServiceStatus(serviceNames)
    for (const svc of streamingServices.value) {
      const status = statusMap.get(svc.systemdService)
      if (status) {
        svc.enabled = status.active === 'active'
      }
    }

    // Add any external players not already listed
    const externalPlayers = await getExternalPlayers()
    const knownServices = new Set(streamingServices.value.map(s => s.systemdService))
    for (const ext of externalPlayers) {
      if (!knownServices.has(ext.systemd_service)) {
        streamingServices.value.push({
          id: ext.systemd_service,
          name: ext.name,
          systemdService: ext.systemd_service,
          enabled: false,
          exists: true,
        })
        knownServices.add(ext.systemd_service)
      }
    }
  } catch (e) {
    console.error('Failed to load streaming services:', e)
  }
}

function nextStep() {
  if (!canProceed.value) return
  if (currentStep.value === 1) {
    loadSoundCards()
  }
  if (currentStep.value === 2) {
    loadStreamingServices()
  }
  currentStep.value++
}

function previousStep() {
  if (currentStep.value > 1) currentStep.value--
}

async function applySettings() {
  saving.value = true
  try {
    // Set hostname if changed
    if (systemName.value.trim() !== originalHostname.value) {
      await updateHostname({ pretty_hostname: systemName.value.trim() })
    }

    // Set sound card. Either path pins the card (writes both the
    // dtoverlay and the `# HiFiBerry card:` comment in config.txt), so
    // the kernel loads the right audio driver at next boot. We treat
    // "accept the autodetected card" the same as a manual selection —
    // the user has confirmed the result, so we lock it in. If the user
    // really wants every-boot autodetection later they can disable the
    // pin from system tools.
    if (selectedCard.value === '__autodetect__') {
      // detectedCardName.value comes from /api/v1/soundcard/detect-live
      // (with DSP-checksum refinement applied), so it's the same name
      // the user just saw and accepted.
      if (detectedCardName.value) {
        await disableSoundCardDetection(detectedCardName.value)
      } else {
        // No card was detected and the user clicked Next anyway —
        // fall back to old behaviour (clear pin, hope next boot works).
        await setSoundCardDetection(true)
      }
    } else {
      await disableSoundCardDetection(selectedCard.value)
    }

    // Ensure /etc/uuid exists. The unit is a oneshot guarded by
    // ConditionPathExists=!/etc/uuid, so this is a no-op when the file
    // is already present. Required by raat (Roon) which has its own
    // ConditionPathExists=/etc/uuid and won't start without it.
    try {
      await enableNowService('create-uuid')
    } catch (e) {
      console.error('Failed to enable create-uuid service:', e)
    }

    // Enable/disable streaming services
    if (useStreaming.value) {
      for (const svc of streamingServices.value) {
        if (!svc.exists) continue
        try {
          if (svc.enabled) {
            await enableNowService(svc.systemdService)
          } else {
            await disableNowService(svc.systemdService)
          }
        } catch (e) {
          console.error(`Failed to configure service ${svc.name}:`, e)
        }
      }
    }

    // Mark setup as completed
    await completeSetup()
    markSetupCompleted()
  } finally {
    saving.value = false
  }
}

async function finishSetup() {
  await applySettings()
  router.push({ name: 'now-playing' })
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function pingServer(timeoutMs: number): Promise<boolean> {
  // Treat any HTTP response (including 5xx) as "server reachable" — we only care
  // about the TCP/HTTP layer being up, not the API being healthy.
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    await fetch(`${import.meta.env.BASE_URL}index.html?t=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: ctrl.signal,
    })
    clearTimeout(t)
    return true
  } catch {
    return false
  }
}

async function waitForReboot() {
  // Phase 1: wait until the server stops responding (so we don't redirect before reboot starts).
  // The reboot has a 2s delay; allow up to 30s for it to actually go down.
  rebootStatus.value = 'Sending reboot command…'
  const downBy = Date.now() + 30000
  while (Date.now() < downBy) {
    if (!(await pingServer(2000))) break
    await sleep(1500)
  }

  // Phase 2: wait until the server comes back. No upper bound — reboot times vary.
  rebootStatus.value = 'Waiting for the system to come back online…'
  while (!(await pingServer(2000))) {
    await sleep(2000)
  }

  // Give nginx + APIs a moment to fully settle.
  rebootStatus.value = 'Almost there…'
  await sleep(2000)
}

async function finishAndReboot() {
  await applySettings()
  await rebootSystem({ delay: 2 })
  rebooting.value = true
  await waitForReboot()
  // Hard reload so the SPA re-evaluates setup_completed via the router and lands on the default page.
  window.location.href = import.meta.env.BASE_URL || '/'
}
</script>

<style scoped lang="scss">
.setup-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background-body);
  padding: 24px;
}

.setup-card {
  background: var(--background-card);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  max-width: 560px;
  width: 100%;
  padding: 48px 40px 32px;
}

.setup-logo {
  text-align: center;
  margin-bottom: 32px;

  img {
    width: 160px;
    height: auto;
  }
}

.setup-step {
  h1 {
    color: var(--color-head);
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 8px;
  }
}

.setup-subtitle {
  color: var(--color-body-secondary);
  margin: 0 0 28px;
  font-size: 0.95rem;
}

.form-group {
  margin-bottom: 20px;

  label {
    display: block;
    font-weight: 500;
    color: var(--color-head);
    margin-bottom: 8px;
    font-size: 0.875rem;
  }
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--background-body);
  color: var(--color-body);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: var(--primary);
  }
}

.form-hint {
  color: var(--color-body-secondary);
  font-size: 0.8rem;
  margin: 6px 0 0;
}

.loading {
  text-align: center;
  padding: 32px 0;
  color: var(--color-body-secondary);
}

.soundcard-selection {
  margin: 0 -8px;
  padding: 0 8px;
}

.detected-panel {
  border: 1px solid var(--primary);
  border-radius: 10px;
  padding: 18px 20px;
  background: rgba(var(--primary-rgb, 99, 102, 241), 0.05);
}

.detected-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary);
  margin-bottom: 4px;
}

.detected-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-head);
  margin-bottom: 10px;
}

.detected-help {
  color: var(--color-body-secondary);
  font-size: 0.85rem;
  margin: 0;
  line-height: 1.5;
}

.link {
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
}

.soundcard-search {
  margin-bottom: 12px;
}

.reboot-progress {
  text-align: center;
}

.reboot-spinner {
  width: 44px;
  height: 44px;
  margin: 24px auto 0;
  border-radius: 50%;
  border: 4px solid var(--color-border);
  border-top-color: var(--primary);
  animation: reboot-spin 0.9s linear infinite;
}

@keyframes reboot-spin {
  to { transform: rotate(360deg); }
}

.soundcard-list {
  max-height: 300px;
  overflow-y: auto;
}

.soundcard-divider {
  height: 1px;
  background: var(--color-border);
  margin: 8px 0;
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.category-tab {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: transparent;
  color: var(--color-body);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: var(--color-bg-secondary);
  }

  &.active {
    background: var(--primary);
    color: white;
    border-color: var(--primary);

    .category-count {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }
  }
}

.category-count {
  font-size: 0.75rem;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  padding: 1px 7px;
  color: var(--color-body-secondary);
}

.soundcard-badge {
  font-size: 0.7rem;
  background: var(--primary);
  color: white;
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 600;
  margin-left: 6px;
}

.soundcard-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--color-bg-secondary);
  }

  &.selected {
    background: var(--color-bg-secondary);
  }

  input[type="radio"] {
    margin-top: 3px;
    accent-color: var(--primary);
  }
}

.soundcard-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.soundcard-name {
  font-weight: 500;
  color: var(--color-head);
  font-size: 0.9rem;
}

.soundcard-desc {
  color: var(--color-body-secondary);
  font-size: 0.8rem;
}

.source-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.source-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: var(--color-bg-secondary);
  }

  &.selected {
    border-color: var(--primary);
    background: rgba(var(--primary-rgb, 99, 102, 241), 0.05);
  }

  input[type="checkbox"] {
    margin-top: 2px;
    accent-color: var(--primary);
  }
}

.source-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.source-name {
  font-weight: 500;
  color: var(--color-head);
  font-size: 0.9rem;
}

.source-desc {
  color: var(--color-body-secondary);
  font-size: 0.8rem;
}

.service-selection {
  margin-top: 4px;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: var(--color-bg-secondary);
  }

  &.selected {
    background: var(--color-bg-secondary);
  }

  &.unavailable {
    opacity: 0.5;
    cursor: not-allowed;
  }

  input[type="checkbox"] {
    accent-color: var(--primary);
  }
}

.service-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-name {
  font-weight: 500;
  color: var(--color-head);
  font-size: 0.875rem;
}

.service-badge {
  font-size: 0.7rem;
  background: var(--color-bg-secondary);
  color: var(--color-body-secondary);
  border-radius: 4px;
  padding: 1px 6px;
}

.local-music-section {
  margin-top: 12px;
  padding: 12px 14px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.nas-success {
  p {
    margin: 0 0 6px;
    color: var(--color-body);
    font-size: 0.85rem;
  }
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  padding: 0;
  font-size: 0.8rem;
  text-decoration: underline;

  &:hover {
    opacity: 0.8;
  }
}

.btn-sm {
  padding: 8px 16px;
  font-size: 0.8rem;
}

.summary {
  background: var(--background-body);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;

  &:not(:last-child) {
    border-bottom: 1px solid var(--color-border);
  }
}

.summary-label {
  color: var(--color-body-secondary);
  font-size: 0.875rem;
}

.summary-value {
  color: var(--color-head);
  font-weight: 500;
  font-size: 0.875rem;
}

.reboot-notice {
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 8px;
  padding: 12px 16px;

  p {
    margin: 0;
    color: var(--color-body);
    font-size: 0.875rem;
  }
}

.ready-notice {
  p {
    margin: 0;
    color: var(--color-body-secondary);
    font-size: 0.875rem;
  }
}

.setup-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.step-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
  transition: background 0.2s;

  &.active {
    background: var(--primary);
  }

  &.done {
    background: var(--primary);
    opacity: 0.5;
  }
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: var(--primary);
  color: white;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }
}

.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-body);
  border: 1px solid var(--color-border);

  &:hover:not(:disabled) {
    background: var(--color-border);
  }
}

@media (max-width: 600px) {
  .setup-card {
    padding: 32px 24px 24px;
  }

  .setup-step h1 {
    font-size: 1.25rem;
  }
}
</style>
