import { useEffect, useRef, RefObject } from 'react'

/**
 * Generic hook to close any popup/dropdown/menu when:
 *  - the user clicks outside the referenced element
 *  - the user presses Escape
 *
 * Returns a ref to attach to the popup's container element.
 *
 * Usage:
 *   const [open, setOpen] = useState(false)
 *   const ref = useDismissable(open, () => setOpen(false))
 *   return <div ref={ref}>...</div>
 *
 * Supports additional `extraRefs` for cases where the popup is rendered
 * in a portal (e.g. modal portals) outside the main ref's DOM subtree.
 */
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

  useEffect(() => {
    if (!open) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      // If click is inside the main ref, ignore
      if (ref.current && ref.current.contains(target)) return
      // If click is inside any extra ref (e.g. portal), ignore
      for (const r of extraRefs) {
        if (r.current && r.current.contains(target)) return
      }
      onClose()
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (clickOutside) document.addEventListener('click', handleClick)
    if (escape) document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose, escape, clickOutside, extraRefs])

  return ref
}
