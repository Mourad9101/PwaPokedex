import { useCallback, useState } from 'react'
import { makeId } from '../lib/id'
import type { Toast, ToastTone } from '../types'

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = makeId()
    setToasts((current) => [{ id, message, tone }, ...current].slice(0, 4))
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return { toasts, addToast } as const
}
