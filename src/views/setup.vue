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
          <!-- Autodetect option -->
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

          <!-- Category tabs -->
          <div class="category-tabs">
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

          <!-- Cards for selected category -->
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
                <span class="soundcard-name">{{ card.name }}</span>
              </div>
            </label>
          </div>
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

      <!-- Step 4: Summary & Reboot -->
      <div v-if="currentStep === 4" class="setup-step">
        <h1>Setup Complete</h1>

        <div class="summary">
          <div class="summary-row">
            <span class="summary-label">System Name</span>
            <span class="summary-value">{{ systemName }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Sound Card</span>
            <span class="summary-value">
              {{ selectedCard === '__autodetect__' ? 'Autodetect' : selectedCard }}
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
      <div class="setup-nav">
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
  detectSoundCard,
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
  { id: 'airplay', name: 'AirPlay', systemdService: 'shairport-sync', enabled: false, exists: true },
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

const filteredCards = computed(() => {
  const types = CATEGORY_MAP[selectedCategory.value]?.types || []
  return availableCards.value.filter(
    c => c.card_type.some(t => types.includes(t)) && !c.card_type.includes('Null')
  )
})

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
      detectSoundCard(),
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

    // Set sound card
    if (selectedCard.value === '__autodetect__') {
      await setSoundCardDetection(true)
    } else {
      await disableSoundCardDetection(selectedCard.value)
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

async function finishAndReboot() {
  await applySettings()
  await rebootSystem({ delay: 2 })
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
