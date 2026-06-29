import confetti from 'canvas-confetti'

/**
 * Trigger celebratory confetti animation
 * Use after successful bookings, payments, registrations, etc.
 */
export function celebrate() {
  const count = 200
  const defaults = {
    origin: { y: 0.7 },
    colors: ['#FFD60A', '#FF9500', '#E65100', '#1565C0', '#10b981', '#a855f7'],
  }

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, { spread: 26, startVelocity: 55 })
  fire(0.2,  { spread: 60 })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
  fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
  fire(0.1,  { spread: 120, startVelocity: 45 })
}

/**
 * Quick success burst — smaller, snappier
 */
export function successBurst() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#10b981', '#FFD60A', '#FF9500'],
  })
}

/**
 * From side — for left/right achievements
 */
export function sideBurst(side: 'left' | 'right' = 'left') {
  confetti({
    particleCount: 100,
    angle: side === 'left' ? 60 : 120,
    spread: 55,
    origin: { x: side === 'left' ? 0 : 1, y: 0.7 },
    colors: ['#FFD60A', '#FF9500', '#E65100'],
  })
}
