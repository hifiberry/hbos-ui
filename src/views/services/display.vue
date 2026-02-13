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
          <div class="filter-toggle">
            <label class="toggle-switch">
              <input
                  type="checkbox"
                  v-model="isDark"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </PageContent>
</template>

<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import BackRouter from '@/components/BackRouter.vue'
import Icon from '@/components/Icon.vue'
import PageContent from '@/components/PageContent.vue'

const isDark = useDark()
</script>

<style scoped lang="scss">
@use '@/assets/scss/service-item' as *;

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

.filter-toggle {
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    cursor: pointer;

    input {
      opacity: 0;
    }

    .toggle-slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #555;
      transition: background-color 0.3s ease;
      border-radius: 24px;

      &:before {
        position: absolute;
        content: '';
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: transform 0.3s ease;
        border-radius: 50%;
      }
    }

    input:checked + .toggle-slider {
      background-color: #e11e4a;
    }

    input:checked + .toggle-slider:before {
      transform: translateX(20px);
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
