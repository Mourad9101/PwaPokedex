import { storageKeys } from './storage'

type ToastTone = 'info' | 'success' | 'warning' | 'shiny'

export async function resetAppData(addToast: (message: string, tone?: ToastTone) => void) {
  addToast('Resetting app…', 'info')

  try {
    try {
      Object.values(storageKeys).forEach((key) => localStorage.removeItem(key))
    } catch {
      // ignore
    }

    if ('caches' in window) {
      const keys = await window.caches.keys()
      await Promise.all(
        keys.filter((key) => key.startsWith('pokechu-')).map((key) => window.caches.delete(key)),
      )
    }

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((reg) => reg.unregister()))
    }
  } catch {
    addToast('Could not fully reset (cache/SW). Reloading anyway…', 'warning')
  }

  window.setTimeout(() => window.location.reload(), 450)
}

