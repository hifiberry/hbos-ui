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
@import '@/assets/scss/mixins.scss';

.radio-edit-popup-overlay {
  @include popup-overlay;
}

.radio-edit-popup {
  @include popup-container(480px);
}

.popup-header {
  @include popup-header;

  .close-btn {
    @include popup-close-button;
  }
}

.popup-form {
  @include popup-content;
}

.form-group {
  @include popup-form-group;
}

.form-actions {
  @include popup-actions;

  .btn-cancel {
    @include popup-button-cancel;
  }

  .btn-save {
    @include popup-button-primary;
  }
}
</style>
