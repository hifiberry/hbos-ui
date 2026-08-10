<template>
  <div class="pipewire-filter-chain">
    <h1>Pipewire Filter Chain</h1>

    <div v-if="loading" class="loading-section">
      <p>Loading filter chain...</p>
    </div>

    <div v-else-if="error" class="error-section">
      <StatusBlock variant="error">{{ error }}</StatusBlock>
      <button @click="fetchFilterChain" class="retry-button">
        Retry
      </button>
    </div>

    <div v-else-if="filterChain" class="filter-chain-content">
      <!-- Graph Visualization -->
      <div class="graph-card">
        <div class="card-header">
          <h2>PipeWire Graph Visualization</h2>
          <div class="view-controls">
            <button
              @click="activeView = 'graph'"
              :class="{ active: activeView === 'graph' }"
              class="view-button"
            >
              Graph View
            </button>
            <button
              @click="activeView = 'raw'"
              :class="{ active: activeView === 'raw' }"
              class="view-button"
            >
              Raw DOT
            </button>
          </div>
        </div>

        <div v-if="activeView === 'graph'" class="graph-container">
          <div v-if="graphLoading" class="graph-loading">
            <p>Rendering graph...</p>
          </div>
          <div v-else-if="graphError" class="graph-error">
            <p>{{ graphError }}</p>
            <button @click="renderGraph" class="retry-button">
              Retry Render
            </button>
          </div>
          <div v-else>
            <div ref="graphContainer" class="graph-svg-container"></div>
          </div>
        </div>

        <div v-else class="filter-chain-text">
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
import { ref, onMounted, watch, nextTick } from 'vue'
import { getFilterChain } from '@/api/filterchain'
import StatusBlock from '@/components/StatusBlock.vue'
import { graphviz } from 'd3-graphviz'

// State
const loading = ref(true)
const error = ref<string | null>('')
const filterChain = ref<string | null>('')

// Graph visualization state
const activeView = ref<'graph' | 'raw'>('graph')
const graphLoading = ref(false)
const graphError = ref<string | null>(null)
const graphContainer = ref<HTMLElement | null>(null)

