<script setup lang="ts">
import { computed } from 'vue'
import type { Extension } from '@/api/extensions'
import Icon from '@/components/Icon.vue'

const props = withDefaults(
  defineProps<{ extension: Extension; busy?: boolean }>(),
  { busy: false },
)

const emit = defineEmits<{
  install: [pkg: string]
  uninstall: [pkg: string]
}>()

const actionLabel = computed(() => {
  switch (props.extension.state) {
    case 'installed':
      return 'Remove'
    case 'upgradable':
      return 'Update'
    default:
      return 'Install'
  }
})

const showRebootHint = computed(
  () => props.extension.needs_reboot !== 'no' && props.extension.state !== 'installed',
)

function onAction() {
  if (props.busy) return
  if (props.extension.state === 'installed') {
    emit('uninstall', props.extension.package)
  } else {
    emit('install', props.extension.package)
  }
}
</script>

<template>
  <div class="card">
    <div class="extension-item">
      <div class="extension-main">
        <div class="extension-info">
          <div class="extension-icon" data-test="icon" :data-category="extension.category">
            <img v-if="extension.icon_url" :src="extension.icon_url" :alt="extension.name" />
            <Icon v-else icon="puzzle" />
          </div>

          <div class="extension-details">
            <h3>{{ extension.name }}</h3>
            <p class="service-description">{{ extension.summary }}</p>

            <p class="extension-version" data-test="version">
              <template v-if="extension.state === 'installed'">
                Installed: {{ extension.installed_version ?? '—' }}
              </template>
              <template v-else-if="extension.state === 'upgradable'">
                {{ extension.installed_version ?? '—' }} &rarr; {{ extension.version ?? '—' }}
              </template>
              <template v-else>Version {{ extension.version ?? '—' }}</template>
            </p>

            <p
              v-if="extension.state === 'upgradable'"
              class="extension-upgrade"
              data-test="upgrade-hint"
            >
              Upgrade available
            </p>

            <p v-if="showRebootHint" class="extension-reboot" data-test="reboot-hint">
              May require a reboot
            </p>
          </div>
        </div>

        <div class="extension-actions">
          <button
            type="button"
            data-test="action"
            class="extension-action-btn"
            :class="extension.state === 'installed' ? 'extension-action-btn--danger' : 'extension-action-btn--primary'"
            :disabled="busy"
            @click="onAction"
          >
            {{ actionLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

.card {
  @include service-card-base;
}

.extension-item {
  @include service-item-base;

  .extension-main {
    @include service-main-layout;
  }

  .extension-info {
    @include service-info-layout;

    .extension-icon {
      @include service-icon-base;

      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    }

    .extension-details {
      @include service-details-base;

      // The one state on this page that asks the user to act, so it is the
      // one that gets the accent colour. The version line above already
      // carries the detail (old -> new); this says why it matters.
      .extension-upgrade {
        margin: 4px 0 0;
        color: var(--primary);
        font-size: 0.85em;
        font-weight: 600;
      }

      .extension-reboot {
        margin-top: 4px;
        font-size: 0.85em;
        opacity: 0.8;
      }
    }
  }

  .extension-actions {
    @include service-actions-base;

    .extension-action-btn {
      &--primary {
        @include service-button-primary;
      }

      &--danger {
        @include service-button-danger;
      }
    }
  }
}
</style>
