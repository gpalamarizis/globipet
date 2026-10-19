import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Brain, Heart, Zap, Eye, AlertTriangle, CheckCircle, Loader2, Play, Square, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

type Mode = 'select' | 'live' | 'upload_image' | 'upload_video' | 'analyzing' | 'result_live' | 'result_upload'

const emotionColors: Record<string, string> = {
  happy: 'green', calm: 'blue', anxious: 'yellow', fearful: 'red',
  excited: 'orange', playful: 'pink', tired: 'gray', stressed: 'red', neutral: 'gray'
}

const emotionEmoji: Record<string, string> = {
  happy: '😊', calm: '😌', anxious: '😰', fearful: '😨',
  excited: '🤩', playful: '😄', tired: '😴', stressed: '😫', neutral: '😐'
}

const speciesOptions = [
  { value: 'dog', labelKey: 'pgEmotion.speciesDog' },
  { value: 'cat', labelKey: 'pgEmotion.speciesCat' },
  { value: 'rabbit', labelKey: 'pgEmotion.speciesRabbit' },
  { value: 'bird', labelKey: 'pgEmotion.speciesBird' },
  { value: 'other', labelKey: 'pgEmotion.speciesOther' },
]

export default function AiEmotion() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const [mode, setMode] = useState<Mode>('select')
  const [species, setSpecies] = useState('dog')
  const [result, setResult] = useState<any>(null)
  const [liveResult, setLiveResult] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [liveInterval, setLiveInterval] = useState<NodeJS.Timeout | null>(null)
  const [frameCount, setFrameCount] = useState(0)
  const liveIntervalRef = useRef<any>(null)
  // Each frame is a billed AI request. Live analysis stops on its own after
  // this many so an unattended camera cannot run up a bill.
  const MAX_LIVE_FRAMES = 20
  // Ίδιο με το κείμενο «κάθε 4 δευτερόλεπτα» (pgEmotion.liveCameraDesc).
  const LIVE_INTERVAL_MS = 4000

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Η άδεια κάμερας μπορεί να αργήσει. Αν στο μεταξύ η σελίδα έκλεισε, ο
  // χρήστης άλλαξε λειτουργία ή πάτησε διακοπή, η ροή που έρχεται μετά
  // σταματά αμέσως αντί να μείνει η κάμερα αναμμένη.
  const mountedRef = useRef(false)
  const liveAttemptRef = useRef(0)
  const modeRef = useRef<Mode>(mode)
  modeRef.current = mode

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopLive()
    }
  }, [])

  const startLive = async () => {
    const attempt = ++liveAttemptRef.current
    const startMode = modeRef.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      if (!mountedRef.current || attempt !== liveAttemptRef.current || modeRef.current !== startMode) {
        stream.getTracks().forEach(tr => tr.stop())
        return
      }
      streamRef.current = stream
      // Το <video> της ζωντανής κάμερας αποδίδεται μόνο σε mode 'live', άρα
      // εδώ το videoRef είναι ακόμη null. Η ροή συνδέεται στο attachVideo
      // μόλις το στοιχείο μπει στη σελίδα.
      if (videoRef.current) attachVideo(videoRef.current)
      setMode('live')
      setIsRecording(true)
      toast.success(t('pgEmotion.cameraOn'))
    } catch {
      if (mountedRef.current && attempt === liveAttemptRef.current) toast.error(t('pgEmotion.cameraDenied'))
    }
  }

  /**
   * Stop the camera and the analysis loop.
   *
   * The interval id is kept in a ref as well as in state. The unmount effect
   * below has an empty dependency array, so it captures whatever stopLive was
   * on the first render — when liveInterval was still null. clearInterval was
   * therefore clearing nothing, and the loop kept firing a paid AI request
   * every few seconds after the user had navigated away, until the tab closed.
   */
  const stopLive = useCallback(() => {
    // Ακυρώνει και μια αίτηση κάμερας που περιμένει ακόμη την άδεια.
    liveAttemptRef.current++
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current)
      liveIntervalRef.current = null
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    setIsRecording(false)
    setLiveInterval(null)
  }, [])

  /**
   * Callback ref του <video> της κάμερας. Πριν, η ροή δινόταν στο videoRef
   * μέσα στο startLive, όταν το <video> δεν υπήρχε ακόμη (mode 'select'):
   * η εικόνα έμενε μαύρη και το captureFrame έστελνε κενά καρέ.
   */
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current
      el.play().catch(() => { /* autoPlay καλύπτει την έναρξη */ })
    }
  }, [])

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, 640, 480)
    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
  }, [])

  const analyzeFrame = useCallback(async () => {
    const frame = captureFrame()
    if (!frame) return
    setFrameCount(c => c + 1)
    try {
      const { data } = await api.post('/ai/emotion', {
        image_base64: frame,
        media_type: 'image/jpeg',
        species,
        context: 'Real-time camera analysis',
        lang: i18n.language,
      })
      setLiveResult(data)
    } catch { /* silent fail for live */ }
  }, [captureFrame, species, i18n.language])

  const startAnalysis = () => {
    setFrameCount(0)
    const interval = setInterval(() => {
      // The counter lives in state, so read it through the setter to avoid
      // acting on a stale closure value.
      setFrameCount(current => {
        if (current >= MAX_LIVE_FRAMES) {
          stopLive()
          toast(t('pgEmotion.liveAutoStopped'), { icon: '⏹️' })
          return current
        }
        analyzeFrame()
        return current
      })
    }, LIVE_INTERVAL_MS)
    liveIntervalRef.current = interval
    setLiveInterval(interval)
    analyzeFrame() // αμέσως
    setMode('result_live')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setUploadedImage(reader.result as string)
    reader.readAsDataURL(file)
    setMode('upload_image')
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedVideo(file)
    setVideoPreview(URL.createObjectURL(file))
    setMode('upload_video')
  }

  const analyzeUploadedImage = async () => {
    if (!uploadedImage) return
    setMode('analyzing')
    try {
      const base64 = uploadedImage.split(',')[1]
      const { data } = await api.post('/ai/emotion', {
        image_base64: base64,
        media_type: 'image/jpeg',
        species,
        lang: i18n.language,
      })
      setResult(data)
      setMode('result_upload')
    } catch {
      toast.error(t('pgEmotion.errAnalysis'))
      setMode('upload_image')
    }
  }

  const analyzeUploadedVideo = async () => {
    // Τα καρέ βγαίνουν από δικό της <video> (παρακάτω). Ο έλεγχος του
    // videoRef — που δείχνει μόνο στη ζωντανή κάμερα και εδώ είναι πάντα
    // null — σταματούσε την ανάλυση βίντεο πριν ξεκινήσει.
    if (!uploadedVideo || !videoPreview) return
    setMode('analyzing')
    try {
      // Extract frames from video
      const frames: string[] = []
      const video = document.createElement('video')
      video.src = videoPreview!
      video.muted = true

      await new Promise(res => { video.onloadedmetadata = res })
      const duration = Math.min(video.duration, 30) // max 30 sec
      const frameCount = Math.max(1, Math.min(5, Math.floor(duration)))
      const canvas = document.createElement('canvas')
      canvas.width = 640; canvas.height = 480
      const ctx = canvas.getContext('2d')!

      for (let i = 0; i < frameCount; i++) {
        video.currentTime = (duration / frameCount) * i
        await new Promise(res => { video.onseeked = res })
        ctx.drawImage(video, 0, 0, 640, 480)
        frames.push(canvas.toDataURL('image/jpeg', 0.7).split(',')[1])
      }

      const { data } = await api.post('/ai/emotion/video', {
        frames,
        species,
        duration_seconds: Math.round(duration),
        lang: i18n.language,
      })
      setResult(data)
      setMode('result_upload')
    } catch (err: any) {
      toast.error(t('pgEmotion.errVideo'))
      setMode('upload_video')
    }
  }

  const reset = () => {
    stopLive()
    setMode('select')
    setResult(null)
    setLiveResult(null)
    setUploadedImage(null)
    setUploadedVideo(null)
    setVideoPreview(null)
    setFrameCount(0)
  }

  const getEmotionColor = (emotion: string) => emotionColors[emotion] || 'gray'

  // Το `emotion` είναι κωδικός από κλειστό σύνολο· το `emotion_el` μόνο
  // ελληνικά. Ετικέτα από τον κωδικό, με το ελληνικό ως εφεδρεία μόνο στα
  // ελληνικά.
  const emotionLabel = (code?: string, el?: string) =>
    t(`pgEmotion.emo_${code}`, {
      defaultValue: (i18n.language.startsWith('el') && el) || code || el || '',
    })

  const WelfareBar = ({ score }: { score: number }) => (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
      <div className={`h-3 rounded-full transition-all ${score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-500'}`}
        style={{ width: `${score * 10}%` }} />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-2xl mx-auto px-4">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Brain size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('pgEmotion.title')}</h1>
          <p className="text-gray-500 text-sm">{t('pgEmotion.subtitle')}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
            {t('pgEmotion.betaBadge')}
          </span>
        </div>

        <AnimatePresence mode="wait">

          {/* Select mode */}
          {mode === 'select' && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Species selector */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('pgEmotion.speciesLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {speciesOptions.map(s => (
                    <button key={s.value} onClick={() => setSpecies(s.value)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${species === s.value ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {t(s.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button onClick={startLive}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border-2 border-transparent hover:border-purple-400 transition-all shadow-sm group">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Camera size={28} className="text-purple-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('pgEmotion.liveCamera')}</h3>
                  <p className="text-xs text-gray-400">{t('pgEmotion.liveCameraDesc')}</p>
                </button>

                <button onClick={() => imageInputRef.current?.click()}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border-2 border-transparent hover:border-pink-400 transition-all shadow-sm group">
                  <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Upload size={28} className="text-pink-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('pgEmotion.photo')}</h3>
                  <p className="text-xs text-gray-400">{t('pgEmotion.photoDesc')}</p>
                </button>

                <button onClick={() => videoInputRef.current?.click()}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border-2 border-transparent hover:border-indigo-400 transition-all shadow-sm group">
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Play size={28} className="text-indigo-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('pgEmotion.video')}</h3>
                  <p className="text-xs text-gray-400">{t('pgEmotion.videoDesc')}</p>
                </button>
              </div>

              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />

              <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
                <strong>{t('pgEmotion.betaLabel')}</strong> {t('pgEmotion.betaNotice')}
              </div>
            </motion.div>
          )}

          {/* Live camera */}
          {(mode === 'live' || mode === 'result_live') && (
            <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm mb-4">
                <div className="relative">
                  <video ref={attachVideo} className="w-full max-h-80 object-cover bg-black" autoPlay muted playsInline />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-lg">{t('pgEmotion.live')}</span>
                  </div>
                  {mode === 'result_live' && (
                    <div className="absolute top-3 right-3 bg-black/50 px-2 py-1 rounded-lg text-white text-xs">
                      {t('pgEmotion.framesAnalyzed', { count: frameCount })}
                    </div>
                  )}
                </div>
                <div className="p-4 flex gap-2">
                  {mode === 'live' && (
                    <button onClick={startAnalysis} className="flex-1 py-2.5 bg-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                      <Brain size={16} /> {t('pgEmotion.startAnalysis')}
                    </button>
                  )}
                  {mode === 'result_live' && (
                    <button onClick={() => stopLive()}
                      className="flex-1 py-2.5 bg-gray-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                      <Square size={16} /> {t('pgEmotion.pause')}
                    </button>
                  )}
                  <button onClick={reset} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Live result */}
              {liveResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl">{emotionEmoji[liveResult.emotion] || '🐾'}</span>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{emotionLabel(liveResult.emotion, liveResult.emotion_el)}</p>
                      <p className="text-sm text-gray-400">{t('pgEmotion.confidence', { pct: Math.round(liveResult.confidence * 100) })}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">{t('pgEmotion.energyLevel')}</p>
                      <WelfareBar score={liveResult.energy_level} />
                      <p className="text-xs text-gray-500 mt-1">{liveResult.energy_level}/10</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">{t('pgEmotion.welfareScore')}</p>
                      <WelfareBar score={liveResult.welfare_score} />
                      <p className="text-xs text-gray-500 mt-1">{liveResult.welfare_score}/10</p>
                    </div>
                  </div>
                  {liveResult.advice && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-sm text-purple-800 dark:text-purple-300">
                      💡 {liveResult.advice}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Image upload */}
          {mode === 'upload_image' && uploadedImage && (
            <motion.div key="img" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm mb-4">
                <img src={uploadedImage} alt={t('pgEmotion.uploadAlt')} className="w-full max-h-80 object-contain bg-gray-100 dark:bg-gray-800" />
                <div className="p-4 flex gap-2">
                  <button onClick={analyzeUploadedImage} className="flex-1 py-2.5 bg-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                    <Brain size={16} /> {t('pgEmotion.analyzeImage')}
                  </button>
                  <button onClick={reset} className="px-4 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500"><X size={16} /></button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Video upload */}
          {mode === 'upload_video' && videoPreview && (
            <motion.div key="vid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm mb-4">
                <video src={videoPreview} controls className="w-full max-h-80 bg-black" />
                <div className="p-4 flex gap-2">
                  <button onClick={analyzeUploadedVideo} className="flex-1 py-2.5 bg-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                    <Brain size={16} /> {t('pgEmotion.analyzeVideo')}
                  </button>
                  <button onClick={reset} className="px-4 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500"><X size={16} /></button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Analyzing */}
          {mode === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-12 shadow-sm text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Brain size={36} className="text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('pgEmotion.analyzing')}</h2>
              <p className="text-gray-400 text-sm mb-4">{t('pgEmotion.analyzingDesc')}</p>
              <div className="flex justify-center gap-1">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </motion.div>
          )}

          {/* Upload Result */}
          {mode === 'result_upload' && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Main emotion */}
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-6xl">{emotionEmoji[result.overall_emotion || result.emotion] || '🐾'}</span>
                  <div>
                    <p className="text-3xl font-bold">{result.overall_emotion
                      ? emotionLabel(result.overall_emotion, result.overall_emotion_el)
                      : emotionLabel(result.emotion, result.emotion_el)}</p>
                    <p className="text-purple-200 text-sm">{t('pgEmotion.confidence', { pct: Math.round((result.confidence || 0) * 100) })}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-purple-200 text-xs mb-1">{t('pgEmotion.energyLevel')}</p>
                    <div className="bg-white/20 rounded-full h-2"><div className="bg-white h-2 rounded-full" style={{ width: `${(result.energy_level || 5) * 10}%` }} /></div>
                    <p className="text-white/80 text-xs mt-1">{result.energy_level}/10</p>
                  </div>
                  <div>
                    <p className="text-purple-200 text-xs mb-1">{t('pgEmotion.welfareScore')}</p>
                    <div className="bg-white/20 rounded-full h-2"><div className="bg-white h-2 rounded-full" style={{ width: `${(result.welfare_score || 5) * 10}%` }} /></div>
                    <p className="text-white/80 text-xs mt-1">{result.welfare_score}/10</p>
                  </div>
                </div>
              </div>

              {/* Body language */}
              {(result.body_language || result.body_language_summary) && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('pgEmotion.bodyLanguage')}</h3>
                  {result.body_language_summary && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{result.body_language_summary}</p>}
                  {result.body_language && (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(result.body_language).map(([key, val]) => (
                        <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
                          <p className="text-xs font-medium text-gray-500 capitalize mb-0.5">{t(`pgEmotion.bl_${key}`, { defaultValue: key })}</p>
                          <p className="text-xs text-gray-700 dark:text-gray-300">{val as string}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Observations */}
              {(result.observations || result.key_observations)?.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('pgEmotion.observations')}</h3>
                  <ul className="space-y-2">
                    {(result.observations || result.key_observations).map((o: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Needs attention */}
              {result.needs_attention && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400">{t('pgEmotion.needsAttention')}</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{result.attention_reason}</p>
                  </div>
                </div>
              )}

              {/* Advice */}
              {result.advice && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-1">{t('pgEmotion.advice')}</p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">{result.advice}</p>
                </div>
              )}

              <button onClick={reset} className="w-full py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('pgEmotion.newAnalysis')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
