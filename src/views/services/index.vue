<template>
  <div class="settings">
    <h1>Settings</h1>
    
    <div class="settings-overview">
      <div class="service-card">
        <div class="service-header">
          <AppIcon icon="play" class="service-icon" />
          <h2>Players</h2>
        </div>
        <p>Manage and configure audio players</p>
        <router-link :to="{ name: 'players' }" class="service-link">
          View Players
        </router-link>
      </div>
      
      <div class="service-card">
        <div class="service-header">
          <AppIcon icon="cloud" class="service-icon" />
          <h2>Web Services</h2>
        </div>
        <p>Connect and manage web-based music services</p>
        <router-link :to="{ name: 'web-services' }" class="service-link">
          View Web Services
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'
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
      background: var(--background-card);
      border-radius: 8px;
      padding: 24px;
      border: 1px solid var(--color-border);
      transition: all 0.2s ease;
      
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
      
      p {
        color: var(--color-body-secondary);
        margin-bottom: 20px;
        line-height: 1.5;
      }
      
      .service-link {
        display: inline-flex;
        align-items: center;
        padding: 8px 16px;
        background: var(--color-primary);
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 500;
        transition: background-color 0.2s ease;
        
        &:hover {
          background: var(--color-primary-dark);
        }
      }
    }
  }
}
</style>
