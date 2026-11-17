import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Modal built on the native <dialog>: focus trap, Escape and top-layer for free. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '')
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close()
      else d.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // React passes a nested dialog's close event up to its parent dialog: only react to our own.
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'm-auto max-h-[85dvh] w-[min(40rem,calc(100vw-2rem))] rounded-3xl bg-background p-0 text-foreground backdrop:bg-black/60',
        className,
      )}
    >
      {open && children}
    </dialog>
  )
}
