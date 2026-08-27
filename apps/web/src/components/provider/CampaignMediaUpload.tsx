import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Film, AlertTriangle, Check, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

/**
 * Ανέβασμα banner ή βίντεο για καμπάνια.
 *
 * ΤΙ ΚΑΝΕΙ ΣΤΟΝ BROWSER, ΠΡΙΝ ΤΟ ΑΝΕΒΑΣΜΑ
 *   Εικόνες: σμικρύνονται στις διαστάσεις της θέσης και συμπιέζονται σε
 *   WebP. Μια φωτογραφία 4MB από κινητό γίνεται 150KB, οπότε περνάει το
 *   όριο των 5MB του server και φορτώνει γρήγορα στον χρήστη.
 *
 *   Βίντεο: ΔΕΝ μετατρέπονται — ο browser δεν μπορεί. Ελέγχονται μόνο
 *   μέγεθος και αναλογία, με σαφή μηνύματα. Πραγματική μετατροπή θέλει
 *   Cloudflare Stream.
 *
 * ΓΙΑΤΙ ΑΠΟΘΗΚΕΥΟΥΜΕ ΑΝΑΛΟΓΙΑ
 *   Ένα κάθετο βίντεο από κινητό είναι ιδανικό για popup και απαίσιο για
 *   hero. Το frontend αποδίδει ανάλογα, αντί να επιβάλλει μία διάσταση.
 */

export type MediaSpec = {
  w: number
  h: number
  label: string
  ratio: string
  note?: string
}

/** Προδιαγραφές ανά θέση προβολής. */
export const IMAGE_SPECS: Record<string, MediaSpec> = {
  hero:    { w: 1920, h: 640,  label: 'Κεντρικό',  ratio: '3:1',
             note: 'Πλατύ, για την κορυφή της σελίδας' },
  banner:  { w: 1200, h: 300,  label: 'Banner',    ratio: '4:1' },
  sidebar: { w: 400,  h: 600,  label: 'Πλαϊνό',    ratio: '2:3',
             note: 'Κάθετο, στο πλάι' },
  inline:  { w: 800,  h: 200,  label: 'Ενσωματωμένο', ratio: '4:1' },
  popup:   { w: 600,  h: 600,  label: 'Αναδυόμενο', ratio: '1:1' },
}

export const VIDEO_SPECS: Record<string, MediaSpec> = {
  hero:    { w: 1920, h: 1080, label: 'Οριζόντιο', ratio: '16:9' },
  banner:  { w: 1920, h: 1080, label: 'Οριζόντιο', ratio: '16:9' },
  inline:  { w: 1280, h: 720,  label: 'Οριζόντιο', ratio: '16:9' },
  sidebar: { w: 1080, h: 1920, label: 'Κάθετο',    ratio: '9:16',
             note: 'Όπως βγαίνει από κινητό' },
  popup:   { w: 1080, h: 1080, label: 'Τετράγωνο', ratio: '1:1',
             note: 'Δουλεύει και σε κινητό και σε υπολογιστή' },
}

/** Πάνω από αυτό, ο server το απορρίπτει. */
const SERVER_LIMIT = 5 * 1024 * 1024

/**
 * Σμικρύνει και συμπιέζει εικόνα στον browser.
 * Διατηρεί την αναλογία και γεμίζει το πλαίσιο, κόβοντας ό,τι περισσεύει —
 * ώστε ένα banner 4:1 να μη βγει παραμορφωμένο από τετράγωνη φωτογραφία.
 */
async function resizeImage(file: File, spec: MediaSpec): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = spec.w
  canvas.height = spec.h
  const ctx = canvas.getContext('2d')!

  // Κάλυψη πλαισίου με κεντράρισμα
  const srcRatio = bitmap.width / bitmap.height
  const dstRatio = spec.w / spec.h
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height
  if (srcRatio > dstRatio) {
    sw = bitmap.height * dstRatio
    sx = (bitmap.width - sw) / 2
  } else {
    sh = bitmap.width / dstRatio
    sy = (bitmap.height - sh) / 2
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, spec.w, spec.h)

  // Ποιότητα 0.85 — οπτικά ίδιο, πολύ μικρότερο αρχείο
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob(b => b ? res(b) : rej(new Error('Αποτυχία συμπίεσης')), 'image/webp', 0.85))
}

/** Διαστάσεις και διάρκεια βίντεο, χωρίς να το ανεβάσουμε. */
function probeVideo(file: File): Promise<{ w: number; h: number; duration: number }> {
  return new Promise((res, rej) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      res({ w: v.videoWidth, h: v.videoHeight, duration: v.duration })
      URL.revokeObjectURL(v.src)
    }
    v.onerror = () => rej(new Error('Δεν διαβάζεται το βίντεο'))
    v.src = URL.createObjectURL(file)
  })
}

