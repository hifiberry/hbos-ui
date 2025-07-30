<template>
  <div class="crossover-design-page">
    <div class="crossover-design">
      <div class="page-header">
        <h1>Crossover Design</h1>
      </div>

      <div class="card">
        <div class="empty-state">
          <AppIcon icon="tabler/crossover" class="empty-icon" />
          <h3>Crossover Design</h3>
          <p>Advanced crossover design tools coming soon. Configure frequency separation and phase alignment for multi-way speaker systems.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/app-icon.vue';
</script>

<style scoped lang="scss">
.crossover-design-page {
  width: 100%;
  height: 100%;
}

.crossover-design {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h1 {
      margin: 0;
      font-family: 'Metropolis', sans-serif;
      font-weight: 500;
      font-size: 28px;
    }
  }

  .card {
    padding: 40px;
    margin-bottom: 20px;
    border-radius: 8px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
  }

  .empty-state {
    text-align: center;
    max-width: 400px;

    .empty-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 20px;
      fill: #707070;
    }

    h3 {
      font-size: 24px;
      font-weight: 500;
      margin-bottom: 15px;
      color: #333;
    }

    p {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
    }
  }
}

@media (max-width: 768px) {
  .crossover-design {
    padding: 10px;

    .card {
      padding: 20px;
      min-height: 300px;
    }

    .empty-state {
      .empty-icon {
        width: 48px;
        height: 48px;
      }

      h3 {
        font-size: 20px;
      }

      p {
        font-size: 14px;
      }
    }
  }
}
</style>
