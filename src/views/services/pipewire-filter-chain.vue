<template>
  <div class="pipewire-filter-chain">
    <h1>Pipewire Filter Chain</h1>
    
    <div v-if="loading" class="loading-section">
      <p>Loading filter chain...</p>
    </div>

    <div v-else-if="error" class="error-section">
      <div class="error-content">
        <p class="error-message">{{ error }}</p>
        <button @click="fetchFilterChain" class="retry-button">
          Retry
        </button>
      </div>
    </div>

    <div v-else-if="filterChain" class="filter-chain-content">
      <div class="filter-chain-card">
        <div class="card-header">
          <h2>Current Filter Chain Configuration</h2>
        </div>
        <div class="filter-chain-text">
          <pre>{{ filterChain }}</pre>
        </div>
      </div>
    </div>

    <div v-else class="empty-section">
      <p>No filter chain configuration found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getFilterChain } from '@/api/filterchain'

// State
const loading = ref(true)
const error = ref<string | null>('')
const filterChain = ref<string | null>('')

// Methods
    const fetchFilterChain = async () => {
      try {
        loading.value = true
        error.value = null
        
        const response = await getFilterChain()
        
        if (response.status === 'success' && response.data) {
          filterChain.value = response.data
        } else {
          error.value = response.message || 'Failed to load filtergraph'
        }
      } catch (err) {
        console.error('Error fetching filtergraph:', err)
        error.value = err instanceof Error ? err.message : 'Failed to load filtergraph'
      } finally {
        loading.value = false
      }
    }

// Lifecycle
onMounted(() => {
  fetchFilterChain()
})
</script>

<style scoped lang="scss">
.pipewire-filter-chain {
  h1 {
    margin-bottom: 32px;
    color: var(--color-head);
  }

  .loading-section {
    text-align: center;
    padding: 40px;
    color: var(--color-body-secondary);
  }

  .error-section {
    .error-content {
      background: var(--background-error);
      border: 1px solid var(--color-error);
      border-radius: 8px;
      padding: 20px;
      text-align: center;

      .error-message {
        color: var(--color-error);
        margin-bottom: 16px;
      }

      .retry-button {
        background: var(--color-error);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s ease;

        &:hover {
          background: var(--color-error-dark);
        }
      }
    }
  }

  .empty-section {
    background: var(--background-card);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 40px;
    text-align: center;

    p {
      color: var(--color-body-secondary);
      font-size: 1.1rem;
      margin: 0;
    }
  }

  .filter-chain-content {
    .filter-chain-card {
      background: var(--background-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 24px;

      .card-header {
        margin-bottom: 16px;

        h2 {
          margin: 0;
          color: var(--color-head);
          font-size: 1.25rem;
          font-weight: 600;
        }
      }

      .filter-chain-text {
        background: var(--background-code, #f8f9fa);
        border: 1px solid var(--color-border-light, #e9ecef);
        border-radius: 6px;
        padding: 16px;
        overflow-x: auto;

        pre {
          margin: 0;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--color-code, #212529);
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      }
    }
  }
}
</style>
