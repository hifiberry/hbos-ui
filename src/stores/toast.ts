import { defineStore } from 'pinia'
import { toast } from 'vue3-toastify'

export const useToastStore = defineStore('toast', {
  actions: {
    showSuccessToast(message: string) {
      toast.success(message)
    },
    showErrorToast(message: string) {
      toast.error(message, {})
    },
    showInfoToast(message: string) {
      toast.info(message)
    },
    // Add more toast types as needed
  },
})