// Methods
const fetchFilterChain = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await getFilterChain()

    if (response.status === 'success' && response.data) {
      filterChain.value = response.data
      // Auto-render graph when data is loaded
      if (activeView.value === 'graph') {
        await nextTick()
        renderGraph()
      }
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

const renderGraph = async () => {
  if (!graphContainer.value || !filterChain.value) {
    return
  }

  try {
    graphLoading.value = true
    graphError.value = null

    // Clear the container
    graphContainer.value.innerHTML = ''

    // Create d3-graphviz instance
    const renderer = graphviz(graphContainer.value)
      .fit(true)
      .width(graphContainer.value.offsetWidth || 800)
      .height(600)
      .zoom(true)

    // Render the DOT content
    renderer.renderDot(filterChain.value)

  } catch (err) {
    console.error('Error rendering graph:', err)
    graphError.value = err instanceof Error ? err.message : 'Failed to render graph'
  } finally {
    graphLoading.value = false
  }
}

// Watch for view changes to trigger graph rendering
watch(activeView, async (newView) => {
  if (newView === 'graph' && filterChain.value && !graphLoading.value) {
    await nextTick()
    renderGraph()
  }
})

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

  // Retry Render button inside the graph view's inline error state. This is
  // not backed by StatusBlock and out of scope for the error-section fix
  // below; left as the pre-existing filled style.
  .graph-error .retry-button {
    background: var(--primary);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--primary-dark);
    }
  }

  // Layout only: the tint, the border and the icon now live in StatusBlock,
  // and the retry button is a sibling of the block rather than its child.
  // align-items is left at the flex default (stretch) so the panel stays
  // full width; only the button opts out via align-self below.
  .error-section {
    display: flex;
    flex-direction: column;
    gap: 16px;

    // White text on --color-error is 3.76:1, under the 4.5:1 floor for a
    // label, and there is no fix in dark theme (see _service-item.scss for
    // the luminance arithmetic). This is a house secondary button instead.
    // This button sits directly on <main>, not on a card - .error-section
    // has no background of its own - so it is read against
    // --background-body (#fafafa / #000), not --background-card as the
    // mixin's own comments assume. Rest: label #707070/#fff on body =
    // 4.74:1 / 21.0:1, border #919191/#7c7c7c on body = 3.02:1 / 5.03:1.
    // All four clear their floors, but on hover the mixin's white overlay
    // (--color-background-hover) composites against that same black body
    // instead of a #333 card, landing near-black (#0d0d0d) - the button
    // would darken into the page instead of lifting off it. Hold the fill
    // at rest's --background-card and let border-color/transform/
    // box-shadow carry the hover feedback instead: hover label stays
    // 4.74:1 / 21.0:1, hover border (--primary on body) 4.49:1 / 5.39:1.
    .retry-button {
      @include button-secondary;
      align-self: flex-start;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background-color: var(--background-card);
      }

      // The mixin's own ring (rgba(59,130,246,.3), an off-token blue)
      // measured 1.41:1 against the body in both themes - nowhere near
      // 3:1. A solid ring in the existing border token clears it: the
      // ring colour is the same as the rest-state border, so it inherits
      // that 3.02:1 / 5.03:1 against the body.
      &:focus {
        box-shadow: 0 0 0 3px var(--color-button-border);
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
    .graph-card {
      background: var(--background-card);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 24px;

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        h2 {
          margin: 0;
          color: var(--color-head);
          font-size: 1.25rem;
          font-weight: 600;
        }

        .view-controls {
          display: flex;
          gap: 8px;

          .view-button {
            background: var(--background-button-secondary, #f8f9fa);
            color: var(--color-body);
            border: 1px solid var(--color-border);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            font-size: 0.9rem;
            transition: all 0.2s ease;

            &:hover {
              background: var(--background-button-secondary-hover, #e9ecef);
            }

            &.active {
              background: var(--primary);
              color: white;
              border-color: var(--primary);
            }
          }
        }

        @media (max-width: 600px) {
          flex-direction: column;
          gap: 16px;
          align-items: stretch;

          .view-controls {
            justify-content: stretch;

            .view-button {
              flex: 1;
              text-align: center;
            }
          }
        }
      }

      .graph-container {
        .graph-loading,
        .graph-error {
          text-align: center;
          padding: 40px;

          p {
            color: var(--color-body-secondary);
            margin-bottom: 16px;
          }
        }

        .graph-error {
          p {
            color: var(--color-error);
          }
        }

        .graph-svg-container {
          width: 100%;
          min-height: 400px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          background: white;
          overflow: hidden;

          // Ensure SVG content is responsive
          :deep(svg) {
            max-width: 100%;
            height: auto;
            display: block;
          }

          // Style the graph elements
          :deep(.node) {
            cursor: pointer;

            &:hover {
              filter: brightness(1.1);
            }
          }

          :deep(.edge) {
            cursor: pointer;

            &:hover path {
              stroke-width: 2;
            }
          }

          :deep(text) {
            font-family: var(--font-family-mono, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
            font-size: 11px;
            fill: #333;
          }

          :deep(.node polygon, .node ellipse) {
            fill: #f8f9fa;
            stroke: #6c757d;
            stroke-width: 1;
          }

          :deep(.edge path) {
            fill: none;
            stroke: #6c757d;
            stroke-width: 1;
          }

          :deep(.edge polygon) {
            fill: #6c757d;
            stroke: #6c757d;
          }
        }
      }

      .filter-chain-text {
        background: var(--background-code, #f8f9fa);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: 16px;
        overflow-x: auto;

        pre {
          margin: 0;
          font-family: var(--font-family-mono, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
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
