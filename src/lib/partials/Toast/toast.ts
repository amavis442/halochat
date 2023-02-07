/** 
 * @see https://dev.to/danawoodman/svelte-quick-tip-creating-a-toast-notification-system-ge3
 */
import { writable } from 'svelte/store'
import type { Toast } from './types'

export const toasts = writable([])

export const dismissToast = (id: number) => {
    toasts.update((all) => all.filter((t) => t.id !== id))
}

export const addToast = (toast: Toast) => {
    // Create a unique ID so we can easily find/remove it
    // if it is dismissible/has a timeout.
    const id = Math.floor(Math.random() * 10000)

    // Setup some sensible defaults for a toast.
    const defaults = {
        id,
        type: 'info',
        dismissible: true,
        timeout: 3000,
    }

    // Push the toast to the top of the list of toasts
    const t = { ...defaults, ...toast }
    toasts.update((all) => [t, ...all])

    // If toast is dismissible, dismiss it after "timeout" amount of time.
    if (t.timeout) setTimeout(() => dismissToast(id), t.timeout)
}

export const clearToasts = () => {
    toasts.set([])
}