type Props = {
  slot: string
  mediaType: 'image' | 'video'
  value?: string | null
  onChange: (url: string | null, meta?: { w: number; h: number; ratio: number }) => void
}

export default function CampaignMediaUpload({ slot, mediaType, value, onChange }: Props) {
  const [busy, setBusy] = useState(false)
  const [warn, setWarn] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const spec = (mediaType === 'video' ? VIDEO_SPECS : IMAGE_SPECS)[slot]
             ?? (mediaType === 'video' ? VIDEO_SPECS.banner : IMAGE_SPECS.banner)

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setWarn(null)
    setBusy(true)

    try {
      let blob: Blob = file
      let name = file.name
      let meta: any

      if (mediaType === 'image') {
        if (!file.type.startsWith('image/')) throw new Error('Επίλεξε αρχείο εικόνας')
        blob = await resizeImage(file, spec)
        name = file.name.replace(/\.\w+$/, '') + '.webp'
        meta = { w: spec.w, h: spec.h, ratio: spec.w / spec.h }

        const saved = Math.round((1 - blob.size / file.size) * 100)
        if (saved > 20) {
          setWarn(`Η εικόνα προσαρμόστηκε σε ${spec.w}×${spec.h} και μίκρυνε κατά ${saved}%.`)
        }
      } else {
        if (!file.type.startsWith('video/')) throw new Error('Επίλεξε αρχείο βίντεο')

        const info = await probeVideo(file)
        meta = { w: info.w, h: info.h, ratio: info.w / info.h }

        // Το βίντεο δεν μετατρέπεται στον browser — μόνο έλεγχος.
        if (file.size > SERVER_LIMIT) {
          throw new Error(
            `Το βίντεο είναι ${(file.size / 1048576).toFixed(1)}MB. Το όριο είναι 5MB. ` +
            `Δοκίμασε μικρότερη διάρκεια ή χαμηλότερη ανάλυση.`)
        }

        const want = spec.w / spec.h
        const got = info.w / info.h
        if (Math.abs(want - got) > 0.25) {
          setWarn(
            `Το βίντεο είναι ${info.w}×${info.h}, ενώ η θέση «${spec.label}» θέλει ` +
            `αναλογία ${spec.ratio}. Θα εμφανιστεί με μαύρες μπάρες.`)
        }
        if (info.duration > 30) {
          setWarn(w => (w ? w + ' ' : '') +
            `Διάρκεια ${Math.round(info.duration)}″ — τα banner δουλεύουν καλύτερα κάτω από 15″.`)
        }
      }

      const fd = new FormData()
      fd.append('file', new File([blob], name, { type: blob.type }))
      fd.append('folder', 'campaigns')

      const r = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = r.data?.url
      if (!url) throw new Error('Ο διακομιστής δεν επέστρεψε διεύθυνση')

      onChange(url, meta)
      toast.success('Το αρχείο ανέβηκε')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Σφάλμα ανεβάσματος')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const Icon = mediaType === 'video' ? Film : ImageIcon

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="label mb-0">
          {mediaType === 'video' ? 'Βίντεο' : 'Εικόνα'}
        </label>
        <span className="text-[11px] text-gray-500">
          {spec.w}×{spec.h} · {spec.ratio}
          {spec.note ? ` · ${spec.note}` : ''}
        </span>
      </div>

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {mediaType === 'video' ? (
            <video src={value} className="w-full max-h-40 object-contain" controls muted />
          ) : (
            <img src={value} alt="" className="w-full max-h-40 object-contain" />
          )}
          <button type="button" onClick={() => { onChange(null); setWarn(null) }}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
            <X size={14} />
          </button>
          <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-black/60 text-white">
            <Check size={11} /> ανέβηκε
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
          className={cn(
            'w-full rounded-xl border-2 border-dashed p-6 flex flex-col items-center gap-2 transition-colors',
            busy ? 'border-gray-200 dark:border-gray-700 opacity-60'
                 : 'border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-900/10',
          )}>
          {busy ? (
            <>
              <Loader2 size={22} className="text-brand-900 animate-spin" />
              <span className="text-sm text-gray-500">
                {mediaType === 'image' ? 'Προσαρμογή και ανέβασμα...' : 'Ανέβασμα...'}
              </span>
            </>
          ) : (
            <>
              <Icon size={22} className="text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Επίλεξε {mediaType === 'video' ? 'βίντεο' : 'εικόνα'}
              </span>
              <span className="text-[11px] text-gray-400">
                {mediaType === 'image'
                  ? 'Προσαρμόζεται αυτόματα στις σωστές διαστάσεις'
                  : 'Έως 5MB · MP4 ή WebM'}
              </span>
            </>
          )}
        </button>
      )}

      <input ref={inputRef} type="file" className="hidden"
        accept={mediaType === 'video' ? 'video/mp4,video/webm' : 'image/*'}
        onChange={pick} />

      {warn && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>{warn}</span>
        </p>
      )}
    </div>
  )
}
