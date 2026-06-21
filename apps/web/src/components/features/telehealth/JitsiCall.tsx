import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

export default function JitsiCall({ roomName, vetName, onEnd }: { roomName: string; vetName: string; onEnd: () => void }) {
  const { user } = useAuthStore()
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(user?.full_name || 'Guest')}"&config.startWithAudioMuted=${muted}&config.startWithVideoMuted=${videoOff}&config.toolbarButtons=[]&config.disableDeepLinking=true&config.prejoinPageEnabled=false`

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white font-medium text-sm">{vetName}</span>
          <span className="text-gray-400 text-xs">Τηλεϊατρική Συνεδρία</span>
        </div>
        <button onClick={onEnd} className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 relative">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          title="Jitsi Meet"
        />
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-900 border-t border-gray-800">
        <button onClick={() => setMuted(!muted)}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-all', muted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button onClick={() => setVideoOff(!videoOff)}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-all', videoOff ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        <button onClick={() => setChatOpen(!chatOpen)}
          className="w-12 h-12 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center transition-all">
          <MessageSquare size={20} />
        </button>
        <button onClick={onEnd}
          className="w-14 h-14 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center transition-all shadow-lg">
          <PhoneOff size={24} />
        </button>
      </div>
    </motion.div>
  )
}