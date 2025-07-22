import { ref, type Ref } from 'vue'

/**
 * Composable for inline editing functionality
 * Provides reactive state and methods for editing any field value
 *
 * @example
 * // For a simple text field
 * const nameEditing = useEditableText(
 *   computed(() => user.value?.name),
 *   async (newName) => {
 *     const response = await updateUserName(newName)
 *     return response.success ? { status: 'success' } : { status: 'error', message: response.error }
 *   },
 *   { minLength: 2, maxLength: 50 }
 * )
 *
 * @example
 * // For a numeric field
 * const portEditing = useEditableField(
 *   computed(() => config.value?.port),
 *   async (newPort) => await updatePort(newPort),
 *   {
 *     validator: (port) => port >= 1 && port <= 65535,
 *     transformer: (value) => parseInt(value, 10),
 *     defaultValue: 8080
 *   }
 * )
 */
export function useEditableField<T = string>(
  initialValue: Ref<T | null | undefined>,
  updateFunction: (newValue: T) => Promise<{ status: 'success' | 'error'; message?: string }>,
  options: {
    validator?: (value: T) => boolean
    transformer?: (value: string) => T
    defaultValue?: T
  } = {}
) {
  // Edit state
  const isEditing = ref(false)
  const editValue = ref<string>('')
  const isSaving = ref(false)
  const editError = ref('')

  // Configuration
  const {
    validator = () => true,
    transformer = (value: string) => value as T,
    defaultValue
  } = options

  /**
   * Start editing mode
   */
  const startEditing = () => {
    const currentValue = initialValue.value
    editValue.value = currentValue?.toString() || defaultValue?.toString() || ''
    isEditing.value = true
    editError.value = ''
  }

  /**
   * Cancel editing mode
   */
  const cancelEditing = () => {
    isEditing.value = false
    editValue.value = ''
    editError.value = ''
  }

  /**
   * Save the edited value
   */
  const saveEdit = async (): Promise<boolean> => {
    const trimmedValue = editValue.value.trim()
    if (!trimmedValue && !defaultValue) {
      editError.value = 'Value cannot be empty'
      return false
    }

    const transformedValue = transformer(trimmedValue || defaultValue?.toString() || '')

    if (!validator(transformedValue)) {
      editError.value = 'Invalid value'
      return false
    }

    isSaving.value = true
    editError.value = ''

    try {
      const response = await updateFunction(transformedValue)

      if (response.status === 'success') {
        isEditing.value = false
        editValue.value = ''
        return true
      } else {
        editError.value = response.message || 'Failed to save changes'
        return false
      }
    } catch (err) {
      console.error('Error saving edit:', err)
      editError.value = err instanceof Error ? err.message : 'Unknown error occurred'
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Check if the current edit value is valid for saving
   */
  const canSave = (): boolean => {
    const trimmedValue = editValue.value.trim()
    if (!trimmedValue && !defaultValue) return false

    const transformedValue = transformer(trimmedValue || defaultValue?.toString() || '')
    return validator(transformedValue)
  }

  return {
    // State
    isEditing: isEditing as Readonly<Ref<boolean>>,
    editValue,
    isSaving: isSaving as Readonly<Ref<boolean>>,
    editError: editError as Readonly<Ref<string>>,

    // Methods
    startEditing,
    cancelEditing,
    saveEdit,
    canSave
  }
}

/**
 * Specific composable for text fields (most common case)
 */
export function useEditableText(
  initialValue: Ref<string | null | undefined>,
  updateFunction: (newValue: string) => Promise<{ status: 'success' | 'error'; message?: string }>,
  options: {
    minLength?: number
    maxLength?: number
    required?: boolean
  } = {}
) {
  const { minLength = 0, maxLength = 255, required = true } = options

  return useEditableField(
    initialValue,
    updateFunction,
    {
      validator: (value: string) => {
        if (required && !value.trim()) return false
        if (value.length < minLength) return false
        if (value.length > maxLength) return false
        return true
      },
      transformer: (value: string) => value.trim()
    }
  )
}
