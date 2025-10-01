<template>
  <div class="settings">
    <h1>Sound</h1>

    <div class="settings-overview">
      <router-link :to="{ name: 'general-sound' }" class="service-card">
        <div class="service-header">
          <Icon icon="tabler/adjustments" class="service-icon" />
          <h2>General sound settings</h2>
        </div>
        <p class="service-description">
          Configure global sound options and defaults for your system
        </p>
      </router-link>

      <router-link :to="{ name: 'speaker-equalizer' }" class="service-card">
        <div class="service-header">
          <Icon icon="tabler/speaker" class="service-icon" />
          <h2>Speaker Equalizer</h2>
        </div>
        <p class="service-description">
          Advanced parametric equalizer with individual filter control and bypass functionality
        </p>
      </router-link>

      <router-link :to="{ name: 'crossover-design' }" class="service-card">
        <div class="service-header">
          <Icon icon="tabler/crossover" class="service-icon" />
          <h2>Crossover Design</h2>
        </div>
        <p class="service-description">Configure frequency separation and phase alignment for multi-way speaker systems</p>
      </router-link>

      <router-link :to="{ name: 'room-acoustics' }" class="service-card">
        <div class="service-header">
          <Icon icon="tabler/armchair" class="service-icon" />
          <h2>Room Acoustics Correction</h2>
        </div>
        <p class="service-description">Automatically analyze and correct room acoustics for optimal sound reproduction</p>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/Icon.vue'
</script>

<style scoped lang="scss">
.settings {
  h1 {
    margin-bottom: 32px;
    color: var(--color-head);
  }

  .settings-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;

    .service-card {
      display: block;
      background: var(--background-card);
      border-radius: 8px;
      padding: 24px;
      border: 1px solid var(--color-border);
      transition: all 0.2s ease;
      text-decoration: none;
      color: inherit;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }

      .service-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;

        .service-icon {
          width: 24px;
          height: 24px;
          color: var(--color-primary);
        }

        h2 {
          margin: 0;
          color: var(--color-head);
          font-size: 1.25rem;
        }
      }

      .service-description {
        display: block;
        color: var(--color-body-secondary);
        margin-bottom: 20px;
        line-height: 1.5;
      }
    }
  }
}
</style>
