import LoadingSpinner from './LoadingSpinner'
export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-950 z-50">
      <span className="text-4xl mb-4">🐾</span>
      <LoadingSpinner size="lg" />
    </div>
  )
}
