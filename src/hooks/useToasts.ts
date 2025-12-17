import { useCallback, useState } from 'react'

export type ToastTone = 'info' | 'success' | 'warning' | 'shiny'
export type Toast = { id: string; message: string; tone: ToastTone }

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random())
    setToasts((current) => [{ id, message, tone }, ...current].slice(0, 4))
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return { toasts, addToast } as const
}

