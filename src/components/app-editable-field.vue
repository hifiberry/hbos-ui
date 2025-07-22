<template>
  <div class="editable-field" :class="{ 'editing': isEditing }">
    <!-- Display mode -->
    <div v-if="!isEditing" class="field-display">
      <span class="field-value">{{ displayValue }}</span>
      <button
        @click="startEditing"
        class="edit-button"
        :title="`Edit ${label}`"
        :disabled="disabled"
      >
        <app-icon name="edit" />
      </button>
    </div>

    <!-- Edit mode -->
    <div v-else class="field-edit">
      <input
        ref="inputRef"
        :value="editValue"
        @input="updateEditValue"
        :type="inputType"
        :placeholder="placeholder"
        :disabled="isSaving"
        class="edit-input"
        @keydown.enter="handleSave"
        @keydown.escape="cancelEditing"
        @blur="onBlur"
      />

      <div class="edit-actions">
        <button
          @click="handleSave"
          :disabled="!canSave() || isSaving"
          class="save-button"
          title="Save changes"
        >
          <app-icon v-if="isSaving" name="loading" />
          <app-icon v-else name="check" />
        </button>

        <button
          @click="cancelEditing"
          :disabled="isSaving"
          class="cancel-button"
          title="Cancel changes"
        >
          <app-icon name="close" />
        </button>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="editError" class="field-error">
      {{ editError }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import AppIcon from '@/components/app-icon.vue'

interface Props {
  label: string
  displayValue: string
  isEditing: boolean
  editValue: string
  isSaving: boolean
  editError: string
  inputType?: string
  placeholder?: string
  disabled?: boolean
  saveOnBlur?: boolean
  canSave: () => boolean
  startEditing: () => void
  cancelEditing: () => void
  saveEdit: () => Promise<boolean>
}

const props = withDefaults(defineProps<Props>(), {
  inputType: 'text',
  placeholder: '',
  disabled: false,
  saveOnBlur: false
})

const emit = defineEmits<{
  'update:editValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement>()

// Handle input value changes
const updateEditValue = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:editValue', target.value)
}

// Watch for edit mode changes to focus input
watch(() => props.isEditing, async (isEditing) => {
  if (isEditing) {
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
  }
})

// Handle save action
const handleSave = async () => {
  if (props.canSave() && !props.isSaving) {
    await props.saveEdit()
  }
}

// Handle blur event
const onBlur = () => {
  if (props.saveOnBlur && props.canSave() && !props.isSaving) {
    handleSave()
  }
}
</script>

<style scoped lang="scss">
.editable-field {
  .field-display {
    display: flex;
    align-items: center;
    gap: 8px;

    .field-value {
      color: var(--color-body);
      font-weight: 500;
    }

    .edit-button {
      background: none;
      border: none;
      color: var(--color-body-secondary);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
      opacity: 0.7;

      &:hover:not(:disabled) {
        opacity: 1;
        background-color: var(--color-background-secondary);
        color: var(--color-accent);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      :deep(.app-icon) {
        width: 14px;
        height: 14px;
      }
    }
  }

  .field-edit {
    display: flex;
    align-items: center;
    gap: 8px;

    .edit-input {
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 6px 8px;
      color: var(--color-body);
      font-size: 14px;
      min-width: 200px;

      &:focus {
        outline: none;
        border-color: var(--color-accent);
        box-shadow: 0 0 0 2px var(--color-accent-alpha);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .edit-actions {
      display: flex;
      gap: 4px;

      button {
        background: none;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        padding: 6px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          background-color: var(--color-background-secondary);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        :deep(.app-icon) {
          width: 12px;
          height: 12px;
        }
      }

      .save-button {
        color: var(--color-success);
        border-color: var(--color-success-alpha);

        &:hover:not(:disabled) {
          background-color: var(--color-success-alpha);
        }
      }

      .cancel-button {
        color: var(--color-body-secondary);

        &:hover:not(:disabled) {
          color: var(--color-danger);
          border-color: var(--color-danger-alpha);
          background-color: var(--color-danger-alpha);
        }
      }
    }
  }

  .field-error {
    color: var(--color-danger);
    font-size: 12px;
    margin-top: 4px;
  }
}
</style>
