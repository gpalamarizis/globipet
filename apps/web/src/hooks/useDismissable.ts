import { useEffect, useRef, RefObject, useCallback } from 'react'

export function useDismissable<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
  options: {
    escape?: boolean
    clickOutside?: boolean
    extraRefs?: RefObject<HTMLElement>[]
  } = {}
): RefObject<T> {
  const { escape = true, clickOutside = true, extraRefs = [] } = options
  const ref = useRef<T>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    // Use mousedown so it fires BEFORE the button's onClick toggle,
    // preventing the menu from re-opening immediately after closing.
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current && ref.current.contains(target)) return
      for (const r of extraRefs) {
        if (r.current && r.current.contains(target)) return
      }
      onCloseRef.current()
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }

    if (clickOutside) document.addEventListener('mousedown', handleMouseDown)
    if (escape) document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, clickOutside, escape])

  return ref
}
