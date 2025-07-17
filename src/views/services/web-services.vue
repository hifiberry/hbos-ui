<template>
  <div class="web-services">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">Web Services</AppBackRouter>
    </div>

    <div class="web-services-content">
      <div class="services-header">
        <h2>Web Services</h2>
        <p>Connect and manage web-based music streaming services</p>
      </div>

      <div class="services-list">
        <div
          v-for="service in webServices"
          :key="service.name"
          class="service-item"
        >
          <div class="service-info">
            <div class="service-icon-container">
              <AppIcon :icon="service.icon" class="service-icon" />
            </div>
            <div class="service-details">
              <h3>{{ service.name }}</h3>
              <p class="service-description">{{ service.description }}</p>
              <div class="service-status">
                <span :class="['status-indicator', service.connected ? 'connected' : 'disconnected']">
                  {{ service.connected ? 'Connected' : 'Not Connected' }}
                </span>
              </div>
            </div>
          </div>
          <div class="service-actions">
            <button
              :class="['btn-action', service.connected ? 'btn-disconnect' : 'btn-connect']"
              @click="toggleConnection(service)"
            >
              {{ service.connected ? 'Disconnect' : 'Connect' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import AppBackRouter from '@/components/app-back-router.vue'

interface WebService {
  name: string
  description: string
  icon: string
  connected: boolean
}

const webServices = ref<WebService[]>([
  {
    name: 'Last.FM',
    description: 'Scrobble your music and get personalized recommendations',
    icon: 'last-fm',
    connected: false
  }
])

const toggleConnection = (service: WebService) => {
  service.connected = !service.connected
  console.log(`${service.connected ? 'Connected to' : 'Disconnected from'} ${service.name}`)
}
</script>

<style scoped lang="scss">
.web-services {
  .breadcrumbs {
    margin-bottom: 32px;
  }

  .services-header {
    margin-bottom: 32px;

    h2 {
      margin: 0 0 8px 0;
      color: var(--color-head);
    }

    p {
      margin: 0;
      color: var(--color-body-secondary);
    }
  }

  .services-list {
    .service-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 32px 24px 20px;
      background: var(--background-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      transition: all 0.2s ease;
      margin-bottom: 24px;

      &:hover {
        border-color: var(--color-primary);
        transform: translateY(-1px);
      }

      .service-info {
        display: flex;
        align-items: center;
        gap: 28px;
        flex: 1;

        .service-icon-container {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .service-icon {
            width: 40px;
            height: 40px;
            color: var(--color-icon-primary);

            :deep(svg) {
              width: 28px;
              height: 28px;
              object-fit: contain;
            }
          }
        }

        .service-details {
          flex: 1;

          h3 {
            margin: 0 0 4px 0;
            color: var(--color-head);
            font-size: 1.125rem;
            font-weight: 600;
          }

          .service-description {
            margin: 0 0 8px 0;
            color: var(--color-body-secondary);
            font-size: 0.875rem;
            line-height: 1.4;
          }

          .service-status {
            .status-indicator {
              font-size: 0.75rem;
              font-weight: 500;
              padding: 2px 8px;
              border-radius: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;

              &.connected {
                background: rgba(34, 197, 94, 0.1);
                color: #22c55e;
              }

              &.disconnected {
                background: rgba(156, 163, 175, 0.1);
                color: var(--color-body-secondary);
              }
            }
          }
        }
      }

      .service-actions {
        .btn-action {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;

          &.btn-connect {
            background: var(--color-primary);
            color: white;

            &:hover {
              background: var(--color-primary-dark);
            }
          }

          &.btn-disconnect {
            background: #dc3545;
            color: white;

            &:hover {
              background: #c82333;
            }
          }
        }
      }
    }
  }
}
</style>
