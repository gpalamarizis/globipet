interface SkeletonProps {
  className?: string
  count?: number
  variant?: 'text' | 'card' | 'circle' | 'image'
}

export default function Skeleton({ className = '', count = 1, variant = 'text' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:200%_100%]'

  const variantClasses = {
    text: 'h-4 rounded',
    card: 'h-32 rounded-2xl',
    circle: 'rounded-full',
    image: 'aspect-[4/3] rounded-2xl',
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${baseClasses} ${variantClasses[variant]} ${className}`}
          style={{ animationDuration: '1.5s' }} />
      ))}
    </>
  )
}

// Specialized skeleton for product/service cards
export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <Skeleton variant="image" className="mb-3" />
      <Skeleton variant="text" className="w-3/4 h-5 mb-2" />
      <Skeleton variant="text" className="w-1/2 h-4" />
    </div>
  )
}

// Product grid skeleton
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}
