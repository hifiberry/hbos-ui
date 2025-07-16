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

      <div class="services-grid">
        <div class="card service-card">
          <div class="service-info">
            <AppIcon icon="cloud" class="service-icon" />
            <div class="service-details">
              <h3>Spotify</h3>
              <p class="service-status disconnected">Not Connected</p>
            </div>
          </div>
          <div class="service-actions">
            <button class="btn btn-primary">Connect</button>
          </div>
        </div>

        <div class="card service-card">
          <div class="service-info">
            <AppIcon icon="cloud" class="service-icon" />
            <div class="service-details">
              <h3>Apple Music</h3>
              <p class="service-status disconnected">Not Connected</p>
            </div>
          </div>
          <div class="service-actions">
            <button class="btn btn-primary">Connect</button>
          </div>
        </div>

        <div class="card service-card">
          <div class="service-info">
            <AppIcon icon="radio-wave" class="service-icon" />
            <div class="service-details">
              <h3>Radio Browser</h3>
              <p class="service-status connected">Connected</p>
            </div>
          </div>
          <div class="service-actions">
            <button class="btn btn-secondary">Configure</button>
          </div>
        </div>

        <div class="card service-card">
          <div class="service-info">
            <AppIcon icon="cloud" class="service-icon" />
            <div class="service-details">
              <h3>YouTube Music</h3>
              <p class="service-status disconnected">Not Connected</p>
            </div>
          </div>
          <div class="service-actions">
            <button class="btn btn-primary">Connect</button>
          </div>
        </div>
      </div>

      <div class="services-info">
        <div class="card">
          <div class="info-content">
            <AppIcon icon="music-note-simple-light" class="info-icon" />
            <div>
              <h3>Connect Your Music Services</h3>
              <p>Link your favorite streaming services to access your music library and playlists from one place.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'
import AppBackRouter from '@/components/app-back-router.vue'
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

  .services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 40px;

    .service-card {
      padding: 20px;
      
      .service-info {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
        
        .service-icon {
          width: 32px;
          height: 32px;
          color: var(--color-primary);
        }
        
        .service-details {
          flex: 1;
          
          h3 {
            margin: 0 0 4px 0;
            color: var(--color-head);
            font-size: 1.125rem;
          }
          
          .service-status {
            margin: 0;
            font-size: 0.875rem;
            
            &.connected {
              color: var(--color-success);
            }
            
            &.disconnected {
              color: var(--color-body-secondary);
            }
          }
        }
      }
      
      .service-actions {
        .btn {
          width: 100%;
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
          
          &.btn-primary {
            background: var(--color-primary);
            color: white;
            
            &:hover {
              background: var(--color-primary-dark);
            }
          }
          
          &.btn-secondary {
            background: var(--color-body-secondary);
            color: white;
            
            &:hover {
              background: var(--color-body);
            }
          }
        }
      }
    }
  }

  .services-info {
    .card {
      padding: 24px;
      
      .info-content {
        display: flex;
        align-items: center;
        gap: 20px;
        
        .info-icon {
          width: 40px;
          height: 40px;
          color: var(--color-primary);
          opacity: 0.8;
        }
        
        h3 {
          margin: 0 0 8px 0;
          color: var(--color-head);
        }
        
        p {
          margin: 0;
          color: var(--color-body-secondary);
          line-height: 1.5;
        }
      }
    }
  }
}
</style>
