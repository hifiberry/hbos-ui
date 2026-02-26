<template>
  <PageContent>
    <div class="page-header">
      <BackRouter :to="{name: 'services'}">
        Display Settings
      </BackRouter>
    </div>

    <div class="display-content">
      <div class="info-card">
        <div class="card-header">
          <Icon icon="monitor" class="card-icon" />
          <h2>Display Configuration</h2>
        </div>
        <p>Configure display settings for your system.</p>
      </div>
      <div class="info-card">
        <div class="dark-mode-card">
          <h2>
            Dark mode
          </h2>
          <ToggleSwitch v-model="isDark" />
        </div>
      </div>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { useDark } from '@vueuse/core'
import BackRouter from '@/components/BackRouter.vue'
import Icon from '@/components/Icon.vue'
import PageContent from '@/components/PageContent.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

const isDark = useDark()
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  h1 {
    margin: 0;
    color: var(--color-head);
  }
}

.display-content {
  display: grid;
  gap: 24px;

  .info-card {
    background: var(--background-card);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 24px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      .card-icon {
        width: 20px;
        height: 20px;
        color: var(--color-primary);
      }

      h2 {
        margin: 0;
        color: var(--color-head);
        font-size: 1.25rem;
        font-weight: 600;
      }
    }

    p {
      margin: 0;
      color: var(--color-body-secondary);
      line-height: 1.6;
    }
  }
}

.dark-mode-card {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-content: center;
}
</style>
