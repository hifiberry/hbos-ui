<template>
  <div class="players">
    <div class="breadcrumbs">
      <AppBackRouter :to="{ name: 'services' }">Players</AppBackRouter>
    </div>

    <div class="players-content">
      <div class="players-header">
        <h2>Audio Players</h2>
        <p>Manage and configure your audio players</p>
      </div>

      <div class="players-list">
        <div class="card">
          <div class="player-item">
            <div class="player-info">
              <AppIcon icon="play" class="player-icon" />
              <div class="player-details">
                <h3>Default Player</h3>
                <p class="player-status active">Active</p>
              </div>
            </div>
            <div class="player-actions">
              <button class="btn btn-primary">Configure</button>
            </div>
          </div>
        </div>

        <div class="empty-state">
          <AppIcon icon="play-light" class="empty-icon" />
          <h3>Player Management</h3>
          <p>Player configuration and management features will be available here.</p>
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
.players {
  .breadcrumbs {
    margin-bottom: 32px;
  }

  .players-header {
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

  .players-list {
    .card {
      margin-bottom: 24px;
    }

    .player-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px;
      
      .player-info {
        display: flex;
        align-items: center;
        gap: 16px;
        
        .player-icon {
          width: 32px;
          height: 32px;
          color: var(--color-primary);
        }
        
        .player-details {
          h3 {
            margin: 0 0 4px 0;
            color: var(--color-head);
            font-size: 1.125rem;
          }
          
          .player-status {
            margin: 0;
            font-size: 0.875rem;
            
            &.active {
              color: var(--color-success);
            }
            
            &.inactive {
              color: var(--color-body-secondary);
            }
          }
        }
      }
      
      .player-actions {
        .btn {
          padding: 8px 16px;
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
        }
      }
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--color-body-secondary);
      
      .empty-icon {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.6;
      }
      
      h3 {
        margin: 0 0 8px 0;
        color: var(--color-head);
      }
      
      p {
        margin: 0;
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
      }
    }
  }
}
</style>
