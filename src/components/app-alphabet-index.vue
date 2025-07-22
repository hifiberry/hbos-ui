<template>
  <div class="alphabet-index" v-if="availableLetters.length > 0" :class="{ visible: isVisible }">
    <div class="alphabet-scrollbar">
      <button
        v-for="letter in alphabet"
        :key="letter"
        :class="['letter-btn', {
          available: availableLetters.includes(letter),
          disabled: !availableLetters.includes(letter)
        }]"
        @click="scrollToLetter(letter)"
        :disabled="!availableLetters.includes(letter)"
      >
        {{ letter }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

interface AlphabetIndexProps {
  items: Array<{ name: string; $id?: string }>
}

const props = defineProps<AlphabetIndexProps>()

const emit = defineEmits<{
  'letter-click': [letter: string]
}>()

const alphabet = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]
const isVisible = ref(true)
let hideTimeout: number | null = null

// Get letters that actually have artists
const availableLetters = computed(() => {
  const letters = new Set<string>()
  let hasNumbers = false

  props.items.forEach(item => {
    const firstChar = item.name.charAt(0).toUpperCase()
    if (/[0-9]/.test(firstChar)) {
      hasNumbers = true
    } else if (/[A-Z]/.test(firstChar)) {
      letters.add(firstChar)
    }
  })

  const result = Array.from(letters).sort()
  if (hasNumbers) {
    result.unshift('#')
  }

  return result
})

const resetHideTimer = () => {
  // Clear existing timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }

  // Show the scrollbar
  isVisible.value = true

  // Set new timeout to hide after 2 seconds
  hideTimeout = window.setTimeout(() => {
    isVisible.value = false
  }, 2000)
}

const handleScroll = () => {
  resetHideTimer()
}

const scrollToLetter = (letter: string) => {
  if (availableLetters.value.includes(letter)) {
    if (letter === '#') {
      // Special case: scroll to top for numbers
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    } else {
      emit('letter-click', letter)
    }
    resetHideTimer() // Reset timer when user clicks a letter
  }
}

onMounted(() => {
  // Listen for scroll events on the main content area
  window.addEventListener('scroll', handleScroll, { passive: true })
  // Start the initial timer
  resetHideTimer()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
})
</script>

<style scoped lang="scss">
.alphabet-index {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  pointer-events: auto;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.4s ease, visibility 0.4s ease;

  &.visible {
    opacity: 1;
    visibility: visible;
  }
}

.alphabet-scrollbar {
  display: flex;
  flex-direction: column;
  background: rgba(12, 12, 12, 0.01);
  backdrop-filter: blur(5px);
  border-radius: 20px;
  padding: 8px 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.letter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 20px;
  margin: 1px 0;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  line-height: 1;

  &.available {
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      color: var(--color-primary);
      transform: scale(1.1);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  &.disabled {
    color: rgba(var(--color-text-rgb), 0.3);
    cursor: default;
  }

  // Special styling for the # button
  &:first-child {
    font-weight: 600;
    font-size: 12px;
  }
}

// Hide on mobile devices
@media (max-width: 768px) {
  .alphabet-index {
    display: none;
  }
}
</style>
