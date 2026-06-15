import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Brain, Heart, Zap, Eye, AlertTriangle, CheckCircle, Loader2, Play, Square, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

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
  { value: 'dog', label: '🐶 Σκύλος' },
  { value: 'cat', label: '🐱 Γάτα' },
  { value: 'rabbit', label: '🐰 Κουνέλι' },
  { value: 'bird', label: '🐦 Πτηνό' },
  { value: 'other', label: '🐾 Άλλο' },
]

export default function AiEmotion() {
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLive()
    }
  }, [])

  const startLive = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      setMode('live')
      setIsRecording(true)
      toast.success('Κάμερα ενεργοποιήθηκε!')
    } catch {
      toast.error('Δεν επιτράπηκε πρόσβαση στην κάμερα')
    }
  }

  const stopLive = useCallback(() => {
    if (liveInterval) clearInterval(liveInterval)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    setIsRecording(false)
    setLiveInterval(null)
  }, [liveInterval])

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
        context: 'Real-time camera analysis'
      })
      setLiveResult(data)
    } catch { /* silent fail for live */ }
  }, [captureFrame, species])

  const startAnalysis = () => {
    const interval = setInterval(analyzeFrame, 4000) // κάθε 4 δευτερόλεπτα
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
      })
      setResult(data)
      setMode('result_upload')
    } catch {
      toast.error('Σφάλμα ανάλυσης')
      setMode('upload_image')
    }
  }

  const analyzeUploadedVideo = async () => {
    if (!uploadedVideo || !videoRef.current) return
    setMode('analyzing')
    try {
      // Extract frames from video
      const frames: string[] = []
      const video = document.createElement('video')
      video.src = videoPreview!
      video.muted = true

      await new Promise(res => { video.onloadedmetadata = res })
      const duration = Math.min(video.duration, 30) // max 30 sec
      const frameCount = Math.min(5, Math.floor(duration))
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
      })
      setResult(data)
      setMode('result_upload')
    } catch (err: any) {
      toast.error('Σφάλμα ανάλυσης βίντεο')
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">AI Emotional Intelligence</h1>
          <p className="text-gray-500 text-sm">Ανάλυση συναισθημάτων κατοικίδιου μέσω κάμερας ή βίντεο</p>
          <span className="inline-block mt-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
            🧪 Emerging Technology — Beta
          </span>
        </div>

        <AnimatePresence mode="wait">

          {/* Select mode */}
          {mode === 'select' && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Species selector */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Είδος κατοικίδιου</p>
                <div className="flex flex-wrap gap-2">
                  {speciesOptions.map(s => (
                    <button key={s.value} onClick={() => setSpecies(s.value)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${species === s.value ? 'bg-purple-500 text-white border-purple-500' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {s.label}
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
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Ζωντανή Κάμερα</h3>
                  <p className="text-xs text-gray-400">Real-time ανάλυση κάθε 4 δευτερόλεπτα</p>
                </button>

                <button onClick={() => imageInputRef.current?.click()}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border-2 border-transparent hover:border-pink-400 transition-all shadow-sm group">
                  <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Upload size={28} className="text-pink-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Φωτογραφία</h3>
                  <p className="text-xs text-gray-400">Ανάλυση μιας εικόνας</p>
                </button>

                <button onClick={() => videoInputRef.current?.click()}
                  className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border-2 border-transparent hover:border-indigo-400 transition-all shadow-sm group">
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Play size={28} className="text-indigo-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Βίντεο</h3>
                  <p className="text-xs text-gray-400">Ανάλυση από πολλαπλά frames</p>
                </button>
              </div>

              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />

              <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-300">
                <strong>⚠️ Beta:</strong> Η ανάλυση συναισθημάτων βασίζεται σε γλώσσα σώματος και είναι ενδεικτική. Δεν υποκαθιστά κτηνιατρική αξιολόγηση.
              </div>
            </motion.div>
          )}

          {/* Live camera */}
          {(mode === 'live' || mode === 'result_live') && (
            <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm mb-4">
                <div className="relative">
                  <video ref={videoRef} className="w-full max-h-80 object-cover bg-black" autoPlay muted playsInline />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-lg">LIVE</span>
                  </div>
                  {mode === 'result_live' && (
                    <div className="absolute top-3 right-3 bg-black/50 px-2 py-1 rounded-lg text-white text-xs">
                      {frameCount} frames αναλύθηκαν
                    </div>
                  )}
                </div>
                <div className="p-4 flex gap-2">
                  {mode === 'live' && (
                    <button onClick={startAnalysis} className="flex-1 py-2.5 bg-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                      <Brain size={16} /> Έναρξη Ανάλυσης
                    </button>
                  )}
                  {mode === 'result_live' && (
                    <button onClick={() => { if (liveInterval) clearInterval(liveInterval); setLiveInterval(null) }}
                      className="flex-1 py-2.5 bg-gray-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                      <Square size={16} /> Παύση
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
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{liveResult.emotion_el}</p>
                      <p className="text-sm text-gray-400">Βεβαιότητα: {Math.round(liveResult.confidence * 100)}%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Επίπεδο Ενέργειας</p>
                      <WelfareBar score={liveResult.energy_level} />
                      <p className="text-xs text-gray-500 mt-1">{liveResult.energy_level}/10</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Welfare Score</p>
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
                <img src={uploadedImage} alt="upload" className="w-full max-h-80 object-contain bg-gray-100 dark:bg-gray-800" />
                <div className="p-4 flex gap-2">
                  <button onClick={analyzeUploadedImage} className="flex-1 py-2.5 bg-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                    <Brain size={16} /> Ανάλυση Εικόνας
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
                    <Brain size={16} /> Ανάλυση Βίντεο
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ανάλυση συναισθημάτων...</h2>
              <p className="text-gray-400 text-sm mb-4">Το AI διαβάζει τη γλώσσα σώματος</p>
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
                    <p className="text-3xl font-bold">{result.overall_emotion_el || result.emotion_el}</p>
                    <p className="text-purple-200 text-sm">Βεβαιότητα: {Math.round((result.confidence || 0) * 100)}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-purple-200 text-xs mb-1">Επίπεδο Ενέργειας</p>
                    <div className="bg-white/20 rounded-full h-2"><div className="bg-white h-2 rounded-full" style={{ width: `${(result.energy_level || 5) * 10}%` }} /></div>
                    <p className="text-white/80 text-xs mt-1">{result.energy_level}/10</p>
                  </div>
                  <div>
                    <p className="text-purple-200 text-xs mb-1">Welfare Score</p>
                    <div className="bg-white/20 rounded-full h-2"><div className="bg-white h-2 rounded-full" style={{ width: `${(result.welfare_score || 5) * 10}%` }} /></div>
                    <p className="text-white/80 text-xs mt-1">{result.welfare_score}/10</p>
                  </div>
                </div>
              </div>

              {/* Body language */}
              {(result.body_language || result.body_language_summary) && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🐾 Γλώσσα Σώματος</h3>
                  {result.body_language_summary && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{result.body_language_summary}</p>}
                  {result.body_language && (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(result.body_language).map(([key, val]) => (
                        <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
                          <p className="text-xs font-medium text-gray-500 capitalize mb-0.5">{key}</p>
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
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🔍 Παρατηρήσεις</h3>
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
                    <p className="font-semibold text-red-700 dark:text-red-400">Χρειάζεται προσοχή</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{result.attention_reason}</p>
                  </div>
                </div>
              )}

              {/* Advice */}
              {result.advice && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-1">💡 Συμβουλή</p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">{result.advice}</p>
                </div>
              )}

              <button onClick={reset} className="w-full py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400">
                Νέα Ανάλυση
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
