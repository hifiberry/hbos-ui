<template>
  <div v-if="isVisible" class="radio-edit-popup-overlay" @click="closePopup">
    <div class="radio-edit-popup" @click.stop>
      <div class="popup-header">
        <h3>Edit Radio Station</h3>
        <button class="close-btn" @click="closePopup">
          <AppIcon icon="clear" />
        </button>
      </div>

      <form @submit.prevent="saveChanges" class="popup-form">
        <div class="form-group">
          <label for="station-name">Station Name</label>
          <input
            id="station-name"
            v-model="editData.title"
            type="text"
            placeholder="Enter station name"
            required
          />
        </div>

        <div class="form-group">
          <label for="station-country">Country</label>
          <input
            id="station-country"
            v-model="editData.country"
            type="text"
            placeholder="Enter country"
          />
        </div>

        <div class="form-group">
          <label for="station-tags">Tags</label>
          <input
            id="station-tags"
            v-model="editData.tags"
            type="text"
            placeholder="Enter tags separated by commas"
          />
        </div>

        <div class="form-group">
          <label for="station-url">Stream URL</label>
          <input
            id="station-url"
            v-model="editData.url"
            type="url"
            placeholder="Enter stream URL"
            required
          />
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="closePopup">
            Cancel
          </button>
          <button type="submit" class="btn-save">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from '@/components/app-icon.vue'
import type { RadioFavorite } from '@/stores/radio'

interface Props {
  isVisible: boolean
  station: RadioFavorite | null
}

interface Emits {
  (e: 'close'): void
  (e: 'save', editedStation: RadioFavorite): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const editData = ref({
  id: '',
  title: '',
  country: '',
  tags: '',
  url: '',
  img: ''
})

// Watch for station changes to populate the form
watch(() => props.station, (newStation) => {
  if (newStation) {
    editData.value = {
      id: newStation.id,
      title: newStation.title || '',
      country: newStation.country || '',
      tags: newStation.tags || '',
      url: newStation.url || '',
      img: newStation.img || ''
    }
  }
}, { immediate: true })

const closePopup = () => {
  emit('close')
}

const saveChanges = () => {
  const editedStation: RadioFavorite = {
    id: editData.value.id,
    title: editData.value.title.trim(),
    country: editData.value.country.trim() || undefined,
    tags: editData.value.tags.trim() || undefined,
    url: editData.value.url.trim(),
    img: editData.value.img
  }

  emit('save', editedStation)
}
</script>

<style scoped lang="scss">
.radio-edit-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.radio-edit-popup {
  background: var(--background-card, #ffffff);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 0;
  margin-bottom: 24px;

  h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-head, #000000);
  }

  .close-btn {
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    border-radius: 50%;
    color: var(--color-body-secondary, #666666);
    transition: all 0.2s ease;

    &:hover {
      background: var(--cover-placeholder-bg, #f0f0f0);
      color: var(--color-head, #000000);
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }
}

.popup-form {
  padding: 0 24px 24px;
}

.form-group {
  margin-bottom: 20px;

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--color-head, #000000);
    font-size: 14px;
  }

  input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--color-body-secondary, #cccccc);
    border-radius: 8px;
    background: var(--background-body, #ffffff);
    color: var(--color-text, #000000);
    font-size: 14px;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--primary, #007bff);
      background: var(--background-card, #ffffff);
    }

    &::placeholder {
      color: var(--color-body-secondary, #999999);
    }
  }
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;

  button {
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;

    &.btn-cancel {
      background: var(--cover-placeholder-bg, #f0f0f0);
      color: var(--color-body-secondary, #666666);

      &:hover {
        background: var(--color-body-secondary, #e0e0e0);
        color: var(--color-head, #000000);
      }
    }

    &.btn-save {
      background: var(--primary, #007bff);
      color: white;

      &:hover {
        background: var(--primary, #0056b3);
        opacity: 0.9;
      }
    }
  }
}
</style>
