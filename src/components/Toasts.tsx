import styles from './Toasts.module.css'

type ToastTone = 'info' | 'success' | 'warning' | 'shiny'
type Toast = { id: string; message: string; tone: ToastTone }

export function Toasts({ toasts }: { toasts: Toast[] }) {
  if (!toasts?.length) return null
  return (
    <div className={styles.wrap} aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.tone] ?? ''}`}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}
