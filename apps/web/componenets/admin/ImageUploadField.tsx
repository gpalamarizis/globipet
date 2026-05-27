import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Link2, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface Props {
  value: string  // current image URL
  onChange: (url: string) => void
  folder?: string  // R2 folder to upload to (e.g. 'products', 'services')
  label?: string
  className?: string
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 5

export default function ImageUploadField({ value, onChange, folder = 'uploads', label = 'Εικόνα', className = '' }: Props) {
  const [mode, setMode] = useState<'upload' | 'url'>(value && value.startsWith('http') ? 'url' : 'upload')
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Επιτρέπονται μόνο εικόνες (JPG, PNG, WebP, GIF)'
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Η εικόνα είναι πολύ μεγάλη. Μέγιστο: ${MAX_SIZE_MB}MB`
    }
    return null
  }

  const uploadFile = async (file: File) => {
    const error = validateFile(file)
    if (error) {
      toast.error(error)
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post(`/upload?folder=${folder}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      onChange(data.url)
      toast.success('Η εικόνα ανέβηκε επιτυχώς')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Σφάλμα κατά το upload')
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const removeImage = () => {
    onChange('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'upload'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Upload size={11}/>Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'url'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Link2 size={11}/>URL
          </button>
        </div>
      </div>

      {/* Preview if image exists */}
      {value && (
        <div className="relative mb-2 group">
          <img
            src={value}
            alt="Preview"
            className="w-full max-h-48 object-contain rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            title="Αφαίρεση εικόνας"
          >
            <X size={14}/>
          </button>
        </div>
      )}

      {mode === 'upload' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
            dragActive
              ? 'border-brand-900 bg-brand-50 dark:bg-brand-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-brand-900 hover:bg-gray-50 dark:hover:bg-gray-800'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="text-brand-900 animate-spin"/>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ανέβασμα...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon size={28} className="text-gray-400"/>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {value ? 'Αλλαγή εικόνας' : 'Κάντε κλικ ή σύρετε εικόνα εδώ'}
              </p>
              <p className="text-xs text-gray-500">JPG, PNG, WebP, GIF · έως {MAX_SIZE_MB}MB</p>
            </div>
          )}
        </div>
      ) : (
        <input
          type="url"
          className="input"
          placeholder="https://example.com/image.jpg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}
