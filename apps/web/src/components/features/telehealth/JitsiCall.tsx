import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

/**
 * Βιντεοκλήση τηλεϊατρικής μέσω Jitsi.
 *
 * ΓΙΑΤΙ EXTERNAL API ΚΑΙ ΟΧΙ ΣΚΕΤΟ IFRAME
 *   Η γραμμή εργαλείων του Jitsi είναι κρυμμένη (toolbarButtons: []), άρα τα
 *   δικά μας κουμπιά είναι ο μόνος έλεγχος. Με σκέτο iframe δεν είχαν τρόπο να
 *   μιλήσουν στην κλήση: άλλαζαν μόνο τοπικό state και το hash του URL, που
 *   το Jitsi δεν ξαναδιαβάζει. Το external_api.js φορτώνεται από τον ίδιο
 *   server (meet.jit.si) και δίνει executeCommand + γεγονότα, ώστε η
 *   κατάσταση των κουμπιών να ακολουθεί την πραγματική κατάσταση της κλήσης.
 *
 * ΠΟΙΟΣ SERVER
 *   Τα στοιχεία της κλήσης έρχονται από GET /telehealth/:id/call (ίδιοι
 *   κανόνες πρόσβασης με το meeting_url). Με JaaS: domain 8x8.vc, room
 *   '<APP_ID>/<δωμάτιο>', jwt, και το script από https://8x8.vc/<APP_ID>/external_api.js.
 *   Χωρίς JaaS: meet.jit.si όπως πριν (κόβει τις ενσωματωμένες κλήσεις στα ~5′).
 */

type CallInfo = { domain: string; room: string; jwt: string | null; app_id?: string | null }

const apiScripts: Record<string, Promise<any>> = {}
function loadJitsiApi(src: string): Promise<any> {
  const w = window as any
  if (!apiScripts[src]) {
    apiScripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => (w.JitsiMeetExternalAPI ? resolve(w.JitsiMeetExternalAPI) : reject(new Error('jitsi')))
      s.onerror = () => { delete apiScripts[src]; s.remove(); reject(new Error('jitsi')) }
      document.head.appendChild(s)
    })
  }
  return apiScripts[src]
}

export default function JitsiCall({ consultationId, vetName, onEnd }: { consultationId: string; vetName: string; onEnd: () => void }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<any>(null)
  const endedRef = useRef(false)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const [joined, setJoined] = useState(false)
  const [failed, setFailed] = useState(false)
  const [failedMsg, setFailedMsg] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  const displayName = user?.full_name || t('cmpJitsi.guest')
  const lang = String(i18n.language || 'el').slice(0, 2)

  const finish = () => {
    if (endedRef.current) return
    endedRef.current = true
    onEndRef.current()
  }

  useEffect(() => {
    let cancelled = false
    api.get(`/telehealth/${consultationId}/call`)
      .then(r => r.data?.data as CallInfo)
      .catch((e: any) => { if (!cancelled) setFailedMsg(e?.message || null); throw e })
      .then(info => {
        if (!info?.domain || !info?.room) throw new Error('jitsi')
        const src = info.app_id
          ? `https://${info.domain}/${info.app_id}/external_api.js`
          : `https://${info.domain}/external_api.js`
        return loadJitsiApi(src).then(JitsiMeetExternalAPI => ({ JitsiMeetExternalAPI, info }))
      })
      .then(({ JitsiMeetExternalAPI, info }) => {
        if (cancelled || !containerRef.current) return
        const api = new JitsiMeetExternalAPI(info.domain, {
          roomName: info.room,
          ...(info.jwt ? { jwt: info.jwt } : {}),
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          lang,
          userInfo: { displayName },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            prejoinConfig: { enabled: false },
            disableDeepLinking: true,
            toolbarButtons: [],
          },
        })
        apiRef.current = api

        api.addListener('videoConferenceJoined', () => {
          setJoined(true)
          api.isAudioMuted?.().then((m: boolean) => setMuted(!!m)).catch(() => {})
          api.isVideoMuted?.().then((m: boolean) => setVideoOff(!!m)).catch(() => {})
        })
        api.addListener('audioMuteStatusChanged', (e: { muted: boolean }) => setMuted(!!e?.muted))
        api.addListener('videoMuteStatusChanged', (e: { muted: boolean }) => setVideoOff(!!e?.muted))
        api.addListener('chatUpdated', (e: { isOpen: boolean; unreadCount: number }) => {
          setChatOpen(!!e?.isOpen)
          setUnread(Number(e?.unreadCount) || 0)
        })
        api.addListener('videoConferenceLeft', finish)
        api.addListener('readyToClose', finish)
      })
      .catch(() => { if (!cancelled) setFailed(true) })

    return () => {
      cancelled = true
      try { apiRef.current?.dispose() } catch {}
      apiRef.current = null
    }
    // Η κλήση στήνεται μία φορά ανά δωμάτιο· αλλαγή γλώσσας/ονόματος δεν την ξαναφορτώνει.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationId])

  const command = (name: string) => { if (joined) apiRef.current?.executeCommand(name) }

  const hangup = () => {
    const api = apiRef.current
    if (api && joined) {
      api.executeCommand('hangup')
      // Αν το Jitsi δεν στείλει videoConferenceLeft/readyToClose, κλείνουμε έτσι κι αλλιώς.
      window.setTimeout(finish, 3000)
    } else {
      finish()
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-white font-medium text-sm">{vetName}</span>
          <span className="text-gray-400 text-xs">{t('cmpJitsi.session')}</span>
        </div>
        <button onClick={hangup} aria-label={t('cmpJitsi.hangup')} title={t('cmpJitsi.hangup')}
          className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0 [&>iframe]:border-0" />
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-gray-300 text-sm text-center max-w-sm">{failedMsg || t('cmpJitsi.loadError')}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-900 border-t border-gray-800">
        <button onClick={() => command('toggleAudio')} disabled={!joined}
          aria-label={muted ? t('cmpJitsi.unmute') : t('cmpJitsi.mute')} title={muted ? t('cmpJitsi.unmute') : t('cmpJitsi.mute')}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed', muted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <button onClick={() => command('toggleVideo')} disabled={!joined}
          aria-label={videoOff ? t('cmpJitsi.cameraOn') : t('cmpJitsi.cameraOff')} title={videoOff ? t('cmpJitsi.cameraOn') : t('cmpJitsi.cameraOff')}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed', videoOff ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        <button onClick={() => command('toggleChat')} disabled={!joined}
          aria-label={t('cmpJitsi.chat')} aria-pressed={chatOpen} title={t('cmpJitsi.chat')}
          className={cn('relative w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed', chatOpen ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600')}>
          <MessageSquare size={20} />
          {unread > 0 && !chatOpen && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-[18px] text-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
        <button onClick={hangup} aria-label={t('cmpJitsi.hangup')} title={t('cmpJitsi.hangup')}
          className="w-14 h-14 rounded-full bg-red-600 text-white hover:bg-red-700 flex items-center justify-center transition-all shadow-lg">
          <PhoneOff size={24} />
        </button>
      </div>
    </motion.div>
  )
}
