import { useCallback, useState } from 'react'
import { makeId } from '../lib/id'
import type { Toast, ToastTone } from '../types'
import { TOAST_DURATION_MS, TOAST_MAX } from '../constants/timing'

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = makeId()
    setToasts((current) => [{ id, message, tone }, ...current].slice(0, TOAST_MAX))
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  return { toasts, addToast } as const
}
