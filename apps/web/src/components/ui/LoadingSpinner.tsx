export default function LoadingSpinner({ size = 'md' }: { size?: 'sm'|'md'|'lg' }) {
  const s = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]
  return <div className={`${s} border-2 border-gray-200 border-t-brand-900 rounded-full animate-spin`} />
}
