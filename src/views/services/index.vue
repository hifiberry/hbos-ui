<template>
  <div class="settings">
    <h1>Settings</h1>

    <div class="settings-overview">
      <router-link :to="{ name: 'players' }" class="service-card">
        <div class="service-header">
          <Icon icon="play" class="service-icon" />
          <h2>Players</h2>
        </div>
        <p class="service-description">
          Manage and configure audio players
        </p>
      </router-link>

      <router-link :to="{ name: 'web-services' }" class="service-card">
        <div class="service-header">
          <Icon icon="cloud" class="service-icon" />
          <h2>Web Services</h2>
        </div>
        <p class="service-description">Connect and manage web-based music services</p>
      </router-link>

      <router-link :to="{ name: 'music-files' }" class="service-card">
        <div class="service-header">
          <Icon icon="nas" class="service-icon" />
          <h2>Music Files</h2>
        </div>
        <p class="service-description">Mount SMB shares and manage local music directories</p>
      </router-link>

      <router-link :to="{ name: 'dsp-programs' }" class="service-card">
        <div class="service-header">
          <Icon icon="download" class="service-icon" />
          <h2>DSP Programs</h2>
        </div>
        <p class="service-description">Download and manage digital signal processing programs</p>
      </router-link>

      <router-link :to="{ name: 'dsp-backends' }" class="service-card">
        <div class="service-header">
          <Icon icon="processor" class="service-icon" />
          <h2>DSP Backends</h2>
        </div>
        <p class="service-description">Select and configure digital signal processing backends</p>
      </router-link>

      <router-link :to="{ name: 'system-info' }" class="service-card">
        <div class="service-header">
          <Icon icon="computer" class="service-icon" />
          <h2>System Information</h2>
        </div>
        <p class="service-description">View system details including Pi model, HAT information, and system UUID</p>
      </router-link>

      <router-link :to="{ name: 'system-tools' }" class="service-card warning-card">
        <div class="service-header">
          <Icon icon="tool" class="service-icon" />
          <h2>System Tools</h2>
        </div>
        <p class="service-description warning-text">
          <strong>⚠️ Use with caution:</strong> These tools can leave the system in an unusable state if used incorrectly.
        </p>
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

      &.warning-card {
        border-color: var(--color-warning, #f59e0b);

        .warning-text {
          color: var(--color-body-secondary);

          strong {
            color: var(--color-warning-dark, #d97706);
          }
        }
      }
    }
  }
}
</style>
