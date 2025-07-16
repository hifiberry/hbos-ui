<template>
  <div class="playlist">
    <h1>Playlist</h1>
    <div class="playlist-empty">
      <div class="empty-state">
        <AppIcon icon="playlist-light" class="empty-icon" />
        <h2>Your playlist is empty</h2>
        <p>Add songs from your library to create your playlist</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue'
</script>

<style scoped lang="scss">
.playlist {
  .playlist-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    
    .empty-state {
      text-align: center;
      max-width: 400px;
      
      .empty-icon {
        width: 80px;
        height: 80px;
        margin-bottom: 24px;
        color: var(--color-body-secondary);
        opacity: 0.5;
      }
      
      h2 {
        margin-bottom: 12px;
        color: var(--color-body-primary);
      }
      
      p {
        color: var(--color-body-secondary);
        line-height: 1.5;
      }
    }
  }
}
</style>
